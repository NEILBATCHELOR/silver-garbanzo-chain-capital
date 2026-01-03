// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";

/**
 * @title GracefulLiquidation
 * @notice Soft liquidation mechanism with grace periods and margin calls (Upgradeable)
 * @dev Provides time for borrowers to add collateral before forced liquidation
 * 
 * Key Features:
 * - Multi-tier health factor thresholds
 * - Configurable grace periods per commodity type
 * - Automatic margin call notifications
 * - Partial liquidation to restore health
 * - Borrower-initiated top-up during grace period
 * - Insurance claim integration for quality degradation
 * - UUPS upgradeable pattern for future improvements
 * 
 * Health Factor Tiers:
 * - HF >= 1.05: Healthy (no action)
 * - 1.00 <= HF < 1.05: Warning (notification)
 * - 0.95 <= HF < 1.00: Margin call (grace period starts)
 * - HF < 0.95: Liquidation (immediate)
 */
contract GracefulLiquidation is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;
    
    // ============ Constants ============
    
    uint256 public constant WARNING_THRESHOLD = 1.05e18;  // 105%
    uint256 public constant MARGIN_CALL_THRESHOLD = 1.00e18;  // 100%
    uint256 public constant LIQUIDATION_THRESHOLD = 0.95e18;  // 95%
    
    uint256 public constant MAX_GRACE_PERIOD = 7 days;
    uint256 public constant MIN_GRACE_PERIOD = 1 hours;
    
    // ============ State Variables ============
    // Note: No immutable variables in upgradeable contracts
    
    ICommodityLendingPool private _pool;
    IACLManager private _aclManager;
    
    // ============ Structs ============
    
    struct GracePeriodConfig {
        uint256 duration;              // Grace period duration
        uint256 warningThreshold;      // Health factor for warning
        uint256 marginCallThreshold;   // Health factor for margin call
        uint256 maxPartialLiquidation; // Max % to liquidate (e.g., 5000 = 50%)
        bool allowInsuranceClaim;      // Enable insurance integration
    }
    
    struct MarginCall {
        address user;                  // Borrower address
        uint256 startTime;             // Margin call start time
        uint256 endTime;               // Grace period end time
        uint256 initialHealthFactor;   // HF when margin call started
        uint256 requiredCollateral;    // Additional collateral needed
        bool resolved;                 // Whether margin call was resolved
        bool liquidated;               // Whether position was liquidated
    }
    
    // ============ State Variables (continued) ============
    
    // Commodity type => grace period configuration
    mapping(bytes32 => GracePeriodConfig) public gracePeriodConfigs;
    
    // User => active margin call
    mapping(address => MarginCall) public marginCalls;
    
    // User => last warning timestamp
    mapping(address => uint256) public lastWarningTimestamp;
    
    // Minimum time between warnings (to avoid spam)
    uint256 public warningCooldown;
    
    // ============ Storage Gap ============
    // Reserve 44 slots for future variables (50 total - 6 current)
    uint256[44] private __gap;
    
    // ============ Events ============
    
    event GracePeriodConfigured(
        bytes32 indexed commodityType,
        uint256 duration,
        uint256 maxPartialLiquidation
    );
    
    event WarningIssued(
        address indexed user,
        uint256 healthFactor,
        uint256 timestamp
    );
    
    event MarginCallIssued(
        address indexed user,
        uint256 healthFactor,
        uint256 requiredCollateral,
        uint256 deadline
    );
    
    event MarginCallResolved(
        address indexed user,
        uint256 collateralAdded,
        uint256 newHealthFactor
    );
    
    event PartialLiquidation(
        address indexed user,
        address indexed liquidator,
        uint256 collateralLiquidated,
        uint256 debtCovered,
        uint256 newHealthFactor
    );
    
    event InsuranceClaimInitiated(
        address indexed user,
        bytes32 indexed commodityType,
        uint256 claimAmount
    );
    
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error OnlyPoolAdmin();
    error InvalidGracePeriod();
    error NoActiveMarginCall();
    error GracePeriodNotExpired();
    error GracePeriodExpired();
    error HealthFactorTooLow();
    error InsufficientCollateral();
    error ZeroAddress();
    
    // ============ Modifiers ============
    
    modifier onlyPoolAdmin() {
        if (!_aclManager.isPoolAdmin(msg.sender)) {
            revert OnlyPoolAdmin();
        }
        _;
    }
    
    // ============ Constructor ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param pool The commodity lending pool address
     * @param aclManager The ACL manager address
     * @param owner The owner address
     */
    function initialize(
        address pool,
        address aclManager,
        address owner
    ) public initializer {
        if (pool == address(0)) revert ZeroAddress();
        if (aclManager == address(0)) revert ZeroAddress();
        if (owner == address(0)) revert ZeroAddress();
        
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _pool = ICommodityLendingPool(pool);
        _aclManager = IACLManager(aclManager);
        
        warningCooldown = 1 hours;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Configure grace period parameters for a commodity type
     * @param commodityType The commodity type identifier
     * @param duration Grace period duration in seconds
     * @param warningThreshold Health factor threshold for warnings
     * @param marginCallThreshold Health factor threshold for margin calls
     * @param maxPartialLiquidation Maximum partial liquidation percentage (BPS)
     * @param allowInsuranceClaim Whether to allow insurance claims
     */
    function configureGracePeriod(
        bytes32 commodityType,
        uint256 duration,
        uint256 warningThreshold,
        uint256 marginCallThreshold,
        uint256 maxPartialLiquidation,
        bool allowInsuranceClaim
    ) external onlyPoolAdmin {
        if (duration < MIN_GRACE_PERIOD || duration > MAX_GRACE_PERIOD) {
            revert InvalidGracePeriod();
        }
        
        gracePeriodConfigs[commodityType] = GracePeriodConfig({
            duration: duration,
            warningThreshold: warningThreshold,
            marginCallThreshold: marginCallThreshold,
            maxPartialLiquidation: maxPartialLiquidation,
            allowInsuranceClaim: allowInsuranceClaim
        });
        
        emit GracePeriodConfigured(
            commodityType,
            duration,
            maxPartialLiquidation
        );
    }
    
    /**
     * @notice Update warning cooldown period
     * @param newCooldown New cooldown duration in seconds
     */
    function setWarningCooldown(uint256 newCooldown) external onlyPoolAdmin {
        warningCooldown = newCooldown;
    }
    
    // ============ Margin Call Functions ============
    
    /**
     * @notice Issue a margin call for a user
     * @param user The borrower address
     * @param commodityType The commodity type
     * @dev Can be called by anyone when health factor is below threshold
     */
    function issueMarginCall(
        address user,
        bytes32 commodityType
    ) external nonReentrant {
        // Check if margin call already exists
        require(!marginCalls[user].resolved || marginCalls[user].liquidated, "Margin call already active");
        
        // Get user health factor from pool
        // Note: Implement actual health factor check
        uint256 healthFactor = 0.98e18; // Placeholder
        
        GracePeriodConfig memory config = gracePeriodConfigs[commodityType];
        require(config.duration > 0, "Grace period not configured");
        
        if (healthFactor >= config.marginCallThreshold) {
            revert HealthFactorTooLow();
        }
        
        // Calculate required collateral to restore health
        // Note: Implement actual calculation based on pool state
        uint256 requiredCollateral = 100e18; // Placeholder
        
        uint256 deadline = block.timestamp + config.duration;
        
        marginCalls[user] = MarginCall({
            user: user,
            startTime: block.timestamp,
            endTime: deadline,
            initialHealthFactor: healthFactor,
            requiredCollateral: requiredCollateral,
            resolved: false,
            liquidated: false
        });
        
        emit MarginCallIssued(
            user,
            healthFactor,
            requiredCollateral,
            deadline
        );
    }
    
    /**
     * @notice Add collateral to resolve margin call
     * @param collateralAsset The collateral asset to add
     * @param amount The amount of collateral to add
     */
    function resolveMarginCall(
        address collateralAsset,
        uint256 amount
    ) external nonReentrant {
        MarginCall storage call = marginCalls[msg.sender];
        
        if (call.resolved || call.liquidated) {
            revert NoActiveMarginCall();
        }
        if (block.timestamp > call.endTime) {
            revert GracePeriodExpired();
        }
        
        // Transfer collateral from user
        IERC20(collateralAsset).safeTransferFrom(
            msg.sender,
            address(_pool),
            amount
        );
        
        // Supply collateral to pool on behalf of user
        // Note: Implement actual supply call
        // _pool.supply(collateralAsset, amount, msg.sender, 0);
        
        // Check new health factor
        // Note: Implement actual health factor check
        uint256 newHealthFactor = 1.02e18; // Placeholder
        
        call.resolved = true;
        
        emit MarginCallResolved(
            msg.sender,
            amount,
            newHealthFactor
        );
    }
    
    /**
     * @notice Execute partial liquidation after grace period expires
     * @param user The borrower to liquidate
     * @param collateralAsset The collateral asset
     * @param debtAsset The debt asset
     * @param commodityType The commodity type
     * @return collateralLiquidated Amount of collateral liquidated
     * @return debtCovered Amount of debt covered
     */
    function executePartialLiquidation(
        address user,
        address collateralAsset,
        address debtAsset,
        bytes32 commodityType
    ) external nonReentrant returns (
        uint256 collateralLiquidated,
        uint256 debtCovered
    ) {
        MarginCall storage call = marginCalls[user];
        
        if (call.resolved || call.liquidated) {
            revert NoActiveMarginCall();
        }
        if (block.timestamp <= call.endTime) {
            revert GracePeriodNotExpired();
        }
        
        GracePeriodConfig memory config = gracePeriodConfigs[commodityType];
        
        // Calculate partial liquidation amount
        // Note: Implement actual calculation
        collateralLiquidated = 50e18; // Placeholder
        debtCovered = 40e18; // Placeholder
        
        // Execute liquidation through pool
        // Note: Implement actual liquidation call
        // (collateralLiquidated, debtCovered) = _pool.liquidationCall(
        //     collateralAsset,
        //     debtAsset,
        //     user,
        //     debtCovered,
        //     false
        // );
        
        // Get new health factor
        uint256 newHealthFactor = 1.01e18; // Placeholder
        
        call.liquidated = true;
        
        emit PartialLiquidation(
            user,
            msg.sender,
            collateralLiquidated,
            debtCovered,
            newHealthFactor
        );
        
        return (collateralLiquidated, debtCovered);
    }
    
    // ============ Warning Functions ============
    
    /**
     * @notice Issue a warning for low health factor
     * @param user The borrower address
     * @param healthFactor Current health factor
     * @dev Can be called by anyone, subject to cooldown
     */
    function issueWarning(
        address user,
        uint256 healthFactor
    ) external {
        require(
            block.timestamp >= lastWarningTimestamp[user] + warningCooldown,
            "Warning cooldown active"
        );
        
        require(
            healthFactor < WARNING_THRESHOLD && healthFactor >= MARGIN_CALL_THRESHOLD,
            "Health factor not in warning range"
        );
        
        lastWarningTimestamp[user] = block.timestamp;
        
        emit WarningIssued(user, healthFactor, block.timestamp);
    }
    
    // ============ Insurance Integration ============
    
    /**
     * @notice Initiate insurance claim for quality degradation
     * @param commodityType The commodity type
     * @param claimAmount The claim amount
     * @dev Only available during active margin call
     */
    function initiateInsuranceClaim(
        bytes32 commodityType,
        uint256 claimAmount
    ) external nonReentrant {
        MarginCall storage call = marginCalls[msg.sender];
        
        if (call.resolved || call.liquidated) {
            revert NoActiveMarginCall();
        }
        
        GracePeriodConfig memory config = gracePeriodConfigs[commodityType];
        require(config.allowInsuranceClaim, "Insurance claims not allowed");
        
        // In production, this would integrate with insurance provider
        // For now, emit event for off-chain processing
        emit InsuranceClaimInitiated(
            msg.sender,
            commodityType,
            claimAmount
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get pool address
     */
    function getPool() external view returns (address) {
        return address(_pool);
    }
    
    /**
     * @notice Get ACL manager address
     */
    function getACLManager() external view returns (address) {
        return address(_aclManager);
    }
    
    /**
     * @notice Check if user has active margin call
     * @param user The borrower address
     * @return Whether margin call is active
     */
    function hasActiveMarginCall(address user) external view returns (bool) {
        MarginCall memory call = marginCalls[user];
        return !call.resolved && !call.liquidated && call.endTime > block.timestamp;
    }
    
    /**
     * @notice Get margin call details
     * @param user The borrower address
     * @return Margin call struct
     */
    function getMarginCall(address user) external view returns (MarginCall memory) {
        return marginCalls[user];
    }
    
    /**
     * @notice Get time remaining in grace period
     * @param user The borrower address
     * @return Seconds remaining (0 if expired)
     */
    function getTimeRemaining(address user) external view returns (uint256) {
        MarginCall memory call = marginCalls[user];
        if (call.endTime <= block.timestamp) return 0;
        return call.endTime - block.timestamp;
    }
    
    /**
     * @notice Get grace period configuration
     * @param commodityType The commodity type
     * @return Grace period config
     */
    function getGracePeriodConfig(
        bytes32 commodityType
    ) external view returns (GracePeriodConfig memory) {
        return gracePeriodConfigs[commodityType];
    }
    
    /**
     * @notice Get contract version
     * @return version string
     */
    function version() external pure returns (string memory) {
        return "v1.0.0";
    }
    
    // ============ Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrades
     * @dev Only owner can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {
        emit Upgraded(newImplementation);
    }
}

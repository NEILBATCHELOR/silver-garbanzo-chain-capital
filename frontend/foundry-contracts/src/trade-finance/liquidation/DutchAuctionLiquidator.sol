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
import {IPriceOracleGetter} from "../interfaces/IPriceOracleGetter.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";

/**
 * @title DutchAuctionLiquidator
 * @notice MEV-resistant liquidation via Dutch auction mechanism (Upgradeable)
 * @dev Implements gradual price discovery to prevent MEV extraction
 * 
 * Key Features:
 * - Price starts at oracle price and decreases over time
 * - MEV protection through time-based price decay
 * - Minimum liquidation threshold
 * - Commodity-specific auction parameters
 * - Physical delivery option for physical commodities
 * - UUPS upgradeable pattern for future improvements
 * 
 * Architecture:
 * - Integrates with CommodityLendingPool for liquidations
 * - Uses oracle prices as starting point
 * - Linear or exponential price decay curves
 * - Configurable auction duration per commodity type
 */
contract DutchAuctionLiquidator is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;
    using PercentageMath for uint256;
    
    // ============ Constants ============
    
    uint256 public constant MAX_AUCTION_DURATION = 6 hours;
    uint256 public constant MIN_AUCTION_DURATION = 5 minutes;
    uint256 public constant MAX_DISCOUNT_BPS = 2000; // 20%
    uint256 public constant PRECISION = 1e18;
    
    // ============ State Variables ============
    // Note: No immutable variables in upgradeable contracts
    
    ICommodityLendingPool private _pool;
    IACLManager private _aclManager;
    IPriceOracleGetter private _priceOracle;
    
    // ============ Structs ============
    
    struct AuctionConfig {
        uint256 duration;              // Auction duration in seconds
        uint256 startDiscountBps;      // Starting discount (e.g., 500 = 5%)
        uint256 endDiscountBps;        // Ending discount (e.g., 2000 = 20%)
        bool useExponentialDecay;      // Linear vs exponential decay
        bool allowPhysicalDelivery;    // Enable physical delivery option
    }
    
    struct Auction {
        address user;                  // Borrower being liquidated
        address collateralAsset;       // Collateral token address
        address debtAsset;             // Debt token address
        uint256 collateralAmount;      // Amount of collateral in auction
        uint256 debtAmount;            // Amount of debt to cover
        uint256 startTime;             // Auction start timestamp
        uint256 duration;              // Auction duration
        uint256 startPrice;            // Starting price (oracle price)
        uint256 startDiscountBps;      // Starting discount
        uint256 endDiscountBps;        // Ending discount
        bool useExponentialDecay;      // Decay curve type
        bool active;                   // Auction status
        bool physicalDeliveryRequested; // Physical delivery flag
    }
    
    // ============ State Variables (continued) ============
    
    // Commodity type => auction configuration
    mapping(bytes32 => AuctionConfig) public auctionConfigs;
    
    // Auction ID => auction data
    mapping(uint256 => Auction) public auctions;
    
    // Next auction ID
    uint256 public nextAuctionId;
    
    // Minimum health factor to trigger auction (below 1e18)
    uint256 public minHealthFactorForAuction;
    
    // ============ Storage Gap ============
    // Reserve 43 slots for future variables (50 total - 7 current)
    uint256[43] private __gap;
    
    // ============ Events ============
    
    event AuctionConfigured(
        bytes32 indexed commodityType,
        uint256 duration,
        uint256 startDiscountBps,
        uint256 endDiscountBps
    );
    
    event AuctionStarted(
        uint256 indexed auctionId,
        address indexed user,
        address collateralAsset,
        uint256 collateralAmount,
        uint256 debtAmount,
        uint256 startTime
    );
    
    event AuctionExecuted(
        uint256 indexed auctionId,
        address indexed liquidator,
        uint256 collateralReceived,
        uint256 debtPaid,
        uint256 finalPrice
    );
    
    event PhysicalDeliveryRequested(
        uint256 indexed auctionId,
        address indexed user
    );
    
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error InvalidDuration();
    error InvalidDiscount();
    error AuctionNotActive();
    error AuctionExpired();
    error InsufficientPayment();
    error HealthFactorTooHigh();
    error OnlyPoolAdmin();
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
     * @param priceOracle The price oracle address
     * @param owner The owner address
     */
    function initialize(
        address pool,
        address aclManager,
        address priceOracle,
        address owner
    ) public initializer {
        if (pool == address(0)) revert ZeroAddress();
        if (aclManager == address(0)) revert ZeroAddress();
        if (priceOracle == address(0)) revert ZeroAddress();
        if (owner == address(0)) revert ZeroAddress();
        
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _pool = ICommodityLendingPool(pool);
        _aclManager = IACLManager(aclManager);
        _priceOracle = IPriceOracleGetter(priceOracle);
        
        // Set default values
        minHealthFactorForAuction = 0.95e18;
        nextAuctionId = 0;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Configure auction parameters for a commodity type
     * @param commodityType The commodity type identifier
     * @param duration Auction duration in seconds
     * @param startDiscountBps Starting discount in basis points
     * @param endDiscountBps Ending discount in basis points
     * @param useExponentialDecay Whether to use exponential decay
     * @param allowPhysicalDelivery Whether to allow physical delivery
     */
    function configureAuction(
        bytes32 commodityType,
        uint256 duration,
        uint256 startDiscountBps,
        uint256 endDiscountBps,
        bool useExponentialDecay,
        bool allowPhysicalDelivery
    ) external onlyPoolAdmin {
        if (duration < MIN_AUCTION_DURATION || duration > MAX_AUCTION_DURATION) {
            revert InvalidDuration();
        }
        if (startDiscountBps >= endDiscountBps || endDiscountBps > MAX_DISCOUNT_BPS) {
            revert InvalidDiscount();
        }
        
        auctionConfigs[commodityType] = AuctionConfig({
            duration: duration,
            startDiscountBps: startDiscountBps,
            endDiscountBps: endDiscountBps,
            useExponentialDecay: useExponentialDecay,
            allowPhysicalDelivery: allowPhysicalDelivery
        });
        
        emit AuctionConfigured(
            commodityType,
            duration,
            startDiscountBps,
            endDiscountBps
        );
    }
    
    /**
     * @notice Update minimum health factor for auction
     * @param newMinHealthFactor New minimum health factor
     */
    function setMinHealthFactorForAuction(uint256 newMinHealthFactor) external onlyPoolAdmin {
        minHealthFactorForAuction = newMinHealthFactor;
    }
    
    // ============ Liquidation Functions ============
    
    /**
     * @notice Start a Dutch auction for liquidation
     * @param user The borrower to liquidate
     * @param collateralAsset The collateral asset address
     * @param debtAsset The debt asset address
     * @param commodityType The commodity type
     * @return auctionId The created auction ID
     */
    function startAuction(
        address user,
        address collateralAsset,
        address debtAsset,
        bytes32 commodityType
    ) external nonReentrant returns (uint256) {
        // Verify user is liquidatable
        // Note: Implement actual health factor check against POOL
        // uint256 healthFactor = _pool.getUserHealthFactor(user);
        // if (healthFactor >= minHealthFactorForAuction) {
        //     revert HealthFactorTooHigh();
        // }
        
        // Get auction config
        AuctionConfig memory config = auctionConfigs[commodityType];
        require(config.duration > 0, "Auction not configured");
        
        // Get amounts from pool
        // Note: Implement actual liquidation calculation
        uint256 collateralAmount = 1000e18; // Placeholder
        uint256 debtAmount = 800e18; // Placeholder
        
        // Get oracle price
        uint256 startPrice = _priceOracle.getAssetPrice(collateralAsset);
        
        uint256 auctionId = nextAuctionId++;
        
        auctions[auctionId] = Auction({
            user: user,
            collateralAsset: collateralAsset,
            debtAsset: debtAsset,
            collateralAmount: collateralAmount,
            debtAmount: debtAmount,
            startTime: block.timestamp,
            duration: config.duration,
            startPrice: startPrice,
            startDiscountBps: config.startDiscountBps,
            endDiscountBps: config.endDiscountBps,
            useExponentialDecay: config.useExponentialDecay,
            active: true,
            physicalDeliveryRequested: false
        });
        
        emit AuctionStarted(
            auctionId,
            user,
            collateralAsset,
            collateralAmount,
            debtAmount,
            block.timestamp
        );
        
        return auctionId;
    }
    
    /**
     * @notice Execute auction and purchase collateral
     * @param auctionId The auction ID to execute
     * @param maxPayment Maximum debt payment willing to make
     * @return collateralReceived Amount of collateral received
     * @return debtPaid Amount of debt paid
     */
    function executeAuction(
        uint256 auctionId,
        uint256 maxPayment
    ) external nonReentrant returns (
        uint256 collateralReceived,
        uint256 debtPaid
    ) {
        Auction storage auction = auctions[auctionId];
        
        if (!auction.active) revert AuctionNotActive();
        if (block.timestamp > auction.startTime + auction.duration) {
            revert AuctionExpired();
        }
        
        // Calculate current price with discount
        uint256 currentPrice = _calculateCurrentPrice(auction);
        
        // Calculate collateral to receive
        collateralReceived = (maxPayment * PRECISION) / currentPrice;
        if (collateralReceived > auction.collateralAmount) {
            collateralReceived = auction.collateralAmount;
        }
        
        // Calculate debt to pay
        debtPaid = (collateralReceived * currentPrice) / PRECISION;
        if (debtPaid > maxPayment) revert InsufficientPayment();
        
        // Transfer debt payment from liquidator
        IERC20(auction.debtAsset).safeTransferFrom(
            msg.sender,
            address(this),
            debtPaid
        );
        
        // Transfer collateral to liquidator
        IERC20(auction.collateralAsset).safeTransfer(
            msg.sender,
            collateralReceived
        );
        
        // Update auction state
        auction.collateralAmount -= collateralReceived;
        auction.debtAmount -= debtPaid;
        
        if (auction.collateralAmount == 0 || auction.debtAmount == 0) {
            auction.active = false;
        }
        
        emit AuctionExecuted(
            auctionId,
            msg.sender,
            collateralReceived,
            debtPaid,
            currentPrice
        );
        
        return (collateralReceived, debtPaid);
    }
    
    /**
     * @notice Request physical delivery instead of liquidation
     * @param auctionId The auction ID
     * @dev Only available for configured commodity types
     */
    function requestPhysicalDelivery(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        
        require(auction.active, "Auction not active");
        require(auction.user == msg.sender, "Not auction owner");
        
        // Check if physical delivery is allowed
        // Note: Get commodity type from pool/collateral
        bytes32 commodityType = bytes32("GOLD"); // Placeholder
        require(
            auctionConfigs[commodityType].allowPhysicalDelivery,
            "Physical delivery not allowed"
        );
        
        auction.physicalDeliveryRequested = true;
        auction.active = false;
        
        emit PhysicalDeliveryRequested(auctionId, msg.sender);
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
     * @notice Get price oracle address
     */
    function getPriceOracle() external view returns (address) {
        return address(_priceOracle);
    }
    
    /**
     * @notice Get current auction price
     * @param auctionId The auction ID
     * @return Current discounted price
     */
    function getCurrentPrice(uint256 auctionId) external view returns (uint256) {
        return _calculateCurrentPrice(auctions[auctionId]);
    }
    
    /**
     * @notice Get auction details
     * @param auctionId The auction ID
     * @return Auction struct
     */
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }
    
    /**
     * @notice Get contract version
     * @return version string
     */
    function version() external pure returns (string memory) {
        return "v1.0.0";
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Calculate current price based on time elapsed
     * @param auction The auction data
     * @return Current price with applied discount
     */
    function _calculateCurrentPrice(
        Auction memory auction
    ) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - auction.startTime;
        if (elapsed >= auction.duration) {
            elapsed = auction.duration;
        }
        
        // Calculate discount progression
        uint256 discountBps;
        if (auction.useExponentialDecay) {
            // Exponential decay: discount = start + (end-start) * (1 - e^(-kt))
            // Simplified: Use squared progression
            uint256 progress = (elapsed * PRECISION) / auction.duration;
            uint256 progressSquared = (progress * progress) / PRECISION;
            discountBps = auction.startDiscountBps + 
                ((auction.endDiscountBps - auction.startDiscountBps) * progressSquared) / PRECISION;
        } else {
            // Linear decay
            discountBps = auction.startDiscountBps + 
                ((auction.endDiscountBps - auction.startDiscountBps) * elapsed) / auction.duration;
        }
        
        // Apply discount to oracle price
        return auction.startPrice.percentMul(10000 - discountBps);
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

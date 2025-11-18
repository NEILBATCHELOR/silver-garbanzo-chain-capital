// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC20TemporaryApprovalModule.sol";
import "./storage/TemporaryApprovalStorage.sol";

/**
 * @title ERC20TemporaryApprovalModule
 * @notice Time-based temporary approval system with configurable durations
 * @dev Approvals automatically expire after a specified duration
 * 
 * Features:
 * - Time-based expiration (seconds)
 * - Configurable default/min/max durations
 * - Automatic expiry checking
 * - Security: Reduces risk from forgotten approvals
 * 
 * Architecture:
 * - Stores approval amounts and expiration timestamps
 * - Enforces duration limits (min/max)
 * - Separate contract to avoid stack depth in masters
 * 
 * Use Cases:
 * - Short-term DEX approvals (reduce exposure window)
 * - Time-limited marketplace approvals
 * - Temporary vault access
 * - Controlled spender permissions
 */
contract ERC20TemporaryApprovalModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC20TemporaryApprovalModule,
    TemporaryApprovalStorage
{
    // ============ Roles ============
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize temporary approval module
     * @param admin Admin address
     * @param defaultDuration Default approval duration (seconds)
     * @param minDuration Minimum approval duration (seconds)
     * @param maxDuration Maximum approval duration (seconds)
     */
    function initialize(
        address admin,
        uint256 defaultDuration,
        uint256 minDuration,
        uint256 maxDuration
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        // Set duration configuration
        if (minDuration == 0) minDuration = 300; // 5 minutes default
        if (maxDuration == 0) maxDuration = 86400; // 24 hours default
        if (defaultDuration == 0) defaultDuration = 3600; // 1 hour default
        
        if (minDuration > defaultDuration || defaultDuration > maxDuration) {
            revert InvalidDuration(defaultDuration, minDuration, maxDuration);
        }
        
        _minDuration = minDuration;
        _maxDuration = maxDuration;
        _defaultDuration = defaultDuration;
        _enabled = true;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Grant temporary approval with default duration
     */
    function temporaryApprove(
        address spender,
        uint256 value
    ) external override returns (bool) {
        return temporaryApproveWithDuration(spender, value, _defaultDuration);
    }
    
    /**
     * @notice Grant temporary approval with custom duration
     */
    function temporaryApproveWithDuration(
        address spender,
        uint256 value,
        uint256 duration
    ) public override returns (bool) {
        if (spender == address(0)) revert InvalidSpender();
        if (!_enabled) revert InvalidDuration(duration, _minDuration, _maxDuration);
        if (duration < _minDuration || duration > _maxDuration) {
            revert InvalidDuration(duration, _minDuration, _maxDuration);
        }
        
        address owner = msg.sender;
        uint256 expiry = block.timestamp + duration;
        
        _temporaryApprovals[owner][spender] = TemporaryApproval({
            amount: value,
            expiry: expiry
        });
        
        emit TemporaryApprovalGranted(owner, spender, value, expiry);
        return true;
    }
    
    /**
     * @notice Get temporary allowance (checks expiration)
     */
    function temporaryAllowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        TemporaryApproval memory approval = _temporaryApprovals[owner][spender];
        
        // Return 0 if expired or no approval
        if (approval.expiry == 0 || block.timestamp > approval.expiry) {
            return 0;
        }
        
        return approval.amount;
    }
    
    /**
     * @notice Get temporary allowance expiration time
     */
    function temporaryAllowanceExpiry(
        address owner,
        address spender
    ) external view override returns (uint256) {
        return _temporaryApprovals[owner][spender].expiry;
    }
    
    /**
     * @notice Increase temporary allowance (extends expiry with default duration)
     */
    function increaseTemporaryAllowance(
        address spender,
        uint256 addedValue
    ) external override returns (bool) {
        if (spender == address(0)) revert InvalidSpender();
        
        address owner = msg.sender;
        uint256 currentAllowance = temporaryAllowance(owner, spender);
        uint256 newAllowance = currentAllowance + addedValue;
        uint256 expiry = block.timestamp + _defaultDuration;
        
        _temporaryApprovals[owner][spender] = TemporaryApproval({
            amount: newAllowance,
            expiry: expiry
        });
        
        emit TemporaryApprovalGranted(owner, spender, newAllowance, expiry);
        return true;
    }
    
    /**
     * @notice Decrease temporary allowance (keeps existing expiry)
     */
    function decreaseTemporaryAllowance(
        address spender,
        uint256 subtractedValue
    ) external override returns (bool) {
        if (spender == address(0)) revert InvalidSpender();
        
        address owner = msg.sender;
        uint256 currentAllowance = temporaryAllowance(owner, spender);
        
        if (currentAllowance < subtractedValue) {
            revert InsufficientTemporaryAllowance(
                owner,
                spender,
                subtractedValue,
                currentAllowance
            );
        }
        
        uint256 newAllowance = currentAllowance - subtractedValue;
        TemporaryApproval storage approval = _temporaryApprovals[owner][spender];
        approval.amount = newAllowance;
        
        emit TemporaryApprovalGranted(owner, spender, newAllowance, approval.expiry);
        return true;
    }
    
    /**
     * @notice Spend temporary allowance (checks expiration)
     */
    function spendTemporaryAllowance(
        address owner,
        address spender,
        uint256 value
    ) external override {
        TemporaryApproval storage approval = _temporaryApprovals[owner][spender];
        
        // Check if approval exists and not expired
        if (approval.expiry == 0 || block.timestamp > approval.expiry) {
            revert ApprovalExpired(owner, spender, approval.expiry);
        }
        
        // Check if sufficient allowance
        if (approval.amount < value) {
            revert InsufficientTemporaryAllowance(
                owner,
                spender,
                value,
                approval.amount
            );
        }
        
        // Decrease allowance
        uint256 newAllowance = approval.amount - value;
        approval.amount = newAllowance;
        
        emit TemporaryApprovalUsed(owner, spender, value, newAllowance);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if temporary approvals are enabled
     */
    function isTemporaryApprovalEnabled() external view override returns (bool) {
        return _enabled;
    }
    
    /**
     * @notice Get duration configuration
     */
    function getDurationConfig() external view override returns (
        uint256 defaultDuration,
        uint256 minDuration,
        uint256 maxDuration
    ) {
        return (_defaultDuration, _minDuration, _maxDuration);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Enable/disable temporary approvals
     */
    function setEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _enabled = enabled;
    }
    
    /**
     * @notice Update duration configuration
     */
    function setDurationConfig(
        uint256 defaultDuration,
        uint256 minDuration,
        uint256 maxDuration
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (minDuration > defaultDuration || defaultDuration > maxDuration) {
            revert InvalidDuration(defaultDuration, minDuration, maxDuration);
        }
        
        _defaultDuration = defaultDuration;
        _minDuration = minDuration;
        _maxDuration = maxDuration;
        
        emit DurationConfigUpdated(defaultDuration, minDuration, maxDuration);
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

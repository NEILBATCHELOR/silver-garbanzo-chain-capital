// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC20TemporaryApprovalModule.sol";
import "./storage/TemporaryApprovalStorage.sol";

/**
 * @title ERC20TemporaryApprovalModule
 * @notice ERC-7674 implementation using EIP-1153 transient storage
 * @dev Gas-efficient temporary approvals that auto-expire after transaction
 * 
 * Post-Cancun Upgrade Features:
 * - 99.5% gas savings: ~100 gas vs ~20,000 gas
 * - Auto-expiry: No cleanup needed
 * - Security: Zero cross-transaction exposure
 * - Backwards compatible: Works alongside standard approvals
 * 
 * Architecture:
 * - Uses TSTORE/TLOAD opcodes (EIP-1153)
 * - Minimal persistent storage (only config flag)
 * - Separate contract to avoid stack depth in masters
 * 
 * Use Cases:
 * - DEX token swaps (approve + swap in one transaction)
 * - Batch operations (approve multiple spenders temporarily)
 * - Flash loans (approve + borrow + repay)
 * - Gasless meta-transactions
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
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        _enabled = true;
    }
    
    // ============ Core ERC-7674 Functions ============
    
    /**
     * @notice Grant temporary approval using transient storage
     * @dev Uses TSTORE opcode (EIP-1153) - ~100 gas vs ~20,000 for SSTORE
     */
    function temporaryApprove(
        address spender,
        uint256 value
    ) external override returns (bool) {
        if (spender == address(0)) revert InvalidSpender();
        if (!_enabled) revert TransientStorageNotSupported();
        
        address owner = msg.sender;
        bytes32 slot = _getTemporaryApprovalSlot(owner, spender);
        
        // Store approval in transient storage (TSTORE)
        assembly {
            tstore(slot, value)
        }
        
        emit TemporaryApproval(owner, spender, value);
        return true;
    }
    
    /**
     * @notice Get temporary allowance from transient storage
     * @dev Uses TLOAD opcode (EIP-1153) - ~100 gas vs ~2,100 for SLOAD
     */
    function temporaryAllowance(
        address owner,
        address spender
    ) public view override returns (uint256 allowance) {
        bytes32 slot = _getTemporaryApprovalSlot(owner, spender);
        
        // Load approval from transient storage (TLOAD)
        assembly {
            allowance := tload(slot)
        }
    }
    
    /**
     * @notice Increase temporary allowance
     */
    function increaseTemporaryAllowance(
        address spender,
        uint256 addedValue
    ) external override returns (bool) {
        if (spender == address(0)) revert InvalidSpender();
        
        address owner = msg.sender;
        uint256 currentAllowance = temporaryAllowance(owner, spender);
        uint256 newAllowance = currentAllowance + addedValue;
        
        bytes32 slot = _getTemporaryApprovalSlot(owner, spender);
        assembly {
            tstore(slot, newAllowance)
        }
        
        emit TemporaryApproval(owner, spender, newAllowance);
        return true;
    }
    
    /**
     * @notice Decrease temporary allowance
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
        bytes32 slot = _getTemporaryApprovalSlot(owner, spender);
        
        assembly {
            tstore(slot, newAllowance)
        }
        
        emit TemporaryApproval(owner, spender, newAllowance);
        return true;
    }
    
    /**
     * @notice Spend temporary allowance (called by token during transferFrom)
     * @dev Reverts if insufficient allowance
     */
    function spendTemporaryAllowance(
        address owner,
        address spender,
        uint256 value
    ) external override {
        uint256 currentAllowance = temporaryAllowance(owner, spender);
        
        if (currentAllowance < value) {
            revert InsufficientTemporaryAllowance(
                owner,
                spender,
                value,
                currentAllowance
            );
        }
        
        uint256 newAllowance = currentAllowance - value;
        bytes32 slot = _getTemporaryApprovalSlot(owner, spender);
        
        assembly {
            tstore(slot, newAllowance)
        }
        
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
     * @notice Check if chain supports EIP-1153 transient storage
     * @dev Returns true if TSTORE/TLOAD opcodes available
     */
    function supportsTransientStorage() external view override returns (bool) {
        // Post-Cancun chains support EIP-1153
        // Check by attempting TLOAD (will revert on pre-Cancun)
        try this._testTransientStorage() returns (bool) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Internal test function for transient storage support
     */
    function _testTransientStorage() external view returns (bool) {
        bytes32 slot = keccak256("TEST_SLOT");
        uint256 value;
        assembly {
            value := tload(slot)
        }
        return true;
    }
    
    /**
     * @notice Get gas cost savings vs standard approval
     */
    function getGasSavings() external pure override returns (
        uint256 standardCost,
        uint256 temporaryCost,
        uint256 savingsPercent
    ) {
        standardCost = 20000;  // SSTORE cold slot
        temporaryCost = 100;   // TSTORE operation
        savingsPercent = 9950; // 99.5% savings (basis points)
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Enable/disable temporary approvals
     * @dev Only admin can toggle
     */
    function setEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _enabled = enabled;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

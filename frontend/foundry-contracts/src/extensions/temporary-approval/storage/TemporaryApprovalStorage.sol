// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TemporaryApprovalStorage
 * @notice Storage layout for ERC-7674 temporary approval module
 * @dev Uses minimal persistent storage - transient approvals stored via EIP-1153
 * 
 * Storage Architecture:
 * - Transient Storage (EIP-1153): Approval values (auto-cleared)
 * - Persistent Storage: Configuration flags only
 * 
 * Gas Efficiency:
 * - No storage slots for individual approvals (uses TSTORE/TLOAD)
 * - Only 1 storage slot for module state
 * - Result: 99.5% gas reduction vs standard approval pattern
 */
contract TemporaryApprovalStorage {
    // ============ Configuration ============
    
    /**
     * @notice Module enabled/disabled flag
     * @dev Stored in persistent storage (SSTORE)
     */
    bool internal _enabled;
    
    // ============ Transient Storage Keys ============
    
    /**
     * @notice Base offset for transient storage slots
     * @dev Used to compute unique slots per (owner, spender) pair
     * Formula: slot = keccak256(abi.encodePacked(TEMPORARY_APPROVAL_SLOT, owner, spender))
     */
    bytes32 internal constant TEMPORARY_APPROVAL_SLOT = 
        keccak256("ERC7674.TemporaryApproval");
    
    // ============ Storage Gap ============
    
    /**
     * @notice Storage gap for future upgrades
     * @dev Reserve 49 slots (50 - 1 for _enabled)
     */
    uint256[49] private __gap;
    
    // ============ Internal Helpers ============
    
    /**
     * @notice Compute transient storage slot for approval
     * @dev Returns unique slot per (owner, spender) pair
     * @param owner Token owner
     * @param spender Address allowed to spend
     * @return slot Transient storage slot
     */
    function _getTemporaryApprovalSlot(
        address owner,
        address spender
    ) internal pure returns (bytes32 slot) {
        slot = keccak256(
            abi.encodePacked(TEMPORARY_APPROVAL_SLOT, owner, spender)
        );
    }
}

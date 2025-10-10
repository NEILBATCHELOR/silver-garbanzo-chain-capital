// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SlotApprovableStorage
 * @notice Storage layout for ERC3525SlotApprovableModule
 * @dev Separated storage to enable clean upgrades and avoid storage collisions
 * 
 * Storage Structure:
 * - Slot-level approvals: owner => slot => operator => approved
 * - Operator tracking: owner => slot => array of operators
 * - Slot tracking: owner => operator => array of slots
 */
abstract contract SlotApprovableStorage {
    
    // ============ State Variables ============
    
    /**
     * @dev Mapping from owner => slot => operator => approved
     * Tracks whether an operator is approved to manage owner's tokens in a slot
     */
    mapping(address => mapping(uint256 => mapping(address => bool))) internal _slotApprovals;
    
    /**
     * @dev Mapping from owner => slot => array of approved operators
     * Enables enumeration of all operators approved for a slot
     */
    mapping(address => mapping(uint256 => address[])) internal _approvedOperatorsBySlot;
    
    /**
     * @dev Mapping from owner => slot => operator => index in _approvedOperatorsBySlot
     * Used for efficient removal of operators from array
     */
    mapping(address => mapping(uint256 => mapping(address => uint256))) internal _operatorIndexBySlot;
    
    /**
     * @dev Mapping from owner => operator => array of approved slots
     * Enables enumeration of all slots where operator is approved
     */
    mapping(address => mapping(address => uint256[])) internal _approvedSlotsByOperator;
    
    /**
     * @dev Mapping from owner => operator => slot => index in _approvedSlotsByOperator
     * Used for efficient removal of slots from array
     */
    mapping(address => mapping(address => mapping(uint256 => uint256))) internal _slotIndexByOperator;
    
    // ============ Storage Gap ============
    
    /**
     * @dev Storage gap for future upgrades
     * Reserves 44 slots (50 - 6 used = 44)
     */
    uint256[44] private __gap;
}

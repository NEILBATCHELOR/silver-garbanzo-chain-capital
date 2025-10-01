// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SlotManagerStorage
 * @notice Storage layout for slot manager module (upgradeable-safe)
 * @dev Follows OpenZeppelin storage gap pattern
 */
contract SlotManagerStorage {
    // ============ Slot Data ============
    struct SlotInfo {
        string name;
        string description;
        string metadata;
        string uri;
        bool exists;
        bool active;
        uint256 createdAt;
        address creator;
    }
    
    // slotId => SlotInfo
    mapping(uint256 => SlotInfo) internal _slots;
    
    // Array of all slot IDs for enumeration
    uint256[] internal _slotIds;
    
    // slotId => (account => (permission => hasPermission))
    mapping(uint256 => mapping(address => mapping(bytes32 => bool))) internal _slotPermissions;
    
    // slotId => (propertyKey => propertyValue)
    mapping(uint256 => mapping(string => string)) internal _slotProperties;
    
    // slotId => array of property keys
    mapping(uint256 => string[]) internal _slotPropertyKeys;
    
    // Total number of slots created
    uint256 internal _totalSlots;
    
    // ============ Storage Gap ============
    uint256[43] private __gap;
}

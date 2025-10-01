// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC3525SlotManagerModule
 * @notice Interface for ERC-3525 slot management and categorization
 * @dev Modular slot management system for semi-fungible tokens
 */
interface IERC3525SlotManagerModule {
    // ============ Events ============
    event SlotCreated(uint256 indexed slotId, string name, string description, address indexed creator);
    event SlotMetadataUpdated(uint256 indexed slotId, string metadata, address indexed updater);
    event SlotURIUpdated(uint256 indexed slotId, string uri);
    event SlotStatusChanged(uint256 indexed slotId, bool active);
    
    // ============ Events ============
    event SlotPermissionGranted(uint256 indexed slotId, address indexed account, bytes32 permission);
    event SlotPermissionRevoked(uint256 indexed slotId, address indexed account, bytes32 permission);
    
    // ============ Errors ============
    error SlotAlreadyExists(uint256 slotId);
    error SlotDoesNotExist(uint256 slotId);
    error SlotInactive(uint256 slotId);
    error EmptySlotName();
    error InvalidSlotId();
    
    // ============ Functions ============
    function createSlot(uint256 slotId, string memory name, string memory description) external;
    function setSlotMetadata(uint256 slotId, string memory metadata) external;
    function setSlotURI(uint256 slotId, string memory uri) external;
    function setSlotActive(uint256 slotId, bool active) external;
    function getSlotInfo(uint256 slotId) external view returns (string memory name, string memory description);
    function getSlotMetadata(uint256 slotId) external view returns (string memory);
    function slotExists(uint256 slotId) external view returns (bool);
    function isSlotActive(uint256 slotId) external view returns (bool);
    function totalSlots() external view returns (uint256);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC3525SlotManagerModule.sol";
import "./storage/SlotManagerStorage.sol";

/**
 * @title ERC3525SlotManagerModule
 * @notice Modular slot management system for ERC-3525 tokens
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Features:
 * - Dynamic slot creation
 * - Slot metadata management
 * - Slot activation/deactivation
 * - Slot permissions (future use)
 * - Custom properties per slot
 */
contract ERC3525SlotManagerModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC3525SlotManagerModule,
    SlotManagerStorage
{
    // ============ Roles ============
    bytes32 public constant SLOT_ADMIN_ROLE = keccak256("SLOT_ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Constants ============
    bytes32 public constant MINT_PERMISSION = keccak256("MINT");
    bytes32 public constant TRANSFER_PERMISSION = keccak256("TRANSFER");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize slot manager module
     * @param admin Admin address
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SLOT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Slot Creation & Management ============
    
    function createSlot(
        uint256 slotId,
        string memory name,
        string memory description
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        if (slotId == 0) revert InvalidSlotId();
        if (_slots[slotId].exists) revert SlotAlreadyExists(slotId);
        if (bytes(name).length == 0) revert EmptySlotName();
        
        _slots[slotId] = SlotInfo({
            name: name,
            description: description,
            metadata: "",
            uri: "",
            exists: true,
            active: true,
            createdAt: block.timestamp,
            creator: msg.sender
        });
        
        _slotIds.push(slotId);
        _totalSlots++;
        
        emit SlotCreated(slotId, name, description, msg.sender);
    }
    
    function createSlotBatch(
        uint256[] memory slotIds,
        string[] memory names,
        string[] memory descriptions
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        require(
            slotIds.length == names.length && 
            names.length == descriptions.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < slotIds.length; i++) {
            if (slotIds[i] == 0) revert InvalidSlotId();
            if (_slots[slotIds[i]].exists) revert SlotAlreadyExists(slotIds[i]);
            if (bytes(names[i]).length == 0) revert EmptySlotName();
            
            _slots[slotIds[i]] = SlotInfo({
                name: names[i],
                description: descriptions[i],
                metadata: "",
                uri: "",
                exists: true,
                active: true,
                createdAt: block.timestamp,
                creator: msg.sender
            });
            
            _slotIds.push(slotIds[i]);
            _totalSlots++;
            
            emit SlotCreated(slotIds[i], names[i], descriptions[i], msg.sender);
        }
    }
    
    function setSlotMetadata(
        uint256 slotId,
        string memory metadata
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        
        _slots[slotId].metadata = metadata;
        emit SlotMetadataUpdated(slotId, metadata, msg.sender);
    }
    
    function setSlotURI(
        uint256 slotId,
        string memory uri
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        
        _slots[slotId].uri = uri;
        emit SlotURIUpdated(slotId, uri);
    }
    
    function setSlotActive(
        uint256 slotId,
        bool active
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        
        _slots[slotId].active = active;
        emit SlotStatusChanged(slotId, active);
    }
    
    // ============ Slot Information ============
    
    function getSlotInfo(uint256 slotId) 
        external 
        view 
        returns (string memory name, string memory description) 
    {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        return (_slots[slotId].name, _slots[slotId].description);
    }
    
    function getSlotMetadata(uint256 slotId) 
        external 
        view 
        returns (string memory) 
    {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        return _slots[slotId].metadata;
    }
    
    function getSlotURI(uint256 slotId) 
        external 
        view 
        returns (string memory) 
    {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        return _slots[slotId].uri;
    }
    
    function slotExists(uint256 slotId) external view returns (bool) {
        return _slots[slotId].exists;
    }
    
    function isSlotActive(uint256 slotId) external view returns (bool) {
        return _slots[slotId].exists && _slots[slotId].active;
    }
    
    function totalSlots() external view returns (uint256) {
        return _totalSlots;
    }
    
    function getAllSlots() external view returns (uint256[] memory) {
        return _slotIds;
    }
    
    function getSlotCreatedAt(uint256 slotId) external view returns (uint256) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        return _slots[slotId].createdAt;
    }
    
    // ============ Slot Permissions ============
    
    function grantSlotPermission(
        uint256 slotId,
        address account,
        bytes32 permission
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        
        _slotPermissions[slotId][account][permission] = true;
        emit SlotPermissionGranted(slotId, account, permission);
    }
    
    function revokeSlotPermission(
        uint256 slotId,
        address account,
        bytes32 permission
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        
        _slotPermissions[slotId][account][permission] = false;
        emit SlotPermissionRevoked(slotId, account, permission);
    }
    
    function hasSlotPermission(
        uint256 slotId,
        address account,
        bytes32 permission
    ) external view returns (bool) {
        return _slotPermissions[slotId][account][permission];
    }
    
    // ============ Slot Properties ============
    
    function setSlotProperty(
        uint256 slotId,
        string memory key,
        string memory value
    ) external onlyRole(SLOT_ADMIN_ROLE) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        
        // Add key to array if new
        if (bytes(_slotProperties[slotId][key]).length == 0) {
            _slotPropertyKeys[slotId].push(key);
        }
        
        _slotProperties[slotId][key] = value;
    }
    
    function getSlotProperty(
        uint256 slotId,
        string memory key
    ) external view returns (string memory) {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        return _slotProperties[slotId][key];
    }
    
    function getSlotPropertyKeys(uint256 slotId) 
        external 
        view 
        returns (string[] memory) 
    {
        if (!_slots[slotId].exists) revert SlotDoesNotExist(slotId);
        return _slotPropertyKeys[slotId];
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

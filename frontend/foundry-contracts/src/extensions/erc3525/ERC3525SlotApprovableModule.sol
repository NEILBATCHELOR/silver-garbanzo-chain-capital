// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC3525SlotApprovable.sol";
import "./storage/SlotApprovableStorage.sol";

/**
 * @title ERC3525SlotApprovableModule
 * @notice Modular slot-level approval system for ERC-3525 tokens
 * @dev Separate contract to enable slot-level operator approvals
 * 
 * Features:
 * - Approve operators to manage all tokens in a specific slot
 * - Batch management of same-category tokens
 * - Efficient operator and slot enumeration
 * - Gas-optimized for marketplace and DeFi use cases
 * 
 * Use Cases:
 * - Marketplace approvals for all bonds of same maturity
 * - Fund manager control over all assets in investment category
 * - Game operator managing all items of same tier
 * - DeFi protocol managing all positions of same type
 * 
 * Gas Optimization:
 * - Slot-level approval: ~50k gas (vs individual approvals)
 * - Saves gas when managing multiple tokens in same slot
 * 
 * ERC-165 Interface ID: 0xb688be58
 */
contract ERC3525SlotApprovableModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC3525SlotApprovable,
    SlotApprovableStorage
{
    // ============ Roles ============
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Errors ============
    error InvalidSlot();
    error InvalidOperator();
    error OperatorNotApproved();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize slot approvable module
     * @param admin Admin address
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Slot-Level Approval Functions ============
    
    /**
     * @notice Approve or disapprove an operator to manage all tokens in a slot
     * @dev Emits ApprovalForSlot event
     *      Updates tracking arrays for enumeration
     * @param slot The slot of tokens to approve
     * @param operator The address to approve as operator
     * @param approved True to approve, false to revoke
     */
    function setApprovalForSlot(
        uint256 slot,
        address operator,
        bool approved
    ) external override {
        if (slot == 0) revert InvalidSlot();
        if (operator == address(0)) revert InvalidOperator();
        if (operator == msg.sender) revert InvalidOperator();
        
        bool currentApproval = _slotApprovals[msg.sender][slot][operator];
        
        // No change needed
        if (currentApproval == approved) return;
        
        _slotApprovals[msg.sender][slot][operator] = approved;
        
        if (approved) {
            _addOperatorToSlot(msg.sender, slot, operator);
            _addSlotToOperator(msg.sender, slot, operator);
        } else {
            _removeOperatorFromSlot(msg.sender, slot, operator);
            _removeSlotFromOperator(msg.sender, slot, operator);
        }
        
        emit ApprovalForSlot(msg.sender, slot, operator, approved);
    }
    
    /**
     * @notice Query if operator is authorized for owner's slot
     * @param owner The address that owns the tokens
     * @param slot The slot of tokens being queried
     * @param operator The address to query approval status
     * @return True if operator is approved
     */
    function isApprovedForSlot(
        address owner,
        uint256 slot,
        address operator
    ) external view override returns (bool) {
        return _slotApprovals[owner][slot][operator];
    }
    
    /**
     * @notice Get all operators approved for owner and slot
     * @param owner The token owner address
     * @param slot The slot to query
     * @return Array of approved operator addresses
     */
    function getApprovedOperatorsForSlot(
        address owner,
        uint256 slot
    ) external view override returns (address[] memory) {
        return _approvedOperatorsBySlot[owner][slot];
    }
    
    /**
     * @notice Get all slots where operator is approved for owner
     * @param owner The token owner address
     * @param operator The operator address
     * @return Array of slot IDs where operator is approved
     */
    function getApprovedSlotsForOperator(
        address owner,
        address operator
    ) external view override returns (uint256[] memory) {
        return _approvedSlotsByOperator[owner][operator];
    }
    
    // ============ Internal Helper Functions ============
    
    /**
     * @notice Add operator to slot's operator list
     * @dev Updates operator index for efficient removal
     */
    function _addOperatorToSlot(
        address owner,
        uint256 slot,
        address operator
    ) private {
        uint256 index = _approvedOperatorsBySlot[owner][slot].length;
        _approvedOperatorsBySlot[owner][slot].push(operator);
        _operatorIndexBySlot[owner][slot][operator] = index;
    }
    
    /**
     * @notice Remove operator from slot's operator list
     * @dev Uses swap-and-pop for gas efficiency
     */
    function _removeOperatorFromSlot(
        address owner,
        uint256 slot,
        address operator
    ) private {
        uint256 index = _operatorIndexBySlot[owner][slot][operator];
        uint256 lastIndex = _approvedOperatorsBySlot[owner][slot].length - 1;
        
        if (index != lastIndex) {
            address lastOperator = _approvedOperatorsBySlot[owner][slot][lastIndex];
            _approvedOperatorsBySlot[owner][slot][index] = lastOperator;
            _operatorIndexBySlot[owner][slot][lastOperator] = index;
        }
        
        _approvedOperatorsBySlot[owner][slot].pop();
        delete _operatorIndexBySlot[owner][slot][operator];
    }
    
    /**
     * @notice Add slot to operator's slot list
     * @dev Updates slot index for efficient removal
     */
    function _addSlotToOperator(
        address owner,
        uint256 slot,
        address operator
    ) private {
        uint256 index = _approvedSlotsByOperator[owner][operator].length;
        _approvedSlotsByOperator[owner][operator].push(slot);
        _slotIndexByOperator[owner][operator][slot] = index;
    }
    
    /**
     * @notice Remove slot from operator's slot list
     * @dev Uses swap-and-pop for gas efficiency
     */
    function _removeSlotFromOperator(
        address owner,
        uint256 slot,
        address operator
    ) private {
        uint256 index = _slotIndexByOperator[owner][operator][slot];
        uint256 lastIndex = _approvedSlotsByOperator[owner][operator].length - 1;
        
        if (index != lastIndex) {
            uint256 lastSlot = _approvedSlotsByOperator[owner][operator][lastIndex];
            _approvedSlotsByOperator[owner][operator][index] = lastSlot;
            _slotIndexByOperator[owner][operator][lastSlot] = index;
        }
        
        _approvedSlotsByOperator[owner][operator].pop();
        delete _slotIndexByOperator[owner][operator][slot];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Authorize contract upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    // ============ ERC-165 Support ============
    
    /**
     * @notice Check interface support
     * @dev Supports IERC3525SlotApprovable (0xb688be58)
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            interfaceId == type(IERC3525SlotApprovable).interfaceId ||
            interfaceId == 0xb688be58 || // ERC-3525 SlotApprovable
            super.supportsInterface(interfaceId);
    }
}

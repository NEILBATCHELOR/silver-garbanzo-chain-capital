// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

/**
 * @title ERC3525Master
 * @notice Semi-Fungible Token implementation with slot-based value system
 * @dev Simplified ERC-3525 implementation focusing on core functionality
 * 
 * Key Concepts:
 * - Each token has a unique ID (like ERC-721)
 * - Each token belongs to a SLOT (category/type)
 * - Tokens in same slot can transfer VALUE between them (like ERC-20)
 * 
 * Use Cases:
 * - Financial instruments (bonds, derivatives)
 * - Fractional ownership
 * - Utility tokens with categories
 * - Gaming items with attributes
 * - Subscription tiers
 * 
 * Example:
 * Slot 1 = "Gold Membership" -> Token #1 (value: 100), Token #2 (value: 50)
 * Slot 2 = "Silver Membership" -> Token #3 (value: 200)
 * Can transfer value between #1 and #2, but not between #1 and #3
 * 
 * Policy Engine Integration:
 * - Mint operations (ERC3525_MINT)
 * - Transfer operations (ERC3525_TRANSFER)
 * - Value transfer operations (ERC3525_TRANSFER_VALUE)
 * - Approval operations (ERC3525_APPROVE, ERC3525_APPROVE_VALUE, ERC3525_SET_APPROVAL_FOR_ALL)
 */
contract ERC3525Master is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using Strings for uint256;
    using Address for address;
    
    // ============ Roles ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    string public name;
    string public symbol;
    uint8 public decimals;
    
    // Token data
    struct TokenData {
        uint256 slot;
        uint256 value;
        address owner;
        address approved;
    }
    
    uint256 private _tokenIdCounter;
    mapping(uint256 => TokenData) private _tokens;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => mapping(address => uint256)) private _valueApprovals;
    
    // Metadata URIs
    string private _baseTokenURI;
    string private _baseSlotURI;
    mapping(uint256 => string) private _slotURIs;
    mapping(uint256 => string) private _tokenURIs;
    
    // ============ Extension Modules ============
    /// @notice Policy engine for operation validation
    address public policyEngine;
    
    // ============ Storage Gap ============
    uint256[39] private __gap;
    
    // ============ Events ============
    event TransferValue(
        uint256 indexed fromTokenId,
        uint256 indexed toTokenId,
        uint256 value
    );
    
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );
    
    event ApprovalValue(
        uint256 indexed tokenId,
        address indexed operator,
        uint256 value
    );
    
    event SlotChanged(
        uint256 indexed tokenId,
        uint256 indexed oldSlot,
        uint256 indexed newSlot
    );
    
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    
    // ============ Errors ============
    error InvalidToken();
    error NotTokenOwner();
    error InsufficientValue();
    error InvalidSlot();
    error NotApproved();
    error InvalidReceiver();
    error TransferToSelf();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the semi-fungible token
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Value decimals
     * @param owner_ Owner address
     */
    function initialize(
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        address owner_
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
        _grantRole(MINTER_ROLE, owner_);
        _grantRole(PAUSER_ROLE, owner_);
        _grantRole(UPGRADER_ROLE, owner_);
    }
    
    // ============ Minting ============
    
    /**
     * @notice Mint new token with slot and value
     * @param to Recipient address
     * @param slot Token slot (category)
     * @param value Token value
     * @return tokenId New token ID
     */
    function mint(
        address to,
        uint256 slot,
        uint256 value
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC3525_MINT, value);
        
        if (to == address(0)) revert InvalidReceiver();
        
        tokenId = ++_tokenIdCounter;
        
        _tokens[tokenId] = TokenData({
            slot: slot,
            value: value,
            owner: to,
            approved: address(0)
        });
        
        _balances[to]++;
        
        emit Transfer(address(0), to, tokenId);
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Get token slot
     */
    function slotOf(uint256 tokenId) public view returns (uint256) {
        if (_tokens[tokenId].owner == address(0)) revert InvalidToken();
        return _tokens[tokenId].slot;
    }
    
    /**
     * @notice Get token value
     */
    function balanceOf(uint256 tokenId) public view returns (uint256) {
        if (_tokens[tokenId].owner == address(0)) revert InvalidToken();
        return _tokens[tokenId].value;
    }
    
    /**
     * @notice Get owner of token
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _tokens[tokenId].owner;
        if (owner == address(0)) revert InvalidToken();
        return owner;
    }
    
    /**
     * @notice Get token count for address
     */
    function balanceOf(address owner) public view returns (uint256) {
        return _balances[owner];
    }
    
    // ============ Transfer Functions ============
    
    /**
     * @notice Transfer token to another address
     * @param from Current owner
     * @param to New owner
     * @param tokenId Token ID
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public whenNotPaused {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC3525_TRANSFER, to, 1);
        
        if (to == address(0)) revert InvalidReceiver();
        if (from == to) revert TransferToSelf();
        
        TokenData storage token = _tokens[tokenId];
        if (token.owner != from) revert NotTokenOwner();
        
        if (
            msg.sender != from &&
            msg.sender != token.approved &&
            !_operatorApprovals[from][msg.sender]
        ) {
            revert NotApproved();
        }
        
        _balances[from]--;
        _balances[to]++;
        token.owner = to;
        token.approved = address(0);
        
        emit Transfer(from, to, tokenId);
    }
    
    /**
     * @notice Transfer value from one token to another (same slot only)
     * @param fromTokenId Source token
     * @param toTokenId Destination token
     * @param value Amount to transfer
     */
    function transferValueFrom(
        uint256 fromTokenId,
        uint256 toTokenId,
        uint256 value
    ) public whenNotPaused {
        TokenData storage fromToken = _tokens[fromTokenId];
        TokenData storage toToken = _tokens[toTokenId];
        
        if (fromToken.owner == address(0) || toToken.owner == address(0)) {
            revert InvalidToken();
        }
        if (fromToken.slot != toToken.slot) revert InvalidSlot();
        if (fromToken.value < value) revert InsufficientValue();
        
        address fromOwner = fromToken.owner;
        if (
            msg.sender != fromOwner &&
            !_operatorApprovals[fromOwner][msg.sender] &&
            _valueApprovals[fromTokenId][msg.sender] < value
        ) {
            revert NotApproved();
        }
        
        // Validate with policy engine (to token owner)
        _validatePolicyWithTarget(
            PolicyOperationTypes.ERC3525_TRANSFER_VALUE,
            toToken.owner,
            value
        );
        
        fromToken.value -= value;
        toToken.value += value;
        
        // Only decrease approval if caller is not the owner
        if (msg.sender != fromOwner && _valueApprovals[fromTokenId][msg.sender] != type(uint256).max) {
            _valueApprovals[fromTokenId][msg.sender] -= value;
        }
        
        emit TransferValue(fromTokenId, toTokenId, value);
    }
    
    // ============ Approval Functions ============
    
    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !_operatorApprovals[owner][msg.sender]) {
            revert NotApproved();
        }
        
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC3525_APPROVE, to, 1);
        
        _tokens[tokenId].approved = to;
        emit Approval(owner, to, tokenId);
    }
    
    function setApprovalForAll(address operator, bool approved) public {
        // Validate with policy engine
        _validatePolicyWithTarget(
            PolicyOperationTypes.ERC3525_SET_APPROVAL_FOR_ALL,
            operator,
            approved ? 1 : 0
        );
        
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function approveValue(
        uint256 tokenId,
        address operator,
        uint256 value
    ) public {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !_operatorApprovals[owner][msg.sender]) {
            revert NotApproved();
        }
        
        // Validate with policy engine
        _validatePolicyWithTarget(
            PolicyOperationTypes.ERC3525_APPROVE_VALUE,
            operator,
            value
        );
        
        _valueApprovals[tokenId][operator] = value;
        emit ApprovalValue(tokenId, operator, value);
    }
    
    // ============ Extension Module Management ============
    
    /**
     * @notice Set or update the policy engine
     * @param engine_ Address of policy engine (address(0) to disable)
     * @dev Only admin can update policy engine
     */
    function setPolicyEngine(address engine_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldEngine = policyEngine;
        policyEngine = engine_;
        emit PolicyEngineUpdated(oldEngine, engine_);
    }
    
    // ============ Policy Validation Helpers ============
    
    /**
     * @notice Validate operation with policy engine (if configured)
     * @param operationType Operation type constant from PolicyOperationTypes
     * @param amount Value/amount involved
     * @dev Optimized for minimal gas - early exit if policyEngine not set (~200 gas)
     */
    function _validatePolicy(
        string memory operationType,
        uint256 amount
    ) internal {
        // Early exit: Skip if policy engine not configured
        if (policyEngine == address(0)) return;
        
        // Call policy engine validation
        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperation(
            address(this),  // token address
            msg.sender,     // operator
            operationType,  // operation type
            amount          // amount/value
        );
        
        // Revert if not approved
        require(approved, reason);
    }
    
    /**
     * @notice Validate operation with target address
     * @param operationType Operation type constant
     * @param target Target address (to/from/operator)
     * @param amount Value/amount involved
     */
    function _validatePolicyWithTarget(
        string memory operationType,
        address target,
        uint256 amount
    ) internal {
        // Early exit: Skip if policy engine not configured
        if (policyEngine == address(0)) return;
        
        // Call policy engine validation with target
        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperationWithTarget(
            address(this),
            msg.sender,
            target,
            operationType,
            amount
        );
        
        // Revert if not approved
        require(approved, reason);
    }
    
    // ============ Admin Functions ============
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function setBaseURI(string memory baseURI) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _baseTokenURI = baseURI;
    }
    
    function setBaseSlotURI(string memory baseSlotURI_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _baseSlotURI = baseSlotURI_;
    }
    
    function setTokenURI(uint256 tokenId, string memory uri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (_tokens[tokenId].owner == address(0)) revert InvalidToken();
        _tokenURIs[tokenId] = uri;
    }
    
    function setSlotURI(uint256 slot, string memory uri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _slotURIs[slot] = uri;
    }
    
    // ============ Metadata View Functions ============
    
    /**
     * @notice Get base token URI
     * @return Base URI for token metadata
     */
    function baseTokenURI() public view returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @notice Get base slot URI  
     * @return Base URI for slot metadata
     */
    function baseSlotURI() public view returns (string memory) {
        return _baseSlotURI;
    }
    
    /**
     * @notice Get token URI
     * @param tokenId Token ID
     * @return Token metadata URI
     */
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        if (_tokens[tokenId].owner == address(0)) revert InvalidToken();
        
        string memory _tokenURI = _tokenURIs[tokenId];
        
        // If token has specific URI, return it
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        
        // Otherwise, concatenate base URI + tokenId
        string memory base = _baseTokenURI;
        if (bytes(base).length == 0) {
            return "";
        }
        
        return string(abi.encodePacked(base, tokenId.toString()));
    }
    
    /**
     * @notice Get slot URI
     * @param slot Slot ID
     * @return Slot metadata URI
     */
    function slotURI(uint256 slot) public view returns (string memory) {
        string memory _slotURI = _slotURIs[slot];
        
        // If slot has specific URI, return it
        if (bytes(_slotURI).length > 0) {
            return _slotURI;
        }
        
        // Otherwise, concatenate base slot URI + slot
        string memory base = _baseSlotURI;
        if (bytes(base).length == 0) {
            return "";
        }
        
        return string(abi.encodePacked(base, slot.toString()));
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    // ============ View Functions ============
    
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

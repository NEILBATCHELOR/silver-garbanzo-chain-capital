// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./interfaces/IERC3525.sol";

/**
 * @title BaseERC3525Token
 * @dev A foundry-optimized implementation of ERC-3525 Semi-Fungible Token
 * @notice This contract provides a configurable implementation of ERC-3525 with slots and values
 */
contract BaseERC3525Token is ERC721, IERC3525, IERC2981, Ownable, ReentrancyGuard {
    
    // ========== CONFIGURATION STRUCTS ==========
    
    struct TokenConfig {
        string name;
        string symbol;
        uint8 valueDecimals;
        bool mintingEnabled;
        bool burningEnabled;
        bool transfersPaused;
        address initialOwner;
    }

    struct SlotInfo {
        string name;
        string description;
        bool isActive;
        uint256 maxSupply;
        uint256 currentSupply;
        bytes metadata;
    }

    struct AllocationInfo {
        uint256 slot;
        address recipient;
        uint256 value;
        string description;
    }

    // ========== STATE VARIABLES ==========
    
    uint8 private _valueDecimals;
    bool public mintingEnabled;
    bool public burningEnabled;
    bool public transfersPaused;
    
    // Token tracking
    uint256 private _nextTokenId;
    uint256 private _nextSlotId;
    
    // Token data
    mapping(uint256 => uint256) private _tokenSlots;
    mapping(uint256 => uint256) private _tokenValues;
    mapping(uint256 => mapping(address => uint256)) private _allowances;
    
    // Slot data
    mapping(uint256 => SlotInfo) private _slots;
    mapping(uint256 => uint256[]) private _slotTokens;
    
    // Royalty info
    uint96 private _royaltyFraction; // In basis points (1/10000)
    address private _royaltyRecipient;
    
    // ========== EVENTS ==========
    
    event SlotCreated(uint256 indexed slot, string name, string description);
    event SlotUpdated(uint256 indexed slot, string name, string description, bool isActive);
    event TokenMinted(uint256 indexed tokenId, uint256 indexed slot, uint256 value, address to);
    event ValueIncreased(uint256 indexed tokenId, uint256 value, uint256 newValue);
    event ValueDecreased(uint256 indexed tokenId, uint256 value, uint256 newValue);
    event TransfersPaused();
    event TransfersUnpaused();
    
    // ========== ERRORS ==========
    
    error ERC3525_InvalidConfiguration();
    error ERC3525_MintingDisabled();
    error ERC3525_BurningDisabled();
    error ERC3525_TransfersPaused();
    error ERC3525_SlotNotFound();
    error ERC3525_SlotInactive();
    error ERC3525_TokenNotFound();
    error ERC3525_InsufficientValue();
    error ERC3525_SlotMismatch();
    error ERC3525_Unauthorized();
    error ERC3525_ExceedsMaxSupply();
    
    // ========== CONSTRUCTOR ==========
    
    constructor(
        TokenConfig memory config,
        SlotInfo[] memory initialSlots,
        AllocationInfo[] memory allocations,
        uint96 royaltyFraction,
        address royaltyRecipient
    ) ERC721(config.name, config.symbol) Ownable(config.initialOwner) {
        if (bytes(config.name).length == 0 || bytes(config.symbol).length == 0) {
            revert ERC3525_InvalidConfiguration();
        }
        
        _valueDecimals = config.valueDecimals;
        mintingEnabled = config.mintingEnabled;
        burningEnabled = config.burningEnabled;
        transfersPaused = config.transfersPaused;
        
        _nextTokenId = 1;
        _nextSlotId = 1;
        
        // Set royalty info
        _royaltyFraction = royaltyFraction;
        _royaltyRecipient = royaltyRecipient;
        
        // Create initial slots
        for (uint256 i = 0; i < initialSlots.length; i++) {
            _createSlot(
                initialSlots[i].name,
                initialSlots[i].description,
                initialSlots[i].maxSupply,
                initialSlots[i].metadata
            );
        }
        
        // Process initial allocations
        for (uint256 i = 0; i < allocations.length; i++) {
            _mintToken(
                allocations[i].recipient,
                allocations[i].slot,
                allocations[i].value
            );
        }
    }
    
    // ========== ERC3525 IMPLEMENTATION ==========
    
    function valueDecimals() public view override returns (uint8) {
        return _valueDecimals;
    }
    
    function slotOf(uint256 tokenId) public view override returns (uint256) {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        return _tokenSlots[tokenId];
    }
    
    function balanceOf(uint256 tokenId) public view override returns (uint256) {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        return _tokenValues[tokenId];
    }
    
    function approve(uint256 tokenId, address operator, uint256 value) 
        public 
        payable 
        override 
    {
        address owner = ownerOf(tokenId);
        if (operator == owner) revert ERC3525_InvalidConfiguration();
        
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender)) {
            revert ERC3525_Unauthorized();
        }
        
        _allowances[tokenId][operator] = value;
        emit ApprovalValue(tokenId, operator, value);
    }
    
    function allowance(uint256 tokenId, address operator) 
        public 
        view 
        override 
        returns (uint256) 
    {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        return _allowances[tokenId][operator];
    }
    
    function transferFrom(uint256 fromTokenId, uint256 toTokenId, uint256 value) 
        public 
        payable 
        override 
        nonReentrant 
    {
        if (transfersPaused) revert ERC3525_TransfersPaused();
        if (!_exists(fromTokenId)) revert ERC3525_TokenNotFound();
        if (!_exists(toTokenId)) revert ERC3525_TokenNotFound();
        
        uint256 fromSlot = _tokenSlots[fromTokenId];
        uint256 toSlot = _tokenSlots[toTokenId];
        if (fromSlot != toSlot) revert ERC3525_SlotMismatch();
        
        address owner = ownerOf(fromTokenId);
        _checkTransferAuth(owner, fromTokenId, value);
        
        if (_tokenValues[fromTokenId] < value) revert ERC3525_InsufficientValue();
        
        _tokenValues[fromTokenId] -= value;
        _tokenValues[toTokenId] += value;
        
        emit TransferValue(fromTokenId, toTokenId, value);
    }
    
    function transferFrom(uint256 fromTokenId, address to, uint256 value) 
        public 
        payable 
        override 
        nonReentrant 
        returns (uint256) 
    {
        if (transfersPaused) revert ERC3525_TransfersPaused();
        if (!_exists(fromTokenId)) revert ERC3525_TokenNotFound();
        if (to == address(0)) revert ERC3525_InvalidConfiguration();
        
        address owner = ownerOf(fromTokenId);
        _checkTransferAuth(owner, fromTokenId, value);
        
        if (_tokenValues[fromTokenId] < value) revert ERC3525_InsufficientValue();
        
        uint256 slot = _tokenSlots[fromTokenId];
        uint256 newTokenId = _nextTokenId++;
        
        _tokenValues[fromTokenId] -= value;
        
        _mint(to, newTokenId);
        _tokenSlots[newTokenId] = slot;
        _tokenValues[newTokenId] = value;
        _slotTokens[slot].push(newTokenId);
        
        emit TransferValue(fromTokenId, newTokenId, value);
        return newTokenId;
    }
    
    // ========== SLOT MANAGEMENT ==========
    
    function createSlot(
        string memory name,
        string memory description,
        uint256 maxSupply,
        bytes memory metadata
    ) external onlyOwner returns (uint256) {
        return _createSlot(name, description, maxSupply, metadata);
    }
    
    function updateSlot(
        uint256 slot,
        string memory name,
        string memory description,
        bool isActive
    ) external onlyOwner {
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        
        _slots[slot].name = name;
        _slots[slot].description = description;
        _slots[slot].isActive = isActive;
        
        emit SlotUpdated(slot, name, description, isActive);
    }
    
    function getSlot(uint256 slot) external view returns (SlotInfo memory) {
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        return _slots[slot];
    }
    
    function getSlotTokens(uint256 slot) external view returns (uint256[] memory) {
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        return _slotTokens[slot];
    }
    
    // ========== TOKEN MANAGEMENT ==========
    
    function mint(address to, uint256 slot, uint256 value) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        if (!mintingEnabled) revert ERC3525_MintingDisabled();
        return _mintToken(to, slot, value);
    }
    
    function burn(uint256 tokenId) external {
        if (!burningEnabled) revert ERC3525_BurningDisabled();
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        
        address tokenOwner = ownerOf(tokenId);
        address contractOwner = owner();
        if (msg.sender != tokenOwner && msg.sender != contractOwner && !isApprovedForAll(tokenOwner, msg.sender)) {
            revert ERC3525_Unauthorized();
        }
        
        uint256 slot = _tokenSlots[tokenId];
        _removeFromSlot(slot, tokenId);
        
        delete _tokenSlots[tokenId];
        delete _tokenValues[tokenId];
        
        _burn(tokenId);
    }
    
    function increaseValue(uint256 tokenId, uint256 value) external onlyOwner {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        
        uint256 oldValue = _tokenValues[tokenId];
        uint256 newValue = oldValue + value;
        
        _tokenValues[tokenId] = newValue;
        emit ValueIncreased(tokenId, value, newValue);
    }
    
    function decreaseValue(uint256 tokenId, uint256 value) external {
        if (!_exists(tokenId)) revert ERC3525_TokenNotFound();
        if (_tokenValues[tokenId] < value) revert ERC3525_InsufficientValue();
        
        address tokenOwner = ownerOf(tokenId);
        address contractOwner = owner();
        if (msg.sender != tokenOwner && msg.sender != contractOwner) {
            revert ERC3525_Unauthorized();
        }
        
        uint256 oldValue = _tokenValues[tokenId];
        uint256 newValue = oldValue - value;
        
        _tokenValues[tokenId] = newValue;
        emit ValueDecreased(tokenId, value, newValue);
    }
    
    // ========== CONTROL FUNCTIONS ==========
    
    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
        emit TransfersPaused();
    }
    
    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
        emit TransfersUnpaused();
    }
    
    function enableMinting() external onlyOwner {
        mintingEnabled = true;
    }
    
    function disableMinting() external onlyOwner {
        mintingEnabled = false;
    }
    
    function enableBurning() external onlyOwner {
        burningEnabled = true;
    }
    
    function disableBurning() external onlyOwner {
        burningEnabled = false;
    }
    
    // ========== ROYALTY INFO ==========
    
    function royaltyInfo(uint256, uint256 salePrice) 
        external 
        view 
        override 
        returns (address, uint256) 
    {
        uint256 royaltyAmount = (salePrice * _royaltyFraction) / 10000;
        return (_royaltyRecipient, royaltyAmount);
    }
    
    function setRoyaltyInfo(address recipient, uint96 fraction) external onlyOwner {
        _royaltyRecipient = recipient;
        _royaltyFraction = fraction;
    }
    
    // ========== OVERRIDES ==========
    
    function transferFrom(address from, address to, uint256 tokenId) 
        public 
        override(ERC721, IERC721) 
    {
        if (transfersPaused) revert ERC3525_TransfersPaused();
        super.transferFrom(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) 
        public 
        override(ERC721, IERC721) 
    {
        if (transfersPaused) revert ERC3525_TransfersPaused();
        super.safeTransferFrom(from, to, tokenId, data);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, IERC165) 
        returns (bool) 
    {
        return
            interfaceId == type(IERC3525).interfaceId ||
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    
    function _createSlot(
        string memory name,
        string memory description,
        uint256 maxSupply,
        bytes memory metadata
    ) internal returns (uint256) {
        uint256 slot = _nextSlotId++;
        
        _slots[slot] = SlotInfo({
            name: name,
            description: description,
            isActive: true,
            maxSupply: maxSupply,
            currentSupply: 0,
            metadata: metadata
        });
        
        emit SlotCreated(slot, name, description);
        return slot;
    }
    
    function _mintToken(address to, uint256 slot, uint256 value) 
        internal 
        returns (uint256) 
    {
        if (!_slotExists(slot)) revert ERC3525_SlotNotFound();
        if (!_slots[slot].isActive) revert ERC3525_SlotInactive();
        
        SlotInfo storage slotInfo = _slots[slot];
        if (slotInfo.maxSupply > 0 && slotInfo.currentSupply >= slotInfo.maxSupply) {
            revert ERC3525_ExceedsMaxSupply();
        }
        
        uint256 tokenId = _nextTokenId++;
        
        _mint(to, tokenId);
        _tokenSlots[tokenId] = slot;
        _tokenValues[tokenId] = value;
        _slotTokens[slot].push(tokenId);
        
        slotInfo.currentSupply++;
        
        emit TokenMinted(tokenId, slot, value, to);
        return tokenId;
    }
    
    function _checkTransferAuth(address owner, uint256 tokenId, uint256 value) 
        internal 
        view 
    {
        if (msg.sender == owner || isApprovedForAll(owner, msg.sender)) {
            return;
        }
        
        if (_allowances[tokenId][msg.sender] < value) {
            revert ERC3525_Unauthorized();
        }
    }
    
    function _slotExists(uint256 slot) internal view returns (bool) {
        return bytes(_slots[slot].name).length > 0;
    }
    
    function _removeFromSlot(uint256 slot, uint256 tokenId) internal {
        uint256[] storage tokens = _slotTokens[slot];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
        _slots[slot].currentSupply--;
    }
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}

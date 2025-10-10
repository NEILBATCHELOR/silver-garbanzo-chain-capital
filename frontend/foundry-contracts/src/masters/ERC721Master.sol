// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

// Extension Module Interfaces
import "../extensions/royalty/interfaces/IERC721RoyaltyModule.sol";
import "../extensions/rental/interfaces/IERC721RentalModule.sol";
import "../extensions/soulbound/interfaces/IERC721SoulboundModule.sol";
import "../extensions/fractionalization/interfaces/IERC721FractionModule.sol";
import "../extensions/consecutive/interfaces/IERC721ConsecutiveModule.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

/**
 * @title ERC721Master
 * @notice Modern ERC-721 (NFT) implementation with modular extension support
 * @dev Inherits from only 5 parent contracts to maintain simplicity
 * 
 * Features:
 * - Minting/Burning
 * - Pausable transfers
 * - Owner-based access control
 * - Token URI storage
 * - Enumerable (track all tokens)
 * - UUPS upgradeability
 * - Lock/Unlock individual NFTs
 * - Block/Unblock addresses
 * - Policy enforcement for operations
 * 
 * Supported Extension Modules (Optional):
 * - Royalty: EIP-2981 royalty standard
 * - Policy: On-chain policy enforcement
 * - Rental: Temporary NFT usage rights
 * - Soulbound: Non-transferable KYC credentials
 * - Fractionalization: Partial ownership via ERC20 shares
 * - Consecutive: Gas-optimized batch minting (EIP-2309)
 * 
 * Gas-optimized for minimal proxy deployment pattern
 */
contract ERC721Master is
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // ============ Configuration ============
    uint256 public maxSupply;
    bool public mintingEnabled;
    bool public burningEnabled;
    bool public transfersPaused;
    string public baseTokenURI;
    
    // ============ Lock Mechanism ============
    mapping(uint256 => bool) public lockedTokens;
    mapping(uint256 => uint256) public tokenLockExpiry;
    
    // ============ Block Mechanism ============
    mapping(address => bool) public blockedAddresses;
    
    // ============ Minting Tracking ============
    uint256 private _nextTokenId;
    
    // ============ Extension Modules (Modular Pattern) ============
    /// @notice Royalty module for EIP-2981 standard
    address public royaltyModule;
    
    /// @notice Policy engine for operation validation
    address public policyEngine;
    
    /// @notice Rental module for temporary NFT usage rights
    address public rentalModule;
    
    /// @notice Soulbound module for non-transferable credentials
    address public soulboundModule;
    
    /// @notice Fractionalization module for partial ownership
    address public fractionModule;
    
    /// @notice Consecutive minting module for gas optimization
    address public consecutiveModule;
    
    // ============ Storage Gap ============
    // Reserve 34 slots for future upgrades (40 - 6 module addresses)
    uint256[34] private __gap;

    // ============ Events ============
    event NFTMinted(address indexed to, uint256 indexed tokenId, string uri);
    event NFTBurned(uint256 indexed tokenId);
    event NFTLocked(uint256 indexed tokenId, uint256 until);
    event NFTUnlocked(uint256 indexed tokenId);
    event AddressBlocked(address indexed account);
    event AddressUnblocked(address indexed account);
    event ContractUpgraded(address indexed newImplementation);
    
    // Module update events
    event RoyaltyModuleUpdated(address indexed oldModule, address indexed newModule);
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event RentalModuleUpdated(address indexed oldModule, address indexed newModule);
    event SoulboundModuleUpdated(address indexed oldModule, address indexed newModule);
    event FractionModuleUpdated(address indexed oldModule, address indexed newModule);
    event ConsecutiveModuleUpdated(address indexed oldModule, address indexed newModule);
    
    // ============ Errors ============
    error TransfersPaused();
    error MintingDisabled();
    error BurningDisabled();
    error MaxSupplyExceeded();
    error TokenLocked();
    error AddressIsBlocked();
    error TokenStillLocked();
    error InvalidTokenId();
    error ModuleNotSet();
    error TransferBlocked(string reason);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the NFT collection
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param _name Collection name (e.g., "Chain Capital NFTs")
     * @param _symbol Collection symbol (e.g., "CCNFT")
     * @param _baseTokenURI Base URI for metadata (e.g., "ipfs://...")
     * @param _maxSupply Maximum number of NFTs (0 = unlimited)
     * @param _owner Collection owner address
     * @param _mintingEnabled Whether minting is initially enabled
     * @param _burningEnabled Whether burning is initially enabled
     */
    function initialize(
        string calldata _name,
        string calldata _symbol,
        string calldata _baseTokenURI,
        uint256 _maxSupply,
        address _owner,
        bool _mintingEnabled,
        bool _burningEnabled
    ) public initializer {
        __ERC721_init(_name, _symbol);
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        baseTokenURI = _baseTokenURI;
        maxSupply = _maxSupply;
        mintingEnabled = _mintingEnabled;
        burningEnabled = _burningEnabled;
        _nextTokenId = 1; // Start from token ID 1
    }

    // ============ Minting Functions ============
    
    /**
     * @notice Mint a new NFT with metadata URI
     * @param to Address to receive the NFT
     * @param uri Metadata URI (IPFS CID or full URL)
     */
    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC721_MINT, 1);
        
        if (!mintingEnabled) revert MintingDisabled();
        if (maxSupply > 0 && _nextTokenId > maxSupply) revert MaxSupplyExceeded();
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(to, tokenId, uri);
        return tokenId;
    }
    
    /**
     * @notice Batch mint multiple NFTs (gas-optimized)
     * @param to Address to receive NFTs
     * @param uris Array of metadata URIs
     */
    function batchMint(address to, string[] memory uris) external onlyOwner returns (uint256[] memory) {
        uint256 count = uris.length;
        
        // Validate with policy engine (batch operation)
        _validatePolicy(PolicyOperationTypes.ERC721_MINT_BATCH, count);
        
        if (!mintingEnabled) revert MintingDisabled();
        
        uint256[] memory tokenIds = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            if (maxSupply > 0 && _nextTokenId > maxSupply) revert MaxSupplyExceeded();
            
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uris[i]);
            tokenIds[i] = tokenId;
            
            emit NFTMinted(to, tokenId, uris[i]);
        }
        
        return tokenIds;
    }

    // ============ Burning Functions ============
    
    /**
     * @notice Burn (destroy) an NFT
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC721_BURN, 1);
        
        if (!burningEnabled) revert BurningDisabled();
        if (ownerOf(tokenId) != msg.sender) revert InvalidTokenId();
        
        _burn(tokenId);
        emit NFTBurned(tokenId);
    }
    
    // ============ Lock Functions ============
    
    /**
     * @notice Lock an NFT to prevent transfers
     * @param tokenId Token ID to lock
     * @param duration Lock duration in seconds
     */
    function lockNFT(uint256 tokenId, uint256 duration) external {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC721_LOCK, 1);
        
        if (ownerOf(tokenId) != msg.sender) revert InvalidTokenId();
        
        lockedTokens[tokenId] = true;
        tokenLockExpiry[tokenId] = block.timestamp + duration;
        
        emit NFTLocked(tokenId, tokenLockExpiry[tokenId]);
    }
    
    /**
     * @notice Unlock an NFT after lock expiry
     * @param tokenId Token ID to unlock
     */
    function unlockNFT(uint256 tokenId) external {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC721_UNLOCK, 1);
        
        if (ownerOf(tokenId) != msg.sender) revert InvalidTokenId();
        if (block.timestamp < tokenLockExpiry[tokenId]) revert TokenStillLocked();
        
        lockedTokens[tokenId] = false;
        tokenLockExpiry[tokenId] = 0;
        
        emit NFTUnlocked(tokenId);
    }
    
    // ============ Block Functions ============
    
    /**
     * @notice Block an address from sending/receiving NFTs
     * @param account Address to block
     */
    function blockAddress(address account) external onlyOwner {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC721_BLOCK, account, 0);
        
        blockedAddresses[account] = true;
        emit AddressBlocked(account);
    }
    
    /**
     * @notice Unblock an address
     * @param account Address to unblock
     */
    function unblockAddress(address account) external onlyOwner {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC721_UNBLOCK, account, 0);
        
        blockedAddresses[account] = false;
        emit AddressUnblocked(account);
    }

    // ============ Pause Functions ============
    
    /**
     * @notice Pause all transfers (emergency stop)
     */
    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
    }
    
    /**
     * @notice Resume transfers
     */
    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
    }
    
    // ============ URI Functions ============
    
    /**
     * @notice Update base token URI
     * @param newBaseURI New base URI for metadata
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
    }
    
    /**
     * @notice Get base URI for computing tokenURI
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    // ============ Extension Module Management ============
    
    /**
     * @notice Set or update the royalty module
     * @param module_ Address of royalty module (address(0) to disable)
     * @dev Only owner can update modules
     */
    function setRoyaltyModule(address module_) external onlyOwner {
        address oldModule = royaltyModule;
        royaltyModule = module_;
        emit RoyaltyModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the policy engine
     * @param engine_ Address of policy engine (address(0) to disable)
     * @dev Only owner can update policy engine
     */
    function setPolicyEngine(address engine_) external onlyOwner {
        address oldEngine = policyEngine;
        policyEngine = engine_;
        emit PolicyEngineUpdated(oldEngine, engine_);
    }
    
    /**
     * @notice Set or update the rental module
     * @param module_ Address of rental module (address(0) to disable)
     */
    function setRentalModule(address module_) external onlyOwner {
        address oldModule = rentalModule;
        rentalModule = module_;
        emit RentalModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the soulbound module
     * @param module_ Address of soulbound module (address(0) to disable)
     */
    function setSoulboundModule(address module_) external onlyOwner {
        address oldModule = soulboundModule;
        soulboundModule = module_;
        emit SoulboundModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the fractionalization module
     * @param module_ Address of fraction module (address(0) to disable)
     */
    function setFractionModule(address module_) external onlyOwner {
        address oldModule = fractionModule;
        fractionModule = module_;
        emit FractionModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the consecutive minting module
     * @param module_ Address of consecutive module (address(0) to disable)
     */
    function setConsecutiveModule(address module_) external onlyOwner {
        address oldModule = consecutiveModule;
        consecutiveModule = module_;
        emit ConsecutiveModuleUpdated(oldModule, module_);
    }
    
    // ============ Royalty Module Delegation ============
    
    /**
     * @notice Get royalty information for a token sale (EIP-2981)
     * @param tokenId Token ID being sold
     * @param salePrice Sale price in wei
     * @return receiver Address to receive royalty payment
     * @return royaltyAmount Amount to pay in royalty
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (address receiver, uint256 royaltyAmount) 
    {
        if (royaltyModule != address(0)) {
            try IERC721RoyaltyModule(royaltyModule).royaltyInfo(tokenId, salePrice) 
                returns (address _receiver, uint256 _royaltyAmount) 
            {
                return (_receiver, _royaltyAmount);
            } catch {
                // If royalty module fails, return no royalty
                return (address(0), 0);
            }
        }
        return (address(0), 0);
    }
    
    // ============ Rental Module Delegation ============
    
    /**
     * @notice List NFT for rent (delegates to rental module)
     * @param tokenId Token ID to list
     * @param pricePerDay Daily rental price in wei
     * @param maxDuration Maximum rental duration in seconds
     */
    function listForRent(uint256 tokenId, uint256 pricePerDay, uint256 maxDuration) external {
        if (rentalModule == address(0)) revert ModuleNotSet();
        IERC721RentalModule(rentalModule).listForRent(tokenId, pricePerDay, maxDuration);
    }
    
    /**
     * @notice Rent an NFT (delegates to rental module)
     * @param tokenId Token ID to rent
     * @param duration Rental duration in seconds
     */
    function rentNFT(uint256 tokenId, uint256 duration) external payable {
        if (rentalModule == address(0)) revert ModuleNotSet();
        IERC721RentalModule(rentalModule).rentNFT{value: msg.value}(tokenId, duration);
    }
    
    /**
     * @notice Check if token is currently rented
     * @param tokenId Token ID
     * @return bool True if rented
     */
    function isRented(uint256 tokenId) external view returns (bool) {
        if (rentalModule == address(0)) return false;
        return IERC721RentalModule(rentalModule).isRented(tokenId);
    }
    
    /**
     * @notice Get current renter address
     * @param tokenId Token ID
     * @return renter Current renter (address(0) if not rented)
     */
    function getRenter(uint256 tokenId) external view returns (address) {
        if (rentalModule == address(0)) return address(0);
        return IERC721RentalModule(rentalModule).getRenter(tokenId);
    }
    
    // ============ Soulbound Module Delegation ============
    
    /**
     * @notice Mark token as soulbound (non-transferable)
     * @param tokenId Token ID to make soulbound
     */
    function markAsSoulbound(uint256 tokenId) external onlyOwner {
        if (soulboundModule == address(0)) revert ModuleNotSet();
        IERC721SoulboundModule(soulboundModule).markAsSoulbound(tokenId);
    }
    
    /**
     * @notice Bind token permanently to current owner
     * @param tokenId Token ID to bind
     */
    function bindToSoul(uint256 tokenId) external {
        if (soulboundModule == address(0)) revert ModuleNotSet();
        IERC721SoulboundModule(soulboundModule).bindToSoul(tokenId);
    }
    
    /**
     * @notice Check if token is soulbound
     * @param tokenId Token ID
     * @return bool True if soulbound
     */
    function isSoulbound(uint256 tokenId) public view returns (bool) {
        if (soulboundModule == address(0)) return false;
        return IERC721SoulboundModule(soulboundModule).isSoulbound(tokenId);
    }
    
    /**
     * @notice Check if token is permanently bound to an address
     * @param tokenId Token ID
     * @return bool True if bound
     */
    function isBound(uint256 tokenId) external view returns (bool) {
        if (soulboundModule == address(0)) return false;
        return IERC721SoulboundModule(soulboundModule).isBound(tokenId);
    }
    
    // ============ Fractionalization Module Delegation ============
    
    /**
     * @notice Fractionalize NFT into ERC20 shares
     * @param tokenId Token to fractionalize
     * @param shares Number of shares to create
     * @param shareName Share token name
     * @param shareSymbol Share token symbol
     * @return shareToken Address of created share token
     */
    function fractionalize(
        uint256 tokenId,
        uint256 shares,
        string memory shareName,
        string memory shareSymbol
    ) external returns (address) {
        if (fractionModule == address(0)) revert ModuleNotSet();
        return IERC721FractionModule(fractionModule).fractionalize(
            tokenId, 
            shares, 
            shareName, 
            shareSymbol
        );
    }
    
    /**
     * @notice Check if NFT is fractionalized
     * @param tokenId Token ID
     * @return bool True if fractionalized
     */
    function isFractionalized(uint256 tokenId) external view returns (bool) {
        if (fractionModule == address(0)) return false;
        return IERC721FractionModule(fractionModule).isFractionalized(tokenId);
    }
    
    /**
     * @notice Get share token address for fractionalized NFT
     * @param tokenId Token ID
     * @return shareToken Share token address
     */
    function getShareToken(uint256 tokenId) external view returns (address) {
        if (fractionModule == address(0)) return address(0);
        return IERC721FractionModule(fractionModule).getShareToken(tokenId);
    }
    
    // ============ Consecutive Module Delegation ============
    
    /**
     * @notice Mint consecutive token IDs (gas-optimized via module)
     * @param to Recipient address
     * @param amount Number of tokens to mint
     * @return firstTokenId First token ID minted
     */
    function mintConsecutive(address to, uint96 amount) external onlyOwner returns (uint256) {
        if (consecutiveModule == address(0)) revert ModuleNotSet();
        if (!mintingEnabled) revert MintingDisabled();
        
        return IERC721ConsecutiveModule(consecutiveModule).mintConsecutive(to, amount);
    }
    
    /**
     * @notice Batch mint to multiple recipients (gas-optimized)
     * @param recipients Array of recipient addresses
     * @param amounts Array of token counts per recipient
     */
    function mintConsecutiveBatch(
        address[] memory recipients,
        uint96[] memory amounts
    ) external onlyOwner {
        if (consecutiveModule == address(0)) revert ModuleNotSet();
        if (!mintingEnabled) revert MintingDisabled();
        
        IERC721ConsecutiveModule(consecutiveModule).mintConsecutiveBatch(recipients, amounts);
    }
    
    // ============ Policy Validation Helpers ============
    
    /**
     * @notice Validate operation with policy engine (if configured)
     * @param operationType Operation type constant from PolicyOperationTypes
     * @param amount Amount involved (use 1 for single NFT, count for batch)
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
            amount          // amount
        );
        
        // Revert if not approved
        require(approved, reason);
    }
    
    /**
     * @notice Validate operation with target address
     * @param operationType Operation type constant
     * @param target Target address (to/from)
     * @param amount Amount involved
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
    
    // ============ UUPS Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrades (UUPS pattern)
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        emit ContractUpgraded(newImplementation);
    }

    // ============ Override Required Functions ============
    
    /**
     * @notice Override transfer logic to enforce locks, blocks, pauses, policies, and modules
     * @dev Called for all transfers, mints, and burns
     * 
     * Module Integration:
     * - Checks soulbound status (non-transferable tokens)
     * - Checks rental status (cannot transfer rented NFTs)
     * - Validates with policy engine
     * - Enforces blocks and locks
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
        address from = _ownerOf(tokenId);
        
        // Skip module checks for minting and burning
        bool isTransfer = from != address(0) && to != address(0);
        
        if (isTransfer) {
            // 1. Check Soulbound Module (highest priority - cannot transfer soulbound tokens)
            if (soulboundModule != address(0)) {
                bool canTransfer = IERC721SoulboundModule(soulboundModule).canTransfer(tokenId, from, to);
                if (!canTransfer) {
                    revert TransferBlocked("Token is soulbound");
                }
            }
            
            // 2. Check Rental Module (cannot transfer rented NFTs)
            if (rentalModule != address(0)) {
                bool rented = IERC721RentalModule(rentalModule).isRented(tokenId);
                if (rented) {
                    revert TransferBlocked("Token is currently rented");
                }
            }
            
            // 3. Validate with Policy Engine
            _validatePolicyWithTarget(PolicyOperationTypes.ERC721_TRANSFER, to, 1);
            
            // 4. Check Transfer Pause
            if (transfersPaused) {
                revert TransfersPaused();
            }
            
            // 5. Check Blocked Addresses
            if (blockedAddresses[from] || blockedAddresses[to]) {
                revert AddressIsBlocked();
            }
            
            // 6. Check Token Lock
            if (lockedTokens[tokenId]) {
                revert TokenLocked();
            }
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @notice Override _increaseBalance for enumerable
     */
    function _increaseBalance(
        address account,
        uint128 amount
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._increaseBalance(account, amount);
    }
    
    /**
     * @notice Override tokenURI for URI storage
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @notice Override supportsInterface for multiple inheritance + EIP-2981
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        // EIP-2981 interface ID is 0x2a55205a
        return interfaceId == 0x2a55205a || super.supportsInterface(interfaceId);
    }
    
    /**
     * @notice Get total number of tokens minted
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @notice Get all active module addresses
     * @return modules Array of module addresses [royalty, policy, rental, soulbound, fraction, consecutive]
     */
    function getActiveModules() external view returns (address[6] memory modules) {
        modules[0] = royaltyModule;
        modules[1] = policyEngine;
        modules[2] = rentalModule;
        modules[3] = soulboundModule;
        modules[4] = fractionModule;
        modules[5] = consecutiveModule;
    }
}

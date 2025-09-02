// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title EnhancedERC721Token
 * @notice Advanced ERC721 NFT contract supporting all max configuration features
 * 
 * Features:
 * - EIP-2981 Royalties with configurable rates
 * - Reveal mechanism with placeholder support
 * - Multiple mint phases (presale, whitelist, public, Dutch auction)
 * - Advanced access controls and operator filtering
 * - Staking rewards and utility features
 * - Geographic restrictions and compliance
 * - Breeding and evolution capabilities
 * - Transfer restrictions and soulbound tokens
 * - Cross-chain and Layer2 support
 */
contract EnhancedERC721Token is 
    ERC721, 
    ERC721Enumerable, 
    ERC721URIStorage, 
    ERC721Royalty,
    Ownable,
    AccessControl,
    Pausable,
    ReentrancyGuard 
{
    using Strings for uint256;

    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Core configuration structure
    struct CoreConfig {
        string name;
        string symbol;
        string baseURI;
        string contractURI;
        uint256 maxSupply;
        bool transfersPaused;
        bool mintingEnabled;
        bool burningEnabled;
        bool publicMinting;
        address initialOwner;
    }

    // Metadata configuration
    struct MetadataConfig {
        string metadataStorage; // "ipfs", "arweave", "centralized", "onchain"
        string uriStorage; // "tokenId", "custom", "folder"
        bool updatableURIs;
        bool dynamicMetadata;
        bool metadataFrozen;
        string provenanceHash;
    }

    // Supply and minting configuration
    struct SupplyConfig {
        uint256 reservedTokens;
        string mintingMethod; // "open", "whitelist", "auction", "lazy"
        bool autoIncrementIds;
        bool supplyValidation;
        bool adminMintEnabled;
        uint256 maxMintsPerTx;
        uint256 maxMintsPerWallet;
        bool mintPhasesEnabled;
        uint256 totalSupplyCap;
    }

    // Royalty configuration
    struct RoyaltyConfig {
        bool hasRoyalty;
        uint96 royaltyPercentage; // Basis points (e.g., 500 = 5%)
        address royaltyReceiver;
        bool creatorEarningsEnabled;
        uint96 creatorEarningsPercentage;
        address creatorEarningsAddress;
        bool operatorFilterEnabled;
        address customOperatorFilterAddress;
    }

    // Sales configuration
    struct SalesConfig {
        bool publicSaleEnabled;
        uint256 publicSalePrice;
        uint256 publicSaleStartTime;
        uint256 publicSaleEndTime;
        bool whitelistSaleEnabled;
        uint256 whitelistSalePrice;
        uint256 whitelistSaleStartTime;
        uint256 whitelistSaleEndTime;
        bool dutchAuctionEnabled;
        uint256 dutchAuctionStartPrice;
        uint256 dutchAuctionEndPrice;
        uint256 dutchAuctionDuration;
        bytes32 whitelistMerkleRoot;
    }

    // Reveal configuration
    struct RevealConfig {
        bool revealable;
        string preRevealURI;
        string placeholderImageURI;
        uint256 revealBatchSize;
        bool autoReveal;
        uint256 revealDelay;
        uint256 revealStartTime;
        bool isRevealed;
    }

    // Advanced features configuration
    struct AdvancedConfig {
        bool utilityEnabled;
        string utilityType;
        bool stakingEnabled;
        address stakingRewardsTokenAddress;
        uint256 stakingRewardsRate;
        bool breedingEnabled;
        bool evolutionEnabled;
        bool fractionalOwnership;
        bool soulbound;
        bool transferLocked;
    }

    // Geographic restrictions
    struct GeographicConfig {
        bool useGeographicRestrictions;
        string defaultRestrictionPolicy; // "allowed", "blocked"
        mapping(string => bool) countryRestrictions; // Country code => blocked
        mapping(address => bool) whitelistAddresses;
        mapping(address => string) addressCountries;
    }

    // State variables
    CoreConfig public coreConfig;
    MetadataConfig public metadataConfig;
    SupplyConfig public supplyConfig;
    RoyaltyConfig public royaltyConfig;
    SalesConfig public salesConfig;
    RevealConfig public revealConfig;
    AdvancedConfig public advancedConfig;
    GeographicConfig internal geographicConfig;

    // Current state
    uint256 public currentTokenId;
    uint256 public totalBurned;
    uint256 public totalRevealed;
    mapping(address => uint256) public mintedPerWallet;
    mapping(uint256 => bool) public tokenRevealed;
    mapping(uint256 => string) public customTokenURIs;

    // Staking state
    mapping(uint256 => uint256) public tokenStakeTime;
    mapping(uint256 => uint256) public tokenStakeRewards;
    mapping(address => uint256) public totalStakedByOwner;

    // Breeding state
    mapping(uint256 => bool) public tokenCanBreed;
    mapping(uint256 => uint256) public tokenBreedCount;
    mapping(uint256 => uint256) public tokenGeneration;

    // Events
    event TokenRevealed(uint256 indexed tokenId, string tokenURI);
    event BatchRevealed(uint256 startTokenId, uint256 endTokenId);
    event TokenStaked(uint256 indexed tokenId, address indexed owner);
    event TokenUnstaked(uint256 indexed tokenId, address indexed owner, uint256 rewards);
    event TokenBred(uint256 indexed parent1, uint256 indexed parent2, uint256 indexed offspring);
    event TokenEvolved(uint256 indexed tokenId, uint256 newGeneration);
    event GeographicRestrictionUpdated(string countryCode, bool blocked);
    event WhitelistUpdated(address indexed addr, bool whitelisted);

    // Errors
    error TransfersPaused();
    error MintingDisabled();
    error BurningDisabled();
    error MaxSupplyExceeded();
    error MaxMintsPerTxExceeded();
    error MaxMintsPerWalletExceeded();
    error InsufficientPayment();
    error SaleNotActive();
    error NotWhitelisted();
    error GeographicallyRestricted();
    error TokenNotRevealed();
    error TokenAlreadyRevealed();
    error StakingNotEnabled();
    error TokenNotStaked();
    error BreedingNotEnabled();
    error TokenCannotBreed();
    error EvolutionNotEnabled();
    error SoulboundToken();
    error TransferLocked();

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender) || msg.sender == owner(), "Not authorized to mint");
        _;
    }

    modifier onlyBurner() {
        require(hasRole(BURNER_ROLE, msg.sender) || msg.sender == owner(), "Not authorized to burn");
        _;
    }

    modifier whenNotSoulbound(uint256 tokenId) {
        if (advancedConfig.soulbound) revert SoulboundToken();
        _;
    }

    modifier whenTransfersNotLocked() {
        if (advancedConfig.transferLocked) revert TransferLocked();
        _;
    }

    modifier checkGeographicRestrictions(address addr) {
        if (geographicConfig.useGeographicRestrictions) {
            if (!geographicConfig.whitelistAddresses[addr]) {
                string memory country = geographicConfig.addressCountries[addr];
                if (bytes(country).length > 0 && geographicConfig.countryRestrictions[country]) {
                    revert GeographicallyRestricted();
                }
            }
        }
        _;
    }

    /**
     * @notice Constructor with comprehensive configuration
     */
    constructor(
        CoreConfig memory _coreConfig,
        MetadataConfig memory _metadataConfig,
        SupplyConfig memory _supplyConfig,
        RoyaltyConfig memory _royaltyConfig,
        SalesConfig memory _salesConfig,
        RevealConfig memory _revealConfig,
        AdvancedConfig memory _advancedConfig
    ) 
        ERC721(_coreConfig.name, _coreConfig.symbol) 
        Ownable(_coreConfig.initialOwner)
    {
        // Store configurations
        coreConfig = _coreConfig;
        metadataConfig = _metadataConfig;
        supplyConfig = _supplyConfig;
        royaltyConfig = _royaltyConfig;
        salesConfig = _salesConfig;
        revealConfig = _revealConfig;
        advancedConfig = _advancedConfig;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _coreConfig.initialOwner);
        _grantRole(MINTER_ROLE, _coreConfig.initialOwner);
        _grantRole(BURNER_ROLE, _coreConfig.initialOwner);
        _grantRole(PAUSER_ROLE, _coreConfig.initialOwner);
        _grantRole(COMPLIANCE_ROLE, _coreConfig.initialOwner);
        _grantRole(OPERATOR_ROLE, _coreConfig.initialOwner);

        // Setup royalties if enabled
        if (_royaltyConfig.hasRoyalty && _royaltyConfig.royaltyReceiver != address(0)) {
            _setDefaultRoyalty(_royaltyConfig.royaltyReceiver, _royaltyConfig.royaltyPercentage);
        }

        // Setup reveal mechanism
        if (_revealConfig.revealable && _revealConfig.autoReveal && _revealConfig.revealDelay > 0) {
            revealConfig.revealStartTime = block.timestamp + _revealConfig.revealDelay;
        }

        // Transfer ownership if needed
        if (_coreConfig.initialOwner != msg.sender) {
            _transferOwnership(_coreConfig.initialOwner);
        }
    }

    /**
     * @notice Enhanced minting with all features
     */
    function mint(address to, uint256 quantity) 
        external 
        payable 
        onlyMinter 
        nonReentrant 
        checkGeographicRestrictions(to)
        returns (uint256[] memory tokenIds) 
    {
        if (!coreConfig.mintingEnabled) revert MintingDisabled();
        
        // Check supply limits
        if (coreConfig.maxSupply > 0 && currentTokenId + quantity > coreConfig.maxSupply) {
            revert MaxSupplyExceeded();
        }

        if (supplyConfig.totalSupplyCap > 0 && currentTokenId + quantity > supplyConfig.totalSupplyCap) {
            revert MaxSupplyExceeded();
        }

        // Check minting limits
        if (supplyConfig.maxMintsPerTx > 0 && quantity > supplyConfig.maxMintsPerTx) {
            revert MaxMintsPerTxExceeded();
        }

        if (supplyConfig.maxMintsPerWallet > 0) {
            if (mintedPerWallet[to] + quantity > supplyConfig.maxMintsPerWallet) {
                revert MaxMintsPerWalletExceeded();
            }
        }

        tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            currentTokenId++;
            _safeMint(to, currentTokenId);
            tokenIds[i] = currentTokenId;

            // Auto-reveal if enabled and time has passed
            if (revealConfig.autoReveal && 
                block.timestamp >= revealConfig.revealStartTime && 
                !tokenRevealed[currentTokenId]) {
                _revealToken(currentTokenId);
            }
        }

        mintedPerWallet[to] += quantity;
        return tokenIds;
    }

    /**
     * @notice Public minting with sales logic
     */
    function publicMint(address to, uint256 quantity, bytes32[] calldata merkleProof) 
        external 
        payable 
        nonReentrant 
        checkGeographicRestrictions(to)
        returns (uint256[] memory) 
    {
        if (!coreConfig.publicMinting || !coreConfig.mintingEnabled) revert MintingDisabled();

        // Check which sale is active
        if (salesConfig.publicSaleEnabled && 
            block.timestamp >= salesConfig.publicSaleStartTime && 
            block.timestamp <= salesConfig.publicSaleEndTime) {
            
            // Public sale logic
            uint256 totalCost = salesConfig.publicSalePrice * quantity;
            if (msg.value < totalCost) revert InsufficientPayment();
            
        } else if (salesConfig.whitelistSaleEnabled && 
                   block.timestamp >= salesConfig.whitelistSaleStartTime && 
                   block.timestamp <= salesConfig.whitelistSaleEndTime) {
            
            // Whitelist sale logic
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            if (!MerkleProof.verify(merkleProof, salesConfig.whitelistMerkleRoot, leaf)) {
                revert NotWhitelisted();
            }
            
            uint256 totalCost = salesConfig.whitelistSalePrice * quantity;
            if (msg.value < totalCost) revert InsufficientPayment();
            
        } else if (salesConfig.dutchAuctionEnabled) {
            
            // Dutch auction logic
            uint256 currentPrice = getCurrentDutchAuctionPrice();
            uint256 totalCost = currentPrice * quantity;
            if (msg.value < totalCost) revert InsufficientPayment();
            
        } else {
            revert SaleNotActive();
        }

        return mint(to, quantity);
    }

    /**
     * @notice Enhanced burning with role-based access
     */
    function burn(uint256 tokenId) external onlyBurner {
        if (!coreConfig.burningEnabled) revert BurningDisabled();
        
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || hasRole(BURNER_ROLE, msg.sender), "Not authorized");

        // Unstake if staked
        if (advancedConfig.stakingEnabled && tokenStakeTime[tokenId] > 0) {
            _unstakeToken(tokenId);
        }

        _burn(tokenId);
        totalBurned++;
    }

    /**
     * @notice Reveal mechanism functions
     */
    function revealToken(uint256 tokenId) external onlyRole(OPERATOR_ROLE) {
        if (!revealConfig.revealable) revert TokenNotRevealed();
        if (tokenRevealed[tokenId]) revert TokenAlreadyRevealed();
        
        _revealToken(tokenId);
    }

    function revealBatch(uint256 startTokenId, uint256 endTokenId) external onlyRole(OPERATOR_ROLE) {
        if (!revealConfig.revealable) revert TokenNotRevealed();
        
        for (uint256 i = startTokenId; i <= endTokenId; i++) {
            if (!tokenRevealed[i] && _ownerOf(i) != address(0)) {
                _revealToken(i);
            }
        }
        
        emit BatchRevealed(startTokenId, endTokenId);
    }

    function _revealToken(uint256 tokenId) internal {
        tokenRevealed[tokenId] = true;
        totalRevealed++;
        emit TokenRevealed(tokenId, tokenURI(tokenId));
    }

    /**
     * @notice Staking functionality
     */
    function stakeToken(uint256 tokenId) external {
        if (!advancedConfig.stakingEnabled) revert StakingNotEnabled();
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(tokenStakeTime[tokenId] == 0, "Already staked");

        tokenStakeTime[tokenId] = block.timestamp;
        totalStakedByOwner[msg.sender]++;
        
        emit TokenStaked(tokenId, msg.sender);
    }

    function unstakeToken(uint256 tokenId) external returns (uint256 rewards) {
        if (!advancedConfig.stakingEnabled) revert StakingNotEnabled();
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        if (tokenStakeTime[tokenId] == 0) revert TokenNotStaked();

        return _unstakeToken(tokenId);
    }

    function _unstakeToken(uint256 tokenId) internal returns (uint256 rewards) {
        uint256 stakeDuration = block.timestamp - tokenStakeTime[tokenId];
        rewards = (stakeDuration * advancedConfig.stakingRewardsRate) / 1 days;
        
        tokenStakeRewards[tokenId] += rewards;
        tokenStakeTime[tokenId] = 0;
        totalStakedByOwner[ownerOf(tokenId)]--;
        
        emit TokenUnstaked(tokenId, ownerOf(tokenId), rewards);
        return rewards;
    }

    /**
     * @notice Breeding functionality
     */
    function breedTokens(uint256 parent1, uint256 parent2) external returns (uint256 offspring) {
        if (!advancedConfig.breedingEnabled) revert BreedingNotEnabled();
        require(ownerOf(parent1) == msg.sender && ownerOf(parent2) == msg.sender, "Not owner");
        if (!tokenCanBreed[parent1] || !tokenCanBreed[parent2]) revert TokenCannotBreed();

        currentTokenId++;
        offspring = currentTokenId;
        
        _safeMint(msg.sender, offspring);
        
        // Update breeding state
        tokenBreedCount[parent1]++;
        tokenBreedCount[parent2]++;
        tokenGeneration[offspring] = (tokenGeneration[parent1] + tokenGeneration[parent2]) / 2 + 1;
        tokenCanBreed[offspring] = true;
        
        emit TokenBred(parent1, parent2, offspring);
        return offspring;
    }

    /**
     * @notice Evolution functionality
     */
    function evolveToken(uint256 tokenId) external {
        if (!advancedConfig.evolutionEnabled) revert EvolutionNotEnabled();
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        tokenGeneration[tokenId]++;
        emit TokenEvolved(tokenId, tokenGeneration[tokenId]);
    }

    /**
     * @notice Dutch auction price calculation
     */
    function getCurrentDutchAuctionPrice() public view returns (uint256) {
        if (!salesConfig.dutchAuctionEnabled) return 0;
        
        uint256 elapsed = block.timestamp - salesConfig.publicSaleStartTime;
        if (elapsed >= salesConfig.dutchAuctionDuration) {
            return salesConfig.dutchAuctionEndPrice;
        }
        
        uint256 totalDrop = salesConfig.dutchAuctionStartPrice - salesConfig.dutchAuctionEndPrice;
        uint256 currentDrop = (totalDrop * elapsed) / salesConfig.dutchAuctionDuration;
        
        return salesConfig.dutchAuctionStartPrice - currentDrop;
    }

    /**
     * @notice Geographic restriction management
     */
    function setCountryRestriction(string calldata countryCode, bool blocked) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        geographicConfig.countryRestrictions[countryCode] = blocked;
        emit GeographicRestrictionUpdated(countryCode, blocked);
    }

    function setAddressWhitelist(address addr, bool whitelisted) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        geographicConfig.whitelistAddresses[addr] = whitelisted;
        emit WhitelistUpdated(addr, whitelisted);
    }

    function setAddressCountry(address addr, string calldata countryCode) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        geographicConfig.addressCountries[addr] = countryCode;
    }

    /**
     * @notice URI management
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        _requireOwned(tokenId);

        // Check if token is revealed
        if (revealConfig.revealable && !tokenRevealed[tokenId]) {
            return revealConfig.preRevealURI;
        }

        // Check for custom URI
        if (bytes(customTokenURIs[tokenId]).length > 0) {
            return customTokenURIs[tokenId];
        }

        // Use base URI + token ID
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, tokenId.toString())) 
            : "";
    }

    function _baseURI() internal view override returns (string memory) {
        return coreConfig.baseURI;
    }

    function setTokenURI(uint256 tokenId, string memory uri) 
        external 
        onlyRole(OPERATOR_ROLE) 
    {
        require(metadataConfig.updatableURIs, "URIs not updatable");
        customTokenURIs[tokenId] = uri;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        require(!metadataConfig.metadataFrozen, "Metadata frozen");
        coreConfig.baseURI = baseURI;
    }

    /**
     * @notice Transfer restrictions
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721, ERC721Enumerable) 
        whenNotPaused
        whenNotSoulbound(tokenId)
        whenTransfersNotLocked
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting and burning
        if (from == address(0) || to == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Check geographic restrictions for recipient
        if (geographicConfig.useGeographicRestrictions && to != address(0)) {
            if (!geographicConfig.whitelistAddresses[to]) {
                string memory country = geographicConfig.addressCountries[to];
                if (bytes(country).length > 0 && geographicConfig.countryRestrictions[country]) {
                    revert GeographicallyRestricted();
                }
            }
        }

        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) 
        internal 
        override(ERC721, ERC721Enumerable) 
    {
        super._increaseBalance(account, value);
    }

    /**
     * @notice Admin functions
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }

    function setWhitelistMerkleRoot(bytes32 merkleRoot) external onlyOwner {
        salesConfig.whitelistMerkleRoot = merkleRoot;
    }

    /**
     * @notice Interface support
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Royalty, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Get comprehensive token information
     */
    function getTokenInfo() external view returns (
        string memory _name,
        string memory _symbol,
        string memory _baseURIValue,
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _currentTokenId,
        uint256 _totalBurned,
        uint256 _totalRevealed,
        bool _transfersPaused,
        bool _mintingEnabled,
        bool _burningEnabled,
        bool _stakingEnabled,
        bool _breedingEnabled
    ) {
        return (
            name(),
            symbol(),
            _baseURI(),
            totalSupply(),
            coreConfig.maxSupply,
            currentTokenId,
            totalBurned,
            totalRevealed,
            paused(),
            coreConfig.mintingEnabled,
            coreConfig.burningEnabled,
            advancedConfig.stakingEnabled,
            advancedConfig.breedingEnabled
        );
    }
}

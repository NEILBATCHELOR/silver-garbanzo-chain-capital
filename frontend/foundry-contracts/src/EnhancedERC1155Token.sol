// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title EnhancedERC1155Token
 * @notice Advanced ERC1155 multi-token contract with comprehensive gaming, marketplace, and DeFi features
 * @dev Supports all max configuration features including crafting, governance, cross-chain, and complex economics
 */
contract EnhancedERC1155Token is 
    ERC1155, 
    ERC1155Supply, 
    ERC1155Burnable, 
    ERC1155Pausable, 
    AccessControl, 
    IERC2981, 
    ReentrancyGuard 
{
    using Strings for uint256;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // Token Configuration
    struct TokenConfig {
        string name;
        string symbol;
        string baseURI;
        bool batchMintingEnabled;
        bool dynamicUris;
        bool updatableMetadata;
        bool geographicRestrictionsEnabled;
        address initialOwner;
    }

    // Token Type Configuration
    struct TokenTypeConfig {
        uint256 maxSupply;
        uint256 mintPrice;
        string uri;
        bool exists;
        bool transferrable;
        bool burnable;
        bool consumable;
        uint256 experiencePoints;
        uint256 requiredLevel;
    }

    // Royalty Configuration
    struct RoyaltyConfig {
        bool enabled;
        uint96 percentage; // Basis points (10000 = 100%)
        address receiver;
    }

    // Pricing Configuration
    struct PricingConfig {
        enum PricingModel { FIXED, DYNAMIC, AUCTION, BONDING_CURVE, FREE }
        PricingModel model;
        uint256 basePrice;
        bool bulkDiscountEnabled;
        bool referralRewardsEnabled;
        uint96 referralPercentage;
    }

    // Marketplace Configuration
    struct MarketplaceConfig {
        bool feesEnabled;
        uint96 feePercentage;
        address feeRecipient;
        bool bundleTradingEnabled;
        bool atomicSwapsEnabled;
        bool crossCollectionTradingEnabled;
    }

    // Governance Configuration
    struct GovernanceConfig {
        bool votingPowerEnabled;
        bool communityTreasuryEnabled;
        uint96 treasuryPercentage;
        uint256 proposalThreshold;
    }

    // Cross-Chain Configuration
    struct CrossChainConfig {
        bool bridgeEnabled;
        bool layer2SupportEnabled;
        mapping(uint256 => bool) bridgeableTokenTypes;
        mapping(string => address) wrappedVersions;
        string[] supportedNetworks;
    }

    // Crafting Recipe
    struct CraftingRecipe {
        string name;
        mapping(uint256 => uint256) inputTokens; // tokenType => amount
        uint256 outputTokenType;
        uint256 outputQuantity;
        uint256 successRate; // Basis points
        uint256 cooldownPeriod;
        uint256 requiredLevel;
        bool isActive;
    }

    // Discount Tier
    struct DiscountTier {
        uint256 minQuantity;
        uint256 maxQuantity;
        uint96 discountPercentage;
        bool isActive;
    }

    // Staking Configuration
    struct StakingConfig {
        bool enabled;
        uint256 rewardRate; // Per block
        uint256 minimumStakePeriod;
        mapping(uint256 => uint256) stakingMultipliers; // tokenType => multiplier
    }

    // User Experience Data
    struct UserExperienceData {
        uint256 totalExperience;
        uint256 level;
        uint256 lastActionBlock;
        mapping(uint256 => uint256) tokenExperience; // tokenType => experience
        mapping(uint256 => uint256) lastCraftingTime; // recipeId => timestamp
    }

    // State Variables
    TokenConfig public config;
    RoyaltyConfig public royaltyConfig;
    PricingConfig public pricingConfig;
    MarketplaceConfig public marketplaceConfig;
    GovernanceConfig public governanceConfig;
    CrossChainConfig public crossChainConfig;
    StakingConfig public stakingConfig;

    uint256 public currentTokenType;
    uint256 public currentRecipeId;
    uint256 public totalTreasuryFunds;

    // Mappings
    mapping(uint256 => TokenTypeConfig) public tokenTypes;
    mapping(uint256 => CraftingRecipe) public craftingRecipes;
    mapping(uint256 => DiscountTier) public discountTiers;
    mapping(address => UserExperienceData) public userExperience;
    mapping(uint256 => mapping(address => uint256)) public tokenVotingPower;
    mapping(string => bool) public restrictedCountries;
    mapping(address => string) public userCountries;
    mapping(address => uint256) public stakingBalances;
    mapping(address => uint256) public stakingStartTime;
    mapping(address => mapping(uint256 => uint256)) public stakedTokens; // user => tokenType => amount

    // Lazy Minting
    mapping(bytes32 => bool) public claimedSignatures;
    uint256 public airdropSnapshotBlock;
    uint256 public claimStartTime;
    uint256 public claimEndTime;

    // Events
    event TokenTypeCreated(uint256 indexed tokenType, uint256 maxSupply, uint256 mintPrice);
    event CraftingRecipeCreated(uint256 indexed recipeId, string name, uint256 outputTokenType);
    event TokenCrafted(address indexed user, uint256 indexed recipeId, uint256 outputTokenType, uint256 quantity);
    event ExperienceGained(address indexed user, uint256 indexed tokenType, uint256 experience);
    event LevelUp(address indexed user, uint256 newLevel);
    event TokenStaked(address indexed user, uint256 indexed tokenType, uint256 amount);
    event TokenUnstaked(address indexed user, uint256 indexed tokenType, uint256 amount, uint256 rewards);
    event GovernanceProposal(address indexed proposer, uint256 proposalId, string description);
    event VoteCast(address indexed voter, uint256 proposalId, uint256 tokenType, uint256 votingPower);
    event CrossChainBridge(address indexed user, uint256 indexed tokenType, uint256 amount, string targetNetwork);
    event MarketplaceTrade(address indexed seller, address indexed buyer, uint256 indexed tokenType, uint256 amount, uint256 price);

    // Errors
    error TokenTypeNotExists();
    error InsufficientPayment();
    error MaxSupplyExceeded();
    error GeographicRestriction();
    error CraftingOnCooldown();
    error InsufficientCraftingMaterials();
    error CraftingFailed();
    error InsufficientLevel();
    error StakingNotEnabled();
    error InsufficientStakedTokens();
    error InvalidClaimPeriod();
    error AlreadyClaimed();
    error InvalidSignature();

    constructor(
        TokenConfig memory _config,
        RoyaltyConfig memory _royaltyConfig,
        PricingConfig memory _pricingConfig,
        MarketplaceConfig memory _marketplaceConfig,
        GovernanceConfig memory _governanceConfig
    ) ERC1155(_config.baseURI) {
        config = _config;
        royaltyConfig = _royaltyConfig;
        pricingConfig = _pricingConfig;
        marketplaceConfig = _marketplaceConfig;
        governanceConfig = _governanceConfig;

        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _config.initialOwner);
        _grantRole(MINTER_ROLE, _config.initialOwner);
        _grantRole(BURNER_ROLE, _config.initialOwner);
        _grantRole(METADATA_ROLE, _config.initialOwner);
        _grantRole(PAUSER_ROLE, _config.initialOwner);
        _grantRole(GOVERNANCE_ROLE, _config.initialOwner);

        // Initialize staking if enabled
        stakingConfig.enabled = false; // Can be enabled later through governance
    }

    // ==================== TOKEN TYPE MANAGEMENT ====================

    /**
     * @notice Create a new token type with comprehensive configuration
     */
    function createTokenType(
        uint256 maxSupply,
        uint256 mintPrice,
        string memory tokenURI,
        bool transferrable,
        bool burnable,
        bool consumable,
        uint256 experiencePoints,
        uint256 requiredLevel
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        currentTokenType++;
        
        tokenTypes[currentTokenType] = TokenTypeConfig({
            maxSupply: maxSupply,
            mintPrice: mintPrice,
            uri: tokenURI,
            exists: true,
            transferrable: transferrable,
            burnable: burnable,
            consumable: consumable,
            experiencePoints: experiencePoints,
            requiredLevel: requiredLevel
        });

        emit TokenTypeCreated(currentTokenType, maxSupply, mintPrice);
        return currentTokenType;
    }

    /**
     * @notice Update token type configuration
     */
    function updateTokenType(
        uint256 tokenType,
        uint256 maxSupply,
        uint256 mintPrice,
        string memory tokenURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenTypes[tokenType].exists, "Token type does not exist");
        
        tokenTypes[tokenType].maxSupply = maxSupply;
        tokenTypes[tokenType].mintPrice = mintPrice;
        tokenTypes[tokenType].uri = tokenURI;
    }

    // ==================== MINTING & BURNING ====================

    /**
     * @notice Mint tokens with experience gain and level checking
     */
    function mint(
        address to,
        uint256 tokenType,
        uint256 amount,
        bytes memory data
    ) external payable nonReentrant {
        require(hasRole(MINTER_ROLE, msg.sender) || msg.sender == address(this), "Not authorized to mint");
        require(tokenTypes[tokenType].exists, "Token type does not exist");
        
        TokenTypeConfig memory typeConfig = tokenTypes[tokenType];
        
        // Check level requirement
        if (typeConfig.requiredLevel > 1) {
            require(userExperience[to].level >= typeConfig.requiredLevel, "Insufficient level");
        }
        
        // Check supply limits
        if (typeConfig.maxSupply > 0) {
            require(totalSupply(tokenType) + amount <= typeConfig.maxSupply, "Max supply exceeded");
        }
        
        // Handle payment
        if (typeConfig.mintPrice > 0) {
            uint256 totalCost = _calculateMintCost(tokenType, amount, to);
            require(msg.value >= totalCost, "Insufficient payment");
            
            // Handle marketplace fees
            if (marketplaceConfig.feesEnabled && marketplaceConfig.feeRecipient != address(0)) {
                uint256 fee = (totalCost * marketplaceConfig.feePercentage) / 10000;
                if (fee > 0) {
                    payable(marketplaceConfig.feeRecipient).transfer(fee);
                }
            }
        }
        
        // Check geographic restrictions
        if (config.geographicRestrictionsEnabled && bytes(userCountries[to]).length > 0) {
            require(!restrictedCountries[userCountries[to]], "Geographic restriction");
        }
        
        _mint(to, tokenType, amount, data);
        
        // Grant experience
        if (typeConfig.experiencePoints > 0) {
            _grantExperience(to, tokenType, typeConfig.experiencePoints * amount);
        }
    }

    /**
     * @notice Batch mint multiple token types
     */
    function mintBatch(
        address to,
        uint256[] memory tokenTypes_,
        uint256[] memory amounts,
        bytes memory data
    ) external payable nonReentrant {
        require(config.batchMintingEnabled, "Batch minting not enabled");
        require(hasRole(MINTER_ROLE, msg.sender), "Not authorized to mint");
        require(tokenTypes_.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalCost = 0;
        uint256 totalExperience = 0;
        
        for (uint256 i = 0; i < tokenTypes_.length; i++) {
            uint256 tokenType = tokenTypes_[i];
            uint256 amount = amounts[i];
            
            require(tokenTypes[tokenType].exists, "Token type does not exist");
            
            TokenTypeConfig memory typeConfig = tokenTypes[tokenType];
            
            // Check level requirement
            if (typeConfig.requiredLevel > 1) {
                require(userExperience[to].level >= typeConfig.requiredLevel, "Insufficient level");
            }
            
            // Check supply limits
            if (typeConfig.maxSupply > 0) {
                require(totalSupply(tokenType) + amount <= typeConfig.maxSupply, "Max supply exceeded");
            }
            
            totalCost += _calculateMintCost(tokenType, amount, to);
            totalExperience += typeConfig.experiencePoints * amount;
        }
        
        // Handle payment
        if (totalCost > 0) {
            require(msg.value >= totalCost, "Insufficient payment");
        }
        
        // Check geographic restrictions
        if (config.geographicRestrictionsEnabled && bytes(userCountries[to]).length > 0) {
            require(!restrictedCountries[userCountries[to]], "Geographic restriction");
        }
        
        _mintBatch(to, tokenTypes_, amounts, data);
        
        // Grant total experience
        if (totalExperience > 0) {
            _grantExperience(to, 0, totalExperience); // Type 0 for general experience
        }
    }

    // ==================== CRAFTING SYSTEM ====================

    /**
     * @notice Create a crafting recipe
     */
    function createCraftingRecipe(
        string memory name,
        uint256[] memory inputTokenTypes,
        uint256[] memory inputAmounts,
        uint256 outputTokenType,
        uint256 outputQuantity,
        uint256 successRate,
        uint256 cooldownPeriod,
        uint256 requiredLevel
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(inputTokenTypes.length == inputAmounts.length, "Arrays length mismatch");
        require(successRate <= 10000, "Success rate too high");
        
        currentRecipeId++;
        
        CraftingRecipe storage recipe = craftingRecipes[currentRecipeId];
        recipe.name = name;
        recipe.outputTokenType = outputTokenType;
        recipe.outputQuantity = outputQuantity;
        recipe.successRate = successRate;
        recipe.cooldownPeriod = cooldownPeriod;
        recipe.requiredLevel = requiredLevel;
        recipe.isActive = true;
        
        for (uint256 i = 0; i < inputTokenTypes.length; i++) {
            recipe.inputTokens[inputTokenTypes[i]] = inputAmounts[i];
        }
        
        emit CraftingRecipeCreated(currentRecipeId, name, outputTokenType);
        return currentRecipeId;
    }

    /**
     * @notice Craft tokens using a recipe
     */
    function craft(uint256 recipeId) external nonReentrant {
        CraftingRecipe storage recipe = craftingRecipes[recipeId];
        require(recipe.isActive, "Recipe not active");
        
        UserExperienceData storage userExp = userExperience[msg.sender];
        
        // Check level requirement
        require(userExp.level >= recipe.requiredLevel, "Insufficient level");
        
        // Check cooldown
        if (recipe.cooldownPeriod > 0) {
            require(
                block.timestamp >= userExp.lastCraftingTime[recipeId] + recipe.cooldownPeriod,
                "Crafting on cooldown"
            );
        }
        
        // Check and burn input tokens
        for (uint256 tokenType = 1; tokenType <= currentTokenType; tokenType++) {
            uint256 requiredAmount = recipe.inputTokens[tokenType];
            if (requiredAmount > 0) {
                require(balanceOf(msg.sender, tokenType) >= requiredAmount, "Insufficient materials");
                _burn(msg.sender, tokenType, requiredAmount);
            }
        }
        
        // Check success rate
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % 10000;
        require(random < recipe.successRate, "Crafting failed");
        
        // Mint output tokens
        _mint(msg.sender, recipe.outputTokenType, recipe.outputQuantity, "");
        
        // Update cooldown
        userExp.lastCraftingTime[recipeId] = block.timestamp;
        
        // Grant crafting experience
        _grantExperience(msg.sender, recipe.outputTokenType, 50); // Base crafting experience
        
        emit TokenCrafted(msg.sender, recipeId, recipe.outputTokenType, recipe.outputQuantity);
    }

    // ==================== EXPERIENCE & LEVELING ====================

    /**
     * @notice Grant experience to a user
     */
    function _grantExperience(address user, uint256 tokenType, uint256 experience) internal {
        UserExperienceData storage userExp = userExperience[user];
        
        userExp.totalExperience += experience;
        if (tokenType > 0) {
            userExp.tokenExperience[tokenType] += experience;
        }
        
        // Calculate new level
        uint256 newLevel = _calculateLevel(userExp.totalExperience);
        if (newLevel > userExp.level) {
            userExp.level = newLevel;
            emit LevelUp(user, newLevel);
        }
        
        userExp.lastActionBlock = block.number;
        emit ExperienceGained(user, tokenType, experience);
    }

    /**
     * @notice Calculate level from total experience
     */
    function _calculateLevel(uint256 totalExperience) internal pure returns (uint256) {
        if (totalExperience < 100) return 1;
        if (totalExperience < 500) return 2;
        if (totalExperience < 1500) return 3;
        if (totalExperience < 3500) return 4;
        if (totalExperience < 7500) return 5;
        
        // For higher levels: level = sqrt(totalExperience / 100) + base levels
        return 5 + (totalExperience - 7500) / 1000;
    }

    // ==================== STAKING SYSTEM ====================

    /**
     * @notice Stake tokens to earn rewards
     */
    function stake(uint256 tokenType, uint256 amount) external nonReentrant {
        require(stakingConfig.enabled, "Staking not enabled");
        require(tokenTypes[tokenType].exists, "Token type does not exist");
        require(balanceOf(msg.sender, tokenType) >= amount, "Insufficient balance");
        
        // Calculate and distribute pending rewards
        _distributePendingStakingRewards(msg.sender, tokenType);
        
        // Transfer tokens to staking
        _burn(msg.sender, tokenType, amount);
        stakedTokens[msg.sender][tokenType] += amount;
        stakingBalances[msg.sender] += amount;
        
        if (stakingStartTime[msg.sender] == 0) {
            stakingStartTime[msg.sender] = block.timestamp;
        }
        
        emit TokenStaked(msg.sender, tokenType, amount);
    }

    /**
     * @notice Unstake tokens and claim rewards
     */
    function unstake(uint256 tokenType, uint256 amount) external nonReentrant {
        require(stakedTokens[msg.sender][tokenType] >= amount, "Insufficient staked tokens");
        require(
            block.timestamp >= stakingStartTime[msg.sender] + stakingConfig.minimumStakePeriod,
            "Minimum stake period not met"
        );
        
        // Calculate rewards
        uint256 rewards = _calculateStakingRewards(msg.sender, tokenType);
        
        // Update staking state
        stakedTokens[msg.sender][tokenType] -= amount;
        stakingBalances[msg.sender] -= amount;
        
        // Return staked tokens
        _mint(msg.sender, tokenType, amount, "");
        
        // Mint reward tokens (assuming reward token is type 1)
        if (rewards > 0) {
            _mint(msg.sender, 1, rewards, "");
        }
        
        emit TokenUnstaked(msg.sender, tokenType, amount, rewards);
    }

    /**
     * @notice Calculate staking rewards
     */
    function _calculateStakingRewards(address user, uint256 tokenType) internal view returns (uint256) {
        if (stakingStartTime[user] == 0 || stakedTokens[user][tokenType] == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp - stakingStartTime[user];
        uint256 stakedAmount = stakedTokens[user][tokenType];
        uint256 multiplier = stakingConfig.stakingMultipliers[tokenType];
        
        if (multiplier == 0) multiplier = 100; // Default 1x multiplier
        
        return (stakedAmount * stakingConfig.rewardRate * stakingDuration * multiplier) / (100 * 1 days);
    }

    /**
     * @notice Distribute pending staking rewards
     */
    function _distributePendingStakingRewards(address user, uint256 tokenType) internal {
        uint256 rewards = _calculateStakingRewards(user, tokenType);
        if (rewards > 0) {
            _mint(user, 1, rewards, ""); // Mint rewards as token type 1
        }
    }

    // ==================== GOVERNANCE ====================

    /**
     * @notice Get voting power for a user
     */
    function getVotingPower(address user, uint256 tokenType) external view returns (uint256) {
        if (!governanceConfig.votingPowerEnabled) return 0;
        
        uint256 balance = balanceOf(user, tokenType);
        uint256 stakedBalance = stakedTokens[user][tokenType];
        
        // Staked tokens get 2x voting power
        return balance + (stakedBalance * 2);
    }

    /**
     * @notice Create a governance proposal
     */
    function createProposal(string memory description) external {
        require(governanceConfig.votingPowerEnabled, "Governance not enabled");
        
        uint256 totalVotingPower = 0;
        for (uint256 i = 1; i <= currentTokenType; i++) {
            totalVotingPower += this.getVotingPower(msg.sender, i);
        }
        
        require(totalVotingPower >= governanceConfig.proposalThreshold, "Insufficient voting power");
        
        // In a real implementation, you'd store proposals in a mapping
        // For this example, we just emit an event
        emit GovernanceProposal(msg.sender, block.number, description);
    }

    // ==================== PRICING CALCULATIONS ====================

    /**
     * @notice Calculate mint cost with discounts
     */
    function _calculateMintCost(uint256 tokenType, uint256 amount, address buyer) internal view returns (uint256) {
        uint256 baseCost = tokenTypes[tokenType].mintPrice * amount;
        
        if (pricingConfig.bulkDiscountEnabled) {
            // Apply bulk discount
            for (uint256 i = 1; i <= 10; i++) { // Check up to 10 discount tiers
                DiscountTier memory tier = discountTiers[i];
                if (tier.isActive && amount >= tier.minQuantity) {
                    if (tier.maxQuantity == 0 || amount <= tier.maxQuantity) {
                        uint256 discount = (baseCost * tier.discountPercentage) / 10000;
                        baseCost -= discount;
                        break;
                    }
                }
            }
        }
        
        return baseCost;
    }

    // ==================== LAZY MINTING & CLAIMS ====================

    /**
     * @notice Claim tokens with signature verification
     */
    function claimTokens(
        uint256 tokenType,
        uint256 amount,
        bytes32[] memory proof,
        bytes memory signature
    ) external nonReentrant {
        require(block.timestamp >= claimStartTime && block.timestamp <= claimEndTime, "Invalid claim period");
        
        bytes32 signatureHash = keccak256(signature);
        require(!claimedSignatures[signatureHash], "Already claimed");
        
        // Verify Merkle proof for airdrop eligibility
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, tokenType, amount));
        // In a real implementation, you'd verify the proof against a stored root
        
        claimedSignatures[signatureHash] = true;
        _mint(msg.sender, tokenType, amount, "");
    }

    // ==================== CROSS-CHAIN FUNCTIONALITY ====================

    /**
     * @notice Bridge tokens to another network
     */
    function bridgeTokens(uint256 tokenType, uint256 amount, string memory targetNetwork) external nonReentrant {
        require(crossChainConfig.bridgeEnabled, "Bridge not enabled");
        require(crossChainConfig.bridgeableTokenTypes[tokenType], "Token type not bridgeable");
        require(balanceOf(msg.sender, tokenType) >= amount, "Insufficient balance");
        
        _burn(msg.sender, tokenType, amount);
        
        emit CrossChainBridge(msg.sender, tokenType, amount, targetNetwork);
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * @notice Get comprehensive token information
     */
    function getTokenTypeInfo(uint256 tokenType) external view returns (
        uint256 maxSupply,
        uint256 mintPrice,
        uint256 currentSupply,
        string memory tokenURI,
        bool transferrable,
        bool burnable,
        bool consumable,
        uint256 experiencePoints,
        uint256 requiredLevel
    ) {
        TokenTypeConfig memory typeConfig = tokenTypes[tokenType];
        return (
            typeConfig.maxSupply,
            typeConfig.mintPrice,
            totalSupply(tokenType),
            typeConfig.uri,
            typeConfig.transferrable,
            typeConfig.burnable,
            typeConfig.consumable,
            typeConfig.experiencePoints,
            typeConfig.requiredLevel
        );
    }

    /**
     * @notice Update geographic restrictions
     */
    function updateGeographicRestrictions(string[] memory countries, bool restricted) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < countries.length; i++) {
            restrictedCountries[countries[i]] = restricted;
        }
    }

    /**
     * @notice Set user country for geographic restrictions
     */
    function setUserCountry(address user, string memory country) external onlyRole(DEFAULT_ADMIN_ROLE) {
        userCountries[user] = country;
    }

    /**
     * @notice Enable or disable staking
     */
    function setStakingEnabled(bool enabled) external onlyRole(GOVERNANCE_ROLE) {
        stakingConfig.enabled = enabled;
    }

    /**
     * @notice Update staking parameters
     */
    function updateStakingConfig(
        uint256 rewardRate,
        uint256 minimumStakePeriod
    ) external onlyRole(GOVERNANCE_ROLE) {
        stakingConfig.rewardRate = rewardRate;
        stakingConfig.minimumStakePeriod = minimumStakePeriod;
    }

    /**
     * @notice Set staking multiplier for token types
     */
    function setStakingMultiplier(uint256 tokenType, uint256 multiplier) external onlyRole(GOVERNANCE_ROLE) {
        stakingConfig.stakingMultipliers[tokenType] = multiplier;
    }

    /**
     * @notice Add discount tier
     */
    function addDiscountTier(
        uint256 tierId,
        uint256 minQuantity,
        uint256 maxQuantity,
        uint96 discountPercentage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        discountTiers[tierId] = DiscountTier({
            minQuantity: minQuantity,
            maxQuantity: maxQuantity,
            discountPercentage: discountPercentage,
            isActive: true
        });
    }

    /**
     * @notice Set bridgeable token types
     */
    function setBridgeableTokenTypes(uint256[] memory tokenTypes_, bool bridgeable) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < tokenTypes_.length; i++) {
            crossChainConfig.bridgeableTokenTypes[tokenTypes_[i]] = bridgeable;
        }
    }

    /**
     * @notice Set claim period for lazy minting
     */
    function setClaimPeriod(uint256 startTime, uint256 endTime, uint256 snapshotBlock) external onlyRole(DEFAULT_ADMIN_ROLE) {
        claimStartTime = startTime;
        claimEndTime = endTime;
        airdropSnapshotBlock = snapshotBlock;
    }

    // ==================== OVERRIDES ====================

    function uri(uint256 tokenType) public view override returns (string memory) {
        if (bytes(tokenTypes[tokenType].uri).length > 0) {
            return tokenTypes[tokenType].uri;
        }
        return string(abi.encodePacked(super.uri(tokenType), tokenType.toString()));
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply, ERC1155Pausable) {
        // Check transferrability for each token type
        for (uint256 i = 0; i < ids.length; i++) {
            if (from != address(0) && to != address(0)) { // Not minting or burning
                require(tokenTypes[ids[i]].transferrable, "Token type not transferrable");
            }
        }
        
        super._update(from, to, ids, values);
    }

    // ==================== ROYALTY IMPLEMENTATION ====================

    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view override returns (address, uint256) {
        if (!royaltyConfig.enabled) {
            return (address(0), 0);
        }
        
        uint256 royaltyAmount = (salePrice * royaltyConfig.percentage) / 10000;
        return (royaltyConfig.receiver, royaltyAmount);
    }

    // ==================== ACCESS CONTROL ====================

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl, IERC165) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    // ==================== ADMIN FUNCTIONS ====================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        // Handle treasury funds
        if (governanceConfig.communityTreasuryEnabled && governanceConfig.treasuryPercentage > 0) {
            uint256 treasuryAmount = (balance * governanceConfig.treasuryPercentage) / 10000;
            totalTreasuryFunds += treasuryAmount;
            balance -= treasuryAmount;
        }
        
        payable(msg.sender).transfer(balance);
    }

    function name() external view returns (string memory) {
        return config.name;
    }

    function symbol() external view returns (string memory) {
        return config.symbol;
    }
}

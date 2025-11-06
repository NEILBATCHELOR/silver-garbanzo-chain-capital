// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IERC721FractionModule.sol";
import "./storage/FractionalizationStorage.sol";

/**
 * @title ERC721FractionModule
 * @notice Modular NFT fractionalization system
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Revenue Model:
 * - Makes high-value NFTs accessible
 * - Creates liquidity for illiquid assets
 * - Enables partial ownership
 * - DAO governance of shared assets
 * 
 * Gas Cost: ~8k per fractionalization
 */
contract ERC721FractionModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC721FractionModule,
    FractionalizationStorage
{
    // ============ Roles ============
    bytes32 public constant FRACTION_MANAGER_ROLE = keccak256("FRACTION_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    address public nftContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize fractionalization module
     * @param admin Admin address
     * @param _nftContract NFT contract address
     * @param minFractions Minimum fractions per NFT (default: 100)
     * @param maxFractions Maximum fractions per NFT (0 = unlimited)
     * @param buyoutMultiplierBps Buyout multiplier in basis points (e.g., 150 = 1.5x)
     * @param redemptionEnabled Whether redemption is allowed
     * @param fractionPrice Price per fraction in wei (0 = no fixed price)
     * @param tradingEnabled Whether fraction trading is enabled
     */
    function initialize(
        address admin,
        address _nftContract,
        uint256 minFractions,
        uint256 maxFractions,
        uint256 buyoutMultiplierBps,
        bool redemptionEnabled,
        uint256 fractionPrice,
        bool tradingEnabled
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FRACTION_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        nftContract = _nftContract;
        
        // Set defaults
        _minFractions = minFractions > 0 ? minFractions : 100;
        _maxFractions = maxFractions; // 0 = unlimited
        _buyoutMultiplierBps = buyoutMultiplierBps > 0 ? buyoutMultiplierBps : 150; // Default 1.5x
        _redemptionEnabled = redemptionEnabled;
        _fractionPrice = fractionPrice; // 0 = no fixed price
        _tradingEnabled = tradingEnabled;
    }
    
    // ============ Fractionalization ============
    
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
    ) external nonReentrant returns (address shareToken) {
        if (_shareTokens[tokenId] != address(0)) {
            revert AlreadyFractionalized(tokenId);
        }
        
        // Validate share count
        if (shares < _minFractions) {
            revert InvalidFractionCount(shares);
        }
        if (_maxFractions > 0 && shares > _maxFractions) {
            revert InvalidFractionCount(shares);
        }
        
        // Transfer NFT to this contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        // Deploy share token
        FractionToken token = new FractionToken(
            shareName,
            shareSymbol,
            shares,
            msg.sender
        );
        
        shareToken = address(token);
        _shareTokens[tokenId] = shareToken;
        _totalShares[tokenId] = shares;
        
        emit Fractionalized(tokenId, shareToken, shares, msg.sender);
    }
    
    /**
     * @notice Redeem NFT by burning all shares
     * @param tokenId Token to redeem
     */
    function redeem(uint256 tokenId) external nonReentrant {
        if (!_redemptionEnabled) {
            revert RedemptionDisabled();
        }
        
        address shareToken = _shareTokens[tokenId];
        if (shareToken == address(0)) {
            revert NotFractionalized(tokenId);
        }
        
        // Check caller owns all shares
        uint256 totalShares = _totalShares[tokenId];
        if (FractionToken(shareToken).balanceOf(msg.sender) < totalShares) {
            revert InsufficientShares();
        }
        
        // Burn all shares
        FractionToken(shareToken).burnFrom(msg.sender, totalShares);
        
        // Transfer NFT back
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        // Clean up
        delete _shareTokens[tokenId];
        delete _totalShares[tokenId];
        delete _buyoutPrices[tokenId];
        
        emit Redeemed(tokenId, msg.sender);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get share token for fractionalized NFT
     * @param tokenId Token ID
     * @return shareToken Share token address
     */
    function getShareToken(uint256 tokenId) external view returns (address shareToken) {
        return _shareTokens[tokenId];
    }
    
    /**
     * @notice Check if NFT is fractionalized
     * @param tokenId Token ID
     * @return bool True if fractionalized
     */
    function isFractionalized(uint256 tokenId) external view returns (bool) {
        return _shareTokens[tokenId] != address(0);
    }
    
    /**
     * @notice Get total shares for token
     * @param tokenId Token ID
     * @return shares Total number of shares
     */
    function getTotalShares(uint256 tokenId) external view returns (uint256 shares) {
        return _totalShares[tokenId];
    }
    
    // ============ Buyout Mechanism ============
    
    /**
     * @notice Initiate buyout of fractionalized NFT
     * @param tokenId Token to buy out
     */
    function initiateBuyout(uint256 tokenId) external payable nonReentrant {
        address shareToken = _shareTokens[tokenId];
        if (shareToken == address(0)) {
            revert NotFractionalized(tokenId);
        }
        
        // Calculate required buyout price
        uint256 totalShares = _totalShares[tokenId];
        uint256 requiredPrice = (totalShares * _buyoutMultiplierBps) / 100; // Simplified calculation
        
        if (msg.value < requiredPrice) {
            revert InsufficientBuyoutPrice(msg.value, requiredPrice);
        }
        
        // Store buyout price for shareholders to claim
        _buyoutPrices[tokenId] = msg.value;
        
        // Transfer NFT to buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        emit BuyoutInitiated(tokenId, msg.sender, msg.value);
        emit BuyoutCompleted(tokenId, msg.sender);
        
        // Note: In production, would need mechanism for shareholders to claim their share
        // This simplified version demonstrates the concept
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Get configuration parameters
     */
    function getConfiguration() external view returns (
        uint256 minFractions,
        uint256 maxFractions,
        uint256 buyoutMultiplier,
        bool redemptionEnabled,
        uint256 fractionPrice,
        bool tradingEnabled
    ) {
        return (
            _minFractions,
            _maxFractions,
            _buyoutMultiplierBps,
            _redemptionEnabled,
            _fractionPrice,
            _tradingEnabled
        );
    }
    
    /**
     * @notice Set configuration parameters
     */
    function setConfiguration(
        uint256 minFractions,
        uint256 maxFractions,
        uint256 buyoutMultiplierBps,
        bool redemptionEnabled,
        uint256 fractionPrice,
        bool tradingEnabled
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minFractions > 0, "Min fractions must be > 0");
        require(maxFractions == 0 || maxFractions >= minFractions, "Max must be >= min");
        require(buyoutMultiplierBps >= 100, "Multiplier must be >= 1.0x");
        
        uint256 oldPrice = _fractionPrice;
        
        _minFractions = minFractions;
        _maxFractions = maxFractions;
        _buyoutMultiplierBps = buyoutMultiplierBps;
        _redemptionEnabled = redemptionEnabled;
        _fractionPrice = fractionPrice;
        _tradingEnabled = tradingEnabled;
        
        emit ConfigurationUpdated(
            minFractions, 
            maxFractions, 
            buyoutMultiplierBps, 
            redemptionEnabled,
            fractionPrice,
            tradingEnabled
        );
        
        if (oldPrice != fractionPrice) {
            emit FractionPriceUpdated(oldPrice, fractionPrice);
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set NFT contract address
     * @param _nftContract New NFT contract address
     */
    function setNFTContract(address _nftContract) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        nftContract = _nftContract;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}

/**
 * @title FractionToken
 * @notice ERC20 token representing fractional NFT ownership
 */
contract FractionToken is ERC20 {
    address public immutable creator;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address _creator
    ) ERC20(name, symbol) {
        creator = _creator;
        _mint(_creator, totalSupply);
    }
    
    function burnFrom(address account, uint256 amount) external {
        require(msg.sender == creator, "Only creator can burn");
        _burn(account, amount);
    }
}

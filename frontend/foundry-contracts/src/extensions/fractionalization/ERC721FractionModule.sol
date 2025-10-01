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
     */
    function initialize(
        address admin,
        address _nftContract
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FRACTION_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        nftContract = _nftContract;
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

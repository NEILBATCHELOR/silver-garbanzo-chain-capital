// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TokenRegistry
 * @notice Central registry for tracking all deployed tokens
 * @dev UUPS upgradeable registry with comprehensive token tracking
 * 
 * Features:
 * - Track all token deployments across standards
 * - Monitor upgrade history
 * - Cross-chain address mapping
 * - Query by deployer, standard, or network
 * - Track master implementation versions
 * 
 * Usage:
 * 1. TokenFactory calls registerToken() on deployment
 * 2. UpgradeGovernor calls recordUpgrade() on upgrades
 * 3. Frontend queries for user's tokens or stats
 */
contract TokenRegistry is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Structs ============
    struct TokenInfo {
        address proxyAddress;         // Token proxy address
        address implementation;       // Current implementation address
        address deployer;             // Who deployed the token
        string standard;              // ERC20, ERC721, ERC1155, etc.
        string name;                  // Token name
        string symbol;                // Token symbol
        uint256 chainId;              // Chain ID where deployed
        uint256 deployedAt;           // Deployment timestamp
        uint256 lastUpgrade;          // Last upgrade timestamp
        uint256 upgradeCount;         // Number of upgrades
        bool isActive;                // Whether token is active
    }
    
    struct UpgradeHistory {
        address oldImplementation;
        address newImplementation;
        uint256 upgradedAt;
        address upgradedBy;
        string reason;
    }
    
    // ============ State Variables ============
    uint256 public totalTokens;
    uint256 public totalUpgrades;
    
    // ============ Storage Mappings ============
    // proxy address => TokenInfo
    mapping(address => TokenInfo) public tokens;
    
    // Array of all token addresses
    address[] public tokenList;
    
    // deployer => token addresses
    mapping(address => address[]) public deployerTokens;
    
    // standard => token addresses
    mapping(string => address[]) public standardTokens;
    
    // chainId => token addresses
    mapping(uint256 => address[]) public chainTokens;
    
    // proxy address => upgrade history array
    mapping(address => UpgradeHistory[]) public upgradeHistory;
    
    // ============ Events ============
    event TokenRegistered(
        address indexed proxy,
        address indexed deployer,
        string standard,
        string name,
        string symbol,
        uint256 chainId
    );
    
    event TokenUpgraded(
        address indexed proxy,
        address indexed oldImplementation,
        address indexed newImplementation,
        address upgradedBy,
        string reason
    );
    
    event TokenDeactivated(address indexed proxy, string reason);
    event TokenReactivated(address indexed proxy);
    
    // ============ Errors ============
    error TokenAlreadyRegistered(address proxy);
    error TokenNotFound(address proxy);
    error InvalidAddress(string param);
    error InvalidStandard(string standard);

    
    // ============ Storage Gap ============
    uint256[40] private __gap;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the registry
     * @param admin Admin address
     */
    function initialize(address admin) public initializer {
        require(admin != address(0), "Invalid admin");
        
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }
    
    // ============ Registration Functions ============
    
    /**
     * @notice Register a new token deployment
     * @param proxy Token proxy address
     * @param implementation Implementation address
     * @param deployer Who deployed the token
     * @param standard Token standard (ERC20, ERC721, etc.)
     * @param name Token name
     * @param symbol Token symbol
     */
    function registerToken(
        address proxy,
        address implementation,
        address deployer,
        string memory standard,
        string memory name,
        string memory symbol
    ) external onlyRole(REGISTRAR_ROLE) {
        if (proxy == address(0)) revert InvalidAddress("proxy");
        if (implementation == address(0)) revert InvalidAddress("implementation");
        if (deployer == address(0)) revert InvalidAddress("deployer");
        if (tokens[proxy].proxyAddress != address(0)) revert TokenAlreadyRegistered(proxy);
        
        _validateStandard(standard);
        
        tokens[proxy] = TokenInfo({
            proxyAddress: proxy,
            implementation: implementation,
            deployer: deployer,
            standard: standard,
            name: name,
            symbol: symbol,
            chainId: block.chainid,
            deployedAt: block.timestamp,
            lastUpgrade: 0,
            upgradeCount: 0,
            isActive: true
        });
        
        tokenList.push(proxy);
        deployerTokens[deployer].push(proxy);
        standardTokens[standard].push(proxy);
        chainTokens[block.chainid].push(proxy);
        
        totalTokens++;
        
        emit TokenRegistered(proxy, deployer, standard, name, symbol, block.chainid);
    }

    
    /**
     * @notice Record a token upgrade
     * @param proxy Token proxy address
     * @param newImplementation New implementation address
     * @param reason Reason for upgrade
     */
    function recordUpgrade(
        address proxy,
        address newImplementation,
        string memory reason
    ) external onlyRole(UPGRADER_ROLE) {
        TokenInfo storage token = tokens[proxy];
        if (token.proxyAddress == address(0)) revert TokenNotFound(proxy);
        if (newImplementation == address(0)) revert InvalidAddress("newImplementation");
        
        // Record upgrade history
        upgradeHistory[proxy].push(UpgradeHistory({
            oldImplementation: token.implementation,
            newImplementation: newImplementation,
            upgradedAt: block.timestamp,
            upgradedBy: msg.sender,
            reason: reason
        }));
        
        // Update token info
        token.implementation = newImplementation;
        token.lastUpgrade = block.timestamp;
        token.upgradeCount++;
        
        totalUpgrades++;
        
        emit TokenUpgraded(
            proxy,
            token.implementation,
            newImplementation,
            msg.sender,
            reason
        );
    }
    
    /**
     * @notice Deactivate a token
     * @param proxy Token proxy address
     * @param reason Reason for deactivation
     */
    function deactivateToken(
        address proxy,
        string memory reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        TokenInfo storage token = tokens[proxy];
        if (token.proxyAddress == address(0)) revert TokenNotFound(proxy);
        
        token.isActive = false;
        emit TokenDeactivated(proxy, reason);
    }
    
    /**
     * @notice Reactivate a token
     * @param proxy Token proxy address
     */
    function reactivateToken(address proxy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        TokenInfo storage token = tokens[proxy];
        if (token.proxyAddress == address(0)) revert TokenNotFound(proxy);
        
        token.isActive = true;
        emit TokenReactivated(proxy);
    }

    
    // ============ Query Functions ============
    
    /**
     * @notice Get token info by proxy address
     * @param proxy Token proxy address
     * @return TokenInfo struct
     */
    function getToken(address proxy) external view returns (TokenInfo memory) {
        if (tokens[proxy].proxyAddress == address(0)) revert TokenNotFound(proxy);
        return tokens[proxy];
    }
    
    /**
     * @notice Get all tokens deployed by an address
     * @param deployer Deployer address
     * @return Array of token proxy addresses
     */
    function getTokensByDeployer(address deployer) external view returns (address[] memory) {
        return deployerTokens[deployer];
    }
    
    /**
     * @notice Get all tokens of a specific standard
     * @param standard Token standard (e.g., "ERC20")
     * @return Array of token proxy addresses
     */
    function getTokensByStandard(string memory standard) external view returns (address[] memory) {
        return standardTokens[standard];
    }
    
    /**
     * @notice Get all tokens on a specific chain
     * @param chainId Chain ID
     * @return Array of token proxy addresses
     */
    function getTokensByChain(uint256 chainId) external view returns (address[] memory) {
        return chainTokens[chainId];
    }
    
    /**
     * @notice Get upgrade history for a token
     * @param proxy Token proxy address
     * @return Array of UpgradeHistory structs
     */
    function getUpgradeHistory(address proxy) external view returns (UpgradeHistory[] memory) {
        return upgradeHistory[proxy];
    }
    
    /**
     * @notice Get all registered tokens
     * @return Array of all token proxy addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return tokenList;
    }
    
    /**
     * @notice Get paginated token list
     * @param offset Starting index
     * @param limit Number of tokens to return
     * @return tokens_ Array of token addresses
     * @return total Total number of tokens
     */
    function getTokensPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory tokens_, uint256 total) {
        total = tokenList.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 size = end - offset;
        tokens_ = new address[](size);
        
        for (uint256 i = 0; i < size; i++) {
            tokens_[i] = tokenList[offset + i];
        }
        
        return (tokens_, total);
    }

    
    /**
     * @notice Get deployment statistics
     * @return totalTokens_ Total tokens registered
     * @return totalUpgrades_ Total upgrades performed
     * @return activeTokens Number of active tokens
     */
    function getStatistics() external view returns (
        uint256 totalTokens_,
        uint256 totalUpgrades_,
        uint256 activeTokens
    ) {
        totalTokens_ = totalTokens;
        totalUpgrades_ = totalUpgrades;
        
        // Count active tokens
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokens[tokenList[i]].isActive) {
                activeTokens++;
            }
        }
        
        return (totalTokens_, totalUpgrades_, activeTokens);
    }
    
    /**
     * @notice Get statistics by standard
     * @param standard Token standard
     * @return count Number of tokens
     * @return active Number of active tokens
     */
    function getStandardStatistics(string memory standard) 
        external 
        view 
        returns (uint256 count, uint256 active) 
    {
        address[] memory standardTokenList = standardTokens[standard];
        count = standardTokenList.length;
        
        for (uint256 i = 0; i < standardTokenList.length; i++) {
            if (tokens[standardTokenList[i]].isActive) {
                active++;
            }
        }
        
        return (count, active);
    }
    
    // ============ Utility Functions ============
    
    /**
     * @notice Validate token standard
     * @param standard Token standard to validate
     */
    function _validateStandard(string memory standard) internal pure {
        bytes32 standardHash = keccak256(abi.encodePacked(standard));
        
        if (
            standardHash != keccak256("ERC20") &&
            standardHash != keccak256("ERC721") &&
            standardHash != keccak256("ERC1155") &&
            standardHash != keccak256("ERC1400") &&
            standardHash != keccak256("ERC3525") &&
            standardHash != keccak256("ERC4626")
        ) {
            revert InvalidStandard(standard);
        }
    }
    
    /**
     * @notice Authorize contract upgrades
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

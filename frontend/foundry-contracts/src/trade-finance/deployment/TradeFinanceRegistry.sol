// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TradeFinanceRegistry
 * @notice Central registry for all Trade Finance protocol deployments
 * @dev Tracks multiple market deployments with version management
 * 
 * Features:
 * - Register and track all Trade Finance market deployments
 * - Version management per market
 * - Query deployments by market ID
 * - Multi-chain deployment tracking
 * - Deployment status monitoring
 * - Integration with FactoryRegistry
 * 
 * Architecture:
 * - One registry tracks all markets across all chains
 * - Each market has unique ID and can have multiple versions
 * - Latest version tracked separately for convenience
 * - Historical versions remain accessible
 * 
 * Usage:
 * 1. Deploy Trade Finance system for a market
 * 2. Register: registerDeployment("ChainCapital-Commodities", addresses, "v1.0.0")
 * 3. Query: getLatestDeployment("ChainCapital-Commodities")
 * 4. Upgrade: registerDeployment("ChainCapital-Commodities", newAddresses, "v2.0.0")
 */
contract TradeFinanceRegistry is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Structs ============
    
    /**
     * @notice Core addresses for a Trade Finance deployment
     */
    struct TradeFinanceAddresses {
        address poolAddressesProvider;
        address pool;
        address poolConfigurator;
        address aclManager;
        address priceOracle;
        address priceOracleSentinel;
        address haircutEngine;
        address emergencyModule;
        address circuitBreakers;
    }
    
    /**
     * @notice Deployment metadata
     */
    struct DeploymentInfo {
        string marketId;                    // "ChainCapital-Commodities"
        string version;                     // "v1.0.0"
        uint256 chainId;                    // 1 = Ethereum, 137 = Polygon, etc.
        TradeFinanceAddresses addresses;
        uint256 deployedAt;
        address deployedBy;
        bool isActive;
        bool isDeprecated;
        string description;
        bytes32 deploymentHash;             // Hash of all addresses for verification
    }
    
    /**
     * @notice Market statistics
     */
    struct MarketStats {
        uint256 totalSupplied;              // Total value supplied (USD)
        uint256 totalBorrowed;              // Total value borrowed (USD)
        uint256 totalUsers;                 // Number of unique users
        uint256 totalCommodities;           // Number of commodity types supported
        uint256 lastActivity;               // Timestamp of last activity
    }
    
    // ============ State Variables ============
    
    uint256 public totalDeployments;
    uint256 public totalMarkets;
    
    // ============ Storage Mappings ============
    
    // marketId => latest deployment
    mapping(string => DeploymentInfo) public latestDeployment;
    
    // marketId => version => deployment
    mapping(string => mapping(string => DeploymentInfo)) public deploymentByVersion;
    
    // marketId => array of all deployments (all versions)
    mapping(string => DeploymentInfo[]) public deploymentsByMarket;
    
    // deploymentHash => DeploymentInfo (for verification)
    mapping(bytes32 => DeploymentInfo) public deploymentByHash;
    
    // marketId => MarketStats
    mapping(string => MarketStats) public marketStats;
    
    // chainId => marketIds on that chain
    mapping(uint256 => string[]) public marketsByChain;
    
    // Array of all market IDs
    string[] public allMarkets;
    mapping(string => bool) public isMarketRegistered;
    
    // Pool address => marketId (reverse lookup)
    mapping(address => string) public poolToMarket;
    
    // ============ Events ============
    
    event DeploymentRegistered(
        string indexed marketId,
        string version,
        uint256 indexed chainId,
        address indexed poolAddressesProvider,
        address registeredBy
    );
    
    event DeploymentDeprecated(
        string indexed marketId,
        string version,
        string reason
    );
    
    event DeploymentActivated(
        string indexed marketId,
        string version
    );
    
    event LatestDeploymentUpdated(
        string indexed marketId,
        string oldVersion,
        string newVersion,
        address newPoolAddressesProvider
    );
    
    event MarketStatsUpdated(
        string indexed marketId,
        uint256 totalSupplied,
        uint256 totalBorrowed,
        uint256 totalUsers
    );
    
    // ============ Errors ============
    
    error DeploymentAlreadyExists(string marketId, string version);
    error DeploymentNotFound(string marketId);
    error InvalidMarketId(string marketId);
    error InvalidAddresses();
    error InvalidChainId(uint256 chainId);
    error VersionAlreadyExists(string marketId, string version);
    error MarketAlreadyRegistered(string marketId);
    
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
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Deployment Registration ============
    
    /**
     * @notice Register a new Trade Finance deployment
     * @param marketId Market identifier (e.g., "ChainCapital-Commodities")
     * @param version Version string (e.g., "v1.0.0")
     * @param chainId Chain ID where deployed
     * @param addresses Core protocol addresses
     * @param description Deployment description
     */
    function registerDeployment(
        string memory marketId,
        string memory version,
        uint256 chainId,
        TradeFinanceAddresses memory addresses,
        string memory description
    ) external onlyRole(REGISTRAR_ROLE) {
        // Validate inputs
        if (bytes(marketId).length == 0) revert InvalidMarketId(marketId);
        if (chainId == 0) revert InvalidChainId(chainId);
        if (addresses.poolAddressesProvider == address(0)) revert InvalidAddresses();
        if (addresses.pool == address(0)) revert InvalidAddresses();
        
        // Check version doesn't already exist
        if (deploymentByVersion[marketId][version].deployedAt != 0) {
            revert VersionAlreadyExists(marketId, version);
        }
        
        // Calculate deployment hash
        bytes32 deploymentHash = _calculateDeploymentHash(addresses);
        
        // Create deployment info
        DeploymentInfo memory deployment = DeploymentInfo({
            marketId: marketId,
            version: version,
            chainId: chainId,
            addresses: addresses,
            deployedAt: block.timestamp,
            deployedBy: msg.sender,
            isActive: true,
            isDeprecated: false,
            description: description,
            deploymentHash: deploymentHash
        });
        
        // Store deployment
        deploymentByVersion[marketId][version] = deployment;
        deploymentsByMarket[marketId].push(deployment);
        deploymentByHash[deploymentHash] = deployment;
        
        // Update latest deployment
        DeploymentInfo memory oldLatest = latestDeployment[marketId];
        latestDeployment[marketId] = deployment;
        
        // Track pool to market mapping
        poolToMarket[addresses.pool] = marketId;
        
        // Register market if new
        if (!isMarketRegistered[marketId]) {
            allMarkets.push(marketId);
            isMarketRegistered[marketId] = true;
            totalMarkets++;
        }
        
        // Track by chain
        marketsByChain[chainId].push(marketId);
        
        totalDeployments++;
        
        emit DeploymentRegistered(
            marketId,
            version,
            chainId,
            addresses.poolAddressesProvider,
            msg.sender
        );
        
        emit LatestDeploymentUpdated(
            marketId,
            oldLatest.version,
            version,
            addresses.poolAddressesProvider
        );
    }
    
    /**
     * @notice Deprecate a deployment
     * @param marketId Market identifier
     * @param version Version to deprecate
     * @param reason Deprecation reason
     */
    function deprecateDeployment(
        string memory marketId,
        string memory version,
        string memory reason
    ) external onlyRole(REGISTRAR_ROLE) {
        DeploymentInfo storage deployment = deploymentByVersion[marketId][version];
        if (deployment.deployedAt == 0) revert DeploymentNotFound(marketId);
        
        deployment.isDeprecated = true;
        deployment.isActive = false;
        
        emit DeploymentDeprecated(marketId, version, reason);
    }
    
    /**
     * @notice Reactivate a deployment
     * @param marketId Market identifier
     * @param version Version to reactivate
     */
    function activateDeployment(
        string memory marketId,
        string memory version
    ) external onlyRole(REGISTRAR_ROLE) {
        DeploymentInfo storage deployment = deploymentByVersion[marketId][version];
        if (deployment.deployedAt == 0) revert DeploymentNotFound(marketId);
        
        deployment.isActive = true;
        deployment.isDeprecated = false;
        
        emit DeploymentActivated(marketId, version);
    }
    
    // ============ Market Statistics ============
    
    /**
     * @notice Update market statistics
     * @param marketId Market identifier
     * @param totalSupplied Total value supplied (USD)
     * @param totalBorrowed Total value borrowed (USD)
     * @param totalUsers Total number of users
     * @param totalCommodities Total commodity types
     */
    function updateMarketStats(
        string memory marketId,
        uint256 totalSupplied,
        uint256 totalBorrowed,
        uint256 totalUsers,
        uint256 totalCommodities
    ) external {
        // Verify caller is registered pool for this market
        require(
            bytes(poolToMarket[msg.sender]).length > 0 &&
            keccak256(bytes(poolToMarket[msg.sender])) == keccak256(bytes(marketId)),
            "Only pool can update stats"
        );
        
        MarketStats storage stats = marketStats[marketId];
        stats.totalSupplied = totalSupplied;
        stats.totalBorrowed = totalBorrowed;
        stats.totalUsers = totalUsers;
        stats.totalCommodities = totalCommodities;
        stats.lastActivity = block.timestamp;
        
        emit MarketStatsUpdated(marketId, totalSupplied, totalBorrowed, totalUsers);
    }
    
    // ============ Query Functions ============
    
    /**
     * @notice Get latest deployment for a market
     * @param marketId Market identifier
     * @return DeploymentInfo Latest deployment
     */
    function getLatestDeployment(string memory marketId)
        external
        view
        returns (DeploymentInfo memory)
    {
        if (!isMarketRegistered[marketId]) revert DeploymentNotFound(marketId);
        return latestDeployment[marketId];
    }
    
    /**
     * @notice Get deployment by market and version
     * @param marketId Market identifier
     * @param version Version string
     * @return DeploymentInfo Deployment info
     */
    function getDeploymentByVersion(
        string memory marketId,
        string memory version
    ) external view returns (DeploymentInfo memory) {
        return deploymentByVersion[marketId][version];
    }
    
    /**
     * @notice Get all deployments for a market
     * @param marketId Market identifier
     * @return DeploymentInfo[] Array of all deployments
     */
    function getDeploymentsByMarket(string memory marketId)
        external
        view
        returns (DeploymentInfo[] memory)
    {
        return deploymentsByMarket[marketId];
    }
    
    /**
     * @notice Get deployment by hash (for verification)
     * @param deploymentHash Hash to lookup
     * @return DeploymentInfo Deployment info
     */
    function getDeploymentByHash(bytes32 deploymentHash)
        external
        view
        returns (DeploymentInfo memory)
    {
        return deploymentByHash[deploymentHash];
    }
    
    /**
     * @notice Get market ID from pool address
     * @param pool Pool address
     * @return string Market ID
     */
    function getMarketFromPool(address pool)
        external
        view
        returns (string memory)
    {
        return poolToMarket[pool];
    }
    
    /**
     * @notice Get all markets on a specific chain
     * @param chainId Chain ID
     * @return string[] Array of market IDs
     */
    function getMarketsByChain(uint256 chainId)
        external
        view
        returns (string[] memory)
    {
        return marketsByChain[chainId];
    }
    
    /**
     * @notice Get all registered markets
     * @return string[] Array of all market IDs
     */
    function getAllMarkets() external view returns (string[] memory) {
        return allMarkets;
    }
    
    /**
     * @notice Get market statistics
     * @param marketId Market identifier
     * @return MarketStats Market statistics
     */
    function getMarketStats(string memory marketId)
        external
        view
        returns (MarketStats memory)
    {
        return marketStats[marketId];
    }
    
    /**
     * @notice Get registry statistics
     * @return totalDeployments_ Total deployments
     * @return totalMarkets_ Total markets
     * @return activeDeployments Number of active deployments
     */
    function getRegistryStats()
        external
        view
        returns (
            uint256 totalDeployments_,
            uint256 totalMarkets_,
            uint256 activeDeployments
        )
    {
        totalDeployments_ = totalDeployments;
        totalMarkets_ = totalMarkets;
        
        // Count active deployments
        for (uint256 i = 0; i < allMarkets.length; i++) {
            if (latestDeployment[allMarkets[i]].isActive) {
                activeDeployments++;
            }
        }
        
        return (totalDeployments_, totalMarkets_, activeDeployments);
    }
    
    /**
     * @notice Check if market is registered
     * @param marketId Market identifier
     * @return bool Whether market is registered
     */
    function isMarketActive(string memory marketId)
        external
        view
        returns (bool)
    {
        return isMarketRegistered[marketId] && latestDeployment[marketId].isActive;
    }
    
    /**
     * @notice Verify deployment addresses
     * @param marketId Market identifier
     * @param version Version to verify
     * @param addresses Addresses to verify
     * @return bool Whether addresses match
     */
    function verifyDeployment(
        string memory marketId,
        string memory version,
        TradeFinanceAddresses memory addresses
    ) external view returns (bool) {
        DeploymentInfo memory deployment = deploymentByVersion[marketId][version];
        bytes32 providedHash = _calculateDeploymentHash(addresses);
        return deployment.deploymentHash == providedHash;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Calculate hash of deployment addresses
     * @param addresses Addresses to hash
     * @return bytes32 Hash
     */
    function _calculateDeploymentHash(TradeFinanceAddresses memory addresses)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(
            addresses.poolAddressesProvider,
            addresses.pool,
            addresses.poolConfigurator,
            addresses.aclManager,
            addresses.priceOracle,
            addresses.priceOracleSentinel,
            addresses.haircutEngine,
            addresses.emergencyModule,
            addresses.circuitBreakers
        ));
    }
    
    // ============ Upgrade Authorization ============
    
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

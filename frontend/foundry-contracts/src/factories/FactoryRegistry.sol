// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title FactoryRegistry
 * @notice Central registry for all token factories
 * @dev UUPS upgradeable registry for factory discovery and versioning
 * 
 * Features:
 * - Register and track all factory contracts
 * - Version management per factory type
 * - Factory discovery by token standard
 * - Multi-version support for gradual upgrades
 * - Access control for factory registration
 * 
 * Architecture:
 * - One registry contract tracks all factories
 * - Each token standard can have multiple factory versions
 * - Latest version is tracked separately for convenience
 * - Historical versions remain accessible
 * 
 * Usage:
 * 1. Deploy new factory contract
 * 2. Register: registerFactory("ERC20", factoryAddress, "v1.0.0")
 * 3. Query: getLatestFactory("ERC20") returns current factory
 * 4. Upgrade: registerFactory("ERC20", newFactoryAddress, "v2.0.0")
 */
contract FactoryRegistry is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Structs ============
    
    struct FactoryInfo {
        address factoryAddress;
        string standard;           // ERC20, ERC721, ERC1155, etc.
        string version;            // v1.0.0, v2.0.0, etc.
        uint256 registeredAt;
        address registeredBy;
        bool isActive;
        bool isDeprecated;
        string description;
    }
    
    struct FactoryStats {
        uint256 totalDeployed;     // Total tokens deployed by factory
        uint256 activeTokens;      // Active tokens
        uint256 lastDeployment;    // Timestamp of last deployment
    }
    
    // ============ State Variables ============
    
    uint256 public totalFactories;
    
    // ============ Storage Mappings ============
    
    // standard => latest factory address
    mapping(string => address) public latestFactory;
    
    // standard => version => factory address
    mapping(string => mapping(string => address)) public factoryByVersion;
    
    // factory address => FactoryInfo
    mapping(address => FactoryInfo) public factories;
    
    // factory address => FactoryStats
    mapping(address => FactoryStats) public factoryStats;
    
    // standard => array of all factory addresses (all versions)
    mapping(string => address[]) public factoriesByStandard;
    
    // Array of all registered factory addresses
    address[] public allFactories;
    
    // Supported standards
    string[] public supportedStandards;
    mapping(string => bool) public isStandardSupported;
    
    // ============ Events ============
    
    event FactoryRegistered(
        address indexed factoryAddress,
        string standard,
        string version,
        address indexed registrar
    );
    
    event FactoryDeprecated(
        address indexed factoryAddress,
        string standard,
        string reason
    );
    
    event FactoryActivated(
        address indexed factoryAddress,
        string standard
    );
    
    event LatestFactoryUpdated(
        string indexed standard,
        address indexed oldFactory,
        address indexed newFactory,
        string version
    );
    
    event StandardAdded(string standard);
    
    event FactoryStatsUpdated(
        address indexed factoryAddress,
        uint256 totalDeployed,
        uint256 activeTokens
    );
    
    // ============ Errors ============
    
    error FactoryAlreadyRegistered(address factory);
    error FactoryNotFound(address factory);
    error InvalidFactory();
    error InvalidStandard(string standard);
    error StandardNotSupported(string standard);
    error VersionAlreadyExists(string standard, string version);
    
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
        
        // Initialize supported standards
        _addStandard("ERC20");
        _addStandard("ERC721");
        _addStandard("ERC1155");
        _addStandard("ERC3525");
        _addStandard("ERC4626");
        _addStandard("ERC1400");
        _addStandard("ERC20Rebasing");
    }
    
    // ============ Factory Registration ============
    
    /**
     * @notice Register a new factory
     * @param factoryAddress Factory contract address
     * @param standard Token standard (ERC20, ERC721, etc.)
     * @param version Version string (e.g., "v1.0.0")
     * @param description Factory description
     */
    function registerFactory(
        address factoryAddress,
        string memory standard,
        string memory version,
        string memory description
    ) external onlyRole(REGISTRAR_ROLE) {
        if (factoryAddress == address(0)) revert InvalidFactory();
        if (!isStandardSupported[standard]) revert StandardNotSupported(standard);
        if (factories[factoryAddress].factoryAddress != address(0)) {
            revert FactoryAlreadyRegistered(factoryAddress);
        }
        if (factoryByVersion[standard][version] != address(0)) {
            revert VersionAlreadyExists(standard, version);
        }
        
        // Create factory info
        factories[factoryAddress] = FactoryInfo({
            factoryAddress: factoryAddress,
            standard: standard,
            version: version,
            registeredAt: block.timestamp,
            registeredBy: msg.sender,
            isActive: true,
            isDeprecated: false,
            description: description
        });
        
        // Initialize stats
        factoryStats[factoryAddress] = FactoryStats({
            totalDeployed: 0,
            activeTokens: 0,
            lastDeployment: 0
        });
        
        // Add to tracking arrays
        allFactories.push(factoryAddress);
        factoriesByStandard[standard].push(factoryAddress);
        factoryByVersion[standard][version] = factoryAddress;
        
        // Update latest factory for this standard
        address oldLatest = latestFactory[standard];
        latestFactory[standard] = factoryAddress;
        
        totalFactories++;
        
        emit FactoryRegistered(factoryAddress, standard, version, msg.sender);
        emit LatestFactoryUpdated(standard, oldLatest, factoryAddress, version);
    }
    
    /**
     * @notice Deprecate a factory
     * @param factoryAddress Factory to deprecate
     * @param reason Reason for deprecation
     */
    function deprecateFactory(
        address factoryAddress,
        string memory reason
    ) external onlyRole(REGISTRAR_ROLE) {
        FactoryInfo storage factory = factories[factoryAddress];
        if (factory.factoryAddress == address(0)) revert FactoryNotFound(factoryAddress);
        
        factory.isDeprecated = true;
        factory.isActive = false;
        
        emit FactoryDeprecated(factoryAddress, factory.standard, reason);
    }
    
    /**
     * @notice Reactivate a factory
     * @param factoryAddress Factory to reactivate
     */
    function activateFactory(address factoryAddress) 
        external 
        onlyRole(REGISTRAR_ROLE) 
    {
        FactoryInfo storage factory = factories[factoryAddress];
        if (factory.factoryAddress == address(0)) revert FactoryNotFound(factoryAddress);
        
        factory.isActive = true;
        factory.isDeprecated = false;
        
        emit FactoryActivated(factoryAddress, factory.standard);
    }
    
    // ============ Factory Statistics ============
    
    /**
     * @notice Update factory statistics (called by factory contracts)
     * @param factoryAddress Factory address
     * @param totalDeployed Total tokens deployed
     * @param activeTokens Number of active tokens
     */
    function updateFactoryStats(
        address factoryAddress,
        uint256 totalDeployed,
        uint256 activeTokens
    ) external {
        // Verify caller is a registered factory
        if (factories[factoryAddress].factoryAddress == address(0)) {
            revert FactoryNotFound(factoryAddress);
        }
        
        // Only the factory itself can update its stats
        require(msg.sender == factoryAddress, "Only factory can update stats");
        
        FactoryStats storage stats = factoryStats[factoryAddress];
        stats.totalDeployed = totalDeployed;
        stats.activeTokens = activeTokens;
        stats.lastDeployment = block.timestamp;
        
        emit FactoryStatsUpdated(factoryAddress, totalDeployed, activeTokens);
    }
    
    // ============ Query Functions ============
    
    /**
     * @notice Get latest factory for a standard
     * @param standard Token standard
     * @return address Latest factory address
     */
    function getLatestFactory(string memory standard) 
        external 
        view 
        returns (address) 
    {
        if (!isStandardSupported[standard]) revert StandardNotSupported(standard);
        return latestFactory[standard];
    }
    
    /**
     * @notice Get factory by standard and version
     * @param standard Token standard
     * @param version Version string
     * @return address Factory address
     */
    function getFactoryByVersion(
        string memory standard,
        string memory version
    ) external view returns (address) {
        return factoryByVersion[standard][version];
    }
    
    /**
     * @notice Get all factories for a standard
     * @param standard Token standard
     * @return address[] Array of factory addresses (all versions)
     */
    function getFactoriesByStandard(string memory standard) 
        external 
        view 
        returns (address[] memory) 
    {
        return factoriesByStandard[standard];
    }
    
    /**
     * @notice Get factory information
     * @param factoryAddress Factory address
     * @return FactoryInfo Factory details
     */
    function getFactoryInfo(address factoryAddress) 
        external 
        view 
        returns (FactoryInfo memory) 
    {
        if (factories[factoryAddress].factoryAddress == address(0)) {
            revert FactoryNotFound(factoryAddress);
        }
        return factories[factoryAddress];
    }
    
    /**
     * @notice Get factory statistics
     * @param factoryAddress Factory address
     * @return FactoryStats Factory stats
     */
    function getFactoryStats(address factoryAddress) 
        external 
        view 
        returns (FactoryStats memory) 
    {
        return factoryStats[factoryAddress];
    }
    
    /**
     * @notice Get all registered factories
     * @return address[] Array of all factory addresses
     */
    function getAllFactories() external view returns (address[] memory) {
        return allFactories;
    }
    
    /**
     * @notice Get all supported standards
     * @return string[] Array of supported standard names
     */
    function getSupportedStandards() external view returns (string[] memory) {
        return supportedStandards;
    }
    
    /**
     * @notice Check if a factory is registered
     * @param factoryAddress Factory address to check
     * @return bool Whether factory is registered
     */
    function isFactoryRegistered(address factoryAddress) 
        external 
        view 
        returns (bool) 
    {
        return factories[factoryAddress].factoryAddress != address(0);
    }
    
    /**
     * @notice Check if a factory is active
     * @param factoryAddress Factory address to check
     * @return bool Whether factory is active
     */
    function isFactoryActive(address factoryAddress) 
        external 
        view 
        returns (bool) 
    {
        return factories[factoryAddress].isActive;
    }
    
    /**
     * @notice Get active factories by standard
     * @param standard Token standard
     * @return activeFactories Array of active factory addresses
     */
    function getActiveFactoriesByStandard(string memory standard) 
        external 
        view 
        returns (address[] memory activeFactories) 
    {
        address[] memory allStandardFactories = factoriesByStandard[standard];
        uint256 activeCount = 0;
        
        // Count active factories
        for (uint256 i = 0; i < allStandardFactories.length; i++) {
            if (factories[allStandardFactories[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active factories
        activeFactories = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allStandardFactories.length; i++) {
            if (factories[allStandardFactories[i]].isActive) {
                activeFactories[index] = allStandardFactories[i];
                index++;
            }
        }
        
        return activeFactories;
    }
    
    /**
     * @notice Get registry statistics
     * @return totalFactories_ Total registered factories
     * @return activeFactories Number of active factories
     * @return supportedStandards_ Number of supported standards
     */
    function getRegistryStats() 
        external 
        view 
        returns (
            uint256 totalFactories_,
            uint256 activeFactories,
            uint256 supportedStandards_
        ) 
    {
        totalFactories_ = totalFactories;
        supportedStandards_ = supportedStandards.length;
        
        // Count active factories
        for (uint256 i = 0; i < allFactories.length; i++) {
            if (factories[allFactories[i]].isActive) {
                activeFactories++;
            }
        }
        
        return (totalFactories_, activeFactories, supportedStandards_);
    }
    
    // ============ Standard Management ============
    
    /**
     * @notice Add a new supported standard
     * @param standard Standard name to add
     */
    function addStandard(string memory standard) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _addStandard(standard);
    }
    
    /**
     * @notice Internal function to add standard
     */
    function _addStandard(string memory standard) internal {
        if (!isStandardSupported[standard]) {
            isStandardSupported[standard] = true;
            supportedStandards.push(standard);
            emit StandardAdded(standard);
        }
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

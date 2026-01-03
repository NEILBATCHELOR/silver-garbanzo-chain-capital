// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title PoolAddressesProvider
 * @notice Central registry for all protocol contract addresses
 * @dev Upgradeable via UUPS pattern - admin controls upgrades
 * 
 * UPGRADEABILITY:
 * - Pattern: UUPS (Universal Upgradeable Proxy Standard)
 * - Upgrade Control: Only owner can upgrade
 * - Storage: Uses storage gaps for future variables
 * - Initialization: Uses initialize() instead of constructor
 */
contract PoolAddressesProvider is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // ============ State Variables ============
    
    string private _marketId;
    address private _pool;
    address private _poolConfigurator;
    address private _priceOracle;
    address private _aclManager;
    address private _poolDataProvider;
    address private _haircutEngine;
    
    // ============ Storage Gap ============
    // Reserve 43 slots for future variables (50 total - 7 current)
    uint256[43] private __gap;
    
    // ============ Events ============
    
    event MarketIdSet(string indexed oldMarketId, string indexed newMarketId);
    event PoolUpdated(address indexed oldAddress, address indexed newAddress);
    event PoolConfiguratorUpdated(address indexed oldAddress, address indexed newAddress);
    event PriceOracleUpdated(address indexed oldAddress, address indexed newAddress);
    event ACLManagerUpdated(address indexed oldAddress, address indexed newAddress);
    event PoolDataProviderUpdated(address indexed oldAddress, address indexed newAddress);
    event HaircutEngineUpdated(address indexed oldAddress, address indexed newAddress);
    event ProxyCreated(bytes32 indexed id, address indexed proxyAddress, address indexed implementationAddress);
    event AddressSet(bytes32 indexed id, address indexed oldAddress, address indexed newAddress);
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error InvalidMarketId();
    error InvalidAddress();
    error ZeroAddress();
    
    // ============ Constructor ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param marketId The identifier of the market
     * @param owner The owner address
     */
    function initialize(
        string memory marketId,
        address owner
    ) public initializer {
        if (bytes(marketId).length == 0) revert InvalidMarketId();
        if (owner == address(0)) revert ZeroAddress();
        
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        
        _setMarketId(marketId);
    }
    
    // ============ Getters ============
    
    function getMarketId() external view returns (string memory) {
        return _marketId;
    }
    
    function getPool() external view returns (address) {
        return _pool;
    }
    
    function getPoolConfigurator() external view returns (address) {
        return _poolConfigurator;
    }
    
    function getPriceOracle() external view returns (address) {
        return _priceOracle;
    }
    
    function getACLManager() external view returns (address) {
        return _aclManager;
    }
    
    function getPoolDataProvider() external view returns (address) {
        return _poolDataProvider;
    }
    
    function getHaircutEngine() external view returns (address) {
        return _haircutEngine;
    }
    
    // ============ Setters ============
    
    function setMarketId(string memory newMarketId) external onlyOwner {
        if (bytes(newMarketId).length == 0) revert InvalidMarketId();
        _setMarketId(newMarketId);
    }
    
    function setPool(address pool) external onlyOwner {
        if (pool == address(0)) revert ZeroAddress();
        emit PoolUpdated(_pool, pool);
        _pool = pool;
    }
    
    function setPoolConfigurator(address poolConfigurator) external onlyOwner {
        if (poolConfigurator == address(0)) revert ZeroAddress();
        emit PoolConfiguratorUpdated(_poolConfigurator, poolConfigurator);
        _poolConfigurator = poolConfigurator;
    }
    
    function setPriceOracle(address priceOracle) external onlyOwner {
        if (priceOracle == address(0)) revert ZeroAddress();
        emit PriceOracleUpdated(_priceOracle, priceOracle);
        _priceOracle = priceOracle;
    }
    
    function setACLManager(address aclManager) external onlyOwner {
        if (aclManager == address(0)) revert ZeroAddress();
        emit ACLManagerUpdated(_aclManager, aclManager);
        _aclManager = aclManager;
    }
    
    function setPoolDataProvider(address poolDataProvider) external onlyOwner {
        if (poolDataProvider == address(0)) revert ZeroAddress();
        emit PoolDataProviderUpdated(_poolDataProvider, poolDataProvider);
        _poolDataProvider = poolDataProvider;
    }
    
    function setHaircutEngine(address haircutEngine) external onlyOwner {
        if (haircutEngine == address(0)) revert ZeroAddress();
        emit HaircutEngineUpdated(_haircutEngine, haircutEngine);
        _haircutEngine = haircutEngine;
    }
    
    // ============ Internal Functions ============
    
    function _setMarketId(string memory newMarketId) internal {
        string memory oldMarketId = _marketId;
        _marketId = newMarketId;
        emit MarketIdSet(oldMarketId, newMarketId);
    }
    
    // ============ Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrades
     * @dev Only owner can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {
        emit Upgraded(newImplementation);
    }
}

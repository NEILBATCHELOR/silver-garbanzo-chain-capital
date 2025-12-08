// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PoolAddressesProvider
 * @notice Central registry for all protocol contract addresses
 * @dev Maintains addresses of key protocol components and provides upgrade capability
 */
contract PoolAddressesProvider is Ownable {
    // Market identifier
    string private _marketId;

    // Core protocol addresses
    address private _pool;
    address private _poolConfigurator;
    address private _priceOracle;
    address private _aclManager;
    address private _poolDataProvider;
    address private _haircutEngine;

    // Events
    event MarketIdSet(string indexed oldMarketId, string indexed newMarketId);
    event PoolUpdated(address indexed oldAddress, address indexed newAddress);
    event PoolConfiguratorUpdated(address indexed oldAddress, address indexed newAddress);
    event PriceOracleUpdated(address indexed oldAddress, address indexed newAddress);
    event ACLManagerUpdated(address indexed oldAddress, address indexed newAddress);
    event PoolDataProviderUpdated(address indexed oldAddress, address indexed newAddress);
    event HaircutEngineUpdated(address indexed oldAddress, address indexed newAddress);
    event ProxyCreated(bytes32 indexed id, address indexed proxyAddress, address indexed implementationAddress);
    event AddressSet(bytes32 indexed id, address indexed oldAddress, address indexed newAddress);

    /**
     * @dev Constructor
     * @param marketId The identifier of the market
     * @param owner The owner address of this contract
     */
    constructor(string memory marketId, address owner) Ownable(owner) {
        _setMarketId(marketId);
    }

    // ============ Core Getters ============

    /**
     * @notice Returns the market identifier
     */
    function getMarketId() external view returns (string memory) {
        return _marketId;
    }

    /**
     * @notice Returns the main Pool proxy address
     */
    function getPool() external view returns (address) {
        return _pool;
    }

    /**
     * @notice Returns the PoolConfigurator proxy address
     */
    function getPoolConfigurator() external view returns (address) {
        return _poolConfigurator;
    }

    /**
     * @notice Returns the price oracle address
     */
    function getPriceOracle() external view returns (address) {
        return _priceOracle;
    }

    /**
     * @notice Returns the ACL manager address
     */
    function getACLManager() external view returns (address) {
        return _aclManager;
    }

    /**
     * @notice Returns the pool data provider address
     */
    function getPoolDataProvider() external view returns (address) {
        return _poolDataProvider;
    }

    /**
     * @notice Returns the haircut engine address
     */
    function getHaircutEngine() external view returns (address) {
        return _haircutEngine;
    }

    // ============ Core Setters (OnlyOwner) ============

    /**
     * @notice Sets the market identifier
     * @param newMarketId The new market identifier
     */
    function setMarketId(string memory newMarketId) external onlyOwner {
        _setMarketId(newMarketId);
    }

    /**
     * @notice Updates the Pool address
     * @param newPool The new Pool address
     */
    function setPool(address newPool) external onlyOwner {
        address oldPool = _pool;
        _pool = newPool;
        emit PoolUpdated(oldPool, newPool);
    }

    /**
     * @notice Updates the PoolConfigurator address
     * @param newPoolConfigurator The new PoolConfigurator address
     */
    function setPoolConfigurator(address newPoolConfigurator) external onlyOwner {
        address oldPoolConfigurator = _poolConfigurator;
        _poolConfigurator = newPoolConfigurator;
        emit PoolConfiguratorUpdated(oldPoolConfigurator, newPoolConfigurator);
    }

    /**
     * @notice Updates the price oracle address
     * @param newPriceOracle The new price oracle address
     */
    function setPriceOracle(address newPriceOracle) external onlyOwner {
        address oldPriceOracle = _priceOracle;
        _priceOracle = newPriceOracle;
        emit PriceOracleUpdated(oldPriceOracle, newPriceOracle);
    }

    /**
     * @notice Updates the ACL manager address
     * @param newAclManager The new ACL manager address
     */
    function setACLManager(address newAclManager) external onlyOwner {
        address oldAclManager = _aclManager;
        _aclManager = newAclManager;
        emit ACLManagerUpdated(oldAclManager, newAclManager);
    }

    /**
     * @notice Updates the pool data provider address
     * @param newDataProvider The new data provider address
     */
    function setPoolDataProvider(address newDataProvider) external onlyOwner {
        address oldDataProvider = _poolDataProvider;
        _poolDataProvider = newDataProvider;
        emit PoolDataProviderUpdated(oldDataProvider, newDataProvider);
    }

    /**
     * @notice Updates the haircut engine address
     * @param newHaircutEngine The new haircut engine address
     */
    function setHaircutEngine(address newHaircutEngine) external onlyOwner {
        address oldHaircutEngine = _haircutEngine;
        _haircutEngine = newHaircutEngine;
        emit HaircutEngineUpdated(oldHaircutEngine, newHaircutEngine);
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal function to set the market identifier
     * @param newMarketId The new market identifier
     */
    function _setMarketId(string memory newMarketId) internal {
        string memory oldMarketId = _marketId;
        _marketId = newMarketId;
        emit MarketIdSet(oldMarketId, newMarketId);
    }
}

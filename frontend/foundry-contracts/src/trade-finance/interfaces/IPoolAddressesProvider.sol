// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPoolAddressesProvider
 * @notice Interface for the PoolAddressesProvider contract
 */
interface IPoolAddressesProvider {
    /**
     * @notice Returns the market identifier
     * @return The market identifier
     */
    function getMarketId() external view returns (string memory);

    /**
     * @notice Returns the Pool proxy address
     * @return The Pool proxy address
     */
    function getPool() external view returns (address);

    /**
     * @notice Returns the PoolConfigurator proxy address
     * @return The PoolConfigurator proxy address
     */
    function getPoolConfigurator() external view returns (address);

    /**
     * @notice Returns the price oracle address
     * @return The price oracle address
     */
    function getPriceOracle() external view returns (address);

    /**
     * @notice Returns the ACL manager address
     * @return The ACL manager address
     */
    function getACLManager() external view returns (address);

    /**
     * @notice Returns the pool data provider address
     * @return The pool data provider address
     */
    function getPoolDataProvider() external view returns (address);

    /**
     * @notice Returns the haircut engine address
     * @return The haircut engine address
     */
    function getHaircutEngine() external view returns (address);

    /**
     * @notice Sets the market identifier
     * @param newMarketId The new market identifier
     */
    function setMarketId(string memory newMarketId) external;

    /**
     * @notice Updates the Pool address
     * @param newPool The new Pool address
     */
    function setPool(address newPool) external;

    /**
     * @notice Updates the PoolConfigurator address
     * @param newPoolConfigurator The new PoolConfigurator address
     */
    function setPoolConfigurator(address newPoolConfigurator) external;

    /**
     * @notice Updates the price oracle address
     * @param newPriceOracle The new price oracle address
     */
    function setPriceOracle(address newPriceOracle) external;

    /**
     * @notice Updates the ACL manager address
     * @param newAclManager The new ACL manager address
     */
    function setACLManager(address newAclManager) external;

    /**
     * @notice Updates the pool data provider address
     * @param newDataProvider The new data provider address
     */
    function setPoolDataProvider(address newDataProvider) external;

    /**
     * @notice Updates the haircut engine address
     * @param newHaircutEngine The new haircut engine address
     */
    function setHaircutEngine(address newHaircutEngine) external;
}

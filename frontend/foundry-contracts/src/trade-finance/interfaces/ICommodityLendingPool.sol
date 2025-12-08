// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DataTypes} from "../libraries/types/DataTypes.sol";

/**
 * @title ICommodityLendingPool
 * @notice Interface for the Commodity Lending Pool contract
 */
interface ICommodityLendingPool {
    /**
     * @notice Returns the normalized variable debt for a reserve
     * @param asset The address of the underlying asset
     * @return The normalized variable debt
     */
    function getReserveNormalizedVariableDebt(address asset) external view returns (uint256);

    /**
     * @notice Returns the normalized income for a reserve
     * @param asset The address of the underlying asset
     * @return The normalized income
     */
    function getReserveNormalizedIncome(address asset) external view returns (uint256);

    /**
     * @notice Returns the configuration of a reserve
     * @param asset The address of the underlying asset
     * @return The configuration map
     */
    function getConfiguration(address asset) external view returns (DataTypes.CommodityConfigurationMap memory);

    /**
     * @notice Sets the configuration of a reserve
     * @param asset The address of the underlying asset
     * @param configuration The new configuration
     */
    function setConfiguration(address asset, DataTypes.CommodityConfigurationMap memory configuration) external;
}

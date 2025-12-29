// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITransferStrategyBase} from "./ITransferStrategyBase.sol";

/**
 * @title IPullRewardsTransferStrategy
 * @notice Interface for pull-based reward transfer strategy
 * @dev Pulls rewards from an external vault that has approved the strategy
 */
interface IPullRewardsTransferStrategy is ITransferStrategyBase {
    /**
     * @notice Get the rewards vault address
     * @return Address of the vault holding reward tokens
     */
    function getRewardsVault() external view returns (address);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITransferStrategyBase} from "../interfaces/ITransferStrategyBase.sol";

/**
 * @title RewardsDataTypes
 * @notice Library containing data structures for the rewards distribution system
 * @dev Used by RewardsController and RewardsDistributor for liquidity mining incentives
 */
library RewardsDataTypes {
    /**
     * @notice Configuration input for setting up reward distributions
     * @param emissionPerSecond Rate of reward tokens distributed per second
     * @param totalSupply Current total supply of the asset (auto-filled during configuration)
     * @param distributionEnd Timestamp when reward distribution ends
     * @param asset Address of the cToken or debtToken receiving rewards
     * @param reward Address of the reward token being distributed
     * @param transferStrategy Contract handling reward token transfers
     * @param rewardOracle Chainlink-compatible oracle for reward token pricing
     */
    struct RewardsConfigInput {
        uint88 emissionPerSecond;
        uint256 totalSupply;
        uint32 distributionEnd;
        address asset;
        address reward;
        ITransferStrategyBase transferStrategy;
        address rewardOracle;
    }

    /**
     * @notice User asset balance snapshot for reward calculations
     * @param asset Address of the incentivized asset
     * @param userBalance Scaled balance of the user
     * @param totalSupply Scaled total supply of the asset
     */
    struct UserAssetBalance {
        address asset;
        uint256 userBalance;
        uint256 totalSupply;
    }

    /**
     * @notice Per-user reward tracking data
     * @param index User's reward index at last interaction
     * @param accrued Amount of unclaimed rewards accumulated
     */
    struct UserData {
        uint104 index;
        uint128 accrued;
    }

    /**
     * @notice Per-reward token distribution data
     * @param index Global reward distribution index
     * @param emissionPerSecond Current emission rate
     * @param lastUpdateTimestamp Last time the index was updated
     * @param distributionEnd End timestamp for this distribution
     * @param usersData Mapping of user addresses to their reward data
     */
    struct RewardData {
        uint104 index;
        uint88 emissionPerSecond;
        uint32 lastUpdateTimestamp;
        uint32 distributionEnd;
        mapping(address => UserData) usersData;
    }

    /**
     * @notice Per-asset reward configuration data
     * @param rewards Mapping of reward token address to its distribution data
     * @param availableRewards Mapping of index to available reward token addresses
     * @param availableRewardsCount Number of reward tokens configured for this asset
     * @param decimals Decimal precision of the asset token
     */
    struct AssetData {
        mapping(address => RewardData) rewards;
        mapping(uint128 => address) availableRewards;
        uint128 availableRewardsCount;
        uint8 decimals;
    }

    /**
     * @notice Commodity-specific emission configuration
     * @param commodityType Type of commodity (gold, oil, wheat, etc.)
     * @param seasonalMultiplier Seasonal adjustment for agricultural commodities
     * @param volatilityAdjustment Emission adjustment based on commodity volatility
     * @param minEmission Minimum emission rate floor
     * @param maxEmission Maximum emission rate ceiling
     */
    struct CommodityEmissionConfig {
        bytes32 commodityType;
        uint256 seasonalMultiplier;
        uint256 volatilityAdjustment;
        uint88 minEmission;
        uint88 maxEmission;
    }
}

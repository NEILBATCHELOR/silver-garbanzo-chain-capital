// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRewardsDistributor
 * @notice Interface for the rewards distribution accounting contract
 * @dev Handles reward index calculations and user accrual tracking
 */
interface IRewardsDistributor {
    /**
     * @notice Emitted when reward asset configuration is updated
     * @param asset The incentivized asset address
     * @param reward The reward token address
     * @param oldEmission Previous emission rate
     * @param newEmission New emission rate
     * @param oldDistributionEnd Previous distribution end timestamp
     * @param newDistributionEnd New distribution end timestamp
     * @param assetIndex Current distribution index
     */
    event AssetConfigUpdated(
        address indexed asset,
        address indexed reward,
        uint256 oldEmission,
        uint256 newEmission,
        uint256 oldDistributionEnd,
        uint256 newDistributionEnd,
        uint256 assetIndex
    );

    /**
     * @notice Emitted when rewards are accrued to a user
     * @param asset The incentivized asset
     * @param reward The reward token
     * @param user The user address
     */
    /**
     *  @param assetIndex Updated asset reward index
     *  @param userIndex User's new reward index
     *  @param rewardsAccrued Amount of rewards accrued
     */
    event Accrued(
        address indexed asset,
        address indexed reward,
        address indexed user,
        uint256 assetIndex,
        uint256 userIndex,
        uint256 rewardsAccrued
    );

    /**
     * @notice Get distribution data for an asset-reward pair
     * @param asset The incentivized asset
     * @param reward The reward token
     * @return index Current distribution index
     * @return emissionPerSecond Current emission rate
     * @return lastUpdateTimestamp Last update time
     * @return distributionEnd Distribution end timestamp
     */
    function getRewardsData(
        address asset,
        address reward
    ) external view returns (uint256, uint256, uint256, uint256);

    /**
     * @notice Get the current and next distribution index
     * @param asset The incentivized asset
     * @param reward The reward token
     * @return Current index and projected next index
     */
    function getAssetIndex(
        address asset,
        address reward
    ) external view returns (uint256, uint256);

    /**
     * @notice Get distribution end timestamp
     * @param asset The incentivized asset
     * @param reward The reward token
     * @return End timestamp
     */
    function getDistributionEnd(
        address asset,
        address reward
    ) external view returns (uint256);

    /**
     * @notice Get all reward tokens for an asset
     * @param asset The incentivized asset
     * @return Array of reward token addresses
     */
    function getRewardsByAsset(
        address asset
    ) external view returns (address[] memory);

    /**
     * @notice Get all configured reward tokens
     * @return Array of all reward token addresses
     */
    function getRewardsList() external view returns (address[] memory);

    /**
     * @notice Get user's index for an asset-reward pair
     * @param user User address
     * @param asset The incentivized asset
     * @param reward The reward token
     * @return User's current index
     */
    function getUserAssetIndex(
        address user,
        address asset,
        address reward
    ) external view returns (uint256);

    /**
     * @notice Get total accrued rewards for a user across all assets
     * @param user User address
     * @param reward The reward token
     * @return Total accrued amount
     */
    function getUserAccruedRewards(
        address user,
        address reward
    ) external view returns (uint256);

    /**
     * @notice Get pending rewards for specific assets
     * @param assets Array of asset addresses
     * @param user User address
     * @param reward The reward token
     * @return Pending reward amount
     */
    function getUserRewards(
        address[] calldata assets,
        address user,
        address reward
    ) external view returns (uint256);

    /**
     * @notice Get all pending rewards for a user
     * @param assets Array of asset addresses
     * @param user User address
     * @return rewardsList Array of reward token addresses
     * @return unclaimedAmounts Array of unclaimed amounts
     */
    function getAllUserRewards(
        address[] calldata assets,
        address user
    ) external view returns (address[] memory rewardsList, uint256[] memory unclaimedAmounts);

    /**
     * @notice Set distribution end time (emission manager only)
     * @param asset The incentivized asset
     * @param reward The reward token
     * @param newDistributionEnd New end timestamp
     */
    function setDistributionEnd(
        address asset,
        address reward,
        uint32 newDistributionEnd
    ) external;

    /**
     * @notice Set emission rate for rewards (emission manager only)
     * @param asset The incentivized asset
     * @param rewards Array of reward token addresses
     * @param newEmissionsPerSecond Array of new emission rates
     */
    function setEmissionPerSecond(
        address asset,
        address[] calldata rewards,
        uint88[] calldata newEmissionsPerSecond
    ) external;

    /**
     * @notice Get asset decimal precision
     * @param asset The asset address
     * @return Decimal places
     */
    function getAssetDecimals(address asset) external view returns (uint8);

    /**
     * @notice Get the emission manager address
     * @return Emission manager address
     */
    function getEmissionManager() external view returns (address);
}

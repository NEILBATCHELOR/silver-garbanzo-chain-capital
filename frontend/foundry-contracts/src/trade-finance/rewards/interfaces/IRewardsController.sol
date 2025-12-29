// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRewardsDistributor} from "./IRewardsDistributor.sol";
import {ITransferStrategyBase} from "./ITransferStrategyBase.sol";
import {RewardsDataTypes} from "../libraries/RewardsDataTypes.sol";

/**
 * @title IRewardsController
 * @notice Interface for the rewards controller that manages reward claiming and configuration
 * @dev Extends IRewardsDistributor with claiming and administration functions
 */
interface IRewardsController is IRewardsDistributor {
    /**
     * @notice Emitted when rewards are claimed
     * @param user The user whose rewards were claimed
     * @param reward The reward token address
     * @param to The recipient address
     * @param claimer The address that triggered the claim
     * @param amount Amount claimed
     */
    event RewardsClaimed(
        address indexed user,
        address indexed reward,
        address indexed to,
        address claimer,
        uint256 amount
    );

    /**
     * @notice Emitted when a claimer is set for a user
     * @param user The user address
     * @param claimer The authorized claimer address
     */
    event ClaimerSet(address indexed user, address indexed claimer);

    /**
     * @notice Emitted when transfer strategy is updated
     * @param reward The reward token address
     * @param transferStrategy The new transfer strategy address
     */
    event TransferStrategyInstalled(
        address indexed reward,
        address indexed transferStrategy
    );

    /**
     * @notice Emitted when reward oracle is updated
     * @param reward The reward token address
     * @param rewardOracle The new oracle address
     */
    event RewardOracleUpdated(
        address indexed reward,
        address indexed rewardOracle
    );

    /**
     * @notice Configure assets for reward distribution
     * @dev Only callable by emission manager
     * @param config Array of reward configuration inputs
     */
    function configureAssets(
        RewardsDataTypes.RewardsConfigInput[] memory config
    ) external;

    /**
     * @notice Set the transfer strategy for a reward token
     * @param reward The reward token address
     * @param transferStrategy The transfer strategy contract
     */
    function setTransferStrategy(
        address reward,
        ITransferStrategyBase transferStrategy
    ) external;

    /**
     * @notice Set the price oracle for a reward token
     * @param reward The reward token address
     * @param rewardOracle The Chainlink-compatible oracle address
     */
    function setRewardOracle(
        address reward,
        address rewardOracle
    ) external;

    /**
     * @notice Handle user balance changes
     * @dev Called by cToken/debtToken on transfers to update reward accruals
     * @param user The user whose balance changed
     * @param totalSupply New total supply
     * @param userBalance New user balance
     */
    function handleAction(
        address user,
        uint256 totalSupply,
        uint256 userBalance
    ) external;

    /**
     * @notice Claim specific reward for caller
     * @param assets Array of incentivized assets
     * @param amount Amount to claim (use type(uint256).max for all)
     * @param to Recipient address
     * @param reward The reward token to claim
     * @return Amount actually claimed
     */
    function claimRewards(
        address[] calldata assets,
        uint256 amount,
        address to,
        address reward
    ) external returns (uint256);

    /**
     * @notice Claim rewards on behalf of a user
     * @dev Only authorized claimers can call this
     * @param assets Array of incentivized assets
     * @param amount Amount to claim
     * @param user The user whose rewards to claim
     * @param to Recipient address
     * @param reward The reward token to claim
     * @return Amount actually claimed
     */
    function claimRewardsOnBehalf(
        address[] calldata assets,
        uint256 amount,
        address user,
        address to,
        address reward
    ) external returns (uint256);

    /**
     * @notice Claim rewards to self
     * @param assets Array of incentivized assets
     * @param amount Amount to claim
     * @param reward The reward token to claim
     * @return Amount actually claimed
     */
    function claimRewardsToSelf(
        address[] calldata assets,
        uint256 amount,
        address reward
    ) external returns (uint256);

    /**
     * @notice Claim all rewards for caller
     * @param assets Array of incentivized assets
     * @param to Recipient address
     * @return rewardsList Array of reward tokens
     * @return claimedAmounts Array of claimed amounts
     */
    function claimAllRewards(
        address[] calldata assets,
        address to
    ) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts);

    /**
     * @notice Claim all rewards on behalf of a user
     * @param assets Array of incentivized assets
     * @param user The user whose rewards to claim
     * @param to Recipient address
     * @return rewardsList Array of reward tokens
     * @return claimedAmounts Array of claimed amounts
     */
    function claimAllRewardsOnBehalf(
        address[] calldata assets,
        address user,
        address to
    ) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts);

    /**
     * @notice Claim all rewards to self
     * @param assets Array of incentivized assets
     * @return rewardsList Array of reward tokens
     * @return claimedAmounts Array of claimed amounts
     */
    function claimAllRewardsToSelf(
        address[] calldata assets
    ) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts);

    /**
     * @notice Set authorized claimer for a user
     * @dev Only emission manager can call this
     * @param user The user address
     * @param claimer The claimer to authorize
     */
    function setClaimer(address user, address claimer) external;

    /**
     * @notice Get the authorized claimer for a user
     * @param user The user address
     * @return The authorized claimer address
     */
    function getClaimer(address user) external view returns (address);

    /**
     * @notice Get the price oracle for a reward token
     * @param reward The reward token address
     * @return The oracle address
     */
    function getRewardOracle(address reward) external view returns (address);

    /**
     * @notice Get the transfer strategy for a reward token
     * @param reward The reward token address
     * @return The transfer strategy address
     */
    function getTransferStrategy(address reward) external view returns (address);
}

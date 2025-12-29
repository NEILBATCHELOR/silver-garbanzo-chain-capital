// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRewardsController} from "./IRewardsController.sol";
import {ITransferStrategyBase} from "./ITransferStrategyBase.sol";
import {RewardsDataTypes} from "../libraries/RewardsDataTypes.sol";

/**
 * @title IEmissionManager
 * @notice Interface for managing reward emission administration
 * @dev Handles emission admin permissions and reward configuration
 */
interface IEmissionManager {
    /**
     * @notice Emitted when emission admin is updated for a reward
     * @param reward The reward token address
     * @param oldAdmin Previous admin address
     * @param newAdmin New admin address
     */
    event EmissionAdminUpdated(
        address indexed reward,
        address indexed oldAdmin,
        address indexed newAdmin
    );

    /**
     * @notice Configure asset rewards
     * @dev Only emission admin for each reward can call
     * @param config Array of reward configurations
     */
    function configureAssets(
        RewardsDataTypes.RewardsConfigInput[] memory config
    ) external;

    /**
     * @notice Set transfer strategy for a reward
     * @param reward The reward token
     * @param transferStrategy The transfer strategy contract
     */
    function setTransferStrategy(
        address reward,
        ITransferStrategyBase transferStrategy
    ) external;

    /**
     * @notice Set price oracle for a reward
     * @param reward The reward token
     * @param rewardOracle The oracle address
     */
    function setRewardOracle(
        address reward,
        address rewardOracle
    ) external;

    /**
     * @notice Set distribution end for an asset-reward pair
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
     * @notice Set emission rate for rewards
     * @param asset The incentivized asset
     * @param rewards Array of reward tokens
     * @param newEmissionsPerSecond Array of new emission rates
     */
    function setEmissionPerSecond(
        address asset,
        address[] calldata rewards,
        uint88[] calldata newEmissionsPerSecond
    ) external;

    /**
     * @notice Set claimer for a user
     * @dev Only owner can call
     * @param user The user address
     * @param claimer The claimer to authorize
     */
    function setClaimer(address user, address claimer) external;

    /**
     * @notice Set emission admin for a reward token
     * @dev Only owner can call
     * @param reward The reward token
     * @param admin The new admin address
     */
    function setEmissionAdmin(address reward, address admin) external;

    /**
     * @notice Set the rewards controller
     * @dev Only owner can call
     * @param controller The rewards controller address
     */
    function setRewardsController(address controller) external;

    /**
     * @notice Get the rewards controller
     * @return The rewards controller contract
     */
    function getRewardsController() external view returns (IRewardsController);

    /**
     * @notice Get the emission admin for a reward
     * @param reward The reward token
     * @return The admin address
     */
    function getEmissionAdmin(address reward) external view returns (address);
}

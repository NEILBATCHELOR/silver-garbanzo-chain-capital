// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITransferStrategyBase
 * @notice Interface for reward transfer strategy contracts
 * @dev Abstracts the transfer logic for different reward distribution mechanisms
 */
interface ITransferStrategyBase {
    /// @notice Thrown when caller is not the authorized incentives controller
    error CallerNotIncentivesController();
    
    /// @notice Thrown when caller is not the rewards admin
    error OnlyRewardsAdmin();

    /**
     * @notice Emitted when emergency withdrawal is executed
     * @param caller Address that triggered the withdrawal
     * @param token Token being withdrawn
     * @param to Recipient address
     * @param amount Amount withdrawn
     */
    event EmergencyWithdrawal(
        address indexed caller,
        address indexed token,
        address indexed to,
        uint256 amount
    );

    /**
     * @notice Execute the reward transfer to user
     * @dev Called via delegatecall from RewardsController
     * @param to Account receiving the rewards
     * @param reward Address of the reward token
     * @param amount Amount to transfer
     * @return True if transfer succeeds
     */
    function performTransfer(
        address to,
        address reward,
        uint256 amount
    ) external returns (bool);

    /**
     * @notice Returns the incentives controller address
     * @return Address of the IncentivesController
     */
    function getIncentivesController() external view returns (address);

    /**
     * @notice Returns the rewards admin address
     * @return Address of the rewards admin
     */
    function getRewardsAdmin() external view returns (address);

    /**
     * @notice Emergency withdrawal function for stuck tokens
     * @dev Only callable by rewards admin
     * @param token Address of token to withdraw
     * @param to Recipient of withdrawn tokens
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawal(
        address token,
        address to,
        uint256 amount
    ) external;
}

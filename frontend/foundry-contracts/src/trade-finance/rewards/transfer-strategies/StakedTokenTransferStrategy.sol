// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ITransferStrategyBase} from "../interfaces/ITransferStrategyBase.sol";

/**
 * @title IStakedToken
 * @notice Interface for staked token contracts
 */
interface IStakedToken {
    function stake(address to, uint256 amount) external;
    function claimRewards(address to, uint256 amount) external;
    function getTotalRewardsBalance(address user) external view returns (uint256);
}

/**
 * @title StakedTokenTransferStrategy
 * @notice Transfer strategy that stakes rewards on behalf of users
 * @dev Used for reward tokens that should be auto-staked for compounding
 */
contract StakedTokenTransferStrategy is ITransferStrategyBase {
    using SafeERC20 for IERC20;

    // ============ Immutables ============

    /// @notice The incentives controller allowed to trigger transfers
    address public immutable INCENTIVES_CONTROLLER;
    
    /// @notice The rewards admin
    address public immutable REWARDS_ADMIN;
    
    /// @notice The underlying reward token
    address public immutable UNDERLYING;
    
    /// @notice The staked token contract
    IStakedToken public immutable STAKED_TOKEN;

    // ============ Constructor ============

    /**
     * @notice Constructor
     * @param incentivesController Address of the incentives controller
     * @param rewardsAdmin Address of the rewards admin
     * @param stakedToken Address of the staked token contract
     * @param underlying Address of the underlying reward token
     */
    constructor(
        address incentivesController,
        address rewardsAdmin,
        address stakedToken,
        address underlying
    ) {
        INCENTIVES_CONTROLLER = incentivesController;
        REWARDS_ADMIN = rewardsAdmin;
        STAKED_TOKEN = IStakedToken(stakedToken);
        UNDERLYING = underlying;
    }

    // ============ View Functions ============

    /// @inheritdoc ITransferStrategyBase
    function getIncentivesController() external view override returns (address) {
        return INCENTIVES_CONTROLLER;
    }

    /// @inheritdoc ITransferStrategyBase
    function getRewardsAdmin() external view override returns (address) {
        return REWARDS_ADMIN;
    }

    /**
     * @notice Get the staked token contract
     * @return The staked token address
     */
    function getStakedToken() external view returns (address) {
        return address(STAKED_TOKEN);
    }

    /**
     * @notice Get the underlying token
     * @return The underlying token address
     */
    function getUnderlying() external view returns (address) {
        return UNDERLYING;
    }

    // ============ External Functions ============

    /// @inheritdoc ITransferStrategyBase
    function performTransfer(
        address to,
        address reward,
        uint256 amount
    ) external override returns (bool) {
        if (msg.sender != INCENTIVES_CONTROLLER) {
            revert CallerNotIncentivesController();
        }

        // Approve staked token to pull underlying
        IERC20(reward).forceApprove(address(STAKED_TOKEN), amount);
        
        // Stake on behalf of user
        STAKED_TOKEN.stake(to, amount);
        
        return true;
    }

    /**
     * @notice Withdraw staked tokens and send to user
     * @dev For users who want to exit staking
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function dropStakedRewards(address to, uint256 amount) external {
        if (msg.sender != INCENTIVES_CONTROLLER) {
            revert CallerNotIncentivesController();
        }
        
        STAKED_TOKEN.claimRewards(to, amount);
    }

    /// @inheritdoc ITransferStrategyBase
    function emergencyWithdrawal(
        address token,
        address to,
        uint256 amount
    ) external override {
        if (msg.sender != REWARDS_ADMIN) {
            revert OnlyRewardsAdmin();
        }

        IERC20(token).safeTransfer(to, amount);
        emit EmergencyWithdrawal(msg.sender, token, to, amount);
    }
}

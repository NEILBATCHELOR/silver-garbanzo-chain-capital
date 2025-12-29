// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ITransferStrategyBase} from "../interfaces/ITransferStrategyBase.sol";

/**
 * @title PullRewardsTransferStrategy
 * @notice Transfer strategy that pulls rewards from a vault/treasury
 * @dev Rewards are pulled from a pre-funded vault with appropriate approvals
 * Used for standard ERC20 reward distributions
 */
contract PullRewardsTransferStrategy is ITransferStrategyBase {
    using SafeERC20 for IERC20;

    // ============ Immutables ============

    /// @notice The incentives controller allowed to trigger transfers
    address public immutable INCENTIVES_CONTROLLER;
    
    /// @notice The rewards admin (can perform emergency withdrawals)
    address public immutable REWARDS_ADMIN;
    
    /// @notice The rewards vault from which tokens are pulled
    address public immutable REWARDS_VAULT;

    // ============ Constructor ============

    /**
     * @notice Constructor
     * @param incentivesController Address of the incentives controller
     * @param rewardsAdmin Address of the rewards admin
     * @param rewardsVault Address of the vault holding rewards
     */
    constructor(
        address incentivesController,
        address rewardsAdmin,
        address rewardsVault
    ) {
        INCENTIVES_CONTROLLER = incentivesController;
        REWARDS_ADMIN = rewardsAdmin;
        REWARDS_VAULT = rewardsVault;
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
     * @notice Get the rewards vault address
     * @return The vault address
     */
    function getRewardsVault() external view returns (address) {
        return REWARDS_VAULT;
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

        IERC20(reward).safeTransferFrom(REWARDS_VAULT, to, amount);
        return true;
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

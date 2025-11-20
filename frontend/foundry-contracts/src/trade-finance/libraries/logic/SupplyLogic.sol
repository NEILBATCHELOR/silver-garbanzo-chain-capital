// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICommodityToken} from "../../interfaces/ICommodityToken.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {Errors} from "../helpers/Errors.sol";
import {WadRayMath} from "../math/WadRayMath.sol";
import {ReserveLogic} from "./ReserveLogic.sol";
import {ValidationLogic} from "./ValidationLogic.sol";

/**
 * @title SupplyLogic library
 * @author Chain Capital
 * @notice Implements supply/withdraw logic for commodities
 * @dev Handles commodity deposits and withdrawals with cToken minting/burning
 */
library SupplyLogic {
    using WadRayMath for uint256;
    using SafeERC20 for IERC20;
    using ReserveLogic for DataTypes.CommodityReserveData;

    /**
     * @dev Emitted on supply
     * @param commodityToken The address of the commodity token
     * @param user The address initiating the supply
     * @param onBehalfOf The beneficiary of the supply
     * @param amount The amount supplied
     * @param referralCode The referral code used
     */
    event CommoditySupplied(
        address indexed commodityToken,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        uint16 indexed referralCode
    );

    /**
     * @dev Emitted on withdraw
     * @param commodityToken The address of the commodity token
     * @param user The address initiating the withdrawal
     * @param to The address receiving the underlying
     * @param amount The amount withdrawn
     */
    event CommodityWithdrawn(
        address indexed commodityToken,
        address indexed user,
        address indexed to,
        uint256 amount
    );

    struct ExecuteSupplyParams {
        address commodityToken;
        address user;
        address onBehalfOf;
        uint256 amount;
        uint16 referralCode;
    }

    struct ExecuteWithdrawParams {
        address commodityToken;
        address user;
        address to;
        uint256 amount;
    }

    /**
     * @notice Executes commodity supply to the pool
     * @dev Transfers commodity token from user, mints cTokens, updates reserves
     * @param reserve The commodity reserve data
     * @param params The supply execution parameters
     * @return The scaled amount supplied (normalized by liquidity index)
     */
    function executeSupply(
        DataTypes.CommodityReserveData storage reserve,
        ExecuteSupplyParams memory params
    ) external returns (uint256) {
        // Update reserve state
        reserve.updateState();

        // Validate supply
        ValidationLogic.validateSupply(
            reserve.configuration,
            params.amount
        );

        // Update interest rates
        reserve.updateInterestRates(
            params.commodityToken,
            reserve.cTokenAddress,
            params.amount,
            0
        );

        // Transfer commodity token from user to pool
        IERC20(params.commodityToken).safeTransferFrom(
            params.user,
            address(this),
            params.amount
        );

        // Calculate scaled amount (normalized by liquidity index)
        bool isFirstSupply = reserve.cTokenAddress == address(0) ||
                            ICommodityToken(reserve.cTokenAddress).totalSupply() == 0;

        uint256 amountScaled = params.amount;
        
        if (!isFirstSupply) {
            amountScaled = params.amount.rayDiv(reserve.liquidityIndex);
        }

        // Mint cTokens (receipt tokens) to beneficiary
        require(reserve.cTokenAddress != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        
        ICommodityToken(reserve.cTokenAddress).mint(
            params.user,
            params.onBehalfOf,
            amountScaled,
            reserve.liquidityIndex
        );

        emit CommoditySupplied(
            params.commodityToken,
            params.user,
            params.onBehalfOf,
            params.amount,
            params.referralCode
        );

        return amountScaled;
    }

    /**
     * @notice Executes commodity withdrawal from the pool
     * @dev Burns cTokens, transfers commodity token to user, updates reserves
     * @param reserve The commodity reserve data
     * @param params The withdraw execution parameters
     * @return The actual amount withdrawn
     */
    function executeWithdraw(
        DataTypes.CommodityReserveData storage reserve,
        ExecuteWithdrawParams memory params
    ) external returns (uint256) {
        // Update reserve state
        reserve.updateState();

        // Get user's cToken balance
        uint256 userBalance = ICommodityToken(reserve.cTokenAddress).scaledBalanceOf(params.user);
        
        // If amount is type(uint256).max, withdraw all
        uint256 amountToWithdraw = params.amount;
        if (params.amount == type(uint256).max) {
            amountToWithdraw = userBalance.rayMul(reserve.liquidityIndex);
        }

        // Validate withdrawal
        ValidationLogic.validateWithdraw(
            reserve,
            amountToWithdraw,
            userBalance
        );

        // Update interest rates
        reserve.updateInterestRates(
            params.commodityToken,
            reserve.cTokenAddress,
            0,
            amountToWithdraw
        );

        // Calculate scaled amount to burn
        uint256 amountScaledToBurn = amountToWithdraw.rayDiv(reserve.liquidityIndex);
        
        // Ensure we don't burn more than user has
        if (amountScaledToBurn == userBalance) {
            amountToWithdraw = ICommodityToken(reserve.cTokenAddress).balanceOf(params.user);
        }

        // Burn cTokens from user
        ICommodityToken(reserve.cTokenAddress).burn(
            params.user,
            params.to,
            amountToWithdraw,
            reserve.liquidityIndex
        );

        // Transfer commodity token to recipient
        IERC20(params.commodityToken).safeTransfer(params.to, amountToWithdraw);

        emit CommodityWithdrawn(
            params.commodityToken,
            params.user,
            params.to,
            amountToWithdraw
        );

        return amountToWithdraw;
    }

    /**
     * @notice Finalizes transfer of cTokens between users
     * @dev Called after cToken transfer to update user configurations
     * @param reserve The commodity reserve data
     * @param from The source address
     * @param to The destination address
     * @param amount The amount transferred (scaled)
     * @param fromBalanceBefore The balance before transfer
     * @param toBalanceBefore The balance before transfer
     */
    function executeFinalizeTransfer(
        DataTypes.CommodityReserveData storage reserve,
        address from,
        address to,
        uint256 amount,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore
    ) external {
        // Update reserve state
        reserve.updateState();

        // Validate that transfers are allowed (commodity not paused)
        ValidationLogic.validateTransfer(reserve);

        // Update user configurations based on new balances
        uint256 fromBalanceAfter = fromBalanceBefore - amount;
        uint256 toBalanceAfter = toBalanceBefore + amount;

        // If sender's balance is now 0, they may need to update their collateral flags
        if (fromBalanceAfter == 0) {
            // This will be handled by the pool contract calling user configuration updates
            // No direct action needed here
        }

        // If receiver's balance was 0, they may need to enable this as collateral
        if (toBalanceBefore == 0 && toBalanceAfter > 0) {
            // This will be handled by the pool contract
            // No direct action needed here
        }
    }
}

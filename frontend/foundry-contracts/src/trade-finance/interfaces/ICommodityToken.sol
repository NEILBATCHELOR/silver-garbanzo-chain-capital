// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICommodityToken
 * @author Chain Capital
 * @notice Interface for commodity receipt tokens (cTokens)
 * @dev Extends ERC20 with specialized mint/burn functionality
 */
interface ICommodityToken is IERC20 {
    
    /**
     * @dev Emitted on mint
     * @param caller The caller of the function
     * @param onBehalfOf The address receiving the minted tokens
     * @param value The scaled amount being minted
     * @param balanceIncrease The increase in balance
     * @param index The liquidity index
     */
    event Mint(
        address indexed caller,
        address indexed onBehalfOf,
        uint256 value,
        uint256 balanceIncrease,
        uint256 index
    );

    /**
     * @dev Emitted on burn
     * @param from The address from which tokens are burned
     * @param target The address receiving the underlying
     * @param value The scaled amount being burned
     * @param balanceIncrease The increase in balance
     * @param index The liquidity index
     */
    event Burn(
        address indexed from,
        address indexed target,
        uint256 value,
        uint256 balanceIncrease,
        uint256 index
    );

    /**
     * @notice Mints cTokens to user
     * @param caller The caller of the mint function
     * @param onBehalfOf The address receiving the minted tokens
     * @param amount The amount being minted (scaled)
     * @param index The liquidity index
     * @return True if the scaled amount is zero
     */
    function mint(
        address caller,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external returns (bool);

    /**
     * @notice Burns cTokens from user and transfers underlying
     * @param from The address from which tokens are burned
     * @param receiverOfUnderlying The address receiving the underlying
     * @param amount The amount being burned
     * @param index The liquidity index
     */
    function burn(
        address from,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) external;

    /**
     * @notice Transfers cTokens on liquidation
     * @param from The address being liquidated
     * @param to The liquidator address
     * @param value The amount to transfer
     */
    function transferOnLiquidation(
        address from,
        address to,
        uint256 value
    ) external;

    /**
     * @notice Returns the scaled balance of user
     * @param user The address of the user
     * @return The scaled balance
     */
    function scaledBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Returns the scaled total supply
     * @return The scaled total supply
     */
    function scaledTotalSupply() external view returns (uint256);

    /**
     * @notice Returns the underlying commodity token address
     * @return The commodity token address
     */
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);

    /**
     * @notice Returns the pool address
     * @return The pool address
     */
    function POOL() external view returns (address);

    /**
     * @notice Transfers underlying to treasury
     * @param target The treasury address
     * @param amount The amount to transfer
     */
    function transferUnderlyingTo(address target, uint256 amount) external;

    /**
     * @notice Handles the underlying received by the cToken after repayment transfer
     * @dev Default implementation is empty. Can be extended for custom logic like
     * staking the underlying to earn additional yield
     * @param user The user executing the repayment
     * @param onBehalfOf The address whose debt is being reduced
     * @param amount The amount being repaid
     */
    function handleRepayment(
        address user,
        address onBehalfOf,
        uint256 amount
    ) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IDebtToken
 * @author Chain Capital
 * @notice Interface for debt tokens (dTokens)
 * @dev Represents borrowed amounts with auto-accruing interest
 */
interface IDebtToken is IERC20 {
    
    /**
     * @dev Emitted on mint (when borrowing)
     * @param caller The caller of the function
     * @param onBehalfOf The address receiving the debt
     * @param value The scaled amount being minted
     * @param balanceIncrease The increase in balance
     * @param index The borrow index
     */
    event Mint(
        address indexed caller,
        address indexed onBehalfOf,
        uint256 value,
        uint256 balanceIncrease,
        uint256 index
    );

    /**
     * @dev Emitted on burn (when repaying)
     * @param from The address from which debt is burned
     * @param value The scaled amount being burned
     * @param balanceIncrease The increase in balance
     * @param index The borrow index
     */
    event Burn(
        address indexed from,
        uint256 value,
        uint256 balanceIncrease,
        uint256 index
    );

    /**
     * @notice Mints debt tokens to user (on borrow)
     * @param caller The caller of the mint function
     * @param onBehalfOf The address receiving the debt
     * @param amount The amount being borrowed
     * @param index The variable borrow index (for variable debt)
     * @return True if the scaled amount is zero, total supply otherwise
     */
    function mint(
        address caller,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external returns (bool, uint256);

    /**
     * @notice Burns debt tokens from user (on repay)
     * @param from The address from which debt is burned
     * @param amount The amount being repaid
     * @param index The variable borrow index (for variable debt)
     * @return The total supply after burn
     */
    function burn(
        address from,
        uint256 amount,
        uint256 index
    ) external returns (uint256);

    /**
     * @notice Burns debt tokens (stable debt version)
     * @param from The address from which debt is burned
     * @param amount The amount being repaid
     * @return The total supply after burn
     */
    function burn(address from, uint256 amount) external returns (uint256);

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
     * @notice Returns the principal debt balance of user
     * @param user The address of the user
     * @return The principal balance
     */
    function principalBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Returns the underlying asset address
     * @return The asset address
     */
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);

    /**
     * @notice Returns the pool address
     * @return The pool address
     */
    function POOL() external view returns (address);

    /**
     * @notice Returns the average stable rate across all users
     * @return The average stable rate
     */
    function getAverageStableRate() external view returns (uint256);

    /**
     * @notice Returns user's stable rate
     * @param user The address of the user
     * @return The user's stable rate
     */
    function getUserStableRate(address user) external view returns (uint256);

    /**
     * @notice Returns user's last update timestamp
     * @param user The address of the user
     * @return The last update timestamp
     */
    function getUserLastUpdated(address user) external view returns (uint40);

    /**
     * @notice Returns the total supply and average rate
     * @return The total supply
     * @return The average rate
     * @return The last update timestamp
     */
    function getSupplyData() external view returns (uint256, uint256, uint40);

    /**
     * @notice Returns the total supply
     * @return The total supply
     */
    function getTotalSupplyAndAvgRate() external view returns (uint256, uint256);

    /**
     * @notice Returns the total supply timestamp
     * @return The last update timestamp
     */
    function getTotalSupplyLastUpdated() external view returns (uint40);

    /**
     * @notice Returns the principal, total supply, and average rate
     * @param user The address of the user
     * @return The principal balance
     * @return The total supply
     * @return The average stable rate
     * @return The last update timestamp
     */
    function getUserData(address user) 
        external 
        view 
        returns (uint256, uint256, uint256, uint40);
}

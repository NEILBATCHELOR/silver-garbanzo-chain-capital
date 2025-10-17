// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";

/**
 * @title IERC20FlashMintModule
 * @notice Interface for flash minting functionality (EIP-3156)
 * @dev Enables temporary token minting for arbitrage and collateral swaps
 * 
 * Use Cases:
 * - DeFi arbitrage
 * - Liquidation protection
 * - Collateral swaps
 * - Debt refinancing
 */
interface IERC20FlashMintModule {
    // ============ Events ============
    event FlashLoan(
        address indexed borrower,
        address indexed receiver,
        uint256 amount,
        uint256 fee
    );
    event FlashFeeUpdated(uint256 newFee);
    event MaxFlashLoanUpdated(uint256 newMax);
    
    // ============ Errors ============
    error FlashLoanFailed();
    error InvalidFlashBorrower();
    error FlashLoanExceedsMax();
    error UnsupportedToken();
    
    // ============ EIP-3156 Functions ============
    
    /**
     * @notice Maximum amount available for flash loan
     * @param token Token address
     * @return uint256 Maximum flashable amount
     */
    function maxFlashLoan(address token) external view returns (uint256);
    
    /**
     * @notice Fee for flash loan
     * @param token Token address
     * @param amount Loan amount
     * @return uint256 Fee amount
     */
    function flashFee(address token, uint256 amount) external view returns (uint256);
    
    /**
     * @notice Execute flash loan
     * @param receiver Flash loan receiver (implements IERC3156FlashBorrower)
     * @param token Token to borrow
     * @param amount Amount to borrow
     * @param data Additional data passed to receiver
     * @return bool Success status
     */
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set flash loan fee (basis points)
     * @param feeBasisPoints Fee in basis points (100 = 1%)
     */
    function setFlashFee(uint256 feeBasisPoints) external;
    
    /**
     * @notice Set maximum flash loan amount
     * @param maxAmount Maximum amount (0 = unlimited)
     */
    function setMaxFlashLoan(uint256 maxAmount) external;
    
    /**
     * @notice Get current flash loan fee in basis points
     * @return uint256 Fee basis points
     */
    function getFlashFeeBasisPoints() external view returns (uint256);
}

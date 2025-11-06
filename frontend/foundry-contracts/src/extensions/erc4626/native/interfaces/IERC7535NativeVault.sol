// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC7535NativeVault
 * @notice Interface for ERC-7535 Native ETH Vault extension
 * @dev Extends ERC-4626 to accept native ETH deposits without wrapping
 * 
 * Key Benefits:
 * - No WETH wrapping required (saves ~40,000 gas)
 * - Better UX (users don't need WETH)
 * - No approval needed for ETH
 * 
 * Standard Flow:
 * 1. User sends ETH → Module wraps to WETH internally
 * 2. Module deposits WETH into vault
 * 3. User receives vault shares
 * 
 * Withdrawal:
 * 1. User burns shares
 * 2. Module withdraws WETH from vault
 * 3. Module unwraps WETH → sends ETH to user
 */
interface IERC7535NativeVault {
    // ============ Events ============
    
    event NativeDeposit(
        address indexed caller,
        address indexed receiver,
        uint256 ethAmount,
        uint256 shares
    );
    
    event NativeMint(
        address indexed caller,
        address indexed receiver,
        uint256 shares,
        uint256 ethAmount
    );
    
    event NativeWithdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 ethAmount,
        uint256 shares
    );
    
    event NativeRedeem(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 shares,
        uint256 ethAmount
    );
    
    // ============ Errors ============
    
    error InsufficientEthSent();
    error ExcessEthSent();
    error EthTransferFailed();
    error NotNativeVault();
    error NativeTokenNotAccepted();
    error UnwrapNotEnabled();
    
    // ============ Native ETH Functions ============
    
    /**
     * @notice Deposit native ETH and receive vault shares
     * @dev Wraps ETH → WETH internally, then deposits into vault
     * @param receiver Address to receive shares
     * @return shares Amount of shares minted
     */
    function depositNative(address receiver) external payable returns (uint256 shares);
    
    /**
     * @notice Mint exact shares by depositing ETH
     * @dev Calculates required ETH amount
     * @param shares Exact amount of shares to mint
     * @param receiver Address to receive shares
     * @return ethAmount Amount of ETH consumed
     */
    function mintNative(uint256 shares, address receiver) external payable returns (uint256 ethAmount);
    
    /**
     * @notice Withdraw native ETH by burning shares
     * @dev Withdraws WETH from vault → unwraps to ETH
     * @param ethAmount Amount of ETH to withdraw
     * @param receiver Address to receive ETH
     * @param owner Address that owns the shares
     * @return shares Amount of shares burned
     */
    function withdrawNative(
        uint256 ethAmount,
        address receiver,
        address owner
    ) external returns (uint256 shares);
    
    /**
     * @notice Redeem shares for native ETH
     * @dev Burns shares → withdraws WETH → unwraps to ETH
     * @param shares Amount of shares to burn
     * @param receiver Address to receive ETH
     * @param owner Address that owns the shares
     * @return ethAmount Amount of ETH received
     */
    function redeemNative(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 ethAmount);
    
    // ============ View Functions ============
    
    /**
     * @notice Get the underlying asset address
     * @dev Returns NATIVE_ETH marker (0xEeee...EEeE)
     */
    function asset() external view returns (address);
    
    /**
     * @notice Check if this is a native ETH vault
     * @dev Returns true if asset() == NATIVE_ETH
     */
    function isNativeVault() external view returns (bool);
    
    /**
     * @notice Get the WETH contract address
     */
    function weth() external view returns (address);
    
    /**
     * @notice Preview ETH deposit (same as previewDeposit but for ETH)
     * @param ethAmount Amount of ETH to deposit
     * @return shares Shares that would be minted
     */
    function previewDepositNative(uint256 ethAmount) external view returns (uint256 shares);
    
    /**
     * @notice Preview share minting (same as previewMint but returns ETH)
     * @param shares Amount of shares to mint
     * @return ethAmount ETH required
     */
    function previewMintNative(uint256 shares) external view returns (uint256 ethAmount);
    
    /**
     * @notice Preview ETH withdrawal (same as previewWithdraw but for ETH)
     * @param ethAmount Amount of ETH to withdraw
     * @return shares Shares that would be burned
     */
    function previewWithdrawNative(uint256 ethAmount) external view returns (uint256 shares);
    
    /**
     * @notice Preview share redemption (same as previewRedeem but returns ETH)
     * @param shares Amount of shares to redeem
     * @return ethAmount ETH that would be received
     */
    function previewRedeemNative(uint256 shares) external view returns (uint256 ethAmount);
    
    /**
     * @notice Get maximum native ETH deposit allowed
     * @return maxEth Maximum ETH that can be deposited
     */
    function maxDepositNative() external view returns (uint256 maxEth);
    
    /**
     * @notice Get maximum shares that can be minted with native ETH
     * @return maxShares Maximum shares mintable
     */
    function maxMintNative() external view returns (uint256 maxShares);
    
    /**
     * @notice Get maximum native ETH withdrawal allowed
     * @param owner Address that owns the shares
     * @return maxEth Maximum ETH withdrawable
     */
    function maxWithdrawNative(address owner) external view returns (uint256 maxEth);
    
    /**
     * @notice Get maximum shares redeemable for native ETH
     * @param owner Address that owns the shares
     * @return maxShares Maximum shares redeemable
     */
    function maxRedeemNative(address owner) external view returns (uint256 maxShares);
}

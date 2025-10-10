// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC4626Router
 * @notice Interface for ERC-4626 vault router with batch operations
 * @dev Enables efficient multi-vault interactions in a single transaction
 */
interface IERC4626Router {
    // ============ Structs ============
    
    /**
     * @notice Deposit parameters for batch operations
     * @param vault Address of the ERC-4626 vault
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive vault shares
     */
    struct DepositParams {
        address vault;
        uint256 assets;
        address receiver;
    }
    
    /**
     * @notice Withdraw parameters for batch operations
     * @param vault Address of the ERC-4626 vault
     * @param assets Amount of assets to withdraw
     * @param receiver Address to receive withdrawn assets
     * @param owner Address of shares owner
     */
    struct WithdrawParams {
        address vault;
        uint256 assets;
        address receiver;
        address owner;
    }
    
    /**
     * @notice Redeem parameters for batch operations
     * @param vault Address of the ERC-4626 vault
     * @param shares Amount of shares to redeem
     * @param receiver Address to receive redeemed assets
     * @param owner Address of shares owner
     */
    struct RedeemParams {
        address vault;
        uint256 shares;
        address receiver;
        address owner;
    }
    
    // ============ Events ============
    
    event BatchDeposit(address indexed caller, DepositParams[] deposits);
    event BatchWithdraw(address indexed caller, WithdrawParams[] withdrawals);
    event BatchRedeem(address indexed caller, RedeemParams[] redemptions);
    event VaultRegistered(address indexed vault, address indexed asset);
    event VaultDeregistered(address indexed vault);
    
    // ============ Errors ============
    
    error InvalidVault(address vault);
    error VaultAlreadyRegistered(address vault);
    error VaultNotRegistered(address vault);
    error EmptyBatch();
    error DepositFailed(address vault, uint256 assets);
    error WithdrawFailed(address vault, uint256 assets);
    error RedeemFailed(address vault, uint256 shares);
    error InsufficientBalance(address token, uint256 required, uint256 available);
    
    // ============ Single Vault Operations ============
    
    /**
     * @notice Deposit assets into a vault
     * @param vault The vault to deposit into
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive vault shares
     * @return shares Amount of shares minted
     */
    function deposit(
        address vault,
        uint256 assets,
        address receiver
    ) external returns (uint256 shares);
    
    /**
     * @notice Withdraw assets from a vault
     * @param vault The vault to withdraw from
     * @param assets Amount of assets to withdraw
     * @param receiver Address to receive withdrawn assets
     * @param owner Address of shares owner
     * @return shares Amount of shares burned
     */
    function withdraw(
        address vault,
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares);
    
    /**
     * @notice Redeem shares from a vault
     * @param vault The vault to redeem from
     * @param shares Amount of shares to redeem
     * @param receiver Address to receive redeemed assets
     * @param owner Address of shares owner
     * @return assets Amount of assets received
     */
    function redeem(
        address vault,
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets);
    
    // ============ Batch Operations ============
    
    /**
     * @notice Batch deposit into multiple vaults
     * @param deposits Array of deposit parameters
     * @return shares Array of shares minted per vault
     */
    function batchDeposit(
        DepositParams[] calldata deposits
    ) external returns (uint256[] memory shares);
    
    /**
     * @notice Batch withdraw from multiple vaults
     * @param withdrawals Array of withdrawal parameters
     * @return shares Array of shares burned per vault
     */
    function batchWithdraw(
        WithdrawParams[] calldata withdrawals
    ) external returns (uint256[] memory shares);
    
    /**
     * @notice Batch redeem from multiple vaults
     * @param redemptions Array of redemption parameters
     * @return assets Array of assets received per vault
     */
    function batchRedeem(
        RedeemParams[] calldata redemptions
    ) external returns (uint256[] memory assets);
    
    // ============ Vault Management ============
    
    /**
     * @notice Register a vault for routing
     * @param vault Address of the vault to register
     */
    function registerVault(address vault) external;
    
    /**
     * @notice Deregister a vault from routing
     * @param vault Address of the vault to deregister
     */
    function deregisterVault(address vault) external;
    
    /**
     * @notice Check if a vault is registered
     * @param vault Address of the vault to check
     * @return registered True if vault is registered
     */
    function isVaultRegistered(address vault) external view returns (bool registered);
    
    /**
     * @notice Get all registered vaults
     * @return vaults Array of registered vault addresses
     */
    function getRegisteredVaults() external view returns (address[] memory vaults);
    
    // ============ Preview Functions ============
    
    /**
     * @notice Preview shares for batch deposits
     * @param deposits Array of deposit parameters
     * @return shares Array of shares that would be minted
     */
    function previewBatchDeposit(
        DepositParams[] calldata deposits
    ) external view returns (uint256[] memory shares);
    
    /**
     * @notice Preview shares for batch withdrawals
     * @param withdrawals Array of withdrawal parameters
     * @return shares Array of shares that would be burned
     */
    function previewBatchWithdraw(
        WithdrawParams[] calldata withdrawals
    ) external view returns (uint256[] memory shares);
    
    /**
     * @notice Preview assets for batch redemptions
     * @param redemptions Array of redemption parameters
     * @return assets Array of assets that would be received
     */
    function previewBatchRedeem(
        RedeemParams[] calldata redemptions
    ) external view returns (uint256[] memory assets);
}

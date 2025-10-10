// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IERC7575
 * @notice Interface for the ERC-7575 Multi-Asset Vault Extension
 * @dev Extends ERC-4626 to support multiple underlying assets
 * 
 * This interface allows vaults to hold a basket of assets rather than
 * a single asset, enabling:
 * - Diversified portfolios
 * - Multi-asset yield strategies  
 * - Index fund-like products
 * - Risk-balanced asset allocation
 */
interface IERC7575 {
    /**
     * @notice Emitted when a new asset is added to the vault
     * @param asset Address of the added asset
     * @param weight Initial weight of the asset (basis points)
     */
    event AssetAdded(address indexed asset, uint256 weight);

    /**
     * @notice Emitted when an asset is removed from the vault
     * @param asset Address of the removed asset
     */
    event AssetRemoved(address indexed asset);

    /**
     * @notice Emitted when asset weights are rebalanced
     * @param assets Array of asset addresses
     * @param newWeights Array of new weights (basis points, sum = 10000)
     */
    event AssetsRebalanced(address[] assets, uint256[] newWeights);

    /**
     * @notice Emitted when a multi-asset deposit occurs
     * @param depositor Address making the deposit
     * @param assets Array of asset addresses deposited
     * @param amounts Array of amounts deposited per asset
     * @param shares Vault shares minted
     */
    event MultiAssetDeposit(
        address indexed depositor,
        address[] assets,
        uint256[] amounts,
        uint256 shares
    );

    /**
     * @notice Emitted when a multi-asset withdrawal occurs
     * @param withdrawer Address making the withdrawal
     * @param assets Array of asset addresses withdrawn
     * @param amounts Array of amounts withdrawn per asset
     * @param shares Vault shares burned
     */
    event MultiAssetWithdrawal(
        address indexed withdrawer,
        address[] assets,
        uint256[] amounts,
        uint256 shares
    );

    /**
     * @notice Get all assets in the vault
     * @return assets Array of asset addresses
     */
    function getAssets() external view returns (address[] memory assets);

    /**
     * @notice Get weight of specific asset
     * @param asset Address of the asset
     * @return weight Asset weight in basis points (10000 = 100%)
     */
    function getAssetWeight(address asset) external view returns (uint256 weight);

    /**
     * @notice Get balance of specific asset in vault
     * @param asset Address of the asset
     * @return balance Current balance of the asset
     */
    function getAssetBalance(address asset) external view returns (uint256 balance);

    /**
     * @notice Calculate total vault value in base denomination
     * @dev Uses oracle prices to value all assets
     * @return totalValue Total value of all assets
     */
    function getTotalValue() external view returns (uint256 totalValue);

    /**
     * @notice Deposit multiple assets proportionally
     * @param assets Array of asset addresses to deposit
     * @param amounts Array of amounts to deposit per asset
     * @param receiver Address to receive vault shares
     * @return shares Amount of shares minted
     */
    function depositMulti(
        address[] calldata assets,
        uint256[] calldata amounts,
        address receiver
    ) external returns (uint256 shares);

    /**
     * @notice Withdraw multiple assets proportionally
     * @param shares Amount of vault shares to redeem
     * @param receiver Address to receive the assets
     * @param owner Address whose shares to redeem
     * @return assets Array of asset addresses withdrawn
     * @return amounts Array of amounts withdrawn per asset
     */
    function withdrawMulti(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (address[] memory assets, uint256[] memory amounts);

    /**
     * @notice Add new asset to the vault portfolio
     * @param asset Address of the asset to add
     * @param targetWeight Target weight in basis points
     */
    function addAsset(address asset, uint256 targetWeight) external;

    /**
     * @notice Remove asset from the vault portfolio
     * @param asset Address of the asset to remove
     * @dev Asset balance must be zero before removal
     */
    function removeAsset(address asset) external;

    /**
     * @notice Rebalance asset allocations to target weights
     * @dev Swaps assets to match target weights
     */
    function rebalance() external;

    /**
     * @notice Preview multi-asset deposit
     * @param assets Array of asset addresses
     * @param amounts Array of amounts to deposit
     * @return shares Expected shares to be minted
     */
    function previewDepositMulti(
        address[] calldata assets,
        uint256[] calldata amounts
    ) external view returns (uint256 shares);

    /**
     * @notice Preview multi-asset withdrawal
     * @param shares Amount of shares to redeem
     * @return assets Array of asset addresses
     * @return amounts Expected amounts to receive per asset
     */
    function previewWithdrawMulti(
        uint256 shares
    ) external view returns (address[] memory assets, uint256[] memory amounts);
}

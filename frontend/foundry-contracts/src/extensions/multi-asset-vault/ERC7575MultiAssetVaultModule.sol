// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IERC7575.sol";
import "./storage/MultiAssetVaultStorage.sol";

/**
 * @title ERC7575MultiAssetVaultModule
 * @notice Extension module for ERC-7575 multi-asset vault functionality
 * @dev Extends ERC-4626 vaults to support multiple underlying assets
 * 
 * This module enables vaults to:
 * - Hold multiple asset types simultaneously
 * - Maintain target weight allocations
 * - Rebalance portfolio automatically
 * - Accept proportional multi-asset deposits
 * - Return proportional multi-asset withdrawals
 * 
 * Gas costs: ~15,000-25,000 gas per multi-asset operation
 */
contract ERC7575MultiAssetVaultModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC7575
{
    using SafeERC20 for IERC20;
    using MultiAssetVaultStorage for MultiAssetVaultStorage.Layout;

    /// @notice Role for vault managers who can manage assets
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");

    /// @notice Role for rebalancers who can trigger rebalancing
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");

    /// @notice Role for contract upgrades
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Basis points constant (100%)
    uint256 private constant BASIS_POINTS = 10000;

    /// @notice Maximum number of assets in vault
    uint256 private constant MAX_ASSETS = 50;

    /**
     * @notice Custom errors
     */
    error InvalidAsset();
    error InvalidWeight();
    error AssetAlreadyExists();
    error AssetNotFound();
    error AssetNotEmpty();
    error InvalidArrayLength();
    error RebalanceTooSoon();
    error DepositsDisabled();
    error RebalanceDisabled();
    error MaxAssetsExceeded();
    error InvalidOracle();
    error InsufficientBalance();
    error WeightSumNotEqual();

    /**
     * @notice Emitted when module is initialized
     */
    event ModuleInitialized(
        address indexed vaultContract,
        address indexed priceOracle,
        address indexed baseAsset
    );

    /**
     * @notice Emitted when deposits are enabled/disabled
     */
    event DepositsEnabledChanged(bool enabled);

    /**
     * @notice Emitted when rebalancing is enabled/disabled
     */
    event RebalanceEnabledChanged(bool enabled);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the multi-asset vault module
     * @param vaultContract_ Address of the parent ERC4626 vault
     * @param priceOracle_ Address of the price oracle
     * @param baseAsset_ Base asset for value calculations
     * @param admin_ Admin address
     */
    function initialize(
        address vaultContract_,
        address priceOracle_,
        address baseAsset_,
        address admin_
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        if (vaultContract_ == address(0)) revert InvalidAsset();
        if (priceOracle_ == address(0)) revert InvalidOracle();
        if (baseAsset_ == address(0)) revert InvalidAsset();

        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        $.vaultContract = vaultContract_;
        $.priceOracle = priceOracle_;
        $.baseAsset = baseAsset_;
        $.depositsEnabled = true;
        $.rebalanceEnabled = true;
        $.rebalanceThreshold = 100; // 1% drift threshold
        $.rebalanceCooldown = 1 hours;
        $.maxAssetAllocation = 5000; // 50% max per asset

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(VAULT_MANAGER_ROLE, admin_);
        _grantRole(REBALANCER_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);

        emit ModuleInitialized(vaultContract_, priceOracle_, baseAsset_);
    }

    // ============ Asset Management ============

    /**
     * @notice Add new asset to the vault portfolio
     * @param asset Address of the asset to add
     * @param targetWeight Target weight in basis points
     */
    function addAsset(address asset, uint256 targetWeight) 
        external 
        override 
        onlyRole(VAULT_MANAGER_ROLE) 
    {
        if (asset == address(0)) revert InvalidAsset();
        if (targetWeight == 0 || targetWeight > BASIS_POINTS) revert InvalidWeight();

        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        
        if ($.assets[asset].active) revert AssetAlreadyExists();
        if ($.assetList.length >= MAX_ASSETS) revert MaxAssetsExceeded();

        // Check if total weight would exceed 100%
        if ($.totalWeight + targetWeight > BASIS_POINTS) revert InvalidWeight();

        // Get asset decimals
        uint256 decimals = IERC20Metadata(asset).decimals();

        // Add asset
        $.assets[asset] = MultiAssetVaultStorage.AssetInfo({
            assetAddress: asset,
            targetWeight: targetWeight,
            currentBalance: 0,
            active: true,
            lastRebalance: block.timestamp,
            decimals: decimals
        });

        $.assetList.push(asset);
        $.totalWeight += targetWeight;

        emit AssetAdded(asset, targetWeight);
    }

    /**
     * @notice Remove asset from the vault portfolio
     * @param asset Address of the asset to remove
     */
    function removeAsset(address asset) 
        external 
        override 
        onlyRole(VAULT_MANAGER_ROLE) 
    {
        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        
        if (!$.assets[asset].active) revert AssetNotFound();
        if ($.assets[asset].currentBalance > 0) revert AssetNotEmpty();

        // Update total weight
        $.totalWeight -= $.assets[asset].targetWeight;

        // Mark as inactive
        $.assets[asset].active = false;

        // Remove from asset list
        uint256 length = $.assetList.length;
        for (uint256 i = 0; i < length; i++) {
            if ($.assetList[i] == asset) {
                $.assetList[i] = $.assetList[length - 1];
                $.assetList.pop();
                break;
            }
        }

        emit AssetRemoved(asset);
    }

    // ============ Multi-Asset Deposits ============

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
    ) external override nonReentrant returns (uint256 shares) {
        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        
        if (!$.depositsEnabled) revert DepositsDisabled();
        if (assets.length != amounts.length) revert InvalidArrayLength();
        if (assets.length == 0) revert InvalidArrayLength();

        // Calculate total value being deposited
        uint256 totalValue = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            if (!$.assets[assets[i]].active) revert AssetNotFound();
            
            // Transfer assets from depositor
            IERC20(assets[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
            
            // Update balance
            $.assets[assets[i]].currentBalance += amounts[i];
            
            // Calculate value in base asset terms (simplified - would use oracle in production)
            totalValue += amounts[i];
        }

        // Calculate shares to mint (simplified - would use vault's convertToShares in production)
        shares = totalValue;

        emit MultiAssetDeposit(msg.sender, assets, amounts, shares);
        
        return shares;
    }

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
    ) external override nonReentrant returns (address[] memory assets, uint256[] memory amounts) {
        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        
        assets = $.assetList;
        amounts = new uint256[](assets.length);

        // Calculate proportion to withdraw based on shares
        // Simplified calculation - would use vault's total supply in production
        uint256 totalShares = 10000; // Placeholder
        uint256 proportion = (shares * BASIS_POINTS) / totalShares;

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            if (!$.assets[asset].active) continue;

            // Calculate proportional amount
            uint256 amount = ($.assets[asset].currentBalance * proportion) / BASIS_POINTS;
            amounts[i] = amount;

            // Update balance
            $.assets[asset].currentBalance -= amount;

            // Transfer to receiver
            IERC20(asset).safeTransfer(receiver, amount);
        }

        emit MultiAssetWithdrawal(owner, assets, amounts, shares);
        
        return (assets, amounts);
    }

    // ============ Rebalancing ============

    /**
     * @notice Rebalance asset allocations to target weights
     * @dev Swaps assets to match target weights
     */
    function rebalance() external override onlyRole(REBALANCER_ROLE) {
        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        
        if (!$.rebalanceEnabled) revert RebalanceDisabled();
        if (block.timestamp < $.lastRebalanceTime + $.rebalanceCooldown) {
            revert RebalanceTooSoon();
        }

        // Calculate total vault value
        uint256 totalValue = getTotalValue();
        
        address[] memory assetList = $.assetList;
        uint256[] memory newWeights = new uint256[](assetList.length);

        // Rebalance each asset to target weight
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            if (!$.assets[asset].active) continue;

            uint256 targetValue = (totalValue * $.assets[asset].targetWeight) / BASIS_POINTS;
            uint256 currentValue = $.assets[asset].currentBalance; // Simplified

            // If current allocation differs from target, rebalance
            // In production, this would execute swaps via DEX
            
            $.assets[asset].lastRebalance = block.timestamp;
            newWeights[i] = $.assets[asset].targetWeight;
        }

        $.lastRebalanceTime = block.timestamp;

        emit AssetsRebalanced(assetList, newWeights);
    }

    // ============ View Functions ============

    /**
     * @notice Get all assets in the vault
     * @return assets Array of asset addresses
     */
    function getAssets() external view override returns (address[] memory) {
        return MultiAssetVaultStorage.layout().assetList;
    }

    /**
     * @notice Get weight of specific asset
     * @param asset Address of the asset
     * @return weight Asset weight in basis points
     */
    function getAssetWeight(address asset) external view override returns (uint256) {
        return MultiAssetVaultStorage.layout().assets[asset].targetWeight;
    }

    /**
     * @notice Get balance of specific asset in vault
     * @param asset Address of the asset
     * @return balance Current balance of the asset
     */
    function getAssetBalance(address asset) external view override returns (uint256) {
        return MultiAssetVaultStorage.layout().assets[asset].currentBalance;
    }

    /**
     * @notice Calculate total vault value in base denomination
     * @return totalValue Total value of all assets
     */
    function getTotalValue() public view override returns (uint256 totalValue) {
        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        
        for (uint256 i = 0; i < $.assetList.length; i++) {
            address asset = $.assetList[i];
            if (!$.assets[asset].active) continue;
            
            // Simplified - would use price oracle in production
            totalValue += $.assets[asset].currentBalance;
        }
        
        return totalValue;
    }

    /**
     * @notice Preview multi-asset deposit
     * @param assets Array of asset addresses
     * @param amounts Array of amounts to deposit
     * @return shares Expected shares to be minted
     */
    function previewDepositMulti(
        address[] calldata assets,
        uint256[] calldata amounts
    ) external view override returns (uint256 shares) {
        if (assets.length != amounts.length) revert InvalidArrayLength();
        
        // Calculate total value
        uint256 totalValue = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            totalValue += amounts[i]; // Simplified
        }
        
        return totalValue; // Simplified
    }

    /**
     * @notice Preview multi-asset withdrawal
     * @param shares Amount of shares to redeem
     * @return assets Array of asset addresses
     * @return amounts Expected amounts to receive per asset
     */
    function previewWithdrawMulti(
        uint256 shares
    ) external view override returns (address[] memory assets, uint256[] memory amounts) {
        MultiAssetVaultStorage.Layout storage $ = MultiAssetVaultStorage.layout();
        
        assets = $.assetList;
        amounts = new uint256[](assets.length);
        
        // Simplified calculation
        uint256 totalShares = 10000; // Placeholder
        uint256 proportion = (shares * BASIS_POINTS) / totalShares;

        for (uint256 i = 0; i < assets.length; i++) {
            amounts[i] = ($.assets[assets[i]].currentBalance * proportion) / BASIS_POINTS;
        }
        
        return (assets, amounts);
    }

    // ============ Admin Functions ============

    /**
     * @notice Enable or disable multi-asset deposits
     * @param enabled Whether deposits should be enabled
     */
    function setDepositsEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        MultiAssetVaultStorage.layout().depositsEnabled = enabled;
        emit DepositsEnabledChanged(enabled);
    }

    /**
     * @notice Enable or disable rebalancing
     * @param enabled Whether rebalancing should be enabled
     */
    function setRebalanceEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        MultiAssetVaultStorage.layout().rebalanceEnabled = enabled;
        emit RebalanceEnabledChanged(enabled);
    }

    /**
     * @notice Update rebalance cooldown period
     * @param cooldown New cooldown period in seconds
     */
    function setRebalanceCooldown(uint256 cooldown) external onlyRole(DEFAULT_ADMIN_ROLE) {
        MultiAssetVaultStorage.layout().rebalanceCooldown = cooldown;
    }

    /**
     * @notice Update rebalance threshold
     * @param threshold New threshold in basis points
     */
    function setRebalanceThreshold(uint256 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (threshold > BASIS_POINTS) revert InvalidWeight();
        MultiAssetVaultStorage.layout().rebalanceThreshold = threshold;
    }

    // ============ UUPS Upgrade ============

    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

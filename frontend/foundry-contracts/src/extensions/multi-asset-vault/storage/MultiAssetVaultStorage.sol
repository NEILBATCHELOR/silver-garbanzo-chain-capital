// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MultiAssetVaultStorage
 * @notice Storage layout for ERC-7575 Multi-Asset Vault Module
 * @dev Uses diamond storage pattern to avoid collisions
 */
library MultiAssetVaultStorage {
    /// @notice Storage position for the module
    bytes32 private constant STORAGE_SLOT = 
        keccak256("chaincapital.storage.MultiAssetVault");

    /**
     * @notice Asset information structure
     */
    struct AssetInfo {
        address assetAddress;      // Asset token address
        uint256 targetWeight;      // Target weight in basis points (10000 = 100%)
        uint256 currentBalance;    // Current balance in vault
        bool active;               // Whether asset is active
        uint256 lastRebalance;     // Last rebalance timestamp
        uint256 decimals;          // Asset decimals for calculations
    }

    struct Layout {
        /// @notice Array of all asset addresses in the vault
        address[] assetList;
        
        /// @notice Mapping: asset address => AssetInfo
        mapping(address => AssetInfo) assets;
        
        /// @notice Address of the parent ERC4626 vault contract
        address vaultContract;
        
        /// @notice Address of price oracle for asset valuation
        address priceOracle;
        
        /// @notice Base asset for value calculations (e.g., USDC, WETH)
        address baseAsset;
        
        /// @notice Total weight sum (should equal 10000 basis points)
        uint256 totalWeight;
        
        /// @notice Minimum deposit amounts per asset
        mapping(address => uint256) minimumDeposits;
        
        /// @notice Maximum allocation per asset (basis points)
        uint256 maxAssetAllocation;
        
        /// @notice Rebalance threshold (basis points drift before rebalance)
        uint256 rebalanceThreshold;
        
        /// @notice Whether multi-asset deposits are enabled
        bool depositsEnabled;
        
        /// @notice Whether rebalancing is enabled
        bool rebalanceEnabled;
        
        /// @notice Last rebalance timestamp
        uint256 lastRebalanceTime;
        
        /// @notice Rebalance cooldown period (seconds)
        uint256 rebalanceCooldown;
        
        /// @notice Reserved for future use
        uint256[40] __gap;
    }

    /**
     * @notice Get storage layout
     * @return l The storage layout
     */
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DataTypes library
 * @author Chain Capital (adapted from Chain Capital V3)
 * @notice Defines core data structures for Commodity Trade Finance platform
 * @dev Follows Chain Capital V3 Horizon patterns for proven stack-safe architecture
 */
library DataTypes {
  
  // ============ COMMODITY-SPECIFIC TYPES ============
  
  /**
   * @dev Commodity type enumeration
   */
  enum CommodityType {
    PRECIOUS_METAL,
    BASE_METAL,
    ENERGY,
    AGRICULTURAL,
    CARBON_CREDIT
  }
  
  /**
   * @dev Interest rate mode enumeration
   */
  enum InterestRateMode {
    NONE,
    STABLE,
    VARIABLE
  }
  
  /**
   * @dev Commodity metadata for tokenization
   */
  struct CommodityMetadata {
    CommodityType commodityType;
    string assetName;
    uint256 quantity;
    string unit;
    string quality;
    string location;
    uint256 certificateDate;
    bytes32 documentHash;
  }
  
  // ============ RESERVE DATA STRUCTURES (Chain Capital-based) ============
  
  /**
   * @dev Main commodity reserve data structure
   * Based on Chain Capital's ReserveData with commodity-specific additions
   */
  struct CommodityReserveData {
    // Core reserve data (from Chain Capital)
    CommodityConfigurationMap configuration;
    
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint128 currentStableBorrowRate;
    
    uint40 lastUpdateTimestamp;
    uint16 id;
    
    address cTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    
    uint128 accruedToTreasury;
    uint128 unbacked;
    uint128 isolationModeTotalDebt;
    
    // Aave V4 Horizon additions for advanced risk management
    uint128 deficit;                    // Deficit tracking for bad debt coverage
    uint128 virtualUnderlyingBalance;   // Virtual accounting balance
    
    // Commodity-specific additions
    CommodityType commodityType;
    address custodianAddress;
    address haircutEngineAddress;
    bytes32 documentHash;
    uint256 certificateDate;
  }
  
  /**
   * @dev Commodity configuration bit-packed map
   * Based on Chain Capital's ReserveConfigurationMap
   */
  struct CommodityConfigurationMap {
    uint256 data;
  }
  
  /**
   * @dev User configuration bit-packed map
   * Based on Chain Capital's UserConfigurationMap
   */
  struct UserConfigurationMap {
    uint256 data;
  }
  
  /**
   * @dev E-Mode category (from Chain Capital)
   */
  struct EModeCategory {
    uint16 ltv;
    uint16 liquidationThreshold;
    uint16 liquidationBonus;
    address priceSource;
    string label;
    uint128 collateralBitmap;
    uint128 borrowableBitmap;
  }
  
  /**
   * @dev Reserve cache (from Chain Capital V3)
   * Caches frequently accessed reserve data to minimize storage reads
   */
  struct ReserveCache {
    uint256 currScaledVariableDebt;
    uint256 nextScaledVariableDebt;
    uint256 currPrincipalStableDebt;
    uint256 currAvgStableBorrowRate;
    uint256 currTotalStableDebt;
    uint256 nextAvgStableBorrowRate;
    uint256 nextTotalStableDebt;
    uint256 currLiquidityIndex;
    uint256 nextLiquidityIndex;
    uint256 currVariableBorrowIndex;
    uint256 nextVariableBorrowIndex;
    uint256 currLiquidityRate;
    uint256 currVariableBorrowRate;
    uint256 reserveFactor;
    CommodityConfigurationMap commodityConfiguration;
    address cTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    uint40 commodityLastUpdateTimestamp;
    uint40 stableDebtLastUpdateTimestamp;
  }
  
  // ============ EXECUTION PARAMETER STRUCTS (Chain Capital-based) ============
  
  /**
   * @dev Supply execution parameters (from Chain Capital)
   */
  struct ExecuteSupplyParams {
    address asset;
    uint256 amount;
    address onBehalfOf;
    uint16 referralCode;
  }
  
  /**
   * @dev Borrow execution parameters (from Chain Capital)
   */
  struct ExecuteBorrowParams {
    address asset;
    address user;
    address onBehalfOf;
    uint256 amount;
    InterestRateMode interestRateMode;
    uint16 referralCode;
    bool releaseUnderlying;
    uint256 maxStableRateBorrowSizePercent;
    uint256 reservesCount;
    address oracle;
    uint8 userEModeCategory;
    address priceOracleSentinel;
  }
  
  /**
   * @dev Repay execution parameters (from Chain Capital)
   */
  struct ExecuteRepayParams {
    address asset;
    uint256 amount;
    InterestRateMode interestRateMode;
    address onBehalfOf;
    bool useATokens;
  }
  
  /**
   * @dev Withdraw execution parameters (from Chain Capital)
   */
  struct ExecuteWithdrawParams {
    address asset;
    uint256 amount;
    address to;
    uint256 reservesCount;
    address oracle;
    uint8 userEModeCategory;
  }
  
  /**
   * @dev Liquidation execution parameters (from Chain Capital)
   */
  struct ExecuteLiquidationCallParams {
    uint256 reservesCount;
    uint256 debtToCover;
    address collateralAsset;
    address debtAsset;
    address user;
    bool receiveAToken;
    address priceOracle;
    uint8 userEModeCategory;
    address priceOracleSentinel;
  }
  
  /**
   * @dev Finalize transfer execution parameters
   */
  struct FinalizeTransferParams {
    address asset;
    address from;
    address to;
    uint256 amount;
    uint256 balanceFromBefore;
    uint256 balanceToBefore;
    uint256 reservesCount;
    address oracle;
    uint8 fromEModeCategory;
  }
  
  /**
   * @dev Eliminate deficit execution parameters
   */
  struct ExecuteEliminateDeficitParams {
    address asset;
    uint256 amount;
  }
  
  // ============ VALIDATION PARAMETER STRUCTS (Chain Capital-based) ============
  
  /**
   * @dev Borrow validation parameters (from Chain Capital)
   */
  struct ValidateBorrowParams {
    ReserveCache reserveCache;
    UserConfigurationMap userConfig;
    address asset;
    address userAddress;
    uint256 amount;
    InterestRateMode interestRateMode;
    uint256 reservesCount;
    address oracle;
    uint8 userEModeCategory;
    address priceOracleSentinel;
    bool isolationModeActive;
    address isolationModeCollateralAddress;
    uint256 isolationModeDebtCeiling;
  }
  
  /**
   * @dev Liquidation validation parameters (from Chain Capital)
   */
  struct ValidateLiquidationCallParams {
    ReserveCache debtReserveCache;
    uint256 totalDebt;
    uint256 healthFactor;
    address priceOracleSentinel;
  }
  
  /**
   * @dev User account data calculation parameters (from Chain Capital)
   */
  struct CalculateUserAccountDataParams {
    UserConfigurationMap userConfig;
    uint256 reservesCount;
    address user;
    address oracle;
    uint8 userEModeCategory;
  }
  
  /**
   * @dev Interest rate calculation parameters (from Chain Capital)
   */
  struct CalculateInterestRatesParams {
    uint256 unbacked;
    uint256 liquidityAdded;
    uint256 liquidityTaken;
    uint256 totalDebt;
    uint256 reserveFactor;
    address reserve;
    address aToken;
    bool usingVirtualBalance;
    uint256 virtualUnderlyingBalance;
  }
  
  // ============ COMMODITY-SPECIFIC VALIDATION ============
  
  /**
   * @dev Commodity document validation parameters
   */
  struct ValidateCommodityParams {
    CommodityType commodityType;
    bytes32 documentHash;
    uint256 certificateDate;
    string quality;
    uint256 quantity;
  }
  
  /**
   * @dev Haircut calculation parameters
   */
  struct CalculateHaircutParams {
    CommodityType commodityType;
    uint256 oracleValue;
    string quality;
    uint256 certificateDate;
    uint256 quantity;
  }

  /**
   * @dev Parameters for executing user eMode category updates
   */
  struct ExecuteSetUserEModeParams {
    uint256 reservesCount;
    address oracle;
    uint8 categoryId;
  }
}

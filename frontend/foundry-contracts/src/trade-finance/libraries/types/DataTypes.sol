// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DataTypes library
 * @author Chain Capital
 * @notice Defines core data structures for Commodity Trade Finance platform
 * @dev For commodity-backed lending
 */
library DataTypes {
  
  /**
   * @dev Commodity type enumeration
   */
  enum CommodityType {
    PRECIOUS_METAL,     // Gold, Silver, Platinum
    BASE_METAL,         // Steel, Aluminum, Copper
    ENERGY,             // Oil, Gas, Coal
    AGRICULTURAL,       // Wheat, Soybeans, Cotton
    CARBON_CREDIT       // VCS, Gold Standard
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
   * @dev Main commodity reserve data structure
   * Stores all data for a commodity type (e.g., Gold, Wheat, Carbon Credits)
   */
  struct CommodityReserveData {
    // Bit-packed configuration
    CommodityConfigurationMap configuration;
    
    // Interest rate indices (expressed in ray)
    uint128 liquidityIndex;           // Supply interest accumulator
    uint128 currentLiquidityRate;     // Current supply APY
    uint128 variableBorrowIndex;      // Borrow interest accumulator
    uint128 currentVariableBorrowRate; // Current variable borrow APY
    uint128 currentStableBorrowRate;   // Current stable borrow APY (if enabled)
    
    // Timestamps and identifiers
    uint40 lastUpdateTimestamp;        // Last interest rate update
    uint16 id;                         // Position in active commodities list
    
    // Token addresses
    address cTokenAddress;             // Commodity receipt token (like aToken)
    address stableDebtTokenAddress;    // Stable debt token
    address variableDebtTokenAddress;  // Variable debt token
    address interestRateStrategyAddress; // Interest rate model
    
    // Treasury and bridge accounting
    uint128 accruedToTreasury;        // Protocol fees accumulated
    uint128 unbacked;                  // Unbacked cTokens (cross-chain)
    uint128 isolationModeTotalDebt;    // Total debt in isolation mode
    
    // Commodity-specific fields
    CommodityType commodityType;       // Category (precious metal, agricultural, etc.)
    address custodianAddress;          // Physical storage custodian
    address haircutEngineAddress;      // Risk calculation engine
  }
  
  /**
   * @dev Commodity configuration bit-packed map
   * ReserveConfiguration for gas efficiency
   */
  struct CommodityConfigurationMap {
    // bit 0-15: LTV (Loan-to-Value)
    // bit 16-31: Liquidation threshold
    // bit 32-47: Liquidation bonus
    // bit 48-55: Decimals
    // bit 56: commodity is active
    // bit 57: commodity is frozen
    // bit 58: borrowing is enabled
    // bit 59: stable rate borrowing enabled
    // bit 60: commodity is paused
    // bit 61: borrowing in isolation mode is enabled
    // bit 62: siloed borrowing enabled
    // bit 63: flash lending enabled
    // bit 64-79: reserve factor
    // bit 80-115: borrow cap in whole tokens
    // bit 116-151: supply cap in whole tokens
    // bit 152-167: liquidation protocol fee
    // bit 168-175: eMode category
    // bit 176-211: unbacked mint cap
    // bit 212-251: debt ceiling for isolation mode
    // bit 252-255: unused
    uint256 data;
  }
  
  /**
   * @dev User configuration bit-packed map
   * Tracks which commodities a user has supplied/borrowed
   */
  struct UserConfigurationMap {
    // Bitmap: pairs of bits per commodity
    // First bit = used as collateral
    // Second bit = borrowed
    uint256 data;
  }
  
  /**
   * @dev E-Mode (Efficiency Mode) category
   * Allows higher LTV for correlated commodities
   * Example: Gold/Silver/Platinum can be in "Precious Metals" eMode
   */
  struct EModeCategory {
    uint16 ltv;                    // Custom LTV for this category
    uint16 liquidationThreshold;   // Custom liquidation threshold
    uint16 liquidationBonus;       // Custom liquidation bonus
    address priceSource;           // Optional custom oracle
    string label;                  // Human-readable name
  }
  
  /**
   * @dev Commodity reserve cache
   * Used to avoid repeated storage reads during transactions
   */
  struct CommodityCache {
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
  
  /**
   * @dev Parameters for executing supply operation
   */
  struct ExecuteSupplyParams {
    address commodity;          // Commodity address
    uint256 amount;             // Amount to supply
    address onBehalfOf;         // Recipient of cTokens
    uint16 referralCode;        // Referral code for tracking
  }
  
  /**
   * @dev Parameters for executing borrow operation
   */
  struct ExecuteBorrowParams {
    address commodity;
    address user;
    address onBehalfOf;
    uint256 amount;
    InterestRateMode interestRateMode;
    uint16 referralCode;
    bool releaseUnderlying;
    uint256 maxStableRateBorrowSizePercent;
    uint256 commoditiesCount;
    address oracle;
    uint8 userEModeCategory;
    address priceOracleSentinel;
  }
  
  /**
   * @dev Parameters for executing repay operation
   */
  struct ExecuteRepayParams {
    address commodity;
    uint256 amount;
    InterestRateMode interestRateMode;
    address onBehalfOf;
    bool useCTokens;            // Renamed from useATokens
  }
  
  /**
   * @dev Parameters for executing withdraw operation
   */
  struct ExecuteWithdrawParams {
    address commodity;
    uint256 amount;
    address to;
    uint256 commoditiesCount;
    address oracle;
    uint8 userEModeCategory;
  }
  
  /**
   * @dev Parameters for executing liquidation
   */
  struct ExecuteLiquidationCallParams {
    uint256 commoditiesCount;
    uint256 debtToCover;
    address collateralCommodity;
    address debtCommodity;
    address user;
    bool receiveCToken;         // Renamed from receiveAToken
    address priceOracle;
    uint8 userEModeCategory;
    address priceOracleSentinel;
  }
  
  /**
   * @dev Parameters for user account data calculation
   */
  struct CalculateUserAccountDataParams {
    UserConfigurationMap userConfig;
    uint256 commoditiesCount;
    address user;
    address oracle;
    uint8 userEModeCategory;
  }
  
  /**
   * @dev Parameters for borrow validation
   */
  struct ValidateBorrowParams {
    CommodityCache commodityCache;
    UserConfigurationMap userConfig;
    address commodity;
    address userAddress;
    uint256 amount;
    InterestRateMode interestRateMode;
    uint256 maxStableLoanPercent;
    uint256 commoditiesCount;
    address oracle;
    uint8 userEModeCategory;
    address priceOracleSentinel;
    bool isolationModeActive;
    address isolationModeCollateralAddress;
    uint256 isolationModeDebtCeiling;
  }
  
  /**
   * @dev Parameters for liquidation validation
   */
  struct ValidateLiquidationCallParams {
    CommodityCache debtCommodityCache;
    uint256 totalDebt;
    uint256 healthFactor;
    address priceOracleSentinel;
  }
  
  /**
   * @dev Parameters for interest rate calculation
   */
  struct CalculateInterestRatesParams {
    uint256 unbacked;
    uint256 liquidityAdded;
    uint256 liquidityTaken;
    uint256 totalStableDebt;
    uint256 totalVariableDebt;
    uint256 averageStableBorrowRate;
    uint256 reserveFactor;
    address commodity;
    address cToken;
  }
  
  /**
   * @dev Parameters for initializing a new commodity reserve
   */
  struct InitCommodityParams {
    address commodity;
    address cTokenAddress;
    address stableDebtAddress;
    address variableDebtAddress;
    address interestRateStrategyAddress;
    uint16 commoditiesCount;
    uint16 maxNumberCommodities;
  }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Errors} from '../helpers/Errors.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title ReserveConfiguration library
 * @author Chain Capital
 * @notice Implements bit-packing for commodity reserve configuration
 * @dev Bit layout for CommodityConfigurationMap:
 *  bit 0-15:   LTV (Loan-to-Value) in basis points
 *  bit 16-31:  Liquidation threshold in basis points
 *  bit 32-47:  Liquidation bonus in basis points  
 *  bit 48-55:  Decimals
 *  bit 56:     Commodity is active
 *  bit 57:     Commodity is frozen
 *  bit 58:     Borrowing is enabled
 *  bit 59:     Stable rate borrowing enabled
 *  bit 60:     Commodity is paused
 *  bit 61:     Borrowing in isolation mode is enabled
 *  bit 62:     Siloed borrowing enabled
 *  bit 63:     Flash lending enabled
 *  bit 64-79:  Reserve factor in basis points
 *  bit 80-115: Borrow cap in whole tokens (36 bits)
 *  bit 116-151: Supply cap in whole tokens (36 bits)
 *  bit 152-167: Liquidation protocol fee in basis points
 *  bit 168-175: eMode category (8 bits, 0-255)
 *  bit 176-211: Unbacked mint cap in whole tokens (36 bits)
 *  bit 212-251: Debt ceiling for isolation mode (40 bits, up to ~$1T with 2 decimals)
 *  bit 252-255: Unused (4 bits)
 */
library ReserveConfiguration {
  // Bit position constants
  uint256 internal constant LTV_MASK =                       0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000;
  uint256 internal constant LIQUIDATION_THRESHOLD_MASK =     0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFF;
  uint256 internal constant LIQUIDATION_BONUS_MASK =         0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFFFFFF;
  uint256 internal constant DECIMALS_MASK =                  0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00FFFFFFFFFFFF;
  uint256 internal constant ACTIVE_MASK =                    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFF;
  uint256 internal constant FROZEN_MASK =                    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFDFFFFFFFFFFFFFF;
  uint256 internal constant BORROWING_MASK =                 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBFFFFFFFFFFFFFF;
  uint256 internal constant STABLE_BORROWING_MASK =          0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFFFFFFFFF;
  uint256 internal constant PAUSED_MASK =                    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFF;
  uint256 internal constant BORROWABLE_IN_ISOLATION_MASK =   0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFDFFFFFFFFFFFFFFF;
  uint256 internal constant SILOED_BORROWING_MASK =          0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBFFFFFFFFFFFFFFF;
  uint256 internal constant FLASHLOAN_ENABLED_MASK =         0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFFFFFFFFFF;
  uint256 internal constant RESERVE_FACTOR_MASK =            0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFFFFFFFFFF;
  uint256 internal constant BORROW_CAP_MASK =                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000FFFFFFFFFFFFFFFFFFFF;
  uint256 internal constant SUPPLY_CAP_MASK =                0xFFFFFFFFFFFFFFFFFFFFFF000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
  uint256 internal constant LIQUIDATION_PROTOCOL_FEE_MASK =  0xFFFFFFFFFFFFFFFFFFFF0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
  uint256 internal constant EMODE_CATEGORY_MASK =            0xFFFFFFFFFFFFFFFFFF00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
  uint256 internal constant UNBACKED_MINT_CAP_MASK =         0xFFFFFFFFF000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
  uint256 internal constant DEBT_CEILING_MASK =              0xF0000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

  /// @dev For the LTV, the start bit is 0 (up to 15), hence no bitshifting is needed
  uint256 internal constant LIQUIDATION_THRESHOLD_START_BIT_POSITION = 16;
  uint256 internal constant LIQUIDATION_BONUS_START_BIT_POSITION = 32;
  uint256 internal constant RESERVE_DECIMALS_START_BIT_POSITION = 48;
  uint256 internal constant IS_ACTIVE_START_BIT_POSITION = 56;
  uint256 internal constant IS_FROZEN_START_BIT_POSITION = 57;
  uint256 internal constant BORROWING_ENABLED_START_BIT_POSITION = 58;
  uint256 internal constant STABLE_BORROWING_ENABLED_START_BIT_POSITION = 59;
  uint256 internal constant IS_PAUSED_START_BIT_POSITION = 60;
  uint256 internal constant BORROWABLE_IN_ISOLATION_START_BIT_POSITION = 61;
  uint256 internal constant SILOED_BORROWING_START_BIT_POSITION = 62;
  uint256 internal constant FLASHLOAN_ENABLED_START_BIT_POSITION = 63;
  uint256 internal constant RESERVE_FACTOR_START_BIT_POSITION = 64;
  uint256 internal constant BORROW_CAP_START_BIT_POSITION = 80;
  uint256 internal constant SUPPLY_CAP_START_BIT_POSITION = 116;
  uint256 internal constant LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION = 152;
  uint256 internal constant EMODE_CATEGORY_START_BIT_POSITION = 168;
  uint256 internal constant UNBACKED_MINT_CAP_START_BIT_POSITION = 176;
  uint256 internal constant DEBT_CEILING_START_BIT_POSITION = 212;

  uint256 internal constant MAX_VALID_LTV = 65535;
  uint256 internal constant MAX_VALID_LIQUIDATION_THRESHOLD = 65535;
  uint256 internal constant MAX_VALID_LIQUIDATION_BONUS = 65535;
  uint256 internal constant MAX_VALID_DECIMALS = 255;
  uint256 internal constant MAX_VALID_RESERVE_FACTOR = 65535;
  uint256 internal constant MAX_VALID_BORROW_CAP = 68719476735;
  uint256 internal constant MAX_VALID_SUPPLY_CAP = 68719476735;
  uint256 internal constant MAX_VALID_LIQUIDATION_PROTOCOL_FEE = 65535;
  uint256 internal constant MAX_VALID_EMODE_CATEGORY = 255;
  uint256 internal constant MAX_VALID_UNBACKED_MINT_CAP = 68719476735;
  uint256 internal constant MAX_VALID_DEBT_CEILING = 1099511627775; // 2^40 - 1

  /**
   * @notice Sets the Loan-to-Value (LTV) of the commodity
   * @param self The commodity configuration
   * @param ltv The new LTV (in basis points, e.g., 8000 = 80%)
   */
  function setLtv(DataTypes.CommodityConfigurationMap memory self, uint256 ltv) internal pure {
    require(ltv <= MAX_VALID_LTV, Errors.INVALID_LTV);
    self.data = (self.data & LTV_MASK) | ltv;
  }

  /**
   * @notice Gets the Loan-to-Value (LTV) of the commodity
   * @param self The commodity configuration
   * @return The LTV (in basis points)
   */
  function getLtv(DataTypes.CommodityConfigurationMap memory self) internal pure returns (uint256) {
    return self.data & ~LTV_MASK;
  }

  /**
   * @notice Sets the liquidation threshold of the commodity
   * @param self The commodity configuration
   * @param threshold The new liquidation threshold (in basis points)
   */
  function setLiquidationThreshold(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 threshold
  ) internal pure {
    require(threshold <= MAX_VALID_LIQUIDATION_THRESHOLD, Errors.INVALID_LIQ_THRESHOLD);
    self.data = (self.data & LIQUIDATION_THRESHOLD_MASK) | (threshold << LIQUIDATION_THRESHOLD_START_BIT_POSITION);
  }

  /**
   * @notice Gets the liquidation threshold of the commodity
   * @param self The commodity configuration
   * @return The liquidation threshold (in basis points)
   */
  function getLiquidationThreshold(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~LIQUIDATION_THRESHOLD_MASK) >> LIQUIDATION_THRESHOLD_START_BIT_POSITION;
  }

  /**
   * @notice Sets the liquidation bonus of the commodity
   * @param self The commodity configuration
   * @param bonus The new liquidation bonus (in basis points)
   */
  function setLiquidationBonus(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 bonus
  ) internal pure {
    require(bonus <= MAX_VALID_LIQUIDATION_BONUS, Errors.INVALID_LIQ_BONUS);
    self.data = (self.data & LIQUIDATION_BONUS_MASK) | (bonus << LIQUIDATION_BONUS_START_BIT_POSITION);
  }

  /**
   * @notice Gets the liquidation bonus of the commodity
   * @param self The commodity configuration
   * @return The liquidation bonus (in basis points)
   */
  function getLiquidationBonus(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~LIQUIDATION_BONUS_MASK) >> LIQUIDATION_BONUS_START_BIT_POSITION;
  }

  /**
   * @notice Sets the decimals of the underlying commodity token
   * @param self The commodity configuration
   * @param decimals The decimals
   */
  function setDecimals(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 decimals
  ) internal pure {
    require(decimals <= MAX_VALID_DECIMALS, Errors.INVALID_DECIMALS);
    self.data = (self.data & DECIMALS_MASK) | (decimals << RESERVE_DECIMALS_START_BIT_POSITION);
  }

  /**
   * @notice Gets the decimals of the underlying commodity token
   * @param self The commodity configuration
   * @return The decimals of the commodity token
   */
  function getDecimals(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~DECIMALS_MASK) >> RESERVE_DECIMALS_START_BIT_POSITION;
  }

  /**
   * @notice Sets the active state of the commodity
   * @param self The commodity configuration
   * @param active The active state
   */
  function setActive(DataTypes.CommodityConfigurationMap memory self, bool active) internal pure {
    self.data =
      (self.data & ACTIVE_MASK) |
      (uint256(active ? 1 : 0) << IS_ACTIVE_START_BIT_POSITION);
  }

  /**
   * @notice Gets the active state of the commodity
   * @param self The commodity configuration
   * @return The active state
   */
  function getActive(DataTypes.CommodityConfigurationMap memory self) internal pure returns (bool) {
    return (self.data & ~ACTIVE_MASK) != 0;
  }

  /**
   * @notice Sets the frozen state of the commodity
   * @param self The commodity configuration
   * @param frozen The frozen state
   */
  function setFrozen(DataTypes.CommodityConfigurationMap memory self, bool frozen) internal pure {
    self.data =
      (self.data & FROZEN_MASK) |
      (uint256(frozen ? 1 : 0) << IS_FROZEN_START_BIT_POSITION);
  }

  /**
   * @notice Gets the frozen state of the commodity
   * @param self The commodity configuration
   * @return The frozen state
   */
  function getFrozen(DataTypes.CommodityConfigurationMap memory self) internal pure returns (bool) {
    return (self.data & ~FROZEN_MASK) != 0;
  }

  /**
   * @notice Sets the paused state of the commodity
   * @param self The commodity configuration
   * @param paused The paused state
   */
  function setPaused(DataTypes.CommodityConfigurationMap memory self, bool paused) internal pure {
    self.data =
      (self.data & PAUSED_MASK) |
      (uint256(paused ? 1 : 0) << IS_PAUSED_START_BIT_POSITION);
  }

  /**
   * @notice Gets the paused state of the commodity
   * @param self The commodity configuration
   * @return The paused state
   */
  function getPaused(DataTypes.CommodityConfigurationMap memory self) internal pure returns (bool) {
    return (self.data & ~PAUSED_MASK) != 0;
  }

  /**
   * @notice Sets the borrowing enabled flag for the commodity
   * @param self The commodity configuration
   * @param enabled True if borrowing is enabled, false otherwise
   */
  function setBorrowingEnabled(
    DataTypes.CommodityConfigurationMap memory self,
    bool enabled
  ) internal pure {
    self.data =
      (self.data & BORROWING_MASK) |
      (uint256(enabled ? 1 : 0) << BORROWING_ENABLED_START_BIT_POSITION);
  }

  /**
   * @notice Gets the borrowing enabled flag for the commodity
   * @param self The commodity configuration
   * @return The borrowing enabled flag
   */
  function getBorrowingEnabled(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (bool) {
    return (self.data & ~BORROWING_MASK) != 0;
  }

  /**
   * @notice Sets the stable borrowing enabled flag for the commodity
   * @param self The commodity configuration
   * @param enabled True if stable rate borrowing is enabled, false otherwise
   */
  function setStableRateBorrowingEnabled(
    DataTypes.CommodityConfigurationMap memory self,
    bool enabled
  ) internal pure {
    self.data =
      (self.data & STABLE_BORROWING_MASK) |
      (uint256(enabled ? 1 : 0) << STABLE_BORROWING_ENABLED_START_BIT_POSITION);
  }

  /**
   * @notice Gets the stable borrowing enabled flag for the commodity
   * @param self The commodity configuration
   * @return The stable borrowing enabled flag
   */
  function getStableRateBorrowingEnabled(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (bool) {
    return (self.data & ~STABLE_BORROWING_MASK) != 0;
  }

  /**
   * @notice Sets the reserve factor of the commodity
   * @param self The commodity configuration
   * @param reserveFactor The new reserve factor (in basis points)
   */
  function setReserveFactor(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 reserveFactor
  ) internal pure {
    require(reserveFactor <= MAX_VALID_RESERVE_FACTOR, Errors.INVALID_RESERVE_FACTOR);
    self.data =
      (self.data & RESERVE_FACTOR_MASK) |
      (reserveFactor << RESERVE_FACTOR_START_BIT_POSITION);
  }

  /**
   * @notice Gets the reserve factor of the commodity
   * @param self The commodity configuration
   * @return The reserve factor (in basis points)
   */
  function getReserveFactor(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~RESERVE_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION;
  }

  /**
   * @notice Sets the borrow cap of the commodity
   * @param self The commodity configuration
   * @param borrowCap The borrow cap (in whole tokens)
   */
  function setBorrowCap(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 borrowCap
  ) internal pure {
    require(borrowCap <= MAX_VALID_BORROW_CAP, Errors.INVALID_BORROW_CAP);
    self.data = (self.data & BORROW_CAP_MASK) | (borrowCap << BORROW_CAP_START_BIT_POSITION);
  }

  /**
   * @notice Gets the borrow cap of the commodity
   * @param self The commodity configuration
   * @return The borrow cap (in whole tokens)
   */
  function getBorrowCap(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION;
  }

  /**
   * @notice Sets the supply cap of the commodity
   * @param self The commodity configuration
   * @param supplyCap The supply cap (in whole tokens)
   */
  function setSupplyCap(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 supplyCap
  ) internal pure {
    require(supplyCap <= MAX_VALID_SUPPLY_CAP, Errors.INVALID_SUPPLY_CAP);
    self.data = (self.data & SUPPLY_CAP_MASK) | (supplyCap << SUPPLY_CAP_START_BIT_POSITION);
  }

  /**
   * @notice Gets the supply cap of the commodity
   * @param self The commodity configuration
   * @return The supply cap (in whole tokens)
   */
  function getSupplyCap(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION;
  }

  /**
   * @notice Sets the liquidation protocol fee of the commodity
   * @param self The commodity configuration
   * @param liquidationProtocolFee The liquidation protocol fee (in basis points)
   */
  function setLiquidationProtocolFee(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 liquidationProtocolFee
  ) internal pure {
    require(
      liquidationProtocolFee <= MAX_VALID_LIQUIDATION_PROTOCOL_FEE,
      Errors.INVALID_LIQUIDATION_PROTOCOL_FEE
    );
    self.data =
      (self.data & LIQUIDATION_PROTOCOL_FEE_MASK) |
      (liquidationProtocolFee << LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION);
  }

  /**
   * @notice Gets the liquidation protocol fee of the commodity
   * @param self The commodity configuration
   * @return The liquidation protocol fee (in basis points)
   */
  function getLiquidationProtocolFee(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return
      (self.data & ~LIQUIDATION_PROTOCOL_FEE_MASK) >> LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION;
  }

  /**
   * @notice Sets the eMode category of the commodity
   * @param self The commodity configuration
   * @param category The eMode category (0-255)
   */
  function setEModeCategory(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 category
  ) internal pure {
    require(category <= MAX_VALID_EMODE_CATEGORY, Errors.INVALID_EMODE_CATEGORY);
    self.data = (self.data & EMODE_CATEGORY_MASK) | (category << EMODE_CATEGORY_START_BIT_POSITION);
  }

  /**
   * @notice Gets the eMode category of the commodity
   * @param self The commodity configuration
   * @return The eMode category
   */
  function getEModeCategory(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~EMODE_CATEGORY_MASK) >> EMODE_CATEGORY_START_BIT_POSITION;
  }

  /**
   * @notice Sets the unbacked mint cap of the commodity
   * @param self The commodity configuration
   * @param unbackedMintCap The unbacked mint cap (in whole tokens)
   */
  function setUnbackedMintCap(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 unbackedMintCap
  ) internal pure {
    require(unbackedMintCap <= MAX_VALID_UNBACKED_MINT_CAP, Errors.INVALID_UNBACKED_MINT_CAP);
    self.data =
      (self.data & UNBACKED_MINT_CAP_MASK) |
      (unbackedMintCap << UNBACKED_MINT_CAP_START_BIT_POSITION);
  }

  /**
   * @notice Gets the unbacked mint cap of the commodity
   * @param self The commodity configuration
   * @return The unbacked mint cap (in whole tokens)
   */
  function getUnbackedMintCap(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~UNBACKED_MINT_CAP_MASK) >> UNBACKED_MINT_CAP_START_BIT_POSITION;
  }

  /**
   * @notice Sets the debt ceiling for isolation mode
   * @param self The commodity configuration
   * @param ceiling The debt ceiling (in USD with 2 decimals)
   */
  function setDebtCeiling(
    DataTypes.CommodityConfigurationMap memory self,
    uint256 ceiling
  ) internal pure {
    require(ceiling <= MAX_VALID_DEBT_CEILING, Errors.INVALID_DEBT_CEILING);
    self.data = (self.data & DEBT_CEILING_MASK) | (ceiling << DEBT_CEILING_START_BIT_POSITION);
  }

  /**
   * @notice Gets the debt ceiling for isolation mode
   * @param self The commodity configuration
   * @return The debt ceiling (in USD with 2 decimals)
   */
  function getDebtCeiling(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256) {
    return (self.data & ~DEBT_CEILING_MASK) >> DEBT_CEILING_START_BIT_POSITION;
  }

  /**
   * @notice Sets the borrowable in isolation flag for the commodity
   * @param self The commodity configuration
   * @param borrowable True if borrowable in isolation, false otherwise
   */
  function setBorrowableInIsolation(
    DataTypes.CommodityConfigurationMap memory self,
    bool borrowable
  ) internal pure {
    self.data =
      (self.data & BORROWABLE_IN_ISOLATION_MASK) |
      (uint256(borrowable ? 1 : 0) << BORROWABLE_IN_ISOLATION_START_BIT_POSITION);
  }

  /**
   * @notice Gets the borrowable in isolation flag for the commodity
   * @param self The commodity configuration
   * @return The borrowable in isolation flag
   */
  function getBorrowableInIsolation(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (bool) {
    return (self.data & ~BORROWABLE_IN_ISOLATION_MASK) != 0;
  }

  /**
   * @notice Sets the siloed borrowing flag for the commodity
   * @param self The commodity configuration
   * @param siloed True if siloed borrowing is enabled, false otherwise
   */
  function setSiloedBorrowing(
    DataTypes.CommodityConfigurationMap memory self,
    bool siloed
  ) internal pure {
    self.data =
      (self.data & SILOED_BORROWING_MASK) |
      (uint256(siloed ? 1 : 0) << SILOED_BORROWING_START_BIT_POSITION);
  }

  /**
   * @notice Gets the siloed borrowing flag for the commodity
   * @param self The commodity configuration
   * @return The siloed borrowing flag
   */
  function getSiloedBorrowing(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (bool) {
    return (self.data & ~SILOED_BORROWING_MASK) != 0;
  }

  /**
   * @notice Sets the flash loan enabled flag for the commodity
   * @param self The commodity configuration
   * @param enabled True if flash loans are enabled, false otherwise
   */
  function setFlashLoanEnabled(
    DataTypes.CommodityConfigurationMap memory self,
    bool enabled
  ) internal pure {
    self.data =
      (self.data & FLASHLOAN_ENABLED_MASK) |
      (uint256(enabled ? 1 : 0) << FLASHLOAN_ENABLED_START_BIT_POSITION);
  }

  /**
   * @notice Gets the flash loan enabled flag for the commodity
   * @param self The commodity configuration
   * @return The flash loan enabled flag
   */
  function getFlashLoanEnabled(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (bool) {
    return (self.data & ~FLASHLOAN_ENABLED_MASK) != 0;
  }

  /**
   * @notice Gets all commodity flags in a single call
   * @param self The commodity configuration
   * @return active, frozen, borrowingEnabled, stableRateBorrowingEnabled, paused
   */
  function getFlags(
    DataTypes.CommodityConfigurationMap memory self
  )
    internal
    pure
    returns (bool, bool, bool, bool, bool)
  {
    uint256 dataLocal = self.data;

    return (
      (dataLocal & ~ACTIVE_MASK) != 0,
      (dataLocal & ~FROZEN_MASK) != 0,
      (dataLocal & ~BORROWING_MASK) != 0,
      (dataLocal & ~STABLE_BORROWING_MASK) != 0,
      (dataLocal & ~PAUSED_MASK) != 0
    );
  }

  /**
   * @notice Gets additional commodity flags in a single call
   * @param self The commodity configuration
   * @return borrowableInIsolation, siloedBorrowingEnabled, flashLoanEnabled
   */
  function getFlagsMemory(
    DataTypes.CommodityConfigurationMap memory self
  )
    internal
    pure
    returns (bool, bool, bool)
  {
    return (
      (self.data & ~BORROWABLE_IN_ISOLATION_MASK) != 0,
      (self.data & ~SILOED_BORROWING_MASK) != 0,
      (self.data & ~FLASHLOAN_ENABLED_MASK) != 0
    );
  }

  /**
   * @notice Gets the caps (supply and borrow) of the commodity
   * @param self The commodity configuration
   * @return The supply cap and borrow cap (both in whole tokens)
   */
  function getCaps(
    DataTypes.CommodityConfigurationMap memory self
  ) internal pure returns (uint256, uint256) {
    uint256 dataLocal = self.data;

    return (
      (dataLocal & ~SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION,
      (dataLocal & ~BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION
    );
  }
}

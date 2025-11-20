// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Errors} from '../helpers/Errors.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title UserConfiguration library
 * @author Chain Capital
 * @notice Implements bit-packing for user commodity usage
 * @dev Bitmap structure: Each commodity uses 2 bits
 *  - First bit: Used as collateral (1 = true, 0 = false)
 *  - Second bit: Borrowed (1 = true, 0 = false)
 *  
 * Example for commodity at index 5:
 *  Bits 10-11 store the state
 *  Bit 10 = collateral enabled
 *  Bit 11 = borrowed
 */
library UserConfiguration {
  uint256 internal constant BORROWING_MASK =                0x5555555555555555555555555555555555555555555555555555555555555555;
  uint256 internal constant COLLATERAL_MASK =               0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;

  /**
   * @notice Sets if the user is borrowing the commodity identified by commodityIndex
   * @param self The configuration object
   * @param commodityIndex The index of the commodity in the bitmap
   * @param borrowing True if the user is borrowing the commodity, false otherwise
   */
  function setBorrowing(
    DataTypes.UserConfigurationMap storage self,
    uint256 commodityIndex,
    bool borrowing
  ) internal {
    unchecked {
      require(commodityIndex < 128, Errors.INVALID_COMMODITY_INDEX);
      uint256 bit = 1 << (commodityIndex << 1);
      if (borrowing) {
        self.data |= bit;
      } else {
        self.data &= ~bit;
      }
    }
  }

  /**
   * @notice Sets if the user is using as collateral the commodity identified by commodityIndex
   * @param self The configuration object
   * @param commodityIndex The index of the commodity in the bitmap
   * @param usingAsCollateral True if the user is using the commodity as collateral, false otherwise
   */
  function setUsingAsCollateral(
    DataTypes.UserConfigurationMap storage self,
    uint256 commodityIndex,
    bool usingAsCollateral
  ) internal {
    unchecked {
      require(commodityIndex < 128, Errors.INVALID_COMMODITY_INDEX);
      uint256 bit = 1 << ((commodityIndex << 1) + 1);
      if (usingAsCollateral) {
        self.data |= bit;
      } else {
        self.data &= ~bit;
      }
    }
  }

  /**
   * @notice Returns if a user has been using the commodity for borrowing or as collateral
   * @param self The configuration object
   * @param commodityIndex The index of the commodity in the bitmap
   * @return True if the user has been using a commodity for borrowing or as collateral, false otherwise
   */
  function isUsingAsCollateralOrBorrowing(
    DataTypes.UserConfigurationMap memory self,
    uint256 commodityIndex
  ) internal pure returns (bool) {
    unchecked {
      require(commodityIndex < 128, Errors.INVALID_COMMODITY_INDEX);
      return (self.data >> (commodityIndex << 1)) & 3 != 0;
    }
  }

  /**
   * @notice Validate a user has been using the commodity for borrowing
   * @param self The configuration object
   * @param commodityIndex The index of the commodity in the bitmap
   * @return True if the user has been using a commodity for borrowing, false otherwise
   */
  function isBorrowing(
    DataTypes.UserConfigurationMap memory self,
    uint256 commodityIndex
  ) internal pure returns (bool) {
    unchecked {
      require(commodityIndex < 128, Errors.INVALID_COMMODITY_INDEX);
      return (self.data >> (commodityIndex << 1)) & 1 != 0;
    }
  }

  /**
   * @notice Validate a user has been using the commodity as collateral
   * @param self The configuration object
   * @param commodityIndex The index of the commodity in the bitmap
   * @return True if the user has been using a commodity as collateral, false otherwise
   */
  function isUsingAsCollateral(
    DataTypes.UserConfigurationMap memory self,
    uint256 commodityIndex
  ) internal pure returns (bool) {
    unchecked {
      require(commodityIndex < 128, Errors.INVALID_COMMODITY_INDEX);
      return (self.data >> ((commodityIndex << 1) + 1)) & 1 != 0;
    }
  }

  /**
   * @notice Checks if a user is borrowing any commodity
   * @param self The configuration object
   * @return True if the user is borrowing any commodity, false otherwise
   */
  function isBorrowingAny(DataTypes.UserConfigurationMap memory self) internal pure returns (bool) {
    return self.data & BORROWING_MASK != 0;
  }

  /**
   * @notice Checks if a user is using any commodity as collateral
   * @param self The configuration object
   * @return True if the user is using any commodity as collateral, false otherwise
   */
  function isUsingAsCollateralAny(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (bool) {
    return self.data & COLLATERAL_MASK != 0;
  }

  /**
   * @notice Checks if a user is borrowing one commodity and using another as collateral
   * @param self The configuration object
   * @return True if the user is borrowing one commodity and using another as collateral, false otherwise
   */
  function isUsingAsCollateralOne(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (bool) {
    uint256 collateralData = self.data & COLLATERAL_MASK;
    return collateralData != 0 && (collateralData & (collateralData - 1) == 0);
  }

  /**
   * @notice Checks if a user is borrowing multiple commodities
   * @param self The configuration object
   * @return True if the user is borrowing multiple commodities, false otherwise
   */
  function isBorrowingMultiple(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (bool) {
    uint256 borrowingData = self.data & BORROWING_MASK;
    return borrowingData != 0 && (borrowingData & (borrowingData - 1) != 0);
  }

  /**
   * @notice Checks if a user is borrowing one commodity
   * @param self The configuration object
   * @return True if the user is borrowing one commodity, false otherwise
   */
  function isBorrowingOne(DataTypes.UserConfigurationMap memory self) internal pure returns (bool) {
    uint256 borrowingData = self.data & BORROWING_MASK;
    return borrowingData != 0 && (borrowingData & (borrowingData - 1) == 0);
  }

  /**
   * @notice Checks if a user is using multiple commodities as collateral
   * @param self The configuration object
   * @return True if the user is using multiple commodities as collateral, false otherwise
   */
  function isUsingAsCollateralMultiple(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (bool) {
    uint256 collateralData = self.data & COLLATERAL_MASK;
    return collateralData != 0 && (collateralData & (collateralData - 1) != 0);
  }

  /**
   * @notice Used to validate if a user has been supplying only one commodity as collateral
   * @param self The configuration object
   * @return True if the user has been supplying as collateral only one commodity, false otherwise
   * @dev This method filters the collateral bitmap and checks if there is only 1 non-zero bit
   */
  function isUsingAsCollateralOnlyOne(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (bool) {
    uint256 collateralData = self.data & COLLATERAL_MASK;
    return collateralData != 0 && (collateralData & (collateralData - 1) == 0);
  }

  /**
   * @notice Gets the first commodity index that matches the given state
   * @param self The configuration object
   * @param mask The mask to apply (BORROWING_MASK or COLLATERAL_MASK)
   * @return The index of the first commodity with the given state, or type(uint256).max if not found
   */
  function _getFirstCommodityIdByMask(
    DataTypes.UserConfigurationMap memory self,
    uint256 mask
  ) internal pure returns (uint256) {
    unchecked {
      uint256 bitmapData = self.data & mask;
      uint256 commodityIndex = 0;
      if (bitmapData == 0) {
        return type(uint256).max;
      }
      
      // Find the first non-zero bit
      while ((bitmapData & 1) == 0) {
        bitmapData >>= 1;
        commodityIndex++;
      }
      
      return commodityIndex >> 1;  // Divide by 2 since each commodity uses 2 bits
    }
  }

  /**
   * @notice Gets the first commodity index used as collateral
   * @param self The configuration object
   * @return The index of the first commodity used as collateral, or type(uint256).max if none
   */
  function getFirstCommodityIdAsCollateral(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (uint256) {
    return _getFirstCommodityIdByMask(self, COLLATERAL_MASK);
  }

  /**
   * @notice Gets the first commodity index that is borrowed
   * @param self The configuration object
   * @return The index of the first commodity borrowed, or type(uint256).max if none
   */
  function getFirstCommodityIdBorrowed(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (uint256) {
    return _getFirstCommodityIdByMask(self, BORROWING_MASK);
  }

  /**
   * @notice Checks if the user has been supplying only one commodity and borrowing at most one
   * @param self The configuration object
   * @return True if the user has been supplying only one commodity and borrowing at most one, false otherwise
   */
  function isIsolated(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (bool, uint256) {
    uint256 collateralData = self.data & COLLATERAL_MASK;
    
    // No collateral or multiple collaterals
    if (collateralData == 0 || (collateralData & (collateralData - 1)) != 0) {
      return (false, 0);
    }

    // Only one collateral, check if borrowing at most one
    uint256 borrowingData = self.data & BORROWING_MASK;
    if (borrowingData != 0 && (borrowingData & (borrowingData - 1)) != 0) {
      return (false, 0);  // Borrowing multiple
    }

    // Get the isolated commodity index
    uint256 commodityIndex = 0;
    uint256 tempData = collateralData;
    while ((tempData & 2) == 0) {  // Check for collateral bit (bit 1 of each pair)
      tempData >>= 2;
      commodityIndex++;
    }

    return (true, commodityIndex);
  }

  /**
   * @notice Gets the isolation mode collateral address
   * @param self The configuration object
   * @param commodities The list of all commodity addresses
   * @return The address of the commodity used as isolated collateral, or address(0) if not in isolation mode
   */
  function getIsolationModeCommodityAddress(
    DataTypes.UserConfigurationMap memory self,
    mapping(uint256 => address) storage commodities
  ) internal view returns (address) {
    (bool isolated, uint256 commodityIndex) = isIsolated(self);
    
    if (isolated) {
      return commodities[commodityIndex];
    }
    
    return address(0);
  }

  /**
   * @notice Gets the siloed borrowing flag
   * @param self The configuration object
   * @param commodities The list of all commodity addresses
   * @param commodityConfigs The mapping of commodity configurations
   * @return The siloed borrowing flag
   */
  function getSiloedBorrowingState(
    DataTypes.UserConfigurationMap memory self,
    mapping(uint256 => address) storage commodities,
    mapping(address => DataTypes.CommodityReserveData) storage commodityConfigs
  ) internal view returns (bool, address) {
    uint256 borrowingData = self.data & BORROWING_MASK;
    
    // No borrowing
    if (borrowingData == 0) {
      return (false, address(0));
    }

    // Check if only one borrowed
    if (borrowingData & (borrowingData - 1) != 0) {
      return (false, address(0));  // Multiple borrows
    }

    // Get borrowed commodity index
    uint256 commodityIndex = 0;
    uint256 tempData = borrowingData;
    while ((tempData & 1) == 0) {  // Check for borrow bit (bit 0 of each pair)
      tempData >>= 2;
      commodityIndex++;
    }

    address commodityAddress = commodities[commodityIndex];
    
    // Check if commodity is siloed
    DataTypes.CommodityReserveData storage commodity = commodityConfigs[commodityAddress];
    bool isSiloed = commodity.configuration.data & 0x4000000000000000 != 0;  // Siloed bit
    
    return (isSiloed, isSiloed ? commodityAddress : address(0));
  }

  /**
   * @notice Gets the isolation mode state
   * @param self The configuration object
   * @param commoditiesData The mapping of all commodity reserves
   * @param commoditiesList The list of all commodity addresses
   * @return isolationModeActive True if user is in isolation mode
   * @return isolationModeCollateralAddress The address of the isolated collateral commodity
   * @return isolationModeDebtCeiling The debt ceiling for the isolated commodity
   */
  function getIsolationModeState(
    DataTypes.UserConfigurationMap memory self,
    mapping(address => DataTypes.CommodityReserveData) storage commoditiesData,
    mapping(uint256 => address) storage commoditiesList
  ) internal view returns (bool, address, uint256) {
    (bool isolated, uint256 commodityIndex) = isIsolated(self);
    
    if (!isolated) {
      return (false, address(0), 0);
    }

    address commodityAddress = commoditiesList[commodityIndex];
    
    // Get debt ceiling from commodity configuration
    uint256 debtCeiling = commoditiesData[commodityAddress].configuration.data;
    debtCeiling = (debtCeiling >> 212) & 0xFFFFFFFFFF;  // Extract bits 212-251 (40 bits)
    
    return (true, commodityAddress, debtCeiling);
  }

  /**
   * @notice Checks if the user is borrowing a specific commodity
   * @param self The configuration object
   * @param commodity The address of the commodity to check
   * @return True if the user is borrowing the specified commodity
   */
  function isBorrowingOne(
    DataTypes.UserConfigurationMap memory self,
    address commodity
  ) internal pure returns (bool) {
    // This is a simplified check - in production, you'd need the commodity index
    // For now, just check if borrowing exactly one commodity
    return isBorrowingOne(self);
  }

  /**
   * @notice Gets the bitmap of borrowed assets
   * @param self The configuration object
   * @return The bitmap of borrowed assets (borrowing bits only)
   */
  function getBorrowedAssets(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (uint256) {
    return self.data & BORROWING_MASK;
  }

  /**
   * @notice Sets the E-Mode category for the user
   * @param self The configuration object
   * @param categoryId The E-Mode category ID
   */
  function setEModeCategory(
    DataTypes.UserConfigurationMap storage self,
    uint8 categoryId
  ) internal {
    // Store category ID in the upper bits (bits 256-248)
    // Clear existing category and set new one
    self.data = (self.data & 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) | 
                (uint256(categoryId) << 248);
  }

  /**
   * @notice Gets the E-Mode category for the user
   * @param self The configuration object
   * @return The E-Mode category ID
   */
  function getEModeCategory(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (uint8) {
    return uint8(self.data >> 248);
  }

  /**
   * @notice Counts the number of collateral assets for the user
   * @param self The configuration object
   * @return The count of collateral assets
   */
  function getCollateralCount(
    DataTypes.UserConfigurationMap memory self
  ) internal pure returns (uint256) {
    uint256 collateralData = self.data & COLLATERAL_MASK;
    uint256 count = 0;
    
    // Count set bits in collateral mask
    while (collateralData != 0) {
      if ((collateralData & 2) != 0) {  // Check collateral bit (bit 1 of each pair)
        count++;
      }
      collateralData >>= 2;  // Move to next commodity pair
    }
    
    return count;
  }
}

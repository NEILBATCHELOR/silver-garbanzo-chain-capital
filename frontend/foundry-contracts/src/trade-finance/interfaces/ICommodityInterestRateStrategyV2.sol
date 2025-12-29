// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IReserveInterestRateStrategy} from "./IReserveInterestRateStrategy.sol";
import {IPoolAddressesProvider} from "./IPoolAddressesProvider.sol";

/**
 * @title ICommodityInterestRateStrategyV2
 * @notice Interface for commodity-specific interest rate strategy
 * @dev Extends base rate strategy with seasonal and commodity market adjustments
 */
interface ICommodityInterestRateStrategyV2 is IReserveInterestRateStrategy {
    
    // ============ Structs ============
    
    struct InterestRateData {
        uint16 optimalUsageRatio;
        uint32 baseVariableBorrowRate;
        uint32 variableRateSlope1;
        uint32 variableRateSlope2;
    }
    
    struct InterestRateDataRay {
        uint256 optimalUsageRatio;
        uint256 baseVariableBorrowRate;
        uint256 variableRateSlope1;
        uint256 variableRateSlope2;
    }
    
    struct CommodityRateConfig {
        uint8 commodityType;
        bool seasonalEnabled;
        uint16 storageAdjustmentBps;
        uint16 qualityDecayRateBps;
        int16 contangoAdjustmentBps;
    }
    
    // ============ Events ============
    
    event RateDataUpdate(
        address indexed reserve,
        uint256 optimalUsageRatio,
        uint256 baseVariableBorrowRate,
        uint256 variableRateSlope1,
        uint256 variableRateSlope2
    );
    
    event CommodityConfigUpdate(
        address indexed reserve,
        uint8 commodityType,
        bool seasonalEnabled,
        uint16 storageAdjustmentBps,
        uint16 qualityDecayRateBps,
        int16 contangoAdjustmentBps
    );
    
    event SeasonalMultipliersUpdate(
        uint8 indexed commodityType,
        uint16[12] multipliers
    );
    
    // ============ View Functions ============
    
    function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider);
    function MAX_BORROW_RATE() external view returns (uint256);
    function MIN_OPTIMAL_POINT() external view returns (uint256);
    function MAX_OPTIMAL_POINT() external view returns (uint256);
    
    function getInterestRateData(address reserve) external view returns (InterestRateDataRay memory);
    function getInterestRateDataBps(address reserve) external view returns (InterestRateData memory);
    function getCommodityConfig(address reserve) external view returns (CommodityRateConfig memory);
    function getSeasonalMultipliers(uint8 commodityType) external view returns (uint16[12] memory);
    
    function getOptimalUsageRatio(address reserve) external view returns (uint256);
    function getVariableRateSlope1(address reserve) external view returns (uint256);
    function getVariableRateSlope2(address reserve) external view returns (uint256);
    function getBaseVariableBorrowRate(address reserve) external view returns (uint256);
    function getMaxVariableBorrowRate(address reserve) external view returns (uint256);
    function getCurrentSeasonalMultiplier(address reserve) external view returns (uint256);
    
    // ============ Admin Functions ============
    
    function setInterestRateParams(address reserve, InterestRateData calldata rateData) external;
    function setCommodityConfig(address reserve, CommodityRateConfig calldata config) external;
    function setSeasonalMultipliers(uint8 commodityType, uint16[12] calldata multipliers) external;
}

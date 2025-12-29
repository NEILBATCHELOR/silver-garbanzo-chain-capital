// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFuturesCurveOracle
 * @notice Interface for futures curve data integration
 * @dev Provides contango/backwardation signals and basis spread data
 *      for commodity interest rate adjustments
 */
interface IFuturesCurveOracle {
    
    // ============ Structs ============
    
    /**
     * @notice Futures curve data for a commodity
     * @param spotPrice Current spot price in USD (8 decimals)
     * @param nearMonthPrice Nearest month futures price
     * @param farMonthPrice Further out futures price
     * @param nearMonthExpiry Expiry timestamp for near month contract
     * @param farMonthExpiry Expiry timestamp for far month contract
     * @param lastUpdateTimestamp When this data was last updated
     * @param isContango True if futures > spot (normal carry market)
     * @param annualizedBasisBps Annualized basis in bps (positive = contango)
     */
    struct FuturesCurveData {
        uint256 spotPrice;
        uint256 nearMonthPrice;
        uint256 farMonthPrice;
        uint256 nearMonthExpiry;
        uint256 farMonthExpiry;
        uint256 lastUpdateTimestamp;
        bool isContango;
        int256 annualizedBasisBps;
    }
    
    /**
     * @notice Regional price premium/discount data
     * @param region Region identifier (e.g., LME, COMEX, SHFE)
     * @param premiumBps Premium/discount vs benchmark in bps
     * @param lastUpdateTimestamp When this data was last updated
     */
    struct RegionalBasis {
        bytes32 region;
        int256 premiumBps;
        uint256 lastUpdateTimestamp;
    }
    
    // ============ Events ============
    
    event FuturesCurveUpdated(
        address indexed commodity,
        uint256 spotPrice,
        uint256 nearMonthPrice,
        bool isContango,
        int256 annualizedBasisBps
    );
    
    event RegionalBasisUpdated(
        address indexed commodity,
        bytes32 indexed region,
        int256 premiumBps
    );
    
    // ============ View Functions ============
    
    /**
     * @notice Get futures curve data for a commodity
     * @param commodity The commodity token address
     * @return data The futures curve data
     */
    function getFuturesCurveData(
        address commodity
    ) external view returns (FuturesCurveData memory data);
    
    /**
     * @notice Get the annualized basis for a commodity
     * @param commodity The commodity token address
     * @return basisBps Annualized basis in bps (positive = contango)
     */
    function getAnnualizedBasis(
        address commodity
    ) external view returns (int256 basisBps);
    
    /**
     * @notice Check if a commodity is in contango
     * @param commodity The commodity token address
     * @return True if futures price > spot price
     */
    function isContango(address commodity) external view returns (bool);
    
    /**
     * @notice Get regional basis adjustment
     * @param commodity The commodity token address
     * @param region The region identifier
     * @return premiumBps Premium/discount in bps
     */
    function getRegionalBasis(
        address commodity,
        bytes32 region
    ) external view returns (int256 premiumBps);
    
    /**
     * @notice Check if futures curve data is stale
     * @param commodity The commodity token address
     * @param maxAge Maximum acceptable age in seconds
     * @return True if data is fresh
     */
    function isFresh(
        address commodity,
        uint256 maxAge
    ) external view returns (bool);
}

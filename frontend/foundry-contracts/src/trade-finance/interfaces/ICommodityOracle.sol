// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICommodityOracle
 * @notice Interface for the main commodity oracle
 */
interface ICommodityOracle {
    enum CommodityType {
        PRECIOUS_METAL,
        BASE_METAL,
        ENERGY,
        AGRICULTURAL,
        CARBON_CREDIT
    }

    function getValueUSD(
        address commodityToken,
        uint256 amount
    ) external view returns (uint256 valueUSD, uint256 confidence);

    function getAdjustedValueUSD(
        address commodityToken,
        uint256 amount,
        string memory quality,
        uint256 certificateDate
    ) external view returns (uint256 adjustedValue, uint256 totalDiscountBps);

    function getPriceData(
        address commodityToken
    ) external view returns (uint256 price, uint256 confidence, uint256 timestamp);

    function isPriceFeedActive(address commodityToken) external view returns (bool);
    function getCommodityType(address commodityToken) external view returns (CommodityType);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDutchAuctionLiquidator
 * @notice Interface for Dutch auction liquidation mechanism
 */
interface IDutchAuctionLiquidator {
    
    struct AuctionConfig {
        uint256 duration;
        uint256 startDiscountBps;
        uint256 endDiscountBps;
        bool useExponentialDecay;
        bool allowPhysicalDelivery;
    }
    
    struct Auction {
        address user;
        address collateralAsset;
        address debtAsset;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 startTime;
        uint256 duration;
        uint256 startPrice;
        uint256 startDiscountBps;
        uint256 endDiscountBps;
        bool useExponentialDecay;
        bool active;
        bool physicalDeliveryRequested;
    }
    
    /**
     * @notice Configure auction parameters
     */
    function configureAuction(
        bytes32 commodityType,
        uint256 duration,
        uint256 startDiscountBps,
        uint256 endDiscountBps,
        bool useExponentialDecay,
        bool allowPhysicalDelivery
    ) external;
    
    /**
     * @notice Start Dutch auction
     */
    function startAuction(
        address user,
        address collateralAsset,
        address debtAsset,
        bytes32 commodityType
    ) external returns (uint256 auctionId);
    
    /**
     * @notice Execute auction
     */
    function executeAuction(
        uint256 auctionId,
        uint256 maxPayment
    ) external returns (uint256 collateralReceived, uint256 debtPaid);
    
    /**
     * @notice Request physical delivery
     */
    function requestPhysicalDelivery(uint256 auctionId) external;
    
    /**
     * @notice Get current auction price
     */
    function getCurrentPrice(uint256 auctionId) external view returns (uint256);
    
    /**
     * @notice Get auction details
     */
    function getAuction(uint256 auctionId) external view returns (Auction memory);
}

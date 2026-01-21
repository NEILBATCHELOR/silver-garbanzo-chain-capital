// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Exchange.sol";
import "./ExchangeTypes.sol";
import "./Bank.sol";

/// @title Chain Capital Automated Market Maker - Product Agnostic
/// @notice Provides liquidity for ANY Chain Capital product on Injective DEX
/// @dev Dynamically accepts products via product_id mapping to database
contract ChainCapitalMarketMaker {
    IExchangeModule public constant EXCHANGE = 
        IExchangeModule(0x0000000000000000000000000000000000000065);
    
    IBankModule public constant BANK = 
        IBankModule(0x0000000000000000000000000000000000000064);
    
    address public owner;
    address public backendOracle; // Backend service address for product data
    
    // Link to Chain Capital product system
    struct ProductMarketConfig {
        string productId;       // UUID from products table
        string marketID;        // Injective market ID
        string baseDenom;       // Token denom (factory/... or erc20:0x...)
        string quoteDenom;      // USDT/USDC
        string productType;     // bond, reit, fund, climate, etc.
        uint256 spread;         // Basis points
        uint256 orderSize;      // Native decimals
        uint256 minOrderSize;   // Minimum order size
        uint256 maxOrderSize;   // Maximum order size
        bool useNAVPricing;     // Use NAV instead of market price
        bool active;
    }
    
    // Mapping: productId => MarketConfig
    mapping(string => ProductMarketConfig) public productMarkets;
    string[] public productIds;
    
    // Market ID => Product ID reverse lookup
    mapping(string => string) public marketToProduct;
    
    event MarketMakerDeployed(address indexed owner, address oracle);
    event ProductMarketConfigured(string indexed productId, string marketID, uint256 spread);
    event OrdersPlaced(string indexed productId, string marketID, string bidHash, string askHash);
    event OrdersCancelled(string indexed productId, string marketID, uint256 count);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    constructor(address _backendOracle) {
        owner = msg.sender;
        backendOracle = _backendOracle;
        emit MarketMakerDeployed(owner, _backendOracle);
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyOracleOrOwner() {
        require(msg.sender == owner || msg.sender == backendOracle, "Not authorized");
        _;
    }
    
    /// @notice Configure market for ANY product type
    /// @param productId UUID from products table
    /// @param config Complete market configuration
    function configureProductMarket(
        string memory productId,
        ProductMarketConfig memory config
    ) public onlyOracleOrOwner {
        require(bytes(config.marketID).length > 0, "Invalid market ID");
        require(config.spread > 0 && config.spread < 10000, "Invalid spread");
        require(config.orderSize > 0, "Invalid order size");
        
        // Store configuration
        productMarkets[productId] = config;
        productIds.push(productId);
        marketToProduct[config.marketID] = productId;
        
        emit ProductMarketConfigured(productId, config.marketID, config.spread);
    }
    
    /// @notice Provide liquidity for a product
    /// @param productId Product to provide liquidity for
    /// @param midPrice Current mid-price (18 decimals)
    /// @param subaccountID Subaccount for orders
    function provideProductLiquidity(
        string memory productId,
        ExchangeTypes.UFixed256x18 midPrice,
        string memory subaccountID
    ) external onlyOracleOrOwner returns (string memory bidHash, string memory askHash) {
        ProductMarketConfig memory config = productMarkets[productId];
        require(config.active, "Product market not active");
        
        // Calculate spread-adjusted prices
        uint256 spreadMultiplier = (10000 - config.spread) * 1e14;
        uint256 bidPriceRaw = ExchangeTypes.UFixed256x18.unwrap(midPrice) * spreadMultiplier / 1e18;
        
        spreadMultiplier = (10000 + config.spread) * 1e14;
        uint256 askPriceRaw = ExchangeTypes.UFixed256x18.unwrap(midPrice) * spreadMultiplier / 1e18;
        
        // Dynamic order size based on product config
        ExchangeTypes.UFixed256x18 quantity = ExchangeTypes.UFixed256x18.wrap(
            config.orderSize * 1e12 // Scale to API format
        );
        
        // Create orders
        IExchangeModule.SpotOrder memory bidOrder = IExchangeModule.SpotOrder({
            marketID: config.marketID,
            subaccountID: subaccountID,
            feeRecipient: addressToString(address(this)),
            price: ExchangeTypes.UFixed256x18.wrap(bidPriceRaw),
            quantity: quantity,
            cid: "",
            orderType: "buyPostOnly",
            triggerPrice: ExchangeTypes.UFixed256x18.wrap(0)
        });
        
        IExchangeModule.SpotOrder memory askOrder = IExchangeModule.SpotOrder({
            marketID: config.marketID,
            subaccountID: subaccountID,
            feeRecipient: addressToString(address(this)),
            price: ExchangeTypes.UFixed256x18.wrap(askPriceRaw),
            quantity: quantity,
            cid: "",
            orderType: "sellPostOnly",
            triggerPrice: ExchangeTypes.UFixed256x18.wrap(0)
        });
        
        // Place orders
        IExchangeModule.CreateSpotLimitOrderResponse memory bidResponse = 
            EXCHANGE.createSpotLimitOrder(address(this), bidOrder);
        
        IExchangeModule.CreateSpotLimitOrderResponse memory askResponse = 
            EXCHANGE.createSpotLimitOrder(address(this), askOrder);
        
        emit OrdersPlaced(productId, config.marketID, bidResponse.orderHash, askResponse.orderHash);
        
        return (bidResponse.orderHash, askResponse.orderHash);
    }
    
    /// @notice Cancel all orders for a product
    function cancelProductOrders(
        string memory productId,
        string memory subaccountID
    ) external onlyOracleOrOwner {
        ProductMarketConfig memory config = productMarkets[productId];
        require(bytes(config.marketID).length > 0, "Product not configured");
        
        string[] memory marketsToCancel = new string[](1);
        marketsToCancel[0] = config.marketID;
        
        IExchangeModule.BatchUpdateOrdersRequest memory request = 
            IExchangeModule.BatchUpdateOrdersRequest({
                subaccountID: subaccountID,
                spotMarketIDsToCancelAll: marketsToCancel,
                spotOrdersToCancel: new IExchangeModule.OrderData[](0),
                spotOrdersToCreate: new IExchangeModule.SpotOrder[](0),
                derivativeMarketIDsToCancelAll: new string[](0),
                derivativeOrdersToCancel: new IExchangeModule.OrderData[](0),
                derivativeOrdersToCreate: new IExchangeModule.DerivativeOrder[](0)
            });
        
        EXCHANGE.batchUpdateOrders(address(this), request);
        emit OrdersCancelled(productId, config.marketID, 0);
    }
    
    /// @notice Batch configure multiple products
    function batchConfigureProducts(
        string[] memory productIdList,
        ProductMarketConfig[] memory configs
    ) external onlyOracleOrOwner {
        require(productIdList.length == configs.length, "Length mismatch");
        
        for (uint256 i = 0; i < productIdList.length; i++) {
            configureProductMarket(productIdList[i], configs[i]);
        }
    }
    
    /// @notice Update backend oracle address
    function updateOracle(address newOracle) external onlyOwner {
        address oldOracle = backendOracle;
        backendOracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }
    
    /// @notice Get product configuration
    function getProductMarket(string memory productId) 
        external 
        view 
        returns (ProductMarketConfig memory) 
    {
        return productMarkets[productId];
    }
    
    /// @notice Get all configured products
    function getAllProducts() external view returns (string[] memory) {
        return productIds;
    }
    
    /// @notice Deposit funds for trading
    function depositToSubaccount(
        string memory subaccountID,
        string memory denom,
        uint256 amount
    ) external onlyOwner {
        EXCHANGE.deposit(address(this), subaccountID, denom, amount);
    }
    
    /// @notice Withdraw funds
    function withdrawFromSubaccount(
        string memory subaccountID,
        string memory denom,
        uint256 amount
    ) external onlyOwner {
        EXCHANGE.withdraw(address(this), subaccountID, denom, amount);
    }
    
    /// @notice Helper: Convert address to string
    function addressToString(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint8(data[i] >> 4)];
            str[3+i*2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}

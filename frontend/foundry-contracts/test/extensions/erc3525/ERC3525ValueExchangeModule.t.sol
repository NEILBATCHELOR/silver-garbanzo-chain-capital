// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../../src/extensions/erc3525/ERC3525ValueExchangeModule.sol";
import "../../../src/extensions/erc3525/interfaces/IERC3525ValueExchangeModule.sol";

/**
 * @title ERC3525ValueExchangeModuleTest
 * @notice Comprehensive tests for cross-slot value exchange functionality
 * @dev Tests exchange rates, value transfers, and liquidity pools
 */
contract ERC3525ValueExchangeModuleTest is Test {
    
    ERC3525ValueExchangeModule public exchangeModule;
    MockERC3525Token public tokenContract;
    
    address public admin = address(1);
    address public exchangeAdmin = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    address public liquidityProvider = address(5);
    address public unauthorized = address(6);
    
    uint256 public constant SLOT_USD = 1;
    uint256 public constant SLOT_EUR = 2;
    uint256 public constant SLOT_GBP = 3;
    
    uint256 public constant BASIS_POINTS = 10000;
    bytes32 public constant EXCHANGE_ADMIN_ROLE = keccak256("EXCHANGE_ADMIN_ROLE");
    
    event ExchangeRateSet(uint256 indexed fromSlot, uint256 indexed toSlot, uint256 rate, address indexed setter);
    event ValueExchanged(uint256 indexed fromTokenId, uint256 indexed toTokenId, uint256 fromValue, uint256 toValue);
    event ExchangePoolCreated(uint256 indexed slot1, uint256 indexed slot2, uint256 initialLiquidity);
    event LiquidityAdded(uint256 indexed poolId, uint256 amount, address indexed provider);
    event LiquidityRemoved(uint256 indexed poolId, uint256 amount, address indexed provider);
    
    function setUp() public {
        // Deploy mock token
        tokenContract = new MockERC3525Token();
        
        // Deploy exchange module
        exchangeModule = new ERC3525ValueExchangeModule();
        exchangeModule.initialize(admin, address(tokenContract));
        
        // Setup roles
        vm.prank(admin);
        exchangeModule.grantRole(EXCHANGE_ADMIN_ROLE, exchangeAdmin);
        
        // Mint test tokens
        tokenContract.mint(user1, 1, SLOT_USD, 1000 ether);
        tokenContract.mint(user1, 2, SLOT_EUR, 1000 ether);
        tokenContract.mint(user2, 3, SLOT_GBP, 1000 ether);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public {
        assertTrue(exchangeModule.hasRole(exchangeModule.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(exchangeModule.hasRole(EXCHANGE_ADMIN_ROLE, admin));
        assertTrue(exchangeModule.hasRole(exchangeModule.UPGRADER_ROLE(), admin));
        assertEq(exchangeModule.tokenContract(), address(tokenContract));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        exchangeModule.initialize(admin, address(tokenContract));
    }
    
    // ============ Exchange Rate Management Tests ============
    
    function testSetExchangeRate() public {
        uint256 rate = 11000; // 1.1x (110%)
        
        vm.prank(exchangeAdmin);
        vm.expectEmit(true, true, false, true);
        emit ExchangeRateSet(SLOT_USD, SLOT_EUR, rate, exchangeAdmin);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, rate);
        
        assertEq(exchangeModule.getExchangeRate(SLOT_USD, SLOT_EUR), rate);
        assertTrue(exchangeModule.isExchangeEnabled(SLOT_USD, SLOT_EUR));
    }
    
    function testSetMultipleExchangeRates() public {
        vm.startPrank(exchangeAdmin);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 11000); // 1 USD = 1.1 EUR
        exchangeModule.setExchangeRate(SLOT_EUR, SLOT_USD, 9090);  // 1 EUR = 0.909 USD
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_GBP, 8000);  // 1 USD = 0.8 GBP
        vm.stopPrank();
        
        assertEq(exchangeModule.getExchangeRate(SLOT_USD, SLOT_EUR), 11000);
        assertEq(exchangeModule.getExchangeRate(SLOT_EUR, SLOT_USD), 9090);
        assertEq(exchangeModule.getExchangeRate(SLOT_USD, SLOT_GBP), 8000);
    }
    
    function testCannotSetSameSlotExchange() public {
        vm.prank(exchangeAdmin);
        vm.expectRevert(IERC3525ValueExchangeModule.SameSlotExchange.selector);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_USD, 10000);
    }
    
    function testCannotSetInvalidRateTooLow() public {
        vm.prank(exchangeAdmin);
        vm.expectRevert(IERC3525ValueExchangeModule.InvalidExchangeRate.selector);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 0);
    }
    
    function testCannotSetInvalidRateTooHigh() public {
        vm.prank(exchangeAdmin);
        vm.expectRevert(IERC3525ValueExchangeModule.InvalidExchangeRate.selector);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 1000001);
    }
    
    function testUnauthorizedCannotSetRate() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 11000);
    }
    
    // ============ Exchange Calculation Tests ============
    
    function testCalculateExchangeAmount() public {
        vm.prank(exchangeAdmin);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 11000); // 110%
        
        uint256 fromValue = 100 ether;
        uint256 toValue = exchangeModule.calculateExchangeAmount(SLOT_USD, SLOT_EUR, fromValue);
        
        assertEq(toValue, 110 ether); // 100 * 1.1 = 110
    }
    
    function testCalculateExchangeWithNoRate() public {
        uint256 toValue = exchangeModule.calculateExchangeAmount(SLOT_USD, SLOT_EUR, 100 ether);
        assertEq(toValue, 0);
    }
    
    function testEnableDisableExchange() public {
        vm.startPrank(exchangeAdmin);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 11000);
        assertTrue(exchangeModule.isExchangeEnabled(SLOT_USD, SLOT_EUR));
        
        exchangeModule.enableExchange(SLOT_USD, SLOT_EUR, false);
        assertFalse(exchangeModule.isExchangeEnabled(SLOT_USD, SLOT_EUR));
        
        exchangeModule.enableExchange(SLOT_USD, SLOT_EUR, true);
        assertTrue(exchangeModule.isExchangeEnabled(SLOT_USD, SLOT_EUR));
        vm.stopPrank();
    }
    
    function testGlobalExchangeDisable() public {
        vm.startPrank(exchangeAdmin);
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 11000);
        vm.stopPrank();
        
        vm.prank(admin);
        exchangeModule.setGlobalExchangeEnabled(false);
        
        assertFalse(exchangeModule.isExchangeEnabled(SLOT_USD, SLOT_EUR));
    }
    
    // ============ Liquidity Pool Tests ============
    
    function testCreateExchangePool() public {
        vm.prank(exchangeAdmin);
        vm.expectEmit(true, true, false, true);
        emit ExchangePoolCreated(SLOT_USD, SLOT_EUR, 1000 ether);
        uint256 poolId = exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 1000 ether);
        
        assertEq(poolId, 1);
        assertEq(exchangeModule.getPoolLiquidity(poolId), 1000 ether);
        
        (uint256 slot1, uint256 slot2, uint256 liquidity, bool active) = exchangeModule.getPoolInfo(poolId);
        assertEq(slot1, SLOT_USD);
        assertEq(slot2, SLOT_EUR);
        assertEq(liquidity, 1000 ether);
        assertTrue(active);
    }
    
    function testCannotCreateDuplicatePool() public {
        vm.startPrank(exchangeAdmin);
        exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 1000 ether);
        
        vm.expectRevert("Pool already exists");
        exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 500 ether);
        vm.stopPrank();
    }
    
    function testCannotCreateSameSlotPool() public {
        vm.prank(exchangeAdmin);
        vm.expectRevert(IERC3525ValueExchangeModule.SameSlotExchange.selector);
        exchangeModule.createExchangePool(SLOT_USD, SLOT_USD, 1000 ether);
    }
    
    function testAddLiquidity() public {
        vm.prank(exchangeAdmin);
        uint256 poolId = exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 1000 ether);
        
        vm.prank(liquidityProvider);
        vm.expectEmit(true, false, false, true);
        emit LiquidityAdded(poolId, 500 ether, liquidityProvider);
        exchangeModule.addLiquidity(poolId, 500 ether);
        
        assertEq(exchangeModule.getPoolLiquidity(poolId), 1500 ether);
        assertEq(exchangeModule.getProviderLiquidity(poolId, liquidityProvider), 500 ether);
    }
    
    function testRemoveLiquidity() public {
        vm.prank(exchangeAdmin);
        uint256 poolId = exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 1000 ether);
        
        vm.startPrank(liquidityProvider);
        exchangeModule.addLiquidity(poolId, 500 ether);
        
        vm.expectEmit(true, false, false, true);
        emit LiquidityRemoved(poolId, 200 ether, liquidityProvider);
        exchangeModule.removeLiquidity(poolId, 200 ether);
        vm.stopPrank();
        
        assertEq(exchangeModule.getPoolLiquidity(poolId), 1300 ether);
        assertEq(exchangeModule.getProviderLiquidity(poolId, liquidityProvider), 300 ether);
    }
    
    function testCannotRemoveMoreThanProvided() public {
        vm.prank(exchangeAdmin);
        uint256 poolId = exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 1000 ether);
        
        vm.startPrank(liquidityProvider);
        exchangeModule.addLiquidity(poolId, 500 ether);
        
        vm.expectRevert("Insufficient provider liquidity");
        exchangeModule.removeLiquidity(poolId, 600 ether);
        vm.stopPrank();
    }
    
    function testMultipleLiquidityProviders() public {
        vm.prank(exchangeAdmin);
        uint256 poolId = exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 1000 ether);
        
        vm.prank(liquidityProvider);
        exchangeModule.addLiquidity(poolId, 500 ether);
        
        vm.prank(user1);
        exchangeModule.addLiquidity(poolId, 300 ether);
        
        assertEq(exchangeModule.getPoolLiquidity(poolId), 1800 ether);
        assertEq(exchangeModule.getProviderLiquidity(poolId, liquidityProvider), 500 ether);
        assertEq(exchangeModule.getProviderLiquidity(poolId, user1), 300 ether);
    }
    
    // ============ Admin Function Tests ============
    
    function testSetExchangeLimits() public {
        vm.startPrank(exchangeAdmin);
        exchangeModule.setMinExchangeAmount(10 ether);
        exchangeModule.setMaxExchangeAmount(10000 ether);
        vm.stopPrank();
        
        (uint256 min, uint256 max) = exchangeModule.getExchangeLimits();
        assertEq(min, 10 ether);
        assertEq(max, 10000 ether);
    }
    
    // ============ Complex Scenario Tests ============
    
    function testCompleteExchangeSetup() public {
        vm.startPrank(exchangeAdmin);
        
        // Set up exchange rates
        exchangeModule.setExchangeRate(SLOT_USD, SLOT_EUR, 11000); // 1 USD = 1.1 EUR
        exchangeModule.setExchangeRate(SLOT_EUR, SLOT_GBP, 8500);  // 1 EUR = 0.85 GBP
        
        // Create liquidity pools
        uint256 pool1 = exchangeModule.createExchangePool(SLOT_USD, SLOT_EUR, 10000 ether);
        uint256 pool2 = exchangeModule.createExchangePool(SLOT_EUR, SLOT_GBP, 5000 ether);
        
        // Set exchange limits
        exchangeModule.setMinExchangeAmount(1 ether);
        exchangeModule.setMaxExchangeAmount(1000 ether);
        
        vm.stopPrank();
        
        // Verify setup
        assertTrue(exchangeModule.isExchangeEnabled(SLOT_USD, SLOT_EUR));
        assertTrue(exchangeModule.isExchangeEnabled(SLOT_EUR, SLOT_GBP));
        assertEq(exchangeModule.getPoolLiquidity(pool1), 10000 ether);
        assertEq(exchangeModule.getPoolLiquidity(pool2), 5000 ether);
        
        uint256 calculatedValue = exchangeModule.calculateExchangeAmount(SLOT_USD, SLOT_EUR, 100 ether);
        assertEq(calculatedValue, 110 ether);
    }
    
    // ============ ERC-165 Interface Support Tests ============
    
    function testSupportsInterface() public {
        assertTrue(exchangeModule.supportsInterface(type(IERC3525ValueExchangeModule).interfaceId));
    }
}


// ============ Mock Contracts for Testing ============

/**
 * @notice Mock ERC3525 token for testing value exchange functionality
 */
contract MockERC3525Token {
    struct Token {
        uint256 id;
        uint256 slot;
        uint256 value;
        address owner;
    }
    
    mapping(uint256 => Token) public tokens;
    uint256 public nextTokenId;
    
    function mint(address to, uint256 tokenId, uint256 slot, uint256 value) external {
        tokens[tokenId] = Token({
            id: tokenId,
            slot: slot,
            value: value,
            owner: to
        });
        if (tokenId >= nextTokenId) {
            nextTokenId = tokenId + 1;
        }
    }
    
    function slotOf(uint256 tokenId) external view returns (uint256) {
        return tokens[tokenId].slot;
    }
    
    function balanceOf(uint256 tokenId) external view returns (uint256) {
        return tokens[tokenId].value;
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        return tokens[tokenId].owner;
    }
    
    function transferValueFrom(
        uint256 fromTokenId,
        uint256 toTokenId,
        uint256 value
    ) external returns (bool) {
        require(tokens[fromTokenId].value >= value, "Insufficient value");
        tokens[fromTokenId].value -= value;
        tokens[toTokenId].value += value;
        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC4626YieldStrategyModule} from "src/extensions/erc4626/ERC4626YieldStrategyModule.sol";
import {IERC4626YieldStrategyModule} from "src/extensions/erc4626/interfaces/IERC4626YieldStrategyModule.sol";

contract MockYieldStrategy {
    uint256 public yieldAmount;
    
    function setYield(uint256 amount) external {
        yieldAmount = amount;
    }
    
    function harvest() external returns (uint256) {
        return yieldAmount;
    }
}

contract ERC4626YieldStrategyModuleTest is Test {
    ERC4626YieldStrategyModule public module;
    MockYieldStrategy public mockStrategy1;
    MockYieldStrategy public mockStrategy2;
    
    // Test accounts
    address public owner = makeAddr("owner");
    address public strategyManager = makeAddr("strategyManager");
    address public vault = makeAddr("vault");
    address public unauthorized = makeAddr("unauthorized");
    
    // Test parameters
    uint256 public constant HARVEST_FREQUENCY = 1 days;
    uint256 public constant REBALANCE_THRESHOLD = 500; // 5%
    uint256 public constant BASIS_POINTS = 10000; // 100%
    
    // Events
    event StrategyAdded(uint256 indexed strategyId, address indexed protocol, uint256 allocation);
    event StrategyRemoved(uint256 indexed strategyId);
    event StrategyUpdated(uint256 indexed strategyId, uint256 newAllocation);
    event YieldHarvested(uint256 indexed strategyId, uint256 yield);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock strategies
        mockStrategy1 = new MockYieldStrategy();
        mockStrategy2 = new MockYieldStrategy();
        
        // Deploy and initialize module
        module = new ERC4626YieldStrategyModule();
        module.initialize(owner, vault, HARVEST_FREQUENCY, REBALANCE_THRESHOLD);
        
        // Grant strategy manager role
        module.grantRole(module.STRATEGY_MANAGER_ROLE(), strategyManager);
        
        vm.stopPrank();
    }
    
    // ===== INITIALIZATION TESTS =====
    
    function test_Initialize() public view {
        assertEq(module.vault(), vault);
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(module.hasRole(module.STRATEGY_MANAGER_ROLE(), owner));
        assertTrue(module.hasRole(module.STRATEGY_MANAGER_ROLE(), strategyManager));
    }
    
    function test_RevertWhen_InitializeTwice() public {
        vm.expectRevert();
        module.initialize(owner, vault, HARVEST_FREQUENCY, REBALANCE_THRESHOLD);
    }
    
    // ===== STRATEGY MANAGEMENT TESTS =====
    
    function test_AddStrategy_Success() public {
        vm.prank(strategyManager);
        
        vm.expectEmit(true, true, true, true);
        emit StrategyAdded(1, address(mockStrategy1), 5000);
        
        uint256 strategyId = module.addStrategy(address(mockStrategy1), 5000);
        
        assertEq(strategyId, 1);
        
        (address protocol, uint256 allocation, bool active,,,) = module.getStrategy(strategyId);
        assertEq(protocol, address(mockStrategy1));
        assertEq(allocation, 5000);
        assertTrue(active);
    }
    
    function test_AddMultipleStrategies() public {
        vm.startPrank(strategyManager);
        
        uint256 id1 = module.addStrategy(address(mockStrategy1), 4000);
        uint256 id2 = module.addStrategy(address(mockStrategy2), 6000);
        
        assertEq(id1, 1);
        assertEq(id2, 2);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_AddStrategy_InvalidProtocol() public {
        vm.prank(strategyManager);
        vm.expectRevert(IERC4626YieldStrategyModule.InvalidStrategy.selector);
        module.addStrategy(address(0), 5000);
    }
    
    function test_RevertWhen_AddStrategy_AllocationExceeded() public {
        vm.startPrank(strategyManager);
        module.addStrategy(address(mockStrategy1), 7000);
        
        vm.expectRevert(IERC4626YieldStrategyModule.AllocationExceeded.selector);
        module.addStrategy(address(mockStrategy2), 4000); // Total would be 11000 > 10000
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_AddStrategy_Unauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.addStrategy(address(mockStrategy1), 5000);
    }
    
    function test_RemoveStrategy_Success() public {
        vm.startPrank(strategyManager);
        
        uint256 strategyId = module.addStrategy(address(mockStrategy1), 5000);
        
        vm.expectEmit(true, true, true, true);
        emit StrategyRemoved(strategyId);
        
        module.removeStrategy(strategyId);
        
        (,, bool active,,,) = module.getStrategy(strategyId);
        assertFalse(active);
        
        vm.stopPrank();
    }
}

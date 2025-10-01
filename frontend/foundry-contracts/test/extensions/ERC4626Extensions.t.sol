// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/extensions/erc4626/ERC4626FeeStrategyModule.sol";
import "../../src/extensions/erc4626/ERC4626WithdrawalQueueModule.sol";
import "../../src/extensions/erc4626/ERC4626YieldStrategyModule.sol";
import "../../src/masters/ERC4626Master.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockYieldProtocol {
    IERC20 public asset;
    uint256 public deposited;
    uint256 public yieldGenerated;
    
    constructor(address asset_) {
        asset = IERC20(asset_);
    }
    
    function deposit(uint256 amount) external {
        asset.transferFrom(msg.sender, address(this), amount);
        deposited += amount;
    }
    
    function withdraw(uint256 amount) external {
        deposited -= amount;
        asset.transfer(msg.sender, amount);
    }
    
    function harvest() external returns (uint256) {
        return yieldGenerated;
    }
    
    function pendingRewards() external view returns (uint256) {
        return yieldGenerated;
    }
    
    function setYield(uint256 amount) external {
        yieldGenerated = amount;
    }
}

contract ERC4626ExtensionsTest is Test {
    ERC4626FeeStrategyModule public feeStrategy;
    ERC4626WithdrawalQueueModule public withdrawalQueue;
    ERC4626YieldStrategyModule public yieldStrategy;
    ERC4626Master public vault;
    MockERC20 public asset;
    MockYieldProtocol public yieldProtocol;
    
    address admin = address(1);
    address user1 = address(2);
    address user2 = address(3);
    address feeRecipient = address(4);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy asset
        asset = new MockERC20();
        
        // Deploy vault
        ERC4626Master vaultImpl = new ERC4626Master();
        bytes memory vaultData = abi.encodeWithSelector(
            ERC4626Master.initialize.selector,
            address(asset),
            "Test Vault",
            "TVAULT",
            0,
            0,
            admin
        );
        ERC1967Proxy vaultProxy = new ERC1967Proxy(address(vaultImpl), vaultData);
        vault = ERC4626Master(address(vaultProxy));
        
        // Deploy Fee Strategy
        ERC4626FeeStrategyModule feeStrategyImpl = new ERC4626FeeStrategyModule();
        bytes memory feeData = abi.encodeWithSelector(
            ERC4626FeeStrategyModule.initialize.selector,
            admin,
            address(vault),
            200,  // 2% management fee
            2000, // 20% performance fee
            50,   // 0.5% withdrawal fee
            feeRecipient
        );
        ERC1967Proxy feeProxy = new ERC1967Proxy(address(feeStrategyImpl), feeData);
        feeStrategy = ERC4626FeeStrategyModule(address(feeProxy));
        
        // Deploy Withdrawal Queue
        ERC4626WithdrawalQueueModule queueImpl = new ERC4626WithdrawalQueueModule();
        bytes memory queueData = abi.encodeWithSelector(
            ERC4626WithdrawalQueueModule.initialize.selector,
            admin,
            address(vault),
            1000 * 10**18, // liquidity buffer
            100,           // max queue size
            1 hours        // min withdrawal delay
        );
        ERC1967Proxy queueProxy = new ERC1967Proxy(address(queueImpl), queueData);
        withdrawalQueue = ERC4626WithdrawalQueueModule(address(queueProxy));
        
        // Deploy Yield Strategy
        yieldProtocol = new MockYieldProtocol(address(asset));
        ERC4626YieldStrategyModule yieldImpl = new ERC4626YieldStrategyModule();
        bytes memory yieldData = abi.encodeWithSelector(
            ERC4626YieldStrategyModule.initialize.selector,
            admin,
            address(vault),
            1 hours,  // harvest frequency
            500       // rebalance threshold
        );
        ERC1967Proxy yieldProxy = new ERC1967Proxy(address(yieldImpl), yieldData);
        yieldStrategy = ERC4626YieldStrategyModule(address(yieldProxy));
        
        // Setup initial balances
        asset.transfer(user1, 10000 * 10**18);
        asset.transfer(user2, 10000 * 10**18);
        
        vm.stopPrank();
    }
    
    // ============ Fee Strategy Tests ============
    
    function testSetManagementFee() public {
        vm.prank(admin);
        feeStrategy.setManagementFee(300);
        
        (uint256 mgmtFee,,,) = feeStrategy.getFeeConfig();
        assertEq(mgmtFee, 300);
    }
    
    function testSetPerformanceFee() public {
        vm.prank(admin);
        feeStrategy.setPerformanceFee(1500);
        
        (, uint256 perfFee,,) = feeStrategy.getFeeConfig();
        assertEq(perfFee, 1500);
    }
    
    function testCalculateWithdrawalFee() public {
        uint256 withdrawAmount = 1000 * 10**18;
        uint256 fee = feeStrategy.calculateWithdrawalFee(withdrawAmount);
        
        assertEq(fee, 5 * 10**18); // 0.5% of 1000 = 5
    }
    
    function test_RevertWhen_FeeTooHigh() public {
        vm.prank(admin);
        vm.expectRevert();
        feeStrategy.setManagementFee(1000); // 10% > max 5%
    }
    
    // ============ Withdrawal Queue Tests ============
    
    function testRequestWithdrawal() public {
        // User deposits to vault
        vm.startPrank(user1);
        asset.approve(address(vault), 1000 * 10**18);
        vault.deposit(1000 * 10**18, user1);
        
        // Request withdrawal
        uint256 shares = vault.balanceOf(user1);
        vault.approve(address(withdrawalQueue), shares);
        uint256 requestId = withdrawalQueue.requestWithdrawal(shares / 2);
        
        assertEq(requestId, 1);
        assertEq(withdrawalQueue.getPendingCount(), 1);
        vm.stopPrank();
    }
    
    function testCancelWithdrawal() public {
        vm.startPrank(user1);
        asset.approve(address(vault), 1000 * 10**18);
        vault.deposit(1000 * 10**18, user1);
        
        uint256 shares = vault.balanceOf(user1);
        vault.approve(address(withdrawalQueue), shares);
        uint256 requestId = withdrawalQueue.requestWithdrawal(shares / 2);
        
        withdrawalQueue.cancelWithdrawal(requestId);
        assertEq(withdrawalQueue.getPendingCount(), 0);
        vm.stopPrank();
    }
    
    function testProcessWithdrawals() public {
        vm.startPrank(user1);
        // Deposit more than liquidity buffer to ensure assets available
        asset.approve(address(vault), 2000 * 10**18);
        vault.deposit(2000 * 10**18, user1);
        
        uint256 shares = vault.balanceOf(user1);
        vault.approve(address(withdrawalQueue), shares);
        withdrawalQueue.requestWithdrawal(shares / 2);
        vm.stopPrank();
        
        // Wait for delay
        vm.warp(block.timestamp + 2 hours);
        
        vm.prank(admin);
        uint256 processed = withdrawalQueue.processWithdrawals(10);
        assertEq(processed, 1);
    }
    
    function testGetUserRequests() public {
        vm.startPrank(user1);
        asset.approve(address(vault), 1000 * 10**18);
        vault.deposit(1000 * 10**18, user1);
        
        uint256 shares = vault.balanceOf(user1);
        vault.approve(address(withdrawalQueue), shares);
        withdrawalQueue.requestWithdrawal(shares / 4);
        withdrawalQueue.requestWithdrawal(shares / 4);
        
        uint256[] memory requests = withdrawalQueue.getUserRequests(user1);
        assertEq(requests.length, 2);
        vm.stopPrank();
    }
    
    // ============ Yield Strategy Tests ============
    
    function testAddStrategy() public {
        vm.prank(admin);
        uint256 strategyId = yieldStrategy.addStrategy(address(yieldProtocol), 5000);
        
        assertEq(strategyId, 1);
    }
    
    function testUpdateAllocation() public {
        vm.startPrank(admin);
        uint256 strategyId = yieldStrategy.addStrategy(address(yieldProtocol), 5000);
        
        yieldStrategy.updateAllocation(strategyId, 7000);
        vm.stopPrank();
    }
    
    function testSetStrategyActive() public {
        vm.startPrank(admin);
        uint256 strategyId = yieldStrategy.addStrategy(address(yieldProtocol), 5000);
        
        yieldStrategy.setStrategyActive(strategyId, false);
        vm.stopPrank();
    }
    
    function testGetActiveStrategies() public {
        vm.startPrank(admin);
        yieldStrategy.addStrategy(address(yieldProtocol), 3000);
        yieldStrategy.addStrategy(address(new MockYieldProtocol(address(asset))), 3000);
        
        uint256[] memory active = yieldStrategy.getActiveStrategies();
        assertEq(active.length, 2);
        vm.stopPrank();
    }
    
    function test_RevertWhen_AllocationExceeded() public {
        vm.startPrank(admin);
        yieldStrategy.addStrategy(address(yieldProtocol), 6000);
        
        // Create the second protocol before expectRevert
        MockYieldProtocol secondProtocol = new MockYieldProtocol(address(asset));
        
        vm.expectRevert();
        yieldStrategy.addStrategy(address(secondProtocol), 5000); // Total > 10000
        vm.stopPrank();
    }
    
    // ============ Integration Tests ============
    
    function testFeeStrategyIntegration() public {
        vm.startPrank(user1);
        asset.approve(address(vault), 1000 * 10**18);
        vault.deposit(1000 * 10**18, user1);
        vm.stopPrank();
        
        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);
        
        uint256 managementFee = feeStrategy.calculateManagementFee();
        assertTrue(managementFee > 0);
    }
    
    function testWithdrawalQueueIntegration() public {
        vm.startPrank(user1);
        asset.approve(address(vault), 1000 * 10**18);
        vault.deposit(1000 * 10**18, user1);
        
        uint256 shares = vault.balanceOf(user1);
        vault.approve(address(withdrawalQueue), shares);
        uint256 requestId = withdrawalQueue.requestWithdrawal(shares);
        vm.stopPrank();
        
        assertTrue(withdrawalQueue.getPendingCount() == 1);
        assertTrue(withdrawalQueue.getTotalQueuedShares() == shares);
    }
    
    function testYieldStrategyIntegration() public {
        vm.prank(admin);
        uint256 strategyId = yieldStrategy.addStrategy(address(yieldProtocol), 10000);
        
        // Simulate yield
        yieldProtocol.setYield(100 * 10**18);
        
        // Fast forward to allow harvest
        vm.warp(block.timestamp + 2 hours);
        
        uint256 pending = yieldStrategy.getPendingYield(strategyId);
        assertEq(pending, 100 * 10**18);
    }
}

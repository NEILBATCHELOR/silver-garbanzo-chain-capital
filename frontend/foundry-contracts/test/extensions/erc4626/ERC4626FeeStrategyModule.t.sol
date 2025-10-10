// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../src/extensions/erc4626/ERC4626FeeStrategyModule.sol";

// Mock vault for testing
contract MockVault {
    address public asset;
    uint256 public totalAssets_;
    
    constructor(address _asset) {
        asset = _asset;
        totalAssets_ = 1000000 * 10**18; // 1M tokens
    }
    
    function totalAssets() external view returns (uint256) {
        return totalAssets_;
    }
    
    function setTotalAssets(uint256 amount) external {
        totalAssets_ = amount;
    }
}

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 10000000 * 10**18); // 10M tokens
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ERC4626FeeStrategyModuleTest is Test {
    using Clones for address;
    
    ERC4626FeeStrategyModule public implementation;
    ERC4626FeeStrategyModule public module;
    MockVault public vault;
    MockERC20 public asset;
    
    address public admin = address(1);
    address public feeManager = address(2);
    address public feeRecipient = address(3);
    address public user = address(4);
    
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    
    uint256 public constant MANAGEMENT_FEE = 200; // 2%
    uint256 public constant PERFORMANCE_FEE = 2000; // 20%
    uint256 public constant WITHDRAWAL_FEE = 50; // 0.5%
    
    event ManagementFeeUpdated(uint256 basisPoints);
    event PerformanceFeeUpdated(uint256 basisPoints);
    event WithdrawalFeeUpdated(uint256 basisPoints);
    event FeeRecipientUpdated(address indexed recipient);
    event FeesCollected(uint256 managementFee, uint256 performanceFee, uint256 total);
    
    function setUp() public {
        // Deploy mock assets
        asset = new MockERC20();
        vault = new MockVault(address(asset));
        
        // Deploy implementation
        implementation = new ERC4626FeeStrategyModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC4626FeeStrategyModule(clone);
        
        vm.prank(admin);
        module.initialize(
            admin,
            address(vault),
            MANAGEMENT_FEE,
            PERFORMANCE_FEE,
            WITHDRAWAL_FEE,
            feeRecipient
        );
        
        // Setup roles
        vm.prank(admin);
        module.grantRole(FEE_MANAGER_ROLE, feeManager);
        
        // Fund vault with assets
        asset.transfer(address(vault), 1000000 * 10**18);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public {
        (
            uint256 mgmtFee,
            uint256 perfFee,
            uint256 withdrawFee,
            address recipient
        ) = module.getFeeConfig();
        
        assertEq(mgmtFee, MANAGEMENT_FEE, "Management fee should match");
        assertEq(perfFee, PERFORMANCE_FEE, "Performance fee should match");
        assertEq(withdrawFee, WITHDRAWAL_FEE, "Withdrawal fee should match");
        assertEq(recipient, feeRecipient, "Fee recipient should match");
        assertEq(module.vault(), address(vault), "Vault address should match");
    }
    
    // ============ Management Fee Tests ============
    
    function testSetManagementFee() public {
        uint256 newFee = 300; // 3%
        
        vm.prank(feeManager);
        vm.expectEmit(true, false, false, true);
        emit ManagementFeeUpdated(newFee);
        module.setManagementFee(newFee);
        
        (uint256 mgmtFee,,,) = module.getFeeConfig();
        assertEq(mgmtFee, newFee, "Management fee should be updated");
    }
    
    function testCannotSetManagementFeeTooHigh() public {
        uint256 tooHighFee = 10001; // >100%
        
        vm.prank(feeManager);
        vm.expectRevert();
        module.setManagementFee(tooHighFee);
    }
    
    function testOnlyFeeManagerCanSetManagementFee() public {
        vm.prank(user);
        vm.expectRevert();
        module.setManagementFee(300);
    }
    
    function testCalculateManagementFee() public {
        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);
        
        uint256 fee = module.calculateManagementFee();
        uint256 expectedFee = (1000000 * 10**18 * MANAGEMENT_FEE) / 10000; // 2% of 1M
        
        assertApproxEqRel(fee, expectedFee, 0.01e18, "Management fee calculation should be correct");
    }
    
    // ============ Performance Fee Tests ============
    
    function testSetPerformanceFee() public {
        uint256 newFee = 1500; // 15%
        
        vm.prank(feeManager);
        vm.expectEmit(true, false, false, true);
        emit PerformanceFeeUpdated(newFee);
        module.setPerformanceFee(newFee);
        
        (, uint256 perfFee,,) = module.getFeeConfig();
        assertEq(perfFee, newFee, "Performance fee should be updated");
    }
    
    function testCannotSetPerformanceFeeTooHigh() public {
        uint256 tooHighFee = 10001; // >100%
        
        vm.prank(feeManager);
        vm.expectRevert();
        module.setPerformanceFee(tooHighFee);
    }
    
    function testCalculatePerformanceFee() public {
        // Collect initial fees to set high water mark
        vm.warp(block.timestamp + 365 days);
        
        // Fund module with assets for fee collection
        asset.transfer(address(module), 100000 * 10**18);
        module.collectFees();
        
        // Increase vault assets (simulate profit)
        vault.setTotalAssets(1500000 * 10**18); // 50% profit
        
        uint256 fee = module.calculatePerformanceFee();
        uint256 expectedProfit = 500000 * 10**18;
        uint256 expectedFee = (expectedProfit * PERFORMANCE_FEE) / 10000; // 20% of profit
        
        assertEq(fee, expectedFee, "Performance fee should be 20% of profit");
    }
    
    function testNoPerformanceFeeWhenBelowHighWaterMark() public {
        // Set high water mark
        vm.warp(block.timestamp + 365 days);
        asset.transfer(address(module), 100000 * 10**18);
        module.collectFees();
        
        // Decrease vault assets
        vault.setTotalAssets(900000 * 10**18);
        
        uint256 fee = module.calculatePerformanceFee();
        assertEq(fee, 0, "No performance fee when below high water mark");
    }
    
    // ============ Withdrawal Fee Tests ============
    
    function testSetWithdrawalFee() public {
        uint256 newFee = 100; // 1%
        
        vm.prank(feeManager);
        vm.expectEmit(true, false, false, true);
        emit WithdrawalFeeUpdated(newFee);
        module.setWithdrawalFee(newFee);
        
        (,, uint256 withdrawFee,) = module.getFeeConfig();
        assertEq(withdrawFee, newFee, "Withdrawal fee should be updated");
    }
    
    function testCannotSetWithdrawalFeeTooHigh() public {
        uint256 tooHighFee = 10001; // >100%
        
        vm.prank(feeManager);
        vm.expectRevert();
        module.setWithdrawalFee(tooHighFee);
    }
    
    function testCalculateWithdrawalFee() public {
        uint256 withdrawAmount = 10000 * 10**18;
        uint256 fee = module.calculateWithdrawalFee(withdrawAmount);
        uint256 expectedFee = (withdrawAmount * WITHDRAWAL_FEE) / 10000; // 0.5%
        
        assertEq(fee, expectedFee, "Withdrawal fee calculation should be correct");
    }
    
    // ============ Fee Collection Tests ============
    
    function testCollectFees() public {
        // Fast forward time to accrue management fees
        vm.warp(block.timestamp + 365 days);
        
        // Fund module with enough assets for fee collection
        asset.transfer(address(module), 100000 * 10**18);
        
        uint256 balanceBefore = asset.balanceOf(feeRecipient);
        
        vm.expectEmit(false, false, false, false);
        emit FeesCollected(0, 0, 0); // Placeholder values
        module.collectFees();
        
        uint256 balanceAfter = asset.balanceOf(feeRecipient);
        assertTrue(balanceAfter > balanceBefore, "Fee recipient should receive fees");
    }
    
    function testCannotCollectFeesWhenNone() public {
        vm.expectRevert();
        module.collectFees();
    }
    
    function testHighWaterMarkUpdates() public {
        // Initial collection
        vm.warp(block.timestamp + 365 days);
        asset.transfer(address(module), 100000 * 10**18);
        module.collectFees();
        
        uint256 initialHWM = module.getHighWaterMark();
        assertTrue(initialHWM > 0, "High water mark should be set");
        
        // Increase assets and collect again
        vault.setTotalAssets(1500000 * 10**18);
        vm.warp(block.timestamp + 365 days);
        asset.transfer(address(module), 200000 * 10**18);
        module.collectFees();
        
        uint256 newHWM = module.getHighWaterMark();
        assertTrue(newHWM > initialHWM, "High water mark should increase");
    }
    
    function testGetPendingFees() public {
        vm.warp(block.timestamp + 365 days);
        
        uint256 pending = module.getPendingFees();
        assertTrue(pending > 0, "Should have pending fees after time passes");
    }
    
    // ============ Fee Recipient Tests ============
    
    function testSetFeeRecipient() public {
        address newRecipient = address(5);
        
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit FeeRecipientUpdated(newRecipient);
        module.setFeeRecipient(newRecipient);
        
        (,,, address recipient) = module.getFeeConfig();
        assertEq(recipient, newRecipient, "Fee recipient should be updated");
    }
    
    function testCannotSetZeroAddressAsRecipient() public {
        vm.prank(admin);
        vm.expectRevert();
        module.setFeeRecipient(address(0));
    }
    
    function testOnlyAdminCanSetFeeRecipient() public {
        vm.prank(user);
        vm.expectRevert();
        module.setFeeRecipient(address(5));
    }
}

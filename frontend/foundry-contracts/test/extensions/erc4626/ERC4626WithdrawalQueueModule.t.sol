// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../src/extensions/erc4626/ERC4626WithdrawalQueueModule.sol";

// Mock vault with shares
contract MockVaultWithShares is ERC20 {
    address public asset;
    uint256 public totalAssets_;
    
    constructor(address _asset) ERC20("Vault Shares", "vSHARE") {
        asset = _asset;
        totalAssets_ = 1000000 * 10**18;
    }
    
    function totalAssets() external view returns (uint256) {
        return totalAssets_;
    }
    
    function convertToAssets(uint256 shares) external pure returns (uint256) {
        return shares; // 1:1 for simplicity
    }
    
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256) {
        _burn(owner, shares);
        // In real vault, would transfer assets to receiver
        return shares;
    }
    
    function setTotalAssets(uint256 amount) external {
        totalAssets_ = amount;
    }
    
    function mintShares(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock ERC20
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 10000000 * 10**18);
    }
}

contract ERC4626WithdrawalQueueModuleTest is Test {
    using Clones for address;
    
    ERC4626WithdrawalQueueModule public implementation;
    ERC4626WithdrawalQueueModule public module;
    MockVaultWithShares public vault;
    MockERC20 public asset;
    
    address public admin = address(1);
    address public queueManager = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    
    bytes32 public constant QUEUE_MANAGER_ROLE = keccak256("QUEUE_MANAGER_ROLE");
    
    uint256 public constant LIQUIDITY_BUFFER = 10000 * 10**18;
    uint256 public constant MAX_QUEUE_SIZE = 100;
    uint256 public constant MIN_WITHDRAWAL_DELAY = 1 days;
    
    event WithdrawalRequested(uint256 indexed requestId, address indexed requester, uint256 shares);
    event WithdrawalCancelled(uint256 indexed requestId);
    event WithdrawalProcessed(uint256 indexed requestId, uint256 assets);
    event QueueProcessed(uint256 count, uint256 remainingAssets);
    event LiquidityBufferUpdated(uint256 buffer);
    
    function setUp() public {
        // Deploy mocks
        asset = new MockERC20();
        vault = new MockVaultWithShares(address(asset));
        
        // Deploy implementation
        implementation = new ERC4626WithdrawalQueueModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC4626WithdrawalQueueModule(clone);
        
        vm.prank(admin);
        module.initialize(
            admin,
            address(vault),
            LIQUIDITY_BUFFER,
            MAX_QUEUE_SIZE,
            MIN_WITHDRAWAL_DELAY
        );
        
        // Grant roles
        vm.prank(admin);
        module.grantRole(QUEUE_MANAGER_ROLE, queueManager);
        
        // Mint shares to users
        vault.mintShares(user1, 50000 * 10**18);
        vault.mintShares(user2, 50000 * 10**18);
        
        // Approve module
        vm.prank(user1);
        vault.approve(address(module), type(uint256).max);
        vm.prank(user2);
        vault.approve(address(module), type(uint256).max);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public {
        assertEq(module.vault(), address(vault), "Vault should match");
        assertEq(module.getLiquidityBuffer(), LIQUIDITY_BUFFER, "Liquidity buffer should match");
    }
    
    // ============ Request Withdrawal Tests ============
    
    function testRequestWithdrawal() public {
        uint256 shares = 1000 * 10**18;
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit WithdrawalRequested(1, user1, shares);
        uint256 requestId = module.requestWithdrawal(shares);
        
        assertEq(requestId, 1, "First request ID should be 1");
        assertEq(module.getPendingCount(), 1, "Pending count should increase");
        assertEq(module.getTotalQueuedShares(), shares, "Total queued shares should match");
    }
    
    function testCannotRequestZeroShares() public {
        vm.prank(user1);
        vm.expectRevert();
        module.requestWithdrawal(0);
    }
    
    function testCannotRequestWithInsufficientShares() public {
        uint256 shares = 100000 * 10**18; // More than user has
        
        vm.prank(user1);
        vm.expectRevert();
        module.requestWithdrawal(shares);
    }
    
    function testMultipleRequests() public {
        vm.prank(user1);
        module.requestWithdrawal(1000 * 10**18);
        
        vm.prank(user2);
        module.requestWithdrawal(2000 * 10**18);
        
        assertEq(module.getPendingCount(), 2, "Should have 2 pending requests");
        assertEq(module.getTotalQueuedShares(), 3000 * 10**18, "Total queued should match");
    }
    
    // ============ Cancel Withdrawal Tests ============
    
    function testCancelWithdrawal() public {
        vm.prank(user1);
        uint256 requestId = module.requestWithdrawal(1000 * 10**18);
        
        uint256 balanceBefore = vault.balanceOf(user1);
        
        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit WithdrawalCancelled(requestId);
        module.cancelWithdrawal(requestId);
        
        assertEq(module.getPendingCount(), 0, "Pending count should decrease");
        assertEq(vault.balanceOf(user1), balanceBefore + 1000 * 10**18, "Shares should be returned");
    }
    
    function testCannotCancelOthersRequest() public {
        vm.prank(user1);
        uint256 requestId = module.requestWithdrawal(1000 * 10**18);
        
        vm.prank(user2);
        vm.expectRevert();
        module.cancelWithdrawal(requestId);
    }
    
    // ============ Process Withdrawals Tests ============
    
    function testProcessWithdrawals() public {
        // Create withdrawal request
        vm.prank(user1);
        uint256 requestId = module.requestWithdrawal(1000 * 10**18);
        
        // Wait for delay period
        vm.warp(block.timestamp + MIN_WITHDRAWAL_DELAY + 1);
        
        vm.prank(queueManager);
        vm.expectEmit(true, false, false, false);
        emit WithdrawalProcessed(requestId, 1000 * 10**18);
        uint256 processed = module.processWithdrawals(1);
        
        assertEq(processed, 1, "Should process 1 request");
        assertTrue(module.isReadyToClaim(requestId), "Request should be ready to claim");
    }
    
    function testCannotProcessBeforeDelay() public {
        vm.prank(user1);
        module.requestWithdrawal(1000 * 10**18);
        
        // Try to process immediately
        vm.prank(queueManager);
        uint256 processed = module.processWithdrawals(1);
        
        assertEq(processed, 0, "Should not process requests before delay");
    }
    
    function testOnlyQueueManagerCanProcess() public {
        vm.prank(user1);
        module.requestWithdrawal(1000 * 10**18);
        
        vm.warp(block.timestamp + MIN_WITHDRAWAL_DELAY + 1);
        
        vm.prank(user2);
        vm.expectRevert();
        module.processWithdrawals(1);
    }
    
    function testProcessMultipleWithdrawals() public {
        // Create multiple requests
        vm.prank(user1);
        module.requestWithdrawal(1000 * 10**18);
        vm.prank(user2);
        module.requestWithdrawal(2000 * 10**18);
        
        // Wait for delay
        vm.warp(block.timestamp + MIN_WITHDRAWAL_DELAY + 1);
        
        vm.prank(queueManager);
        uint256 processed = module.processWithdrawals(10);
        
        assertEq(processed, 2, "Should process both requests");
    }
    
    // ============ Claim Withdrawal Tests ============
    
    function testClaimWithdrawal() public {
        // Request and process
        vm.prank(user1);
        uint256 requestId = module.requestWithdrawal(1000 * 10**18);
        
        vm.warp(block.timestamp + MIN_WITHDRAWAL_DELAY + 1);
        
        vm.prank(queueManager);
        module.processWithdrawals(1);
        
        // Claim
        vm.prank(user1);
        uint256 assets = module.claimWithdrawal(requestId);
        
        assertEq(assets, 1000 * 10**18, "Should receive correct assets");
    }
    
    function testCannotClaimUnprocessedRequest() public {
        vm.prank(user1);
        uint256 requestId = module.requestWithdrawal(1000 * 10**18);
        
        vm.prank(user1);
        vm.expectRevert();
        module.claimWithdrawal(requestId);
    }
    
    function testCannotClaimOthersRequest() public {
        vm.prank(user1);
        uint256 requestId = module.requestWithdrawal(1000 * 10**18);
        
        vm.warp(block.timestamp + MIN_WITHDRAWAL_DELAY + 1);
        vm.prank(queueManager);
        module.processWithdrawals(1);
        
        vm.prank(user2);
        vm.expectRevert();
        module.claimWithdrawal(requestId);
    }
    
    // ============ Liquidity Buffer Tests ============
    
    function testSetLiquidityBuffer() public {
        uint256 newBuffer = 20000 * 10**18;
        
        vm.prank(admin);
        vm.expectEmit(false, false, false, true);
        emit LiquidityBufferUpdated(newBuffer);
        module.setLiquidityBuffer(newBuffer);
        
        assertEq(module.getLiquidityBuffer(), newBuffer, "Buffer should be updated");
    }
    
    function testOnlyAdminCanSetBuffer() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setLiquidityBuffer(20000 * 10**18);
    }
    
    // ============ View Functions Tests ============
    
    function testGetUserRequests() public {
        vm.prank(user1);
        module.requestWithdrawal(1000 * 10**18);
        vm.prank(user1);
        module.requestWithdrawal(2000 * 10**18);
        
        uint256[] memory requests = module.getUserRequests(user1);
        assertEq(requests.length, 2, "User should have 2 requests");
    }
}

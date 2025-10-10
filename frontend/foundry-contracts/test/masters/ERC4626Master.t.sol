// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../src/masters/ERC4626Master.sol";

// Mock underlying asset for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Asset", "MOCK") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ERC4626MasterTest is Test {
    ERC4626Master public implementation;
    ERC4626Master public vault;
    MockERC20 public asset;
    
    address public owner = address(1);
    address public assetManager = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    address public user3 = address(5);
    
    // Test parameters
    string constant VAULT_NAME = "Test Vault";
    string constant VAULT_SYMBOL = "vTEST";
    uint256 constant DEPOSIT_CAP = 1_000_000 * 10**18;
    uint256 constant MINIMUM_DEPOSIT = 100 * 10**18;
    
    // Events
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(
        address indexed sender,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    
    function setUp() public {
        // Deploy mock asset
        asset = new MockERC20();
        
        // Deploy vault implementation
        implementation = new ERC4626Master();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC4626Master.initialize.selector,
            address(asset),
            VAULT_NAME,
            VAULT_SYMBOL,
            DEPOSIT_CAP,
            MINIMUM_DEPOSIT,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        vault = ERC4626Master(address(proxy));
        
        // Setup: Give users some assets
        asset.mint(user1, 10_000 * 10**18);
        asset.mint(user2, 10_000 * 10**18);
        asset.mint(user3, 10_000 * 10**18);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(vault.name(), VAULT_NAME);
        assertEq(vault.symbol(), VAULT_SYMBOL);
        assertEq(address(vault.asset()), address(asset));
        assertEq(vault.depositCap(), DEPOSIT_CAP);
        assertEq(vault.minimumDeposit(), MINIMUM_DEPOSIT);
        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), owner));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        vault.initialize(address(asset), VAULT_NAME, VAULT_SYMBOL, DEPOSIT_CAP, MINIMUM_DEPOSIT, owner);
    }
    
    function testInitializationGrantsRoles() public view {
        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(vault.hasRole(vault.PAUSER_ROLE(), owner));
        assertTrue(vault.hasRole(vault.UPGRADER_ROLE(), owner));
        assertTrue(vault.hasRole(vault.ASSET_MANAGER_ROLE(), owner));
    }
    
    // ============ Deposit Tests ============
    
    function testDeposit() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        
        vm.expectEmit(true, true, false, true);
        emit Deposit(user1, user1, depositAmount, depositAmount);
        uint256 shares = vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        assertEq(shares, depositAmount);
        assertEq(vault.balanceOf(user1), shares);
        assertEq(vault.totalAssets(), depositAmount);
    }
    
    function testDepositToReceiver() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, user2);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user2), shares);
        assertEq(vault.balanceOf(user1), 0);
    }
    
    function testCannotDepositBelowMinimum() public {
        uint256 depositAmount = MINIMUM_DEPOSIT - 1;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        
        vm.expectRevert(ERC4626Master.BelowMinimumDeposit.selector);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
    }
    
    function testCannotDepositBeyondCap() public {
        uint256 depositAmount = DEPOSIT_CAP + 1;
        
        vm.startPrank(user1);
        asset.mint(user1, depositAmount);
        asset.approve(address(vault), depositAmount);
        
        vm.expectRevert(ERC4626Master.DepositCapExceeded.selector);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
    }
    
    function testMultipleDeposits() public {
        uint256 deposit1 = 1000 * 10**18;
        uint256 deposit2 = 2000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), deposit1 + deposit2);
        vault.deposit(deposit1, user1);
        vault.deposit(deposit2, user1);
        vm.stopPrank();
        
        assertEq(vault.totalAssets(), deposit1 + deposit2);
    }
    
    // ============ Mint Tests ============
    
    function testMint() public {
        uint256 sharesToMint = 1000 * 10**18;
        
        vm.startPrank(user1);
        uint256 assets = vault.previewMint(sharesToMint);
        asset.approve(address(vault), assets);
        uint256 assetsUsed = vault.mint(sharesToMint, user1);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user1), sharesToMint);
        assertEq(assetsUsed, assets);
    }
    
    function testMintToReceiver() public {
        uint256 sharesToMint = 1000 * 10**18;
        
        vm.startPrank(user1);
        uint256 assets = vault.previewMint(sharesToMint);
        asset.approve(address(vault), assets);
        vault.mint(sharesToMint, user2);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user2), sharesToMint);
        assertEq(vault.balanceOf(user1), 0);
    }
    
    function testCannotMintBelowMinimum() public {
        // Calculate shares that would result in assets below minimum
        uint256 sharesToMint = vault.convertToShares(MINIMUM_DEPOSIT - 1);
        
        vm.startPrank(user1);
        asset.approve(address(vault), type(uint256).max);
        
        vm.expectRevert(ERC4626Master.BelowMinimumDeposit.selector);
        vault.mint(sharesToMint, user1);
        vm.stopPrank();
    }
    
    // ============ Withdraw Tests ============
    
    function testWithdraw() public {
        uint256 depositAmount = 1000 * 10**18;
        uint256 withdrawAmount = 300 * 10**18;
        
        // Deposit first
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        
        uint256 balanceBefore = asset.balanceOf(user1);
        
        // Withdraw
        vm.expectEmit(true, true, true, true);
        emit Withdraw(user1, user1, user1, withdrawAmount, withdrawAmount);
        uint256 shares = vault.withdraw(withdrawAmount, user1, user1);
        vm.stopPrank();
        
        assertEq(shares, withdrawAmount);
        assertEq(asset.balanceOf(user1), balanceBefore + withdrawAmount);
        assertEq(vault.balanceOf(user1), depositAmount - withdrawAmount);
    }
    
    function testWithdrawToReceiver() public {
        uint256 depositAmount = 1000 * 10**18;
        uint256 withdrawAmount = 300 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        
        uint256 balanceBefore = asset.balanceOf(user2);
        vault.withdraw(withdrawAmount, user2, user1);
        vm.stopPrank();
        
        assertEq(asset.balanceOf(user2), balanceBefore + withdrawAmount);
    }
    
    function testCannotWithdrawMoreThanDeposited() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        
        vm.expectRevert();
        vault.withdraw(depositAmount + 1, user1, user1);
        vm.stopPrank();
    }
    
    // ============ Redeem Tests ============
    
    function testRedeem() public {
        uint256 depositAmount = 1000 * 10**18;
        uint256 redeemShares = 300 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        
        uint256 assetsBefore = asset.balanceOf(user1);
        uint256 assets = vault.redeem(redeemShares, user1, user1);
        vm.stopPrank();
        
        assertEq(assets, redeemShares);
        assertEq(asset.balanceOf(user1), assetsBefore + assets);
        assertEq(vault.balanceOf(user1), depositAmount - redeemShares);
    }
    
    function testRedeemToReceiver() public {
        uint256 depositAmount = 1000 * 10**18;
        uint256 redeemShares = 300 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        
        uint256 balanceBefore = asset.balanceOf(user2);
        vault.redeem(redeemShares, user2, user1);
        vm.stopPrank();
        
        assertEq(asset.balanceOf(user2), balanceBefore + redeemShares);
    }
    
    // ============ Preview Functions Tests ============
    
    function testPreviewDeposit() public view {
        uint256 depositAmount = 1000 * 10**18;
        uint256 shares = vault.previewDeposit(depositAmount);
        
        // Initially 1:1 ratio
        assertEq(shares, depositAmount);
    }
    
    function testPreviewMint() public view {
        uint256 shares = 1000 * 10**18;
        uint256 assets = vault.previewMint(shares);
        
        // Initially 1:1 ratio
        assertEq(assets, shares);
    }
    
    function testPreviewWithdraw() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 withdrawAmount = 300 * 10**18;
        uint256 shares = vault.previewWithdraw(withdrawAmount);
        
        assertEq(shares, withdrawAmount);
    }
    
    function testPreviewRedeem() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 redeemShares = 300 * 10**18;
        uint256 assets = vault.previewRedeem(redeemShares);
        
        assertEq(assets, redeemShares);
    }
    
    // ============ Max Functions Tests ============
    
    function testMaxDeposit() public view {
        uint256 max = vault.maxDeposit(user1);
        assertEq(max, DEPOSIT_CAP);
    }
    
    function testMaxMint() public view {
        uint256 max = vault.maxMint(user1);
        assertEq(max, DEPOSIT_CAP);
    }
    
    function testMaxWithdraw() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 max = vault.maxWithdraw(user1);
        assertEq(max, depositAmount);
    }
    
    function testMaxRedeem() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 max = vault.maxRedeem(user1);
        assertEq(max, shares);
    }
    
    // ============ Conversion Tests ============
    
    function testConvertToShares() public view {
        uint256 assets = 1000 * 10**18;
        uint256 shares = vault.convertToShares(assets);
        
        // Initially 1:1 ratio
        assertEq(shares, assets);
    }
    
    function testConvertToAssets() public view {
        uint256 shares = 1000 * 10**18;
        uint256 assets = vault.convertToAssets(shares);
        
        // Initially 1:1 ratio
        assertEq(assets, shares);
    }
    
    function testSharePriceAfterProfit() public {
        uint256 depositAmount = 1000 * 10**18;
        
        // User1 deposits
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        // Simulate profit by transferring assets directly to vault
        uint256 profit = 100 * 10**18;
        asset.mint(address(vault), profit);
        
        // Share price should increase
        uint256 assetsPerShare = vault.convertToAssets(10**18);
        assertGt(assetsPerShare, 10**18);
    }
    
    // ============ Total Assets Test ============
    
    function testTotalAssets() public {
        uint256 deposit1 = 1000 * 10**18;
        uint256 deposit2 = 2000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), deposit1);
        vault.deposit(deposit1, user1);
        vm.stopPrank();
        
        vm.startPrank(user2);
        asset.approve(address(vault), deposit2);
        vault.deposit(deposit2, user2);
        vm.stopPrank();
        
        assertEq(vault.totalAssets(), deposit1 + deposit2);
    }
    
    // ============ Deposit Cap Tests ============
    
    function testUpdateDepositCap() public {
        uint256 newCap = 2_000_000 * 10**18;
        
        vm.prank(owner);
        vault.setDepositCap(newCap);
        
        assertEq(vault.depositCap(), newCap);
    }
    
    function testOnlyAdminCanUpdateDepositCap() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.setDepositCap(2_000_000 * 10**18);
    }
    
    function testUnlimitedDepositWithZeroCap() public {
        vm.prank(owner);
        vault.setDepositCap(0);
        
        uint256 largeDeposit = 10_000_000 * 10**18;
        asset.mint(user1, largeDeposit);
        
        vm.startPrank(user1);
        asset.approve(address(vault), largeDeposit);
        vault.deposit(largeDeposit, user1);
        vm.stopPrank();
        
        assertEq(vault.totalAssets(), largeDeposit);
    }
    
    // ============ Minimum Deposit Tests ============
    
    function testUpdateMinimumDeposit() public {
        uint256 newMinimum = 200 * 10**18;
        
        vm.prank(owner);
        vault.setMinimumDeposit(newMinimum);
        
        assertEq(vault.minimumDeposit(), newMinimum);
    }
    
    function testOnlyAdminCanUpdateMinimumDeposit() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.setMinimumDeposit(200 * 10**18);
    }
    
    // ============ Share Transfer Tests ============
    
    function testTransferShares() public {
        uint256 depositAmount = 1000 * 10**18;
        uint256 transferAmount = 300 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        
        vault.transfer(user2, transferAmount);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user1), depositAmount - transferAmount);
        assertEq(vault.balanceOf(user2), transferAmount);
    }
    
    // ============ Pausability Tests ============
    
    function testPause() public {
        vm.prank(owner);
        vault.pause();
        
        assertTrue(vault.paused());
    }
    
    function testCannotDepositWhenPaused() public {
        vm.prank(owner);
        vault.pause();
        
        vm.startPrank(user1);
        asset.approve(address(vault), 1000 * 10**18);
        
        vm.expectRevert();
        vault.deposit(1000 * 10**18, user1);
        vm.stopPrank();
    }
    
    function testCannotWithdrawWhenPaused() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        vm.prank(owner);
        vault.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(100 * 10**18, user1, user1);
    }
    
    function testOnlyPauserCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.pause();
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgrade() public {
        // Deposit before upgrade
        vm.startPrank(user1);
        asset.approve(address(vault), 1000 * 10**18);
        vault.deposit(1000 * 10**18, user1);
        vm.stopPrank();
        
        uint256 balanceBefore = vault.balanceOf(user1);
        uint256 assetsBefore = vault.totalAssets();
        
        // Deploy new implementation
        ERC4626Master newImplementation = new ERC4626Master();
        
        // Upgrade
        vm.prank(owner);
        vault.upgradeToAndCall(address(newImplementation), "");
        
        // Verify state preserved
        assertEq(vault.name(), VAULT_NAME);
        assertEq(vault.balanceOf(user1), balanceBefore);
        assertEq(vault.totalAssets(), assetsBefore);
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        ERC4626Master newImplementation = new ERC4626Master();
        
        vm.prank(user1);
        vm.expectRevert();
        vault.upgradeToAndCall(address(newImplementation), "");
    }
    
    // ============ Policy Engine Tests ============
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1234);
        
        vm.prank(owner);
        vault.setPolicyEngine(mockEngine);
        
        assertEq(vault.policyEngine(), mockEngine);
    }
    
    function testOnlyAdminCanSetPolicyEngine() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.setPolicyEngine(address(0x1234));
    }
}

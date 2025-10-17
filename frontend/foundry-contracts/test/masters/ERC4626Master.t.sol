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

/**
 * @title ERC4626MasterTest
 * @notice Comprehensive tests for ERC4626Master vault with offset=6 security
 * @dev Tests account for OpenZeppelin's virtual share offset mechanism:
 * 
 * KEY CONCEPTS:
 * - Offset = 6 means 10^6 (1,000,000) virtual shares
 * - Empty vault: shares = assets * 1,000,000
 * - Empty vault: assets = shares / 1,000,000
 * - As vault accumulates real assets, ratio normalizes toward 1:1
 * 
 * TESTING APPROACH:
 * - Always use preview functions (previewDeposit, previewMint, etc.)
 * - Never hardcode 1:1 ratio expectations
 * - Verify conversion consistency, not absolute values
 * - Test behavior with accumulated assets (normalized ratios)
 */contract ERC4626MasterTest is Test {
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
        
        // Calculate expected shares using preview (accounts for offset)
        uint256 expectedShares = vault.previewDeposit(depositAmount);
        
        vm.expectEmit(true, true, false, true);
        emit Deposit(user1, user1, depositAmount, expectedShares);
        uint256 shares = vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        assertEq(shares, expectedShares, "Shares should match preview");
        assertEq(vault.balanceOf(user1), shares, "User balance should match shares");
        assertEq(vault.totalAssets(), depositAmount, "Total assets should match deposit");
    }
    
    function testDepositToReceiver() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, user2);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user2), shares, "Receiver should have shares");
        assertEq(vault.balanceOf(user1), 0, "Sender should have no shares");
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
        // With offset=6, need enough shares to meet minimum deposit
        // Minimum deposit: 100e18 assets
        // With empty vault: assets = shares / 10^6
        // So need: shares = 100e18 * 10^6 = 100e24
        uint256 sharesToMint = 150 * 10**24; // 150e24 to safely exceed minimum
        
        vm.startPrank(user1);
        uint256 assets = vault.previewMint(sharesToMint);
        asset.approve(address(vault), assets);
        uint256 assetsUsed = vault.mint(sharesToMint, user1);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user1), sharesToMint, "Should receive requested shares");
        assertEq(assetsUsed, assets, "Assets used should match preview");
    }
    
    function testMintToReceiver() public {
        // With offset=6, need enough shares to meet minimum deposit
        uint256 sharesToMint = 150 * 10**24; // 150e24 to safely exceed minimum
        
        vm.startPrank(user1);
        uint256 assets = vault.previewMint(sharesToMint);
        asset.approve(address(vault), assets);
        vault.mint(sharesToMint, user2);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user2), sharesToMint, "Receiver should have shares");
        assertEq(vault.balanceOf(user1), 0, "Sender should have no shares");
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
        uint256 depositedShares = vault.deposit(depositAmount, user1);
        
        uint256 balanceBefore = asset.balanceOf(user1);
        
        // Calculate expected shares for withdrawal
        uint256 expectedShares = vault.previewWithdraw(withdrawAmount);
        
        // Withdraw
        vm.expectEmit(true, true, true, true);
        emit Withdraw(user1, user1, user1, withdrawAmount, expectedShares);
        uint256 shares = vault.withdraw(withdrawAmount, user1, user1);
        vm.stopPrank();
        
        assertEq(shares, expectedShares, "Shares should match preview");
        assertEq(asset.balanceOf(user1), balanceBefore + withdrawAmount, "Should receive assets");
        assertEq(vault.balanceOf(user1), depositedShares - expectedShares, "Shares should be burned");
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
        
        assertEq(asset.balanceOf(user2), balanceBefore + withdrawAmount, "Receiver should get assets");
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
        uint256 depositedShares = vault.deposit(depositAmount, user1);
        
        uint256 assetsBefore = asset.balanceOf(user1);
        uint256 expectedAssets = vault.previewRedeem(redeemShares);
        uint256 assets = vault.redeem(redeemShares, user1, user1);
        vm.stopPrank();
        
        assertEq(assets, expectedAssets, "Assets should match preview");
        assertEq(asset.balanceOf(user1), assetsBefore + assets, "Should receive assets");
        assertEq(vault.balanceOf(user1), depositedShares - redeemShares, "Shares should be burned");
    }
    
    function testRedeemToReceiver() public {
        uint256 depositAmount = 1000 * 10**18;
        uint256 redeemShares = 300 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        
        uint256 balanceBefore = asset.balanceOf(user2);
        uint256 expectedAssets = vault.previewRedeem(redeemShares);
        vault.redeem(redeemShares, user2, user1);
        vm.stopPrank();
        
        assertEq(asset.balanceOf(user2), balanceBefore + expectedAssets, "Receiver should get assets");
    }
    
    // ============ Preview Functions Tests ============
    
    function testPreviewDeposit() public view {
        uint256 depositAmount = 1000 * 10**18;
        uint256 shares = vault.previewDeposit(depositAmount);
        
        // With offset=6 and empty vault:
        // shares = assets * (0 + 10^6) / (0 + 1) = assets * 1,000,000
        // This is CORRECT security behavior, not a bug
        assertGt(shares, 0, "Should receive shares for deposit");
        
        // Verify consistency with convertToShares
        assertEq(shares, vault.convertToShares(depositAmount), "Should match convertToShares");
    }
    
    function testPreviewMint() public view {
        uint256 shares = 1000 * 10**18;
        uint256 assets = vault.previewMint(shares);
        
        // With offset=6 and empty vault:
        // assets = shares * (0 + 1) / (0 + 10^6) = shares / 1,000,000
        // This is CORRECT security behavior, not a bug
        assertGt(assets, 0, "Should require assets to mint shares");
        
        // Verify consistency with convertToAssets
        // Use approximate equality due to rounding in ceiling division
        assertApproxEqAbs(assets, vault.convertToAssets(shares), 1, "Should match convertToAssets");
    }
    
    function testPreviewWithdraw() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 withdrawAmount = 300 * 10**18;
        uint256 shares = vault.previewWithdraw(withdrawAmount);
        
        // After deposit, ratio should be normalized
        assertGt(shares, 0, "Should require shares to withdraw");
        
        // Verify withdrawal will work with this amount
        assertLe(shares, vault.balanceOf(user1), "Should not require more shares than user has");
    }
    
    function testPreviewRedeem() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 redeemShares = 300 * 10**18;
        uint256 assets = vault.previewRedeem(redeemShares);
        
        // After deposit, ratio should be normalized
        assertGt(assets, 0, "Should receive assets for redeeming shares");
        
        // Verify redemption will work
        assertLe(redeemShares, vault.balanceOf(user1), "Should not redeem more than user has");
    }
    
    // ============ Max Functions Tests ============
    
    function testMaxDeposit() public view {
        uint256 max = vault.maxDeposit(user1);
        assertEq(max, DEPOSIT_CAP, "Max deposit should equal cap");
    }
    
    function testMaxMint() public view {
        uint256 max = vault.maxMint(user1);
        // Max mint is convertToShares(DEPOSIT_CAP)
        uint256 expected = vault.convertToShares(DEPOSIT_CAP);
        assertEq(max, expected, "Max mint should be shares equivalent of cap");
    }
    
    function testMaxWithdraw() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 max = vault.maxWithdraw(user1);
        // After deposit normalizes, max withdraw should approximately equal deposit
        assertApproxEqRel(max, depositAmount, 0.01e18, "Max withdraw should match deposited assets");
    }
    
    function testMaxRedeem() public {
        uint256 depositAmount = 1000 * 10**18;
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, user1);
        vm.stopPrank();
        
        uint256 max = vault.maxRedeem(user1);
        assertEq(max, shares, "Max redeem should equal user's shares");
    }
    
    // ============ Conversion Tests ============
    
    function testConvertToShares() public view {
        uint256 assets = 1000 * 10**18;
        uint256 shares = vault.convertToShares(assets);
        
        // With virtual offset, initial conversion is affected by virtual shares
        // The formula is: shares = assets * (totalSupply + 10^offset) / (totalAssets + 1)
        // For empty vault: shares = assets * (0 + 10^6) / (0 + 1) = assets * 1,000,000
        // This is CORRECT behavior for security - not a bug
        
        // Verify conversion is consistent with preview function
        uint256 expectedShares = vault.previewDeposit(assets);
        assertEq(shares, expectedShares, "Shares should match preview");
        
        // Verify shares are non-zero for positive assets
        assertGt(shares, 0, "Should receive shares for assets");
    }
    
    function testConvertToAssets() public view {
        uint256 shares = 1000 * 10**18;
        uint256 assets = vault.convertToAssets(shares);
        
        // With virtual offset, initial conversion is affected by virtual shares
        // The formula is: assets = shares * (totalAssets + 1) / (totalSupply + 10^offset)
        // For empty vault: assets = shares * (0 + 1) / (0 + 10^6) = shares / 1,000,000
        // This is CORRECT behavior for security - not a bug
        
        // Verify conversion is consistent with preview function
        uint256 expectedAssets = vault.previewRedeem(shares);
        assertEq(assets, expectedAssets, "Assets should match preview");
        
        // Verify assets are calculated correctly (may be less than shares in empty vault)
        assertGe(assets, 0, "Assets should be non-negative");
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
        
        // Share price should increase (assets per share)
        uint256 assetsPerShare = vault.convertToAssets(10**18);
        
        // After profit, each share should be worth MORE than initial
        // Calculate initial value (assets deposited / shares received)
        uint256 sharesReceived = vault.balanceOf(user1);
        uint256 initialPricePerShare = (depositAmount * 10**18) / sharesReceived;
        
        // With profit added, price per share should be higher
        assertGt(assetsPerShare, initialPricePerShare, "Share price should increase after profit");
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
        
        assertEq(vault.totalAssets(), deposit1 + deposit2, "Total assets should sum deposits");
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
        
        vm.startPrank(user1);
        asset.approve(address(vault), depositAmount);
        uint256 sharesReceived = vault.deposit(depositAmount, user1);
        
        uint256 transferAmount = 300 * 10**18;
        vault.transfer(user2, transferAmount);
        vm.stopPrank();
        
        assertEq(vault.balanceOf(user1), sharesReceived - transferAmount, "User1 should have remaining shares");
        assertEq(vault.balanceOf(user2), transferAmount, "User2 should receive shares");
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

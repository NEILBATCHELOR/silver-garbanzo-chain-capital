// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../src/extensions/erc4626/router/ERC4626Router.sol";
import "../../../src/extensions/erc4626/router/interfaces/IERC4626Router.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 10000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock ERC4626 vault for testing
contract MockVault is ERC20 {
    IERC20 public immutable asset;
    uint256 public totalAssets_;
    
    constructor(address _asset, string memory name) ERC20(name, string.concat("v", name)) {
        asset = IERC20(_asset);
        totalAssets_ = 0;
    }
    
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = previewDeposit(assets);
        asset.transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        totalAssets_ += assets;
    }
    
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        shares = previewWithdraw(assets);
        if (msg.sender != owner) {
            _burn(owner, shares);
        } else {
            _burn(msg.sender, shares);
        }
        asset.transfer(receiver, assets);
        totalAssets_ -= assets;
    }
    
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        assets = previewRedeem(shares);
        if (msg.sender != owner) {
            _burn(owner, shares);
        } else {
            _burn(msg.sender, shares);
        }
        asset.transfer(receiver, assets);
        totalAssets_ -= assets;
    }
    
    function totalAssets() public view returns (uint256) {
        return totalAssets_;
    }
    
    function previewDeposit(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return assets;
        return (assets * supply) / totalAssets();
    }
    
    function previewWithdraw(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (assets * supply) / totalAssets();
    }
    
    function previewRedeem(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (shares * totalAssets()) / supply;
    }
}

contract ERC4626RouterTest is Test {
    using Clones for address;
    
    ERC4626Router public implementation;
    ERC4626Router public router;
    
    MockERC20 public asset1;
    MockERC20 public asset2;
    MockVault public vault1;
    MockVault public vault2;
    MockVault public vault3;
    
    address public admin = address(1);
    address public vaultManager = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    
    event VaultRegistered(address indexed vault, address indexed asset);
    event VaultDeregistered(address indexed vault);
    event BatchDeposit(address indexed caller, IERC4626Router.DepositParams[] deposits);
    event BatchWithdraw(address indexed caller, IERC4626Router.WithdrawParams[] withdrawals);
    event BatchRedeem(address indexed caller, IERC4626Router.RedeemParams[] redemptions);
    
    function setUp() public {
        // Deploy assets
        asset1 = new MockERC20("Asset1", "AST1");
        asset2 = new MockERC20("Asset2", "AST2");
        
        // Deploy vaults
        vault1 = new MockVault(address(asset1), "Vault1");
        vault2 = new MockVault(address(asset1), "Vault2");
        vault3 = new MockVault(address(asset2), "Vault3");
        
        // Deploy router implementation
        implementation = new ERC4626Router();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        router = ERC4626Router(clone);
        
        vm.prank(admin);
        router.initialize(admin);
        
        // Grant vault manager role
        vm.prank(admin);
        router.grantRole(VAULT_MANAGER_ROLE, vaultManager);
        
        // Fund users
        asset1.transfer(user1, 100000 * 10**18);
        asset1.transfer(user2, 100000 * 10**18);
        asset2.transfer(user1, 100000 * 10**18);
        
        // Users approve router
        vm.prank(user1);
        asset1.approve(address(router), type(uint256).max);
        vm.prank(user1);
        asset2.approve(address(router), type(uint256).max);
        vm.prank(user2);
        asset1.approve(address(router), type(uint256).max);
        
        // Register vaults
        vm.startPrank(vaultManager);
        router.registerVault(address(vault1));
        router.registerVault(address(vault2));
        router.registerVault(address(vault3));
        vm.stopPrank();
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public {
        assertTrue(router.hasRole(router.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(router.hasRole(VAULT_MANAGER_ROLE, vaultManager));
    }
    
    function testCannotInitializeTwice() public {
        vm.prank(admin);
        vm.expectRevert();
        router.initialize(admin);
    }
    
    // ============ Vault Registration Tests ============
    
    function testRegisterVault() public {
        MockVault newVault = new MockVault(address(asset1), "NewVault");
        
        vm.prank(vaultManager);
        vm.expectEmit(true, true, false, false);
        emit VaultRegistered(address(newVault), address(asset1));
        router.registerVault(address(newVault));
        
        assertTrue(router.isVaultRegistered(address(newVault)));
    }
    
    function testCannotRegisterVaultTwice() public {
        vm.prank(vaultManager);
        vm.expectRevert();
        router.registerVault(address(vault1));
    }
    
    function testOnlyVaultManagerCanRegister() public {
        MockVault newVault = new MockVault(address(asset1), "NewVault");
        
        vm.prank(user1);
        vm.expectRevert();
        router.registerVault(address(newVault));
    }
    
    function testDeregisterVault() public {
        vm.prank(vaultManager);
        vm.expectEmit(true, false, false, false);
        emit VaultDeregistered(address(vault1));
        router.deregisterVault(address(vault1));
        
        assertFalse(router.isVaultRegistered(address(vault1)));
    }
    
    function testCannotDeregisterUnregisteredVault() public {
        MockVault newVault = new MockVault(address(asset1), "NewVault");
        
        vm.prank(vaultManager);
        vm.expectRevert();
        router.deregisterVault(address(newVault));
    }
    
    function testGetRegisteredVaults() public view {
        address[] memory vaults = router.getRegisteredVaults();
        assertEq(vaults.length, 3);
    }
    
    // ============ Single Deposit Tests ============
    
    function testDeposit() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        uint256 shares = router.deposit(address(vault1), depositAmount, user1);
        
        assertTrue(shares > 0);
        assertEq(vault1.balanceOf(user1), shares);
    }
    
    function testCannotDepositToUnregisteredVault() public {
        MockVault unregisteredVault = new MockVault(address(asset1), "Unregistered");
        
        vm.prank(user1);
        vm.expectRevert();
        router.deposit(address(unregisteredVault), 10000 * 10**18, user1);
    }
    
    function testDepositToDifferentReceiver() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        uint256 shares = router.deposit(address(vault1), depositAmount, user2);
        
        assertEq(vault1.balanceOf(user2), shares);
        assertEq(vault1.balanceOf(user1), 0);
    }
    
    // ============ Single Withdraw Tests ============
    
    function testWithdraw() public {
        // First deposit
        uint256 depositAmount = 10000 * 10**18;
        vm.prank(user1);
        router.deposit(address(vault1), depositAmount, user1);
        
        // Approve router to spend shares
        vm.prank(user1);
        vault1.approve(address(router), type(uint256).max);
        
        // Withdraw
        uint256 withdrawAmount = 5000 * 10**18;
        uint256 balanceBefore = asset1.balanceOf(user1);
        
        vm.prank(user1);
        uint256 shares = router.withdraw(address(vault1), withdrawAmount, user1, user1);
        
        assertTrue(shares > 0);
        assertEq(asset1.balanceOf(user1), balanceBefore + withdrawAmount);
    }
    
    function testCannotWithdrawFromUnregisteredVault() public {
        MockVault unregisteredVault = new MockVault(address(asset1), "Unregistered");
        
        vm.prank(user1);
        vm.expectRevert();
        router.withdraw(address(unregisteredVault), 5000 * 10**18, user1, user1);
    }
    
    // ============ Single Redeem Tests ============
    
    function testRedeem() public {
        // First deposit
        vm.prank(user1);
        uint256 shares = router.deposit(address(vault1), 10000 * 10**18, user1);
        
        // Approve router
        vm.prank(user1);
        vault1.approve(address(router), type(uint256).max);
        
        // Redeem
        uint256 balanceBefore = asset1.balanceOf(user1);
        
        vm.prank(user1);
        uint256 assets = router.redeem(address(vault1), shares, user1, user1);
        
        assertTrue(assets > 0);
        assertTrue(asset1.balanceOf(user1) > balanceBefore);
    }
    
    function testCannotRedeemFromUnregisteredVault() public {
        MockVault unregisteredVault = new MockVault(address(asset1), "Unregistered");
        
        vm.prank(user1);
        vm.expectRevert();
        router.redeem(address(unregisteredVault), 1000 * 10**18, user1, user1);
    }
    
    // ============ Batch Deposit Tests ============
    
    function testBatchDeposit() public {
        IERC4626Router.DepositParams[] memory deposits = new IERC4626Router.DepositParams[](2);
        deposits[0] = IERC4626Router.DepositParams({
            vault: address(vault1),
            assets: 5000 * 10**18,
            receiver: user1
        });
        deposits[1] = IERC4626Router.DepositParams({
            vault: address(vault2),
            assets: 3000 * 10**18,
            receiver: user1
        });
        
        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit BatchDeposit(user1, deposits);
        uint256[] memory shares = router.batchDeposit(deposits);
        
        assertEq(shares.length, 2);
        assertTrue(shares[0] > 0);
        assertTrue(shares[1] > 0);
        assertEq(vault1.balanceOf(user1), shares[0]);
        assertEq(vault2.balanceOf(user1), shares[1]);
    }
    
    function testCannotBatchDepositEmpty() public {
        IERC4626Router.DepositParams[] memory deposits = new IERC4626Router.DepositParams[](0);
        
        vm.prank(user1);
        vm.expectRevert();
        router.batchDeposit(deposits);
    }
    
    function testBatchDepositMultipleAssets() public {
        IERC4626Router.DepositParams[] memory deposits = new IERC4626Router.DepositParams[](2);
        deposits[0] = IERC4626Router.DepositParams({
            vault: address(vault1),
            assets: 5000 * 10**18,
            receiver: user1
        });
        deposits[1] = IERC4626Router.DepositParams({
            vault: address(vault3),
            assets: 3000 * 10**18,
            receiver: user1
        });
        
        vm.prank(user1);
        uint256[] memory shares = router.batchDeposit(deposits);
        
        assertEq(shares.length, 2);
        assertTrue(vault1.balanceOf(user1) > 0);
        assertTrue(vault3.balanceOf(user1) > 0);
    }
    
    // ============ Batch Withdraw Tests ============
    
    function testBatchWithdraw() public {
        // First deposit into multiple vaults
        vm.startPrank(user1);
        router.deposit(address(vault1), 10000 * 10**18, user1);
        router.deposit(address(vault2), 8000 * 10**18, user1);
        
        // Approve router
        vault1.approve(address(router), type(uint256).max);
        vault2.approve(address(router), type(uint256).max);
        vm.stopPrank();
        
        // Batch withdraw
        IERC4626Router.WithdrawParams[] memory withdrawals = new IERC4626Router.WithdrawParams[](2);
        withdrawals[0] = IERC4626Router.WithdrawParams({
            vault: address(vault1),
            assets: 5000 * 10**18,
            receiver: user1,
            owner: user1
        });
        withdrawals[1] = IERC4626Router.WithdrawParams({
            vault: address(vault2),
            assets: 4000 * 10**18,
            receiver: user1,
            owner: user1
        });
        
        uint256 balanceBefore = asset1.balanceOf(user1);
        
        vm.prank(user1);
        uint256[] memory shares = router.batchWithdraw(withdrawals);
        
        assertEq(shares.length, 2);
        assertEq(asset1.balanceOf(user1), balanceBefore + 9000 * 10**18);
    }
    
    function testCannotBatchWithdrawEmpty() public {
        IERC4626Router.WithdrawParams[] memory withdrawals = new IERC4626Router.WithdrawParams[](0);
        
        vm.prank(user1);
        vm.expectRevert();
        router.batchWithdraw(withdrawals);
    }
    
    // ============ Batch Redeem Tests ============
    
    function testBatchRedeem() public {
        // Deposit
        vm.startPrank(user1);
        uint256 shares1 = router.deposit(address(vault1), 10000 * 10**18, user1);
        uint256 shares2 = router.deposit(address(vault2), 8000 * 10**18, user1);
        
        // Approve
        vault1.approve(address(router), type(uint256).max);
        vault2.approve(address(router), type(uint256).max);
        vm.stopPrank();
        
        // Batch redeem
        IERC4626Router.RedeemParams[] memory redemptions = new IERC4626Router.RedeemParams[](2);
        redemptions[0] = IERC4626Router.RedeemParams({
            vault: address(vault1),
            shares: shares1,
            receiver: user1,
            owner: user1
        });
        redemptions[1] = IERC4626Router.RedeemParams({
            vault: address(vault2),
            shares: shares2,
            receiver: user1,
            owner: user1
        });
        
        uint256 balanceBefore = asset1.balanceOf(user1);
        
        vm.prank(user1);
        uint256[] memory assets = router.batchRedeem(redemptions);
        
        assertEq(assets.length, 2);
        assertTrue(asset1.balanceOf(user1) > balanceBefore);
    }
    
    function testCannotBatchRedeemEmpty() public {
        IERC4626Router.RedeemParams[] memory redemptions = new IERC4626Router.RedeemParams[](0);
        
        vm.prank(user1);
        vm.expectRevert();
        router.batchRedeem(redemptions);
    }
    
    // ============ Preview Functions Tests ============
    
    function testPreviewBatchDeposit() public view {
        IERC4626Router.DepositParams[] memory deposits = new IERC4626Router.DepositParams[](2);
        deposits[0] = IERC4626Router.DepositParams({
            vault: address(vault1),
            assets: 5000 * 10**18,
            receiver: user1
        });
        deposits[1] = IERC4626Router.DepositParams({
            vault: address(vault2),
            assets: 3000 * 10**18,
            receiver: user1
        });
        
        uint256[] memory shares = router.previewBatchDeposit(deposits);
        
        assertEq(shares.length, 2);
    }
    
    function testPreviewBatchWithdraw() public {
        // Setup: deposit first
        vm.startPrank(user1);
        router.deposit(address(vault1), 10000 * 10**18, user1);
        router.deposit(address(vault2), 8000 * 10**18, user1);
        vm.stopPrank();
        
        IERC4626Router.WithdrawParams[] memory withdrawals = new IERC4626Router.WithdrawParams[](2);
        withdrawals[0] = IERC4626Router.WithdrawParams({
            vault: address(vault1),
            assets: 5000 * 10**18,
            receiver: user1,
            owner: user1
        });
        withdrawals[1] = IERC4626Router.WithdrawParams({
            vault: address(vault2),
            assets: 4000 * 10**18,
            receiver: user1,
            owner: user1
        });
        
        uint256[] memory shares = router.previewBatchWithdraw(withdrawals);
        
        assertEq(shares.length, 2);
    }
    
    function testPreviewBatchRedeem() public {
        // Setup: deposit first
        vm.startPrank(user1);
        uint256 shares1 = router.deposit(address(vault1), 10000 * 10**18, user1);
        uint256 shares2 = router.deposit(address(vault2), 8000 * 10**18, user1);
        vm.stopPrank();
        
        IERC4626Router.RedeemParams[] memory redemptions = new IERC4626Router.RedeemParams[](2);
        redemptions[0] = IERC4626Router.RedeemParams({
            vault: address(vault1),
            shares: shares1,
            receiver: user1,
            owner: user1
        });
        redemptions[1] = IERC4626Router.RedeemParams({
            vault: address(vault2),
            shares: shares2,
            receiver: user1,
            owner: user1
        });
        
        uint256[] memory assets = router.previewBatchRedeem(redemptions);
        
        assertEq(assets.length, 2);
    }
    
    function testCannotPreviewEmptyBatch() public {
        IERC4626Router.DepositParams[] memory deposits = new IERC4626Router.DepositParams[](0);
        
        vm.expectRevert();
        router.previewBatchDeposit(deposits);
    }
}

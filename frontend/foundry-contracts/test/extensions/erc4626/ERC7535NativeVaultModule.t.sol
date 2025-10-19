// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../src/extensions/erc4626/native/ERC7535NativeVaultModule.sol";

// Mock WETH for testing
contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped ETH", "WETH") {}
    
    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
    
    receive() external payable {}
}

// Mock ERC4626 vault that uses WETH
contract MockWETHVault is ERC20 {
    IERC20 public immutable asset;
    uint256 public totalAssets_;
    
    constructor(address _weth) ERC20("Vault Shares", "vWETH") {
        asset = IERC20(_weth);
        totalAssets_ = 0;
    }
    
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = previewDeposit(assets);
        asset.transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        totalAssets_ += assets;
    }
    
    function mint(uint256 shares, address receiver) external returns (uint256 assets) {
        assets = previewMint(shares);
        asset.transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        totalAssets_ += assets;
    }
    
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        shares = previewWithdraw(assets);
        
        // Check allowance if caller is not owner
        if (msg.sender != owner) {
            uint256 allowed = allowance(owner, msg.sender);
            if (allowed != type(uint256).max) {
                require(allowed >= shares, "ERC20: insufficient allowance");
                _approve(owner, msg.sender, allowed - shares);
            }
        }
        
        _burn(owner, shares);
        asset.transfer(receiver, assets);
        totalAssets_ -= assets;
    }
    
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        assets = previewRedeem(shares);
        
        // Check allowance if caller is not owner
        if (msg.sender != owner) {
            uint256 allowed = allowance(owner, msg.sender);
            if (allowed != type(uint256).max) {
                require(allowed >= shares, "ERC20: insufficient allowance");
                _approve(owner, msg.sender, allowed - shares);
            }
        }
        
        _burn(owner, shares);
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
    
    function previewMint(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return shares;
        return (shares * totalAssets()) / supply;
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
    
    function maxDeposit(address) external pure returns (uint256) {
        return type(uint256).max;
    }
    
    function maxMint(address) external pure returns (uint256) {
        return type(uint256).max;
    }
    
    function maxWithdraw(address owner) external view returns (uint256) {
        return previewRedeem(balanceOf(owner));
    }
    
    function maxRedeem(address owner) external view returns (uint256) {
        return balanceOf(owner);
    }
}

contract ERC7535NativeVaultModuleTest is Test {
    using Clones for address;
    
    ERC7535NativeVaultModule public implementation;
    ERC7535NativeVaultModule public module;
    MockWETHVault public vault;
    MockWETH public weth;
    
    address public admin = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    
    uint256 public constant INITIAL_ETH = 100 ether;
    
    event NativeDeposit(address indexed sender, address indexed receiver, uint256 ethAmount, uint256 shares);
    event NativeMint(address indexed sender, address indexed receiver, uint256 shares, uint256 ethAmount);
    event NativeWithdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 ethAmount, uint256 shares);
    event NativeRedeem(address indexed sender, address indexed receiver, address indexed owner, uint256 shares, uint256 ethAmount);
    
    function setUp() public {
        // Deploy WETH
        weth = new MockWETH();
        
        // Deploy vault
        vault = new MockWETHVault(address(weth));
        
        // Deploy implementation
        implementation = new ERC7535NativeVaultModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC7535NativeVaultModule(payable(clone));
        
        vm.prank(admin);
        module.initialize(admin, address(vault), address(weth));
        
        // Fund users with ETH
        vm.deal(user1, INITIAL_ETH);
        vm.deal(user2, INITIAL_ETH);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(address(module.vault()), address(vault));
        assertEq(module.weth(), address(weth));
        assertTrue(module.isNativeVault());
        assertEq(module.asset(), 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    }
    
    function testCannotInitializeTwice() public {
        vm.prank(admin);
        vm.expectRevert();
        module.initialize(admin, address(vault), address(weth));
    }
    
    function testCannotInitializeWithNonWETHVault() public {
        MockWETH otherToken = new MockWETH();
        MockWETHVault otherVault = new MockWETHVault(address(otherToken));
        
        address clone = address(implementation).clone();
        ERC7535NativeVaultModule newModule = ERC7535NativeVaultModule(payable(clone));
        
        vm.prank(admin);
        vm.expectRevert();
        newModule.initialize(admin, address(otherVault), address(weth));
    }
    
    // ============ Deposit Native Tests ============
    
    function testDepositNative() public {
        uint256 depositAmount = 10 ether;
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit NativeDeposit(user1, user1, depositAmount, depositAmount);
        uint256 shares = module.depositNative{value: depositAmount}(user1);
        
        assertEq(shares, depositAmount);
        assertEq(vault.balanceOf(user1), shares);
    }
    
    function testDepositNativeToDifferentReceiver() public {
        uint256 depositAmount = 5 ether;
        
        vm.prank(user1);
        uint256 shares = module.depositNative{value: depositAmount}(user2);
        
        assertEq(vault.balanceOf(user2), shares);
        assertEq(vault.balanceOf(user1), 0);
    }
    
    function testCannotDepositZeroETH() public {
        vm.prank(user1);
        vm.expectRevert();
        module.depositNative{value: 0}(user1);
    }
    
    function testMultipleDeposits() public {
        vm.prank(user1);
        module.depositNative{value: 10 ether}(user1);
        
        vm.prank(user2);
        module.depositNative{value: 20 ether}(user2);
        
        assertTrue(vault.balanceOf(user1) > 0);
        assertTrue(vault.balanceOf(user2) > vault.balanceOf(user1));
    }
    
    // ============ Mint Native Tests ============
    
    function testMintNative() public {
        uint256 shares = 10 ether;
        uint256 expectedEth = module.previewMintNative(shares);
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit NativeMint(user1, user1, shares, expectedEth);
        uint256 ethUsed = module.mintNative{value: expectedEth}(shares, user1);
        
        assertEq(ethUsed, expectedEth);
        assertEq(vault.balanceOf(user1), shares);
    }
    
    function testCannotMintWithInsufficientETH() public {
        uint256 shares = 10 ether;
        uint256 requiredEth = module.previewMintNative(shares);
        
        vm.prank(user1);
        vm.expectRevert();
        module.mintNative{value: requiredEth - 1}(shares, user1);
    }
    
    function testCannotMintWithExcessETH() public {
        uint256 shares = 10 ether;
        uint256 requiredEth = module.previewMintNative(shares);
        
        vm.prank(user1);
        vm.expectRevert();
        module.mintNative{value: requiredEth + 1}(shares, user1);
    }
    
    // ============ Withdraw Native Tests ============
    
    function testWithdrawNative() public {
        // First deposit
        uint256 depositAmount = 10 ether;
        vm.prank(user1);
        module.depositNative{value: depositAmount}(user1);
        
        // Approve module to spend shares
        vm.prank(user1);
        vault.approve(address(module), type(uint256).max);
        
        // Withdraw
        uint256 withdrawAmount = 5 ether;
        uint256 balanceBefore = user1.balance;
        
        vm.prank(user1);
        uint256 shares = module.withdrawNative(withdrawAmount, user1, user1);
        
        assertEq(user1.balance, balanceBefore + withdrawAmount);
        assertTrue(shares > 0);
    }
    
    function testWithdrawNativeToDifferentReceiver() public {
        // Deposit
        vm.prank(user1);
        module.depositNative{value: 10 ether}(user1);
        
        // Approve
        vm.prank(user1);
        vault.approve(address(module), type(uint256).max);
        
        // Withdraw to user2
        uint256 withdrawAmount = 5 ether;
        uint256 balanceBefore = user2.balance;
        
        vm.prank(user1);
        module.withdrawNative(withdrawAmount, user2, user1);
        
        assertEq(user2.balance, balanceBefore + withdrawAmount);
    }
    
    function testCannotWithdrawWithoutApproval() public {
        vm.prank(user1);
        module.depositNative{value: 10 ether}(user1);
        
        vm.prank(user1);
        vm.expectRevert();
        module.withdrawNative(5 ether, user1, user1);
    }
    
    // ============ Redeem Native Tests ============
    
    function testRedeemNative() public {
        // Deposit
        vm.prank(user1);
        uint256 shares = module.depositNative{value: 10 ether}(user1);
        
        // Approve
        vm.prank(user1);
        vault.approve(address(module), type(uint256).max);
        
        // Redeem
        uint256 redeemShares = shares / 2;
        uint256 balanceBefore = user1.balance;
        
        vm.prank(user1);
        uint256 ethReceived = module.redeemNative(redeemShares, user1, user1);
        
        assertEq(user1.balance, balanceBefore + ethReceived);
        assertEq(vault.balanceOf(user1), shares - redeemShares);
    }
    
    function testRedeemNativeToDifferentReceiver() public {
        // Deposit
        vm.prank(user1);
        uint256 shares = module.depositNative{value: 10 ether}(user1);
        
        // Approve
        vm.prank(user1);
        vault.approve(address(module), type(uint256).max);
        
        // Redeem to user2
        uint256 balanceBefore = user2.balance;
        
        vm.prank(user1);
        uint256 ethReceived = module.redeemNative(shares, user2, user1);
        
        assertEq(user2.balance, balanceBefore + ethReceived);
    }
    
    function testCannotRedeemWithoutApproval() public {
        vm.prank(user1);
        uint256 shares = module.depositNative{value: 10 ether}(user1);
        
        vm.prank(user1);
        vm.expectRevert();
        module.redeemNative(shares, user1, user1);
    }
    
    // ============ Preview Functions Tests ============
    
    function testPreviewDepositNative() public {
        uint256 depositAmount = 10 ether;
        uint256 expectedShares = module.previewDepositNative(depositAmount);
        
        vm.prank(user1);
        uint256 actualShares = module.depositNative{value: depositAmount}(user1);
        
        assertEq(actualShares, expectedShares);
    }
    
    function testPreviewMintNative() public view {
        uint256 shares = 10 ether;
        uint256 expectedEth = module.previewMintNative(shares);
        assertTrue(expectedEth > 0);
    }
    
    function testPreviewWithdrawNative() public {
        vm.prank(user1);
        module.depositNative{value: 10 ether}(user1);
        
        uint256 withdrawAmount = 5 ether;
        uint256 expectedShares = module.previewWithdrawNative(withdrawAmount);
        assertTrue(expectedShares > 0);
    }
    
    function testPreviewRedeemNative() public {
        vm.prank(user1);
        uint256 shares = module.depositNative{value: 10 ether}(user1);
        
        uint256 expectedEth = module.previewRedeemNative(shares);
        assertApproxEqAbs(expectedEth, 10 ether, 1e15); // Allow small rounding
    }
    
    // ============ Max Functions Tests ============
    
    function testMaxDepositNative() public view {
        uint256 maxDeposit = module.maxDepositNative();
        assertTrue(maxDeposit > 0);
    }
    
    function testMaxMintNative() public view {
        uint256 maxMint = module.maxMintNative();
        assertTrue(maxMint > 0);
    }
    
    function testMaxWithdrawNative() public {
        vm.prank(user1);
        module.depositNative{value: 10 ether}(user1);
        
        uint256 maxWithdraw = module.maxWithdrawNative(user1);
        assertApproxEqAbs(maxWithdraw, 10 ether, 1e15);
    }
    
    function testMaxRedeemNative() public {
        vm.prank(user1);
        uint256 shares = module.depositNative{value: 10 ether}(user1);
        
        uint256 maxRedeem = module.maxRedeemNative(user1);
        assertEq(maxRedeem, shares);
    }
    
    // ============ Edge Cases Tests ============
    
    function testLargeDeposit() public {
        uint256 largeAmount = 50 ether;
        
        vm.prank(user1);
        uint256 shares = module.depositNative{value: largeAmount}(user1);
        
        assertTrue(shares > 0);
        assertEq(vault.balanceOf(user1), shares);
    }
    
    function testSmallDeposit() public {
        uint256 smallAmount = 0.001 ether;
        
        vm.prank(user1);
        uint256 shares = module.depositNative{value: smallAmount}(user1);
        
        assertTrue(shares > 0);
    }
    
    function testReceiveETH() public {
        // Module should be able to receive ETH (for WETH unwrapping)
        (bool success, ) = payable(address(module)).call{value: 1 ether}("");
        assertTrue(success);
    }
}

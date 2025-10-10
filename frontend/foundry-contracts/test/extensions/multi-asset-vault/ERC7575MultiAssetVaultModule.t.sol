// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../src/extensions/multi-asset-vault/ERC7575MultiAssetVaultModule.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
        _mint(msg.sender, 10000000 * 10**decimals_);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock Price Oracle for testing
contract MockPriceOracle {
    mapping(address => uint256) public prices;
    
    function setPrice(address asset, uint256 price) external {
        prices[asset] = price;
    }
    
    function getPrice(address asset) external view returns (uint256) {
        return prices[asset];
    }
}

// Mock ERC4626 vault for testing
contract MockVault is ERC20 {
    constructor() ERC20("Mock Vault", "vMOCK") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ERC7575MultiAssetVaultModuleTest is Test {
    using Clones for address;
    
    ERC7575MultiAssetVaultModule public implementation;
    ERC7575MultiAssetVaultModule public module;
    MockVault public vault;
    MockPriceOracle public oracle;
    
    MockERC20 public asset1;
    MockERC20 public asset2;
    MockERC20 public asset3;
    MockERC20 public baseAsset;
    
    address public admin = address(1);
    address public vaultManager = address(2);
    address public rebalancer = address(3);
    address public user1 = address(4);
    address public user2 = address(5);
    
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");
    
    uint256 public constant BASIS_POINTS = 10000;
    
    event AssetAdded(address indexed asset, uint256 targetWeight);
    event AssetRemoved(address indexed asset);
    event AssetWeightUpdated(address indexed asset, uint256 oldWeight, uint256 newWeight);
    event Rebalanced(address indexed caller, uint256 timestamp);
    event ModuleInitialized(address indexed vaultContract, address indexed priceOracle, address indexed baseAsset);
    
    function setUp() public {
        // Deploy base and test assets with different decimals
        baseAsset = new MockERC20("Base Asset", "BASE", 18);
        asset1 = new MockERC20("Asset 1", "AST1", 18);
        asset2 = new MockERC20("Asset 2", "AST2", 6);
        asset3 = new MockERC20("Asset 3", "AST3", 8);
        
        // Deploy vault and oracle
        vault = new MockVault();
        oracle = new MockPriceOracle();
        
        // Set initial prices (in base asset terms)
        oracle.setPrice(address(asset1), 1 * 10**18); // 1:1 with base
        oracle.setPrice(address(asset2), 1 * 10**18); // 1:1 with base
        oracle.setPrice(address(asset3), 1 * 10**18); // 1:1 with base
        oracle.setPrice(address(baseAsset), 1 * 10**18);
        
        // Deploy implementation
        implementation = new ERC7575MultiAssetVaultModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC7575MultiAssetVaultModule(clone);
        
        vm.prank(admin);
        module.initialize(address(vault), address(oracle), address(baseAsset), admin);
        
        // Grant roles
        vm.startPrank(admin);
        module.grantRole(VAULT_MANAGER_ROLE, vaultManager);
        module.grantRole(REBALANCER_ROLE, rebalancer);
        vm.stopPrank();
        
        // Fund users
        asset1.transfer(user1, 100000 * 10**18);
        asset1.transfer(user2, 100000 * 10**18);
        asset2.transfer(user1, 100000 * 10**6);
        asset2.transfer(user2, 100000 * 10**6);
        asset3.transfer(user1, 100000 * 10**8);
        
        // Users approve module
        vm.startPrank(user1);
        asset1.approve(address(module), type(uint256).max);
        asset2.approve(address(module), type(uint256).max);
        asset3.approve(address(module), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(user2);
        asset1.approve(address(module), type(uint256).max);
        asset2.approve(address(module), type(uint256).max);
        vm.stopPrank();
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public {
        assertEq(module.vaultContract(), address(vault));
        assertEq(module.priceOracle(), address(oracle));
        assertEq(module.baseAsset(), address(baseAsset));
        assertTrue(module.depositsEnabled());
        assertTrue(module.rebalanceEnabled());
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(module.hasRole(VAULT_MANAGER_ROLE, vaultManager));
    }
    
    function testCannotInitializeTwice() public {
        vm.prank(admin);
        vm.expectRevert();
        module.initialize(address(vault), address(oracle), address(baseAsset), admin);
    }
    
    function testCannotInitializeWithZeroAddresses() public {
        address clone = address(implementation).clone();
        ERC7575MultiAssetVaultModule newModule = ERC7575MultiAssetVaultModule(clone);
        
        vm.prank(admin);
        vm.expectRevert();
        newModule.initialize(address(0), address(oracle), address(baseAsset), admin);
    }
    
    // ============ Asset Management Tests ============
    
    function testAddAsset() public {
        vm.prank(vaultManager);
        vm.expectEmit(true, false, false, true);
        emit AssetAdded(address(asset1), 5000);
        module.addAsset(address(asset1), 5000);
        
        (address assetAddress, uint256 targetWeight, , bool active, ,) = module.getAsset(address(asset1));
        assertEq(assetAddress, address(asset1));
        assertEq(targetWeight, 5000);
        assertTrue(active);
    }
    
    function testCannotAddZeroAddressAsset() public {
        vm.prank(vaultManager);
        vm.expectRevert();
        module.addAsset(address(0), 5000);
    }
    
    function testCannotAddAssetWithZeroWeight() public {
        vm.prank(vaultManager);
        vm.expectRevert();
        module.addAsset(address(asset1), 0);
    }
    
    function testCannotAddAssetWithWeightOver100Percent() public {
        vm.prank(vaultManager);
        vm.expectRevert();
        module.addAsset(address(asset1), 10001);
    }
    
    function testCannotAddSameAssetTwice() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        
        vm.expectRevert();
        module.addAsset(address(asset1), 3000);
        vm.stopPrank();
    }
    
    function testCannotAddAssetExceedingTotalWeight() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 6000);
        
        vm.expectRevert();
        module.addAsset(address(asset2), 5000); // Would total 11000 > 10000
        vm.stopPrank();
    }
    
    function testAddMultipleAssets() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 3000);
        module.addAsset(address(asset2), 4000);
        module.addAsset(address(asset3), 3000);
        vm.stopPrank();
        
        assertEq(module.getAssetCount(), 3);
        assertEq(module.totalWeight(), 10000);
    }
    
    function testOnlyVaultManagerCanAddAsset() public {
        vm.prank(user1);
        vm.expectRevert();
        module.addAsset(address(asset1), 5000);
    }
    
    function testRemoveAsset() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        
        vm.expectEmit(true, false, false, false);
        emit AssetRemoved(address(asset1));
        module.removeAsset(address(asset1));
        vm.stopPrank();
        
        (, , , bool active, ,) = module.getAsset(address(asset1));
        assertFalse(active);
    }
    
    function testCannotRemoveAssetWithBalance() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        vm.stopPrank();
        
        // Transfer some assets to module to simulate balance
        asset1.transfer(address(module), 1000 * 10**18);
        
        vm.prank(vaultManager);
        vm.expectRevert();
        module.removeAsset(address(asset1));
    }
    
    function testCannotRemoveNonexistentAsset() public {
        vm.prank(vaultManager);
        vm.expectRevert();
        module.removeAsset(address(asset1));
    }
    
    function testOnlyVaultManagerCanRemoveAsset() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert();
        module.removeAsset(address(asset1));
    }
    
    // ============ Asset Weight Update Tests ============
    
    function testUpdateAssetWeight() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        
        vm.expectEmit(true, false, false, true);
        emit AssetWeightUpdated(address(asset1), 5000, 6000);
        module.updateAssetWeight(address(asset1), 6000);
        vm.stopPrank();
        
        (, uint256 targetWeight, , , ,) = module.getAsset(address(asset1));
        assertEq(targetWeight, 6000);
    }
    
    function testCannotUpdateWeightToZero() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        
        vm.expectRevert();
        module.updateAssetWeight(address(asset1), 0);
        vm.stopPrank();
    }
    
    function testCannotUpdateWeightExceedingTotal() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 3000);
        module.addAsset(address(asset2), 4000);
        
        vm.expectRevert();
        module.updateAssetWeight(address(asset1), 7000); // Would total 11000
        vm.stopPrank();
    }
    
    function testOnlyVaultManagerCanUpdateWeight() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert();
        module.updateAssetWeight(address(asset1), 6000);
    }
    
    // ============ View Functions Tests ============
    
    function testGetAssetCount() public {
        assertEq(module.getAssetCount(), 0);
        
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 3000);
        assertEq(module.getAssetCount(), 1);
        
        module.addAsset(address(asset2), 4000);
        assertEq(module.getAssetCount(), 2);
        vm.stopPrank();
    }
    
    function testGetAllAssets() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 3000);
        module.addAsset(address(asset2), 4000);
        module.addAsset(address(asset3), 3000);
        vm.stopPrank();
        
        address[] memory assets = module.getAllAssets();
        assertEq(assets.length, 3);
    }
    
    function testTotalWeight() public {
        assertEq(module.totalWeight(), 0);
        
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 3000);
        assertEq(module.totalWeight(), 3000);
        
        module.addAsset(address(asset2), 4000);
        assertEq(module.totalWeight(), 7000);
        vm.stopPrank();
    }
    
    function testGetAssetValue() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 5000);
        vm.stopPrank();
        
        // Transfer some assets to module
        uint256 amount = 1000 * 10**18;
        asset1.transfer(address(module), amount);
        
        uint256 value = module.getAssetValue(address(asset1));
        assertTrue(value > 0);
    }
    
    function testGetTotalValue() public {
        vm.startPrank(vaultManager);
        module.addAsset(address(asset1), 3000);
        module.addAsset(address(asset2), 4000);
        vm.stopPrank();
        
        // Transfer assets to module
        asset1.transfer(address(module), 1000 * 10**18);
        asset2.transfer(address(module), 1000 * 10**6);
        
        uint256 totalValue = module.getTotalValue();
        assertTrue(totalValue > 0);
    }
    
    // ============ Deposits/Withdrawals Enabled Tests ============
    
    function testSetDepositsEnabled() public {
        vm.prank(admin);
        module.setDepositsEnabled(false);
        
        assertFalse(module.depositsEnabled());
        
        vm.prank(admin);
        module.setDepositsEnabled(true);
        
        assertTrue(module.depositsEnabled());
    }
    
    function testOnlyAdminCanSetDepositsEnabled() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setDepositsEnabled(false);
    }
    
    function testSetRebalanceEnabled() public {
        vm.prank(admin);
        module.setRebalanceEnabled(false);
        
        assertFalse(module.rebalanceEnabled());
        
        vm.prank(admin);
        module.setRebalanceEnabled(true);
        
        assertTrue(module.rebalanceEnabled());
    }
    
    function testOnlyAdminCanSetRebalanceEnabled() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setRebalanceEnabled(false);
    }
    
    // ============ Configuration Tests ============
    
    function testSetRebalanceThreshold() public {
        vm.prank(admin);
        module.setRebalanceThreshold(200); // 2%
        
        assertEq(module.rebalanceThreshold(), 200);
    }
    
    function testCannotSetRebalanceThresholdOver100Percent() public {
        vm.prank(admin);
        vm.expectRevert();
        module.setRebalanceThreshold(10001);
    }
    
    function testSetRebalanceCooldown() public {
        vm.prank(admin);
        module.setRebalanceCooldown(2 hours);
        
        assertEq(module.rebalanceCooldown(), 2 hours);
    }
    
    function testSetMaxAssetAllocation() public {
        vm.prank(admin);
        module.setMaxAssetAllocation(6000); // 60%
        
        assertEq(module.maxAssetAllocation(), 6000);
    }
    
    function testCannotSetMaxAssetAllocationOver100Percent() public {
        vm.prank(admin);
        vm.expectRevert();
        module.setMaxAssetAllocation(10001);
    }
    
    function testOnlyAdminCanSetConfiguration() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setRebalanceThreshold(200);
        
        vm.prank(user1);
        vm.expectRevert();
        module.setRebalanceCooldown(2 hours);
        
        vm.prank(user1);
        vm.expectRevert();
        module.setMaxAssetAllocation(6000);
    }
}

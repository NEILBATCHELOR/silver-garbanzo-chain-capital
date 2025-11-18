// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC4626ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC4626Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC4626ExtensionFactory Test Suite
 * @notice Comprehensive tests for ERC4626ExtensionFactory (Vault Extensions)
 * @dev Tests all 7 ERC4626 extension types
 */
contract ERC4626ExtensionFactoryTest is Test {
    
    // ============ Contracts ============
    
    ERC4626ExtensionFactory public factory;
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    ERC4626Master public vaultImpl;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public user = address(3);
    address public feeRecipient = address(4);
    address public asset = address(5); // Mock asset token
    
    address public mockVault;
    
    // ============ Setup ============
    
    function setUp() public {
        // Deploy ExtensionRegistry
        registryImpl = new ExtensionRegistry();
        bytes memory registryInit = abi.encodeWithSelector(
            ExtensionRegistry.initialize.selector,
            admin
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInit);
        registry = ExtensionRegistry(address(registryProxy));
        
        // Deploy PolicyEngine
        policyEngine = new PolicyEngine();
        
        // Deploy UpgradeGovernor
        address[] memory initialAdmins = new address[](1);
        initialAdmins[0] = admin;
        governor = new UpgradeGovernor(initialAdmins, 2, 1 days);
        
        // Deploy ERC4626ExtensionFactory
        vm.prank(admin);
        factory = new ERC4626ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Deploy a mock ERC4626 vault for testing
        vaultImpl = new ERC4626Master();
        bytes memory vaultInit = abi.encodeWithSelector(
            ERC4626Master.initialize.selector,
            asset,
            "Test Vault",
            "TVAULT",
            deployer,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy vaultProxy = new ERC1967Proxy(address(vaultImpl), vaultInit);
        mockVault = address(vaultProxy);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(address(factory.extensionRegistry()), address(registry));
        assertEq(address(factory.policyEngine()), address(policyEngine));
        assertEq(address(factory.upgradeGovernor()), address(governor));
        assertEq(factory.owner(), admin);
    }
    
    function testGetTokenStandard() public view {
        ExtensionRegistry.TokenStandard standard = factory.getTokenStandard();
        assertEq(uint(standard), uint(ExtensionRegistry.TokenStandard.ERC4626));
    }
    
    function testGetSupportedExtensions() public view {
        ExtensionRegistry.ExtensionType[] memory supported = factory.getSupportedExtensions();
        assertEq(supported.length, 7, "Should support 7 ERC4626 extensions");
        
        // Verify all 7 ERC4626 extension types
        assertEq(uint(supported[0]), uint(ExtensionRegistry.ExtensionType.YIELD_STRATEGY));
        assertEq(uint(supported[1]), uint(ExtensionRegistry.ExtensionType.WITHDRAWAL_QUEUE));
        assertEq(uint(supported[2]), uint(ExtensionRegistry.ExtensionType.FEE_STRATEGY));
        assertEq(uint(supported[3]), uint(ExtensionRegistry.ExtensionType.ASYNC_VAULT));
        assertEq(uint(supported[4]), uint(ExtensionRegistry.ExtensionType.NATIVE_VAULT));
        assertEq(uint(supported[5]), uint(ExtensionRegistry.ExtensionType.ROUTER));
        assertEq(uint(supported[6]), uint(ExtensionRegistry.ExtensionType.MULTI_ASSET_VAULT));
    }
    
    // ============ YieldStrategy Extension Tests ============
    
    function testDeployYieldStrategyExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        bytes memory params = abi.encode(uint256(10_000)); // Mock params
        
        vm.prank(deployer);
        address yieldExtension = factory.deployYieldStrategy(
            mockVault,
            1, // strategyType
            params
        );
        
        assertTrue(yieldExtension != address(0), "Extension should be deployed");
        
        address registered = registry.getTokenExtensionByType(
            mockVault,
            ExtensionRegistry.ExtensionType.YIELD_STRATEGY
        );
        assertEq(registered, yieldExtension, "Should match by type");
    }
    
    // ============ WithdrawalQueue Extension Tests ============
    
    function testDeployWithdrawalQueueExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address queueExtension = factory.deployWithdrawalQueue(mockVault);
        
        assertTrue(queueExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockVault,
            ExtensionRegistry.ExtensionType.WITHDRAWAL_QUEUE
        );
        assertEq(registered, queueExtension);
    }
    
    // ============ FeeStrategy Extension Tests ============
    
    function testDeployFeeStrategyExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address feeExtension = factory.deployFeeStrategy(
            mockVault,
            50,            // depositFee (0.5%)
            100,           // withdrawalFee (1%)
            1000,          // performanceFee (10%)
            feeRecipient
        );
        
        assertTrue(feeExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockVault,
            ExtensionRegistry.ExtensionType.FEE_STRATEGY
        );
        assertEq(registered, feeExtension);
    }
    
    // ============ AsyncVault Extension Tests ============
    
    function testDeployAsyncVaultExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address asyncExtension = factory.deployAsyncVault(mockVault);
        
        assertTrue(asyncExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockVault,
            ExtensionRegistry.ExtensionType.ASYNC_VAULT
        );
        assertEq(registered, asyncExtension);
    }
    
    // ============ NativeVault Extension Tests ============
    
    function testDeployNativeVaultExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address nativeExtension = factory.deployNativeVault(mockVault);
        
        assertTrue(nativeExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockVault,
            ExtensionRegistry.ExtensionType.NATIVE_VAULT
        );
        assertEq(registered, nativeExtension);
    }
    
    // ============ Router Extension Tests ============
    
    function testDeployRouterExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address routerExtension = factory.deployRouter(mockVault);
        
        assertTrue(routerExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockVault,
            ExtensionRegistry.ExtensionType.ROUTER
        );
        assertEq(registered, routerExtension);
    }
    
    // ============ MultiAssetVault Extension Tests ============
    
    function testDeployMultiAssetVaultExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        address[] memory supportedAssets = new address[](2);
        supportedAssets[0] = address(0x100);
        supportedAssets[1] = address(0x200);
        
        vm.prank(deployer);
        address multiAssetExtension = factory.deployMultiAssetVault(
            mockVault,
            supportedAssets
        );
        
        assertTrue(multiAssetExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockVault,
            ExtensionRegistry.ExtensionType.MULTI_ASSET_VAULT
        );
        assertEq(registered, multiAssetExtension);
    }
    
    // ============ Multi-Extension Tests ============
    
    function testDeployMultipleExtensionsOnSameVault() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy multiple extensions
        bytes memory params = abi.encode(uint256(10_000));
        address yieldExt = factory.deployYieldStrategy(mockVault, 1, params);
        address queueExt = factory.deployWithdrawalQueue(mockVault);
        address feeExt = factory.deployFeeStrategy(mockVault, 50, 100, 1000, feeRecipient);
        address asyncExt = factory.deployAsyncVault(mockVault);
        
        vm.stopPrank();
        
        // Verify all are registered
        address[] memory extensions = registry.getTokenExtensions(mockVault);
        assertEq(extensions.length, 4, "Should have 4 extensions");
    }
    
    function testCannotDeployDuplicateExtensionType() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy first withdrawal queue
        factory.deployWithdrawalQueue(mockVault);
        
        // Try to deploy second - should revert
        vm.expectRevert();
        factory.deployWithdrawalQueue(mockVault);
        
        vm.stopPrank();
    }
    
    // ============ Access Control Tests ============
    
    function testCannotDeployWithoutRegistrarRole() public {
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployWithdrawalQueue(mockVault);
    }
    
    function testCannotDeployToZeroAddress() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployWithdrawalQueue(address(0));
    }
    
    // ============ Gas Optimization Tests ============
    
    function testGasEstimatesForDeployment() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        factory.deployWithdrawalQueue(mockVault);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for WithdrawalQueue deployment", gasUsed);
        assertTrue(gasUsed < 5_000_000, "Gas should be under 5M");
    }
    
    // ============ Integration Tests ============
    
    function testEndToEndDeploymentFlow() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy vault with multiple extensions
        bytes memory params = abi.encode(uint256(10_000));
        factory.deployYieldStrategy(mockVault, 1, params);
        factory.deployWithdrawalQueue(mockVault);
        factory.deployFeeStrategy(mockVault, 50, 100, 1000, feeRecipient);
        
        vm.stopPrank();
        
        // Verify all extensions are registered
        address[] memory extensions = registry.getTokenExtensions(mockVault);
        assertEq(extensions.length, 3);
        
        // Verify ExtensionRegistry stats
        assertTrue(registry.totalExtensions() >= 3);
    }
}

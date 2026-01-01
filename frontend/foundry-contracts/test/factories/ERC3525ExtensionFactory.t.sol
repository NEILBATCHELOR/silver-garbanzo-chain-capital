// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC3525ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC3525Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC3525ExtensionFactory Test Suite
 * @notice Comprehensive tests for ERC3525ExtensionFactory (Semi-Fungible Tokens)
 * @dev Tests all 3 ERC3525 extension types
 */
contract ERC3525ExtensionFactoryTest is Test {
    
    // ============ Contracts ============
    
    ERC3525ExtensionFactory public factory;
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    ERC3525Master public tokenImpl;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public user = address(3);
    
    address public mockToken;
    
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
        
        // Deploy ERC3525ExtensionFactory
        vm.prank(admin);
        factory = new ERC3525ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Deploy a mock ERC3525 token for testing
        tokenImpl = new ERC3525Master();
        bytes memory tokenInit = abi.encodeWithSelector(
            ERC3525Master.initialize.selector,
            "Test SFT",
            "TSFT",
            18,
            deployer,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy tokenProxy = new ERC1967Proxy(address(tokenImpl), tokenInit);
        mockToken = address(tokenProxy);
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
        assertEq(uint(standard), uint(ExtensionRegistry.TokenStandard.ERC3525));
    }
    
    function testGetSupportedExtensions() public view {
        ExtensionRegistry.ExtensionType[] memory supported = factory.getSupportedExtensions();
        assertEq(supported.length, 3, "Should support 3 ERC3525 extensions");
        
        // Verify all 3 ERC3525 extension types
        assertEq(uint(supported[0]), uint(ExtensionRegistry.ExtensionType.SLOT_MANAGER));
        assertEq(uint(supported[1]), uint(ExtensionRegistry.ExtensionType.SLOT_APPROVABLE));
        assertEq(uint(supported[2]), uint(ExtensionRegistry.ExtensionType.VALUE_EXCHANGE));
    }
    
    // ============ SlotManager Extension Tests ============
    
    function testDeploySlotManagerExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address slotManagerExtension = factory.deploySlotManager(
            mockToken,
            true,  // allowDynamicSlotCreation
            false, // restrictCrossSlot
            true   // allowSlotMerging
        );
        
        assertTrue(slotManagerExtension != address(0), "Extension should be deployed");
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.SLOT_MANAGER
        );
        assertEq(registered, slotManagerExtension, "Should match by type");
    }
    
    // ============ SlotApprovable Extension Tests ============
    
    function testDeploySlotApprovableExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address slotApprovableExtension = factory.deploySlotApprovable(mockToken);
        
        assertTrue(slotApprovableExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.SLOT_APPROVABLE
        );
        assertEq(registered, slotApprovableExtension);
    }
    
    // ============ ValueExchange Extension Tests ============
    
    function testDeployValueExchangeExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address valueExchangeExtension = factory.deployValueExchange(
            mockToken
        );
        
        assertTrue(valueExchangeExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.VALUE_EXCHANGE
        );
        assertEq(registered, valueExchangeExtension);
    }
    
    // ============ Multi-Extension Tests ============
    
    function testDeployMultipleExtensionsOnSameToken() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy all 3 extensions
        address slotMgrExt = factory.deploySlotManager(mockToken, true, false, true);
        address slotAppExt = factory.deploySlotApprovable(mockToken);
        address valueExExt = factory.deployValueExchange(mockToken);
        
        vm.stopPrank();
        
        // Verify all are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3, "Should have 3 extensions");
        
        // Verify each by type
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.SLOT_MANAGER), slotMgrExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.SLOT_APPROVABLE), slotAppExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.VALUE_EXCHANGE), valueExExt);
    }
    
    function testCannotDeployDuplicateExtensionType() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy first slot manager extension
        factory.deploySlotManager(mockToken, true, false, true);
        
        // Try to deploy second - should revert
        vm.expectRevert();
        factory.deploySlotManager(mockToken, true, false, true);
        
        vm.stopPrank();
    }
    
    // ============ Access Control Tests ============
    
    function testCannotDeployWithoutRegistrarRole() public {
        vm.prank(deployer);
        vm.expectRevert();
        factory.deploySlotManager(mockToken, true, false, true);
    }
    
    function testCannotDeployToZeroAddress() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        vm.expectRevert();
        factory.deploySlotManager(address(0), true, false, true);
    }
    
    // ============ Gas Optimization Tests ============
    
    function testGasEstimatesForDeployment() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        factory.deploySlotManager(mockToken, true, false, true);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for SlotManager deployment", gasUsed);
        assertTrue(gasUsed < 5_000_000, "Gas should be under 5M");
    }
    
    // ============ Integration Tests ============
    
    function testEndToEndDeploymentFlow() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy all extensions
        factory.deploySlotManager(mockToken, true, false, true);
        factory.deploySlotApprovable(mockToken);
        factory.deployValueExchange(mockToken);
        
        vm.stopPrank();
        
        // Verify all extensions are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3);
        
        // Verify ExtensionRegistry stats
        assertTrue(registry.totalExtensions() >= 3);
    }
}

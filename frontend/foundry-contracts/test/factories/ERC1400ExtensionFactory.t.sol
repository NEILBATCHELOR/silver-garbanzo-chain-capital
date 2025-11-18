// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC1400ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC1400Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC1400ExtensionFactory Test Suite
 * @notice Comprehensive tests for ERC1400ExtensionFactory (Security Token Extensions)
 * @dev Tests all 3 ERC1400 extension types
 */
contract ERC1400ExtensionFactoryTest is Test {
    
    // ============ Contracts ============
    
    ERC1400ExtensionFactory public factory;
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    ERC1400Master public tokenImpl;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public user = address(3);
    address public controller1 = address(4);
    address public controller2 = address(5);
    
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
        
        // Deploy ERC1400ExtensionFactory
        vm.prank(admin);
        factory = new ERC1400ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Deploy a mock ERC1400 token for testing
        tokenImpl = new ERC1400Master();
        bytes32[] memory defaultPartitions = new bytes32[](2);
        defaultPartitions[0] = bytes32("LOCKED");
        defaultPartitions[1] = bytes32("UNLOCKED");
        
        bytes memory tokenInit = abi.encodeWithSelector(
            ERC1400Master.initialize.selector,
            "Security Token",
            "SECTOKEN",
            1,
            defaultPartitions,
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
        assertEq(uint(standard), uint(ExtensionRegistry.TokenStandard.ERC1400));
    }
    
    function testGetSupportedExtensions() public view {
        ExtensionRegistry.ExtensionType[] memory supported = factory.getSupportedExtensions();
        assertEq(supported.length, 3, "Should support 3 ERC1400 extensions");
        
        // Verify all 3 ERC1400 extension types
        assertEq(uint(supported[0]), uint(ExtensionRegistry.ExtensionType.CONTROLLER));
        assertEq(uint(supported[1]), uint(ExtensionRegistry.ExtensionType.DOCUMENT));
        assertEq(uint(supported[2]), uint(ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS));
    }
    
    // ============ Controller Extension Tests ============
    
    function testDeployControllerExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        address[] memory controllers = new address[](2);
        controllers[0] = controller1;
        controllers[1] = controller2;
        
        vm.prank(deployer);
        address controllerExtension = factory.deployController(
            mockToken,
            controllers
        );
        
        assertTrue(controllerExtension != address(0), "Extension should be deployed");
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.CONTROLLER
        );
        assertEq(registered, controllerExtension, "Should match by type");
    }
    
    // ============ Document Extension Tests ============
    
    function testDeployDocumentExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address documentExtension = factory.deployDocument(mockToken);
        
        assertTrue(documentExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.DOCUMENT
        );
        assertEq(registered, documentExtension);
    }
    
    // ============ TransferRestrictions Extension Tests ============
    
    function testDeployTransferRestrictionsExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        bytes32[] memory partitions = new bytes32[](3);
        partitions[0] = bytes32("LOCKED");
        partitions[1] = bytes32("UNLOCKED");
        partitions[2] = bytes32("VESTING");
        
        vm.prank(deployer);
        address restrictionsExtension = factory.deployTransferRestrictions(
            mockToken,
            partitions
        );
        
        assertTrue(restrictionsExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS
        );
        assertEq(registered, restrictionsExtension);
    }
    
    // ============ Multi-Extension Tests ============
    
    function testDeployMultipleExtensionsOnSameToken() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy all 3 extensions
        address[] memory controllers = new address[](1);
        controllers[0] = controller1;
        address controllerExt = factory.deployController(mockToken, controllers);
        
        address documentExt = factory.deployDocument(mockToken);
        
        bytes32[] memory partitions = new bytes32[](2);
        partitions[0] = bytes32("LOCKED");
        partitions[1] = bytes32("UNLOCKED");
        address restrictionsExt = factory.deployTransferRestrictions(mockToken, partitions);
        
        vm.stopPrank();
        
        // Verify all are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3, "Should have 3 extensions");
        
        // Verify each by type
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.CONTROLLER), controllerExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.DOCUMENT), documentExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS), restrictionsExt);
    }
    
    function testCannotDeployDuplicateExtensionType() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy first document extension
        factory.deployDocument(mockToken);
        
        // Try to deploy second - should revert
        vm.expectRevert();
        factory.deployDocument(mockToken);
        
        vm.stopPrank();
    }
    
    // ============ Access Control Tests ============
    
    function testCannotDeployWithoutRegistrarRole() public {
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployDocument(mockToken);
    }
    
    function testCannotDeployToZeroAddress() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployDocument(address(0));
    }
    
    // ============ Gas Optimization Tests ============
    
    function testGasEstimatesForDeployment() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        factory.deployDocument(mockToken);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for Document deployment", gasUsed);
        assertTrue(gasUsed < 5_000_000, "Gas should be under 5M");
    }
    
    // ============ Integration Tests ============
    
    function testEndToEndDeploymentFlow() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy all extensions
        address[] memory controllers = new address[](1);
        controllers[0] = controller1;
        factory.deployController(mockToken, controllers);
        
        factory.deployDocument(mockToken);
        
        bytes32[] memory partitions = new bytes32[](2);
        partitions[0] = bytes32("LOCKED");
        partitions[1] = bytes32("UNLOCKED");
        factory.deployTransferRestrictions(mockToken, partitions);
        
        vm.stopPrank();
        
        // Verify all extensions are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3);
        
        // Verify ExtensionRegistry stats
        assertTrue(registry.totalExtensions() >= 3);
    }
}

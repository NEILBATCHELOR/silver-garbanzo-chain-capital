// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC1155ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC1155Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC1155ExtensionFactory Test Suite
 * @notice Comprehensive tests for ERC1155ExtensionFactory
 * @dev Tests all 3 ERC1155 extension types
 */
contract ERC1155ExtensionFactoryTest is Test {
    
    // ============ Contracts ============
    
    ERC1155ExtensionFactory public factory;
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    ERC1155Master public tokenImpl;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public user = address(3);
    address public royaltyReceiver = address(4);
    
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
        
        // Deploy ERC1155ExtensionFactory
        vm.prank(admin);
        factory = new ERC1155ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Deploy a mock ERC1155 token for testing
        tokenImpl = new ERC1155Master();
        bytes memory tokenInit = abi.encodeWithSelector(
            ERC1155Master.initialize.selector,
            "https://test.com/{id}.json",
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
        assertEq(uint(standard), uint(ExtensionRegistry.TokenStandard.ERC1155));
    }
    
    function testGetSupportedExtensions() public view {
        ExtensionRegistry.ExtensionType[] memory supported = factory.getSupportedExtensions();
        assertEq(supported.length, 3, "Should support 3 ERC1155 extensions");
        
        // Verify all 3 ERC1155 extension types
        assertEq(uint(supported[0]), uint(ExtensionRegistry.ExtensionType.URI_MANAGEMENT));
        assertEq(uint(supported[1]), uint(ExtensionRegistry.ExtensionType.SUPPLY_CAP));
        assertEq(uint(supported[2]), uint(ExtensionRegistry.ExtensionType.ROYALTY));
    }
    
    // ============ URI Management Extension Tests ============
    
    function testDeployURIManagementExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address uriExtension = factory.deployURIManagement(
            mockToken,
            "https://new.test.com/{id}.json"
        );
        
        assertTrue(uriExtension != address(0), "Extension should be deployed");
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.URI_MANAGEMENT
        );
        assertEq(registered, uriExtension, "Should match by type");
    }
    
    // ============ Supply Cap Extension Tests ============
    
    function testDeploySupplyCapExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address supplyCapExtension = factory.deploySupplyCap(mockToken);
        
        assertTrue(supplyCapExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.SUPPLY_CAP
        );
        assertEq(registered, supplyCapExtension);
    }
    
    // ============ Royalty Extension Tests ============
    
    function testDeployRoyaltyExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address royaltyExtension = factory.deployRoyalty(
            mockToken,
            royaltyReceiver,
            500 // 5%
        );
        
        assertTrue(royaltyExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.ROYALTY
        );
        assertEq(registered, royaltyExtension);
    }
    
    // ============ Multi-Extension Tests ============
    
    function testDeployMultipleExtensionsOnSameToken() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy all 3 extensions
        address uriExt = factory.deployURIManagement(mockToken, "https://new.test.com/{id}.json");
        address capExt = factory.deploySupplyCap(mockToken);
        address royaltyExt = factory.deployRoyalty(mockToken, royaltyReceiver, 500);
        
        vm.stopPrank();
        
        // Verify all are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3, "Should have 3 extensions");
        
        // Verify each by type
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.URI_MANAGEMENT), uriExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.SUPPLY_CAP), capExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.ROYALTY), royaltyExt);
    }
    
    function testCannotDeployDuplicateExtensionType() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy first URI management extension
        factory.deployURIManagement(mockToken, "https://test.com/{id}.json");
        
        // Try to deploy second - should revert
        vm.expectRevert();
        factory.deployURIManagement(mockToken, "https://test.com/{id}.json");
        
        vm.stopPrank();
    }
    
    // ============ Access Control Tests ============
    
    function testCannotDeployWithoutRegistrarRole() public {
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployURIManagement(mockToken, "https://test.com/{id}.json");
    }
    
    function testCannotDeployToZeroAddress() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployURIManagement(address(0), "https://test.com/{id}.json");
    }
    
    // ============ Gas Optimization Tests ============
    
    function testGasEstimatesForDeployment() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        factory.deploySupplyCap(mockToken);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for SupplyCap deployment", gasUsed);
        assertTrue(gasUsed < 5_000_000, "Gas should be under 5M");
    }
    
    // ============ Integration Tests ============
    
    function testEndToEndDeploymentFlow() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy all extensions
        factory.deployURIManagement(mockToken, "https://new.com/{id}.json");
        factory.deploySupplyCap(mockToken);
        factory.deployRoyalty(mockToken, royaltyReceiver, 500);
        
        vm.stopPrank();
        
        // Verify all extensions are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3);
        
        // Verify ExtensionRegistry stats
        assertTrue(registry.totalExtensions() >= 3);
    }
}

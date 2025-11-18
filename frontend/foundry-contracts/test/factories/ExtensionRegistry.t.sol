// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ExtensionRegistry Test Suite
 * @notice Comprehensive tests for ExtensionRegistry contract
 */
contract ExtensionRegistryTest is Test {
    ExtensionRegistry public registry;
    ExtensionRegistry public implementation;
    
    address public admin = address(1);
    address public registrar = address(2);
    address public upgrader = address(3);
    address public user = address(4);
    
    address public mockToken = address(0x1000);
    address public mockExtension = address(0x2000);
    address public mockFactory = address(0x3000);
    address public mockBeacon = address(0x4000);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ExtensionRegistry();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ExtensionRegistry.initialize.selector,
            admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        registry = ExtensionRegistry(address(proxy));
        
        // Grant roles
        vm.startPrank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), registrar);
        registry.grantRole(registry.UPGRADER_ROLE(), upgrader);
        vm.stopPrank();
    }
    
    function testInitialization() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.REGISTRAR_ROLE(), registrar));
        assertTrue(registry.hasRole(registry.UPGRADER_ROLE(), upgrader));
        assertEq(registry.totalExtensions(), 0);
        assertEq(registry.totalTokensWithExtensions(), 0);
    }
    
    function testRegisterExtension() public {
        vm.prank(registrar);
        registry.registerExtension(
            mockExtension,
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT,
            ExtensionRegistry.TokenStandard.ERC20,
            user
        );
        
        assertEq(registry.totalExtensions(), 1);
        assertEq(registry.totalTokensWithExtensions(), 1);
        
        ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(mockExtension);
        assertEq(info.extensionAddress, mockExtension);
        assertEq(info.tokenAddress, mockToken);
        assertEq(uint(info.extensionType), uint(ExtensionRegistry.ExtensionType.PERMIT));
        assertEq(uint(info.tokenStandard), uint(ExtensionRegistry.TokenStandard.ERC20));
        assertEq(info.deployer, user);
        assertEq(info.factory, registrar); // msg.sender is registrar
        assertTrue(info.isActive);
        assertEq(info.version, "1.0.0");
    }
    
    function testCannotRegisterWithoutRole() public {
        vm.prank(user);
        vm.expectRevert();
        registry.registerExtension(
            mockExtension,
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT,
            ExtensionRegistry.TokenStandard.ERC20,
            user
        );
    }
    
    function testGetTokenExtensions() public {
        // Register two extensions for the same token
        address mockExtension2 = address(0x2001);
        
        vm.startPrank(registrar);
        registry.registerExtension(
            mockExtension,
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT,
            ExtensionRegistry.TokenStandard.ERC20,
            user
        );
        
        registry.registerExtension(
            mockExtension2,
            mockToken,
            ExtensionRegistry.ExtensionType.COMPLIANCE,
            ExtensionRegistry.TokenStandard.ERC20,
            user
        );
        vm.stopPrank();
        
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 2);
        assertEq(extensions[0], mockExtension);
        assertEq(extensions[1], mockExtension2);
    }
    
    function testGetTokenExtensionByType() public {
        vm.prank(registrar);
        registry.registerExtension(
            mockExtension,
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT,
            ExtensionRegistry.TokenStandard.ERC20,
            user
        );
        
        address extension = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT
        );
        assertEq(extension, mockExtension);
    }
    
    function testCompatibilityMatrix() public view {
        // Test ERC20 compatible extensions
        assertTrue(registry.isCompatible(
            ExtensionRegistry.TokenStandard.ERC20,
            ExtensionRegistry.ExtensionType.PERMIT
        ));
        assertTrue(registry.isCompatible(
            ExtensionRegistry.TokenStandard.ERC20,
            ExtensionRegistry.ExtensionType.COMPLIANCE
        ));
        
        // Test ERC721 compatible extensions
        assertTrue(registry.isCompatible(
            ExtensionRegistry.TokenStandard.ERC721,
            ExtensionRegistry.ExtensionType.ROYALTY
        ));
        
        // Test incompatible combinations
        assertFalse(registry.isCompatible(
            ExtensionRegistry.TokenStandard.ERC20,
            ExtensionRegistry.ExtensionType.ROYALTY
        ));
    }
    
    function testRegisterBeacon() public {
        vm.prank(admin);
        registry.registerBeacon(
            ExtensionRegistry.ExtensionType.PERMIT,
            mockBeacon
        );
        
        assertEq(
            registry.extensionBeacons(ExtensionRegistry.ExtensionType.PERMIT),
            mockBeacon
        );
    }
    
    function testRegisterFactory() public {
        vm.prank(admin);
        registry.registerFactory(
            mockFactory,
            "ERC20Extensions"
        );
        
        assertTrue(registry.isRegisteredFactory(mockFactory));
        assertTrue(registry.hasRole(registry.REGISTRAR_ROLE(), mockFactory));
    }
    
    function testDeactivateExtension() public {
        vm.prank(registrar);
        registry.registerExtension(
            mockExtension,
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT,
            ExtensionRegistry.TokenStandard.ERC20,
            user
        );
        
        vm.prank(admin);
        registry.deactivateExtension(mockExtension);
        
        ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(mockExtension);
        assertFalse(info.isActive);
    }
    
    function testReactivateExtension() public {
        vm.prank(registrar);
        registry.registerExtension(
            mockExtension,
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT,
            ExtensionRegistry.TokenStandard.ERC20,
            user
        );
        
        vm.prank(admin);
        registry.deactivateExtension(mockExtension);
        
        vm.prank(admin);
        registry.reactivateExtension(mockExtension);
        
        ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(mockExtension);
        assertTrue(info.isActive);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/UniversalExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title UniversalExtensionFactory Test Suite
 * @notice Comprehensive tests for UniversalExtensionFactory
 */
contract UniversalExtensionFactoryTest is Test {
    UniversalExtensionFactory public universalFactory;
    ExtensionRegistry public registry;
    ExtensionRegistry public implementation;
    
    address public admin = address(1);
    address public registrar = address(2);
    address public owner = address(3);
    address public user = address(4);
    
    address public mockERC20Factory = address(0x1000);
    address public mockERC721Factory = address(0x2000);
    address public mockToken = address(0x3000);
    
    function setUp() public {
        // Deploy and initialize ExtensionRegistry
        implementation = new ExtensionRegistry();
        bytes memory initData = abi.encodeWithSelector(
            ExtensionRegistry.initialize.selector,
            admin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        registry = ExtensionRegistry(address(proxy));
        
        // Deploy UniversalExtensionFactory
        vm.prank(owner);
        universalFactory = new UniversalExtensionFactory(address(registry));
    }
    
    function testInitialization() public view {
        assertEq(address(universalFactory.extensionRegistry()), address(registry));
        assertEq(universalFactory.owner(), owner);
    }
    
    function testRegisterFactory() public {
        vm.prank(owner);
        universalFactory.registerFactory(
            mockERC20Factory,
            ExtensionRegistry.TokenStandard.ERC20,
            "ERC20ExtensionFactory"
        );
        
        assertEq(
            universalFactory.factories(ExtensionRegistry.TokenStandard.ERC20),
            mockERC20Factory
        );
        
        (
            address factoryAddress,
            string memory factoryType,
            ExtensionRegistry.TokenStandard standard,
            bool isActive,
            uint256 registeredAt
        ) = universalFactory.factoryInfo(mockERC20Factory);
        
        assertEq(factoryAddress, mockERC20Factory);
        assertEq(factoryType, "ERC20ExtensionFactory");
        assertEq(uint(standard), uint(ExtensionRegistry.TokenStandard.ERC20));
        assertTrue(isActive);
    }
    
    function testCannotRegisterFactoryWithoutOwnership() public {
        vm.prank(user);
        vm.expectRevert();
        universalFactory.registerFactory(
            mockERC20Factory,
            ExtensionRegistry.TokenStandard.ERC20,
            "ERC20ExtensionFactory"
        );
    }
    
    function testGetFactory() public {
        vm.prank(owner);
        universalFactory.registerFactory(
            mockERC20Factory,
            ExtensionRegistry.TokenStandard.ERC20,
            "ERC20ExtensionFactory"
        );
        
        address factory = universalFactory.getFactory(
            ExtensionRegistry.TokenStandard.ERC20
        );
        assertEq(factory, mockERC20Factory);
    }
    
    function testDeactivateFactory() public {
        vm.startPrank(owner);
        universalFactory.registerFactory(
            mockERC20Factory,
            ExtensionRegistry.TokenStandard.ERC20,
            "ERC20ExtensionFactory"
        );
        
        universalFactory.deactivateFactory(mockERC20Factory);
        vm.stopPrank();
        
        (
            ,
            ,
            ,
            bool isActive,
        ) = universalFactory.factoryInfo(mockERC20Factory);
        assertFalse(isActive);
    }
    
    function testReactivateFactory() public {
        vm.startPrank(owner);
        universalFactory.registerFactory(
            mockERC20Factory,
            ExtensionRegistry.TokenStandard.ERC20,
            "ERC20ExtensionFactory"
        );
        
        universalFactory.deactivateFactory(mockERC20Factory);
        universalFactory.reactivateFactory(mockERC20Factory);
        vm.stopPrank();
        
        (
            ,
            ,
            ,
            bool isActive,
        ) = universalFactory.factoryInfo(mockERC20Factory);
        assertTrue(isActive);
    }
    
    function testValidateCompatibility() public {
        bool compatible = universalFactory.validateCompatibility(
            ExtensionRegistry.TokenStandard.ERC20,
            ExtensionRegistry.ExtensionType.PERMIT
        );
        assertTrue(compatible);
        
        bool incompatible = universalFactory.validateCompatibility(
            ExtensionRegistry.TokenStandard.ERC20,
            ExtensionRegistry.ExtensionType.ROYALTY
        );
        assertFalse(incompatible);
    }
    
    function testGetAvailableExtensions() public view {
        ExtensionRegistry.ExtensionType[] memory extensions = 
            universalFactory.getAvailableExtensions(
                ExtensionRegistry.TokenStandard.ERC20
            );
        
        // Should have multiple compatible extensions
        assertTrue(extensions.length > 0);
    }
}

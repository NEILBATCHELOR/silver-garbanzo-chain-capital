// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/masters/ERC20Master.sol";
import "../../src/masters/ERC721Master.sol";
import "../../src/masters/ERC1155Master.sol";
import "../../src/interfaces/IExtensible.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title IExtensible Implementation Tests
 * @notice Tests IExtensible interface implementation across all master tokens
 * @dev Verifies extension attachment, detachment, and query functions
 */
contract IExtensibleTest is Test {
    
    // ============ Master Implementations ============
    
    ERC20Master public erc20Impl;
    ERC721Master public erc721Impl;
    ERC1155Master public erc1155Impl;
    
    // Proxies
    address public erc20Token;
    address public erc721Token;
    address public erc1155Token;
    
    // Infrastructure
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public owner = address(2);
    address public user = address(3);
    
    // Mock extension addresses
    address public extension1 = address(0x100);
    address public extension2 = address(0x200);
    address public extension3 = address(0x300);
    
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
        
        // Deploy ERC20Master
        erc20Impl = new ERC20Master();
        bytes memory erc20Init = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Test Token",
            "TEST",
            18,
            1_000_000 * 10**18,
            owner,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy erc20Proxy = new ERC1967Proxy(address(erc20Impl), erc20Init);
        erc20Token = address(erc20Proxy);
        
        // Deploy ERC721Master
        erc721Impl = new ERC721Master();
        bytes memory erc721Init = abi.encodeWithSelector(
            ERC721Master.initialize.selector,
            "Test NFT",
            "TNFT",
            "https://test.com/",
            owner,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy erc721Proxy = new ERC1967Proxy(address(erc721Impl), erc721Init);
        erc721Token = address(erc721Proxy);
        
        // Deploy ERC1155Master
        erc1155Impl = new ERC1155Master();
        bytes memory erc1155Init = abi.encodeWithSelector(
            ERC1155Master.initialize.selector,
            "https://test.com/{id}.json",
            owner,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy erc1155Proxy = new ERC1967Proxy(address(erc1155Impl), erc1155Init);
        erc1155Token = address(erc1155Proxy);
    }
    
    // ============ ERC20 IExtensible Tests ============
    
    function testERC20AttachExtension() public {
        IExtensible token = IExtensible(erc20Token);
        
        // Attach extension
        vm.prank(owner);
        token.attachExtension(extension1);
        
        // Verify extension is attached
        assertTrue(token.hasExtension(extension1), "Extension should be attached");
        
        address[] memory extensions = token.getExtensions();
        assertEq(extensions.length, 1, "Should have 1 extension");
        assertEq(extensions[0], extension1, "Should be extension1");
    }
    
    function testERC20DetachExtension() public {
        IExtensible token = IExtensible(erc20Token);
        
        // Attach and then detach
        vm.startPrank(owner);
        token.attachExtension(extension1);
        token.detachExtension(extension1);
        vm.stopPrank();
        
        // Verify extension is detached
        assertFalse(token.hasExtension(extension1), "Extension should be detached");
        
        address[] memory extensions = token.getExtensions();
        assertEq(extensions.length, 0, "Should have 0 extensions");
    }
    
    function testERC20MultipleExtensions() public {
        IExtensible token = IExtensible(erc20Token);
        
        // Attach multiple extensions
        vm.startPrank(owner);
        token.attachExtension(extension1);
        token.attachExtension(extension2);
        token.attachExtension(extension3);
        vm.stopPrank();
        
        // Verify all attached
        assertTrue(token.hasExtension(extension1));
        assertTrue(token.hasExtension(extension2));
        assertTrue(token.hasExtension(extension3));
        
        address[] memory extensions = token.getExtensions();
        assertEq(extensions.length, 3, "Should have 3 extensions");
    }
    
    function testERC20CannotAttachDuplicateExtension() public {
        IExtensible token = IExtensible(erc20Token);
        
        vm.startPrank(owner);
        token.attachExtension(extension1);
        
        // Try to attach same extension again - should revert
        vm.expectRevert();
        token.attachExtension(extension1);
        vm.stopPrank();
    }
    
    function testERC20CannotAttachZeroAddress() public {
        IExtensible token = IExtensible(erc20Token);
        
        vm.prank(owner);
        vm.expectRevert();
        token.attachExtension(address(0));
    }
    
    function testERC20OnlyOwnerCanAttach() public {
        IExtensible token = IExtensible(erc20Token);
        
        vm.prank(user);
        vm.expectRevert();
        token.attachExtension(extension1);
    }
    
    function testERC20OnlyOwnerCanDetach() public {
        IExtensible token = IExtensible(erc20Token);
        
        vm.prank(owner);
        token.attachExtension(extension1);
        
        vm.prank(user);
        vm.expectRevert();
        token.detachExtension(extension1);
    }
    
    // ============ ERC721 IExtensible Tests ============
    
    function testERC721AttachExtension() public {
        IExtensible token = IExtensible(erc721Token);
        
        vm.prank(owner);
        token.attachExtension(extension1);
        
        assertTrue(token.hasExtension(extension1));
        
        address[] memory extensions = token.getExtensions();
        assertEq(extensions.length, 1);
    }
    
    function testERC721DetachExtension() public {
        IExtensible token = IExtensible(erc721Token);
        
        vm.startPrank(owner);
        token.attachExtension(extension1);
        token.detachExtension(extension1);
        vm.stopPrank();
        
        assertFalse(token.hasExtension(extension1));
    }
    
    function testERC721MultipleExtensions() public {
        IExtensible token = IExtensible(erc721Token);
        
        vm.startPrank(owner);
        token.attachExtension(extension1);
        token.attachExtension(extension2);
        token.attachExtension(extension3);
        vm.stopPrank();
        
        address[] memory extensions = token.getExtensions();
        assertEq(extensions.length, 3);
    }
    
    // ============ ERC1155 IExtensible Tests ============
    
    function testERC1155AttachExtension() public {
        IExtensible token = IExtensible(erc1155Token);
        
        vm.prank(owner);
        token.attachExtension(extension1);
        
        assertTrue(token.hasExtension(extension1));
    }
    
    function testERC1155DetachExtension() public {
        IExtensible token = IExtensible(erc1155Token);
        
        vm.startPrank(owner);
        token.attachExtension(extension1);
        token.detachExtension(extension1);
        vm.stopPrank();
        
        assertFalse(token.hasExtension(extension1));
    }
    
    function testERC1155MultipleExtensions() public {
        IExtensible token = IExtensible(erc1155Token);
        
        vm.startPrank(owner);
        token.attachExtension(extension1);
        token.attachExtension(extension2);
        vm.stopPrank();
        
        address[] memory extensions = token.getExtensions();
        assertEq(extensions.length, 2);
    }
    
    // ============ Extension Registry Integration ============
    
    function testExtensionRegistryPointer() public {
        IExtensible erc20 = IExtensible(erc20Token);
        IExtensible erc721 = IExtensible(erc721Token);
        IExtensible erc1155 = IExtensible(erc1155Token);
        
        // All should point to same registry
        assertEq(erc20.extensionRegistry(), address(registry));
        assertEq(erc721.extensionRegistry(), address(registry));
        assertEq(erc1155.extensionRegistry(), address(registry));
    }
    
    // ============ Get Extension By Type Tests ============
    
    function testGetExtensionByType() public {
        IExtensible token = IExtensible(erc20Token);
        
        // Note: In real usage, extensions would have types
        // This tests the function exists and works
        vm.prank(owner);
        token.attachExtension(extension1);
        
        // Would need actual extension implementation to test type lookup
        // This verifies the function signature exists
        address ext = token.getExtensionByType(0); // Mock type
        // In real test with actual extensions, we'd verify correct extension returned
    }
    
    // ============ Events Tests ============
    
    function testExtensionAttachedEvent() public {
        IExtensible token = IExtensible(erc20Token);
        
        vm.expectEmit(true, true, false, false);
        emit IExtensible.ExtensionAttached(extension1, 0); // Mock extension type
        
        vm.prank(owner);
        token.attachExtension(extension1);
    }
    
    function testExtensionDetachedEvent() public {
        IExtensible token = IExtensible(erc20Token);
        
        vm.prank(owner);
        token.attachExtension(extension1);
        
        vm.expectEmit(true, true, false, false);
        emit IExtensible.ExtensionDetached(extension1, 0); // Mock extension type
        
        vm.prank(owner);
        token.detachExtension(extension1);
    }
}

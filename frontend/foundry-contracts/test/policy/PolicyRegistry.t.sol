// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/policy/PolicyRegistry.sol";

contract PolicyRegistryTest is Test {
    PolicyRegistry public implementation;
    PolicyRegistry public registry;
    
    address public admin = address(1);
    address public registryAdmin = address(2);
    address public token1 = address(100);
    address public token2 = address(101);
    address public policyEngine1 = address(200);
    address public policyEngine2 = address(201);
    
    // Test constants
    string constant STANDARD_ERC20 = "ERC20";
    string constant STANDARD_ERC721 = "ERC721";
    string constant OPERATION_TRANSFER = "TRANSFER";
    string constant OPERATION_MINT = "MINT";
    
    // Events
    event TokenRegistered(
        address indexed token,
        string standard,
        address indexed policyEngine
    );
    
    event PolicyRegistered(
        address indexed token,
        string operationType,
        address indexed policyEngine
    );
    
    event PolicyDeactivated(
        address indexed token,
        string operationType
    );
    
    function setUp() public {
        // Deploy implementation
        implementation = new PolicyRegistry();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            PolicyRegistry.initialize.selector,
            admin
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        registry = PolicyRegistry(address(proxy));
        
        // Grant roles
        vm.prank(admin);
        registry.grantRole(registry.REGISTRY_ADMIN_ROLE(), registryAdmin);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.REGISTRY_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.UPGRADER_ROLE(), admin));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        registry.initialize(admin);
    }
    
    // ============ Token Registration Tests ============
    
    function testRegisterToken() public {
        vm.startPrank(registryAdmin);
        
        vm.expectEmit(true, false, true, false);
        emit TokenRegistered(token1, STANDARD_ERC20, policyEngine1);
        
        registry.registerToken(token1, STANDARD_ERC20, policyEngine1);
        
        vm.stopPrank();
        
        // Verify registration
        assertTrue(registry.isTokenRegistered(token1));
        assertEq(registry.getTokenStandard(token1), STANDARD_ERC20);
        assertEq(registry.getTokenPolicyEngine(token1), policyEngine1);
    }
    
    function testRegisterTokenRequiresRole() public {
        vm.prank(address(999));
        vm.expectRevert();
        registry.registerToken(token1, STANDARD_ERC20, policyEngine1);
    }
    
    function testRegisterMultipleTokens() public {
        vm.startPrank(registryAdmin);
        
        registry.registerToken(token1, STANDARD_ERC20, policyEngine1);
        registry.registerToken(token2, STANDARD_ERC721, policyEngine2);
        
        vm.stopPrank();
        
        // Verify both registrations
        assertTrue(registry.isTokenRegistered(token1));
        assertTrue(registry.isTokenRegistered(token2));
        assertEq(registry.getTotalTokens(), 2);
    }
    
    // ============ Policy Registration Tests ============
    
    function testRegisterPolicy() public {
        // First register token
        vm.startPrank(registryAdmin);
        registry.registerToken(token1, STANDARD_ERC20, policyEngine1);
        
        // Then register policy
        vm.expectEmit(true, false, true, false);
        emit PolicyRegistered(token1, OPERATION_TRANSFER, policyEngine1);
        
        registry.registerPolicy(token1, OPERATION_TRANSFER, policyEngine1);
        
        vm.stopPrank();
        
        // Verify policy registration
        assertTrue(registry.isPolicyActive(token1, OPERATION_TRANSFER));
        assertEq(registry.getPolicyEngine(token1, OPERATION_TRANSFER), policyEngine1);
    }
    
    function testDeactivatePolicy() public {
        // Setup
        vm.startPrank(registryAdmin);
        registry.registerToken(token1, STANDARD_ERC20, policyEngine1);
        registry.registerPolicy(token1, OPERATION_TRANSFER, policyEngine1);
        
        // Deactivate
        vm.expectEmit(true, false, false, false);
        emit PolicyDeactivated(token1, OPERATION_TRANSFER);
        
        registry.deactivatePolicy(token1, OPERATION_TRANSFER);
        vm.stopPrank();
        
        // Verify deactivation
        assertFalse(registry.isPolicyActive(token1, OPERATION_TRANSFER));
    }
    
    function testGetTokenOperations() public {
        vm.startPrank(registryAdmin);
        registry.registerToken(token1, STANDARD_ERC20, policyEngine1);
        registry.registerPolicy(token1, OPERATION_TRANSFER, policyEngine1);
        registry.registerPolicy(token1, OPERATION_MINT, policyEngine1);
        vm.stopPrank();
        
        string[] memory operations = registry.getTokenOperations(token1);
        assertEq(operations.length, 2);
        assertEq(operations[0], OPERATION_TRANSFER);
        assertEq(operations[1], OPERATION_MINT);
    }
    
    function testGetTokensByEngine() public {
        vm.startPrank(registryAdmin);
        registry.registerToken(token1, STANDARD_ERC20, policyEngine1);
        registry.registerToken(token2, STANDARD_ERC721, policyEngine1);
        vm.stopPrank();
        
        address[] memory tokens = registry.getTokensByEngine(policyEngine1);
        assertEq(tokens.length, 2);
        assertEq(tokens[0], token1);
        assertEq(tokens[1], token2);
    }
    
    // ============ UUPS Upgrade Tests ============
    
    function testUpgradeAuthorization() public {
        PolicyRegistry newImplementation = new PolicyRegistry();
        
        // Only UPGRADER_ROLE can upgrade
        vm.prank(admin);
        registry.upgradeToAndCall(address(newImplementation), "");
        
        // Non-upgrader cannot upgrade
        vm.prank(address(999));
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImplementation), "");
    }
}

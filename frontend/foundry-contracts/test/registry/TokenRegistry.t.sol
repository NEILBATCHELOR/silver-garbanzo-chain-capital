// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/registry/TokenRegistry.sol";

contract TokenRegistryTest is Test {
    TokenRegistry public implementation;
    TokenRegistry public registry;
    
    address public admin = address(1);
    address public registrar = address(2);
    address public deployer1 = address(100);
    address public deployer2 = address(101);
    address public proxy1 = address(200);
    address public proxy2 = address(201);
    address public impl1 = address(300);
    address public impl2 = address(301);
    
    // Test constants
    string constant STANDARD_ERC20 = "ERC20";
    string constant STANDARD_ERC721 = "ERC721";
    string constant TOKEN_NAME = "Test Token";
    string constant TOKEN_SYMBOL = "TEST";
    uint256 constant CHAIN_ID = 8453; // Base
    
    // Events
    event TokenRegistered(
        address indexed proxy,
        address indexed deployer,
        string standard,
        string name,
        string symbol,
        uint256 chainId
    );
    
    event TokenUpgraded(
        address indexed proxy,
        address indexed oldImplementation,
        address indexed newImplementation,
        address upgradedBy,
        string reason
    );
    
    event TokenDeactivated(address indexed proxy, string reason);
    event TokenReactivated(address indexed proxy);
    
    function setUp() public {
        // Deploy implementation
        implementation = new TokenRegistry();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            TokenRegistry.initialize.selector,
            admin
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        registry = TokenRegistry(address(proxy));
        
        // Grant roles
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), registrar);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.REGISTRAR_ROLE(), admin));
        assertTrue(registry.hasRole(registry.UPGRADER_ROLE(), admin));
        assertEq(registry.totalTokens(), 0);
        assertEq(registry.totalUpgrades(), 0);
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        registry.initialize(admin);
    }
    
    // ============ Token Registration Tests ============
    
    function testRegisterToken() public {
        vm.startPrank(registrar);
        
        vm.expectEmit(true, true, false, true);
        emit TokenRegistered(proxy1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        
        registry.registerToken(
            proxy1,
            impl1,
            deployer1,
            STANDARD_ERC20,
            TOKEN_NAME,
            TOKEN_SYMBOL,
            CHAIN_ID
        );
        
        vm.stopPrank();
        
        // Verify registration
        (address proxyAddr, address impl, address deployer, string memory standard,,,,,,bool isActive) 
            = registry.tokens(proxy1);
        
        assertEq(proxyAddr, proxy1);
        assertEq(impl, impl1);
        assertEq(deployer, deployer1);
        assertEq(standard, STANDARD_ERC20);
        assertTrue(isActive);
        assertEq(registry.totalTokens(), 1);
    }
    
    function testRegisterTokenRequiresRole() public {
        vm.prank(address(999));
        vm.expectRevert();
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
    }
    
    function testGetTokensByDeployer() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        registry.registerToken(proxy2, impl2, deployer1, STANDARD_ERC721, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        vm.stopPrank();
        
        address[] memory tokens = registry.getTokensByDeployer(deployer1);
        assertEq(tokens.length, 2);
        assertEq(tokens[0], proxy1);
        assertEq(tokens[1], proxy2);
    }
    
    function testGetTokensByStandard() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        registry.registerToken(proxy2, impl2, deployer2, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        vm.stopPrank();
        
        address[] memory tokens = registry.getTokensByStandard(STANDARD_ERC20);
        assertEq(tokens.length, 2);
    }
    
    
    // ============ Token Upgrade Tests ============
    
    function testRecordUpgrade() public {
        vm.prank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        
        vm.prank(registrar);
        vm.expectEmit(true, true, true, false);
        emit TokenUpgraded(proxy1, impl1, impl2, registrar, "Upgrade to v2");
        
        registry.recordUpgrade(proxy1, impl2, "Upgrade to v2");
        
        (,address newImpl,,,,,,,) = registry.tokens(proxy1);
        assertEq(newImpl, impl2);
        assertEq(registry.totalUpgrades(), 1);
    }
    
    function testGetUpgradeHistory() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        registry.recordUpgrade(proxy1, impl2, "First upgrade");
        registry.recordUpgrade(proxy1, impl1, "Rollback");
        vm.stopPrank();
        
        (address[] memory implementations, uint256[] memory timestamps, string[] memory reasons) = 
            registry.getUpgradeHistory(proxy1);
        
        assertEq(implementations.length, 2);
        assertEq(implementations[0], impl2);
        assertEq(implementations[1], impl1);
        assertEq(reasons[0], "First upgrade");
        assertEq(reasons[1], "Rollback");
    }
    
    // ============ Token Deactivation Tests ============
    
    function testDeactivateToken() public {
        vm.prank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        
        vm.prank(registrar);
        vm.expectEmit(true, false, false, true);
        emit TokenDeactivated(proxy1, "Security issue");
        
        registry.deactivateToken(proxy1, "Security issue");
        
        (,,,,,,,, bool isActive) = registry.tokens(proxy1);
        assertFalse(isActive);
    }
    
    function testReactivateToken() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        registry.deactivateToken(proxy1, "Test");
        
        vm.expectEmit(true, false, false, true);
        emit TokenReactivated(proxy1);
        
        registry.reactivateToken(proxy1);
        vm.stopPrank();
        
        (,,,,,,,, bool isActive) = registry.tokens(proxy1);
        assertTrue(isActive);
    }
    
    // ============ Statistics Tests ============
    
    function testTotalTokensIncreases() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        assertEq(registry.totalTokens(), 1);
        
        registry.registerToken(proxy2, impl2, deployer2, STANDARD_ERC721, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        assertEq(registry.totalTokens(), 2);
        vm.stopPrank();
    }
    
    function testTotalUpgradesIncreases() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        
        assertEq(registry.totalUpgrades(), 0);
        registry.recordUpgrade(proxy1, impl2, "Upgrade 1");
        assertEq(registry.totalUpgrades(), 1);
        registry.recordUpgrade(proxy1, impl1, "Upgrade 2");
        assertEq(registry.totalUpgrades(), 2);
        vm.stopPrank();
    }
    
    // ============ Access Control Tests ============
    
    function testGrantRegistrarRole() public {
        address newRegistrar = address(10);
        
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), newRegistrar);
        
        assertTrue(registry.hasRole(registry.REGISTRAR_ROLE(), newRegistrar));
        
        // Verify new registrar can register
        vm.prank(newRegistrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
    }
    
    function testRevokeRegistrarRole() public {
        vm.startPrank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), registrar);
        registry.revokeRole(registry.REGISTRAR_ROLE(), registrar);
        vm.stopPrank();
        
        vm.prank(registrar);
        vm.expectRevert();
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgradeRegistry() public {
        TokenRegistry newImpl = new TokenRegistry();
        
        vm.prank(admin);
        registry.upgradeToAndCall(address(newImpl), "");
        
        // State should be preserved
        assertEq(registry.totalTokens(), 0);
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        TokenRegistry newImpl = new TokenRegistry();
        
        vm.prank(address(999));
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImpl), "");
    }
    
    // ============ Query Function Tests ============
    
    function testGetTokensByChain() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, "Token 1", "TK1", 8453); // Base
        registry.registerToken(proxy2, impl2, deployer2, STANDARD_ERC20, "Token 2", "TK2", 1);     // Ethereum
        vm.stopPrank();
        
        address[] memory baseTokens = registry.getTokensByChain(8453);
        address[] memory ethTokens = registry.getTokensByChain(1);
        
        assertEq(baseTokens.length, 1);
        assertEq(ethTokens.length, 1);
        assertEq(baseTokens[0], proxy1);
        assertEq(ethTokens[0], proxy2);
    }
    
    function testIsTokenRegistered() public {
        vm.prank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        
        assertTrue(registry.isTokenRegistered(proxy1));
        assertFalse(registry.isTokenRegistered(address(999)));
    }
    
    // ============ Edge Cases ============
    
    function testCannotRegisterSameTokenTwice() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        
        vm.expectRevert("Token already registered");
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, TOKEN_NAME, TOKEN_SYMBOL, CHAIN_ID);
        vm.stopPrank();
    }
    
    function testCannotRecordUpgradeForUnregisteredToken() public {
        vm.prank(registrar);
        vm.expectRevert("Token not registered");
        registry.recordUpgrade(address(999), impl2, "Test");
    }
    
    function testCannotDeactivateUnregisteredToken() public {
        vm.prank(registrar);
        vm.expectRevert("Token not registered");
        registry.deactivateToken(address(999), "Test");
    }
    
    function testGetTokenInfoForUnregistered() public view {
        (address proxy,,,,,,,, bool isActive) = registry.tokens(address(999));
        assertEq(proxy, address(0));
        assertFalse(isActive);
    }
    
    function testMultipleDeployersStatistics() public {
        vm.startPrank(registrar);
        registry.registerToken(proxy1, impl1, deployer1, STANDARD_ERC20, "Token 1", "TK1", CHAIN_ID);
        registry.registerToken(proxy2, impl2, deployer2, STANDARD_ERC20, "Token 2", "TK2", CHAIN_ID);
        vm.stopPrank();
        
        address[] memory deployer1Tokens = registry.getTokensByDeployer(deployer1);
        address[] memory deployer2Tokens = registry.getTokensByDeployer(deployer2);
        
        assertEq(deployer1Tokens.length, 1);
        assertEq(deployer2Tokens.length, 1);
    }
}

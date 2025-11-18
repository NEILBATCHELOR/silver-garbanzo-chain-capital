// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC20Factory.sol";
import "../../src/factories/ERC20ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/registry/TokenRegistry.sol";
import "../../src/factories/FactoryRegistry.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title End-to-End Integration Tests
 * @notice Tests complete flows: Deploy token → Attach extensions → Use extensions
 * @dev Tests multi-extension scenarios and cross-factory integrations
 */
contract EndToEndIntegrationTest is Test {
    
    // ============ Contracts ============
    
    // Factories
    ERC20Factory public tokenFactory;
    ERC20ExtensionFactory public extensionFactory;
    
    // Infrastructure
    ExtensionRegistry public extensionRegistry;
    ExtensionRegistry public extensionRegistryImpl;
    TokenRegistry public tokenRegistry;
    TokenRegistry public tokenRegistryImpl;
    FactoryRegistry public factoryRegistry;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    address public feeRecipient = address(5);
    
    // ============ Events ============
    
    event TokenDeployed(address indexed token, address indexed deployer);
    event ExtensionAttached(address indexed token, address indexed extension);
    
    // ============ Setup ============
    
    function setUp() public {
        // Deploy ExtensionRegistry
        extensionRegistryImpl = new ExtensionRegistry();
        bytes memory extRegInit = abi.encodeWithSelector(
            ExtensionRegistry.initialize.selector,
            admin
        );
        ERC1967Proxy extRegProxy = new ERC1967Proxy(address(extensionRegistryImpl), extRegInit);
        extensionRegistry = ExtensionRegistry(address(extRegProxy));
        
        // Deploy TokenRegistry
        tokenRegistryImpl = new TokenRegistry();
        bytes memory tokenRegInit = abi.encodeWithSelector(
            TokenRegistry.initialize.selector,
            admin
        );
        ERC1967Proxy tokenRegProxy = new ERC1967Proxy(address(tokenRegistryImpl), tokenRegInit);
        tokenRegistry = TokenRegistry(address(tokenRegProxy));
        
        // Deploy FactoryRegistry
        factoryRegistry = new FactoryRegistry();
        
        // Deploy PolicyEngine
        policyEngine = new PolicyEngine();
        
        // Deploy UpgradeGovernor
        address[] memory initialAdmins = new address[](1);
        initialAdmins[0] = admin;
        governor = new UpgradeGovernor(initialAdmins, 2, 1 days);
        
        // Deploy Factories
        vm.startPrank(admin);
        
        tokenFactory = new ERC20Factory(
            address(factoryRegistry),
            address(tokenRegistry),
            address(policyEngine),
            address(extensionRegistry)
        );
        
        extensionFactory = new ERC20ExtensionFactory(
            address(extensionRegistry),
            address(policyEngine),
            address(governor)
        );
        
        // Grant necessary roles
        extensionRegistry.grantRole(extensionRegistry.REGISTRAR_ROLE(), address(extensionFactory));
        tokenRegistry.grantRole(tokenRegistry.REGISTRAR_ROLE(), address(tokenFactory));
        
        vm.stopPrank();
    }
    
    // ============ Basic End-to-End Flow ============
    
    function testCompleteERC20WithPermit() public {
        // Step 1: Deploy ERC20 token
        vm.prank(deployer);
        address token = tokenFactory.deployERC20(
            "Test Token",
            "TEST",
            18,
            1_000_000 * 10**18
        );
        
        assertFalse(token == address(0), "Token should be deployed");
        
        // Step 2: Attach Permit extension
        vm.prank(deployer);
        address permitExtension = extensionFactory.deployPermit(
            token,
            "Test Token",
            "1"
        );
        
        assertFalse(permitExtension == address(0), "Permit extension should be deployed");
        
        // Step 3: Verify extension is registered
        address[] memory extensions = extensionRegistry.getTokenExtensions(token);
        assertEq(extensions.length, 1, "Should have 1 extension");
        assertEq(extensions[0], permitExtension, "Should be permit extension");
        
        // Step 4: Verify token is in TokenRegistry
        assertTrue(tokenRegistry.isTokenRegistered(token), "Token should be registered");
    }
    
    // ============ Multi-Extension Flow ============
    
    function testERC20WithMultipleExtensions() public {
        // Deploy token
        vm.prank(deployer);
        address token = tokenFactory.deployERC20(
            "Multi Extension Token",
            "MULTI",
            18,
            10_000_000 * 10**18
        );
        
        // Attach 5 different extensions
        vm.startPrank(deployer);
        
        address permit = extensionFactory.deployPermit(token, "Multi Extension Token", "1");
        address compliance = extensionFactory.deployCompliance(token, true, true);
        address vesting = extensionFactory.deployVesting(token);
        address snapshot = extensionFactory.deploySnapshot(token);
        address votes = extensionFactory.deployVotes(token);
        
        vm.stopPrank();
        
        // Verify all extensions are registered
        address[] memory extensions = extensionRegistry.getTokenExtensions(token);
        assertEq(extensions.length, 5, "Should have 5 extensions");
        
        // Verify each extension individually
        assertEq(
            extensionRegistry.getTokenExtensionByType(token, ExtensionRegistry.ExtensionType.PERMIT),
            permit,
            "Permit should be registered"
        );
        assertEq(
            extensionRegistry.getTokenExtensionByType(token, ExtensionRegistry.ExtensionType.COMPLIANCE),
            compliance,
            "Compliance should be registered"
        );
        assertEq(
            extensionRegistry.getTokenExtensionByType(token, ExtensionRegistry.ExtensionType.VESTING),
            vesting,
            "Vesting should be registered"
        );
        assertEq(
            extensionRegistry.getTokenExtensionByType(token, ExtensionRegistry.ExtensionType.SNAPSHOT),
            snapshot,
            "Snapshot should be registered"
        );
        assertEq(
            extensionRegistry.getTokenExtensionByType(token, ExtensionRegistry.ExtensionType.VOTES),
            votes,
            "Votes should be registered"
        );
    }
    
    // ============ Extension Detachment Flow ============
    
    function testAttachAndDetachExtensions() public {
        // Deploy token with extensions
        vm.prank(deployer);
        address token = tokenFactory.deployERC20("Test", "TST", 18, 1_000_000 * 10**18);
        
        vm.startPrank(deployer);
        address permit = extensionFactory.deployPermit(token, "Test", "1");
        address compliance = extensionFactory.deployCompliance(token, true, true);
        vm.stopPrank();
        
        // Verify 2 extensions
        address[] memory extensions = extensionRegistry.getTokenExtensions(token);
        assertEq(extensions.length, 2);
        
        // Detach compliance extension
        vm.prank(admin);
        extensionRegistry.removeExtension(token, compliance);
        
        // Verify only 1 extension remains
        extensions = extensionRegistry.getTokenExtensions(token);
        assertEq(extensions.length, 1);
        assertEq(extensions[0], permit);
    }
    
    // ============ Policy Validation Flow ============
    
    function testDeploymentWithPolicyValidation() public {
        // This test verifies policy engine integration
        // If policy engine rejects deployment, it should fail
        
        vm.prank(deployer);
        address token = tokenFactory.deployERC20(
            "Policy Compliant Token",
            "PCT",
            18,
            1_000_000 * 10**18
        );
        
        // Token should be deployed if policy allows
        assertFalse(token == address(0));
        
        // Extension should respect policy
        vm.prank(deployer);
        address permit = extensionFactory.deployPermit(token, "Policy Compliant Token", "1");
        
        assertFalse(permit == address(0));
    }
    
    // ============ Cross-Standard Integration ============
    
    function testMultipleTokensWithExtensions() public {
        // Deploy multiple tokens
        vm.startPrank(deployer);
        
        address token1 = tokenFactory.deployERC20("Token 1", "TK1", 18, 1_000_000 * 10**18);
        address token2 = tokenFactory.deployERC20("Token 2", "TK2", 18, 2_000_000 * 10**18);
        address token3 = tokenFactory.deployERC20("Token 3", "TK3", 18, 3_000_000 * 10**18);
        
        // Attach different extensions to each
        extensionFactory.deployPermit(token1, "Token 1", "1");
        
        extensionFactory.deployCompliance(token2, true, true);
        extensionFactory.deployVesting(token2);
        
        extensionFactory.deploySnapshot(token3);
        extensionFactory.deployVotes(token3);
        extensionFactory.deployFees(token3, 100, feeRecipient);
        
        vm.stopPrank();
        
        // Verify each token has correct number of extensions
        assertEq(extensionRegistry.getTokenExtensions(token1).length, 1);
        assertEq(extensionRegistry.getTokenExtensions(token2).length, 2);
        assertEq(extensionRegistry.getTokenExtensions(token3).length, 3);
    }
    
    // ============ Governance Integration ============
    
    function testExtensionUpgradeGovernance() public {
        // This tests the governance flow for upgrading extensions
        // Deploy token with extension
        vm.prank(deployer);
        address token = tokenFactory.deployERC20("Gov Token", "GOV", 18, 1_000_000 * 10**18);
        
        vm.prank(deployer);
        address permit = extensionFactory.deployPermit(token, "Gov Token", "1");
        
        // Verify extension is deployed
        assertFalse(permit == address(0));
        
        // Upgrades would go through UpgradeGovernor
        // (governance upgrade tests are in separate UpgradeGovernor.t.sol)
    }
    
    // ============ Gas Benchmarking ============
    
    function testGasUsageForCompleteFlow() public {
        uint256 gasStart = gasleft();
        
        // Complete flow: Deploy + 3 extensions
        vm.startPrank(deployer);
        
        address token = tokenFactory.deployERC20("Gas Test", "GAS", 18, 1_000_000 * 10**18);
        extensionFactory.deployPermit(token, "Gas Test", "1");
        extensionFactory.deployCompliance(token, true, true);
        extensionFactory.deployVesting(token);
        
        vm.stopPrank();
        
        uint256 gasUsed = gasStart - gasleft();
        
        emit log_named_uint("Total gas for token + 3 extensions", gasUsed);
        
        // Verify gas is reasonable (adjust threshold as needed)
        assertTrue(gasUsed < 20_000_000, "Gas should be under 20M for complete flow");
    }
    
    // ============ Extension Query Tests ============
    
    function testExtensionQueryFunctions() public {
        // Deploy token with extensions
        vm.prank(deployer);
        address token = tokenFactory.deployERC20("Query Test", "QRY", 18, 1_000_000 * 10**18);
        
        vm.startPrank(deployer);
        extensionFactory.deployPermit(token, "Query Test", "1");
        extensionFactory.deployCompliance(token, true, true);
        vm.stopPrank();
        
        // Test getTokenExtensions
        address[] memory extensions = extensionRegistry.getTokenExtensions(token);
        assertEq(extensions.length, 2);
        
        // Test getTokenExtensionByType
        address permit = extensionRegistry.getTokenExtensionByType(
            token,
            ExtensionRegistry.ExtensionType.PERMIT
        );
        assertFalse(permit == address(0));
        
        // Test totalExtensions
        uint256 total = extensionRegistry.totalExtensions();
        assertTrue(total >= 2);
    }
}

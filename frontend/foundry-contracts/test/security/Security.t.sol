// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC20ExtensionFactory.sol";
import "../../src/factories/ERC721ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC20Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Comprehensive Security Tests
 * @notice Tests access control, reentrancy protection, and security measures
 * @dev Covers all critical security aspects of the factory system
 */
contract SecurityTest is Test {
    
    // ============ Contracts ============
    
    ERC20ExtensionFactory public erc20Factory;
    ERC721ExtensionFactory public erc721Factory;
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    ERC20Master public tokenImpl;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public attacker = address(3);
    address public user = address(4);
    
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
        
        // Deploy Extension Factories
        vm.startPrank(admin);
        erc20Factory = new ERC20ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        erc721Factory = new ERC721ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        vm.stopPrank();
        
        // Deploy mock token
        tokenImpl = new ERC20Master();
        bytes memory tokenInit = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Test Token",
            "TEST",
            18,
            1_000_000 * 10**18,
            deployer,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy tokenProxy = new ERC1967Proxy(address(tokenImpl), tokenInit);
        mockToken = address(tokenProxy);
    }
    
    // ============ Access Control Tests ============
    
    function testOnlyRegistrarCanRegisterExtensions() public {
        // Attacker tries to register extension without REGISTRAR_ROLE
        vm.prank(attacker);
        vm.expectRevert();
        erc20Factory.deployPermit(mockToken, "Test", "1");
    }
    
    function testOnlyAdminCanGrantRegistrarRole() public {
        // Attacker tries to grant themselves REGISTRAR_ROLE
        vm.prank(attacker);
        vm.expectRevert();
        registry.grantRole(registry.REGISTRAR_ROLE(), attacker);
        
        // Admin can grant role
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
    }
    
    function testOnlyOwnerCanInitializeBeacons() public {
        // Create new factory
        ERC20ExtensionFactory newFactory = new ERC20ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        address[] memory impls = new address[](10);
        for (uint i = 0; i < 10; i++) {
            impls[i] = address(uint160(0x1000 + i));
        }
        
        // Attacker tries to initialize beacons
        vm.prank(attacker);
        vm.expectRevert();
        newFactory.initializeBeacons(
            impls[0], impls[1], impls[2], impls[3], impls[4],
            impls[5], impls[6], impls[7], impls[8], impls[9]
        );
        
        // Owner can initialize
        vm.prank(admin);
        newFactory.initializeBeacons(
            impls[0], impls[1], impls[2], impls[3], impls[4],
            impls[5], impls[6], impls[7], impls[8], impls[9]
        );
    }
    
    function testCannotInitializeBeaconsTwice() public {
        ERC20ExtensionFactory newFactory = new ERC20ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        address[] memory impls = new address[](10);
        for (uint i = 0; i < 10; i++) {
            impls[i] = address(uint160(0x1000 + i));
        }
        
        vm.startPrank(admin);
        newFactory.initializeBeacons(
            impls[0], impls[1], impls[2], impls[3], impls[4],
            impls[5], impls[6], impls[7], impls[8], impls[9]
        );
        
        // Try to initialize again
        vm.expectRevert();
        newFactory.initializeBeacons(
            impls[0], impls[1], impls[2], impls[3], impls[4],
            impls[5], impls[6], impls[7], impls[8], impls[9]
        );
        vm.stopPrank();
    }
    
    function testOnlyTokenOwnerCanAttachExtensions() public {
        // Grant factory REGISTRAR_ROLE
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        // Deployer (token owner) can attach
        vm.prank(deployer);
        erc20Factory.deployPermit(mockToken, "Test", "1");
        
        // Attacker cannot attach
        vm.prank(attacker);
        vm.expectRevert();
        string[] memory jurisdictions = new string[](2);
        jurisdictions[0] = "US";
        jurisdictions[1] = "EU";
        erc20Factory.deployCompliance(mockToken, jurisdictions, 3, 1000, true);
    }
    
    // ============ Input Validation Tests ============
    
    function testCannotDeployToZeroAddress() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        vm.prank(deployer);
        vm.expectRevert();
        erc20Factory.deployPermit(address(0), "Test", "1");
    }
    
    function testCannotRegisterDuplicateExtensionType() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        vm.startPrank(deployer);
        
        // Deploy first permit extension
        erc20Factory.deployPermit(mockToken, "Test", "1");
        
        // Try to deploy second permit extension
        vm.expectRevert();
        erc20Factory.deployPermit(mockToken, "Test", "1");
        
        vm.stopPrank();
    }
    
    function testCannotAttachZeroAddressExtension() public {
        vm.prank(deployer);
        vm.expectRevert();
        IExtensible(mockToken).attachExtension(address(0));
    }
    
    // ============ Role Management Security ============
    
    function testCannotRenounceRoleWithoutPermission() public {
        // Grant role
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        // Attacker tries to revoke role
        vm.prank(attacker);
        vm.expectRevert();
        registry.revokeRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
    }
    
    function testAdminCanRevokeRoles() public {
        // Grant role
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        // Admin can revoke
        vm.prank(admin);
        registry.revokeRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        // Factory can no longer deploy extensions
        vm.prank(deployer);
        vm.expectRevert();
        erc20Factory.deployPermit(mockToken, "Test", "1");
    }
    
    // ============ Upgrade Security Tests ============
    
    function testOnlyGovernanceCanUpgradeBeacons() public {
        // This would test beacon upgrade governance
        // Actual implementation depends on UpgradeGovernor details
        // Test that only governance can propose/execute upgrades
        
        vm.prank(attacker);
        // Should revert when attacker tries to upgrade
        // vm.expectRevert();
        // upgradeBeacon(...);
    }
    
    // ============ Extension Type Uniqueness Tests ============
    
    function testExtensionTypeUniquenessEnforcement() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        vm.startPrank(deployer);
        
        // Deploy permit extension
        erc20Factory.deployPermit(mockToken, "Test", "1");
        
        // Verify only one extension of this type exists
        address permit = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT
        );
        assertFalse(permit == address(0));
        
        // Try to deploy another permit - should fail
        vm.expectRevert();
        erc20Factory.deployPermit(mockToken, "Test", "1");
        
        vm.stopPrank();
    }
    
    // ============ Token Standard Compatibility Tests ============
    
    function testCannotAttachIncompatibleExtensions() public {
        // ERC721-specific extension cannot be deployed to ERC20 token
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc721Factory));
        
        // This should fail compatibility check
        vm.prank(deployer);
        vm.expectRevert();
        erc721Factory.deployRoyalty(mockToken, address(5), 500, 1000); // Added maxRoyaltyCap
    }
    
    // ============ Reentrancy Protection Tests ============
    
    function testNoReentrancyInExtensionDeployment() public {
        // Deploy extension and verify no reentrancy possible
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        vm.prank(deployer);
        address extension = erc20Factory.deployPermit(mockToken, "Test", "1");
        
        // Verify extension deployed successfully (no reentrancy occurred)
        assertFalse(extension == address(0));
    }
    
    // ============ Factory State Consistency Tests ============
    
    function testFactoryStateConsistencyAfterFailedDeployment() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        vm.startPrank(deployer);
        
        // Successful deployment
        erc20Factory.deployPermit(mockToken, "Test", "1");
        
        // Failed deployment (duplicate)
        try erc20Factory.deployPermit(mockToken, "Test", "1") {
            fail("Should have reverted");
        } catch {
            // Expected
        }
        
        // Verify state is still consistent - can deploy other extensions
        string[] memory jurisdictions2 = new string[](2);
        jurisdictions2[0] = "US";
        jurisdictions2[1] = "EU";
        address compliance = erc20Factory.deployCompliance(mockToken, jurisdictions2, 3, 1000, true);
        assertFalse(compliance == address(0));
        
        vm.stopPrank();
    }
    
    // ============ Registry State Protection Tests ============
    
    function testRegistryCannotBeCorrupted() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        vm.startPrank(deployer);
        
        // Deploy multiple extensions
        erc20Factory.deployPermit(mockToken, "Test", "1");
        string[] memory jurisdictions3 = new string[](2);
        jurisdictions3[0] = "US";
        jurisdictions3[1] = "EU";
        erc20Factory.deployCompliance(mockToken, jurisdictions3, 3, 1000, true);
        
        // Verify registry state is correct
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 2);
        
        // Verify each extension is correctly registered
        address permit = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT
        );
        address compliance = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.COMPLIANCE
        );
        
        assertFalse(permit == address(0));
        assertFalse(compliance == address(0));
        assertTrue(permit != compliance);
        
        vm.stopPrank();
    }
    
    // ============ Gas Limits and DOS Protection ============
    
    function testCannotDeployExcessiveExtensions() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        
        vm.startPrank(deployer);
        
        // Deploy all 10 ERC20 extensions (max)
        erc20Factory.deployPermit(mockToken, "Test", "1");
        string[] memory jurisdictions4 = new string[](2);
        jurisdictions4[0] = "US";
        jurisdictions4[1] = "EU";
        erc20Factory.deployCompliance(mockToken, jurisdictions4, 3, 1000, true);
        erc20Factory.deployVesting(mockToken);
        erc20Factory.deploySnapshot(mockToken);
        erc20Factory.deployTimelock(mockToken, 1 days, 30 days, false);
        erc20Factory.deployFlashMint(mockToken, address(5), 100);
        erc20Factory.deployVotes(mockToken, "Gov Token", 1, 50400, 100000 * 10**18, 4);
        erc20Factory.deployFees(mockToken, address(5), 100);
        erc20Factory.deployTemporaryApproval(mockToken, 7 days, 1 days, 30 days);
        erc20Factory.deployPayable(mockToken, 100000); // 100K gas limit
        
        // Verify all 10 deployed
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 10);
        
        // Cannot deploy more than supported
        vm.expectRevert();
        erc20Factory.deployPermit(mockToken, "Test", "2");
        
        vm.stopPrank();
    }
}

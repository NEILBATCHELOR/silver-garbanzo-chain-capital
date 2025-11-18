// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC20ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC20Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC20ExtensionFactory Test Suite
 * @notice Comprehensive tests for ERC20ExtensionFactory
 * @dev Tests all 10 ERC20 extension types
 */
contract ERC20ExtensionFactoryTest is Test {
    
    // ============ Contracts ============
    
    ERC20ExtensionFactory public factory;
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    ERC20Master public tokenImpl;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public user = address(3);
    address public feeRecipient = address(4);
    
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
        
        // Deploy PolicyEngine (optional, can be address(0))
        policyEngine = new PolicyEngine();
        
        // Deploy UpgradeGovernor (optional, can be address(0))
        address[] memory initialAdmins = new address[](1);
        initialAdmins[0] = admin;
        governor = new UpgradeGovernor(initialAdmins, 2, 1 days);
        
        // Deploy ERC20ExtensionFactory
        vm.prank(admin);
        factory = new ERC20ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Deploy a mock ERC20 token for testing
        tokenImpl = new ERC20Master();
        bytes memory tokenInit = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Test Token",
            "TEST",
            18,
            1000000 * 10**18,
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
        assertEq(uint(standard), uint(ExtensionRegistry.TokenStandard.ERC20));
    }
    
    function testGetSupportedExtensions() public view {
        ExtensionRegistry.ExtensionType[] memory supported = factory.getSupportedExtensions();
        assertEq(supported.length, 10, "Should support 10 ERC20 extensions");
        
        // Verify all 10 ERC20 extension types
        assertEq(uint(supported[0]), uint(ExtensionRegistry.ExtensionType.PERMIT));
        assertEq(uint(supported[1]), uint(ExtensionRegistry.ExtensionType.COMPLIANCE));
        assertEq(uint(supported[2]), uint(ExtensionRegistry.ExtensionType.VESTING));
        assertEq(uint(supported[3]), uint(ExtensionRegistry.ExtensionType.SNAPSHOT));
        assertEq(uint(supported[4]), uint(ExtensionRegistry.ExtensionType.TIMELOCK));
        assertEq(uint(supported[5]), uint(ExtensionRegistry.ExtensionType.FLASHMINT));
        assertEq(uint(supported[6]), uint(ExtensionRegistry.ExtensionType.VOTES));
        assertEq(uint(supported[7]), uint(ExtensionRegistry.ExtensionType.FEES));
        assertEq(uint(supported[8]), uint(ExtensionRegistry.ExtensionType.TEMPORARY_APPROVAL));
        assertEq(uint(supported[9]), uint(ExtensionRegistry.ExtensionType.PAYABLE));
    }
    
    // ============ Permit Extension Tests ============
    
    function testDeployPermitExtension() public {
        // Grant REGISTRAR_ROLE to factory
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        // Deploy Permit extension
        vm.prank(deployer);
        address permitExtension = factory.deployPermit(
            mockToken,
            "Test Token",
            "1"
        );
        
        // Verify deployment
        assertTrue(permitExtension != address(0), "Extension should be deployed");
        
        // Verify registration in ExtensionRegistry
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 1, "Should have 1 extension");
        assertEq(extensions[0], permitExtension, "Should be permit extension");
        
        // Verify extension type
        address registeredExtension = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.PERMIT
        );
        assertEq(registeredExtension, permitExtension, "Should match by type");
    }
    
    // ============ Compliance Extension Tests ============
    
    function testDeployComplianceExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address complianceExtension = factory.deployCompliance(
            mockToken,
            true,  // requireKYC
            true   // whitelistEnabled
        );
        
        assertTrue(complianceExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.COMPLIANCE
        );
        assertEq(registered, complianceExtension);
    }
    
    // ============ Vesting Extension Tests ============
    
    function testDeployVestingExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address vestingExtension = factory.deployVesting(mockToken);
        
        assertTrue(vestingExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.VESTING
        );
        assertEq(registered, vestingExtension);
    }
    
    // ============ Snapshot Extension Tests ============
    
    function testDeploySnapshotExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address snapshotExtension = factory.deploySnapshot(mockToken);
        
        assertTrue(snapshotExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.SNAPSHOT
        );
        assertEq(registered, snapshotExtension);
    }
    
    // ============ Timelock Extension Tests ============
    
    function testDeployTimelockExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address timelockExtension = factory.deployTimelock(
            mockToken,
            1 days  // minDelay
        );
        
        assertTrue(timelockExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.TIMELOCK
        );
        assertEq(registered, timelockExtension);
    }
    
    // ============ FlashMint Extension Tests ============
    
    function testDeployFlashMintExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address flashMintExtension = factory.deployFlashMint(
            mockToken,
            1000000 * 10**18,  // maxFlashLoan
            100                 // flashFee (1%)
        );
        
        assertTrue(flashMintExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.FLASHMINT
        );
        assertEq(registered, flashMintExtension);
    }
    
    // ============ Votes Extension Tests ============
    
    function testDeployVotesExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address votesExtension = factory.deployVotes(mockToken);
        
        assertTrue(votesExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.VOTES
        );
        assertEq(registered, votesExtension);
    }
    
    // ============ Fees Extension Tests ============
    
    function testDeployFeesExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address feesExtension = factory.deployFees(
            mockToken,
            100,           // feeBasisPoints (1%)
            feeRecipient
        );
        
        assertTrue(feesExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.FEES
        );
        assertEq(registered, feesExtension);
    }
    
    // ============ TemporaryApproval Extension Tests ============
    
    function testDeployTemporaryApprovalExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address tempApprovalExtension = factory.deployTemporaryApproval(mockToken);
        
        assertTrue(tempApprovalExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.TEMPORARY_APPROVAL
        );
        assertEq(registered, tempApprovalExtension);
    }
    
    // ============ Payable Extension Tests ============
    
    function testDeployPayableExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address payableExtension = factory.deployPayable(mockToken);
        
        assertTrue(payableExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.PAYABLE
        );
        assertEq(registered, payableExtension);
    }
    
    // ============ Multi-Extension Tests ============
    
    function testDeployMultipleExtensionsOnSameToken() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy multiple extensions
        address permitExt = factory.deployPermit(mockToken, "Test", "1");
        address complianceExt = factory.deployCompliance(mockToken, true, true);
        address vestingExt = factory.deployVesting(mockToken);
        
        vm.stopPrank();
        
        // Verify all are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3, "Should have 3 extensions");
        
        // Verify each by type
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.PERMIT), permitExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.COMPLIANCE), complianceExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.VESTING), vestingExt);
    }
    
    function testCannotDeployDuplicateExtensionType() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy first permit extension
        factory.deployPermit(mockToken, "Test", "1");
        
        // Try to deploy second permit extension - should revert
        vm.expectRevert();
        factory.deployPermit(mockToken, "Test", "1");
        
        vm.stopPrank();
    }
    
    // ============ Access Control Tests ============
    
    function testCannotDeployWithoutRegistrarRole() public {
        // Don't grant REGISTRAR_ROLE to factory
        
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployPermit(mockToken, "Test", "1");
    }
    
    function testCannotDeployToZeroAddress() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployPermit(address(0), "Test", "1");
    }
    
    // ============ Beacon Management Tests ============
    
    function testInitializeBeacons() public {
        // Create new factory instance to test beacon initialization
        ERC20ExtensionFactory newFactory = new ERC20ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Deploy master implementations (mock addresses for testing)
        address permitImpl = address(0x1000);
        address complianceImpl = address(0x2000);
        address vestingImpl = address(0x3000);
        address snapshotImpl = address(0x4000);
        address timelockImpl = address(0x5000);
        address flashMintImpl = address(0x6000);
        address votesImpl = address(0x7000);
        address feesImpl = address(0x8000);
        address tempApprovalImpl = address(0x9000);
        address payableImpl = address(0xA000);
        
        // Initialize beacons (only owner can do this)
        vm.prank(admin);
        newFactory.initializeBeacons(
            permitImpl,
            complianceImpl,
            vestingImpl,
            snapshotImpl,
            timelockImpl,
            flashMintImpl,
            votesImpl,
            feesImpl,
            tempApprovalImpl,
            payableImpl
        );
        
        // Verify beacons are initialized (non-zero addresses)
        assertTrue(newFactory.permitBeacon() != address(0));
        assertTrue(newFactory.complianceBeacon() != address(0));
        assertTrue(newFactory.vestingBeacon() != address(0));
        assertTrue(newFactory.snapshotBeacon() != address(0));
        assertTrue(newFactory.timelockBeacon() != address(0));
        assertTrue(newFactory.flashMintBeacon() != address(0));
        assertTrue(newFactory.votesBeacon() != address(0));
        assertTrue(newFactory.feesBeacon() != address(0));
        assertTrue(newFactory.temporaryApprovalBeacon() != address(0));
        assertTrue(newFactory.payableBeacon() != address(0));
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
        
        // Try to initialize again - should revert
        vm.expectRevert();
        newFactory.initializeBeacons(
            impls[0], impls[1], impls[2], impls[3], impls[4],
            impls[5], impls[6], impls[7], impls[8], impls[9]
        );
        vm.stopPrank();
    }
    
    function testCannotInitializeBeaconsAsNonOwner() public {
        ERC20ExtensionFactory newFactory = new ERC20ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        address[] memory impls = new address[](10);
        for (uint i = 0; i < 10; i++) {
            impls[i] = address(uint160(0x1000 + i));
        }
        
        vm.prank(user);
        vm.expectRevert();
        newFactory.initializeBeacons(
            impls[0], impls[1], impls[2], impls[3], impls[4],
            impls[5], impls[6], impls[7], impls[8], impls[9]
        );
    }
    
    // ============ Gas Optimization Tests ============
    
    function testGasEstimatesForDeployment() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        factory.deployPermit(mockToken, "Test", "1");
        uint256 gasUsed = gasBefore - gasleft();
        
        // Log gas usage for reference
        emit log_named_uint("Gas used for Permit deployment", gasUsed);
        
        // Basic sanity check (should be reasonable)
        assertTrue(gasUsed < 5_000_000, "Gas should be under 5M");
    }
    
    // ============ Integration Tests ============
    
    function testEndToEndDeploymentFlow() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // 1. Deploy token with multiple extensions
        address permit = factory.deployPermit(mockToken, "Test Token", "1");
        address compliance = factory.deployCompliance(mockToken, true, true);
        address vesting = factory.deployVesting(mockToken);
        address votes = factory.deployVotes(mockToken);
        
        vm.stopPrank();
        
        // 2. Verify all extensions are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 4);
        
        // 3. Verify token can query its extensions
        assertTrue(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.PERMIT) != address(0));
        assertTrue(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.COMPLIANCE) != address(0));
        assertTrue(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.VESTING) != address(0));
        assertTrue(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.VOTES) != address(0));
        
        // 4. Verify ExtensionRegistry stats
        assertTrue(registry.totalExtensions() >= 4);
    }
}

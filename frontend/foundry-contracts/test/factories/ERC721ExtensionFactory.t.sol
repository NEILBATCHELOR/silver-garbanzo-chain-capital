// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC721ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC721Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC721ExtensionFactory Test Suite
 * @notice Comprehensive tests for ERC721ExtensionFactory
 * @dev Tests all 7 ERC721 extension types
 */
contract ERC721ExtensionFactoryTest is Test {
    
    // ============ Contracts ============
    
    ERC721ExtensionFactory public factory;
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    ERC721Master public tokenImpl;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public user = address(3);
    address public royaltyReceiver = address(4);
    address public fractionToken = address(5);
    
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
        
        // Deploy ERC721ExtensionFactory
        vm.prank(admin);
        factory = new ERC721ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Deploy a mock ERC721 token for testing
        tokenImpl = new ERC721Master();
        bytes memory tokenInit = abi.encodeWithSelector(
            ERC721Master.initialize.selector,
            "Test NFT",
            "TNFT",
            "https://test.com/",
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
        assertEq(uint(standard), uint(ExtensionRegistry.TokenStandard.ERC721));
    }
    
    function testGetSupportedExtensions() public view {
        ExtensionRegistry.ExtensionType[] memory supported = factory.getSupportedExtensions();
        assertEq(supported.length, 7, "Should support 7 ERC721 extensions");
        
        // Verify all 7 ERC721 extension types
        assertEq(uint(supported[0]), uint(ExtensionRegistry.ExtensionType.ROYALTY));
        assertEq(uint(supported[1]), uint(ExtensionRegistry.ExtensionType.SOULBOUND));
        assertEq(uint(supported[2]), uint(ExtensionRegistry.ExtensionType.RENTAL));
        assertEq(uint(supported[3]), uint(ExtensionRegistry.ExtensionType.FRACTIONALIZATION));
        assertEq(uint(supported[4]), uint(ExtensionRegistry.ExtensionType.METADATA));
        assertEq(uint(supported[5]), uint(ExtensionRegistry.ExtensionType.GRANULAR_APPROVAL));
        assertEq(uint(supported[6]), uint(ExtensionRegistry.ExtensionType.CONSECUTIVE));
    }
    
    // ============ Royalty Extension Tests ============
    
    function testDeployRoyaltyExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address royaltyExtension = factory.deployRoyalty(
            mockToken,
            royaltyReceiver,
            500, // 5%
            1000 // 10% max cap
        );
        
        assertTrue(royaltyExtension != address(0), "Extension should be deployed");
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.ROYALTY
        );
        assertEq(registered, royaltyExtension, "Should match by type");
    }
    
    // ============ Soulbound Extension Tests ============
    
    function testDeploySoulboundExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address soulboundExtension = factory.deploySoulbound(
            mockToken,
            false, // allowOneTimeTransfer
            true,  // burnableByOwner
            false, // burnableByIssuer
            false, // expirationEnabled
            0      // expirationPeriod
        );
        
        assertTrue(soulboundExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.SOULBOUND
        );
        assertEq(registered, soulboundExtension);
    }
    
    // ============ Rental Extension Tests ============
    
    function testDeployRentalExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address rentalExtension = factory.deployRental(
            mockToken,
            royaltyReceiver, // feeRecipient
            250,             // platformFeeBps (2.5%)
            1 days,          // minRentalDuration
            30 days,         // maxRentalDuration
            0.01 ether,      // minRentalPrice
            true,            // depositRequired
            1000             // minDepositBps (10%)
        );
        
        assertTrue(rentalExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.RENTAL
        );
        assertEq(registered, rentalExtension);
    }
    
    // ============ Fractionalization Extension Tests ============
    
    function testDeployFractionalizationExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address fractionExtension = factory.deployFractionalization(
            mockToken,
            100,    // minFractions
            10000,  // maxFractions
            15000,  // buyoutMultiplierBps (150%)
            true,   // redemptionEnabled
            0.001 ether, // fractionPrice
            true    // tradingEnabled
        );
        
        assertTrue(fractionExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.FRACTIONALIZATION
        );
        assertEq(registered, fractionExtension);
    }
    
    // ============ Metadata Extension Tests ============
    
    function testDeployMetadataExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address metadataExtension = factory.deployMetadata(
            mockToken,
            true,  // batchUpdatesEnabled
            false  // emitOnTransfer
        );
        
        assertTrue(metadataExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.METADATA
        );
        assertEq(registered, metadataExtension);
    }
    
    // ============ GranularApproval Extension Tests ============
    
    function testDeployGranularApprovalExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address granularExtension = factory.deployGranularApproval(mockToken);
        
        assertTrue(granularExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.GRANULAR_APPROVAL
        );
        assertEq(registered, granularExtension);
    }
    
    // ============ Consecutive Extension Tests ============
    
    function testDeployConsecutiveExtension() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        address consecutiveExtension = factory.deployConsecutive(
            mockToken,
            1,   // startTokenId
            100  // maxBatchSize
        );
        
        assertTrue(consecutiveExtension != address(0));
        
        address registered = registry.getTokenExtensionByType(
            mockToken,
            ExtensionRegistry.ExtensionType.CONSECUTIVE
        );
        assertEq(registered, consecutiveExtension);
    }
    
    // ============ Multi-Extension Tests ============
    
    function testDeployMultipleExtensionsOnSameToken() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy multiple extensions
        address royaltyExt = factory.deployRoyalty(mockToken, royaltyReceiver, 500, 1000);
        address soulboundExt = factory.deploySoulbound(mockToken, false, true, false, false, 0);
        address metadataExt = factory.deployMetadata(mockToken, true, false);
        
        vm.stopPrank();
        
        // Verify all are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3, "Should have 3 extensions");
        
        // Verify each by type
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.ROYALTY), royaltyExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.SOULBOUND), soulboundExt);
        assertEq(registry.getTokenExtensionByType(mockToken, ExtensionRegistry.ExtensionType.METADATA), metadataExt);
    }
    
    function testCannotDeployDuplicateExtensionType() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy first royalty extension
        factory.deployRoyalty(mockToken, royaltyReceiver, 500, 1000);
        
        // Try to deploy second royalty extension - should revert
        vm.expectRevert();
        factory.deployRoyalty(mockToken, royaltyReceiver, 500, 1000);
        
        vm.stopPrank();
    }
    
    // ============ Access Control Tests ============
    
    function testCannotDeployWithoutRegistrarRole() public {
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployRoyalty(mockToken, royaltyReceiver, 500, 1000);
    }
    
    function testCannotDeployToZeroAddress() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        vm.expectRevert();
        factory.deployRoyalty(address(0), royaltyReceiver, 500, 1000);
    }
    
    // ============ Gas Optimization Tests ============
    
    function testGasEstimatesForDeployment() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        factory.deployRoyalty(mockToken, royaltyReceiver, 500, 1000);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for Royalty deployment", gasUsed);
        assertTrue(gasUsed < 5_000_000, "Gas should be under 5M");
    }
    
    // ============ Integration Tests ============
    
    function testEndToEndDeploymentFlow() public {
        vm.prank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        
        vm.startPrank(deployer);
        
        // Deploy token with multiple extensions
        address royalty = factory.deployRoyalty(mockToken, royaltyReceiver, 500, 1000);
        address metadata = factory.deployMetadata(mockToken, true, false);
        address rental = factory.deployRental(mockToken, royaltyReceiver, 250, 1 days, 30 days, 0.01 ether, true, 1000);
        
        vm.stopPrank();
        
        // Verify all extensions are registered
        address[] memory extensions = registry.getTokenExtensions(mockToken);
        assertEq(extensions.length, 3);
        
        // Verify ExtensionRegistry stats
        assertTrue(registry.totalExtensions() >= 3);
    }
}

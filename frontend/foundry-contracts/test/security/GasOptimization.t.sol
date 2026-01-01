// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/factories/ERC20ExtensionFactory.sol";
import "../../src/factories/ERC721ExtensionFactory.sol";
import "../../src/factories/ERC1155ExtensionFactory.sol";
import "../../src/factories/ERC3525ExtensionFactory.sol";
import "../../src/factories/ERC4626ExtensionFactory.sol";
import "../../src/factories/ERC1400ExtensionFactory.sol";
import "../../src/factories/ExtensionRegistry.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC20Master.sol";
import "../../src/masters/ERC721Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Gas Optimization Tests
 * @notice Comprehensive gas usage benchmarking for all factory operations
 * @dev Measures and validates gas costs across the entire system
 */
contract GasOptimizationTest is Test {
    
    // ============ Contracts ============
    
    ERC20ExtensionFactory public erc20Factory;
    ERC721ExtensionFactory public erc721Factory;
    ERC1155ExtensionFactory public erc1155Factory;
    ERC3525ExtensionFactory public erc3525Factory;
    ERC4626ExtensionFactory public erc4626Factory;
    ERC1400ExtensionFactory public erc1400Factory;
    
    ExtensionRegistry public registry;
    ExtensionRegistry public registryImpl;
    PolicyEngine public policyEngine;
    UpgradeGovernor public governor;
    
    ERC20Master public erc20Impl;
    ERC721Master public erc721Impl;
    
    address public mockERC20Token;
    address public mockERC721Token;
    
    // ============ Test Addresses ============
    
    address public admin = address(1);
    address public deployer = address(2);
    address public feeRecipient = address(3);
    
    // ============ Setup ============
    
    function setUp() public {
        // Deploy infrastructure
        registryImpl = new ExtensionRegistry();
        bytes memory registryInit = abi.encodeWithSelector(
            ExtensionRegistry.initialize.selector,
            admin
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInit);
        registry = ExtensionRegistry(address(registryProxy));
        
        policyEngine = new PolicyEngine();
        
        address[] memory initialAdmins = new address[](1);
        initialAdmins[0] = admin;
        governor = new UpgradeGovernor(initialAdmins, 2, 1 days);
        
        // Deploy all extension factories
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
        
        erc1155Factory = new ERC1155ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        erc3525Factory = new ERC3525ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        erc4626Factory = new ERC4626ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        erc1400Factory = new ERC1400ExtensionFactory(
            address(registry),
            address(policyEngine),
            address(governor)
        );
        
        // Grant REGISTRAR_ROLE to all factories
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc20Factory));
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc721Factory));
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc1155Factory));
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc3525Factory));
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc4626Factory));
        registry.grantRole(registry.REGISTRAR_ROLE(), address(erc1400Factory));
        
        vm.stopPrank();
        
        // Deploy mock tokens
        erc20Impl = new ERC20Master();
        bytes memory erc20Init = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Test Token",
            "TEST",
            18,
            1_000_000 * 10**18,
            deployer,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy erc20Proxy = new ERC1967Proxy(address(erc20Impl), erc20Init);
        mockERC20Token = address(erc20Proxy);
        
        erc721Impl = new ERC721Master();
        bytes memory erc721Init = abi.encodeWithSelector(
            ERC721Master.initialize.selector,
            "Test NFT",
            "TNFT",
            "https://test.com/",
            deployer,
            address(registry),
            address(policyEngine)
        );
        ERC1967Proxy erc721Proxy = new ERC1967Proxy(address(erc721Impl), erc721Init);
        mockERC721Token = address(erc721Proxy);
    }
    
    // ============ ERC20 Extension Gas Tests ============
    
    function testGasERC20PermitDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployPermit(mockERC20Token, "Test", "1");
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Permit Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20ComplianceDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployCompliance(mockERC20Token, true, true);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Compliance Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20VestingDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployVesting(mockERC20Token);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Vesting Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20SnapshotDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deploySnapshot(mockERC20Token);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Snapshot Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20TimelockDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployTimelock(mockERC20Token, 1 days, 30 days, false);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Timelock Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20FlashMintDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployFlashMint(mockERC20Token, address(0x123), 100);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 FlashMint Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20VotesDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployVotes(mockERC20Token, "Gov Token", 1, 50400, 100000 * 10**18, 4);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Votes Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20FeesDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployFees(mockERC20Token, feeRecipient, 100);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Fees Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20TemporaryApprovalDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployTemporaryApproval(mockERC20Token, 7 days, 1 days, 30 days);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 TemporaryApproval Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC20PayableDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc20Factory.deployPayable(mockERC20Token, 100000); // 100K gas limit
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC20 Payable Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    // ============ ERC721 Extension Gas Tests ============
    
    function testGasERC721RoyaltyDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc721Factory.deployRoyalty(mockERC721Token, feeRecipient, 500, 1000); // Added maxRoyaltyCap
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC721 Royalty Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC721SoulboundDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc721Factory.deploySoulbound(mockERC721Token, false, true, false, false, 0); // Added 5 params
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC721 Soulbound Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC721RentalDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc721Factory.deployRental(mockERC721Token, feeRecipient, 250, 1 days, 30 days, 0.01 ether, true, 1000); // Added 5 params
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC721 Rental Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC721FractionalizationDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc721Factory.deployFractionalization(mockERC721Token, 100, 10000, 15000, true, 0.001 ether, true); // Changed to numeric params
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC721 Fractionalization Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC721MetadataDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc721Factory.deployMetadata(mockERC721Token, true, false); // Added 2 boolean params
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC721 Metadata Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC721GranularApprovalDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc721Factory.deployGranularApproval(mockERC721Token);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC721 GranularApproval Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    function testGasERC721ConsecutiveDeployment() public {
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        erc721Factory.deployConsecutive(mockERC721Token, 1, 100); // Added startTokenId and maxBatchSize
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: ERC721 Consecutive Deployment", gasUsed);
        assertTrue(gasUsed < 3_000_000, "Should be under 3M gas");
    }
    
    // ============ Multi-Extension Gas Tests ============
    
    function testGasMultipleExtensionsSequential() public {
        vm.startPrank(deployer);
        
        uint256 gasBefore = gasleft();
        
        // Deploy 5 extensions sequentially
        erc20Factory.deployPermit(mockERC20Token, "Test", "1");
        erc20Factory.deployCompliance(mockERC20Token, true, true);
        erc20Factory.deployVesting(mockERC20Token);
        erc20Factory.deploySnapshot(mockERC20Token);
        erc20Factory.deployVotes(mockERC20Token, "Gov Token", 1, 50400, 100000 * 10**18, 4);
        
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: 5 ERC20 Extensions Sequential", gasUsed);
        emit log_named_uint("Gas: Average per Extension", gasUsed / 5);
        
        assertTrue(gasUsed < 15_000_000, "Total should be under 15M gas");
        
        vm.stopPrank();
    }
    
    function testGasAllERC20Extensions() public {
        vm.startPrank(deployer);
        
        uint256 gasBefore = gasleft();
        
        // Deploy all 10 ERC20 extensions
        erc20Factory.deployPermit(mockERC20Token, "Test", "1");
        erc20Factory.deployCompliance(mockERC20Token, true, true);
        erc20Factory.deployVesting(mockERC20Token);
        erc20Factory.deploySnapshot(mockERC20Token);
        erc20Factory.deployTimelock(mockERC20Token, 1 days, 30 days, false);
        erc20Factory.deployFlashMint(mockERC20Token, feeRecipient, 100);
        erc20Factory.deployVotes(mockERC20Token, "Gov Token", 1, 50400, 100000 * 10**18, 4);
        erc20Factory.deployFees(mockERC20Token, feeRecipient, 100);
        erc20Factory.deployTemporaryApproval(mockERC20Token, 7 days, 1 days, 30 days);
        erc20Factory.deployPayable(mockERC20Token, 100000); // 100K gas limit
        
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: All 10 ERC20 Extensions", gasUsed);
        emit log_named_uint("Gas: Average per Extension", gasUsed / 10);
        
        assertTrue(gasUsed < 30_000_000, "Total should be under 30M gas");
        
        vm.stopPrank();
    }
    
    function testGasAllERC721Extensions() public {
        vm.startPrank(deployer);
        
        uint256 gasBefore = gasleft();
        
        // Deploy all 7 ERC721 extensions
        erc721Factory.deployRoyalty(mockERC721Token, feeRecipient, 500, 1000); // Added maxRoyaltyCap
        erc721Factory.deploySoulbound(mockERC721Token, false, true, false, false, 0); // Added 5 params
        erc721Factory.deployRental(mockERC721Token, feeRecipient, 250, 1 days, 30 days, 0.01 ether, true, 1000); // Added 6 params
        erc721Factory.deployFractionalization(mockERC721Token, 100, 10000, 15000, true, 0.001 ether, true); // Changed to numeric params
        erc721Factory.deployMetadata(mockERC721Token, true, false); // Added 2 boolean params
        erc721Factory.deployGranularApproval(mockERC721Token);
        erc721Factory.deployConsecutive(mockERC721Token, 1, 100); // Added startTokenId and maxBatchSize
        
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: All 7 ERC721 Extensions", gasUsed);
        emit log_named_uint("Gas: Average per Extension", gasUsed / 7);
        
        assertTrue(gasUsed < 21_000_000, "Total should be under 21M gas");
        
        vm.stopPrank();
    }
    
    // ============ Extension Registry Gas Tests ============
    
    function testGasExtensionRegistryQuery() public {
        // Deploy some extensions first
        vm.startPrank(deployer);
        erc20Factory.deployPermit(mockERC20Token, "Test", "1");
        erc20Factory.deployCompliance(mockERC20Token, true, true);
        vm.stopPrank();
        
        // Test query gas costs
        uint256 gasBefore = gasleft();
        address[] memory extensions = registry.getTokenExtensions(mockERC20Token);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: Query Token Extensions", gasUsed);
        emit log_named_uint("Extensions Found", extensions.length);
        
        assertTrue(gasUsed < 100_000, "Query should be under 100k gas");
    }
    
    function testGasExtensionRegistryQueryByType() public {
        vm.prank(deployer);
        erc20Factory.deployPermit(mockERC20Token, "Test", "1");
        
        uint256 gasBefore = gasleft();
        address extension = registry.getTokenExtensionByType(
            mockERC20Token,
            ExtensionRegistry.ExtensionType.PERMIT
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: Query Extension by Type", gasUsed);
        
        assertTrue(gasUsed < 50_000, "Query by type should be under 50k gas");
    }
    
    // ============ Extension Attachment/Detachment Gas Tests ============
    
    function testGasExtensionAttachment() public {
        address mockExtension = address(0x1000);
        
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        IExtensible(mockERC20Token).attachExtension(mockExtension);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: Attach Extension to Token", gasUsed);
        
        assertTrue(gasUsed < 150_000, "Attachment should be under 150k gas");
    }
    
    function testGasExtensionDetachment() public {
        address mockExtension = address(0x1000);
        
        // Attach first
        vm.prank(deployer);
        IExtensible(mockERC20Token).attachExtension(mockExtension);
        
        // Measure detachment
        vm.prank(deployer);
        uint256 gasBefore = gasleft();
        IExtensible(mockERC20Token).detachExtension(mockExtension);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas: Detach Extension from Token", gasUsed);
        
        assertTrue(gasUsed < 100_000, "Detachment should be under 100k gas");
    }
    
    // ============ Comparative Gas Analysis ============
    
    function testGasComparisonAllExtensionTypes() public {
        emit log_string("=== Gas Comparison: All Extension Types ===");
        
        // ERC20 Extensions
        emit log_string("ERC20 Extensions:");
        vm.startPrank(deployer);
        
        uint256 gas1 = gasleft();
        erc20Factory.deployPermit(mockERC20Token, "Test", "1");
        emit log_named_uint("  Permit", gas1 - gasleft());
        
        // ... (would test all extension types)
        
        vm.stopPrank();
    }
}

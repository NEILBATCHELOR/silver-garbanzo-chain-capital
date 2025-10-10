// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/masters/ERC1400Master.sol";

contract ERC1400MasterTest is Test {
    ERC1400Master public implementation;
    ERC1400Master public token;
    
    address public owner = address(1);
    address public complianceOfficer = address(2);
    address public controller = address(3);
    address public user1 = address(4);
    address public user2 = address(5);
    
    // Test parameters
    string constant NAME = "Security Token";
    string constant SYMBOL = "SEC";
    uint8 constant DECIMALS = 18;
    bytes32 constant PARTITION_COMMON = keccak256("COMMON");
    bytes32 constant PARTITION_PREFERRED = keccak256("PREFERRED");
    bytes32 constant PARTITION_RESTRICTED = keccak256("RESTRICTED");
    
    // Events
    event TransferByPartition(
        bytes32 indexed partition,
        address operator,
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    event ControllerTransfer(
        address controller,
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    event PartitionCreated(bytes32 indexed partition, string name);
    event IssuedByPartition(bytes32 indexed partition, address indexed to, uint256 value);
    event RedeemedByPartition(bytes32 indexed partition, address indexed from, uint256 value);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC1400Master();
        
        // Create default partitions
        bytes32[] memory defaultPartitions = new bytes32[](2);
        defaultPartitions[0] = PARTITION_COMMON;
        defaultPartitions[1] = PARTITION_PREFERRED;
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC1400Master.initialize.selector,
            NAME,
            SYMBOL,
            DECIMALS,
            defaultPartitions,
            owner,
            true // isControllable
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        token = ERC1400Master(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(token.name(), NAME);
        assertEq(token.symbol(), SYMBOL);
        assertEq(token.decimals(), DECIMALS);
        assertTrue(token.isControllable());
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
    }
    
    function testCannotReinitialize() public {
        bytes32[] memory partitions = new bytes32[](1);
        partitions[0] = PARTITION_COMMON;
        
        vm.expectRevert();
        token.initialize(NAME, SYMBOL, DECIMALS, partitions, owner, true);
    }
    
    function testInitializationWithPartitions() public view {
        bytes32[] memory partitions = token.getPartitions();
        assertEq(partitions.length, 2);
        assertEq(partitions[0], PARTITION_COMMON);
        assertEq(partitions[1], PARTITION_PREFERRED);
        assertTrue(token.partitionExists(PARTITION_COMMON));
        assertTrue(token.partitionExists(PARTITION_PREFERRED));
    }
    
    // ============ Partition Management Tests ============
    
    function testCreatePartition() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit PartitionCreated(PARTITION_RESTRICTED, "Restricted Shares");
        token.createPartition(PARTITION_RESTRICTED, "Restricted Shares");
        
        assertTrue(token.partitionExists(PARTITION_RESTRICTED));
        bytes32[] memory partitions = token.getPartitions();
        assertEq(partitions.length, 3);
    }
    
    function testOnlyComplianceOfficerCanCreatePartition() public {
        vm.prank(user1);
        vm.expectRevert();
        token.createPartition(PARTITION_RESTRICTED, "Restricted");
    }
    
    function testGetPartitions() public view {
        bytes32[] memory partitions = token.getPartitions();
        assertEq(partitions.length, 2);
        assertEq(partitions[0], PARTITION_COMMON);
        assertEq(partitions[1], PARTITION_PREFERRED);
    }
    
    // ============ Issuance Tests ============
    
    function testIssueByPartition() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit IssuedByPartition(PARTITION_COMMON, user1, amount);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), amount);
    }
    
    function testIssueMultiplePartitions() public {
        uint256 commonAmount = 1000 * 10**18;
        uint256 preferredAmount = 500 * 10**18;
        
        vm.startPrank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, commonAmount, "");
        token.issueByPartition(PARTITION_PREFERRED, user1, preferredAmount, "");
        vm.stopPrank();
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), commonAmount);
        assertEq(token.balanceOfByPartition(PARTITION_PREFERRED, user1), preferredAmount);
    }
    
    function testOnlyAdminCanIssue() public {
        vm.prank(user1);
        vm.expectRevert();
        token.issueByPartition(PARTITION_COMMON, user2, 1000 * 10**18, "");
    }
    
    function testCannotIssueToInvalidPartition() public {
        bytes32 invalidPartition = keccak256("INVALID");
        
        vm.prank(owner);
        vm.expectRevert(ERC1400Master.InvalidPartition.selector);
        token.issueByPartition(invalidPartition, user1, 1000 * 10**18, "");
    }
    
    // ============ Redemption Tests ============
    
    function testRedeemByPartition() public {
        uint256 amount = 1000 * 10**18;
        uint256 redeemAmount = 300 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit RedeemedByPartition(PARTITION_COMMON, user1, redeemAmount);
        token.redeemByPartition(PARTITION_COMMON, redeemAmount, "");
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), amount - redeemAmount);
    }
    
    function testCannotRedeemMoreThanBalance() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        vm.prank(user1);
        vm.expectRevert(ERC1400Master.InsufficientBalance.selector);
        token.redeemByPartition(PARTITION_COMMON, amount + 1, "");
    }
    
    // ============ Transfer Tests ============
    
    function testTransferByPartition() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        uint256 transferAmount = 300 * 10**18;
        vm.prank(user1);
        vm.expectEmit(true, false, true, true);
        emit TransferByPartition(PARTITION_COMMON, user1, user1, user2, transferAmount, "", "");
        token.transferByPartition(PARTITION_COMMON, user2, transferAmount, "");
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), amount - transferAmount);
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user2), transferAmount);
    }
    
    function testOperatorTransferByPartition() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        // User1 authorizes user2 as operator
        vm.prank(user1);
        token.authorizeOperatorByPartition(PARTITION_COMMON, user2);
        
        uint256 transferAmount = 300 * 10**18;
        vm.prank(user2);
        token.operatorTransferByPartition(
            PARTITION_COMMON,
            user1,
            address(6),
            transferAmount,
            "",
            ""
        );
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, address(6)), transferAmount);
    }
    
    function testCannotTransferWithoutAuthorization() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        vm.prank(user2);
        vm.expectRevert(ERC1400Master.NotAuthorized.selector);
        token.operatorTransferByPartition(PARTITION_COMMON, user1, address(6), 100 * 10**18, "", "");
    }
    
    function testCannotTransferWhenPaused() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        vm.prank(owner);
        token.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        token.transferByPartition(PARTITION_COMMON, user2, 100 * 10**18, "");
    }
    
    // ============ Operator Management Tests ============
    
    function testAuthorizeOperatorByPartition() public {
        vm.prank(user1);
        token.authorizeOperatorByPartition(PARTITION_COMMON, user2);
        
        assertTrue(token.isOperatorForPartition(PARTITION_COMMON, user2, user1));
    }
    
    function testRevokeOperatorByPartition() public {
        vm.startPrank(user1);
        token.authorizeOperatorByPartition(PARTITION_COMMON, user2);
        token.revokeOperatorByPartition(PARTITION_COMMON, user2);
        vm.stopPrank();
        
        assertFalse(token.isOperatorForPartition(PARTITION_COMMON, user2, user1));
    }
    
    function testIsOperatorForPartition() public {
        vm.prank(user1);
        token.authorizeOperatorByPartition(PARTITION_COMMON, user2);
        
        assertTrue(token.isOperatorForPartition(PARTITION_COMMON, user2, user1));
        assertFalse(token.isOperatorForPartition(PARTITION_PREFERRED, user2, user1));
    }
    
    // ============ Controller Operations Tests ============
    
    function testControllerTransfer() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        uint256 transferAmount = 300 * 10**18;
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit ControllerTransfer(owner, user1, user2, transferAmount, "", "");
        token.controllerTransfer(user1, user2, transferAmount, "", "");
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), amount - transferAmount);
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user2), transferAmount);
    }
    
    function testOnlyControllerCanForceTransfer() public {
        vm.prank(user1);
        vm.expectRevert();
        token.controllerTransfer(user1, user2, 100 * 10**18, "", "");
    }
    
    function testControllerRedeem() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        uint256 redeemAmount = 300 * 10**18;
        vm.prank(owner);
        token.controllerRedeem(user1, redeemAmount, "", "");
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), amount - redeemAmount);
    }
    
    // ============ Partition Balance Tests ============
    
    function testBalanceOfByPartition() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, amount, "");
        
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), amount);
        assertEq(token.balanceOfByPartition(PARTITION_PREFERRED, user1), 0);
    }
    
    function testPartitionsOf() public {
        vm.startPrank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, 1000 * 10**18, "");
        token.issueByPartition(PARTITION_PREFERRED, user1, 500 * 10**18, "");
        vm.stopPrank();
        
        bytes32[] memory userPartitions = token.partitionsOf(user1);
        assertEq(userPartitions.length, 2);
    }
    
    function testPartitionsOfEmptyHolder() public {
        bytes32[] memory userPartitions = token.partitionsOf(user2);
        assertEq(userPartitions.length, 0);
    }
    
    // ============ Module Management Tests ============
    
    function testSetTransferRestrictionsModule() public {
        address mockModule = address(0x1234);
        
        vm.prank(owner);
        token.setTransferRestrictionsModule(mockModule);
        
        assertEq(token.transferRestrictionsModule(), mockModule);
    }
    
    function testSetDocumentModule() public {
        address mockModule = address(0x1235);
        
        vm.prank(owner);
        token.setDocumentModule(mockModule);
        
        assertEq(token.documentModule(), mockModule);
    }
    
    function testSetComplianceModule() public {
        address mockModule = address(0x1236);
        
        vm.prank(owner);
        token.setComplianceModule(mockModule);
        
        assertEq(token.complianceModule(), mockModule);
    }
    
    function testCannotSetZeroAddressModule() public {
        vm.prank(owner);
        vm.expectRevert(ERC1400Master.InvalidModule.selector);
        token.setTransferRestrictionsModule(address(0));
    }
    
    function testOnlyAdminCanSetModules() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setTransferRestrictionsModule(address(0x1234));
    }
    
    // ============ Policy Engine Tests ============
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1237);
        
        vm.prank(owner);
        token.setPolicyEngine(mockEngine);
        
        assertEq(token.policyEngine(), mockEngine);
    }
    
    function testOnlyAdminCanSetPolicyEngine() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setPolicyEngine(address(0x1237));
    }
    
    // ============ Pausability Tests ============
    
    function testPause() public {
        vm.prank(owner);
        token.pause();
        
        assertTrue(token.paused());
    }
    
    function testUnpause() public {
        vm.startPrank(owner);
        token.pause();
        token.unpause();
        vm.stopPrank();
        
        assertFalse(token.paused());
    }
    
    function testOnlyPauserCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        token.pause();
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgrade() public {
        // Issue some tokens before upgrade
        vm.prank(owner);
        token.issueByPartition(PARTITION_COMMON, user1, 1000 * 10**18, "");
        
        uint256 balanceBefore = token.balanceOfByPartition(PARTITION_COMMON, user1);
        
        // Deploy new implementation
        ERC1400Master newImplementation = new ERC1400Master();
        
        // Upgrade
        vm.prank(owner);
        token.upgradeToAndCall(address(newImplementation), "");
        
        // Verify state preserved
        assertEq(token.name(), NAME);
        assertEq(token.balanceOfByPartition(PARTITION_COMMON, user1), balanceBefore);
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        ERC1400Master newImplementation = new ERC1400Master();
        
        vm.prank(user1);
        vm.expectRevert();
        token.upgradeToAndCall(address(newImplementation), "");
    }
}

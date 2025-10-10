// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../../src/extensions/votes/ERC20VotesModule.sol";
import "../../../src/extensions/votes/interfaces/IERC20VotesModule.sol";

/**
 * @title ERC20VotesModuleTest
 * @notice Comprehensive tests for governance voting functionality
 * @dev Tests cover delegation, vote tracking, signatures, and checkpoints
 */
contract ERC20VotesModuleTest is Test {
    
    ERC20VotesModule public votesModule;
    
    address public admin = makeAddr("admin");
    address public governance = makeAddr("governance");
    address public delegator = makeAddr("delegator");
    address public delegatee1 = makeAddr("delegatee1");
    address public delegatee2 = makeAddr("delegatee2");
    address public user1 = makeAddr("user1");
    address public unauthorized = makeAddr("unauthorized");
    
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    uint256 delegatorPrivateKey = 0xA11CE;
    address delegatorAddress;
    
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);
    
    function setUp() public {
        delegatorAddress = vm.addr(delegatorPrivateKey);
        
        vm.startPrank(admin);
        votesModule = new ERC20VotesModule();
        votesModule.initialize(admin, "Test Token");
        votesModule.grantRole(GOVERNANCE_ROLE, governance);
        vm.stopPrank();
    }
    
    // ============ Initialization Tests ============
    
    function test_Initialize() public view {
        assertTrue(votesModule.hasRole(votesModule.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(votesModule.hasRole(GOVERNANCE_ROLE, admin));
        assertTrue(votesModule.hasRole(votesModule.UPGRADER_ROLE(), admin));
    }
    
    function test_RevertWhen_InitializeTwice() public {
        vm.expectRevert();
        votesModule.initialize(admin, "Test Token");
    }
    
    // ============ Delegation Tests ============
    
    function test_Delegate() public {
        vm.prank(delegatorAddress);
        vm.expectEmit(true, true, true, false);
        emit DelegateChanged(delegatorAddress, address(0), delegatee1);
        votesModule.delegate(delegatee1);
        
        assertEq(votesModule.delegates(delegatorAddress), delegatee1);
    }
    
    function test_RedelegateToNewAddress() public {
        vm.startPrank(delegatorAddress);
        votesModule.delegate(delegatee1);
        
        vm.expectEmit(true, true, true, false);
        emit DelegateChanged(delegatorAddress, delegatee1, delegatee2);
        votesModule.delegate(delegatee2);
        vm.stopPrank();
        
        assertEq(votesModule.delegates(delegatorAddress), delegatee2);
    }
    
    function test_DelegateToSelf() public {
        vm.prank(delegatorAddress);
        votesModule.delegate(delegatorAddress);
        
        assertEq(votesModule.delegates(delegatorAddress), delegatorAddress);
    }
    
    function test_DelegateToZeroAddress() public {
        vm.prank(delegatorAddress);
        votesModule.delegate(address(0));
        
        assertEq(votesModule.delegates(delegatorAddress), address(0));
    }
    
    // ============ Delegation By Signature Tests ============
    
    function test_DelegateBySig() public {
        uint256 nonce = 0;
        uint256 expiry = block.timestamp + 1000;
        
        bytes32 structHash = keccak256(abi.encode(
            votesModule.DELEGATION_TYPEHASH(),
            delegatee1,
            nonce,
            expiry
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            votesModule.DOMAIN_SEPARATOR(),
            structHash
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(delegatorPrivateKey, digest);
        
        vm.expectEmit(true, true, true, false);
        emit DelegateChanged(delegatorAddress, address(0), delegatee1);
        votesModule.delegateBySig(delegatee1, nonce, expiry, v, r, s);
        
        assertEq(votesModule.delegates(delegatorAddress), delegatee1);
    }
    
    function test_RevertWhen_SignatureExpired() public {
        uint256 nonce = 0;
        uint256 expiry = block.timestamp - 1;
        
        bytes32 structHash = keccak256(abi.encode(
            votesModule.DELEGATION_TYPEHASH(),
            delegatee1,
            nonce,
            expiry
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            votesModule.DOMAIN_SEPARATOR(),
            structHash
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(delegatorPrivateKey, digest);
        
        vm.expectRevert(abi.encodeWithSelector(IERC20VotesModule.SignatureExpired.selector));
        votesModule.delegateBySig(delegatee1, nonce, expiry, v, r, s);
    }
    
    function test_RevertWhen_InvalidNonce() public {
        uint256 nonce = 5; // Wrong nonce
        uint256 expiry = block.timestamp + 1000;
        
        bytes32 structHash = keccak256(abi.encode(
            votesModule.DELEGATION_TYPEHASH(),
            delegatee1,
            nonce,
            expiry
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            votesModule.DOMAIN_SEPARATOR(),
            structHash
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(delegatorPrivateKey, digest);
        
        vm.expectRevert(abi.encodeWithSelector(IERC20VotesModule.InvalidSignature.selector));
        votesModule.delegateBySig(delegatee1, nonce, expiry, v, r, s);
    }
    
    // ============ Voting Power Tests ============
    
    function test_GetVotes() public {
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), delegatee1, 1000);
        
        assertEq(votesModule.getVotes(delegatee1), 1000);
    }
    
    function test_GetVotesWithDelegation() public {
        // Delegator delegates to delegatee1
        vm.prank(delegatorAddress);
        votesModule.delegate(delegatee1);
        
        // Update voting power (as if tokens were transferred)
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), delegatorAddress, 1000);
        
        // Delegatee1 should have the votes
        assertEq(votesModule.getVotes(delegatee1), 1000);
    }
    
    function test_GetPastVotes() public {
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), delegatee1, 1000);
        
        uint256 blockNumber = block.number;
        vm.roll(block.number + 10);
        
        assertEq(votesModule.getPastVotes(delegatee1, blockNumber), 1000);
    }
    
    function test_RevertWhen_GetPastVotesFutureBlock() public {
        vm.expectRevert(abi.encodeWithSelector(IERC20VotesModule.InvalidBlockNumber.selector));
        votesModule.getPastVotes(user1, block.number);
    }
    
    function test_GetPastTotalSupply() public {
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), user1, 1000);
        
        uint256 blockNumber = block.number;
        vm.roll(block.number + 10);
        
        assertEq(votesModule.getPastTotalSupply(blockNumber), 1000);
    }
    
    function test_RevertWhen_GetPastTotalSupplyFutureBlock() public {
        vm.expectRevert(abi.encodeWithSelector(IERC20VotesModule.InvalidBlockNumber.selector));
        votesModule.getPastTotalSupply(block.number);
    }
    
    // ============ Checkpoint Tests ============
    
    function test_NumCheckpoints() public {
        vm.startPrank(governance);
        votesModule.updateVotingPower(address(0), delegatee1, 1000);
        vm.roll(block.number + 1);
        votesModule.updateVotingPower(address(0), delegatee1, 500);
        vm.stopPrank();
        
        assertEq(votesModule.numCheckpoints(delegatee1), 2);
    }
    
    function test_Checkpoints() public {
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), delegatee1, 1000);
        
        (uint32 fromBlock, uint224 votes) = votesModule.checkpoints(delegatee1, 0);
        assertEq(fromBlock, block.number);
        assertEq(votes, 1000);
    }
    
    // ============ Voting Power Update Tests ============
    
    function test_UpdateVotingPowerMint() public {
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), user1, 1000);
        
        assertEq(votesModule.getVotes(user1), 0); // No delegation, so votes stay at 0
    }
    
    function test_UpdateVotingPowerBurn() public {
        vm.startPrank(governance);
        votesModule.updateVotingPower(address(0), user1, 1000);
        votesModule.updateVotingPower(user1, address(0), 1000);
        vm.stopPrank();
        
        assertEq(votesModule.getVotes(user1), 0);
    }
    
    function test_UpdateVotingPowerTransfer() public {
        vm.prank(governance);
        votesModule.updateVotingPower(user1, user1 + 1, 500);
        
        // This test verifies the transfer logic executes without error
    }
    
    function test_RevertWhen_UnauthorizedUpdateVotingPower() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        votesModule.updateVotingPower(address(0), user1, 1000);
    }
    
    // ============ Complex Scenario Tests ============
    
    function test_CompleteVotingLifecycle() public {
        // 1. User1 delegates to delegatee1
        vm.prank(user1);
        votesModule.delegate(delegatee1);
        
        // 2. Mint tokens to user1
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), user1, 1000);
        
        // 3. Verify delegatee1 has voting power
        assertEq(votesModule.getVotes(delegatee1), 1000);
        
        // 4. User1 redelegates to delegatee2
        vm.prank(user1);
        votesModule.delegate(delegatee2);
        
        // 5. Verify vote power moved
        assertEq(votesModule.getVotes(delegatee1), 0);
        assertEq(votesModule.getVotes(delegatee2), 1000);
        
        // 6. Historical votes preserved
        uint256 historicalBlock = block.number;
        vm.roll(block.number + 10);
        
        assertEq(votesModule.getPastVotes(delegatee2, historicalBlock), 1000);
    }
    
    function test_MultipleCheckpointsAndQueries() public {
        vm.startPrank(governance);
        
        // Create multiple checkpoints
        votesModule.updateVotingPower(address(0), delegatee1, 100);
        uint256 block1 = block.number;
        
        vm.roll(block.number + 1);
        votesModule.updateVotingPower(address(0), delegatee1, 200);
        uint256 block2 = block.number;
        
        vm.roll(block.number + 1);
        votesModule.updateVotingPower(address(0), delegatee1, 300);
        uint256 block3 = block.number;
        
        vm.stopPrank();
        
        // Query historical votes
        vm.roll(block.number + 10);
        assertEq(votesModule.getPastVotes(delegatee1, block1), 100);
        assertEq(votesModule.getPastVotes(delegatee1, block2), 300);
        assertEq(votesModule.getPastVotes(delegatee1, block3), 600);
    }
    
    // ============ Fuzz Tests ============
    
    function testFuzz_DelegateToRandomAddress(address randomDelegatee) public {
        vm.prank(delegatorAddress);
        votesModule.delegate(randomDelegatee);
        
        assertEq(votesModule.delegates(delegatorAddress), randomDelegatee);
    }
    
    function testFuzz_UpdateVotingPower(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint224).max);
        
        vm.prank(governance);
        votesModule.updateVotingPower(address(0), delegatee1, amount);
        
        assertEq(votesModule.getVotes(delegatee1), amount);
    }
}

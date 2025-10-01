// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EnhancedERC20Token.sol";
import "../src/PolicyEngine.sol";

/**
 * @title EnhancedERC20Token Lock/Unlock/Block/Unblock Test Suite
 * @notice Comprehensive tests for lock, unlock, block, and unblock operations with PolicyEngine integration
 */
contract EnhancedERC20TokenLockUnlockBlockTest is Test {
    EnhancedERC20Token public token;
    PolicyEngine public policyEngine;

    address public admin = address(1);
    address public minter = address(2);
    address public locker = address(3);
    address public blocker = address(4);
    address public user1 = address(5);
    address public user2 = address(6);
    address public user3 = address(7);

    // Events to test
    event TokensLocked(
        bytes32 indexed lockId,
        address indexed account,
        uint256 amount,
        uint256 unlockTime,
        string reason
    );
    event TokensUnlocked(
        bytes32 indexed lockId,
        address indexed account,
        uint256 amount
    );
    event AddressBlocked(
        address indexed account,
        string reason,
        address indexed blockedBy,
        uint256 timestamp
    );
    event AddressUnblocked(
        address indexed account,
        address indexed unblockedBy,
        uint256 timestamp
    );

    function setUp() public {
        vm.startPrank(admin);

        // Deploy PolicyEngine
        policyEngine = new PolicyEngine();

        // Create token config
        EnhancedERC20Token.TokenConfig memory config = EnhancedERC20Token.TokenConfig({
            name: "Test Token",
            symbol: "TEST",
            decimals: 18,
            initialSupply: 1000000 * 10**18,
            maxSupply: 10000000 * 10**18,
            initialOwner: admin,
            policyEngineAddress: address(policyEngine),
            mintingEnabled: true,
            burningEnabled: true,
            pausable: true,
            votingEnabled: false,
            permitEnabled: false,
            antiWhaleEnabled: false,
            maxWalletAmount: 0,
            cooldownPeriod: 0,
            buyFeeEnabled: false,
            sellFeeEnabled: false,
            liquidityFeePercentage: 0,
            marketingFeePercentage: 0,
            charityFeePercentage: 0,
            autoLiquidityEnabled: false,
            reflectionEnabled: false,
            reflectionPercentage: 0,
            deflationEnabled: false,
            deflationRate: 0,
            burnOnTransfer: false,
            burnPercentage: 0,
            blacklistEnabled: false,
            tradingStartTime: 0,
            whitelistEnabled: false,
            geographicRestrictionsEnabled: false,
            governanceEnabled: false,
            quorumPercentage: 0,
            proposalThreshold: 0,
            votingDelay: 0,
            votingPeriod: 0,
            timelockDelay: 0
        });

        // Deploy token
        token = new EnhancedERC20Token(config);

        // Grant roles
        token.grantRole(token.MINTER_ROLE(), minter);
        token.grantRole(token.LOCKER_ROLE(), locker);
        token.grantRole(token.BLOCKER_ROLE(), blocker);

        // Setup policies in PolicyEngine
        policyEngine.registerTokenPolicy(
            address(token),
            "lock",
            5000 * 10**18,      // maxAmount: 5000 tokens
            10000 * 10**18,     // dailyLimit: 10000 tokens
            50000 * 10**18,     // monthlyLimit: 50000 tokens
            60                  // cooldownPeriod: 60 seconds
        );

        policyEngine.registerTokenPolicy(
            address(token),
            "unlock",
            0,                  // maxAmount: no limit
            0,                  // dailyLimit: no limit
            0,                  // monthlyLimit: no limit
            0                   // cooldownPeriod: no cooldown
        );

        policyEngine.registerTokenPolicy(
            address(token),
            "block",
            0,                  // maxAmount: N/A
            0,                  // dailyLimit: no limit
            0,                  // monthlyLimit: no limit
            300                 // cooldownPeriod: 5 minutes
        );

        policyEngine.registerTokenPolicy(
            address(token),
            "unblock",
            0,                  // maxAmount: N/A
            0,                  // dailyLimit: no limit
            0,                  // monthlyLimit: no limit
            60                  // cooldownPeriod: 1 minute
        );

        vm.stopPrank();

        // Mint tokens to users for testing
        vm.startPrank(minter);
        token.mint(user1, 10000 * 10**18);
        token.mint(user2, 5000 * 10**18);
        token.mint(user3, 3000 * 10**18);
        vm.stopPrank();
    }

    // ================================
    // LOCK OPERATION TESTS
    // ================================

    function testLockTokensBasic() public {
        vm.startPrank(locker);
        
        uint256 lockAmount = 1000 * 10**18;
        uint256 lockDuration = 7 days;
        string memory reason = "Vesting schedule";
        
        // Lock tokens
        bytes32 lockId = token.lockTokens(user1, lockAmount, lockDuration, reason);
        
        // Verify lock was created
        assertNotEq(lockId, bytes32(0), "Lock ID should not be zero");
        
        // Verify locked balance
        assertEq(token.totalLockedBalance(user1), lockAmount, "Locked balance should match");
        
        // Verify available balance
        uint256 expectedAvailable = 10000 * 10**18 - lockAmount;
        assertEq(token.getAvailableBalance(user1), expectedAvailable, "Available balance incorrect");
        
        // Verify lock details
        EnhancedERC20Token.TokenLock memory lockDetails = token.getLockDetails(lockId);
        assertEq(lockDetails.account, user1, "Lock account incorrect");
        assertEq(lockDetails.amount, lockAmount, "Lock amount incorrect");
        assertEq(lockDetails.reason, reason, "Lock reason incorrect");
        assertEq(lockDetails.unlocked, false, "Lock should not be unlocked");
        
        vm.stopPrank();
    }

    function testLockTokensMultipleLocks() public {
        vm.startPrank(locker);
        
        // Create multiple locks
        bytes32 lock1 = token.lockTokens(user1, 1000 * 10**18, 1 days, "Lock 1");
        bytes32 lock2 = token.lockTokens(user1, 2000 * 10**18, 2 days, "Lock 2");
        bytes32 lock3 = token.lockTokens(user1, 1500 * 10**18, 3 days, "Lock 3");
        
        // Verify total locked balance
        uint256 totalLocked = 1000 * 10**18 + 2000 * 10**18 + 1500 * 10**18;
        assertEq(token.totalLockedBalance(user1), totalLocked, "Total locked incorrect");
        
        // Verify all locks exist
        bytes32[] memory locks = token.getAccountLocks(user1);
        assertEq(locks.length, 3, "Should have 3 locks");
        
        // Verify active locks
        bytes32[] memory activeLocks = token.getActiveLocks(user1);
        assertEq(activeLocks.length, 3, "Should have 3 active locks");
        
        vm.stopPrank();
    }

    function testLockTokensInsufficientBalance() public {
        vm.startPrank(locker);
        
        // Try to lock more than available
        vm.expectRevert("Insufficient unlocked balance");
        token.lockTokens(user1, 11000 * 10**18, 1 days, "Too much");
        
        vm.stopPrank();
    }

    function testLockTokensInsufficientUnlockedBalance() public {
        vm.startPrank(locker);
        
        // Lock some tokens
        token.lockTokens(user1, 8000 * 10**18, 7 days, "First lock");
        
        // Try to lock more than remaining unlocked balance
        vm.expectRevert("Insufficient unlocked balance");
        token.lockTokens(user1, 3000 * 10**18, 7 days, "Too much");
        
        vm.stopPrank();
    }

    function testLockTokensInvalidAmount() public {
        vm.startPrank(locker);
        
        vm.expectRevert("Amount must be positive");
        token.lockTokens(user1, 0, 1 days, "Zero amount");
        
        vm.stopPrank();
    }

    function testLockTokensInvalidDuration() public {
        vm.startPrank(locker);
        
        vm.expectRevert("Duration must be positive");
        token.lockTokens(user1, 1000 * 10**18, 0, "Zero duration");
        
        vm.stopPrank();
    }

    function testLockTokensRequiresReason() public {
        vm.startPrank(locker);
        
        vm.expectRevert("Reason required");
        token.lockTokens(user1, 1000 * 10**18, 1 days, "");
        
        vm.stopPrank();
    }

    function testLockTokensPolicyViolation() public {
        vm.startPrank(locker);
        
        // Try to lock more than policy allows (policy max: 5000 tokens)
        vm.expectRevert();
        token.lockTokens(user1, 6000 * 10**18, 1 days, "Exceeds policy");
        
        vm.stopPrank();
    }

    function testLockTokensUnauthorized() public {
        vm.startPrank(user2);
        
        vm.expectRevert();
        token.lockTokens(user1, 1000 * 10**18, 1 days, "Unauthorized");
        
        vm.stopPrank();
    }

    function testLockTokensEmitsEvent() public {
        vm.startPrank(locker);
        
        uint256 lockAmount = 1000 * 10**18;
        uint256 lockDuration = 7 days;
        string memory reason = "Test lock";
        
        // Expect event
        vm.expectEmit(false, true, false, true);
        emit TokensLocked(
            bytes32(0), // lockId will be different
            user1,
            lockAmount,
            block.timestamp + lockDuration,
            reason
        );
        
        token.lockTokens(user1, lockAmount, lockDuration, reason);
        
        vm.stopPrank();
    }

    // ================================
    // UNLOCK OPERATION TESTS
    // ================================

    function testUnlockTokensAfterExpiry() public {
        vm.startPrank(locker);
        
        // Lock tokens for 1 day
        bytes32 lockId = token.lockTokens(user1, 1000 * 10**18, 1 days, "Test lock");
        
        vm.stopPrank();
        
        // Fast forward past lock period
        vm.warp(block.timestamp + 1 days + 1);
        
        vm.startPrank(user1);
        
        // Unlock tokens
        token.unlockTokens(lockId);
        
        // Verify unlocked
        EnhancedERC20Token.TokenLock memory lockDetails = token.getLockDetails(lockId);
        assertTrue(lockDetails.unlocked, "Lock should be unlocked");
        
        // Verify locked balance decreased
        assertEq(token.totalLockedBalance(user1), 0, "Locked balance should be zero");
        
        vm.stopPrank();
    }

    function testUnlockTokensEarlyByAdmin() public {
        vm.startPrank(locker);
        
        // Lock tokens for 1 day
        bytes32 lockId = token.lockTokens(user1, 1000 * 10**18, 1 days, "Test lock");
        
        // Admin can unlock early
        token.unlockTokens(lockId);
        
        // Verify unlocked
        EnhancedERC20Token.TokenLock memory lockDetails = token.getLockDetails(lockId);
        assertTrue(lockDetails.unlocked, "Lock should be unlocked");
        
        vm.stopPrank();
    }

    function testUnlockTokensBeforeExpiryFails() public {
        vm.startPrank(locker);
        
        // Lock tokens for 1 day
        bytes32 lockId = token.lockTokens(user1, 1000 * 10**18, 1 days, "Test lock");
        
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        // Try to unlock before expiry
        vm.expectRevert("Lock period not expired");
        token.unlockTokens(lockId);
        
        vm.stopPrank();
    }

    function testUnlockTokensAlreadyUnlocked() public {
        vm.startPrank(locker);
        
        // Lock and immediately unlock
        bytes32 lockId = token.lockTokens(user1, 1000 * 10**18, 1 days, "Test lock");
        token.unlockTokens(lockId);
        
        // Try to unlock again
        vm.expectRevert("Already unlocked");
        token.unlockTokens(lockId);
        
        vm.stopPrank();
    }

    function testUnlockTokensInvalidLockId() public {
        vm.startPrank(user1);
        
        vm.expectRevert("Lock does not exist");
        token.unlockTokens(bytes32(uint256(12345)));
        
        vm.stopPrank();
    }

    function testUnlockTokensUnauthorized() public {
        vm.startPrank(locker);
        
        bytes32 lockId = token.lockTokens(user1, 1000 * 10**18, 1 days, "Test lock");
        
        vm.stopPrank();
        
        // user2 tries to unlock user1's tokens
        vm.startPrank(user2);
        
        vm.warp(block.timestamp + 1 days + 1);
        vm.expectRevert("Not authorized to unlock");
        token.unlockTokens(lockId);
        
        vm.stopPrank();
    }

    function testUnlockTokensEmitsEvent() public {
        vm.startPrank(locker);
        
        bytes32 lockId = token.lockTokens(user1, 1000 * 10**18, 1 days, "Test lock");
        
        // Expect event
        vm.expectEmit(true, true, false, true);
        emit TokensUnlocked(lockId, user1, 1000 * 10**18);
        
        token.unlockTokens(lockId);
        
        vm.stopPrank();
    }

    function testTransferWithLockedTokens() public {
        vm.startPrank(locker);
        
        // Lock 8000 tokens
        token.lockTokens(user1, 8000 * 10**18, 7 days, "Vesting");
        
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        // Can transfer unlocked tokens (2000)
        token.transfer(user2, 2000 * 10**18);
        
        // Cannot transfer more than unlocked balance
        vm.expectRevert("Insufficient unlocked balance");
        token.transfer(user2, 1 * 10**18);
        
        vm.stopPrank();
    }

    // ================================
    // BLOCK OPERATION TESTS
    // ================================

    function testBlockAddress() public {
        vm.startPrank(blocker);
        
        string memory reason = "Suspicious activity detected";
        
        // Block address
        token.blockAddress(user1, reason);
        
        // Verify blocked
        assertTrue(token.isBlocked(user1), "Address should be blocked");
        
        // Verify block details
        EnhancedERC20Token.AddressBlock memory blockDetails = token.getBlockDetails(user1);
        assertEq(blockDetails.account, user1, "Blocked account incorrect");
        assertEq(blockDetails.reason, reason, "Block reason incorrect");
        assertEq(blockDetails.blockedBy, blocker, "BlockedBy incorrect");
        assertTrue(blockDetails.active, "Block should be active");
        
        vm.stopPrank();
    }

    function testBlockAddressRequiresReason() public {
        vm.startPrank(blocker);
        
        vm.expectRevert("Reason required");
        token.blockAddress(user1, "");
        
        vm.stopPrank();
    }

    function testBlockAddressAlreadyBlocked() public {
        vm.startPrank(blocker);
        
        token.blockAddress(user1, "First block");
        
        vm.expectRevert("Already blocked");
        token.blockAddress(user1, "Second block");
        
        vm.stopPrank();
    }

    function testBlockAddressUnauthorized() public {
        vm.startPrank(user2);
        
        vm.expectRevert();
        token.blockAddress(user1, "Unauthorized block");
        
        vm.stopPrank();
    }

    function testBlockedAddressCannotTransfer() public {
        vm.startPrank(blocker);
        token.blockAddress(user1, "Test block");
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        vm.expectRevert("Sender is blocked");
        token.transfer(user2, 100 * 10**18);
        
        vm.stopPrank();
    }

    function testBlockedAddressCannotReceive() public {
        vm.startPrank(blocker);
        token.blockAddress(user2, "Test block");
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        vm.expectRevert("Recipient is blocked");
        token.transfer(user2, 100 * 10**18);
        
        vm.stopPrank();
    }

    function testBlockAddressEmitsEvent() public {
        vm.startPrank(blocker);
        
        string memory reason = "Test block";
        
        // Expect event
        vm.expectEmit(true, true, false, true);
        emit AddressBlocked(user1, reason, blocker, block.timestamp);
        
        token.blockAddress(user1, reason);
        
        vm.stopPrank();
    }

    // ================================
    // UNBLOCK OPERATION TESTS
    // ================================

    function testUnblockAddress() public {
        vm.startPrank(blocker);
        
        // Block and then unblock
        token.blockAddress(user1, "Test block");
        token.unblockAddress(user1);
        
        // Verify unblocked
        assertFalse(token.isBlocked(user1), "Address should be unblocked");
        
        // Verify block details show inactive
        EnhancedERC20Token.AddressBlock memory blockDetails = token.getBlockDetails(user1);
        assertFalse(blockDetails.active, "Block should be inactive");
        
        vm.stopPrank();
    }

    function testUnblockAddressNotBlocked() public {
        vm.startPrank(blocker);
        
        vm.expectRevert("Not blocked");
        token.unblockAddress(user1);
        
        vm.stopPrank();
    }

    function testUnblockAddressUnauthorized() public {
        vm.startPrank(blocker);
        token.blockAddress(user1, "Test block");
        vm.stopPrank();
        
        vm.startPrank(user2);
        
        vm.expectRevert();
        token.unblockAddress(user1);
        
        vm.stopPrank();
    }

    function testUnblockedAddressCanTransfer() public {
        vm.startPrank(blocker);
        token.blockAddress(user1, "Test block");
        token.unblockAddress(user1);
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        // Should work now
        token.transfer(user2, 100 * 10**18);
        
        vm.stopPrank();
    }

    function testUnblockAddressEmitsEvent() public {
        vm.startPrank(blocker);
        
        token.blockAddress(user1, "Test block");
        
        // Expect event
        vm.expectEmit(true, true, false, true);
        emit AddressUnblocked(user1, blocker, block.timestamp);
        
        token.unblockAddress(user1);
        
        vm.stopPrank();
    }

    // ================================
    // VIEW FUNCTION TESTS
    // ================================

    function testGetAccountLocks() public {
        vm.startPrank(locker);
        
        // Create multiple locks
        token.lockTokens(user1, 1000 * 10**18, 1 days, "Lock 1");
        token.lockTokens(user1, 2000 * 10**18, 2 days, "Lock 2");
        
        bytes32[] memory locks = token.getAccountLocks(user1);
        
        assertEq(locks.length, 2, "Should have 2 locks");
        
        vm.stopPrank();
    }

    function testGetActiveLocks() public {
        vm.startPrank(locker);
        
        // Create locks
        bytes32 lock1 = token.lockTokens(user1, 1000 * 10**18, 1 days, "Lock 1");
        token.lockTokens(user1, 2000 * 10**18, 2 days, "Lock 2");
        
        // Unlock one
        token.unlockTokens(lock1);
        
        bytes32[] memory activeLocks = token.getActiveLocks(user1);
        
        assertEq(activeLocks.length, 1, "Should have 1 active lock");
        
        vm.stopPrank();
    }

    function testGetBlockedAccounts() public {
        vm.startPrank(blocker);
        
        // Block some accounts
        token.blockAddress(user1, "Reason 1");
        token.blockAddress(user2, "Reason 2");
        
        address[] memory blocked = token.getBlockedAccounts();
        
        assertEq(blocked.length, 2, "Should have 2 blocked accounts");
        
        vm.stopPrank();
    }

    function testGetBlockedAccountsAfterUnblock() public {
        vm.startPrank(blocker);
        
        // Block and unblock one
        token.blockAddress(user1, "Reason 1");
        token.blockAddress(user2, "Reason 2");
        token.unblockAddress(user1);
        
        address[] memory blocked = token.getBlockedAccounts();
        
        assertEq(blocked.length, 1, "Should have 1 blocked account");
        assertEq(blocked[0], user2, "Should be user2");
        
        vm.stopPrank();
    }

    // ================================
    // INTEGRATION TESTS
    // ================================

    function testComplexScenario() public {
        vm.startPrank(locker);
        
        // Lock tokens
        bytes32 lock1 = token.lockTokens(user1, 3000 * 10**18, 7 days, "Vesting");
        
        vm.stopPrank();
        
        // User can still transfer unlocked balance
        vm.startPrank(user1);
        token.transfer(user2, 5000 * 10**18);
        assertEq(token.balanceOf(user2), 10000 * 10**18, "Transfer successful");
        vm.stopPrank();
        
        // Block user1
        vm.startPrank(blocker);
        token.blockAddress(user1, "Suspicious");
        vm.stopPrank();
        
        // User1 cannot transfer now
        vm.startPrank(user1);
        vm.expectRevert("Sender is blocked");
        token.transfer(user2, 1000 * 10**18);
        vm.stopPrank();
        
        // Unblock user1
        vm.startPrank(blocker);
        token.unblockAddress(user1);
        vm.stopPrank();
        
        // Unlock tokens
        vm.startPrank(locker);
        token.unlockTokens(lock1);
        vm.stopPrank();
        
        // User can transfer full balance now
        vm.startPrank(user1);
        token.transfer(user2, 2000 * 10**18);
        assertEq(token.balanceOf(user1), 0, "All tokens transferred");
        vm.stopPrank();
    }
}

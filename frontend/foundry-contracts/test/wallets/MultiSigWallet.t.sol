// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/wallets/MultiSigWallet.sol";
import "../../src/wallets/MultiSigWalletFactory.sol";

/**
 * @title MultiSigWalletTest
 * @notice Comprehensive tests for MultiSigWallet contract
 */
contract MultiSigWalletTest is Test {
    MultiSigWallet public wallet;
    MultiSigWalletFactory public factory;
    
    address public owner1 = address(0x1);
    address public owner2 = address(0x2);
    address public owner3 = address(0x3);
    address public nonOwner = address(0x4);
    address public recipient = address(0x5);
    
    address[] public owners;
    
    uint256 constant THRESHOLD = 2;
    string constant WALLET_NAME = "Test Wallet";
    
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    
    function setUp() public {
        owners.push(owner1);
        owners.push(owner2);
        owners.push(owner3);
        
        factory = new MultiSigWalletFactory();
        
        vm.prank(owner1);
        address walletAddress = factory.createWallet(WALLET_NAME, owners, THRESHOLD);
        wallet = MultiSigWallet(payable(walletAddress));
        
        // Fund the wallet
        vm.deal(address(wallet), 10 ether);
    }
    
    // ============================================================================
    // DEPLOYMENT TESTS
    // ============================================================================
    
    function testDeployment() public view {
        assertEq(wallet.name(), WALLET_NAME);
        assertEq(wallet.getOwners().length, 3);
        assertEq(wallet.requiredSignatures(), THRESHOLD);
        assertTrue(wallet.isOwner(owner1));
        assertTrue(wallet.isOwner(owner2));
        assertTrue(wallet.isOwner(owner3));
        assertFalse(wallet.isOwner(nonOwner));
    }
    
    function testFactoryTracking() public view {
        address[] memory walletsByCreator = factory.getWalletsByCreator(owner1);
        assertEq(walletsByCreator.length, 1);
        assertEq(walletsByCreator[0], address(wallet));
        
        address[] memory allWallets = factory.getAllWallets();
        assertEq(allWallets.length, 1);
        assertEq(factory.getWalletCount(), 1);
    }
    
    function testCannotDeployWithZeroOwners() public {
        address[] memory emptyOwners = new address[](0);
        
        vm.expectRevert(MultiSigWallet.InvalidOwner.selector);
        new MultiSigWallet(WALLET_NAME, emptyOwners, THRESHOLD);
    }

    
    function testCannotDeployWithInvalidThreshold() public {
        vm.expectRevert(MultiSigWallet.InvalidRequiredSignatures.selector);
        new MultiSigWallet(WALLET_NAME, owners, 0);
        
        vm.expectRevert(MultiSigWallet.InvalidRequiredSignatures.selector);
        new MultiSigWallet(WALLET_NAME, owners, 4); // More than owners
    }
    
    // ============================================================================
    // TRANSACTION SUBMISSION TESTS
    // ============================================================================
    
    function testSubmitTransaction() public {
        vm.prank(owner1);
        
        vm.expectEmit(true, true, true, true);
        emit SubmitTransaction(owner1, 0, recipient, 1 ether, "");
        
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 24);
        
        assertEq(txIndex, 0);
        assertEq(wallet.transactionCount(), 1);
        
        (address to, uint256 value, , bool executed, uint256 confirmations, ,) = wallet.getTransaction(0);
        assertEq(to, recipient);
        assertEq(value, 1 ether);
        assertFalse(executed);
        assertEq(confirmations, 1); // Auto-confirmed by submitter
    }
    
    function testNonOwnerCannotSubmit() public {
        vm.prank(nonOwner);
        vm.expectRevert(MultiSigWallet.NotOwner.selector);
        wallet.submitTransaction(recipient, 1 ether, "", 24);
    }

    
    // ============================================================================
    // CONFIRMATION TESTS
    // ============================================================================
    
    function testConfirmTransaction() public {
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 24);
        
        // Owner1 auto-confirmed on submission
        assertEq(wallet.getConfirmationCount(txIndex), 1);
        assertTrue(wallet.isTransactionConfirmed(txIndex, owner1));
        
        // Owner2 confirms
        vm.prank(owner2);
        vm.expectEmit(true, true, false, false);
        emit ConfirmTransaction(owner2, txIndex);
        wallet.confirmTransaction(txIndex);
        
        assertEq(wallet.getConfirmationCount(txIndex), 2);
        assertTrue(wallet.isTransactionConfirmed(txIndex, owner2));
    }
    
    function testCannotConfirmTwice() public {
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 24);
        
        // Owner1 already confirmed on submission
        vm.prank(owner1);
        vm.expectRevert(MultiSigWallet.TransactionAlreadyConfirmed.selector);
        wallet.confirmTransaction(txIndex);
    }
    
    function testRevokeConfirmation() public {
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 24);
        
        assertEq(wallet.getConfirmationCount(txIndex), 1);

        
        // Owner1 revokes
        vm.prank(owner1);
        vm.expectEmit(true, true, false, false);
        emit RevokeConfirmation(owner1, txIndex);
        wallet.revokeConfirmation(txIndex);
        
        assertEq(wallet.getConfirmationCount(txIndex), 0);
        assertFalse(wallet.isTransactionConfirmed(txIndex, owner1));
    }
    
    // ============================================================================
    // EXECUTION TESTS
    // ============================================================================
    
    function testExecuteTransaction() public {
        uint256 recipientBalanceBefore = recipient.balance;
        
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 24);
        
        // Confirm from owner2 (triggers auto-execute at threshold)
        vm.prank(owner2);
        vm.expectEmit(true, true, false, false);
        emit ExecuteTransaction(owner2, txIndex);
        wallet.confirmTransaction(txIndex);
        
        // Verify execution
        (, , , bool executed, ,  ,) = wallet.getTransaction(txIndex);
        assertTrue(executed);
        assertEq(recipient.balance, recipientBalanceBefore + 1 ether);
    }
    
    function testCannotExecuteWithoutEnoughConfirmations() public {
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 24);
        
        // Only 1 confirmation (owner1), need 2
        vm.prank(owner1);
        vm.expectRevert(MultiSigWallet.NotEnoughConfirmations.selector);
        wallet.executeTransaction(txIndex);
    }

    
    function testCannotExecuteExpiredTransaction() public {
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 1); // 1 hour expiry
        
        // Fast forward 2 hours
        vm.warp(block.timestamp + 2 hours);
        
        vm.prank(owner2);
        vm.expectRevert(MultiSigWallet.TransactionExpired.selector);
        wallet.confirmTransaction(txIndex);
    }
    
    // ============================================================================
    // OWNER MANAGEMENT TESTS
    // ============================================================================
    
    function testAddOwner() public {
        address newOwner = address(0x6);
        
        // Create transaction to add owner
        bytes memory data = abi.encodeWithSelector(
            MultiSigWallet.addOwner.selector,
            newOwner
        );
        
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(address(wallet), 0, data, 0);
        
        // Confirm and execute
        vm.prank(owner2);
        wallet.confirmTransaction(txIndex);
        
        // Verify owner added
        assertTrue(wallet.isOwner(newOwner));
        assertEq(wallet.getOwners().length, 4);
    }
    
    function testRemoveOwner() public {
        // Create transaction to remove owner3
        bytes memory data = abi.encodeWithSelector(
            MultiSigWallet.removeOwner.selector,
            owner3
        );

        
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(address(wallet), 0, data, 0);
        
        // Confirm and execute
        vm.prank(owner2);
        wallet.confirmTransaction(txIndex);
        
        // Verify owner removed
        assertFalse(wallet.isOwner(owner3));
        assertEq(wallet.getOwners().length, 2);
    }
    
    function testChangeThreshold() public {
        // Create transaction to change threshold to 3
        bytes memory data = abi.encodeWithSelector(
            MultiSigWallet.changeRequiredSignatures.selector,
            3
        );
        
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(address(wallet), 0, data, 0);
        
        // Confirm and execute
        vm.prank(owner2);
        wallet.confirmTransaction(txIndex);
        
        // Verify threshold changed
        assertEq(wallet.requiredSignatures(), 3);
    }
    
    // ============================================================================
    // FROST INTEGRATION TESTS
    // ============================================================================
    
    function testSetFrostSession() public {
        bytes32 sessionId = keccak256("test-session");
        
        vm.prank(owner1);
        uint256 txIndex = wallet.submitTransaction(recipient, 1 ether, "", 24);
        
        vm.prank(owner1);
        wallet.setFrostSession(txIndex, sessionId);
        
        assertEq(wallet.getFrostSession(txIndex), sessionId);
    }
}

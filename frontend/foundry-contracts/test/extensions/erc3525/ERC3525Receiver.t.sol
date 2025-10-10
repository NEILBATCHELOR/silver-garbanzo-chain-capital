// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../../src/extensions/erc3525/ERC3525ReceiverExample.sol";
import "../../../src/extensions/erc3525/interfaces/IERC3525Receiver.sol";

/**
 * @title ERC3525ReceiverTest
 * @notice Comprehensive tests for ERC-3525 receiver functionality
 */
contract ERC3525ReceiverTest is Test {
    
    ERC3525ReceiverExample public receiver;
    
    address public owner;
    address public operator = address(1);
    address public sender1 = address(2);
    address public sender2 = address(3);
    address public nonWhitelisted = address(4);
    
    uint256 public constant TOKEN_ID_1 = 1;
    uint256 public constant TOKEN_ID_2 = 2;
    uint256 public constant VALUE_100 = 100;
    uint256 public constant VALUE_200 = 200;
    
    event ValueReceived(
        address indexed operator,
        address indexed from,
        uint256 indexed tokenId,
        uint256 value,
        bytes data
    );
    
    event TransferRejected(
        address indexed operator,
        address indexed from,
        uint256 indexed tokenId,
        uint256 value,
        string reason
    );
    
    event SenderWhitelisted(address indexed sender, bool allowed);
    event WhitelistToggled(bool enabled);
    
    function setUp() public {
        receiver = new ERC3525ReceiverExample();
        owner = address(this);
    }
    
    // ============ Initialization Tests ============
    
    function testOwnerSetCorrectly() public {
        assertEq(receiver.owner(), owner);
    }
    
    function testWhitelistDisabledByDefault() public {
        assertFalse(receiver.whitelistEnabled());
    }
    
    // ============ Basic Receiver Tests ============
    
    function testOnERC3525Received() public {
        bytes memory data = "";
        
        vm.expectEmit(true, true, true, true);
        emit ValueReceived(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        
        bytes4 selector = receiver.onERC3525Received(
            operator,
            sender1,
            TOKEN_ID_1,
            VALUE_100,
            data
        );
        
        assertEq(selector, IERC3525Receiver.onERC3525Received.selector);
        assertEq(receiver.receivedValues(TOKEN_ID_1), VALUE_100);
        assertEq(receiver.transferCounts(TOKEN_ID_1), 1);
    }
    
    function testMultipleTransfersSameToken() public {
        bytes memory data = "";
        
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_200, data);
        
        assertEq(receiver.receivedValues(TOKEN_ID_1), VALUE_100 + VALUE_200);
        assertEq(receiver.transferCounts(TOKEN_ID_1), 2);
    }
    
    function testMultipleTokensSeparateTracking() public {
        bytes memory data = "";
        
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_2, VALUE_200, data);
        
        assertEq(receiver.receivedValues(TOKEN_ID_1), VALUE_100);
        assertEq(receiver.receivedValues(TOKEN_ID_2), VALUE_200);
        assertEq(receiver.transferCounts(TOKEN_ID_1), 1);
        assertEq(receiver.transferCounts(TOKEN_ID_2), 1);
    }
    
    function testTransferWithData() public {
        bytes memory data = abi.encode("custom data", 12345);
        
        bytes4 selector = receiver.onERC3525Received(
            operator,
            sender1,
            TOKEN_ID_1,
            VALUE_100,
            data
        );
        
        assertEq(selector, IERC3525Receiver.onERC3525Received.selector);
    }
    
    // ============ Whitelist Tests ============
    
    function testSetWhitelistEnabled() public {
        vm.expectEmit(true, false, false, true);
        emit WhitelistToggled(true);
        
        receiver.setWhitelistEnabled(true);
        assertTrue(receiver.whitelistEnabled());
    }
    
    function testSetAllowedSender() public {
        vm.expectEmit(true, false, false, true);
        emit SenderWhitelisted(sender1, true);
        
        receiver.setAllowedSender(sender1, true);
        assertTrue(receiver.allowedSenders(sender1));
    }
    
    function testSetAllowedSendersBatch() public {
        address[] memory senders = new address[](3);
        senders[0] = sender1;
        senders[1] = sender2;
        senders[2] = operator;
        
        bool[] memory allowed = new bool[](3);
        allowed[0] = true;
        allowed[1] = true;
        allowed[2] = false;
        
        receiver.setAllowedSendersBatch(senders, allowed);
        
        assertTrue(receiver.allowedSenders(sender1));
        assertTrue(receiver.allowedSenders(sender2));
        assertFalse(receiver.allowedSenders(operator));
    }
    
    function testWhitelistEnforcement() public {
        // Enable whitelist
        receiver.setWhitelistEnabled(true);
        receiver.setAllowedSender(sender1, true);
        
        bytes memory data = "";
        
        // Whitelisted sender should succeed
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        
        // Non-whitelisted should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                ERC3525ReceiverExample.TransferNotAllowed.selector,
                "Sender not whitelisted"
            )
        );
        receiver.onERC3525Received(operator, nonWhitelisted, TOKEN_ID_1, VALUE_100, data);
    }
    
    function testWhitelistDisabledAllowsAll() public {
        receiver.setWhitelistEnabled(false);
        
        bytes memory data = "";
        
        // Should accept from any sender when whitelist disabled
        receiver.onERC3525Received(operator, nonWhitelisted, TOKEN_ID_1, VALUE_100, data);
        assertEq(receiver.receivedValues(TOKEN_ID_1), VALUE_100);
    }
    
    // ============ Validation Tests ============
    
    function testRejectZeroValue() public {
        bytes memory data = "";
        
        vm.expectRevert(ERC3525ReceiverExample.InvalidValue.selector);
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, 0, data);
    }
    
    // ============ Access Control Tests ============
    
    function testOnlyOwnerCanSetWhitelist() public {
        vm.prank(sender1);
        vm.expectRevert(ERC3525ReceiverExample.Unauthorized.selector);
        receiver.setWhitelistEnabled(true);
    }
    
    function testOnlyOwnerCanSetAllowedSender() public {
        vm.prank(sender1);
        vm.expectRevert(ERC3525ReceiverExample.Unauthorized.selector);
        receiver.setAllowedSender(sender2, true);
    }
    
    function testOnlyOwnerCanSetAllowedSendersBatch() public {
        address[] memory senders = new address[](1);
        senders[0] = sender1;
        bool[] memory allowed = new bool[](1);
        allowed[0] = true;
        
        vm.prank(sender1);
        vm.expectRevert(ERC3525ReceiverExample.Unauthorized.selector);
        receiver.setAllowedSendersBatch(senders, allowed);
    }
    
    // ============ View Function Tests ============
    
    function testGetTotalReceivedValue() public {
        bytes memory data = "";
        
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_200, data);
        
        assertEq(receiver.getTotalReceivedValue(TOKEN_ID_1), VALUE_100 + VALUE_200);
    }
    
    function testGetTransferCount() public {
        bytes memory data = "";
        
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, VALUE_100, data);
        
        assertEq(receiver.getTransferCount(TOKEN_ID_1), 3);
    }
    
    function testIsAllowedSender() public {
        // Whitelist disabled - all allowed
        assertTrue(receiver.isAllowedSender(nonWhitelisted));
        
        // Enable whitelist
        receiver.setWhitelistEnabled(true);
        receiver.setAllowedSender(sender1, true);
        
        assertTrue(receiver.isAllowedSender(sender1));
        assertFalse(receiver.isAllowedSender(nonWhitelisted));
    }
    
    // ============ Edge Cases ============
    
    function testArrayLengthMismatchInBatch() public {
        address[] memory senders = new address[](2);
        senders[0] = sender1;
        senders[1] = sender2;
        
        bool[] memory allowed = new bool[](1);
        allowed[0] = true;
        
        vm.expectRevert("Array length mismatch");
        receiver.setAllowedSendersBatch(senders, allowed);
    }
    
    function testEmptyBatchUpdate() public {
        address[] memory senders = new address[](0);
        bool[] memory allowed = new bool[](0);
        
        receiver.setAllowedSendersBatch(senders, allowed);
        // Should not revert
    }
    
    function testLargeValueTransfer() public {
        bytes memory data = "";
        uint256 largeValue = type(uint256).max;
        
        receiver.onERC3525Received(operator, sender1, TOKEN_ID_1, largeValue, data);
        assertEq(receiver.receivedValues(TOKEN_ID_1), largeValue);
    }
    
    // ============ Event Tests ============
    
    function testTransferRejectedEvent() public {
        receiver.setWhitelistEnabled(true);
        bytes memory data = "";
        
        vm.expectEmit(true, true, true, false);
        emit TransferRejected(operator, nonWhitelisted, TOKEN_ID_1, VALUE_100, "");
        
        vm.expectRevert();
        receiver.onERC3525Received(operator, nonWhitelisted, TOKEN_ID_1, VALUE_100, data);
    }
}

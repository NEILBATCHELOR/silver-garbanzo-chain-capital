// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC1363PayableToken} from "src/extensions/payable/ERC1363PayableToken.sol";
import {IERC1363Receiver} from "src/extensions/payable/interfaces/IERC1363Receiver.sol";
import {IERC1363Spender} from "src/extensions/payable/interfaces/IERC1363Spender.sol";
import {ERC20Master} from "src/masters/ERC20Master.sol";

contract ERC1363PayableTokenTest is Test {
    ERC1363PayableToken public implementation;
    ERC1363PayableToken public module;
    ERC20Master public token;
    
    // Test accounts
    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public unauthorized = makeAddr("unauthorized");
    
    // Constants
    uint256 constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 constant CALLBACK_GAS_LIMIT = 100_000;
    
    // Events
    event TransferAndCall(address indexed from, address indexed to, uint256 value, bytes data);
    event ApproveAndCall(address indexed owner, address indexed spender, uint256 value, bytes data);
    event CallbackGasLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event WhitelistEnabled(bool enabled);
    event ReceiverWhitelisted(address indexed receiver, bool whitelisted);
    event SpenderWhitelisted(address indexed spender, bool whitelisted);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy ERC20 token
        token = new ERC20Master();
        token.initialize("Test Token", "TEST", INITIAL_SUPPLY, INITIAL_SUPPLY, owner);
        
        // Deploy implementation
        implementation = new ERC1363PayableToken();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC1363PayableToken.initialize.selector,
            owner,
            address(token),
            CALLBACK_GAS_LIMIT
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        module = ERC1363PayableToken(address(proxy));
        
        // Grant roles
        module.grantRole(module.WHITELIST_MANAGER_ROLE(), admin);
        
        // Mint tokens to test users
        token.mint(user1, 1000e18);
        token.mint(user2, 1000e18);
        
        vm.stopPrank();
    }
    
    // ===== INITIALIZATION TESTS =====
    
    function test_Initialize() public view {
        assertEq(module.tokenContract(), address(token));
        assertTrue(module.isEnabled());
        assertEq(module.callbackGasLimit(), CALLBACK_GAS_LIMIT);
        assertFalse(module.isWhitelistEnabled());
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), owner));
    }
    
    function test_RevertWhen_InitializeTwice() public {
        ERC1363PayableToken newModule = new ERC1363PayableToken();
        newModule.initialize(owner, address(token), CALLBACK_GAS_LIMIT);
        
        vm.expectRevert();
        newModule.initialize(owner, address(token), CALLBACK_GAS_LIMIT);
    }
    
    function test_RevertWhen_InvalidTokenContract() public {
        ERC1363PayableToken newModule = new ERC1363PayableToken();
        
        vm.expectRevert(ERC1363PayableToken.InvalidTokenContract.selector);
        newModule.initialize(owner, address(0), CALLBACK_GAS_LIMIT);
    }
    
    // ===== ACCESS CONTROL TESTS =====
    
    function test_OnlyAdmin_CanSetCallbackGasLimit() public {
        uint256 newLimit = 200_000;
        
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit CallbackGasLimitUpdated(CALLBACK_GAS_LIMIT, newLimit);
        module.setCallbackGasLimit(newLimit);
        
        assertEq(module.callbackGasLimit(), newLimit);
    }
    
    function test_RevertWhen_UnauthorizedSetCallbackGasLimit() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.setCallbackGasLimit(200_000);
    }
    
    function test_OnlyWhitelistManager_CanWhitelistReceiver() public {
        address receiver = makeAddr("receiver");
        
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit ReceiverWhitelisted(receiver, true);
        module.whitelistReceiver(receiver, true);
        
        assertTrue(module.isReceiverWhitelisted(receiver));
    }
    
    function test_RevertWhen_UnauthorizedWhitelistReceiver() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.whitelistReceiver(user1, true);
    }
    
    // ===== CORE FUNCTIONALITY TESTS =====
    
    function test_TransferAndCall_Success() public {
        MockReceiver receiver = new MockReceiver();
        uint256 amount = 100e18;
        
        vm.startPrank(user1);
        token.approve(address(module), amount);
        
        vm.expectEmit(true, true, true, true);
        emit TransferAndCall(user1, address(receiver), amount, "");
        
        bool success = module.transferAndCall(address(receiver), amount);
        assertTrue(success);
        
        // Verify receiver was called
        assertTrue(receiver.wasCalled());
        assertEq(receiver.lastOperator(), user1);
        assertEq(receiver.lastFrom(), user1);
        assertEq(receiver.lastValue(), amount);
        vm.stopPrank();
    }
    
    function test_TransferAndCall_WithData() public {
        MockReceiver receiver = new MockReceiver();
        uint256 amount = 100e18;
        bytes memory data = abi.encode("test data");
        
        vm.startPrank(user1);
        token.approve(address(module), amount);
        
        vm.expectEmit(true, true, true, true);
        emit TransferAndCall(user1, address(receiver), amount, data);
        
        bool success = module.transferAndCall(address(receiver), amount, data);
        assertTrue(success);
        
        assertTrue(receiver.wasCalled());
        assertEq(keccak256(receiver.lastData()), keccak256(data));
        vm.stopPrank();
    }
    
    function test_TransferAndCall_ToEOA() public {
        uint256 amount = 100e18;
        
        vm.startPrank(user1);
        token.approve(address(module), amount);
        
        // Should succeed without callback for EOA
        bool success = module.transferAndCall(user2, amount);
        assertTrue(success);
        assertEq(token.balanceOf(user2), 1000e18 + amount);
        vm.stopPrank();
    }
    
    function test_TransferFromAndCall_Success() public {
        MockReceiver receiver = new MockReceiver();
        uint256 amount = 100e18;
        
        vm.prank(user1);
        token.approve(user2, amount);
        
        vm.startPrank(user2);
        token.approve(address(module), amount);
        
        vm.expectEmit(true, true, true, true);
        emit TransferAndCall(user1, address(receiver), amount, "");
        
        bool success = module.transferFromAndCall(user1, address(receiver), amount);
        assertTrue(success);
        assertTrue(receiver.wasCalled());
        vm.stopPrank();
    }
    
    function test_ApproveAndCall_Success() public {
        MockSpender spender = new MockSpender();
        uint256 amount = 100e18;
        
        vm.startPrank(user1);
        
        vm.expectEmit(true, true, true, true);
        emit ApproveAndCall(user1, address(spender), amount, "");
        
        bool success = module.approveAndCall(address(spender), amount);
        assertTrue(success);
        
        assertTrue(spender.wasCalled());
        assertEq(spender.lastOwner(), user1);
        assertEq(spender.lastValue(), amount);
        vm.stopPrank();
    }
    
    function test_ApproveAndCall_WithData() public {
        MockSpender spender = new MockSpender();
        uint256 amount = 100e18;
        bytes memory data = abi.encode("approval data");
        
        vm.startPrank(user1);
        
        bool success = module.approveAndCall(address(spender), amount, data);
        assertTrue(success);
        
        assertTrue(spender.wasCalled());
        assertEq(keccak256(spender.lastData()), keccak256(data));
        vm.stopPrank();
    }
    
    // ===== WHITELIST TESTS =====
    
    function test_WhitelistMode_ReceiverRequired() public {
        MockReceiver receiver = new MockReceiver();
        uint256 amount = 100e18;
        
        // Enable whitelist
        vm.prank(owner);
        module.setWhitelistEnabled(true);
        assertTrue(module.isWhitelistEnabled());
        
        vm.startPrank(user1);
        token.approve(address(module), amount);
        
        // Should fail without whitelist
        vm.expectRevert(abi.encodeWithSelector(
            ERC1363PayableToken.ReceiverNotWhitelisted.selector,
            address(receiver)
        ));
        module.transferAndCall(address(receiver), amount);
        
        vm.stopPrank();
        
        // Whitelist receiver
        vm.prank(admin);
        module.whitelistReceiver(address(receiver), true);
        
        // Should succeed now
        vm.startPrank(user1);
        bool success = module.transferAndCall(address(receiver), amount);
        assertTrue(success);
        vm.stopPrank();
    }
    
    function test_WhitelistMode_SpenderRequired() public {
        MockSpender spender = new MockSpender();
        uint256 amount = 100e18;
        
        // Enable whitelist
        vm.prank(owner);
        module.setWhitelistEnabled(true);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(
            ERC1363PayableToken.SpenderNotWhitelisted.selector,
            address(spender)
        ));
        module.approveAndCall(address(spender), amount);
        
        // Whitelist spender
        vm.prank(admin);
        module.whitelistSpender(address(spender), true);
        
        // Should succeed now
        vm.prank(user1);
        bool success = module.approveAndCall(address(spender), amount);
        assertTrue(success);
    }
    
    function test_BatchWhitelistReceivers() public {
        address[] memory receivers = new address[](3);
        receivers[0] = makeAddr("receiver1");
        receivers[1] = makeAddr("receiver2");
        receivers[2] = makeAddr("receiver3");
        
        vm.prank(admin);
        module.batchWhitelistReceivers(receivers, true);
        
        assertTrue(module.isReceiverWhitelisted(receivers[0]));
        assertTrue(module.isReceiverWhitelisted(receivers[1]));
        assertTrue(module.isReceiverWhitelisted(receivers[2]));
    }
    
    function test_BatchWhitelistSpenders() public {
        address[] memory spenders = new address[](3);
        spenders[0] = makeAddr("spender1");
        spenders[1] = makeAddr("spender2");
        spenders[2] = makeAddr("spender3");
        
        vm.prank(admin);
        module.batchWhitelistSpenders(spenders, true);
        
        assertTrue(module.isSpenderWhitelisted(spenders[0]));
        assertTrue(module.isSpenderWhitelisted(spenders[1]));
        assertTrue(module.isSpenderWhitelisted(spenders[2]));
    }
    
    // ===== REVERT TESTS =====
    
    function test_RevertWhen_CallbackFails() public {
        BadReceiver badReceiver = new BadReceiver();
        uint256 amount = 100e18;
        
        vm.startPrank(user1);
        token.approve(address(module), amount);
        
        vm.expectRevert(abi.encodeWithSelector(
            ERC1363PayableToken.CallbackFailed.selector,
            address(badReceiver),
            IERC1363Receiver.onTransferReceived.selector
        ));
        module.transferAndCall(address(badReceiver), amount);
        vm.stopPrank();
    }
    
    function test_RevertWhen_InvalidCallbackResponse() public {
        WrongResponseReceiver wrongReceiver = new WrongResponseReceiver();
        uint256 amount = 100e18;
        
        vm.startPrank(user1);
        token.approve(address(module), amount);
        
        vm.expectRevert(abi.encodeWithSelector(
            ERC1363PayableToken.InvalidCallbackResponse.selector,
            address(wrongReceiver),
            IERC1363Receiver.onTransferReceived.selector,
            bytes4(keccak256("wrongSelector()"))
        ));
        module.transferAndCall(address(wrongReceiver), amount);
        vm.stopPrank();
    }
    
    // ===== FUZZ TESTS =====
    
    function testFuzz_TransferAndCall(uint256 amount) public {
        amount = bound(amount, 1, 1000e18);
        MockReceiver receiver = new MockReceiver();
        
        vm.startPrank(user1);
        token.approve(address(module), amount);
        
        bool success = module.transferAndCall(address(receiver), amount);
        assertTrue(success);
        assertEq(receiver.lastValue(), amount);
        vm.stopPrank();
    }
    
    function testFuzz_ApproveAndCall(uint256 amount) public {
        amount = bound(amount, 0, type(uint256).max);
        MockSpender spender = new MockSpender();
        
        vm.prank(user1);
        bool success = module.approveAndCall(address(spender), amount);
        assertTrue(success);
        assertEq(spender.lastValue(), amount);
    }
    
    function testFuzz_CallbackGasLimit(uint256 newLimit) public {
        newLimit = bound(newLimit, 10000, 1_000_000);
        
        vm.prank(owner);
        module.setCallbackGasLimit(newLimit);
        assertEq(module.callbackGasLimit(), newLimit);
    }
}

// ===== MOCK CONTRACTS =====

contract MockReceiver is IERC1363Receiver {
    bool public wasCalled;
    address public lastOperator;
    address public lastFrom;
    uint256 public lastValue;
    bytes public lastData;
    
    function onTransferReceived(
        address operator,
        address from,
        uint256 value,
        bytes memory data
    ) external override returns (bytes4) {
        wasCalled = true;
        lastOperator = operator;
        lastFrom = from;
        lastValue = value;
        lastData = data;
        return this.onTransferReceived.selector;
    }
}

contract MockSpender is IERC1363Spender {
    bool public wasCalled;
    address public lastOwner;
    uint256 public lastValue;
    bytes public lastData;
    
    function onApprovalReceived(
        address owner,
        uint256 value,
        bytes memory data
    ) external override returns (bytes4) {
        wasCalled = true;
        lastOwner = owner;
        lastValue = value;
        lastData = data;
        return this.onApprovalReceived.selector;
    }
}

contract BadReceiver {
    // Reverts on callback
    function onTransferReceived(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        revert("Bad receiver");
    }
}

contract WrongResponseReceiver {
    // Returns wrong selector
    function onTransferReceived(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return bytes4(keccak256("wrongSelector()"));
    }
}

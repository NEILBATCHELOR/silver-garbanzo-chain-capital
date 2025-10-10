// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/fees/ERC20FeeModule.sol";

contract ERC20FeeModuleTest is Test {
    using Clones for address;
    
    ERC20FeeModule public implementation;
    ERC20FeeModule public module;
    
    address public admin = address(1);
    address public feeManager = address(2);
    address public tokenContract = address(0x999);
    address public feeRecipient = address(3);
    address public sender = address(4);
    address public receiver = address(5);
    
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    uint256 public constant INITIAL_FEE_BP = 250; // 2.5%
    uint256 public constant MAX_FEE_BP = 1000; // 10%
    uint256 public constant BASIS_POINTS = 10000;
    
    event TransferFeeUpdated(uint256 basisPoints);
    event MaxFeeUpdated(uint256 maxFee);
    event FeeRecipientUpdated(address indexed recipient);
    event FeeExemptionGranted(address indexed account, string reason);
    event FeeExemptionRevoked(address indexed account);
    event FeeCollected(address indexed from, address indexed to, uint256 amount);
    
    function setUp() public {
        implementation = new ERC20FeeModule();
        
        address clone = address(implementation).clone();
        module = ERC20FeeModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, tokenContract, feeRecipient, INITIAL_FEE_BP);
        
        vm.prank(admin);
        module.grantRole(FEE_MANAGER_ROLE, feeManager);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(module.tokenContract(), tokenContract, "Token contract should be set");
        IERC20FeeModule.FeeConfig memory config = module.getFeeConfig();
        assertEq(config.feeRecipient, feeRecipient, "Fee recipient should be set");
        assertEq(config.transferFee, INITIAL_FEE_BP, "Transfer fee should be set");
        assertTrue(config.enabled, "Fees should be enabled");
        assertTrue(module.hasRole(FEE_MANAGER_ROLE, feeManager), "Fee manager role should be granted");
    }
    
    function testInitializationRevertsForZeroFeeRecipient() public {
        address newClone = address(implementation).clone();
        ERC20FeeModule newModule = ERC20FeeModule(newClone);
        
        vm.prank(admin);
        vm.expectRevert();
        newModule.initialize(admin, tokenContract, address(0), INITIAL_FEE_BP);
    }
    
    function testInitializationRevertsForExcessiveFee() public {
        address newClone = address(implementation).clone();
        ERC20FeeModule newModule = ERC20FeeModule(newClone);
        
        vm.prank(admin);
        vm.expectRevert();
        newModule.initialize(admin, tokenContract, feeRecipient, MAX_FEE_BP + 1);
    }
    
    // ============ Fee Configuration Tests ============
    
    function testSetTransferFee() public {
        uint256 newFee = 500; // 5%
        
        vm.expectEmit(false, false, false, true);
        emit TransferFeeUpdated(newFee);
        
        vm.prank(feeManager);
        module.setTransferFee(newFee);
        
        IERC20FeeModule.FeeConfig memory config = module.getFeeConfig();
        assertEq(config.transferFee, newFee, "Transfer fee should be updated");
    }
    
    function testSetTransferFeeRevertsForExcessiveFee() public {
        vm.prank(feeManager);
        vm.expectRevert();
        module.setTransferFee(MAX_FEE_BP + 1);
    }
    
    function testSetTransferFeeRequiresFeeManagerRole() public {
        vm.prank(sender);
        vm.expectRevert();
        module.setTransferFee(500);
    }
    
    function testSetMaxFee() public {
        uint256 maxFee = 1000 ether;
        
        vm.expectEmit(false, false, false, true);
        emit MaxFeeUpdated(maxFee);
        
        vm.prank(feeManager);
        module.setMaxFee(maxFee);
        
        IERC20FeeModule.FeeConfig memory config = module.getFeeConfig();
        assertEq(config.maxFee, maxFee, "Max fee should be updated");
    }
    
    function testSetFeeRecipient() public {
        address newRecipient = address(6);
        
        vm.expectEmit(true, false, false, false);
        emit FeeRecipientUpdated(newRecipient);
        
        vm.prank(feeManager);
        module.setFeeRecipient(newRecipient);
        
        IERC20FeeModule.FeeConfig memory config = module.getFeeConfig();
        assertEq(config.feeRecipient, newRecipient, "Fee recipient should be updated");
    }
    
    function testSetFeeRecipientRevertsForZeroAddress() public {
        vm.prank(feeManager);
        vm.expectRevert();
        module.setFeeRecipient(address(0));
    }
    
    function testSetFeeEnabled() public {
        vm.prank(feeManager);
        module.setFeeEnabled(false);
        
        IERC20FeeModule.FeeConfig memory config = module.getFeeConfig();
        assertFalse(config.enabled, "Fees should be disabled");
        
        vm.prank(feeManager);
        module.setFeeEnabled(true);
        
        config = module.getFeeConfig();
        assertTrue(config.enabled, "Fees should be enabled");
    }
    
    // ============ Fee Calculation Tests ============
    
    function testCalculateFee() public view {
        uint256 amount = 10000 ether;
        uint256 expectedFee = (amount * INITIAL_FEE_BP) / BASIS_POINTS;
        
        uint256 actualFee = module.calculateFee(amount);
        assertEq(actualFee, expectedFee, "Fee should be calculated correctly");
    }
    
    function testCalculateFeeWithMaxCap() public {
        uint256 maxFee = 10 ether;
        vm.prank(feeManager);
        module.setMaxFee(maxFee);
        
        uint256 largeAmount = 1000000 ether;
        uint256 actualFee = module.calculateFee(largeAmount);
        
        assertEq(actualFee, maxFee, "Fee should be capped at max");
    }
    
    function testCalculateFeeWhenDisabled() public {
        vm.prank(feeManager);
        module.setFeeEnabled(false);
        
        uint256 fee = module.calculateFee(10000 ether);
        assertEq(fee, 0, "Fee should be 0 when disabled");
    }
    
    function testCalculateFeeAndNet() public view {
        uint256 amount = 10000 ether;
        (uint256 feeAmount, uint256 netAmount) = module.calculateFeeAndNet(amount);
        
        uint256 expectedFee = (amount * INITIAL_FEE_BP) / BASIS_POINTS;
        assertEq(feeAmount, expectedFee, "Fee amount should match");
        assertEq(netAmount, amount - expectedFee, "Net amount should be correct");
    }
    
    // ============ Fee Exemption Tests ============
    
    function testExemptFromFees() public {
        string memory reason = "DAO treasury";
        
        vm.expectEmit(true, false, false, true);
        emit FeeExemptionGranted(sender, reason);
        
        vm.prank(feeManager);
        module.exemptFromFees(sender, reason);
        
        assertTrue(module.isExempt(sender), "Should be exempt");
        
        IERC20FeeModule.FeeExemption memory exemption = module.getExemption(sender);
        assertTrue(exemption.isExempt, "Exemption should be active");
        assertEq(exemption.reason, reason, "Reason should match");
        assertEq(exemption.addedAt, block.timestamp, "Timestamp should match");
    }
    
    function testRevokeExemption() public {
        vm.prank(feeManager);
        module.exemptFromFees(sender, "Test");
        
        vm.expectEmit(true, false, false, false);
        emit FeeExemptionRevoked(sender);
        
        vm.prank(feeManager);
        module.revokeExemption(sender);
        
        assertFalse(module.isExempt(sender), "Should not be exempt");
    }
    
    function testExemptionRequiresFeeManagerRole() public {
        vm.prank(sender);
        vm.expectRevert();
        module.exemptFromFees(sender, "Test");
    }
    
    // ============ Fee Collection Tests ============
    
    function testProcessTransferWithFee() public {
        uint256 amount = 10000 ether;
        uint256 expectedFee = (amount * INITIAL_FEE_BP) / BASIS_POINTS;
        
        vm.expectEmit(true, true, false, true);
        emit FeeCollected(sender, receiver, expectedFee);
        
        (uint256 feeAmount, uint256 netAmount) = module.processTransferWithFee(sender, receiver, amount);
        
        assertEq(feeAmount, expectedFee, "Fee amount should match");
        assertEq(netAmount, amount - expectedFee, "Net amount should match");
        assertEq(module.getTotalFeesCollected(), expectedFee, "Total fees should be tracked");
    }
    
    function testProcessTransferWithSenderExemption() public {
        vm.prank(feeManager);
        module.exemptFromFees(sender, "Exempt sender");
        
        uint256 amount = 10000 ether;
        (uint256 feeAmount, uint256 netAmount) = module.processTransferWithFee(sender, receiver, amount);
        
        assertEq(feeAmount, 0, "Fee should be 0 for exempt sender");
        assertEq(netAmount, amount, "Net amount should equal original");
        assertEq(module.getTotalFeesCollected(), 0, "No fees should be collected");
    }
    
    function testProcessTransferWithReceiverExemption() public {
        vm.prank(feeManager);
        module.exemptFromFees(receiver, "Exempt receiver");
        
        uint256 amount = 10000 ether;
        (uint256 feeAmount, uint256 netAmount) = module.processTransferWithFee(sender, receiver, amount);
        
        assertEq(feeAmount, 0, "Fee should be 0 for exempt receiver");
        assertEq(netAmount, amount, "Net amount should equal original");
    }
    
    function testMultipleTransfersAccumulateFees() public {
        uint256 amount1 = 10000 ether;
        uint256 amount2 = 5000 ether;
        
        (uint256 fee1,) = module.processTransferWithFee(sender, receiver, amount1);
        (uint256 fee2,) = module.processTransferWithFee(sender, receiver, amount2);
        
        assertEq(module.getTotalFeesCollected(), fee1 + fee2, "Fees should accumulate");
    }
}

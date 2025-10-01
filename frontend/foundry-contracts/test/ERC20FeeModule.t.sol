// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/extensions/fees/ERC20FeeModule.sol";
import "../src/extensions/fees/interfaces/IERC20FeeModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC20FeeModuleTest is Test {
    ERC20FeeModule public feeModule;
    ERC20FeeModule public feeImplementation;
    
    address admin = address(1);
    address feeRecipient = address(2);
    address tokenContract = address(3);
    address user1 = address(4);
    address user2 = address(5);
    
    uint256 constant INITIAL_FEE = 100; // 1%
    
    function setUp() public {
        // Deploy implementation
        feeImplementation = new ERC20FeeModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC20FeeModule.initialize.selector,
            admin,
            tokenContract,
            feeRecipient,
            INITIAL_FEE
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(feeImplementation),
            initData
        );
        
        feeModule = ERC20FeeModule(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        IERC20FeeModule.FeeConfig memory config = feeModule.getFeeConfig();
        assertEq(config.transferFee, INITIAL_FEE);
        assertEq(config.feeRecipient, feeRecipient);
        assertEq(config.enabled, true);
        assertEq(feeModule.tokenContract(), tokenContract);
    }
    
    function testCannotInitializeTwice() public {
        vm.expectRevert();
        feeModule.initialize(admin, tokenContract, feeRecipient, INITIAL_FEE);
    }
    
    // ============ Fee Configuration Tests ============
    
    function testSetTransferFee() public {
        vm.prank(admin);
        feeModule.setTransferFee(200); // 2%
        
        IERC20FeeModule.FeeConfig memory config = feeModule.getFeeConfig();
        assertEq(config.transferFee, 200);
    }
    
    function testCannotSetExcessiveFee() public {
        vm.prank(admin);
        vm.expectRevert(IERC20FeeModule.FeeExceedsMaximum.selector);
        feeModule.setTransferFee(1100); // 11% - exceeds 10% max
    }
    
    function testSetMaxFee() public {
        vm.prank(admin);
        feeModule.setMaxFee(1000 ether);
        
        IERC20FeeModule.FeeConfig memory config = feeModule.getFeeConfig();
        assertEq(config.maxFee, 1000 ether);
    }
    
    function testSetFeeRecipient() public {
        address newRecipient = address(99);
        vm.prank(admin);
        feeModule.setFeeRecipient(newRecipient);
        
        IERC20FeeModule.FeeConfig memory config = feeModule.getFeeConfig();
        assertEq(config.feeRecipient, newRecipient);
    }
    
    function testCannotSetZeroAddressRecipient() public {
        vm.prank(admin);
        vm.expectRevert(IERC20FeeModule.InvalidFeeRecipient.selector);
        feeModule.setFeeRecipient(address(0));
    }
    
    // ============ Fee Calculation Tests ============
    
    function testCalculateFee() public view {
        uint256 amount = 10000 ether;
        uint256 fee = feeModule.calculateFee(amount);
        
        // 1% of 10000 = 100
        assertEq(fee, 100 ether);
    }
    
    function testCalculateFeeWithCap() public {
        vm.prank(admin);
        feeModule.setMaxFee(50 ether);
        
        uint256 amount = 10000 ether;
        uint256 fee = feeModule.calculateFee(amount);
        
        // Would be 100 ether but capped at 50
        assertEq(fee, 50 ether);
    }
    
    function testCalculateFeeAndNet() public view {
        uint256 amount = 10000 ether;
        (uint256 feeAmount, uint256 netAmount) = feeModule.calculateFeeAndNet(amount);
        
        assertEq(feeAmount, 100 ether); // 1% fee
        assertEq(netAmount, 9900 ether); // 99% after fee
    }
    
    // ============ Fee Exemption Tests ============
    
    function testExemptFromFees() public {
        vm.prank(admin);
        feeModule.exemptFromFees(user1, "Liquidity pool");
        
        assertTrue(feeModule.isExempt(user1));
        
        IERC20FeeModule.FeeExemption memory exemption = feeModule.getExemption(user1);
        assertEq(exemption.isExempt, true);
        assertEq(exemption.reason, "Liquidity pool");
    }
    
    function testRevokeExemption() public {
        vm.startPrank(admin);
        feeModule.exemptFromFees(user1, "Test");
        feeModule.revokeExemption(user1);
        vm.stopPrank();
        
        assertFalse(feeModule.isExempt(user1));
    }
    
    function testExemptAddressPaysNoFee() public {
        vm.prank(admin);
        feeModule.exemptFromFees(user1, "Platform wallet");
        
        (uint256 feeAmount, uint256 netAmount) = feeModule.processTransferWithFee(
            user1,
            user2,
            10000 ether
        );
        
        assertEq(feeAmount, 0);
        assertEq(netAmount, 10000 ether);
    }
    
    // ============ Process Transfer Tests ============
    
    function testProcessTransferWithFee() public {
        (uint256 feeAmount, uint256 netAmount) = feeModule.processTransferWithFee(
            user1,
            user2,
            10000 ether
        );
        
        assertEq(feeAmount, 100 ether);
        assertEq(netAmount, 9900 ether);
        assertEq(feeModule.getTotalFeesCollected(), 100 ether);
    }
    
    function testMultipleTransfersFeeAccumulation() public {
        feeModule.processTransferWithFee(user1, user2, 10000 ether);
        feeModule.processTransferWithFee(user1, user2, 5000 ether);
        feeModule.processTransferWithFee(user1, user2, 2000 ether);
        
        // Total: 100 + 50 + 20 = 170
        assertEq(feeModule.getTotalFeesCollected(), 170 ether);
    }
    
    // ============ Access Control Tests ============
    
    function testOnlyFeeManagerCanSetFee() public {
        vm.prank(user1);
        vm.expectRevert();
        feeModule.setTransferFee(200);
    }
    
    function testOnlyFeeManagerCanExempt() public {
        vm.prank(user1);
        vm.expectRevert();
        feeModule.exemptFromFees(user2, "Test");
    }
    
    // ============ Gas Benchmarks ============
    
    function testGasCalculateFee() public view {
        uint256 gasBefore = gasleft();
        feeModule.calculateFee(10000 ether);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for calculateFee:", gasUsed);
        assertLt(gasUsed, 5000); // Should be < 5k gas overhead
    }
    
    function testGasProcessTransfer() public {
        uint256 gasBefore = gasleft();
        feeModule.processTransferWithFee(user1, user2, 10000 ether);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for processTransfer:", gasUsed);
        assertLt(gasUsed, 10000); // Should be < 10k gas overhead
    }
}

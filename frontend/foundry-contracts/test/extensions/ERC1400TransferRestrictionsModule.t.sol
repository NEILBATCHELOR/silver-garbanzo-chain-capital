// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/extensions/erc1400/ERC1400TransferRestrictionsModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC1400TransferRestrictionsModuleTest is Test {
    ERC1400TransferRestrictionsModule public restrictions;
    
    address admin = address(1);
    address investor1 = address(2);
    address investor2 = address(3);
    
    bytes32 constant PARTITION_1 = keccak256("PARTITION_1");
    bytes32 constant PARTITION_2 = keccak256("PARTITION_2");
    bytes32 constant JURISDICTION_US = keccak256("US");
    
    function setUp() public {
        // Deploy implementation
        ERC1400TransferRestrictionsModule implementation = 
            new ERC1400TransferRestrictionsModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC1400TransferRestrictionsModule.initialize.selector,
            admin
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        restrictions = ERC1400TransferRestrictionsModule(address(proxy));
    }
    
    function testSetTransferRestriction() public {
        vm.prank(admin);
        bytes32 restriction = keccak256("LOCK_UP");
        restrictions.setTransferRestriction(PARTITION_1, restriction);
        
        assertEq(restrictions.getTransferRestriction(PARTITION_1), restriction);
    }
    
    function testLockupPeriod() public {
        vm.prank(admin);
        uint256 duration = 30 days;
        restrictions.setLockupPeriod(PARTITION_1, duration);
        
        assertTrue(restrictions.isPartitionLocked(PARTITION_1));
        assertEq(
            restrictions.getLockupExpiry(PARTITION_1),
            block.timestamp + duration
        );
    }
    
    function testCanTransferWithLockup() public {
        // Lock partition
        vm.prank(admin);
        restrictions.lockPartition(PARTITION_1, block.timestamp + 1 days);
        
        // Try transfer (should fail)
        (bytes1 code, bytes32 reason) = restrictions.canTransfer(
            PARTITION_1,
            investor1,
            investor2,
            100,
            ""
        );
        
        assertEq(code, bytes1(0x00)); // TRANSFER_FAILURE
        assertEq(uint256(reason), uint256(2)); // LOCKUP_PERIOD
    }
    
    function testCanTransferAfterLockupExpiry() public {
        // Lock partition
        vm.prank(admin);
        restrictions.lockPartition(PARTITION_1, block.timestamp + 1 days);
        
        // Advance time past lockup
        vm.warp(block.timestamp + 2 days);
        
        // Try transfer (should succeed)
        (bytes1 code,) = restrictions.canTransfer(
            PARTITION_1,
            investor1,
            investor2,
            100,
            ""
        );
        
        assertEq(code, bytes1(0x01)); // TRANSFER_SUCCESS
    }
    
    function testInvestorLimit() public {
        vm.prank(admin);
        restrictions.setInvestorLimit(PARTITION_1, 2);
        
        assertEq(restrictions.getInvestorLimit(PARTITION_1), 2);
    }
    
    function testJurisdictionRestriction() public {
        vm.prank(admin);
        restrictions.setJurisdictionRestriction(JURISDICTION_US, true);
        
        assertTrue(restrictions.isJurisdictionRestricted(JURISDICTION_US));
    }
    
    function testAccessControl() public {
        vm.expectRevert();
        restrictions.setTransferRestriction(PARTITION_1, bytes32(0));
    }
}

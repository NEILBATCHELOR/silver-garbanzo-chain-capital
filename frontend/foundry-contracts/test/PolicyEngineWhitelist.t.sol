// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/policy/PolicyEngine.sol";

/**
 * @title PolicyEngineWhitelistTest
 * @notice Test suite for Phase 3: Whitelist functionality in PolicyEngine
 * 
 * Tests:
 * - Adding single addresses to whitelist
 * - Batch adding multiple addresses
 * - Removing addresses from whitelist
 * - Whitelist enforcement during operations
 * - Non-whitelisted address rejection
 */
contract PolicyEngineWhitelistTest is Test {
    PolicyEngine public policyEngine;
    
    address public admin = address(1);
    address public token = address(2);
    address public operator = address(3);
    address public target1 = address(4);
    address public target2 = address(5);
    address public target3 = address(6);
    address public nonWhitelisted = address(99);
    
    // Events to test
    event AddressWhitelisted(
        address indexed token,
        string operationType,
        address indexed whitelistedAddress
    );
    
    event AddressRemovedFromWhitelist(
        address indexed token,
        string operationType,
        address indexed removedAddress
    );
    
    event WhitelistRequirementEnabled(
        address indexed token,
        string operationType
    );
    
    event WhitelistViolation(
        address indexed token,
        address indexed operator,
        address indexed target,
        string operationType,
        string reason
    );
    
    function setUp() public {
        // Deploy PolicyEngine
        policyEngine = new PolicyEngine();
        policyEngine.initialize(admin);
        
        vm.startPrank(admin);
        
        // Create a basic policy for testing
        policyEngine.createPolicy(
            token,
            "ERC20_TRANSFER",
            0,      // No amount limit
            0,      // No daily limit
            0,      // No cooldown
            0,      // No activation time
            0       // No expiration time
        );
        
        vm.stopPrank();
    }
    
    // ============ Add Single Address Tests ============
    
    function testAddToWhitelist() public {
        vm.startPrank(admin);
        
        // Expect event
        vm.expectEmit(true, true, false, true);
        emit AddressWhitelisted(token, "ERC20_TRANSFER", target1);
        
        // Add address to whitelist
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        
        // Verify address is whitelisted
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target1),
            "Address should be whitelisted"
        );
        
        vm.stopPrank();
    }
    
    function testCannotAddZeroAddress() public {
        vm.startPrank(admin);
        
        // Attempt to add zero address
        vm.expectRevert("Cannot whitelist zero address");
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", address(0));
        
        vm.stopPrank();
    }
    
    function testCannotAddDuplicateAddress() public {
        vm.startPrank(admin);
        
        // Add address first time
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        
        // Attempt to add same address again
        vm.expectRevert("Already whitelisted");
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        
        vm.stopPrank();
    }
    
    function testOnlyAdminCanAddToWhitelist() public {
        // Non-admin attempts to add address
        vm.startPrank(operator);
        
        vm.expectRevert();
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        
        vm.stopPrank();
    }
    
    // ============ Batch Add Tests ============
    
    function testAddToWhitelistBatch() public {
        vm.startPrank(admin);
        
        // Prepare batch of addresses
        address[] memory addresses = new address[](3);
        addresses[0] = target1;
        addresses[1] = target2;
        addresses[2] = target3;
        
        // Add batch
        policyEngine.addToWhitelistBatch(token, "ERC20_TRANSFER", addresses);
        
        // Verify all addresses are whitelisted
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target1),
            "Target1 should be whitelisted"
        );
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target2),
            "Target2 should be whitelisted"
        );
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target3),
            "Target3 should be whitelisted"
        );
        
        // Verify we can retrieve all addresses
        address[] memory whitelisted = policyEngine.getWhitelistedAddresses(token, "ERC20_TRANSFER");
        assertEq(whitelisted.length, 3, "Should have 3 whitelisted addresses");
        
        vm.stopPrank();
    }
    
    function testBatchAddSkipsZeroAndDuplicates() public {
        vm.startPrank(admin);
        
        // Add target1 first
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        
        // Prepare batch with zero address and duplicate
        address[] memory addresses = new address[](4);
        addresses[0] = address(0);  // Should be skipped
        addresses[1] = target1;     // Duplicate, should be skipped
        addresses[2] = target2;     // New, should be added
        addresses[3] = target3;     // New, should be added
        
        // Add batch (should not revert)
        policyEngine.addToWhitelistBatch(token, "ERC20_TRANSFER", addresses);
        
        // Verify only new addresses were added
        address[] memory whitelisted = policyEngine.getWhitelistedAddresses(token, "ERC20_TRANSFER");
        assertEq(whitelisted.length, 3, "Should have 3 whitelisted addresses (target1, target2, target3)");
        
        vm.stopPrank();
    }
    
    function testLargeBatchAdd() public {
        vm.startPrank(admin);
        
        // Create large batch (100 addresses)
        address[] memory addresses = new address[](100);
        for (uint i = 0; i < 100; i++) {
            addresses[i] = address(uint160(1000 + i));
        }
        
        // Add batch
        policyEngine.addToWhitelistBatch(token, "ERC20_TRANSFER", addresses);
        
        // Verify count
        address[] memory whitelisted = policyEngine.getWhitelistedAddresses(token, "ERC20_TRANSFER");
        assertEq(whitelisted.length, 100, "Should have 100 whitelisted addresses");
        
        // Spot check some addresses
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", address(1000)),
            "First address should be whitelisted"
        );
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", address(1099)),
            "Last address should be whitelisted"
        );
        
        vm.stopPrank();
    }
    
    // ============ Remove Address Tests ============
    
    function testRemoveFromWhitelist() public {
        vm.startPrank(admin);
        
        // Add address first
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target1),
            "Address should be whitelisted"
        );
        
        // Expect event
        vm.expectEmit(true, true, false, true);
        emit AddressRemovedFromWhitelist(token, "ERC20_TRANSFER", target1);
        
        // Remove address
        policyEngine.removeFromWhitelist(token, "ERC20_TRANSFER", target1);
        
        // Verify address is no longer whitelisted
        assertFalse(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target1),
            "Address should not be whitelisted"
        );
        
        vm.stopPrank();
    }
    
    function testCannotRemoveNonWhitelistedAddress() public {
        vm.startPrank(admin);
        
        // Attempt to remove address that was never whitelisted
        vm.expectRevert("Not whitelisted");
        policyEngine.removeFromWhitelist(token, "ERC20_TRANSFER", target1);
        
        vm.stopPrank();
    }
    
    function testRemoveFromMiddleOfList() public {
        vm.startPrank(admin);
        
        // Add multiple addresses
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target2);
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target3);
        
        // Remove middle address
        policyEngine.removeFromWhitelist(token, "ERC20_TRANSFER", target2);
        
        // Verify target2 is removed but others remain
        assertFalse(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target2),
            "Target2 should not be whitelisted"
        );
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target1),
            "Target1 should still be whitelisted"
        );
        assertTrue(
            policyEngine.isAddressWhitelisted(token, "ERC20_TRANSFER", target3),
            "Target3 should still be whitelisted"
        );
        
        // Verify list length
        address[] memory whitelisted = policyEngine.getWhitelistedAddresses(token, "ERC20_TRANSFER");
        assertEq(whitelisted.length, 2, "Should have 2 whitelisted addresses");
        
        vm.stopPrank();
    }
    
    // ============ Enable Whitelist Requirement Tests ============
    
    function testEnableWhitelistRequirement() public {
        vm.startPrank(admin);
        
        // Expect event
        vm.expectEmit(true, false, false, true);
        emit WhitelistRequirementEnabled(token, "ERC20_TRANSFER");
        
        // Enable whitelist requirement
        policyEngine.enableWhitelistRequirement(token, "ERC20_TRANSFER");
        
        // Verify policy is updated
        PolicyEngine.Policy memory policy = policyEngine.getPolicy(token, "ERC20_TRANSFER");
        assertTrue(policy.requiresWhitelist, "Policy should require whitelist");
        assertTrue(policy.whitelistEnabled, "Whitelist should be enabled");
        
        vm.stopPrank();
    }
    
    function testCannotEnableWhitelistForInactivePolicy() public {
        vm.startPrank(admin);
        
        // Create inactive policy
        policyEngine.createPolicy(
            address(999),
            "ERC20_MINT",
            0, 0, 0, 0, 0
        );
        
        // Deactivate it
        policyEngine.updatePolicy(address(999), "ERC20_MINT", false, 0, 0);
        
        // Attempt to enable whitelist
        vm.expectRevert("Policy must be active");
        policyEngine.enableWhitelistRequirement(address(999), "ERC20_MINT");
        
        vm.stopPrank();
    }
    
    // ============ Whitelist Enforcement Tests ============
    
    function testWhitelistEnforcementBlocksNonWhitelisted() public {
        vm.startPrank(admin);
        
        // Add target1 to whitelist
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        
        // Enable whitelist requirement
        policyEngine.enableWhitelistRequirement(token, "ERC20_TRANSFER");
        
        vm.stopPrank();
        
        // Test whitelisted address succeeds
        (bool approvedWhitelisted, string memory reasonWhitelisted) = 
            policyEngine.validateOperationWithTarget(token, operator, target1, "ERC20_TRANSFER", 1000);
        
        assertTrue(approvedWhitelisted, "Whitelisted address should be approved");
        assertEq(bytes(reasonWhitelisted).length, 0, "Should have no rejection reason");
        
        // Test non-whitelisted address fails
        (bool approvedNonWhitelisted, string memory reasonNonWhitelisted) = 
            policyEngine.validateOperationWithTarget(token, operator, nonWhitelisted, "ERC20_TRANSFER", 1000);
        
        assertFalse(approvedNonWhitelisted, "Non-whitelisted address should be rejected");
        assertEq(reasonNonWhitelisted, "Target address not whitelisted", "Should have whitelist rejection reason");
    }
    
    function testWhitelistEnforcementWithoutTarget() public {
        vm.startPrank(admin);
        
        // Enable whitelist requirement
        policyEngine.enableWhitelistRequirement(token, "ERC20_TRANSFER");
        
        vm.stopPrank();
        
        // Test transfer without target address
        (bool approved, string memory reason) = 
            policyEngine.validateOperationWithTarget(token, operator, address(0), "ERC20_TRANSFER", 1000);
        
        assertFalse(approved, "Transfer without target should be rejected");
        assertEq(reason, "Target address required for transfer whitelist check", "Should require target address");
    }
    
    function testWhitelistEnforcementForNonTransferOperations() public {
        vm.startPrank(admin);
        
        // Create mint policy
        policyEngine.createPolicy(
            token,
            "ERC20_MINT",
            0, 0, 0, 0, 0
        );
        
        // Add operator to whitelist for mint
        policyEngine.addToWhitelist(token, "ERC20_MINT", operator);
        
        // Enable whitelist requirement
        policyEngine.enableWhitelistRequirement(token, "ERC20_MINT");
        
        vm.stopPrank();
        
        // Test with whitelisted operator
        (bool approvedWhitelisted, string memory reasonWhitelisted) = 
            policyEngine.validateOperation(token, operator, "ERC20_MINT", 1000);
        
        assertTrue(approvedWhitelisted, "Whitelisted operator should be approved");
        assertEq(bytes(reasonWhitelisted).length, 0, "Should have no rejection reason");
        
        // Test with non-whitelisted operator
        (bool approvedNonWhitelisted, string memory reasonNonWhitelisted) = 
            policyEngine.validateOperation(token, nonWhitelisted, "ERC20_MINT", 1000);
        
        assertFalse(approvedNonWhitelisted, "Non-whitelisted operator should be rejected");
        assertEq(reasonNonWhitelisted, "Operator address not whitelisted", "Should have operator whitelist rejection");
    }
    
    function testWhitelistDoesNotAffectInactivePolicies() public {
        vm.startPrank(admin);
        
        // Add address to whitelist
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        
        // Enable whitelist requirement
        policyEngine.enableWhitelistRequirement(token, "ERC20_TRANSFER");
        
        // Deactivate policy
        policyEngine.updatePolicy(token, "ERC20_TRANSFER", false, 0, 0);
        
        vm.stopPrank();
        
        // Test non-whitelisted address with inactive policy
        (bool approved, string memory reason) = 
            policyEngine.validateOperationWithTarget(token, operator, nonWhitelisted, "ERC20_TRANSFER", 1000);
        
        assertTrue(approved, "Inactive policy should not enforce whitelist");
        assertEq(bytes(reason).length, 0, "Should have no rejection reason");
    }
    
    // ============ Gas Benchmarking Tests ============
    
    function testGasAddSingleAddress() public {
        vm.startPrank(admin);
        
        uint256 gasBefore = gasleft();
        policyEngine.addToWhitelist(token, "ERC20_TRANSFER", target1);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used to add single address:", gasUsed);
        
        vm.stopPrank();
    }
    
    function testGasAddBatch10() public {
        vm.startPrank(admin);
        
        address[] memory addresses = new address[](10);
        for (uint i = 0; i < 10; i++) {
            addresses[i] = address(uint160(2000 + i));
        }
        
        uint256 gasBefore = gasleft();
        policyEngine.addToWhitelistBatch(token, "ERC20_TRANSFER", addresses);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used to add 10 addresses:", gasUsed);
        console.log("Gas per address:", gasUsed / 10);
        
        vm.stopPrank();
    }
    
    function testGasAddBatch100() public {
        vm.startPrank(admin);
        
        address[] memory addresses = new address[](100);
        for (uint i = 0; i < 100; i++) {
            addresses[i] = address(uint160(3000 + i));
        }
        
        uint256 gasBefore = gasleft();
        policyEngine.addToWhitelistBatch(token, "ERC20_TRANSFER", addresses);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used to add 100 addresses:", gasUsed);
        console.log("Gas per address:", gasUsed / 100);
        
        vm.stopPrank();
    }
    
    function testGasWhitelistValidation() public {
        vm.startPrank(admin);
        
        // Add 50 addresses to whitelist
        address[] memory addresses = new address[](50);
        for (uint i = 0; i < 50; i++) {
            addresses[i] = address(uint160(4000 + i));
        }
        policyEngine.addToWhitelistBatch(token, "ERC20_TRANSFER", addresses);
        
        // Enable whitelist
        policyEngine.enableWhitelistRequirement(token, "ERC20_TRANSFER");
        
        vm.stopPrank();
        
        // Test validation gas cost
        uint256 gasBefore = gasleft();
        policyEngine.validateOperationWithTarget(token, operator, addresses[25], "ERC20_TRANSFER", 1000);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for whitelist validation (50 addresses):", gasUsed);
    }
}

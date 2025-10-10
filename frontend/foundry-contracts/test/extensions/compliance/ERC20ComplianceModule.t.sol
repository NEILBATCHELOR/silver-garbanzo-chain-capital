// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/compliance/ERC20ComplianceModule.sol";

contract ERC20ComplianceModuleTest is Test {
    using Clones for address;
    
    ERC20ComplianceModule public implementation;
    ERC20ComplianceModule public module;
    
    address public admin = address(1);
    address public complianceOfficer = address(2);
    address public investor1 = address(3);
    address public investor2 = address(4);
    
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant JURISDICTION_US = keccak256("US");
    bytes32 public constant JURISDICTION_EU = keccak256("EU");
    
    event InvestorWhitelisted(address indexed investor, bytes32 jurisdiction);
    event InvestorBlacklisted(address indexed investor);
    event JurisdictionLimitSet(bytes32 indexed jurisdiction, uint256 limit);
    event KYCStatusUpdated(address indexed investor, bool verified);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC20ComplianceModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC20ComplianceModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, true, true);
        
        // Grant compliance officer role
        vm.prank(admin);
        module.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer);
    }
    
    // ============ Whitelist Tests ============
    
    function testAddToWhitelist() public {
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit InvestorWhitelisted(investor1, JURISDICTION_US);
        module.addToWhitelist(investor1, JURISDICTION_US);
        
        assertTrue(module.isWhitelisted(investor1), "Investor should be whitelisted");
        assertEq(module.getJurisdiction(investor1), JURISDICTION_US, "Jurisdiction should match");
    }
    
    function testRemoveFromWhitelist() public {
        // Add then remove
        vm.prank(complianceOfficer);
        module.addToWhitelist(investor1, JURISDICTION_US);
        
        vm.prank(complianceOfficer);
        module.removeFromWhitelist(investor1);
        
        assertFalse(module.isWhitelisted(investor1), "Investor should be removed from whitelist");
    }
    
    function testOnlyComplianceOfficerCanWhitelist() public {
        vm.prank(investor1);
        vm.expectRevert();
        module.addToWhitelist(investor2, JURISDICTION_US);
    }
    
    // ============ Blacklist Tests ============
    
    function testAddToBlacklist() public {
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, false);
        emit InvestorBlacklisted(investor1);
        module.addToBlacklist(investor1);
        
        assertTrue(module.isBlacklisted(investor1), "Investor should be blacklisted");
    }
    
    function testRemoveFromBlacklist() public {
        // Add then remove
        vm.prank(complianceOfficer);
        module.addToBlacklist(investor1);
        
        vm.prank(complianceOfficer);
        module.removeFromBlacklist(investor1);
        
        assertFalse(module.isBlacklisted(investor1), "Investor should be removed from blacklist");
    }
    
    function testBlacklistRemovesWhitelist() public {
        // Add to whitelist first
        vm.prank(complianceOfficer);
        module.addToWhitelist(investor1, JURISDICTION_US);
        
        // Then blacklist
        vm.prank(complianceOfficer);
        module.addToBlacklist(investor1);
        
        assertTrue(module.isBlacklisted(investor1), "Should be blacklisted");
        assertFalse(module.isWhitelisted(investor1), "Should not be whitelisted");
    }
    
    // ============ KYC Tests ============
    
    function testSetKYCStatus() public {
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit KYCStatusUpdated(investor1, true);
        module.setKYCStatus(investor1, true);
        
        assertTrue(module.hasVerifiedKYC(investor1), "KYC should be verified");
    }
    
    function testRevokeKYCStatus() public {
        // Set then revoke
        vm.prank(complianceOfficer);
        module.setKYCStatus(investor1, true);
        
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit KYCStatusUpdated(investor1, false);
        module.setKYCStatus(investor1, false);
        
        assertFalse(module.hasVerifiedKYC(investor1), "KYC should be revoked");
    }
    
    function testKYCRequired() public view {
        assertTrue(module.isKYCRequired(), "KYC should be required");
    }
    
    // ============ Jurisdiction Tests ============
    
    function testSetJurisdictionLimit() public {
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit JurisdictionLimitSet(JURISDICTION_US, 1000000);
        module.setJurisdictionLimit(JURISDICTION_US, 1000000);
    }
    
    function testUpdateJurisdictionHoldings() public {
        // Setup investors with jurisdictions
        vm.prank(complianceOfficer);
        module.addToWhitelist(investor1, JURISDICTION_US);
        
        vm.prank(complianceOfficer);
        module.addToWhitelist(investor2, JURISDICTION_EU);
        
        // Update holdings
        module.updateJurisdictionHoldings(investor1, investor2, 100);
        
        assertEq(module.getJurisdictionHoldings(JURISDICTION_EU), 100, "EU holdings should increase");
    }
    
    // ============ Transfer Validation Tests ============
    
    function testCanTransferWithCompliance() public {
        // Setup compliant investors
        vm.startPrank(complianceOfficer);
        module.addToWhitelist(investor1, JURISDICTION_US);
        module.addToWhitelist(investor2, JURISDICTION_US);
        module.setKYCStatus(investor1, true);
        module.setKYCStatus(investor2, true);
        vm.stopPrank();
        
        (bool allowed, string memory reason) = module.canTransfer(investor1, investor2, 100);
        assertTrue(allowed, "Transfer should be allowed");
        assertEq(reason, "", "No reason should be provided");
    }
    
    function testCannotTransferBlacklisted() public {
        // Setup
        vm.startPrank(complianceOfficer);
        module.addToWhitelist(investor1, JURISDICTION_US);
        module.addToWhitelist(investor2, JURISDICTION_US);
        module.setKYCStatus(investor1, true);
        module.setKYCStatus(investor2, true);
        module.addToBlacklist(investor1);
        vm.stopPrank();
        
        (bool allowed, string memory reason) = module.canTransfer(investor1, investor2, 100);
        assertFalse(allowed, "Transfer should not be allowed");
        assertEq(reason, "Sender is blacklisted", "Correct reason should be provided");
    }
    
    function testCannotTransferWithoutWhitelist() public {
        // Setup investor1 with KYC but no whitelist
        vm.prank(complianceOfficer);
        module.setKYCStatus(investor1, true);
        
        (bool allowed, string memory reason) = module.canTransfer(investor1, investor2, 100);
        assertFalse(allowed, "Transfer should not be allowed");
        assertEq(reason, "Sender not whitelisted", "Correct reason should be provided");
    }
    
    function testCannotTransferWithoutKYC() public {
        // Setup investor with whitelist but no KYC
        vm.prank(complianceOfficer);
        module.addToWhitelist(investor1, JURISDICTION_US);
        
        (bool allowed, string memory reason) = module.canTransfer(investor1, investor2, 100);
        assertFalse(allowed, "Transfer should not be allowed");
        assertEq(reason, "Sender KYC not verified", "Correct reason should be provided");
    }
    
    function testCannotExceedJurisdictionLimit() public {
        // Setup
        vm.startPrank(complianceOfficer);
        module.addToWhitelist(investor1, JURISDICTION_US);
        module.addToWhitelist(investor2, JURISDICTION_US);
        module.setKYCStatus(investor1, true);
        module.setKYCStatus(investor2, true);
        module.setJurisdictionLimit(JURISDICTION_US, 100);
        vm.stopPrank();
        
        (bool allowed, string memory reason) = module.canTransfer(investor1, investor2, 150);
        assertFalse(allowed, "Transfer should not be allowed");
        assertEq(reason, "Jurisdiction limit exceeded", "Correct reason should be provided");
    }
    
    function testEnforceTransferReverts() public {
        // Setup non-compliant transfer
        vm.prank(complianceOfficer);
        module.addToBlacklist(investor1);
        
        vm.expectRevert();
        module.enforceTransfer(investor1, investor2, 100);
    }
    
    // ============ Admin Tests ============
    
    function testSetKYCRequired() public {
        vm.prank(admin);
        module.setKYCRequired(false);
        assertFalse(module.isKYCRequired(), "KYC should not be required");
        
        vm.prank(admin);
        module.setKYCRequired(true);
        assertTrue(module.isKYCRequired(), "KYC should be required");
    }
    
    function testSetWhitelistRequired() public {
        vm.prank(admin);
        module.setWhitelistRequired(false);
        
        // Now investor can transfer without whitelist (but still needs KYC)
        vm.prank(complianceOfficer);
        module.setKYCStatus(investor1, true);
        
        (bool allowed, ) = module.canTransfer(investor1, investor2, 100);
        // Should still fail because recipient doesn't have KYC
        assertFalse(allowed, "Should fail due to recipient KYC");
    }
    
    function testOnlyAdminCanSetRequirements() public {
        vm.prank(investor1);
        vm.expectRevert();
        module.setKYCRequired(false);
        
        vm.prank(investor1);
        vm.expectRevert();
        module.setWhitelistRequired(false);
    }
    
    // ============ Mint/Burn Bypass Tests ============
    
    function testMintingBypassesChecks() public {
        // Minting (from=address(0)) should bypass all checks
        (bool allowed, string memory reason) = module.canTransfer(address(0), investor1, 100);
        assertTrue(allowed, "Minting should be allowed");
        assertEq(reason, "", "No reason should be provided");
    }
    
    function testBurningBypassesChecks() public {
        // Burning (to=address(0)) should bypass all checks
        (bool allowed, string memory reason) = module.canTransfer(investor1, address(0), 100);
        assertTrue(allowed, "Burning should be allowed");
        assertEq(reason, "", "No reason should be provided");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/extensions/compliance/ERC20ComplianceModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC20ComplianceModuleTest is Test {
    ERC20ComplianceModule public compliance;
    
    address admin = address(1);
    address complianceOfficer = address(2);
    address investor1 = address(3);
    address investor2 = address(4);
    address investor3 = address(5);
    
    function setUp() public {
        // Start acting as admin for all deployments
        vm.startPrank(admin);
        
        // Deploy implementation
        ERC20ComplianceModule implementation = new ERC20ComplianceModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC20ComplianceModule.initialize.selector,
            admin,
            true,  // KYC required
            true   // Whitelist required
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        compliance = ERC20ComplianceModule(address(proxy));
        
        // Grant compliance officer role
        compliance.grantRole(compliance.COMPLIANCE_OFFICER_ROLE(), complianceOfficer);
        
        vm.stopPrank();
    }
    
    function testWhitelist() public {
        vm.startPrank(complianceOfficer);
        compliance.addToWhitelist(investor1, compliance.JURISDICTION_US());
        vm.stopPrank();
        
        assertTrue(compliance.isWhitelisted(investor1));
        assertEq(compliance.getJurisdiction(investor1), compliance.JURISDICTION_US());
    }
    
    function testRemoveFromWhitelist() public {
        vm.startPrank(complianceOfficer);
        compliance.addToWhitelist(investor1, compliance.JURISDICTION_US());
        compliance.removeFromWhitelist(investor1);
        vm.stopPrank();
        
        assertFalse(compliance.isWhitelisted(investor1));
    }
    
    function testBlacklist() public {
        vm.prank(complianceOfficer);
        compliance.addToBlacklist(investor1);
        
        assertTrue(compliance.isBlacklisted(investor1));
        
        bool allowed;
        string memory reason;
        (allowed, reason) = compliance.canTransfer(investor1, investor2, 100);
        assertFalse(allowed);
        assertEq(reason, "Sender is blacklisted");
    }
    
    function testBlacklistRecipient() public {
        vm.prank(complianceOfficer);
        compliance.addToBlacklist(investor2);
        
        bool allowed;
        string memory reason;
        (allowed, reason) = compliance.canTransfer(investor1, investor2, 100);
        assertFalse(allowed);
        assertEq(reason, "Recipient is blacklisted");
    }
    
    function testKYCCheck() public {
        vm.startPrank(complianceOfficer);
        compliance.addToWhitelist(investor1, compliance.JURISDICTION_US());
        compliance.addToWhitelist(investor2, compliance.JURISDICTION_US());
        vm.stopPrank();
        
        // KYC not verified, transfer should fail
        (bool allowed,) = compliance.canTransfer(investor1, investor2, 100);
        assertFalse(allowed);
        
        // Verify KYC for both
        vm.startPrank(complianceOfficer);
        compliance.setKYCStatus(investor1, true);
        compliance.setKYCStatus(investor2, true);
        vm.stopPrank();
        
        // Now transfer should be allowed
        (allowed,) = compliance.canTransfer(investor1, investor2, 100);
        assertTrue(allowed);
    }
    
    function testWhitelistRequired() public {
        vm.startPrank(complianceOfficer);
        compliance.setKYCStatus(investor1, true);
        compliance.setKYCStatus(investor2, true);
        vm.stopPrank();
        
        // Not whitelisted, transfer should fail
        bool allowed;
        string memory reason;
        (allowed, reason) = compliance.canTransfer(investor1, investor2, 100);
        assertFalse(allowed);
        assertEq(reason, "Sender not whitelisted");
    }
    
    function testJurisdictionLimits() public {
        bool allowed;
        string memory reason;
        
        vm.startPrank(complianceOfficer);
        // Whitelist and KYC verify
        compliance.addToWhitelist(investor1, compliance.JURISDICTION_US());
        compliance.addToWhitelist(investor2, compliance.JURISDICTION_US());
        compliance.setKYCStatus(investor1, true);
        compliance.setKYCStatus(investor2, true);
        
        // Set jurisdiction limit
        compliance.setJurisdictionLimit(compliance.JURISDICTION_US(), 1000);
        vm.stopPrank();
        
        // Transfer within limit should succeed
        (allowed,) = compliance.canTransfer(investor1, investor2, 500);
        assertTrue(allowed);
        
        // Update holdings
        compliance.updateJurisdictionHoldings(address(0), investor2, 900);
        
        // Transfer that would exceed limit should fail
        (allowed, reason) = compliance.canTransfer(investor1, investor2, 200);
        assertFalse(allowed);
        assertEq(reason, "Jurisdiction limit exceeded");
    }
    
    function testMintingBurningBypass() public {
        // Minting and burning should bypass checks
        (bool allowed,) = compliance.canTransfer(address(0), investor1, 100);
        assertTrue(allowed);
        
        (allowed,) = compliance.canTransfer(investor1, address(0), 100);
        assertTrue(allowed);
    }
    
    function testEnforceTransfer() public {
        vm.prank(complianceOfficer);
        compliance.addToBlacklist(investor1);
        
        vm.expectRevert(abi.encodeWithSelector(
            IERC20ComplianceModule.TransferNotAllowed.selector,
            "Sender is blacklisted"
        ));
        compliance.enforceTransfer(investor1, investor2, 100);
    }
    
    function testAccessControl() public {
        // Non-compliance officer should not be able to whitelist
        bytes32 jurisdictionUS = compliance.JURISDICTION_US();
        
        vm.startPrank(investor1);
        vm.expectRevert();
        compliance.addToWhitelist(investor2, jurisdictionUS);
        vm.stopPrank();
    }
}

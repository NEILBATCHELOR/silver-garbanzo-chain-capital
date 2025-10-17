// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/deployers/ExtensionModuleFactory.sol";
import "../../src/extensions/compliance/ERC20ComplianceModule.sol";
import "../../src/extensions/vesting/ERC20VestingModule.sol";
import "../../src/extensions/royalty/ERC721RoyaltyModule.sol";
import "../../src/extensions/fees/ERC20FeeModule.sol";

contract ExtensionModuleFactoryTest is Test {
    ExtensionModuleFactory public factory;
    
    ERC20ComplianceModule public complianceMaster;
    ERC20VestingModule public vestingMaster;
    ERC721RoyaltyModule public royaltyMaster;
    ERC20FeeModule public feeMaster;
    
    address public owner = address(1);
    address public user1 = address(2);
    address public tokenAddress = address(100);
    address public collectionAddress = address(101);
    address public feeRecipient = address(200);
    
    event ComplianceModuleDeployed(
        address indexed module,
        address indexed token,
        address indexed deployer
    );
    
    event AllModulesUpgraded(string moduleType, address newImplementation);
    
    function setUp() public {
        // Deploy master implementations
        complianceMaster = new ERC20ComplianceModule();
        vestingMaster = new ERC20VestingModule();
        royaltyMaster = new ERC721RoyaltyModule();
        feeMaster = new ERC20FeeModule();
        
        // Deploy factory
        factory = new ExtensionModuleFactory(
            address(complianceMaster),
            address(vestingMaster),
            address(feeMaster),
            address(royaltyMaster),
            owner
        );
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertTrue(factory.complianceBeacon() != address(0));
        assertTrue(factory.vestingBeacon() != address(0));
        assertTrue(factory.feeBeacon() != address(0));
        assertTrue(factory.royaltyBeacon() != address(0));
    }
    
    function testOwnerSet() public view {
        assertEq(factory.owner(), owner);
    }
    
    // ============ Compliance Module Tests ============
    
    function testDeployComplianceModule() public {
        vm.expectEmit(false, true, true, true);
        emit ComplianceModuleDeployed(address(0), tokenAddress, address(this));
        
        address module = factory.deployComplianceModule(tokenAddress, true, true);
        
        assertTrue(module != address(0));
        
        // Verify it's tracked
        address[] memory modules = factory.getModulesByToken(tokenAddress);
        assertEq(modules.length, 1);
        assertEq(modules[0], module);
    }
    
    function testComplianceModuleInitialized() public {
        address module = factory.deployComplianceModule(tokenAddress, true, false);
        
        ERC20ComplianceModule compliance = ERC20ComplianceModule(module);
        assertTrue(compliance.isKYCRequired());
        assertFalse(compliance.isWhitelistRequired());
    }
    
    function testCannotDeployComplianceWithZeroAddress() public {
        vm.expectRevert("Invalid token");
        factory.deployComplianceModule(address(0), true, true);
    }
    
    // ============ Vesting Module Tests ============
    
    function testDeployVestingModule() public {
        address module = factory.deployVestingModule(tokenAddress);
        
        assertTrue(module != address(0));
        
        address[] memory modules = factory.getModulesByToken(tokenAddress);
        assertEq(modules.length, 1);
    }
    
    function testVestingModuleInitialized() public {
        address module = factory.deployVestingModule(tokenAddress);
        
        ERC20VestingModule vesting = ERC20VestingModule(module);
        assertEq(address(vesting.token()), tokenAddress);
    }
    
    // ============ Fee Module Tests ============
    
    function testDeployFeeModule() public {
        uint256 feeBps = 100; // 1%
        
        address module = factory.deployFeeModule(tokenAddress, feeBps, feeRecipient);
        
        assertTrue(module != address(0));
    }
    
    function testCannotDeployFeeModuleWithHighFee() public {
        vm.expectRevert("Fee too high");
        factory.deployFeeModule(tokenAddress, 10001, feeRecipient);
    }
    
    function testCannotDeployFeeModuleWithZeroRecipient() public {
        vm.expectRevert("Invalid recipient");
        factory.deployFeeModule(tokenAddress, 100, address(0));
    }
    
    // ============ Royalty Module Tests ============
    
    function testDeployRoyaltyModule() public {
        address receiver = address(0x123);
        uint96 feeNumerator = 500; // 5%
        
        address module = factory.deployRoyaltyModule(collectionAddress, receiver, feeNumerator);
        
        assertTrue(module != address(0));
    }
    
    function testCannotDeployRoyaltyWithHighFee() public {
        vm.expectRevert("Fee too high");
        factory.deployRoyaltyModule(collectionAddress, feeRecipient, 10001);
    }
    
    // ============ Multiple Module Deployment Tests ============
    
    function testDeployMultipleModulesForSameToken() public {
        address compliance = factory.deployComplianceModule(tokenAddress, true, true);
        address vesting = factory.deployVestingModule(tokenAddress);
        address fee = factory.deployFeeModule(tokenAddress, 100, feeRecipient);
        
        address[] memory modules = factory.getModulesByToken(tokenAddress);
        assertEq(modules.length, 3);
        assertEq(modules[0], compliance);
        assertEq(modules[1], vesting);
        assertEq(modules[2], fee);
    }
    
    function testGetAllModules() public {
        factory.deployComplianceModule(tokenAddress, true, true);
        factory.deployVestingModule(tokenAddress);
        
        address[] memory allModules = factory.getAllModules();
        assertEq(allModules.length, 2);
    }
    
    // ============ Module Registry Tests ============
    
    function testModuleInfoTracked() public {
        address module = factory.deployComplianceModule(tokenAddress, true, true);
        
        (
            address moduleAddr,
            address token,
            string memory moduleType,
            uint256 deployedAt,
            bool isActive
        ) = factory.moduleRegistry(module);
        
        assertEq(moduleAddr, module);
        assertEq(token, tokenAddress);
        assertEq(moduleType, "compliance");
        assertTrue(deployedAt > 0);
        assertTrue(isActive);
    }
    
    function testGetModuleInfo() public {
        address module = factory.deployVestingModule(tokenAddress);
        
        ExtensionModuleFactory.ModuleInfo memory info = factory.getModuleInfo(module);
        
        assertEq(info.moduleAddress, module);
        assertEq(info.tokenAddress, tokenAddress);
        assertEq(info.moduleType, "vesting");
    }
    
    // ============ Beacon Upgrade Tests ============
    
    function testUpgradeAllComplianceModules() public {
        // Deploy some compliance modules
        factory.deployComplianceModule(tokenAddress, true, true);
        factory.deployComplianceModule(address(102), false, true);
        
        // Deploy new implementation
        ERC20ComplianceModule newImpl = new ERC20ComplianceModule();
        
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit AllModulesUpgraded("compliance", address(newImpl));
        
        factory.upgradeAllComplianceModules(address(newImpl));
        
        // Verify beacon points to new implementation
        address beaconImpl = factory.getBeaconImplementation(factory.complianceBeacon());
        assertEq(beaconImpl, address(newImpl));
    }
    
    function testUpgradeAllVestingModules() public {
        factory.deployVestingModule(tokenAddress);
        
        ERC20VestingModule newImpl = new ERC20VestingModule();
        
        vm.prank(owner);
        factory.upgradeAllVestingModules(address(newImpl));
        
        address beaconImpl = factory.getBeaconImplementation(factory.vestingBeacon());
        assertEq(beaconImpl, address(newImpl));
    }
    
    function testUpgradeAllFeeModules() public {
        factory.deployFeeModule(tokenAddress, 100, feeRecipient);
        
        ERC20FeeModule newImpl = new ERC20FeeModule();
        
        vm.prank(owner);
        factory.upgradeAllFeeModules(address(newImpl));
        
        address beaconImpl = factory.getBeaconImplementation(factory.feeBeacon());
        assertEq(beaconImpl, address(newImpl));
    }
    
    function testUpgradeAllRoyaltyModules() public {
        factory.deployRoyaltyModule(collectionAddress, feeRecipient, 500);
        
        ERC721RoyaltyModule newImpl = new ERC721RoyaltyModule();
        
        vm.prank(owner);
        factory.upgradeAllRoyaltyModules(address(newImpl));
        
        address beaconImpl = factory.getBeaconImplementation(factory.royaltyBeacon());
        assertEq(beaconImpl, address(newImpl));
    }
    
    function testOnlyOwnerCanUpgrade() public {
        ERC20ComplianceModule newImpl = new ERC20ComplianceModule();
        
        vm.prank(user1);
        vm.expectRevert();
        factory.upgradeAllComplianceModules(address(newImpl));
    }
    
    function testCannotUpgradeToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid implementation");
        factory.upgradeAllComplianceModules(address(0));
    }
    
    function testCannotUpgradeToNonContract() public {
        vm.prank(owner);
        vm.expectRevert("Not a contract");
        factory.upgradeAllComplianceModules(address(999));
    }
    
    // ============ Edge Cases ============
    
    function testDeployModuleWithSameTokenMultipleTimes() public {
        address module1 = factory.deployComplianceModule(tokenAddress, true, true);
        address module2 = factory.deployComplianceModule(tokenAddress, false, false);
        
        // Should create different module instances
        assertTrue(module1 != module2);
        
        address[] memory modules = factory.getModulesByToken(tokenAddress);
        assertEq(modules.length, 2);
    }
    
    function testGetModulesByTokenEmptyArray() public view {
        address[] memory modules = factory.getModulesByToken(address(999));
        assertEq(modules.length, 0);
    }
    
    function testModuleDeploymentGasCost() public {
        uint256 gasBefore = gasleft();
        factory.deployComplianceModule(tokenAddress, true, true);
        uint256 gasUsed = gasBefore - gasleft();
        
        // Beacon proxy deployment should be much cheaper than full deployment
        // Should be less than 500k gas
        assertTrue(gasUsed < 500_000);
    }
    
    // ============ Batch Operations ============
    
    function testBatchUpgradeEfficiency() public {
        // Deploy 10 compliance modules
        for (uint i = 0; i < 10; i++) {
            factory.deployComplianceModule(address(uint160(100 + i)), true, true);
        }
        
        ERC20ComplianceModule newImpl = new ERC20ComplianceModule();
        
        // Single upgrade call upgrades all 10 modules
        uint256 gasBefore = gasleft();
        vm.prank(owner);
        factory.upgradeAllComplianceModules(address(newImpl));
        uint256 gasUsed = gasBefore - gasleft();
        
        // Beacon upgrade should be very cheap (O(1) operation)
        // Much cheaper than upgrading 10 contracts individually
        assertTrue(gasUsed < 200_000);
    }
}

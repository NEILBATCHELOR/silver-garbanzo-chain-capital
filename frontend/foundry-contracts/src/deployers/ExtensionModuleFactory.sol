// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../deployers/beacon/TokenBeacon.sol";

// Extension Module Master Implementations
import "../extensions/compliance/ERC20ComplianceModule.sol";
import "../extensions/vesting/ERC20VestingModule.sol";
import "../extensions/royalty/ERC721RoyaltyModule.sol";
import "../extensions/fees/ERC20FeeModule.sol";

/**
 * @title ExtensionModuleFactory
 * @notice Beacon-based factory for extension modules
 * @dev Enables centralized upgrades of compliance, vesting, fees, etc.
 * 
 * Why Beacon for Extension Modules:
 * - Deploy 100+ compliance modules → upgrade all in 1 transaction
 * - Regulatory changes → instant compliance across all tokens
 * - Bug fixes → patch all modules simultaneously
 * 
 * Architecture:
 *   ExtensionModuleFactory
 *   ├── complianceBeacon → ComplianceModule (master)
 *   │   └── 100+ BeaconProxy instances
 *   ├── vestingBeacon → VestingModule (master)
 *   │   └── 50+ BeaconProxy instances
 *   ├── feeBeacon → FeeModule (master)
 *   │   └── 30+ BeaconProxy instances
 *   └── royaltyBeacon → RoyaltyModule (master)
 *       └── 20+ BeaconProxy instances
 */
contract ExtensionModuleFactory is Ownable {
    
    // ============ Beacon Addresses ============
    address public immutable complianceBeacon;
    address public immutable vestingBeacon;
    address public immutable feeBeacon;
    address public immutable royaltyBeacon;
    
    // ============ Tracking ============
    mapping(address => address[]) public modulesByToken; // token → modules[]
    address[] public allDeployedModules;
    
    mapping(address => ModuleInfo) public moduleRegistry;
    
    struct ModuleInfo {
        address moduleAddress;
        address tokenAddress;
        string moduleType; // "compliance", "vesting", "fee", "royalty"
        uint256 deployedAt;
        bool isActive;
    }
    
    // ============ Events ============
    event ComplianceModuleDeployed(
        address indexed module,
        address indexed token,
        address indexed deployer
    );
    
    event VestingModuleDeployed(
        address indexed module,
        address indexed token,
        address indexed deployer
    );
    
    event FeeModuleDeployed(
        address indexed module,
        address indexed token,
        address indexed deployer
    );
    
    event RoyaltyModuleDeployed(
        address indexed module,
        address indexed collection,
        address indexed deployer
    );
    
    event AllModulesUpgraded(string moduleType, address newImplementation);
    
    /**
     * @notice Deploy factory with beacon infrastructure
     * @param complianceMaster Master implementation for compliance
     * @param vestingMaster Master implementation for vesting
     * @param feeMaster Master implementation for fees
     * @param royaltyMaster Master implementation for royalty
     * @param owner_ Factory owner
     */
    constructor(
        address complianceMaster,
        address vestingMaster,
        address feeMaster,
        address royaltyMaster,
        address owner_
    ) Ownable(owner_) {
        require(complianceMaster != address(0), "Invalid compliance master");
        require(vestingMaster != address(0), "Invalid vesting master");
        require(feeMaster != address(0), "Invalid fee master");
        require(royaltyMaster != address(0), "Invalid royalty master");
        
        // Deploy beacons
        complianceBeacon = address(new TokenBeacon(complianceMaster, owner_));
        vestingBeacon = address(new TokenBeacon(vestingMaster, owner_));
        feeBeacon = address(new TokenBeacon(feeMaster, owner_));
        royaltyBeacon = address(new TokenBeacon(royaltyMaster, owner_));
    }
    
    // ============ Deployment Functions ============
    
    /**
     * @notice Deploy compliance module for a token
     * @param tokenAddress Token to attach compliance to
     * @param kycRequired Whether KYC verification is required
     * @param whitelistRequired Whether whitelist is required
     * @return Address of deployed compliance module
     */
    function deployComplianceModule(
        address tokenAddress,
        bool kycRequired,
        bool whitelistRequired
    ) external returns (address) {
        require(tokenAddress != address(0), "Invalid token");
        
        BeaconProxy proxy = new BeaconProxy(
            complianceBeacon,
            abi.encodeCall(
                ERC20ComplianceModule.initialize,
                (msg.sender, kycRequired, whitelistRequired)
            )
        );
        
        address moduleAddress = address(proxy);
        
        _registerModule(moduleAddress, tokenAddress, "compliance");
        
        emit ComplianceModuleDeployed(moduleAddress, tokenAddress, msg.sender);
        return moduleAddress;
    }
    
    /**
     * @notice Deploy vesting module for a token
     */
    function deployVestingModule(
        address tokenAddress
    ) external returns (address) {
        require(tokenAddress != address(0), "Invalid token");
        
        BeaconProxy proxy = new BeaconProxy(
            vestingBeacon,
            abi.encodeCall(
                ERC20VestingModule.initialize,
                (tokenAddress, msg.sender)
            )
        );
        
        address moduleAddress = address(proxy);
        
        _registerModule(moduleAddress, tokenAddress, "vesting");
        
        emit VestingModuleDeployed(moduleAddress, tokenAddress, msg.sender);
        return moduleAddress;
    }
    
    /**
     * @notice Deploy fee module for a token
     */
    function deployFeeModule(
        address tokenAddress,
        uint256 transferFeeBps,
        address feeRecipient
    ) external returns (address) {
        require(tokenAddress != address(0), "Invalid token");
        require(feeRecipient != address(0), "Invalid recipient");
        require(transferFeeBps <= 10000, "Fee too high");
        
        BeaconProxy proxy = new BeaconProxy(
            feeBeacon,
            abi.encodeCall(
                ERC20FeeModule.initialize,
                (msg.sender, tokenAddress, feeRecipient, transferFeeBps)
            )
        );
        
        address moduleAddress = address(proxy);
        
        _registerModule(moduleAddress, tokenAddress, "fee");
        
        emit FeeModuleDeployed(moduleAddress, tokenAddress, msg.sender);
        return moduleAddress;
    }
    
    /**
     * @notice Deploy royalty module for NFT collection
     */
    function deployRoyaltyModule(
        address collectionAddress,
        address defaultReceiver,
        uint96 defaultFeeNumerator
    ) external returns (address) {
        require(collectionAddress != address(0), "Invalid collection");
        require(defaultReceiver != address(0), "Invalid receiver");
        require(defaultFeeNumerator <= 10000, "Fee too high");
        
        BeaconProxy proxy = new BeaconProxy(
            royaltyBeacon,
            abi.encodeCall(
                ERC721RoyaltyModule.initialize,
                (msg.sender, defaultReceiver, defaultFeeNumerator)
            )
        );
        
        address moduleAddress = address(proxy);
        
        _registerModule(moduleAddress, collectionAddress, "royalty");
        
        emit RoyaltyModuleDeployed(moduleAddress, collectionAddress, msg.sender);
        return moduleAddress;
    }
    
    // ============ Batch Upgrade Functions ============
    
    /**
     * @notice Upgrade all compliance modules
     * @param newImplementation New compliance module implementation
     */
    function upgradeAllComplianceModules(address newImplementation) 
        external 
        onlyOwner 
    {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation.code.length > 0, "Not a contract");
        
        TokenBeacon(complianceBeacon).upgradeTo(newImplementation);
        emit AllModulesUpgraded("compliance", newImplementation);
    }
    
    /**
     * @notice Upgrade all vesting modules
     */
    function upgradeAllVestingModules(address newImplementation) 
        external 
        onlyOwner 
    {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation.code.length > 0, "Not a contract");
        
        TokenBeacon(vestingBeacon).upgradeTo(newImplementation);
        emit AllModulesUpgraded("vesting", newImplementation);
    }
    
    /**
     * @notice Upgrade all fee modules
     */
    function upgradeAllFeeModules(address newImplementation) 
        external 
        onlyOwner 
    {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation.code.length > 0, "Not a contract");
        
        TokenBeacon(feeBeacon).upgradeTo(newImplementation);
        emit AllModulesUpgraded("fee", newImplementation);
    }
    
    /**
     * @notice Upgrade all royalty modules
     */
    function upgradeAllRoyaltyModules(address newImplementation) 
        external 
        onlyOwner 
    {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation.code.length > 0, "Not a contract");
        
        TokenBeacon(royaltyBeacon).upgradeTo(newImplementation);
        emit AllModulesUpgraded("royalty", newImplementation);
    }
    
    // ============ Internal Functions ============
    
    function _registerModule(
        address moduleAddress,
        address tokenAddress,
        string memory moduleType
    ) internal {
        modulesByToken[tokenAddress].push(moduleAddress);
        allDeployedModules.push(moduleAddress);
        
        moduleRegistry[moduleAddress] = ModuleInfo({
            moduleAddress: moduleAddress,
            tokenAddress: tokenAddress,
            moduleType: moduleType,
            deployedAt: block.timestamp,
            isActive: true
        });
    }
    
    // ============ View Functions ============
    
    function getModulesByToken(address token) 
        external 
        view 
        returns (address[] memory) 
    {
        return modulesByToken[token];
    }
    
    function getAllModules() external view returns (address[] memory) {
        return allDeployedModules;
    }
    
    function getModuleInfo(address module) 
        external 
        view 
        returns (ModuleInfo memory) 
    {
        return moduleRegistry[module];
    }
    
    function getBeaconImplementation(address beacon) 
        external 
        view 
        returns (address) 
    {
        return TokenBeacon(beacon).implementation();
    }
}

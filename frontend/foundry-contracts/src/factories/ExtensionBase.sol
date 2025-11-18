// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./ExtensionRegistry.sol";
import "../deployers/beacon/TokenBeacon.sol";
import "../policy/interfaces/IPolicyEngine.sol";
import "../governance/UpgradeGovernor.sol";

/**
 * @title ExtensionBase
 * @notice Abstract base contract for all extension factories
 * @dev Provides shared infrastructure for extension deployment, tracking, and upgrades
 * 
 * Features:
 * - Beacon-based deployment for upgradeability
 * - Extension registry integration
 * - Policy engine validation
 * - Upgrade governance integration
 * - Standardized events and errors
 * 
 * Usage:
 * All specific extension factories (ERC20ExtensionFactory, ERC721ExtensionFactory, etc.) 
 * inherit from this base to ensure consistent behavior.
 */
abstract contract ExtensionBase is Ownable {
    // ============ Immutable Infrastructure ============
    
    /// @notice ExtensionRegistry for tracking extensions
    ExtensionRegistry public immutable extensionRegistry;
    
    /// @notice PolicyEngine for validating operations (address(0) = disabled)
    address public immutable policyEngine;
    
    /// @notice UpgradeGovernor for managing beacon upgrades (address(0) = disabled)
    address public immutable upgradeGovernor;
    
    // ============ State Variables ============
    
    /// @notice Tracks deployed extensions from this factory
    mapping(address => bool) internal _isExtension;
    
    /// @notice Array of all deployed extensions
    address[] internal _allExtensions;
    
    /// @notice Extensions deployed by each address
    mapping(address => address[]) internal _extensionsByDeployer;
    
    /// @notice Total extensions deployed
    uint256 public totalDeployed;
    
    // ============ Events ============
    
    event ExtensionDeployed(
        address indexed extension,
        address indexed token,
        ExtensionRegistry.ExtensionType indexed extensionType,
        address deployer,
        address beacon
    );
    
    event ExtensionValidated(
        address indexed extension,
        address indexed token,
        string policyAction,
        bool policyPassed
    );
    
    event BeaconUpgradeProposed(
        address indexed beacon,
        address indexed newImplementation,
        uint256 proposalId
    );
    
    // ============ Errors ============
    
    error InvalidRegistry();
    error InvalidToken();
    error InvalidBeacon();
    error InvalidMasterImplementation();
    error PolicyValidationFailed(string action);
    error RegistrationFailed();
    error IncompatibleExtension();
    error ExtensionAlreadyAttached();
    error UpgradeGovernorRequired();
    
    // ============ Constructor ============
    
    /**
     * @notice Constructor sets immutable infrastructure addresses
     * @param _extensionRegistry ExtensionRegistry address
     * @param _policyEngine PolicyEngine address (address(0) to disable)
     * @param _upgradeGovernor UpgradeGovernor address (address(0) to disable)
     */
    constructor(
        address _extensionRegistry,
        address _policyEngine,
        address _upgradeGovernor
    ) Ownable(msg.sender) {
        if (_extensionRegistry == address(0)) revert InvalidRegistry();
        
        extensionRegistry = ExtensionRegistry(_extensionRegistry);
        policyEngine = _policyEngine;
        upgradeGovernor = _upgradeGovernor;
    }
    
    // ============ Internal Deployment Functions ============
    
    /**
     * @notice Deploy extension module via beacon proxy
     * @param beacon Beacon address
     * @param initData Initialization calldata
     * @return extension Deployed extension address
     */
    function _deployExtension(
        address beacon,
        bytes memory initData
    ) internal returns (address extension) {
        if (beacon == address(0)) revert InvalidBeacon();
        
        // Deploy beacon proxy
        BeaconProxy proxy = new BeaconProxy(beacon, initData);
        extension = address(proxy);
        
        // Track deployment locally
        _isExtension[extension] = true;
        _allExtensions.push(extension);
        _extensionsByDeployer[msg.sender].push(extension);
        totalDeployed++;
        
        return extension;
    }
    
    /**
     * @notice Validate and register a newly deployed extension
     * @param extension Extension proxy address
     * @param token Token address
     * @param extensionType Type of extension
     * @param tokenStandard Token standard
     * @param policyAction Policy action to validate
     */
    function _validateAndRegister(
        address extension,
        address token,
        ExtensionRegistry.ExtensionType extensionType,
        ExtensionRegistry.TokenStandard tokenStandard,
        string memory policyAction
    ) internal {
        // 1. Validate with policy engine (if enabled)
        if (policyEngine != address(0)) {
            bool policyPassed = _validatePolicy(token, msg.sender, policyAction);
            emit ExtensionValidated(extension, token, policyAction, policyPassed);
            
            if (!policyPassed) {
                revert PolicyValidationFailed(policyAction);
            }
        }
        
        // 2. Register with ExtensionRegistry
        try extensionRegistry.registerExtension(
            extension,
            token,
            extensionType,
            tokenStandard,
            msg.sender
        ) {
            // Registration successful
        } catch {
            revert RegistrationFailed();
        }
    }
    
    // ============ Policy Validation ============
    
    /**
     * @notice Validate operation with policy engine
     * @param token Token address
     * @param deployer Deployer address
     * @param action Policy action
     * @return True if policy passes
     */
    function _validatePolicy(
        address token,
        address deployer,
        string memory action
    ) internal view returns (bool) {
        try IPolicyEngine(policyEngine).canOperate(
            token,
            deployer,
            action,
            0 // amount not relevant for extension deployment
        ) returns (bool canOperate, string memory) {
            return canOperate;
        } catch {
            return false;
        }
    }
    
    // ============ Beacon Management ============
    
    /**
     * @notice Create and register a new beacon
     * @param implementation Master implementation address
     * @param extensionType Extension type for this beacon
     * @return beacon Address of created beacon
     */
    function _createBeacon(
        address implementation,
        ExtensionRegistry.ExtensionType extensionType
    ) internal returns (address beacon) {
        if (implementation == address(0)) revert InvalidMasterImplementation();
        if (implementation.code.length == 0) revert InvalidMasterImplementation();
        
        // Create beacon
        beacon = address(new TokenBeacon(implementation, address(this)));
        
        // Register beacon in registry
        extensionRegistry.registerBeacon(extensionType, beacon);
        
        return beacon;
    }
    
    /**
     * @notice Propose beacon upgrade through governance
     * @param beacon Beacon to upgrade
     * @param newImplementation New implementation address
     * @param description Proposal description
     * @return proposalId Proposal ID (0 if no governance)
     */
    function _proposeBeaconUpgrade(
        address beacon,
        address newImplementation,
        string memory description
    ) internal returns (uint256 proposalId) {
        if (upgradeGovernor == address(0)) revert UpgradeGovernorRequired();
        if (beacon == address(0)) revert InvalidBeacon();
        if (newImplementation == address(0)) revert InvalidMasterImplementation();
        
        // Create upgrade proposal
        bytes memory upgradeData = abi.encodeWithSignature(
            "upgradeTo(address)",
            newImplementation
        );
        
        // Note: This is a simplified version - actual implementation would use UpgradeGovernor
        // For now, directly upgrade if owner (can be enhanced later)
        if (msg.sender == owner()) {
            TokenBeacon(beacon).upgradeTo(newImplementation);
            return 0; // No proposal needed for owner
        }
        
        // Otherwise, would create proposal through UpgradeGovernor
        revert UpgradeGovernorRequired();
    }
    
    /**
     * @notice Direct beacon upgrade (owner only, bypasses governance)
     * @param beacon Beacon to upgrade
     * @param newImplementation New implementation address
     * @dev Use with caution - should prefer governance-based upgrades
     */
    function _directBeaconUpgrade(
        address beacon,
        address newImplementation
    ) internal onlyOwner {
        if (beacon == address(0)) revert InvalidBeacon();
        if (newImplementation == address(0)) revert InvalidMasterImplementation();
        if (newImplementation.code.length == 0) revert InvalidMasterImplementation();
        
        TokenBeacon(beacon).upgradeTo(newImplementation);
    }
    
    // ============ Query Functions ============
    
    /**
     * @notice Check if address is an extension from this factory
     * @param extension Extension address
     * @return True if extension was deployed by this factory
     */
    function isExtension(address extension) external view returns (bool) {
        return _isExtension[extension];
    }
    
    /**
     * @notice Get all extensions deployed by this factory
     * @return Array of extension addresses
     */
    function getAllExtensions() external view returns (address[] memory) {
        return _allExtensions;
    }
    
    /**
     * @notice Get extensions deployed by a specific address
     * @param deployer Deployer address
     * @return Array of extension addresses
     */
    function getExtensionsByDeployer(address deployer)
        external
        view
        returns (address[] memory)
    {
        return _extensionsByDeployer[deployer];
    }
    
    /**
     * @notice Get beacon implementation
     * @param beacon Beacon address
     * @return Implementation address
     */
    function getBeaconImplementation(address beacon)
        external
        view
        returns (address)
    {
        if (beacon == address(0)) revert InvalidBeacon();
        return TokenBeacon(beacon).implementation();
    }
    
    // ============ Abstract Functions ============
    
    /**
     * @notice Get the token standard this factory supports
     * @return Token standard enum
     * @dev Must be implemented by derived contracts
     */
    function getTokenStandard()
        external
        view
        virtual
        returns (ExtensionRegistry.TokenStandard);
    
    /**
     * @notice Get supported extension types
     * @return Array of supported extension types
     * @dev Must be implemented by derived contracts
     */
    function getSupportedExtensions()
        external
        view
        virtual
        returns (ExtensionRegistry.ExtensionType[] memory);
}

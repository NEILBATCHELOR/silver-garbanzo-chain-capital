// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ExtensionBase.sol";
import "./ExtensionRegistry.sol";
import "../extensions/royalty/ERC721RoyaltyModule.sol";
import "../extensions/soulbound/ERC721SoulboundModule.sol";
import "../extensions/rental/ERC721RentalModule.sol";
import "../extensions/fractionalization/ERC721FractionModule.sol";
import "../extensions/metadata-events/ERC4906MetadataModule.sol";
import "../extensions/granular-approval/ERC5216GranularApprovalModule.sol";
import "../extensions/consecutive/ERC721ConsecutiveModule.sol";

/**
 * @title ERC721ExtensionFactory
 * @notice Factory for deploying ERC721-specific extension modules
 * @dev Handles 7 NFT extension types with beacon-based upgradeability
 * 
 * Supported Extensions:
 * 1. ROYALTY            - EIP-2981 royalty standard
 * 2. SOULBOUND          - Non-transferable tokens
 * 3. RENTAL             - NFT rental functionality
 * 4. FRACTIONALIZATION  - Fractional NFT ownership
 * 5. METADATA           - EIP-4906 metadata update events
 * 6. GRANULAR_APPROVAL  - EIP-5216 fine-grained approvals
 * 7. CONSECUTIVE        - EIP-2309 consecutive minting
 * 
 * Architecture:
 * - One beacon per extension type (7 beacons total)
 * - Beacons enable upgradeability of extension logic
 * - All deployments go through ExtensionRegistry
 * - Policy validation via PolicyEngine
 * - Upgrade governance via UpgradeGovernor
 */
contract ERC721ExtensionFactory is ExtensionBase {
    
    // ============ Beacons ============
    
    address public royaltyBeacon;
    address public soulboundBeacon;
    address public rentalBeacon;
    address public fractionBeacon;
    address public metadataBeacon;
    address public granularApprovalBeacon;
    address public consecutiveBeacon;
    
    // ============ Events ============
    
    event RoyaltyExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event SoulboundExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event RentalExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event FractionExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event MetadataExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event GranularApprovalExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event ConsecutiveExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize ERC721 extension factory
     * @param _extensionRegistry ExtensionRegistry address
     * @param _policyEngine PolicyEngine address (address(0) to disable)
     * @param _upgradeGovernor UpgradeGovernor address (address(0) to disable)
     */
    constructor(
        address _extensionRegistry,
        address _policyEngine,
        address _upgradeGovernor
    ) ExtensionBase(_extensionRegistry, _policyEngine, _upgradeGovernor) {}
    
    // ============ Beacon Initialization ============
    
    /**
     * @notice Initialize all beacons with master implementations
     * @param royaltyImpl Royalty module implementation
     * @param soulboundImpl Soulbound module implementation
     * @param rentalImpl Rental module implementation
     * @param fractionImpl Fractionalization module implementation
     * @param metadataImpl Metadata module implementation
     * @param granularApprovalImpl GranularApproval module implementation
     * @param consecutiveImpl Consecutive module implementation
     */
    function initializeBeacons(
        address royaltyImpl,
        address soulboundImpl,
        address rentalImpl,
        address fractionImpl,
        address metadataImpl,
        address granularApprovalImpl,
        address consecutiveImpl
    ) external onlyOwner {
        require(royaltyBeacon == address(0), "Already initialized");
        
        royaltyBeacon = _createBeacon(royaltyImpl, ExtensionRegistry.ExtensionType.ROYALTY);
        soulboundBeacon = _createBeacon(soulboundImpl, ExtensionRegistry.ExtensionType.SOULBOUND);
        rentalBeacon = _createBeacon(rentalImpl, ExtensionRegistry.ExtensionType.RENTAL);
        fractionBeacon = _createBeacon(fractionImpl, ExtensionRegistry.ExtensionType.FRACTIONALIZATION);
        metadataBeacon = _createBeacon(metadataImpl, ExtensionRegistry.ExtensionType.METADATA);
        granularApprovalBeacon = _createBeacon(granularApprovalImpl, ExtensionRegistry.ExtensionType.GRANULAR_APPROVAL);
        consecutiveBeacon = _createBeacon(consecutiveImpl, ExtensionRegistry.ExtensionType.CONSECUTIVE);
    }
    
    // ============ Extension Deployment Functions ============
    
    /**
     * @notice Deploy Royalty extension for EIP-2981 royalties
     * @param token Token address to attach extension to
     * @param defaultRoyaltyReceiver Default royalty recipient address
     * @param defaultRoyaltyPercentage Default royalty percentage in basis points (e.g., 500 = 5%)
     * @return extension Deployed extension address
     */
    function deployRoyalty(
        address token,
        address defaultRoyaltyReceiver,
        uint96 defaultRoyaltyPercentage
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(royaltyBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC721RoyaltyModule.initialize.selector,
            msg.sender,  // admin
            token,
            defaultRoyaltyReceiver,
            defaultRoyaltyPercentage
        );
        
        // Deploy via beacon
        extension = _deployExtension(royaltyBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.ROYALTY,
            ExtensionRegistry.TokenStandard.ERC721,
            "DEPLOY_EXTENSION"
        );
        
        emit RoyaltyExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.ROYALTY, msg.sender, royaltyBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Soulbound extension for non-transferable tokens
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deploySoulbound(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(soulboundBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC721SoulboundModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(soulboundBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.SOULBOUND,
            ExtensionRegistry.TokenStandard.ERC721,
            "DEPLOY_EXTENSION"
        );
        
        emit SoulboundExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.SOULBOUND, msg.sender, soulboundBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Rental extension for NFT rentals
     * @param token Token address to attach extension to
     * @param maxRentalDuration Maximum rental duration in seconds
     * @return extension Deployed extension address
     */
    function deployRental(
        address token,
        uint256 maxRentalDuration
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(rentalBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC721RentalModule.initialize.selector,
            msg.sender,  // admin
            token,
            maxRentalDuration
        );
        
        // Deploy via beacon
        extension = _deployExtension(rentalBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.RENTAL,
            ExtensionRegistry.TokenStandard.ERC721,
            "DEPLOY_EXTENSION"
        );
        
        emit RentalExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.RENTAL, msg.sender, rentalBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Fractionalization extension for fractional ownership
     * @param token Token address to attach extension to
     * @param fractionToken Address of ERC20 token for fractions
     * @return extension Deployed extension address
     */
    function deployFractionalization(
        address token,
        address fractionToken
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(fractionBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC721FractionModule.initialize.selector,
            msg.sender,  // admin
            token,
            fractionToken
        );
        
        // Deploy via beacon
        extension = _deployExtension(fractionBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.FRACTIONALIZATION,
            ExtensionRegistry.TokenStandard.ERC721,
            "DEPLOY_EXTENSION"
        );
        
        emit FractionExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.FRACTIONALIZATION, msg.sender, fractionBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Metadata extension for EIP-4906 metadata update events
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployMetadata(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(metadataBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC4906MetadataModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(metadataBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.METADATA,
            ExtensionRegistry.TokenStandard.ERC721,
            "DEPLOY_EXTENSION"
        );
        
        emit MetadataExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.METADATA, msg.sender, metadataBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy GranularApproval extension for EIP-5216 fine-grained approvals
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployGranularApproval(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(granularApprovalBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC5216GranularApprovalModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(granularApprovalBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.GRANULAR_APPROVAL,
            ExtensionRegistry.TokenStandard.ERC721,
            "DEPLOY_EXTENSION"
        );
        
        emit GranularApprovalExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.GRANULAR_APPROVAL, msg.sender, granularApprovalBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Consecutive extension for EIP-2309 batch minting
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployConsecutive(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(consecutiveBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC721ConsecutiveModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(consecutiveBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.CONSECUTIVE,
            ExtensionRegistry.TokenStandard.ERC721,
            "DEPLOY_EXTENSION"
        );
        
        emit ConsecutiveExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.CONSECUTIVE, msg.sender, consecutiveBeacon);
        
        return extension;
    }
    
    // ============ Abstract Function Implementations ============
    
    /**
     * @notice Get the token standard this factory supports
     * @return ERC721 token standard
     */
    function getTokenStandard()
        external
        pure
        override
        returns (ExtensionRegistry.TokenStandard)
    {
        return ExtensionRegistry.TokenStandard.ERC721;
    }
    
    /**
     * @notice Get all supported extension types
     * @return Array of 7 ERC721 extension types
     */
    function getSupportedExtensions()
        external
        pure
        override
        returns (ExtensionRegistry.ExtensionType[] memory)
    {
        ExtensionRegistry.ExtensionType[] memory extensions = new ExtensionRegistry.ExtensionType[](7);
        extensions[0] = ExtensionRegistry.ExtensionType.ROYALTY;
        extensions[1] = ExtensionRegistry.ExtensionType.SOULBOUND;
        extensions[2] = ExtensionRegistry.ExtensionType.RENTAL;
        extensions[3] = ExtensionRegistry.ExtensionType.FRACTIONALIZATION;
        extensions[4] = ExtensionRegistry.ExtensionType.METADATA;
        extensions[5] = ExtensionRegistry.ExtensionType.GRANULAR_APPROVAL;
        extensions[6] = ExtensionRegistry.ExtensionType.CONSECUTIVE;
        return extensions;
    }
    
    // ============ Beacon Upgrade Functions ============
    
    /**
     * @notice Upgrade a specific beacon implementation
     * @param extensionType Type of extension to upgrade
     * @param newImplementation New implementation address
     */
    function upgradeBeacon(
        ExtensionRegistry.ExtensionType extensionType,
        address newImplementation
    ) external onlyOwner {
        address beacon;
        
        if (extensionType == ExtensionRegistry.ExtensionType.ROYALTY) {
            beacon = royaltyBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.SOULBOUND) {
            beacon = soulboundBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.RENTAL) {
            beacon = rentalBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.FRACTIONALIZATION) {
            beacon = fractionBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.METADATA) {
            beacon = metadataBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.GRANULAR_APPROVAL) {
            beacon = granularApprovalBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.CONSECUTIVE) {
            beacon = consecutiveBeacon;
        } else {
            revert IncompatibleExtension();
        }
        
        _directBeaconUpgrade(beacon, newImplementation);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ExtensionBase.sol";
import "./ExtensionRegistry.sol";
import "../extensions/permit/ERC20PermitModule.sol";
import "../extensions/compliance/ERC20ComplianceModule.sol";
import "../extensions/vesting/ERC20VestingModule.sol";
import "../extensions/snapshot/ERC20SnapshotModule.sol";
import "../extensions/timelock/ERC20TimelockModule.sol";
import "../extensions/flash-mint/ERC20FlashMintModule.sol";
import "../extensions/votes/ERC20VotesModule.sol";
import "../extensions/fees/ERC20FeeModule.sol";
import "../extensions/temporary-approval/ERC20TemporaryApprovalModule.sol";
import "../extensions/payable/ERC1363PayableToken.sol";

/**
 * @title ERC20ExtensionFactory
 * @notice Factory for deploying ERC20-specific extension modules
 * @dev Handles 10 ERC20 extension types with beacon-based upgradeability
 * 
 * Supported Extensions:
 * 1.  PERMIT              - EIP-2612 gasless approvals
 * 2.  COMPLIANCE          - KYC/whitelist enforcement
 * 3.  VESTING             - Time-locked token releases
 * 4.  SNAPSHOT            - Historical balance tracking
 * 5.  TIMELOCK            - Delayed transfer execution
 * 6.  FLASHMINT           - Flash loan capabilities
 * 7.  VOTES               - Governance voting power
 * 8.  FEES                - Configurable transfer fees
 * 9.  TEMPORARY_APPROVAL  - Time-limited approvals
 * 10. PAYABLE             - ERC-1363 payable token
 * 
 * Architecture:
 * - One beacon per extension type (10 beacons total)
 * - Beacons enable upgradeability of extension logic
 * - All deployments go through ExtensionRegistry
 * - Policy validation via PolicyEngine
 * - Upgrade governance via UpgradeGovernor
 */
contract ERC20ExtensionFactory is ExtensionBase {
    
    // ============ Beacons ============
    
    address public permitBeacon;
    address public complianceBeacon;
    address public vestingBeacon;
    address public snapshotBeacon;
    address public timelockBeacon;
    address public flashMintBeacon;
    address public votesBeacon;
    address public feesBeacon;
    address public temporaryApprovalBeacon;
    address public payableBeacon;
    
    // ============ Events ============
    
    event PermitExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event ComplianceExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event VestingExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event SnapshotExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event TimelockExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event FlashMintExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event VotesExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event FeesExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event TemporaryApprovalExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event PayableExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize ERC20 extension factory
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
     * @param permitImpl Permit module implementation
     * @param complianceImpl Compliance module implementation
     * @param vestingImpl Vesting module implementation
     * @param snapshotImpl Snapshot module implementation
     * @param timelockImpl Timelock module implementation
     * @param flashMintImpl FlashMint module implementation
     * @param votesImpl Votes module implementation
     * @param feesImpl Fees module implementation
     * @param temporaryApprovalImpl TemporaryApproval module implementation
     * @param payableImpl Payable module implementation
     */
    function initializeBeacons(
        address permitImpl,
        address complianceImpl,
        address vestingImpl,
        address snapshotImpl,
        address timelockImpl,
        address flashMintImpl,
        address votesImpl,
        address feesImpl,
        address temporaryApprovalImpl,
        address payableImpl
    ) external onlyOwner {
        require(permitBeacon == address(0), "Already initialized");
        
        permitBeacon = _createBeacon(permitImpl, ExtensionRegistry.ExtensionType.PERMIT);
        complianceBeacon = _createBeacon(complianceImpl, ExtensionRegistry.ExtensionType.COMPLIANCE);
        vestingBeacon = _createBeacon(vestingImpl, ExtensionRegistry.ExtensionType.VESTING);
        snapshotBeacon = _createBeacon(snapshotImpl, ExtensionRegistry.ExtensionType.SNAPSHOT);
        timelockBeacon = _createBeacon(timelockImpl, ExtensionRegistry.ExtensionType.TIMELOCK);
        flashMintBeacon = _createBeacon(flashMintImpl, ExtensionRegistry.ExtensionType.FLASHMINT);
        votesBeacon = _createBeacon(votesImpl, ExtensionRegistry.ExtensionType.VOTES);
        feesBeacon = _createBeacon(feesImpl, ExtensionRegistry.ExtensionType.FEES);
        temporaryApprovalBeacon = _createBeacon(temporaryApprovalImpl, ExtensionRegistry.ExtensionType.TEMPORARY_APPROVAL);
        payableBeacon = _createBeacon(payableImpl, ExtensionRegistry.ExtensionType.PAYABLE);
    }
    
    // ============ Extension Deployment Functions ============
    
    /**
     * @notice Deploy Permit extension for gasless approvals (EIP-2612)
     * @param token Token address to attach extension to
     * @param name Token name for EIP-712
     * @param version EIP-712 version (typically "1")
     * @return extension Deployed extension address
     */
    function deployPermit(
        address token,
        string memory name,
        string memory version
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(permitBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20PermitModule.initialize.selector,
            msg.sender,  // admin
            token,
            name,
            version
        );
        
        // Deploy via beacon
        extension = _deployExtension(permitBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.PERMIT,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit PermitExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.PERMIT, msg.sender, permitBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Compliance extension for KYC/whitelist
     * @param token Token address to attach extension to
     * @param requireKYC Whether to require KYC
     * @param whitelistEnabled Whether whitelist is enabled
     * @return extension Deployed extension address
     */
    function deployCompliance(
        address token,
        bool requireKYC,
        bool whitelistEnabled
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(complianceBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20ComplianceModule.initialize.selector,
            msg.sender,  // admin
            token,
            requireKYC,
            whitelistEnabled
        );
        
        // Deploy via beacon
        extension = _deployExtension(complianceBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.COMPLIANCE,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit ComplianceExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.COMPLIANCE, msg.sender, complianceBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Vesting extension for time-locked releases
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployVesting(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(vestingBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20VestingModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(vestingBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.VESTING,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit VestingExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.VESTING, msg.sender, vestingBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Snapshot extension for historical balance tracking
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deploySnapshot(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(snapshotBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20SnapshotModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(snapshotBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.SNAPSHOT,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit SnapshotExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.SNAPSHOT, msg.sender, snapshotBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Timelock extension for delayed transfers
     * @param token Token address to attach extension to
     * @param minDelay Minimum timelock delay in seconds
     * @return extension Deployed extension address
     */
    function deployTimelock(
        address token,
        uint256 minDelay
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(timelockBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20TimelockModule.initialize.selector,
            msg.sender,  // admin
            token,
            minDelay
        );
        
        // Deploy via beacon
        extension = _deployExtension(timelockBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.TIMELOCK,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit TimelockExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.TIMELOCK, msg.sender, timelockBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy FlashMint extension for flash loans
     * @param token Token address to attach extension to
     * @param maxFlashLoan Maximum flash loan amount
     * @param flashFee Flash loan fee (in basis points)
     * @return extension Deployed extension address
     */
    function deployFlashMint(
        address token,
        uint256 maxFlashLoan,
        uint256 flashFee
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(flashMintBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20FlashMintModule.initialize.selector,
            msg.sender,  // admin
            token,
            maxFlashLoan,
            flashFee
        );
        
        // Deploy via beacon
        extension = _deployExtension(flashMintBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.FLASHMINT,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit FlashMintExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.FLASHMINT, msg.sender, flashMintBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Votes extension for governance
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployVotes(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(votesBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20VotesModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(votesBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.VOTES,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit VotesExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.VOTES, msg.sender, votesBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Fees extension for transfer fees
     * @param token Token address to attach extension to
     * @param feePercent Fee percentage (in basis points)
     * @param feeRecipient Address to receive fees
     * @return extension Deployed extension address
     */
    function deployFees(
        address token,
        uint256 feePercent,
        address feeRecipient
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(feesBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20FeeModule.initialize.selector,
            msg.sender,  // admin
            token,
            feePercent,
            feeRecipient
        );
        
        // Deploy via beacon
        extension = _deployExtension(feesBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.FEES,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit FeesExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.FEES, msg.sender, feesBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy TemporaryApproval extension for time-limited approvals
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployTemporaryApproval(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(temporaryApprovalBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC20TemporaryApprovalModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(temporaryApprovalBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.TEMPORARY_APPROVAL,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit TemporaryApprovalExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.TEMPORARY_APPROVAL, msg.sender, temporaryApprovalBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Payable extension for ERC-1363 payable token
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployPayable(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(payableBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC1363PayableToken.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(payableBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.PAYABLE,
            ExtensionRegistry.TokenStandard.ERC20,
            "DEPLOY_EXTENSION"
        );
        
        emit PayableExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.PAYABLE, msg.sender, payableBeacon);
        
        return extension;
    }
    
    // ============ Abstract Function Implementations ============
    
    /**
     * @notice Get the token standard this factory supports
     * @return ERC20 token standard
     */
    function getTokenStandard()
        external
        pure
        override
        returns (ExtensionRegistry.TokenStandard)
    {
        return ExtensionRegistry.TokenStandard.ERC20;
    }
    
    /**
     * @notice Get all supported extension types
     * @return Array of 10 ERC20 extension types
     */
    function getSupportedExtensions()
        external
        pure
        override
        returns (ExtensionRegistry.ExtensionType[] memory)
    {
        ExtensionRegistry.ExtensionType[] memory extensions = new ExtensionRegistry.ExtensionType[](10);
        extensions[0] = ExtensionRegistry.ExtensionType.PERMIT;
        extensions[1] = ExtensionRegistry.ExtensionType.COMPLIANCE;
        extensions[2] = ExtensionRegistry.ExtensionType.VESTING;
        extensions[3] = ExtensionRegistry.ExtensionType.SNAPSHOT;
        extensions[4] = ExtensionRegistry.ExtensionType.TIMELOCK;
        extensions[5] = ExtensionRegistry.ExtensionType.FLASHMINT;
        extensions[6] = ExtensionRegistry.ExtensionType.VOTES;
        extensions[7] = ExtensionRegistry.ExtensionType.FEES;
        extensions[8] = ExtensionRegistry.ExtensionType.TEMPORARY_APPROVAL;
        extensions[9] = ExtensionRegistry.ExtensionType.PAYABLE;
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
        
        if (extensionType == ExtensionRegistry.ExtensionType.PERMIT) {
            beacon = permitBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.COMPLIANCE) {
            beacon = complianceBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.VESTING) {
            beacon = vestingBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.SNAPSHOT) {
            beacon = snapshotBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.TIMELOCK) {
            beacon = timelockBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.FLASHMINT) {
            beacon = flashMintBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.VOTES) {
            beacon = votesBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.FEES) {
            beacon = feesBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.TEMPORARY_APPROVAL) {
            beacon = temporaryApprovalBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.PAYABLE) {
            beacon = payableBeacon;
        } else {
            revert IncompatibleExtension();
        }
        
        _directBeaconUpgrade(beacon, newImplementation);
    }
}

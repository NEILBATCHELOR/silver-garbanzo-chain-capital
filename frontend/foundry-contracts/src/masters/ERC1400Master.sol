// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Extension Module Interfaces
import "../extensions/erc1400/interfaces/IERC1400TransferRestrictionsModule.sol";
import "../extensions/erc1400/interfaces/IERC1400DocumentModule.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

// Extension Infrastructure
import "../interfaces/IExtensible.sol";
import "../factories/ExtensionRegistry.sol";

/**
 * @title ERC1400Master
 * @notice Security token standard for regulated assets (equity, bonds, private equity, etc.)
 * @dev Implements ERC-1400 standard with partition-based token management
 * 
 * Key Features:
 * - Partition-based holdings (different share classes)
 * - Transfer restrictions (regulatory compliance)
 * - Document management (prospectuses, disclosures)
 * - Controller operations (forced transfers for legal recovery)
 * - Investor whitelist/KYC integration
 * - Lock-up periods and investor limits
 * - Policy engine integration for operation validation
 * 
 * Use Cases:
 * - Equity (common/preferred shares)
 * - Private Equity
 * - Bonds
 * - Asset-Backed Securities
 * - Any regulated security requiring SEC/MiFID II compliance
 */
contract ERC1400Master is 
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    IExtensible
{
    // ============ Roles ============
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    
    // Token metadata
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 private _totalSupply;
    
    // Partition management
    bytes32[] public partitions;
    mapping(bytes32 => bool) public partitionExists;
    
    // Balances: partition => holder => balance
    mapping(bytes32 => mapping(address => uint256)) private _partitionBalances;
    
    // Operator approvals: partition => holder => operator => approved
    mapping(bytes32 => mapping(address => mapping(address => bool))) private _partitionOperators;
    
    // Controller state
    bool public isControllable;
    mapping(address => bool) public isController;
    
    // Extension module addresses
    address public transferRestrictionsModule;
    address public documentModule;
    address public complianceModule;
    
    /// @notice Policy engine for operation validation
    address public policyEngine;
    
    /// @notice Vesting module for token lock schedules
    address public vestingModule;
    
    /// @notice Controller module for operator control functions
    address public controllerModule;
    
    /// @notice ERC1400-specific document module
    address public erc1400DocumentModule;
    
    // ============ IExtensible Storage ============
    /// @notice Extension registry for validation and queries
    address public extensionRegistry;
    
    /// @notice Array of all attached extensions
    address[] private _extensions;
    
    /// @notice Mapping to check if extension is attached
    mapping(address => bool) private _isExtension;
    
    /// @notice Mapping from extension type to extension address
    mapping(uint8 => address) private _extensionByType;
    
    // Storage gap for future upgrades
    uint256[32] private __gap; // Reduced for IExtensible storage (4 more variables)
    
    // ============ Events ============
    
    event TransferByPartition(
        bytes32 indexed partition,
        address operator,
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    
    event ControllerTransfer(
        address controller,
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    
    event ControllerRedemption(
        address controller,
        address indexed tokenHolder,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    
    event PartitionCreated(bytes32 indexed partition, string name);
    event PartitionDeactivated(bytes32 indexed partition);
    event IssuedByPartition(bytes32 indexed partition, address indexed to, uint256 value);
    event RedeemedByPartition(bytes32 indexed partition, address indexed from, uint256 value);
    
    event TransferRestrictionsModuleSet(address indexed module);
    event DocumentModuleSet(address indexed module);
    event ComplianceModuleSet(address indexed module);
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event VestingModuleSet(address indexed module);
    event ControllerModuleSet(address indexed module);
    event ERC1400DocumentModuleSet(address indexed module);
    
    // ============ Errors ============
    
    error InvalidPartition();
    error PartitionAlreadyExists();
    error TransferNotAllowed(bytes32 reasonCode);
    error InsufficientBalance();
    error NotAuthorized();
    error ControllableNotEnabled();
    error InvalidModule();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the security token
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _decimals Token decimals
     * @param _defaultPartitions Initial partitions to create
     * @param _owner Token owner/admin
     * @param _isControllable Whether token can be controlled
     */
    function initialize(
        string calldata _name,
        string calldata _symbol,
        uint8 _decimals,
        bytes32[] calldata _defaultPartitions,
        address _owner,
        bool _isControllable
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        isControllable = _isControllable;
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(COMPLIANCE_OFFICER_ROLE, _owner);
        _grantRole(CONTROLLER_ROLE, _owner);
        _grantRole(UPGRADER_ROLE, _owner);
        
        // Create default partitions
        for (uint i = 0; i < _defaultPartitions.length; i++) {
            _createPartition(_defaultPartitions[i], "");
        }
    }
    
    // ============ Policy Engine Integration ============
    
    /**
     * @notice Set or update the policy engine
     * @param engine_ Address of policy engine (address(0) to disable)
     */
    function setPolicyEngine(address engine_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldEngine = policyEngine;
        policyEngine = engine_;
        emit PolicyEngineUpdated(oldEngine, engine_);
    }
    
    /**
     * @notice Validate operation with policy engine (if configured)
     * @param operationType Operation type constant from PolicyOperationTypes
     * @param amount Amount involved (use 1 for NFTs, count for batch)
     * @dev Optimized for minimal gas - early exit if policyEngine not set
     */
    function _validatePolicy(
        string memory operationType,
        uint256 amount
    ) internal {
        // Early exit: Skip if policy engine not configured (~200 gas)
        if (policyEngine == address(0)) return;

        // Call policy engine validation (~5-8k gas)
        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperation(
            address(this),  // token address
            msg.sender,     // operator
            operationType,  // operation type
            amount          // amount
        );

        // Revert if not approved
        require(approved, reason);
    }

    /**
     * @notice Validate operation with target address (for transfers)
     * @param operationType Operation type constant
     * @param target Target address (to/from)
     * @param amount Amount involved
     */
    function _validatePolicyWithTarget(
        string memory operationType,
        address target,
        uint256 amount
    ) internal {
        if (policyEngine == address(0)) return;

        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperationWithTarget(
            address(this),
            msg.sender,
            target,
            operationType,
            amount
        );

        require(approved, reason);
    }
    
    // ============ ERC-1400 Core Functions ============
    
    /**
     * @notice Get balance of holder for specific partition
     */
    function balanceOfByPartition(bytes32 partition, address holder) 
        external 
        view 
        returns (uint256) 
    {
        return _partitionBalances[partition][holder];
    }
    
    /**
     * @notice Get all partitions of a holder
     */
    function partitionsOf(address holder) external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < partitions.length; i++) {
            if (_partitionBalances[partitions[i]][holder] > 0) {
                count++;
            }
        }
        
        bytes32[] memory holderPartitions = new bytes32[](count);
        uint256 index = 0;
        for (uint i = 0; i < partitions.length; i++) {
            if (_partitionBalances[partitions[i]][holder] > 0) {
                holderPartitions[index] = partitions[i];
                index++;
            }
        }
        
        return holderPartitions;
    }
    
    /**
     * @notice Transfer tokens from one partition
     */
    function transferByPartition(
        bytes32 partition,
        address to,
        uint256 value,
        bytes calldata data
    ) external whenNotPaused returns (bytes32) {
        return _transferByPartition(
            partition,
            msg.sender,
            msg.sender,
            to,
            value,
            data,
            ""
        );
    }
    
    /**
     * @notice Transfer tokens from specific partition using operator
     */
    function operatorTransferByPartition(
        bytes32 partition,
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) external whenNotPaused returns (bytes32) {
        if (!_isOperatorForPartition(partition, msg.sender, from)) {
            revert NotAuthorized();
        }
        
        return _transferByPartition(
            partition,
            msg.sender,
            from,
            to,
            value,
            data,
            operatorData
        );
    }
    
    // ============ Issuance ============
    
    /**
     * @notice Issue new tokens to a partition
     */
    function issueByPartition(
        bytes32 partition,
        address to,
        uint256 value,
        bytes calldata data
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!partitionExists[partition]) revert InvalidPartition();
        
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC1400_ISSUE, to, value);
        
        _partitionBalances[partition][to] += value;
        _totalSupply += value;
        
        emit IssuedByPartition(partition, to, value);
    }
    
    /**
     * @notice Redeem tokens from a partition
     */
    function redeemByPartition(
        bytes32 partition,
        uint256 value,
        bytes calldata data
    ) external {
        if (_partitionBalances[partition][msg.sender] < value) {
            revert InsufficientBalance();
        }
        
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC1400_REDEEM, value);
        
        _partitionBalances[partition][msg.sender] -= value;
        _totalSupply -= value;
        
        emit RedeemedByPartition(partition, msg.sender, value);
    }
    
    // ============ Partition Management ============
    
    /**
     * @notice Create a new partition
     */
    function createPartition(bytes32 partition, string memory partitionName) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        _createPartition(partition, partitionName);
    }
    
    /**
     * @notice Get all partitions
     */
    function getPartitions() external view returns (bytes32[] memory) {
        return partitions;
    }
    
    // ============ Operator Management ============
    
    /**
     * @notice Authorize operator for a partition
     */
    function authorizeOperatorByPartition(bytes32 partition, address operator) external {
        _partitionOperators[partition][msg.sender][operator] = true;
    }
    
    /**
     * @notice Revoke operator for a partition
     */
    function revokeOperatorByPartition(bytes32 partition, address operator) external {
        _partitionOperators[partition][msg.sender][operator] = false;
    }
    
    /**
     * @notice Check if address is operator for partition
     */
    function isOperatorForPartition(
        bytes32 partition,
        address operator,
        address holder
    ) external view returns (bool) {
        return _isOperatorForPartition(partition, operator, holder);
    }
    
    // ============ Controller Operations ============
    
    /**
     * @notice Controller forced transfer (regulatory requirement)
     */
    function controllerTransfer(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) external onlyRole(CONTROLLER_ROLE) {
        if (!isControllable) revert ControllableNotEnabled();
        
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC1400_CONTROLLER_TRANSFER, to, value);
        
        // Transfer from default partition
        bytes32 defaultPartition = partitions[0];
        if (_partitionBalances[defaultPartition][from] < value) {
            revert InsufficientBalance();
        }
        
        _partitionBalances[defaultPartition][from] -= value;
        _partitionBalances[defaultPartition][to] += value;
        
        emit ControllerTransfer(msg.sender, from, to, value, data, operatorData);
    }
    
    /**
     * @notice Controller forced redemption
     */
    function controllerRedeem(
        address tokenHolder,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) external onlyRole(CONTROLLER_ROLE) {
        if (!isControllable) revert ControllableNotEnabled();
        
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC1400_CONTROLLER_REDEEM, value);
        
        bytes32 defaultPartition = partitions[0];
        if (_partitionBalances[defaultPartition][tokenHolder] < value) {
            revert InsufficientBalance();
        }
        
        _partitionBalances[defaultPartition][tokenHolder] -= value;
        _totalSupply -= value;
        
        emit ControllerRedemption(msg.sender, tokenHolder, value, data, operatorData);
    }
    
    // ============ Extension Module Integration ============
    
    /**
     * @notice Set transfer restrictions module
     */
    function setTransferRestrictionsModule(address module) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (module == address(0)) revert InvalidModule();
        transferRestrictionsModule = module;
        emit TransferRestrictionsModuleSet(module);
    }
    
    /**
     * @notice Set document management module
     */
    function setDocumentModule(address module) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (module == address(0)) revert InvalidModule();
        documentModule = module;
        emit DocumentModuleSet(module);
    }
    
    /**
     * @notice Set compliance module
     */
    function setComplianceModule(address module) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (module == address(0)) revert InvalidModule();
        complianceModule = module;
        emit ComplianceModuleSet(module);
    }
    
    /**
     * @notice Set vesting module
     */
    function setVestingModule(address module) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (module == address(0)) revert InvalidModule();
        vestingModule = module;
        emit VestingModuleSet(module);
    }
    
    /**
     * @notice Set controller module
     */
    function setControllerModule(address module) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (module == address(0)) revert InvalidModule();
        controllerModule = module;
        emit ControllerModuleSet(module);
    }
    
    /**
     * @notice Set ERC1400-specific document module
     */
    function setERC1400DocumentModule(address module) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (module == address(0)) revert InvalidModule();
        erc1400DocumentModule = module;
        emit ERC1400DocumentModuleSet(module);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get total supply
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
    
    /**
     * @notice Get total balance of holder across all partitions
     */
    function balanceOf(address holder) external view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < partitions.length; i++) {
            total += _partitionBalances[partitions[i]][holder];
        }
        return total;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Pause all transfers (emergency only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause transfers
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Set controllable state
     */
    function setControllable(bool _isControllable) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        isControllable = _isControllable;
    }
    
    // ============ Internal Functions ============
    
    function _createPartition(bytes32 partition, string memory partitionName) private {
        if (partitionExists[partition]) revert PartitionAlreadyExists();
        
        partitions.push(partition);
        partitionExists[partition] = true;
        
        emit PartitionCreated(partition, partitionName);
    }
    
    function _transferByPartition(
        bytes32 partition,
        address operator,
        address from,
        address to,
        uint256 value,
        bytes memory data,
        bytes memory operatorData
    ) private returns (bytes32) {
        if (!partitionExists[partition]) revert InvalidPartition();
        if (_partitionBalances[partition][from] < value) revert InsufficientBalance();
        
        // Validate with policy engine (skip for mint/burn which have their own validation)
        if (from != address(0) && to != address(0)) {
            _validatePolicyWithTarget(
                PolicyOperationTypes.ERC1400_TRANSFER_BY_PARTITION,
                to,
                value
            );
        }
        
        // Check transfer restrictions if module is set
        if (transferRestrictionsModule != address(0)) {
            (bool canTransfer, bytes32 reasonCode, ) = _canTransfer(
                partition,
                from,
                to,
                value,
                data
            );
            if (!canTransfer) revert TransferNotAllowed(reasonCode);
        }
        
        // Execute transfer
        _partitionBalances[partition][from] -= value;
        _partitionBalances[partition][to] += value;
        
        emit TransferByPartition(
            partition,
            operator,
            from,
            to,
            value,
            data,
            operatorData
        );
        
        return partition;
    }
    
    function _canTransfer(
        bytes32 partition,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) private view returns (bool, bytes32, string memory) {
        // Call transfer restrictions module
        (bool success, bytes memory result) = transferRestrictionsModule.staticcall(
            abi.encodeWithSignature(
                "canTransfer(bytes32,address,address,uint256,bytes)",
                partition,
                from,
                to,
                value,
                data
            )
        );
        
        if (!success || result.length == 0) {
            return (false, bytes32("0x50"), "Module call failed");
        }
        
        (bytes1 statusCode, bytes32 reasonCode) = abi.decode(result, (bytes1, bytes32));
        
        return (
            statusCode == 0x51, // 0x51 = Transfer Valid
            reasonCode,
            ""
        );
    }
    
    function _isOperatorForPartition(
        bytes32 partition,
        address operator,
        address holder
    ) private view returns (bool) {
        return _partitionOperators[partition][holder][operator] || 
               operator == holder;
    }
    
    // ============ IExtensible Implementation ============
    
    /**
     * @notice Attach an extension module to this security token
     * @dev Implements IExtensible.attachExtension()
     */
    function attachExtension(address extension) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (extension == address(0)) revert InvalidExtensionAddress();
        if (_isExtension[extension]) revert ExtensionAlreadyAttached(extension);
        
        if (extensionRegistry != address(0)) {
            ExtensionRegistry registry = ExtensionRegistry(extensionRegistry);
            ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(extension);
            
            require(info.extensionAddress == extension, "Extension not registered");
            require(
                registry.isCompatible(ExtensionRegistry.TokenStandard.ERC1400, info.extensionType),
                "Extension not compatible with ERC1400"
            );
            
            uint8 extType = uint8(info.extensionType);
            if (_extensionByType[extType] != address(0)) {
                revert ExtensionTypeAlreadyAttached(extType);
            }
            
            _extensions.push(extension);
            _isExtension[extension] = true;
            _extensionByType[extType] = extension;
            
            emit ExtensionAttached(extension, extType);
        } else {
            _extensions.push(extension);
            _isExtension[extension] = true;
            emit ExtensionAttached(extension, 0);
        }
    }
    
    /**
     * @notice Detach an extension module from this security token
     * @dev Implements IExtensible.detachExtension()
     */
    function detachExtension(address extension) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_isExtension[extension]) revert ExtensionNotAttached(extension);
        
        uint8 extType = 0;
        if (extensionRegistry != address(0)) {
            ExtensionRegistry registry = ExtensionRegistry(extensionRegistry);
            ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(extension);
            extType = uint8(info.extensionType);
        }
        
        for (uint256 i = 0; i < _extensions.length; i++) {
            if (_extensions[i] == extension) {
                _extensions[i] = _extensions[_extensions.length - 1];
                _extensions.pop();
                break;
            }
        }
        
        _isExtension[extension] = false;
        if (extType != 0) {
            delete _extensionByType[extType];
        }
        
        emit ExtensionDetached(extension, extType);
    }
    
    /**
     * @notice Get all extensions attached to this security token
     */
    function getExtensions() external view override returns (address[] memory) {
        return _extensions;
    }
    
    /**
     * @notice Check if a specific extension is attached
     */
    function hasExtension(address extension) external view override returns (bool) {
        return _isExtension[extension];
    }
    
    /**
     * @notice Get the extension address for a specific extension type
     */
    function getExtensionByType(uint8 extensionType) external view override returns (address) {
        return _extensionByType[extensionType];
    }
    
    /**
     * @notice Set the extension registry address
     */
    function setExtensionRegistry(address registry_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        extensionRegistry = registry_;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

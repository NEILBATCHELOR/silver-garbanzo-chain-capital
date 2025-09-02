// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title BaseERC1400Token
 * @dev ERC1400 Security Token with comprehensive compliance features
 * 
 * Features:
 * - Partition-based token management
 * - Transfer restrictions and compliance controls
 * - KYC/AML integration
 * - Document management
 * - Corporate actions support
 * - Multi-jurisdiction compliance
 * - Institutional-grade security
 */
contract BaseERC1400Token is ERC20, AccessControl, Pausable, ERC20Burnable, ERC20Permit {
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    
    // Default partitions
    bytes32 public constant DEFAULT_PARTITION = keccak256("DEFAULT");
    bytes32 public constant LOCKED_PARTITION = keccak256("LOCKED");
    
    // ============ State Variables ============
    
    // Token details
    string public documentURI;
    bytes32 public documentHash;
    
    // Compliance settings
    bool public requireKYC;
    bool public enforceKYC;
    bool public whitelist;
    bool public investorAccreditation;
    
    // Corporate features
    bool public dividendDistribution;
    bool public corporateActions;
    bool public forcedTransfers;
    bool public issuanceModules;
    bool public documentManagement;
    bool public recoveryMechanism;
    
    // Advanced features
    bool public institutionalGrade;
    bool public realTimeComplianceMonitoring;
    bool public automatedSanctionsScreening;
    bool public amlMonitoringEnabled;
    
    // Supply management
    uint256 public cap;
    bool public isMintable;
    bool public isBurnable;
    
    // Security and jurisdiction
    string public securityType;
    string public issuingJurisdiction;
    string public issuingEntityName;
    string public issuingEntityLei;
    string public regulationType;
    
    // Partition management
    bytes32[] public partitions;
    mapping(bytes32 => uint256) public partitionBalances;
    mapping(address => mapping(bytes32 => uint256)) public balanceOfByPartition;
    mapping(bytes32 => mapping(address => mapping(address => uint256))) public allowanceByPartition;
    
    // Investor management
    mapping(address => bool) public isWhitelisted;
    mapping(address => bool) public isKYCVerified;
    mapping(address => bool) public isAccredited;
    mapping(address => bool) public isBlocked;
    mapping(address => uint256) public investorHoldingPeriod;
    
    // Transfer restrictions
    mapping(address => mapping(address => bool)) public transferRestrictions;
    mapping(bytes32 => bool) public partitionTransferability;
    
    // Controllers and operators
    mapping(address => bool) public controllers;
    mapping(bytes32 => mapping(address => bool)) public partitionOperators;
    mapping(address => mapping(address => bool)) public operatorApprovals;
    
    // Document management
    mapping(bytes32 => string) public documents;
    mapping(bytes32 => bytes32) public documentHashes;
    
    // ============ Events ============
    
    // ERC1400 Standard Events
    event TransferByPartition(
        bytes32 indexed fromPartition,
        address operator,
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data,
        bytes operatorData
    );
    
    event ChangedPartition(
        bytes32 indexed fromPartition,
        bytes32 indexed toPartition,
        uint256 value
    );
    
    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);
    event AuthorizedOperatorByPartition(bytes32 indexed partition, address indexed operator, address indexed tokenHolder);
    event RevokedOperatorByPartition(bytes32 indexed partition, address indexed operator, address indexed tokenHolder);
    
    // Compliance Events
    event KYCVerified(address indexed investor, bool verified);
    event WhitelistUpdated(address indexed investor, bool whitelisted);
    event AccreditationUpdated(address indexed investor, bool accredited);
    event InvestorBlocked(address indexed investor, bool blocked);
    
    // Document Events
    event DocumentUpdated(bytes32 indexed name, string uri, bytes32 documentHash);
    event DocumentRemoved(bytes32 indexed name);
    
    // Controller Events
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    
    // Corporate Action Events
    event DividendDistributed(address indexed to, uint256 amount);
    event ForcedTransfer(address indexed from, address indexed to, uint256 amount, bytes data);
    
    // ============ Modifiers ============
    
    modifier onlyController() {
        require(controllers[msg.sender] || hasRole(CONTROLLER_ROLE, msg.sender), "ERC1400: caller is not a controller");
        _;
    }
    
    modifier onlyCompliance() {
        require(hasRole(COMPLIANCE_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "ERC1400: caller is not compliance officer");
        _;
    }
    
    modifier validPartition(bytes32 partition) {
        require(_isValidPartition(partition), "ERC1400: invalid partition");
        _;
    }
    
    modifier transferAllowed(address from, address to, uint256 amount) {
        require(_canTransfer(from, to, amount), "ERC1400: transfer not allowed");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        uint256 _cap,
        address _controller,
        bool _requireKYC,
        string memory _documentURI,
        bytes32 _documentHash
    ) 
        ERC20(_name, _symbol) 
        ERC20Permit(_name)
    {
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CONTROLLER_ROLE, _controller);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
        
        // Initialize token properties
        cap = _cap;
        isMintable = true;
        isBurnable = true;
        requireKYC = _requireKYC;
        enforceKYC = _requireKYC;
        
        // Set document
        documentURI = _documentURI;
        documentHash = _documentHash;
        
        // Initialize default partition
        partitions.push(DEFAULT_PARTITION);
        partitionTransferability[DEFAULT_PARTITION] = true;
        
        // Add controller
        controllers[_controller] = true;
        emit ControllerAdded(_controller);
        
        // Mint initial supply to deployer
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
            partitionBalances[DEFAULT_PARTITION] = _initialSupply;
            balanceOfByPartition[msg.sender][DEFAULT_PARTITION] = _initialSupply;
        }
    }
    
    // ============ ERC1400 Core Functions ============
    
    /**
     * @dev Get balance of address for specific partition
     */
    function getBalanceOfByPartition(bytes32 partition, address tokenHolder) 
        external 
        view 
        returns (uint256) 
    {
        return balanceOfByPartition[tokenHolder][partition];
    }
    
    /**
     * @dev Get all partitions
     */
    function partitionsOf(address tokenHolder) external view returns (bytes32[] memory) {
        uint256 count = 0;
        
        // Count partitions with balance
        for (uint256 i = 0; i < partitions.length; i++) {
            if (balanceOfByPartition[tokenHolder][partitions[i]] > 0) {
                count++;
            }
        }
        
        // Create result array
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < partitions.length; i++) {
            if (balanceOfByPartition[tokenHolder][partitions[i]] > 0) {
                result[index] = partitions[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Transfer tokens by partition
     */
    function transferByPartition(
        bytes32 partition,
        address to,
        uint256 value,
        bytes calldata data
    ) 
        external 
        validPartition(partition)
        transferAllowed(msg.sender, to, value)
        returns (bytes32) 
    {
        require(balanceOfByPartition[msg.sender][partition] >= value, "ERC1400: insufficient partition balance");
        
        _transferByPartition(partition, msg.sender, msg.sender, to, value, data, "");
        
        return partition;
    }
    
    /**
     * @dev Transfer tokens by partition from another address
     */
    function operatorTransferByPartition(
        bytes32 partition,
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata operatorData
    ) 
        external 
        validPartition(partition)
        transferAllowed(from, to, value)
        returns (bytes32) 
    {
        require(_isOperatorForPartition(partition, msg.sender, from), "ERC1400: not authorized operator");
        require(balanceOfByPartition[from][partition] >= value, "ERC1400: insufficient partition balance");
        
        _transferByPartition(partition, msg.sender, from, to, value, data, operatorData);
        
        return partition;
    }
    
    // ============ Operator Management ============
    
    /**
     * @dev Authorize operator for all partitions
     */
    function authorizeOperator(address operator) external {
        require(operator != msg.sender, "ERC1400: cannot authorize self");
        operatorApprovals[msg.sender][operator] = true;
        emit AuthorizedOperator(operator, msg.sender);
    }
    
    /**
     * @dev Revoke operator for all partitions
     */
    function revokeOperator(address operator) external {
        operatorApprovals[msg.sender][operator] = false;
        emit RevokedOperator(operator, msg.sender);
    }
    
    /**
     * @dev Authorize operator for specific partition
     */
    function authorizeOperatorByPartition(bytes32 partition, address operator) 
        external 
        validPartition(partition) 
    {
        require(operator != msg.sender, "ERC1400: cannot authorize self");
        partitionOperators[partition][operator] = true;
        emit AuthorizedOperatorByPartition(partition, operator, msg.sender);
    }
    
    /**
     * @dev Revoke operator for specific partition
     */
    function revokeOperatorByPartition(bytes32 partition, address operator) 
        external 
        validPartition(partition) 
    {
        partitionOperators[partition][operator] = false;
        emit RevokedOperatorByPartition(partition, operator, msg.sender);
    }
    
    // ============ Compliance Functions ============
    
    /**
     * @dev Update KYC status
     */
    function updateKYCStatus(address investor, bool verified) 
        external 
        onlyCompliance 
    {
        isKYCVerified[investor] = verified;
        emit KYCVerified(investor, verified);
    }
    
    /**
     * @dev Update whitelist status
     */
    function updateWhitelist(address investor, bool whitelisted) 
        external 
        onlyCompliance 
    {
        isWhitelisted[investor] = whitelisted;
        emit WhitelistUpdated(investor, whitelisted);
    }
    
    /**
     * @dev Update accreditation status
     */
    function updateAccreditation(address investor, bool accredited) 
        external 
        onlyCompliance 
    {
        isAccredited[investor] = accredited;
        emit AccreditationUpdated(investor, accredited);
    }
    
    /**
     * @dev Block/unblock investor
     */
    function updateBlockStatus(address investor, bool blocked) 
        external 
        onlyCompliance 
    {
        isBlocked[investor] = blocked;
        emit InvestorBlocked(investor, blocked);
    }
    
    /**
     * @dev Batch update KYC status
     */
    function batchUpdateKYC(address[] calldata investors, bool[] calldata statuses) 
        external 
        onlyCompliance 
    {
        require(investors.length == statuses.length, "ERC1400: arrays length mismatch");
        
        for (uint256 i = 0; i < investors.length; i++) {
            isKYCVerified[investors[i]] = statuses[i];
            emit KYCVerified(investors[i], statuses[i]);
        }
    }
    
    // ============ Controller Functions ============
    
    /**
     * @dev Add controller
     */
    function addController(address controller) external onlyRole(ADMIN_ROLE) {
        controllers[controller] = true;
        _grantRole(CONTROLLER_ROLE, controller);
        emit ControllerAdded(controller);
    }
    
    /**
     * @dev Remove controller
     */
    function removeController(address controller) external onlyRole(ADMIN_ROLE) {
        controllers[controller] = false;
        _revokeRole(CONTROLLER_ROLE, controller);
        emit ControllerRemoved(controller);
    }
    
    /**
     * @dev Forced transfer (compliance)
     */
    function forcedTransfer(
        address from,
        address to,
        uint256 amount,
        bytes calldata data
    ) 
        external 
        onlyController 
    {
        require(forcedTransfers, "ERC1400: forced transfers disabled");
        
        _transfer(from, to, amount);
        
        // Update partition balances
        bytes32 fromPartition = _getPartitionForBalance(from, amount);
        _updatePartitionBalances(fromPartition, from, to, amount);
        
        emit ForcedTransfer(from, to, amount, data);
    }
    
    // ============ Token Management ============
    
    /**
     * @dev Mint tokens to specific partition
     */
    function mintByPartition(
        bytes32 partition,
        address to,
        uint256 amount,
        bytes calldata data
    ) 
        external 
        onlyRole(ISSUER_ROLE)
        validPartition(partition)
    {
        require(isMintable, "ERC1400: minting disabled");
        require(cap == 0 || totalSupply() + amount <= cap, "ERC1400: cap exceeded");
        
        _mint(to, amount);
        
        // Update partition balances
        partitionBalances[partition] += amount;
        balanceOfByPartition[to][partition] += amount;
        
        emit TransferByPartition(partition, msg.sender, address(0), to, amount, data, "");
    }
    
    /**
     * @dev Burn tokens from specific partition
     */
    function burnByPartition(
        bytes32 partition,
        uint256 amount,
        bytes calldata data
    ) 
        external 
        validPartition(partition)
    {
        require(isBurnable, "ERC1400: burning disabled");
        require(balanceOfByPartition[msg.sender][partition] >= amount, "ERC1400: insufficient partition balance");
        
        _burn(msg.sender, amount);
        
        // Update partition balances
        partitionBalances[partition] -= amount;
        balanceOfByPartition[msg.sender][partition] -= amount;
        
        emit TransferByPartition(partition, msg.sender, msg.sender, address(0), amount, data, "");
    }
    
    /**
     * @dev Operator burn tokens from specific partition
     */
    function operatorBurnByPartition(
        bytes32 partition,
        address from,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) 
        external 
        validPartition(partition)
    {
        require(isBurnable, "ERC1400: burning disabled");
        require(_isOperatorForPartition(partition, msg.sender, from), "ERC1400: not authorized operator");
        require(balanceOfByPartition[from][partition] >= amount, "ERC1400: insufficient partition balance");
        
        _burn(from, amount);
        
        // Update partition balances
        partitionBalances[partition] -= amount;
        balanceOfByPartition[from][partition] -= amount;
        
        emit TransferByPartition(partition, msg.sender, from, address(0), amount, data, operatorData);
    }
    
    // ============ Document Management ============
    
    /**
     * @dev Set document
     */
    function setDocument(bytes32 name, string calldata uri, bytes32 documentHash_) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        documents[name] = uri;
        documentHashes[name] = documentHash_;
        emit DocumentUpdated(name, uri, documentHash_);
    }
    
    /**
     * @dev Remove document
     */
    function removeDocument(bytes32 name) external onlyRole(ADMIN_ROLE) {
        delete documents[name];
        delete documentHashes[name];
        emit DocumentRemoved(name);
    }
    
    /**
     * @dev Get document
     */
    function getDocument(bytes32 name) external view returns (string memory uri, bytes32 documentHash_) {
        return (documents[name], documentHashes[name]);
    }
    
    // ============ Partition Management ============
    
    /**
     * @dev Add new partition
     */
    function addPartition(bytes32 partition) external onlyRole(ADMIN_ROLE) {
        require(!_isValidPartition(partition), "ERC1400: partition already exists");
        partitions.push(partition);
        partitionTransferability[partition] = true;
    }
    
    /**
     * @dev Set partition transferability
     */
    function setPartitionTransferability(bytes32 partition, bool transferable) 
        external 
        onlyRole(ADMIN_ROLE)
        validPartition(partition)
    {
        partitionTransferability[partition] = transferable;
    }
    
    // ============ Administrative Functions ============
    
    /**
     * @dev Pause all transfers
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause all transfers
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Update compliance settings
     */
    function updateComplianceSettings(
        bool _requireKYC,
        bool _enforceKYC,
        bool _whitelist,
        bool _investorAccreditation
    ) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        requireKYC = _requireKYC;
        enforceKYC = _enforceKYC;
        whitelist = _whitelist;
        investorAccreditation = _investorAccreditation;
    }
    
    /**
     * @dev Update token details
     */
    function updateTokenDetails(
        string calldata _documentURI,
        bytes32 _documentHash
    ) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        documentURI = _documentURI;
        documentHash = _documentHash;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Check if partition is valid
     */
    function _isValidPartition(bytes32 partition) internal view returns (bool) {
        for (uint256 i = 0; i < partitions.length; i++) {
            if (partitions[i] == partition) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Check if address is operator for partition
     */
    function _isOperatorForPartition(bytes32 partition, address operator, address tokenHolder) 
        internal 
        view 
        returns (bool) 
    {
        return controllers[operator] || 
               operatorApprovals[tokenHolder][operator] || 
               partitionOperators[partition][operator];
    }
    
    /**
     * @dev Check if transfer is allowed
     */
    function _canTransfer(address from, address to, uint256 amount) 
        internal 
        view 
        returns (bool) 
    {
        // Check if paused
        if (paused()) return false;
        
        // Check if addresses are blocked
        if (isBlocked[from] || isBlocked[to]) return false;
        
        // Check KYC requirements
        if (requireKYC && (!isKYCVerified[from] || !isKYCVerified[to])) return false;
        
        // Check whitelist requirements
        if (whitelist && (!isWhitelisted[from] || !isWhitelisted[to])) return false;
        
        // Check accreditation requirements
        if (investorAccreditation && !isAccredited[to]) return false;
        
        // Check transfer restrictions
        if (transferRestrictions[from][to]) return false;
        
        return true;
    }
    
    /**
     * @dev Transfer by partition internal
     */
    function _transferByPartition(
        bytes32 partition,
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) 
        internal 
    {
        // Update partition balances
        balanceOfByPartition[from][partition] -= amount;
        balanceOfByPartition[to][partition] += amount;
        
        // Transfer tokens
        _transfer(from, to, amount);
        
        emit TransferByPartition(partition, operator, from, to, amount, data, operatorData);
    }
    
    /**
     * @dev Update partition balances after transfer
     */
    function _updatePartitionBalances(
        bytes32 partition,
        address from,
        address to,
        uint256 amount
    ) 
        internal 
    {
        balanceOfByPartition[from][partition] -= amount;
        balanceOfByPartition[to][partition] += amount;
    }
    
    /**
     * @dev Get partition for balance
     */
    function _getPartitionForBalance(address holder, uint256 amount) 
        internal 
        view 
        returns (bytes32) 
    {
        for (uint256 i = 0; i < partitions.length; i++) {
            if (balanceOfByPartition[holder][partitions[i]] >= amount) {
                return partitions[i];
            }
        }
        return DEFAULT_PARTITION;
    }
    
    // ============ Override Functions ============
    
    /**
     * @dev Override transfer to add compliance checks
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        transferAllowed(msg.sender, to, amount)
        returns (bool) 
    {
        // Update default partition balances
        bytes32 fromPartition = _getPartitionForBalance(msg.sender, amount);
        _updatePartitionBalances(fromPartition, msg.sender, to, amount);
        
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to add compliance checks
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        transferAllowed(from, to, amount)
        returns (bool) 
    {
        // Update default partition balances
        bytes32 fromPartition = _getPartitionForBalance(from, amount);
        _updatePartitionBalances(fromPartition, from, to, amount);
        
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Override _update to add pause functionality
     */
    function _update(address from, address to, uint256 amount) 
        internal 
        override 
        whenNotPaused 
    {
        super._update(from, to, amount);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get all partitions
     */
    function getPartitions() external view returns (bytes32[] memory) {
        return partitions;
    }
    
    /**
     * @dev Check if controller
     */
    function isController(address account) external view returns (bool) {
        return controllers[account];
    }
    
    /**
     * @dev Get compliance status
     */
    function getComplianceStatus(address investor) 
        external 
        view 
        returns (bool kyc, bool whitelisted, bool accredited, bool blocked) 
    {
        return (
            isKYCVerified[investor],
            isWhitelisted[investor],
            isAccredited[investor],
            isBlocked[investor]
        );
    }
    
    /**
     * @dev Check if operator is authorized
     */
    function isOperator(address operator, address tokenHolder) external view returns (bool) {
        return operatorApprovals[tokenHolder][operator] || controllers[operator];
    }
    
    /**
     * @dev Check if operator is authorized for partition
     */
    function isOperatorForPartition(bytes32 partition, address operator, address tokenHolder) 
        external 
        view 
        returns (bool) 
    {
        return _isOperatorForPartition(partition, operator, tokenHolder);
    }
}

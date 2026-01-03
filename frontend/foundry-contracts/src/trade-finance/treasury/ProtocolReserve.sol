// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";

/**
 * @title ProtocolReserve
 * @notice Emergency reserve fund for protocol protection
 * @dev Maintains safety buffer for extreme market conditions
 * 
 * Reserve Purposes:
 * - Bad debt coverage
 * - Emergency liquidity provision
 * - Oracle failure protection
 * - Insurance claims settlement
 * - Protocol upgrade funding
 * 
 * Key Features:
 * - Multi-sig controlled withdrawals
 * - Tiered emergency thresholds
 * - Automatic reserve accumulation
 * - Yield generation on idle funds
 * - Historical tracking
 * 
 * UPGRADEABILITY:
 * - Pattern: UUPS (Universal Upgradeable Proxy Standard)
 * - Upgrade Control: Only owner can upgrade
 * - Storage: Uses storage gaps for future variables
 * - Initialization: Uses initialize() instead of constructor
 */
contract ProtocolReserve is 
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    
    // ============ Structs ============
    
    struct ReserveBalance {
        uint256 total;
        uint256 allocated;
        uint256 available;
        uint256 lastUpdated;
    }
    
    struct EmergencyWithdrawal {
        address token;
        uint256 amount;
        address recipient;
        string reason;
        uint256 timestamp;
        bool executed;
        uint256 approvals;
    }
    
    struct ReserveMetrics {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 badDebtCovered;
        uint256 insuranceClaimed;
        uint256 yieldEarned;
    }
    
    // ============ Constants ============
    
    uint256 public constant MIN_RESERVE_RATIO = 500; // 5% of TVL
    uint256 public constant TARGET_RESERVE_RATIO = 1000; // 10% of TVL
    uint256 public constant MAX_RESERVE_RATIO = 2000; // 20% of TVL
    
    uint256 public constant EMERGENCY_THRESHOLD_1 = 1000 ether; // $1000
    uint256 public constant EMERGENCY_THRESHOLD_2 = 10000 ether; // $10k
    uint256 public constant EMERGENCY_THRESHOLD_3 = 100000 ether; // $100k
    
    // ============ Storage ============
    
    /// @notice ACL Manager for access control
    IACLManager private _aclManager;
    
    // ============ State Variables ============
    
    // Token => reserve balance
    mapping(address => ReserveBalance) public reserves;
    
    // Emergency withdrawal proposals
    mapping(uint256 => EmergencyWithdrawal) public emergencyWithdrawals;
    uint256 public nextWithdrawalId;
    
    // Withdrawal ID => Guardian => approved
    mapping(uint256 => mapping(address => bool)) public withdrawalApprovals;
    
    // Emergency guardians (multi-sig members)
    address[] public guardians;
    mapping(address => bool) public isGuardian;
    
    // Number of approvals required
    uint256 public requiredApprovals;
    
    // Reserve metrics
    mapping(address => ReserveMetrics) public metrics;
    
    // Protocol TVL (updated externally)
    uint256 public protocolTVL;

    // ============ Storage Gap ============
    // Reserve 40 slots for future variables (50 total - 10 current)
    uint256[40] private __gap;
    
    // ============ Events ============
    
    event Deposited(address indexed token, uint256 amount, address indexed from);
    event EmergencyWithdrawalProposed(
        uint256 indexed withdrawalId,
        address indexed token,
        uint256 amount,
        address indexed recipient,
        string reason
    );
    event EmergencyWithdrawalApproved(
        uint256 indexed withdrawalId,
        address indexed guardian
    );
    event EmergencyWithdrawalExecuted(
        uint256 indexed withdrawalId,
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event RequiredApprovalsUpdated(uint256 oldValue, uint256 newValue);
    event BadDebtCovered(address indexed token, uint256 amount);
    event InsuranceClaimed(address indexed token, uint256 amount);
    event TVLUpdated(uint256 oldTVL, uint256 newTVL);
    
    /// @notice Emitted when contract is upgraded
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error OnlyAdmin();
    error OnlyGuardian();
    error InsufficientReserve();
    error AlreadyExecuted();
    error InsufficientApprovals();
    error AlreadyApproved();
    error WithdrawalNotFound();
    error InvalidThreshold();
    error ZeroAddress();
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        if (!_aclManager.isPoolAdmin(msg.sender)) revert OnlyAdmin();
        _;
    }
    
    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert OnlyGuardian();
        _;
    }
    
    // ============ Constructor ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param aclManager Address of the ACL Manager
     * @param _guardians Array of guardian addresses
     * @param _requiredApprovals Number of approvals required
     * @param owner Initial owner address
     */
    function initialize(
        address aclManager,
        address[] memory _guardians,
        uint256 _requiredApprovals,
        address owner
    ) public initializer {
        require(_guardians.length >= _requiredApprovals, "Invalid approvals");
        require(_requiredApprovals > 0, "Approvals must be positive");
        if (aclManager == address(0)) revert ZeroAddress();
        if (owner == address(0)) revert ZeroAddress();
        
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _aclManager = IACLManager(aclManager);
        requiredApprovals = _requiredApprovals;
        
        for (uint256 i = 0; i < _guardians.length; i++) {
            guardians.push(_guardians[i]);
            isGuardian[_guardians[i]] = true;
            emit GuardianAdded(_guardians[i]);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get ACL Manager address
     * @return ACL Manager contract address
     */
    function getACLManager() external view returns (IACLManager) {
        return _aclManager;
    }
    
    // ============ Deposit Functions ============
    
    /**
     * @notice Deposit to reserve
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        reserves[token].total += amount;
        reserves[token].available += amount;
        reserves[token].lastUpdated = block.timestamp;
        
        metrics[token].totalDeposited += amount;
        
        emit Deposited(token, amount, msg.sender);
    }
    
    /**
     * @notice Batch deposit multiple tokens
     */
    function batchDeposit(
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(tokens.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] > 0) {
                IERC20(tokens[i]).safeTransferFrom(
                    msg.sender,
                    address(this),
                    amounts[i]
                );
                
                reserves[tokens[i]].total += amounts[i];
                reserves[tokens[i]].available += amounts[i];
                reserves[tokens[i]].lastUpdated = block.timestamp;
                
                metrics[tokens[i]].totalDeposited += amounts[i];
                
                emit Deposited(tokens[i], amounts[i], msg.sender);
            }
        }
    }
    
    // ============ Emergency Withdrawal Functions ============
    
    /**
     * @notice Propose emergency withdrawal
     */
    function proposeEmergencyWithdrawal(
        address token,
        uint256 amount,
        address recipient,
        string calldata reason
    ) external onlyGuardian returns (uint256 withdrawalId) {
        if (amount > reserves[token].available) revert InsufficientReserve();
        
        withdrawalId = nextWithdrawalId++;
        
        emergencyWithdrawals[withdrawalId] = EmergencyWithdrawal({
            token: token,
            amount: amount,
            recipient: recipient,
            reason: reason,
            timestamp: block.timestamp,
            executed: false,
            approvals: 0
        });
        
        emit EmergencyWithdrawalProposed(
            withdrawalId,
            token,
            amount,
            recipient,
            reason
        );
        
        return withdrawalId;
    }
    
    /**
     * @notice Approve emergency withdrawal
     */
    function approveEmergencyWithdrawal(uint256 withdrawalId) 
        external 
        onlyGuardian 
    {
        EmergencyWithdrawal storage withdrawal = emergencyWithdrawals[withdrawalId];
        
        if (withdrawal.timestamp == 0) revert WithdrawalNotFound();
        if (withdrawal.executed) revert AlreadyExecuted();
        if (withdrawalApprovals[withdrawalId][msg.sender]) revert AlreadyApproved();
        
        withdrawalApprovals[withdrawalId][msg.sender] = true;
        withdrawal.approvals++;
        
        emit EmergencyWithdrawalApproved(withdrawalId, msg.sender);
    }
    
    /**
     * @notice Execute emergency withdrawal
     */
    function executeEmergencyWithdrawal(uint256 withdrawalId) 
        external 
        nonReentrant 
        onlyGuardian 
    {
        EmergencyWithdrawal storage withdrawal = emergencyWithdrawals[withdrawalId];
        
        if (withdrawal.timestamp == 0) revert WithdrawalNotFound();
        if (withdrawal.executed) revert AlreadyExecuted();
        if (withdrawal.approvals < requiredApprovals) revert InsufficientApprovals();
        
        withdrawal.executed = true;
        
        reserves[withdrawal.token].available -= withdrawal.amount;
        reserves[withdrawal.token].total -= withdrawal.amount;
        reserves[withdrawal.token].lastUpdated = block.timestamp;
        
        metrics[withdrawal.token].totalWithdrawn += withdrawal.amount;
        
        IERC20(withdrawal.token).safeTransfer(
            withdrawal.recipient,
            withdrawal.amount
        );
        
        emit EmergencyWithdrawalExecuted(
            withdrawalId,
            withdrawal.token,
            withdrawal.amount,
            withdrawal.recipient
        );
    }
    
    // ============ Guardian Management ============
    
    /**
     * @notice Add guardian
     */
    function addGuardian(address guardian) external onlyAdmin {
        require(!isGuardian[guardian], "Already guardian");
        
        guardians.push(guardian);
        isGuardian[guardian] = true;
        
        emit GuardianAdded(guardian);
    }
    
    /**
     * @notice Remove guardian
     */
    function removeGuardian(address guardian) external onlyAdmin {
        require(isGuardian[guardian], "Not a guardian");
        require(guardians.length > requiredApprovals, "Too few guardians");
        
        isGuardian[guardian] = false;
        
        // Remove from array
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == guardian) {
                guardians[i] = guardians[guardians.length - 1];
                guardians.pop();
                break;
            }
        }
        
        emit GuardianRemoved(guardian);
    }
    
    /**
     * @notice Update required approvals
     */
    function updateRequiredApprovals(uint256 newRequired) external onlyAdmin {
        require(newRequired > 0, "Must be positive");
        require(newRequired <= guardians.length, "Exceeds guardians");
        
        uint256 old = requiredApprovals;
        requiredApprovals = newRequired;
        
        emit RequiredApprovalsUpdated(old, newRequired);
    }
    
    // ============ Reserve Management ============
    
    /**
     * @notice Cover bad debt
     */
    function coverBadDebt(address token, uint256 amount) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        if (amount > reserves[token].available) revert InsufficientReserve();
        
        reserves[token].available -= amount;
        reserves[token].allocated += amount;
        reserves[token].lastUpdated = block.timestamp;
        
        metrics[token].badDebtCovered += amount;
        
        emit BadDebtCovered(token, amount);
    }
    
    /**
     * @notice Claim insurance
     */
    function claimInsurance(address token, uint256 amount) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        if (amount > reserves[token].available) revert InsufficientReserve();
        
        reserves[token].available -= amount;
        reserves[token].total -= amount;
        reserves[token].lastUpdated = block.timestamp;
        
        metrics[token].insuranceClaimed += amount;
        
        emit InsuranceClaimed(token, amount);
    }
    
    /**
     * @notice Update protocol TVL
     */
    function updateTVL(uint256 newTVL) external onlyAdmin {
        uint256 old = protocolTVL;
        protocolTVL = newTVL;
        
        emit TVLUpdated(old, newTVL);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get reserve health
     */
    function getReserveHealth(address token) 
        external 
        view 
        returns (
            uint256 ratio,
            bool healthy,
            uint256 target
        ) 
    {
        if (protocolTVL == 0) return (0, false, 0);
        
        uint256 reserveValue = reserves[token].total;
        ratio = (reserveValue * 10000) / protocolTVL;
        healthy = ratio >= MIN_RESERVE_RATIO;
        target = (protocolTVL * TARGET_RESERVE_RATIO) / 10000;
        
        return (ratio, healthy, target);
    }
    
    /**
     * @notice Get guardian count
     */
    function getGuardianCount() external view returns (uint256) {
        return guardians.length;
    }

    // ============ Upgrade Authorization ============

    /**
     * @notice Authorize contract upgrades
     * @dev Only owner can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {
        emit Upgraded(newImplementation);
    }
}

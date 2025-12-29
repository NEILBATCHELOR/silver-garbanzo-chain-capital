// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
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
 */
contract ProtocolReserve is ReentrancyGuard {
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
    
    // ============ Immutable Variables ============
    
    IACLManager public immutable ACL_MANAGER;
    
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
    
    // ============ Errors ============
    
    error OnlyAdmin();
    error OnlyGuardian();
    error InsufficientReserve();
    error AlreadyExecuted();
    error InsufficientApprovals();
    error AlreadyApproved();
    error WithdrawalNotFound();
    error InvalidThreshold();
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        if (!ACL_MANAGER.isPoolAdmin(msg.sender)) revert OnlyAdmin();
        _;
    }
    
    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert OnlyGuardian();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address aclManager,
        address[] memory _guardians,
        uint256 _requiredApprovals
    ) {
        require(_guardians.length >= _requiredApprovals, "Invalid approvals");
        require(_requiredApprovals > 0, "Approvals must be positive");
        
        ACL_MANAGER = IACLManager(aclManager);
        requiredApprovals = _requiredApprovals;
        
        for (uint256 i = 0; i < _guardians.length; i++) {
            guardians.push(_guardians[i]);
            isGuardian[_guardians[i]] = true;
            emit GuardianAdded(_guardians[i]);
        }
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
    ) external onlyGuardian returns (uint256) {
        if (reserves[token].available < amount) revert InsufficientReserve();
        
        uint256 withdrawalId = nextWithdrawalId++;
        
        emergencyWithdrawals[withdrawalId] = EmergencyWithdrawal({
            token: token,
            amount: amount,
            recipient: recipient,
            reason: reason,
            timestamp: block.timestamp,
            executed: false,
            approvals: 1
        });
        
        withdrawalApprovals[withdrawalId][msg.sender] = true;
        
        emit EmergencyWithdrawalProposed(
            withdrawalId,
            token,
            amount,
            recipient,
            reason
        );
        
        emit EmergencyWithdrawalApproved(withdrawalId, msg.sender);
        
        return withdrawalId;
    }
    
    /**
     * @notice Approve emergency withdrawal
     */
    function approveEmergencyWithdrawal(
        uint256 withdrawalId
    ) external onlyGuardian {
        EmergencyWithdrawal storage withdrawal = emergencyWithdrawals[withdrawalId];
        
        if (withdrawal.timestamp == 0) revert WithdrawalNotFound();
        if (withdrawal.executed) revert AlreadyExecuted();
        if (withdrawalApprovals[withdrawalId][msg.sender]) revert AlreadyApproved();
        
        withdrawalApprovals[withdrawalId][msg.sender] = true;
        withdrawal.approvals++;
        
        emit EmergencyWithdrawalApproved(withdrawalId, msg.sender);
        
        // Auto-execute if enough approvals
        if (withdrawal.approvals >= requiredApprovals) {
            _executeEmergencyWithdrawal(withdrawalId);
        }
    }
    
    /**
     * @notice Execute emergency withdrawal
     */
    function executeEmergencyWithdrawal(
        uint256 withdrawalId
    ) external nonReentrant onlyGuardian {
        _executeEmergencyWithdrawal(withdrawalId);
    }
    
    function _executeEmergencyWithdrawal(uint256 withdrawalId) internal {
        EmergencyWithdrawal storage withdrawal = emergencyWithdrawals[withdrawalId];
        
        if (withdrawal.executed) revert AlreadyExecuted();
        if (withdrawal.approvals < requiredApprovals) revert InsufficientApprovals();
        
        withdrawal.executed = true;
        
        reserves[withdrawal.token].available -= withdrawal.amount;
        reserves[withdrawal.token].allocated -= withdrawal.amount;
        
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
    
    // ============ Reserve Management Functions ============
    
    /**
     * @notice Cover bad debt from reserve
     */
    function coverBadDebt(
        address token,
        uint256 amount,
        address recipient
    ) external nonReentrant onlyAdmin {
        if (reserves[token].available < amount) revert InsufficientReserve();
        
        reserves[token].available -= amount;
        metrics[token].badDebtCovered += amount;
        
        IERC20(token).safeTransfer(recipient, amount);
        
        emit BadDebtCovered(token, amount);
    }
    
    /**
     * @notice Process insurance claim
     */
    function processInsuranceClaim(
        address token,
        uint256 amount,
        address claimant
    ) external nonReentrant onlyAdmin {
        if (reserves[token].available < amount) revert InsufficientReserve();
        
        reserves[token].available -= amount;
        metrics[token].insuranceClaimed += amount;
        
        IERC20(token).safeTransfer(claimant, amount);
        
        emit InsuranceClaimed(token, amount);
    }
    
    // ============ Admin Functions ============
    
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
        require(isGuardian[guardian], "Not guardian");
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
        require(newRequired <= guardians.length, "Too many required");
        
        uint256 oldRequired = requiredApprovals;
        requiredApprovals = newRequired;
        
        emit RequiredApprovalsUpdated(oldRequired, newRequired);
    }
    
    /**
     * @notice Update protocol TVL
     */
    function updateTVL(uint256 newTVL) external onlyAdmin {
        uint256 oldTVL = protocolTVL;
        protocolTVL = newTVL;
        
        emit TVLUpdated(oldTVL, newTVL);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get reserve balance
     */
    function getReserveBalance(address token)
        external
        view
        returns (
            uint256 total,
            uint256 allocated,
            uint256 available,
            uint256 lastUpdated
        )
    {
        ReserveBalance storage balance = reserves[token];
        return (
            balance.total,
            balance.allocated,
            balance.available,
            balance.lastUpdated
        );
    }
    
    /**
     * @notice Get reserve metrics
     */
    function getReserveMetrics(address token)
        external
        view
        returns (
            uint256 totalDeposited,
            uint256 totalWithdrawn,
            uint256 badDebtCovered,
            uint256 insuranceClaimed,
            uint256 yieldEarned
        )
    {
        ReserveMetrics storage m = metrics[token];
        return (
            m.totalDeposited,
            m.totalWithdrawn,
            m.badDebtCovered,
            m.insuranceClaimed,
            m.yieldEarned
        );
    }
    
    /**
     * @notice Get reserve ratio (reserve / TVL)
     */
    function getReserveRatio(address token) external view returns (uint256) {
        if (protocolTVL == 0) return 0;
        return (reserves[token].total * 10000) / protocolTVL;
    }
    
    /**
     * @notice Check if reserve is healthy
     */
    function isReserveHealthy(address token) external view returns (bool) {
        uint256 ratio = this.getReserveRatio(token);
        return ratio >= MIN_RESERVE_RATIO;
    }
    
    /**
     * @notice Get emergency withdrawal details
     */
    function getEmergencyWithdrawal(uint256 withdrawalId)
        external
        view
        returns (
            address token,
            uint256 amount,
            address recipient,
            string memory reason,
            uint256 timestamp,
            bool executed,
            uint256 approvals
        )
    {
        EmergencyWithdrawal storage withdrawal = emergencyWithdrawals[withdrawalId];
        return (
            withdrawal.token,
            withdrawal.amount,
            withdrawal.recipient,
            withdrawal.reason,
            withdrawal.timestamp,
            withdrawal.executed,
            withdrawal.approvals
        );
    }
    
    /**
     * @notice Get all guardians
     */
    function getGuardians() external view returns (address[] memory) {
        return guardians;
    }
    
    /**
     * @notice Check guardian approval status
     */
    function hasApproved(
        uint256 withdrawalId,
        address guardian
    ) external view returns (bool) {
        return withdrawalApprovals[withdrawalId][guardian];
    }
}

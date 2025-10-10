// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title UpgradeGovernance
 * @notice Multi-sig governance with timelock for beacon upgrades
 * @dev Prevents single-point-of-failure in upgrade process
 * 
 * Key Features:
 * - Proposal-based upgrades with timelock delay
 * - Multi-signature approval requirements
 * - Emergency pause mechanism
 * - Proposal cancellation by admin
 * - Event logging for transparency
 * 
 * Security Model:
 * - Minimum 2 approvers required (configurable)
 * - 2-day timelock delay (configurable)
 * - Proposals expire after 7 days if not executed
 * - Emergency pause stops all upgrades
 */
contract UpgradeGovernance is AccessControl, Pausable {
    // ============ Roles ============
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============ State Variables ============
    uint256 public timelockDelay;
    uint256 public proposalExpiryDelay;
    uint256 public minApprovers;
    uint256 private _proposalCounter;
    
    // ============ Structs ============
    struct UpgradeProposal {
        uint256 id;
        address beacon;
        address newImplementation;
        string description;
        address proposer;
        uint256 proposedAt;
        uint256 approvalCount;
        uint256 executionETA;
        bool executed;
        bool cancelled;
        mapping(address => bool) approvals;
    }
    
    // ============ Storage ============
    mapping(uint256 => UpgradeProposal) public proposals;
    mapping(address => uint256[]) public proposalsByBeacon;
    
    // ============ Events ============
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed beacon,
        address newImplementation,
        address proposer,
        uint256 executionETA
    );
    
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 approvalCount
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed beacon,
        address newImplementation
    );
    
    event ProposalCancelled(
        uint256 indexed proposalId,
        address indexed canceller
    );
    
    event TimelockDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event MinApproversUpdated(uint256 oldMin, uint256 newMin);
    
    // ============ Errors ============
    error ProposalNotFound();
    error ProposalAlreadyExecuted();
    error ProposalAlreadyCancelled();
    error ProposalNotApproved();
    error ProposalExpired();
    error TimelockNotMet();
    error AlreadyApproved();
    error InsufficientApprovals();
    error InvalidTimelockDelay();
    error InvalidMinApprovers();
    
    /**
     * @notice Constructor
     * @param admin Admin address (receives all roles initially)
     * @param _timelockDelay Delay before upgrade can be executed (seconds)
     * @param _minApprovers Minimum approvers required
     */
    constructor(
        address admin,
        uint256 _timelockDelay,
        uint256 _minApprovers
    ) {
        require(admin != address(0), "Invalid admin");
        require(_timelockDelay >= 1 days, "Timelock too short");
        require(_minApprovers >= 2, "Min approvers must be >= 2");
        
        timelockDelay = _timelockDelay;
        proposalExpiryDelay = 7 days;
        minApprovers = _minApprovers;
        
        // Grant all roles to admin initially
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PROPOSER_ROLE, admin);
        _grantRole(APPROVER_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }
    
    // ============ Upgrade Governance Functions ============
    
    /**
     * @notice Create upgrade proposal
     * @param beacon Beacon contract to upgrade
     * @param newImplementation New implementation address
     * @param description Human-readable description
     * @return proposalId Unique proposal ID
     */
    function proposeUpgrade(
        address beacon,
        address newImplementation,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) whenNotPaused returns (uint256) {
        require(beacon != address(0), "Invalid beacon");
        require(newImplementation != address(0), "Invalid implementation");
        
        uint256 proposalId = ++_proposalCounter;
        uint256 executionETA = block.timestamp + timelockDelay;
        
        UpgradeProposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.beacon = beacon;
        proposal.newImplementation = newImplementation;
        proposal.description = description;
        proposal.proposer = msg.sender;
        proposal.proposedAt = block.timestamp;
        proposal.executionETA = executionETA;
        proposal.approvalCount = 0;
        proposal.executed = false;
        proposal.cancelled = false;
        
        proposalsByBeacon[beacon].push(proposalId);
        
        emit ProposalCreated(
            proposalId,
            beacon,
            newImplementation,
            msg.sender,
            executionETA
        );
        
        return proposalId;
    }
    
    /**
     * @notice Approve upgrade proposal
     * @param proposalId Proposal to approve
     */
    function approveProposal(uint256 proposalId) 
        external 
        onlyRole(APPROVER_ROLE) 
        whenNotPaused 
    {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert ProposalNotFound();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.cancelled) revert ProposalAlreadyCancelled();
        if (proposal.approvals[msg.sender]) revert AlreadyApproved();
        
        proposal.approvals[msg.sender] = true;
        proposal.approvalCount++;
        
        emit ProposalApproved(proposalId, msg.sender, proposal.approvalCount);
    }
    
    /**
     * @notice Execute approved proposal after timelock
     * @param proposalId Proposal to execute
     */
    function executeProposal(uint256 proposalId) 
        external 
        onlyRole(EXECUTOR_ROLE) 
        whenNotPaused 
    {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert ProposalNotFound();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.cancelled) revert ProposalAlreadyCancelled();
        if (proposal.approvalCount < minApprovers) revert InsufficientApprovals();
        if (block.timestamp < proposal.executionETA) revert TimelockNotMet();
        if (block.timestamp > proposal.executionETA + proposalExpiryDelay) {
            revert ProposalExpired();
        }
        
        proposal.executed = true;
        
        // Execute upgrade on beacon (requires this contract to be beacon owner)
        (bool success, ) = proposal.beacon.call(
            abi.encodeWithSignature(
                "upgradeTo(address)",
                proposal.newImplementation
            )
        );
        require(success, "Upgrade failed");
        
        emit ProposalExecuted(
            proposalId,
            proposal.beacon,
            proposal.newImplementation
        );
    }
    
    /**
     * @notice Cancel proposal (admin only)
     * @param proposalId Proposal to cancel
     */
    function cancelProposal(uint256 proposalId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert ProposalNotFound();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.cancelled) revert ProposalAlreadyCancelled();
        
        proposal.cancelled = true;
        
        emit ProposalCancelled(proposalId, msg.sender);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update timelock delay
     * @param newDelay New delay in seconds (min 1 day)
     */
    function setTimelockDelay(uint256 newDelay) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newDelay < 1 days) revert InvalidTimelockDelay();
        
        uint256 oldDelay = timelockDelay;
        timelockDelay = newDelay;
        
        emit TimelockDelayUpdated(oldDelay, newDelay);
    }
    
    /**
     * @notice Update minimum approvers requirement
     * @param newMin New minimum (must be >= 2)
     */
    function setMinApprovers(uint256 newMin) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newMin < 2) revert InvalidMinApprovers();
        
        uint256 oldMin = minApprovers;
        minApprovers = newMin;
        
        emit MinApproversUpdated(oldMin, newMin);
    }
    
    /**
     * @notice Emergency pause all upgrades
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause upgrades
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if proposal is approved by address
     * @param proposalId Proposal ID
     * @param approver Address to check
     * @return True if approved
     */
    function hasApproved(uint256 proposalId, address approver) 
        external 
        view 
        returns (bool) 
    {
        return proposals[proposalId].approvals[approver];
    }
    
    /**
     * @notice Get proposal details
     * @param proposalId Proposal ID
     * @return id Proposal ID
     * @return beacon Beacon address
     * @return newImplementation New implementation address
     * @return description Proposal description
     * @return proposer Address that created proposal
     * @return proposedAt Timestamp when proposed
     * @return approvalCount Number of approvals
     * @return executionETA Earliest execution time
     * @return executed Whether proposal was executed
     * @return cancelled Whether proposal was cancelled
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        returns (
            uint256 id,
            address beacon,
            address newImplementation,
            string memory description,
            address proposer,
            uint256 proposedAt,
            uint256 approvalCount,
            uint256 executionETA,
            bool executed,
            bool cancelled
        ) 
    {
        UpgradeProposal storage p = proposals[proposalId];
        return (
            p.id,
            p.beacon,
            p.newImplementation,
            p.description,
            p.proposer,
            p.proposedAt,
            p.approvalCount,
            p.executionETA,
            p.executed,
            p.cancelled
        );
    }
    
    /**
     * @notice Get all proposals for a beacon
     * @param beacon Beacon address
     * @return Array of proposal IDs
     */
    function getProposalsByBeacon(address beacon) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return proposalsByBeacon[beacon];
    }
    
    /**
     * @notice Check if proposal can be executed
     * @param proposalId Proposal ID
     * @return executable True if executable
     * @return reason Reason if not executable
     */
    function canExecute(uint256 proposalId) 
        external 
        view 
        returns (bool executable, string memory reason) 
    {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) return (false, "Proposal not found");
        if (proposal.executed) return (false, "Already executed");
        if (proposal.cancelled) return (false, "Cancelled");
        if (paused()) return (false, "Contract paused");
        if (proposal.approvalCount < minApprovers) {
            return (false, "Insufficient approvals");
        }
        if (block.timestamp < proposal.executionETA) {
            return (false, "Timelock not met");
        }
        if (block.timestamp > proposal.executionETA + proposalExpiryDelay) {
            return (false, "Proposal expired");
        }
        
        return (true, "");
    }
}

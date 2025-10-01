// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title UpgradeGovernor
 * @notice Multi-signature governance for UUPS upgrades
 * @dev Requires multiple approvals before executing upgrades
 * 
 * Features:
 * - Multi-sig approval system (configurable threshold)
 * - Proposal creation and voting
 * - Time-lock support (optional)
 * - Role-based access control
 * 
 * Usage:
 * 1. Upgrader creates proposal
 * 2. Other upgraders approve
 * 3. Once threshold met, upgrade executes
 */
contract UpgradeGovernor is AccessControl {
    // ============ Roles ============
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    uint256 public proposalCount;
    uint256 public requiredApprovals;
    uint256 public timeLockDuration; // Optional time lock in seconds
    
    // ============ Structs ============
    struct UpgradeProposal {
        address target;              // Contract to upgrade
        address newImplementation;   // New implementation address
        bytes data;                  // Optional initialization data
        uint256 approvals;           // Current approval count
        uint256 proposedAt;          // Timestamp of proposal
        uint256 executedAt;          // Timestamp of execution (0 if not executed)
        bool executed;               // Whether proposal was executed
        string description;          // Human-readable description
    }
    
    // ============ Storage ============
    mapping(uint256 => UpgradeProposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    
    // ============ Events ============
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed target,
        address indexed newImplementation,
        address proposer,
        string description
    );
    
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 totalApprovals
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed target,
        address indexed newImplementation
    );
    
    event ProposalCancelled(uint256 indexed proposalId);
    
    event RequiredApprovalsChanged(uint256 oldValue, uint256 newValue);
    event TimeLockDurationChanged(uint256 oldValue, uint256 newValue);
    
    // ============ Errors ============
    error ProposalAlreadyExecuted(uint256 proposalId);
    error ProposalNotFound(uint256 proposalId);
    error AlreadyApproved(uint256 proposalId, address approver);
    error InsufficientApprovals(uint256 proposalId, uint256 current, uint256 required);
    error TimeLockActive(uint256 proposalId, uint256 unlockTime);
    error UpgradeFailed(uint256 proposalId, string reason);
    error InvalidRequiredApprovals(uint256 value);
    
    // ============ Constructor ============
    /**
     * @notice Initialize the governor
     * @param upgraders Array of addresses with upgrade rights
     * @param _requiredApprovals Number of approvals needed (default: 2)
     * @param _timeLockDuration Time lock in seconds (0 for no lock)
     */
    constructor(
        address[] memory upgraders,
        uint256 _requiredApprovals,
        uint256 _timeLockDuration
    ) {
        require(upgraders.length > 0, "No upgraders provided");
        require(_requiredApprovals > 0 && _requiredApprovals <= upgraders.length, "Invalid approval count");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        for (uint i = 0; i < upgraders.length; i++) {
            _grantRole(UPGRADER_ROLE, upgraders[i]);
        }
        
        requiredApprovals = _requiredApprovals;
        timeLockDuration = _timeLockDuration;
    }

    
    // ============ Proposal Functions ============
    
    /**
     * @notice Create a new upgrade proposal
     * @param target Contract to upgrade
     * @param newImplementation New implementation address
     * @param data Optional initialization data
     * @param description Human-readable description
     * @return proposalId The ID of the created proposal
     */
    function proposeUpgrade(
        address target,
        address newImplementation,
        bytes memory data,
        string memory description
    ) external onlyRole(UPGRADER_ROLE) returns (uint256 proposalId) {
        require(target != address(0), "Invalid target");
        require(newImplementation != address(0), "Invalid implementation");
        
        proposalId = proposalCount++;
        
        proposals[proposalId] = UpgradeProposal({
            target: target,
            newImplementation: newImplementation,
            data: data,
            approvals: 1,
            proposedAt: block.timestamp,
            executedAt: 0,
            executed: false,
            description: description
        });
        
        hasApproved[proposalId][msg.sender] = true;
        
        emit ProposalCreated(
            proposalId,
            target,
            newImplementation,
            msg.sender,
            description
        );
        
        emit ProposalApproved(proposalId, msg.sender, 1);
        
        return proposalId;
    }
    
    /**
     * @notice Approve an existing proposal
     * @param proposalId ID of the proposal to approve
     */
    function approveProposal(uint256 proposalId) external onlyRole(UPGRADER_ROLE) {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.proposedAt == 0) revert ProposalNotFound(proposalId);
        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);
        if (hasApproved[proposalId][msg.sender]) {
            revert AlreadyApproved(proposalId, msg.sender);
        }
        
        hasApproved[proposalId][msg.sender] = true;
        proposal.approvals++;
        
        emit ProposalApproved(proposalId, msg.sender, proposal.approvals);
        
        // Auto-execute if threshold met and no time lock
        if (proposal.approvals >= requiredApprovals && timeLockDuration == 0) {
            _executeUpgrade(proposalId);
        }
    }

    
    /**
     * @notice Execute an approved proposal (after time lock if applicable)
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external onlyRole(UPGRADER_ROLE) {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.proposedAt == 0) revert ProposalNotFound(proposalId);
        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);
        
        if (proposal.approvals < requiredApprovals) {
            revert InsufficientApprovals(proposalId, proposal.approvals, requiredApprovals);
        }
        
        // Check time lock
        if (timeLockDuration > 0) {
            uint256 unlockTime = proposal.proposedAt + timeLockDuration;
            if (block.timestamp < unlockTime) {
                revert TimeLockActive(proposalId, unlockTime);
            }
        }
        
        _executeUpgrade(proposalId);
    }
    
    /**
     * @notice Internal function to execute the upgrade
     * @param proposalId ID of the proposal
     */
    function _executeUpgrade(uint256 proposalId) internal {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        proposal.executed = true;
        proposal.executedAt = block.timestamp;
        
        // Call upgradeToAndCall on the target contract
        (bool success, bytes memory returnData) = proposal.target.call(
            abi.encodeWithSelector(
                UUPSUpgradeable.upgradeToAndCall.selector,
                proposal.newImplementation,
                proposal.data
            )
        );
        
        if (!success) {
            string memory reason = _getRevertMsg(returnData);
            revert UpgradeFailed(proposalId, reason);
        }
        
        emit ProposalExecuted(proposalId, proposal.target, proposal.newImplementation);
    }
    
    /**
     * @notice Cancel a proposal (admin only)
     * @param proposalId ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.proposedAt == 0) revert ProposalNotFound(proposalId);
        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);
        
        // Mark as executed to prevent further actions
        proposal.executed = true;
        
        emit ProposalCancelled(proposalId);
    }

    
    // ============ View Functions ============
    
    /**
     * @notice Get proposal details
     * @param proposalId ID of the proposal
     * @return Proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (UpgradeProposal memory) {
        return proposals[proposalId];
    }
    
    /**
     * @notice Check if address has approved a proposal
     * @param proposalId ID of the proposal
     * @param approver Address to check
     * @return True if approved
     */
    function hasApprovedProposal(uint256 proposalId, address approver) external view returns (bool) {
        return hasApproved[proposalId][approver];
    }
    
    /**
     * @notice Check if proposal can be executed
     * @param proposalId ID of the proposal
     * @return canExecute True if ready to execute
     * @return reason Reason if not ready
     */
    function canExecuteProposal(uint256 proposalId) external view returns (bool canExecute, string memory reason) {
        UpgradeProposal storage proposal = proposals[proposalId];
        
        if (proposal.proposedAt == 0) {
            return (false, "Proposal not found");
        }
        
        if (proposal.executed) {
            return (false, "Already executed");
        }
        
        if (proposal.approvals < requiredApprovals) {
            return (false, "Insufficient approvals");
        }
        
        if (timeLockDuration > 0) {
            uint256 unlockTime = proposal.proposedAt + timeLockDuration;
            if (block.timestamp < unlockTime) {
                return (false, "Time lock active");
            }
        }
        
        return (true, "");
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update required approvals
     * @param newRequiredApprovals New threshold
     */
    function setRequiredApprovals(uint256 newRequiredApprovals) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newRequiredApprovals == 0) revert InvalidRequiredApprovals(newRequiredApprovals);
        
        emit RequiredApprovalsChanged(requiredApprovals, newRequiredApprovals);
        requiredApprovals = newRequiredApprovals;
    }

    
    /**
     * @notice Update time lock duration
     * @param newTimeLockDuration New duration in seconds
     */
    function setTimeLockDuration(uint256 newTimeLockDuration) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        emit TimeLockDurationChanged(timeLockDuration, newTimeLockDuration);
        timeLockDuration = newTimeLockDuration;
    }
    
    // ============ Utility Functions ============
    
    /**
     * @notice Extract revert message from return data
     * @param returnData Bytes returned from failed call
     * @return reason Revert message string
     */
    function _getRevertMsg(bytes memory returnData) internal pure returns (string memory reason) {
        // If the returnData length is less than 68, then the transaction failed silently
        if (returnData.length < 68) return "Transaction reverted silently";
        
        assembly {
            // Slice the sighash (first 4 bytes)
            returnData := add(returnData, 0x04)
        }
        
        return abi.decode(returnData, (string));
    }
}

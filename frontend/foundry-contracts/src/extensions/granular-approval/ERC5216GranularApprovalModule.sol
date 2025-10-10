// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IERC5216.sol";
import "./storage/GranularApprovalStorage.sol";

/**
 * @title ERC5216GranularApprovalModule
 * @notice Extension module for ERC-5216 granular approvals on ERC-1155 tokens
 * @dev Adds per-token-ID approval mechanism to ERC-1155
 * 
 * Standard ERC-1155 only has setApprovalForAll (all-or-nothing).
 * This module adds granular approvals for specific token IDs and amounts.
 * 
 * Gas costs: ~3,000 gas per approval operation
 */
contract ERC5216GranularApprovalModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC5216
{
    using GranularApprovalStorage for GranularApprovalStorage.Layout;

    /// @notice Role for contract upgrades
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /**
     * @notice Emitted when the module is initialized
     * @param tokenContract The address of the parent token contract
     */
    event ModuleInitialized(address indexed tokenContract);

    /**
     * @notice Emitted when approvals are enabled/disabled
     * @param enabled The new enabled status
     */
    event ApprovalsEnabledChanged(bool enabled);

    /**
     * @notice Emitted when allowances are decreased
     * @param owner The token owner
     * @param spender The approved spender
     * @param id The token ID
     * @param previousAmount The previous allowance
     * @param newAmount The new allowance
     */
    event ApprovalDecreased(
        address indexed owner,
        address indexed spender,
        uint256 indexed id,
        uint256 previousAmount,
        uint256 newAmount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the module
     * @param tokenContract_ Address of the parent ERC-1155 token contract
     * @param admin_ Address to receive admin role
     */
    function initialize(
        address tokenContract_,
        address admin_
    ) public initializer {
        require(tokenContract_ != address(0), "Invalid token contract");
        require(admin_ != address(0), "Invalid admin");

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        s.tokenContract = tokenContract_;
        s.enabled = true;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);

        emit ModuleInitialized(tokenContract_);
    }

    /**
     * @notice Approve specific amount of specific token ID
     * @dev Allows spender to transfer up to amount of tokenId from msg.sender
     * @param spender Address to approve
     * @param id Token ID to approve
     * @param amount Amount to approve
     */
    function approve(
        address spender,
        uint256 id,
        uint256 amount
    ) external override nonReentrant {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        require(s.enabled, "Approvals disabled");
        require(spender != address(0), "Invalid spender");
        require(spender != msg.sender, "Cannot approve self");

        s.allowances[msg.sender][spender][id] = amount;

        emit ApprovalValue(msg.sender, spender, id, amount);
    }

    /**
     * @notice Get approved amount for specific token ID
     * @param owner Token owner address
     * @param spender Approved spender address  
     * @param id Token ID
     * @return amount The approved amount
     */
    function allowance(
        address owner,
        address spender,
        uint256 id
    ) external view override returns (uint256 amount) {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        return s.allowances[owner][spender][id];
    }

    /**
     * @notice Increase allowance for specific token ID
     * @param spender Address to approve
     * @param id Token ID
     * @param addedValue Amount to add to current allowance
     */
    function increaseAllowance(
        address spender,
        uint256 id,
        uint256 addedValue
    ) external nonReentrant {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        require(s.enabled, "Approvals disabled");
        require(spender != address(0), "Invalid spender");

        uint256 currentAllowance = s.allowances[msg.sender][spender][id];
        uint256 newAllowance = currentAllowance + addedValue;
        
        s.allowances[msg.sender][spender][id] = newAllowance;

        emit ApprovalValue(msg.sender, spender, id, newAllowance);
    }

    /**
     * @notice Decrease allowance for specific token ID
     * @param spender Address whose approval to decrease
     * @param id Token ID
     * @param subtractedValue Amount to subtract from current allowance
     */
    function decreaseAllowance(
        address spender,
        uint256 id,
        uint256 subtractedValue
    ) external nonReentrant {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        require(s.enabled, "Approvals disabled");
        require(spender != address(0), "Invalid spender");

        uint256 currentAllowance = s.allowances[msg.sender][spender][id];
        require(currentAllowance >= subtractedValue, "Insufficient allowance");

        uint256 newAllowance = currentAllowance - subtractedValue;
        s.allowances[msg.sender][spender][id] = newAllowance;

        emit ApprovalDecreased(msg.sender, spender, id, currentAllowance, newAllowance);
        emit ApprovalValue(msg.sender, spender, id, newAllowance);
    }

    /**
     * @notice Consume allowance during transfer
     * @dev Called by parent token contract during safeTransferFrom
     * @param owner Token owner whose allowance to consume
     * @param spender Address consuming the allowance
     * @param id Token ID
     * @param amount Amount to consume
     * @return success Whether consumption was successful
     * @return remaining Remaining allowance after consumption
     */
    function consumeAllowance(
        address owner,
        address spender,
        uint256 id,
        uint256 amount
    ) external nonReentrant returns (bool success, uint256 remaining) {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        
        // Only parent token contract can consume allowances
        require(msg.sender == s.tokenContract, "Only token contract");
        require(s.enabled, "Approvals disabled");

        uint256 currentAllowance = s.allowances[owner][spender][id];
        
        // If no specific allowance, return false (fall back to operator approval)
        if (currentAllowance == 0) {
            return (false, 0);
        }

        // Check if sufficient allowance
        if (currentAllowance < amount) {
            return (false, currentAllowance);
        }

        // Consume allowance
        uint256 newAllowance = currentAllowance - amount;
        s.allowances[owner][spender][id] = newAllowance;

        emit ApprovalValue(owner, spender, id, newAllowance);
        
        return (true, newAllowance);
    }

    /**
     * @notice Enable or disable granular approvals
     * @dev Can only be called by admin
     * @param enabled Whether to enable approvals
     */
    function setApprovalsEnabled(bool enabled) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        s.enabled = enabled;
        emit ApprovalsEnabledChanged(enabled);
    }

    /**
     * @notice Get the parent token contract address
     * @return address The token contract
     */
    function getTokenContract() external view returns (address) {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        return s.tokenContract;
    }

    /**
     * @notice Check if approvals are enabled
     * @return bool Whether approvals are enabled
     */
    function isEnabled() external view returns (bool) {
        GranularApprovalStorage.Layout storage s = GranularApprovalStorage.layout();
        return s.enabled;
    }

    /**
     * @notice Check if this contract supports an interface
     * @param interfaceId The interface identifier
     * @return bool Whether the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControlUpgradeable) 
        returns (bool) 
    {
        return 
            interfaceId == type(IERC5216).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Authorize contract upgrades
     * @dev Only UPGRADER_ROLE can upgrade
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

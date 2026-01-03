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
 * @title RevenueSplitter
 * @notice Automated revenue distribution to multiple beneficiaries
 * @dev Handles proportional distribution of protocol revenue
 * 
 * Revenue Recipients:
 * - Protocol Treasury (40%)
 * - Team / Development (20%)
 * - Insurance Reserve (20%)
 * - Liquidity Mining Rewards (15%)
 * - Operations / Marketing (5%)
 * 
 * Key Features:
 * - Proportional distribution based on shares
 * - Multi-token support
 * - Batch distribution optimization
 * - Pull payment pattern for gas efficiency
 * - Historical tracking
 * 
 * UPGRADEABILITY:
 * - Pattern: UUPS (Universal Upgradeable Proxy Standard)
 * - Upgrade Control: Only owner can upgrade
 * - Storage: Uses storage gaps for future variables
 * - Initialization: Uses initialize() instead of constructor
 */
contract RevenueSplitter is 
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    
    // ============ Structs ============
    
    struct Beneficiary {
        address payable account;
        uint256 shares;
        uint256 released;
    }
    
    struct TokenDistribution {
        uint256 totalReleased;
        uint256 totalReceived;
        mapping(address => uint256) released;
    }
    
    // ============ Storage ============
    
    /// @notice ACL Manager for access control
    IACLManager private _aclManager;
    
    // ============ State Variables ============
    
    // Beneficiary accounts
    Beneficiary[] private _beneficiaries;
    
    // Total shares across all beneficiaries
    uint256 private _totalShares;
    
    // Token => distribution data
    mapping(address => TokenDistribution) private _tokenDistributions;
    
    // Account => index in beneficiaries array
    mapping(address => uint256) private _beneficiaryIndex;
    
    // Whether an account is a beneficiary
    mapping(address => bool) private _isBeneficiary;

    // ============ Storage Gap ============
    // Reserve 44 slots for future variables (50 total - 6 current)
    uint256[44] private __gap;
    
    // ============ Events ============
    
    event BeneficiaryAdded(address indexed account, uint256 shares);
    event BeneficiaryRemoved(address indexed account);
    event BeneficiaryUpdated(address indexed account, uint256 oldShares, uint256 newShares);
    event PaymentReleased(address indexed to, address indexed token, uint256 amount);
    event PaymentReceived(address indexed from, uint256 amount);
    
    /// @notice Emitted when contract is upgraded
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error OnlyAdmin();
    error InvalidShares();
    error NoBeneficiaries();
    error AlreadyBeneficiary();
    error NotBeneficiary();
    error NoPaymentDue();
    error ZeroAddress();
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        if (!_aclManager.isPoolAdmin(msg.sender)) revert OnlyAdmin();
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
     * @param accounts Array of beneficiary addresses
     * @param shares Array of share amounts
     * @param owner Initial owner address
     */
    function initialize(
        address aclManager,
        address[] memory accounts,
        uint256[] memory shares,
        address owner
    ) public initializer {
        require(accounts.length == shares.length, "Length mismatch");
        require(accounts.length > 0, "No beneficiaries");
        if (aclManager == address(0)) revert ZeroAddress();
        if (owner == address(0)) revert ZeroAddress();
        
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _aclManager = IACLManager(aclManager);
        
        for (uint256 i = 0; i < accounts.length; i++) {
            _addBeneficiary(payable(accounts[i]), shares[i]);
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
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add new beneficiary
     */
    function addBeneficiary(
        address payable account,
        uint256 shares
    ) external onlyAdmin {
        _addBeneficiary(account, shares);
    }
    
    /**
     * @notice Remove beneficiary
     */
    function removeBeneficiary(address account) external onlyAdmin {
        if (!_isBeneficiary[account]) revert NotBeneficiary();
        
        uint256 idx = _beneficiaryIndex[account];
        uint256 shares = _beneficiaries[idx].shares;
        
        // Move last beneficiary to removed position
        uint256 lastIdx = _beneficiaries.length - 1;
        if (idx != lastIdx) {
            Beneficiary storage lastBeneficiary = _beneficiaries[lastIdx];
            _beneficiaries[idx] = lastBeneficiary;
            _beneficiaryIndex[lastBeneficiary.account] = idx;
        }
        
        _beneficiaries.pop();
        delete _beneficiaryIndex[account];
        delete _isBeneficiary[account];
        
        _totalShares -= shares;
        
        emit BeneficiaryRemoved(account);
    }
    
    /**
     * @notice Update beneficiary shares
     */
    function updateBeneficiary(
        address account,
        uint256 newShares
    ) external onlyAdmin {
        if (!_isBeneficiary[account]) revert NotBeneficiary();
        if (newShares == 0) revert InvalidShares();
        
        uint256 idx = _beneficiaryIndex[account];
        uint256 oldShares = _beneficiaries[idx].shares;
        
        _totalShares = _totalShares - oldShares + newShares;
        _beneficiaries[idx].shares = newShares;
        
        emit BeneficiaryUpdated(account, oldShares, newShares);
    }
    
    // ============ Distribution Functions ============
    
    /**
     * @notice Release payment for ERC20 token
     */
    function release(address token, address account) external nonReentrant {
        if (!_isBeneficiary[account]) revert NotBeneficiary();
        
        uint256 payment = _pendingPayment(token, account);
        if (payment == 0) revert NoPaymentDue();
        
        uint256 idx = _beneficiaryIndex[account];
        _beneficiaries[idx].released += payment;
        _tokenDistributions[token].released[account] += payment;
        _tokenDistributions[token].totalReleased += payment;
        
        IERC20(token).safeTransfer(account, payment);
        emit PaymentReleased(account, token, payment);
    }
    
    /**
     * @notice Batch release for multiple tokens
     */
    function batchRelease(
        address[] calldata tokens,
        address account
    ) external nonReentrant {
        if (!_isBeneficiary[account]) revert NotBeneficiary();
        
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 payment = _pendingPayment(tokens[i], account);
            
            if (payment > 0) {
                uint256 idx = _beneficiaryIndex[account];
                _beneficiaries[idx].released += payment;
                _tokenDistributions[tokens[i]].released[account] += payment;
                _tokenDistributions[tokens[i]].totalReleased += payment;
                
                IERC20(tokens[i]).safeTransfer(account, payment);
                emit PaymentReleased(account, tokens[i], payment);
            }
        }
    }
    
    /**
     * @notice Distribute to all beneficiaries (admin function)
     */
    function distributeAll(address token) external nonReentrant onlyAdmin {
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            address account = _beneficiaries[i].account;
            uint256 payment = _pendingPayment(token, account);
            
            if (payment > 0) {
                _beneficiaries[i].released += payment;
                _tokenDistributions[token].released[account] += payment;
                _tokenDistributions[token].totalReleased += payment;
                
                IERC20(token).safeTransfer(account, payment);
                emit PaymentReleased(account, token, payment);
            }
        }
    }
    
    // ============ Internal Functions ============
    
    function _addBeneficiary(
        address payable account,
        uint256 shares
    ) internal {
        require(account != address(0), "Invalid account");
        require(shares > 0, "Shares must be positive");
        if (_isBeneficiary[account]) revert AlreadyBeneficiary();
        
        _beneficiaries.push(Beneficiary({
            account: account,
            shares: shares,
            released: 0
        }));
        
        _beneficiaryIndex[account] = _beneficiaries.length - 1;
        _isBeneficiary[account] = true;
        _totalShares += shares;
        
        emit BeneficiaryAdded(account, shares);
    }
    
    function _pendingPayment(
        address token,
        address account
    ) internal view returns (uint256) {
        if (!_isBeneficiary[account]) return 0;
        
        uint256 totalReceived = IERC20(token).balanceOf(address(this)) +
            _tokenDistributions[token].totalReleased;
        
        uint256 idx = _beneficiaryIndex[account];
        uint256 shares = _beneficiaries[idx].shares;
        
        uint256 totalPayment = (totalReceived * shares) / _totalShares;
        uint256 alreadyReleased = _tokenDistributions[token].released[account];
        
        return totalPayment > alreadyReleased ? 
            totalPayment - alreadyReleased : 0;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get beneficiary info
     */
    function beneficiary(address account)
        external
        view
        returns (
            address payable beneficiaryAccount,
            uint256 shares,
            uint256 releasedAmount
        )
    {
        if (!_isBeneficiary[account]) revert NotBeneficiary();
        
        uint256 idx = _beneficiaryIndex[account];
        Beneficiary storage b = _beneficiaries[idx];
        return (b.account, b.shares, b.released);
    }
    
    /**
     * @notice Get all beneficiaries
     */
    function getBeneficiaries() 
        external 
        view 
        returns (address[] memory accounts, uint256[] memory shares) 
    {
        uint256 length = _beneficiaries.length;
        accounts = new address[](length);
        shares = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            accounts[i] = _beneficiaries[i].account;
            shares[i] = _beneficiaries[i].shares;
        }
    }
    
    /**
     * @notice Get total shares
     */
    function totalShares() external view returns (uint256) {
        return _totalShares;
    }
    
    /**
     * @notice Get pending payment for token
     */
    function pendingPayment(
        address token,
        address account
    ) external view returns (uint256) {
        return _pendingPayment(token, account);
    }
    
    /**
     * @notice Get released amount for token
     */
    function released(
        address token,
        address account
    ) external view returns (uint256) {
        return _tokenDistributions[token].released[account];
    }
    
    /**
     * @notice Get total released for token
     */
    function totalReleased(address token) external view returns (uint256) {
        return _tokenDistributions[token].totalReleased;
    }
    
    // ============ Receive Function ============
    
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
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

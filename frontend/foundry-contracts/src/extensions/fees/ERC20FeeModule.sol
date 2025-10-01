// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IERC20FeeModule.sol";
import "./storage/FeeStorage.sol";

/**
 * @title ERC20FeeModule
 * @notice Modular fee management for token transfers
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Use Cases:
 * - Platform revenue generation
 * - Anti-whale mechanisms
 * - DeFi protocol fees
 * - Dynamic fee structures
 */
contract ERC20FeeModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC20FeeModule,
    FeeStorage
{
    // ============ Constants ============
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    uint256 public constant MAX_FEE_BASIS_POINTS = 1000; // 10% maximum
    uint256 public constant BASIS_POINTS_DIVISOR = 10000; // 100% = 10000 basis points
    
    // Reference to token contract
    address public tokenContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize fee module
     * @param admin Admin address
     * @param token Token contract address
     * @param feeRecipient Initial fee recipient
     * @param initialFeeBasisPoints Initial fee (basis points)
     */
    function initialize(
        address admin,
        address token,
        address feeRecipient,
        uint256 initialFeeBasisPoints
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        if (feeRecipient == address(0)) revert InvalidFeeRecipient();
        if (initialFeeBasisPoints > MAX_FEE_BASIS_POINTS) revert FeeExceedsMaximum();
        
        tokenContract = token;
        _feeConfig.feeRecipient = feeRecipient;
        _feeConfig.transferFee = initialFeeBasisPoints;
        _feeConfig.maxFee = 0; // 0 = no cap
        _feeConfig.enabled = true;
    }
    
    // ============ Fee Configuration ============
    
    function setTransferFee(uint256 basisPoints) external override onlyRole(FEE_MANAGER_ROLE) {
        if (basisPoints > MAX_FEE_BASIS_POINTS) revert FeeExceedsMaximum();
        _feeConfig.transferFee = basisPoints;
        emit TransferFeeUpdated(basisPoints);
    }
    
    function setMaxFee(uint256 maxFee) external override onlyRole(FEE_MANAGER_ROLE) {
        _feeConfig.maxFee = maxFee;
        emit MaxFeeUpdated(maxFee);
    }
    
    function setFeeRecipient(address recipient) external override onlyRole(FEE_MANAGER_ROLE) {
        if (recipient == address(0)) revert InvalidFeeRecipient();
        _feeConfig.feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }
    
    function setFeeEnabled(bool enabled) external override onlyRole(FEE_MANAGER_ROLE) {
        _feeConfig.enabled = enabled;
    }
    
    // ============ Fee Calculation ============
    
    function calculateFee(uint256 amount) public view override returns (uint256) {
        if (!_feeConfig.enabled || amount == 0) return 0;
        
        uint256 fee = (amount * _feeConfig.transferFee) / BASIS_POINTS_DIVISOR;
        
        // Apply max fee cap if set
        if (_feeConfig.maxFee > 0 && fee > _feeConfig.maxFee) {
            fee = _feeConfig.maxFee;
        }
        
        return fee;
    }
    
    function calculateFeeAndNet(uint256 amount) 
        external 
        view 
        override 
        returns (uint256 feeAmount, uint256 netAmount) 
    {
        feeAmount = calculateFee(amount);
        netAmount = amount - feeAmount;
    }
    
    // ============ Fee Exemptions ============
    
    function exemptFromFees(address account, string memory reason) 
        external 
        override 
        onlyRole(FEE_MANAGER_ROLE) 
    {
        _exemptions[account] = FeeExemption({
            isExempt: true,
            reason: reason,
            addedAt: block.timestamp
        });
        emit FeeExemptionGranted(account, reason);
    }
    
    function revokeExemption(address account) external override onlyRole(FEE_MANAGER_ROLE) {
        delete _exemptions[account];
        emit FeeExemptionRevoked(account);
    }
    
    function isExempt(address account) public view override returns (bool) {
        return _exemptions[account].isExempt;
    }
    
    function getExemption(address account) 
        external 
        view 
        override 
        returns (FeeExemption memory) 
    {
        return _exemptions[account];
    }
    
    // ============ Fee Collection ============
    
    function processTransferWithFee(
        address from,
        address to,
        uint256 amount
    ) external override returns (uint256 feeAmount, uint256 netAmount) {
        // Check exemptions
        if (isExempt(from) || isExempt(to)) {
            return (0, amount);
        }
        
        feeAmount = calculateFee(amount);
        netAmount = amount - feeAmount;
        
        if (feeAmount > 0) {
            _totalFeesCollected += feeAmount;
            emit FeeCollected(from, to, feeAmount);
        }
    }
    
    // ============ Fee Queries ============
    
    function getFeeConfig() external view override returns (FeeConfig memory) {
        return _feeConfig;
    }
    
    function getTotalFeesCollected() external view override returns (uint256) {
        return _totalFeesCollected;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

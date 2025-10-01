// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC4626FeeStrategyModule.sol";
import "./storage/FeeStrategyStorage.sol";

/**
 * @title ERC4626FeeStrategyModule
 * @notice Fee management system for ERC-4626 vaults
 * @dev Implements management fees, performance fees, and withdrawal fees
 */
contract ERC4626FeeStrategyModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC4626FeeStrategyModule,
    FeeStrategyStorage
{
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    address public vault;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address admin,
        address vault_,
        uint256 managementFeeBps,
        uint256 performanceFeeBps,
        uint256 withdrawalFeeBps,
        address feeRecipient
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        vault = vault_;
        _managementFeeBps = managementFeeBps;
        _performanceFeeBps = performanceFeeBps;
        _withdrawalFeeBps = withdrawalFeeBps;
        _feeRecipient = feeRecipient;
        _lastFeeCollection = block.timestamp;
        _highWaterMark = 0;
    }
    
    function setManagementFee(uint256 basisPoints) 
        external 
        onlyRole(FEE_MANAGER_ROLE) 
    {
        if (basisPoints > MAX_MANAGEMENT_FEE) revert FeeTooHigh();
        _managementFeeBps = basisPoints;
        emit ManagementFeeUpdated(basisPoints);
    }
    
    function setPerformanceFee(uint256 basisPoints) 
        external 
        onlyRole(FEE_MANAGER_ROLE) 
    {
        if (basisPoints > MAX_PERFORMANCE_FEE) revert FeeTooHigh();
        _performanceFeeBps = basisPoints;
        emit PerformanceFeeUpdated(basisPoints);
    }
    
    function setWithdrawalFee(uint256 basisPoints) 
        external 
        onlyRole(FEE_MANAGER_ROLE) 
    {
        if (basisPoints > MAX_WITHDRAWAL_FEE) revert FeeTooHigh();
        _withdrawalFeeBps = basisPoints;
        emit WithdrawalFeeUpdated(basisPoints);
    }
    
    function setFeeRecipient(address recipient) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (recipient == address(0)) revert InvalidFeeRecipient();
        _feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }
    
    function calculateManagementFee() public view returns (uint256 feeAmount) {
        if (_managementFeeBps == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - _lastFeeCollection;
        uint256 totalAssets = _getTotalAssets();
        
        feeAmount = (totalAssets * _managementFeeBps * timeElapsed) 
            / (BASIS_POINTS * SECONDS_PER_YEAR);
    }
    
    function calculatePerformanceFee() public view returns (uint256 feeAmount) {
        if (_performanceFeeBps == 0) return 0;
        
        uint256 totalAssets = _getTotalAssets();
        if (totalAssets <= _highWaterMark) return 0;
        
        uint256 profit = totalAssets - _highWaterMark;
        feeAmount = (profit * _performanceFeeBps) / BASIS_POINTS;
    }
    
    function calculateWithdrawalFee(uint256 withdrawAmount) 
        public 
        view 
        returns (uint256 feeAmount) 
    {
        feeAmount = (withdrawAmount * _withdrawalFeeBps) / BASIS_POINTS;
    }
    
    function collectFees() external returns (uint256 totalCollected) {
        uint256 managementFee = calculateManagementFee();
        uint256 performanceFee = calculatePerformanceFee();
        totalCollected = managementFee + performanceFee;
        
        if (totalCollected == 0) revert NoFeesToCollect();
        
        _accumulatedFees += totalCollected;
        _lastFeeCollection = block.timestamp;
        
        uint256 currentAssets = _getTotalAssets();
        if (currentAssets > _highWaterMark) {
            _highWaterMark = currentAssets;
        }
        
        IERC20 asset = IERC20(_getAsset());
        asset.transfer(_feeRecipient, totalCollected);
        
        emit FeesCollected(managementFee, performanceFee, totalCollected);
    }
    
    function getPendingFees() external view returns (uint256) {
        return calculateManagementFee() + calculatePerformanceFee();
    }
    
    function getFeeConfig() external view returns (
        uint256 managementFeeBps,
        uint256 performanceFeeBps,
        uint256 withdrawalFeeBps,
        address feeRecipient
    ) {
        return (_managementFeeBps, _performanceFeeBps, _withdrawalFeeBps, _feeRecipient);
    }
    
    function getHighWaterMark() external view returns (uint256) {
        return _highWaterMark;
    }
    
    function _getTotalAssets() internal view returns (uint256) {
        (bool success, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("totalAssets()")
        );
        require(success, "Failed to get total assets");
        return abi.decode(data, (uint256));
    }
    
    function _getAsset() internal view returns (address) {
        (bool success, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("asset()")
        );
        require(success, "Failed to get asset");
        return abi.decode(data, (address));
    }
    
    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}

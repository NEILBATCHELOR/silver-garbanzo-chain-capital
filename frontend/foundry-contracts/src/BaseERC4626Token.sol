// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BaseERC4626Token
 * @notice A configurable ERC4626 vault token with optional features
 */
contract BaseERC4626Token is ERC4626, Ownable {
    // Vault configuration structure
    struct VaultConfig {
        string name;
        string symbol;
        uint8 decimals;
        address asset; // Underlying asset address
        uint256 managementFee; // Annual management fee in basis points (10000 = 100%)
        uint256 performanceFee; // Performance fee in basis points
        uint256 depositLimit; // Maximum total assets that can be deposited
        uint256 minDeposit; // Minimum deposit amount
        bool depositsEnabled;
        bool withdrawalsEnabled;
        bool transfersPaused;
        address initialOwner;
    }

    // State variables
    VaultConfig public config;
    uint256 public lastFeeCalculation;
    uint256 public totalFeesCollected;
    bool public transfersPaused;
    mapping(address => bool) public managers;

    // Events
    event VaultPaused();
    event VaultUnpaused();
    event FeesCollected(uint256 managementFee, uint256 performanceFee);
    event ManagerAdded(address indexed manager);
    event ManagerRemoved(address indexed manager);
    event DepositLimitUpdated(uint256 newLimit);

    // Errors
    error TransfersPaused();
    error DepositsDisabled();
    error WithdrawalsDisabled();
    error DepositLimitExceeded();
    error MinDepositNotMet();
    error ZeroAddress();
    error NotManager();
    error InvalidFee();

    modifier onlyManager() {
        if (!managers[msg.sender] && msg.sender != owner()) {
            revert NotManager();
        }
        _;
    }

    constructor(
        address _asset,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _owner
    ) 
        ERC4626(IERC20(_asset))
        ERC20(_name, _symbol) 
        Ownable(_owner)
    {
        if (_owner == address(0)) revert ZeroAddress();
        if (_asset == address(0)) revert ZeroAddress();
        
        // Set default configuration
        config = VaultConfig({
            name: _name,
            symbol: _symbol,
            decimals: _decimals,
            asset: _asset,
            managementFee: 100, // 1% annual management fee
            performanceFee: 1000, // 10% performance fee
            depositLimit: 0, // No deposit limit initially
            minDeposit: 0, // No minimum deposit
            depositsEnabled: true,
            withdrawalsEnabled: true,
            transfersPaused: false,
            initialOwner: _owner
        });
        
        transfersPaused = false;
        lastFeeCalculation = block.timestamp;

        // Set the owner as initial manager
        managers[_owner] = true;

        // Transfer ownership to specified owner
        if (_owner != msg.sender) {
            _transferOwnership(_owner);
        }
    }

    /**
     * @notice Returns the number of decimals for the vault token
     */
    function decimals() public view virtual override returns (uint8) {
        return config.decimals;
    }

    /**
     * @notice Override deposit to add checks and fee calculation
     */
    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        if (!config.depositsEnabled) revert DepositsDisabled();
        if (assets < config.minDeposit) revert MinDepositNotMet();
        
        // Check deposit limit
        if (config.depositLimit > 0 && totalAssets() + assets > config.depositLimit) {
            revert DepositLimitExceeded();
        }

        // Calculate fees before deposit
        _calculateAndCollectFees();

        return super.deposit(assets, receiver);
    }

    /**
     * @notice Override withdraw to add checks and fee calculation
     */
    function withdraw(uint256 assets, address receiver, address owner) public virtual override returns (uint256) {
        if (!config.withdrawalsEnabled) revert WithdrawalsDisabled();
        
        // Calculate fees before withdrawal
        _calculateAndCollectFees();

        return super.withdraw(assets, receiver, owner);
    }

    /**
     * @notice Override redeem to add checks
     */
    function redeem(uint256 shares, address receiver, address owner) public virtual override returns (uint256) {
        if (!config.withdrawalsEnabled) revert WithdrawalsDisabled();
        
        // Calculate fees before redemption
        _calculateAndCollectFees();

        return super.redeem(shares, receiver, owner);
    }

    /**
     * @notice Calculate and collect management and performance fees
     */
    function _calculateAndCollectFees() internal {
        uint256 timePassed = block.timestamp - lastFeeCalculation;
        if (timePassed == 0) return;

        uint256 currentAssets = totalAssets();
        if (currentAssets == 0) {
            lastFeeCalculation = block.timestamp;
            return;
        }

        // Calculate management fee (annual rate)
        uint256 managementFee = 0;
        if (config.managementFee > 0) {
            managementFee = (currentAssets * config.managementFee * timePassed) / (10000 * 365 days);
        }

        // Performance fee would require tracking high water mark
        // For simplicity, we'll just collect management fee here
        uint256 performanceFee = 0;

        if (managementFee > 0) {
            // Mint shares to the vault owner as fees
            uint256 feeShares = convertToShares(managementFee);
            _mint(owner(), feeShares);
            totalFeesCollected += managementFee;
        }

        lastFeeCalculation = block.timestamp;
        
        if (managementFee > 0 || performanceFee > 0) {
            emit FeesCollected(managementFee, performanceFee);
        }
    }

    /**
     * @notice Add a manager address
     * @param manager Address to add as manager
     */
    function addManager(address manager) external onlyOwner {
        if (manager == address(0)) revert ZeroAddress();
        managers[manager] = true;
        emit ManagerAdded(manager);
    }

    /**
     * @notice Remove a manager address
     * @param manager Address to remove as manager
     */
    function removeManager(address manager) external onlyOwner {
        managers[manager] = false;
        emit ManagerRemoved(manager);
    }

    /**
     * @notice Update deposit limit
     * @param newLimit New deposit limit
     */
    function setDepositLimit(uint256 newLimit) external onlyManager {
        config.depositLimit = newLimit;
        emit DepositLimitUpdated(newLimit);
    }

    /**
     * @notice Enable/disable deposits
     * @param enabled Whether deposits should be enabled
     */
    function setDepositsEnabled(bool enabled) external onlyManager {
        config.depositsEnabled = enabled;
    }

    /**
     * @notice Enable/disable withdrawals
     * @param enabled Whether withdrawals should be enabled
     */
    function setWithdrawalsEnabled(bool enabled) external onlyManager {
        config.withdrawalsEnabled = enabled;
    }

    /**
     * @notice Pause all token transfers
     */
    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
        emit VaultPaused();
    }

    /**
     * @notice Unpause token transfers
     */
    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
        emit VaultUnpaused();
    }

    /**
     * @notice Override transfer function to add pause functionality
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        if (transfersPaused && from != address(0) && to != address(0)) {
            revert TransfersPaused();
        }
        
        super._update(from, to, value);
    }

    /**
     * @notice Get vault information
     */
    function getVaultInfo() external view returns (
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _asset,
        uint256 _totalAssets,
        uint256 _totalSupply,
        uint256 _depositLimit,
        uint256 _minDeposit,
        uint256 _managementFee,
        uint256 _performanceFee,
        uint256 _totalFeesCollected,
        bool _depositsEnabled,
        bool _withdrawalsEnabled,
        bool _transfersPaused
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            asset(),
            totalAssets(),
            totalSupply(),
            config.depositLimit,
            config.minDeposit,
            config.managementFee,
            config.performanceFee,
            totalFeesCollected,
            config.depositsEnabled,
            config.withdrawalsEnabled,
            transfersPaused
        );
    }

    /**
     * @notice Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyRecover(address token, uint256 amount) external onlyOwner {
        if (token == asset()) revert("Cannot recover vault asset");
        IERC20(token).transfer(owner(), amount);
    }
}

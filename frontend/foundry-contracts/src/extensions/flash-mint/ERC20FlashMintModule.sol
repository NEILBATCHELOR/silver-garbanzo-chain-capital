// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IERC20FlashMintModule.sol";
import "./storage/FlashMintStorage.sol";

/**
 * @title ERC20FlashMintModule
 * @notice Flash loan implementation following EIP-3156
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Use Cases:
 * - DeFi arbitrage opportunities
 * - Liquidation protection
 * - Collateral swaps
 * - Debt refinancing
 */
contract ERC20FlashMintModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC20FlashMintModule,
    FlashMintStorage
{
    // ============ Constants ============
    bytes32 public constant FLASH_MANAGER_ROLE = keccak256("FLASH_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // EIP-3156 callback success value
    bytes32 public constant CALLBACK_SUCCESS = 
        keccak256("ERC3156FlashBorrower.onFlashLoan");
    
    // Reference to token contract
    address public tokenContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize flash mint module
     * @param admin Admin address
     * @param token Token contract address
     * @param feeRecipient Fee recipient address
     * @param flashFeeBasisPoints Flash loan fee in basis points
     */
    function initialize(
        address admin,
        address token,
        address feeRecipient,
        uint256 flashFeeBasisPoints
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FLASH_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        tokenContract = token;
        _feeRecipient = feeRecipient;
        _flashFeeBasisPoints = flashFeeBasisPoints;
        _maxFlashLoan = 0; // 0 = unlimited
    }
    
    // ============ EIP-3156 Implementation ============
    
    /**
     * @notice Maximum amount available for flash loan
     * @param token Token address to check
     * @return Maximum flash loan amount
     */
    function maxFlashLoan(address token) public view override returns (uint256) {
        if (token != tokenContract) return 0;
        
        if (_maxFlashLoan == 0) {
            // Unlimited - return max uint256
            return type(uint256).max;
        }
        
        return _maxFlashLoan;
    }
    
    /**
     * @notice Calculate flash loan fee
     * @param token Token address
     * @param amount Loan amount
     * @return Fee amount
     */
    function flashFee(address token, uint256 amount) 
        public 
        view 
        override 
        returns (uint256) 
    {
        if (token != tokenContract) revert UnsupportedToken();
        return (amount * _flashFeeBasisPoints) / 10000;
    }
    
    /**
     * @notice Execute flash loan
     * @param receiver Flash loan receiver (implements IERC3156FlashBorrower)
     * @param token Token to borrow
     * @param amount Amount to borrow
     * @param data Additional data passed to receiver
     * @return bool Success status
     */
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override nonReentrant returns (bool) {
        if (token != tokenContract) revert UnsupportedToken();
        if (amount > maxFlashLoan(token)) revert FlashLoanExceedsMax();
        
        uint256 fee = flashFee(token, amount);
        
        // Mint tokens to receiver
        (bool mintSuccess,) = tokenContract.call(
            abi.encodeWithSignature("mint(address,uint256)", address(receiver), amount)
        );
        if (!mintSuccess) revert FlashLoanFailed();
        
        // Call receiver's callback
        bytes32 callbackResult = receiver.onFlashLoan(
            msg.sender,
            token,
            amount,
            fee,
            data
        );
        
        if (callbackResult != CALLBACK_SUCCESS) revert InvalidFlashBorrower();
        
        // Burn tokens + fee from receiver
        uint256 repayAmount = amount + fee;
        (bool burnSuccess,) = tokenContract.call(
            abi.encodeWithSignature("burnFrom(address,uint256)", address(receiver), repayAmount)
        );
        if (!burnSuccess) revert FlashLoanFailed();
        
        // Transfer fee to recipient if fee > 0
        if (fee > 0 && _feeRecipient != address(0)) {
            (bool feeSuccess,) = tokenContract.call(
                abi.encodeWithSignature("mint(address,uint256)", _feeRecipient, fee)
            );
            if (!feeSuccess) revert FlashLoanFailed();
        }
        
        emit FlashLoan(msg.sender, address(receiver), amount, fee);
        return true;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set flash loan fee in basis points
     * @param feeBasisPoints New fee (100 = 1%)
     */
    function setFlashFee(uint256 feeBasisPoints) 
        external 
        override 
        onlyRole(FLASH_MANAGER_ROLE) 
    {
        _flashFeeBasisPoints = feeBasisPoints;
        emit FlashFeeUpdated(feeBasisPoints);
    }
    
    /**
     * @notice Set maximum flash loan amount
     * @param maxAmount Maximum amount (0 = unlimited)
     */
    function setMaxFlashLoan(uint256 maxAmount) 
        external 
        override 
        onlyRole(FLASH_MANAGER_ROLE) 
    {
        _maxFlashLoan = maxAmount;
        emit MaxFlashLoanUpdated(maxAmount);
    }
    
    /**
     * @notice Get current flash loan fee in basis points
     * @return Fee basis points
     */
    function getFlashFeeBasisPoints() external view override returns (uint256) {
        return _flashFeeBasisPoints;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title FlashMintStorage
 * @notice Storage layout for flash mint module (upgradeable-safe)
 */
contract FlashMintStorage {
    // ============ Flash Loan Configuration ============
    
    // Fee in basis points (100 = 1%)
    uint256 internal _flashFeeBasisPoints;
    
    // Maximum flash loan amount (0 = unlimited)
    uint256 internal _maxFlashLoan;
    
    // Fee recipient address
    address internal _feeRecipient;
    
    // Total fees collected
    uint256 internal _totalFeesCollected;
    
    // ============ Storage Gap ============
    uint256[46] private __gap;
}

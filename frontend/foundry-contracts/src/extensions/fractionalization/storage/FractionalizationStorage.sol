// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FractionalizationStorage {
    // tokenId => share token address
    mapping(uint256 => address) internal _shareTokens;
    
    // tokenId => total shares
    mapping(uint256 => uint256) internal _totalShares;
    
    // tokenId => buyout price in wei
    mapping(uint256 => uint256) internal _buyoutPrices;
    
    // Configuration
    uint256 internal _minFractions;
    uint256 internal _maxFractions;
    uint256 internal _buyoutMultiplierBps; // Basis points (150 = 1.5x)
    bool internal _redemptionEnabled;
    uint256 internal _fractionPrice; // Price per fraction in wei
    bool internal _tradingEnabled; // Whether fractions can be traded
    
    uint256[40] private __gap;
}

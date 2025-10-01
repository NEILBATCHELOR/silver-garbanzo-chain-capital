// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ValueExchangeStorage
 * @notice Storage layout for value exchange module (upgradeable-safe)
 * @dev Follows OpenZeppelin storage gap pattern
 */
contract ValueExchangeStorage {
    // ============ Exchange Rate Data ============
    struct ExchangeRate {
        uint256 rate; // Rate in basis points (10000 = 1:1)
        bool enabled;
        uint256 lastUpdated;
    }
    
    // fromSlot => toSlot => ExchangeRate
    mapping(uint256 => mapping(uint256 => ExchangeRate)) internal _exchangeRates;
    
    // ============ Liquidity Pool Data ============
    struct LiquidityPool {
        uint256 slot1;
        uint256 slot2;
        uint256 liquidity;
        bool active;
        uint256 createdAt;
    }
    
    // poolId => LiquidityPool
    mapping(uint256 => LiquidityPool) internal _liquidityPools;
    
    // slot1 => slot2 => poolId
    mapping(uint256 => mapping(uint256 => uint256)) internal _poolIds;
    
    // poolId => provider => liquidity amount
    mapping(uint256 => mapping(address => uint256)) internal _providerLiquidity;
    
    uint256 internal _nextPoolId;
    
    // ============ Configuration ============
    uint256 internal _minExchangeAmount;
    uint256 internal _maxExchangeAmount;
    bool internal _exchangeEnabled;
    
    // ============ Storage Gap ============
    uint256[43] private __gap;
}

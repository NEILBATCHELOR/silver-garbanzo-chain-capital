// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title YieldStrategyStorage
 * @notice Storage layout for yield strategy module (upgradeable-safe)
 */
contract YieldStrategyStorage {
    // ============ Strategy Data ============
    struct Strategy {
        address protocol;
        uint256 allocation;      // Basis points (10000 = 100%)
        bool active;
        uint256 lastHarvest;
        uint256 totalYield;
        uint256 deployedAssets;
    }
    
    mapping(uint256 => Strategy) internal _strategies;
    uint256[] internal _strategyIds;
    
    uint256 internal _nextStrategyId;
    uint256 internal _totalAllocation;
    uint256 internal _totalYield;
    
    // ============ Configuration ============
    uint256 internal _harvestFrequency;      // Minimum time between harvests
    uint256 internal _rebalanceThreshold;    // Trigger rebalance if drift exceeds
    bool internal _autoCompound;             // Auto compound yields
    
    // ============ Constants ============
    uint256 internal constant BASIS_POINTS = 10000;
    
    // ============ Storage Gap ============
    uint256[43] private __gap;
}

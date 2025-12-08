// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";

/**
 * @title CircuitBreakers
 * @notice Automated safety mechanisms for the protocol
 * @dev Monitors conditions and automatically triggers protective measures
 */
contract CircuitBreakers {
    using WadRayMath for uint256;
    using PercentageMath for uint256;

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;

    // Circuit breaker thresholds
    uint256 public constant PRICE_DEVIATION_THRESHOLD = 1000; // 10% in basis points
    uint256 public constant HIGH_UTILIZATION_THRESHOLD = 9800; // 98% in basis points
    uint256 public constant LIQUIDATION_VOLUME_THRESHOLD = 1000; // 10% of TVL in basis points
    uint256 public constant ORACLE_STALENESS_THRESHOLD = 1 hours;

    // Tracking state
    mapping(address => uint256) public lastOracleUpdate;
    mapping(address => uint256) public last24hLiquidationVolume;
    mapping(address => uint256) public liquidationVolumeResetTimestamp;

    // Events
    event PriceDeviationDetected(address indexed asset, uint256 deviation, uint256 timestamp);
    event HighUtilizationDetected(address indexed asset, uint256 utilization, uint256 timestamp);
    event LiquidationWaveDetected(address indexed asset, uint256 volume, uint256 timestamp);
    event OracleStaleDetected(address indexed asset, uint256 lastUpdate, uint256 timestamp);
    event CircuitBreakerTriggered(string reason, address indexed asset, uint256 timestamp);
    event AutomaticActionTaken(string action, address indexed asset, uint256 timestamp);

    /**
     * @dev Constructor
     * @param provider The address of the PoolAddressesProvider
     */
    constructor(IPoolAddressesProvider provider) {
        ADDRESSES_PROVIDER = provider;
    }

    // ============ Modifiers ============

    modifier onlyPoolOrRiskAdmin() {
        _onlyPoolOrRiskAdmin();
        _;
    }

    function _onlyPoolOrRiskAdmin() internal view {
        address aclManager = ADDRESSES_PROVIDER.getACLManager();
        require(
            IACLManager(aclManager).hasRole(keccak256("POOL_ADMIN"), msg.sender) ||
            IACLManager(aclManager).hasRole(keccak256("RISK_ADMIN"), msg.sender),
            "CircuitBreakers: Caller is not authorized"
        );
    }

    // ============ Circuit Breaker Checks ============

    /**
     * @notice Check all circuit breakers for a given asset
     * @param asset The address of the asset to check
     * @return triggered Whether any circuit breaker was triggered
     * @return reason The reason if a circuit breaker was triggered
     */
    function checkAllCircuitBreakers(address asset) external returns (bool triggered, string memory reason) {
        // 1. Check oracle staleness
        if (_checkOracleStaleness(asset)) {
            return (true, "Oracle stale");
        }

        // 2. Check price deviation
        if (_checkPriceDeviation(asset)) {
            return (true, "Price deviation exceeded");
        }

        // 3. Check utilization
        if (_checkHighUtilization(asset)) {
            return (true, "High utilization");
        }

        // 4. Check liquidation volume
        if (_checkLiquidationWave(asset)) {
            return (true, "Liquidation wave detected");
        }

        return (false, "");
    }

    /**
     * @notice Check if oracle is stale
     * @param asset The address of the asset
     * @return True if oracle is stale
     */
    function _checkOracleStaleness(address asset) internal returns (bool) {
        uint256 lastUpdate = lastOracleUpdate[asset];
        
        if (lastUpdate == 0) {
            // First check, initialize
            lastOracleUpdate[asset] = block.timestamp;
            return false;
        }

        if (block.timestamp - lastUpdate > ORACLE_STALENESS_THRESHOLD) {
            emit OracleStaleDetected(asset, lastUpdate, block.timestamp);
            emit CircuitBreakerTriggered("Oracle stale", asset, block.timestamp);
            
            // Trigger emergency pause for this asset
            _triggerEmergencyAction(asset, "pauseBorrowing");
            
            return true;
        }

        return false;
    }

    /**
     * @notice Check for abnormal price deviation
     * @param asset The address of the asset
     * @return True if price deviation exceeded threshold
     */
    function _checkPriceDeviation(address asset) internal returns (bool) {
        // Get current price from oracle
        address oracle = ADDRESSES_PROVIDER.getPriceOracle();
        
        // Compare with historical price (implementation would get actual prices)
        // For now, this is a placeholder
        
        // If deviation > 10%, trigger circuit breaker
        uint256 deviation = 0; // Placeholder
        
        if (deviation > PRICE_DEVIATION_THRESHOLD) {
            emit PriceDeviationDetected(asset, deviation, block.timestamp);
            emit CircuitBreakerTriggered("Price deviation", asset, block.timestamp);
            
            // Pause borrowing for this asset
            _triggerEmergencyAction(asset, "pauseBorrowing");
            
            return true;
        }

        return false;
    }

    /**
     * @notice Check for high utilization
     * @param asset The address of the asset
     * @return True if utilization exceeded threshold
     */
    function _checkHighUtilization(address asset) internal returns (bool) {
        ICommodityLendingPool pool = ICommodityLendingPool(ADDRESSES_PROVIDER.getPool());
        
        // Get reserve data
        // Calculate utilization = totalBorrowed / totalSupplied
        
        // Placeholder for actual calculation
        uint256 utilization = 0;
        
        if (utilization > HIGH_UTILIZATION_THRESHOLD) {
            emit HighUtilizationDetected(asset, utilization, block.timestamp);
            
            // Don't pause, but increase interest rates automatically
            _triggerEmergencyAction(asset, "increaseRates");
            
            return false; // Not a critical circuit breaker, just warning
        }

        return false;
    }

    /**
     * @notice Check for large liquidation wave
     * @param asset The address of the asset
     * @return True if liquidation wave detected
     */
    function _checkLiquidationWave(address asset) internal returns (bool) {
        // Reset volume tracking if 24h passed
        if (block.timestamp >= liquidationVolumeResetTimestamp[asset] + 24 hours) {
            last24hLiquidationVolume[asset] = 0;
            liquidationVolumeResetTimestamp[asset] = block.timestamp;
        }

        ICommodityLendingPool pool = ICommodityLendingPool(ADDRESSES_PROVIDER.getPool());
        
        // Get total value locked
        // Calculate if recent liquidations exceed 10% of TVL
        
        // Placeholder for actual calculation
        uint256 liquidationVolume = last24hLiquidationVolume[asset];
        uint256 tvl = 1000000 * 1e18; // Placeholder
        
        uint256 liquidationPercentage = (liquidationVolume * 10000) / tvl;
        
        if (liquidationPercentage > LIQUIDATION_VOLUME_THRESHOLD) {
            emit LiquidationWaveDetected(asset, liquidationVolume, block.timestamp);
            emit CircuitBreakerTriggered("Liquidation wave", asset, block.timestamp);
            
            // Pause all operations temporarily
            _triggerEmergencyAction(asset, "pauseAll");
            
            return true;
        }

        return false;
    }

    // ============ Emergency Actions ============

    /**
     * @notice Trigger emergency action
     * @param asset The address of the asset
     * @param action The action to take
     */
    function _triggerEmergencyAction(address asset, string memory action) internal {
        // In production, this would call EmergencyModule to take action
        emit AutomaticActionTaken(action, asset, block.timestamp);
        
        // Placeholder - would integrate with EmergencyModule
        // Example: emergencyModule.pauseBorrowing(asset, "Circuit breaker triggered");
    }

    // ============ Update Functions ============

    /**
     * @notice Update oracle timestamp (called by oracle or pool)
     * @param asset The address of the asset
     */
    function updateOracleTimestamp(address asset) external onlyPoolOrRiskAdmin {
        lastOracleUpdate[asset] = block.timestamp;
    }

    /**
     * @notice Record liquidation event
     * @param asset The address of the asset
     * @param amount The amount liquidated
     */
    function recordLiquidation(address asset, uint256 amount) external onlyPoolOrRiskAdmin {
        // Reset if 24h passed
        if (block.timestamp >= liquidationVolumeResetTimestamp[asset] + 24 hours) {
            last24hLiquidationVolume[asset] = 0;
            liquidationVolumeResetTimestamp[asset] = block.timestamp;
        }

        last24hLiquidationVolume[asset] += amount;
    }

    // ============ View Functions ============

    /**
     * @notice Get circuit breaker status for an asset
     * @param asset The address of the asset
     * @return oracleStale Whether oracle is stale
     * @return highUtilization Whether utilization is high
     * @return liquidationRisk Whether liquidation volume is concerning
     */
    function getCircuitBreakerStatus(address asset) external view returns (
        bool oracleStale,
        bool highUtilization,
        bool liquidationRisk
    ) {
        // Check oracle staleness
        oracleStale = (lastOracleUpdate[asset] != 0) && 
                     (block.timestamp - lastOracleUpdate[asset] > ORACLE_STALENESS_THRESHOLD);

        // Check utilization (placeholder)
        highUtilization = false;

        // Check liquidation volume
        uint256 tvl = 1000000 * 1e18; // Placeholder
        uint256 liquidationPercentage = (last24hLiquidationVolume[asset] * 10000) / tvl;
        liquidationRisk = liquidationPercentage > LIQUIDATION_VOLUME_THRESHOLD;
    }

    /**
     * @notice Get health metrics for all monitored conditions
     * @param asset The address of the asset
     * @return metrics Array of health metrics [oracleAge, utilization, liquidationVolume, priceDeviation]
     */
    function getHealthMetrics(address asset) external view returns (uint256[4] memory metrics) {
        // Oracle age (seconds since last update)
        metrics[0] = block.timestamp - lastOracleUpdate[asset];

        // Utilization (placeholder)
        metrics[1] = 0;

        // 24h liquidation volume
        metrics[2] = last24hLiquidationVolume[asset];

        // Price deviation (placeholder)
        metrics[3] = 0;

        return metrics;
    }
}

// Interface stub for ACLManager
interface IACLManager {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

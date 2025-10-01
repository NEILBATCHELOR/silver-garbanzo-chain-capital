// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC4626YieldStrategyModule
 * @notice Interface for automated yield generation
 * @dev Integrates with DeFi protocols for yield farming
 */
interface IERC4626YieldStrategyModule {
    // ============ Events ============
    event StrategyAdded(uint256 indexed strategyId, address protocol, uint256 allocation);
    event StrategyRemoved(uint256 indexed strategyId);
    event StrategyUpdated(uint256 indexed strategyId, uint256 newAllocation);
    event YieldHarvested(uint256 indexed strategyId, uint256 amount);
    event RebalanceExecuted(uint256 totalAllocated);
    
    // ============ Errors ============
    error InvalidStrategy();
    error InvalidAllocation();
    error StrategyInactive();
    error AllocationExceeded();
    
    // ============ Strategy Management ============
    
    /**
     * @notice Add new yield strategy
     * @param protocol Protocol address
     * @param allocation % allocation (basis points)
     * @return strategyId ID of new strategy
     */
    function addStrategy(address protocol, uint256 allocation) 
        external 
        returns (uint256 strategyId);
    
    /**
     * @notice Remove strategy
     * @param strategyId Strategy to remove
     */
    function removeStrategy(uint256 strategyId) external;
    
    /**
     * @notice Update strategy allocation
     * @param strategyId Strategy ID
     * @param newAllocation New allocation %
     */
    function updateAllocation(uint256 strategyId, uint256 newAllocation) external;
    
    /**
     * @notice Set strategy active status
     * @param strategyId Strategy ID
     * @param active True to activate
     */
    function setStrategyActive(uint256 strategyId, bool active) external;
    
    // ============ Yield Operations ============
    
    /**
     * @notice Harvest yield from strategy
     * @param strategyId Strategy to harvest
     * @return yield Amount harvested
     */
    function harvest(uint256 strategyId) external returns (uint256 yield);
    
    /**
     * @notice Harvest from all strategies
     * @return totalYield Total amount harvested
     */
    function harvestAll() external returns (uint256 totalYield);
    
    /**
     * @notice Rebalance assets across strategies
     */
    function rebalance() external;
    
    /**
     * @notice Compound yields back into strategies
     * @param strategyId Strategy to compound into
     */
    function compound(uint256 strategyId) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get all active strategies
     * @return strategies Array of strategy IDs
     */
    function getActiveStrategies() external view returns (uint256[] memory strategies);
    
    /**
     * @notice Get current APY for strategy
     * @param strategyId Strategy ID
     * @return apy Current APY (basis points)
     */
    function getAPY(uint256 strategyId) external view returns (uint256 apy);
    
    /**
     * @notice Get total yield generated
     * @return total Total yield across all strategies
     */
    function getTotalYield() external view returns (uint256 total);
    
    /**
     * @notice Get pending yield to harvest
     * @param strategyId Strategy ID
     * @return pending Pending yield amount
     */
    function getPendingYield(uint256 strategyId) external view returns (uint256 pending);
}

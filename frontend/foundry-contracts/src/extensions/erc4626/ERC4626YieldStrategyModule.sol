// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC4626YieldStrategyModule.sol";
import "./storage/YieldStrategyStorage.sol";

/**
 * @title ERC4626YieldStrategyModule
 * @notice Automated yield generation for vaults
 * @dev Integrates with DeFi protocols for yield farming
 */
contract ERC4626YieldStrategyModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC4626YieldStrategyModule,
    YieldStrategyStorage
{
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    address public vault;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address admin,
        address vault_,
        uint256 harvestFrequency,
        uint256 rebalanceThreshold
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STRATEGY_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        vault = vault_;
        _nextStrategyId = 1;
        _harvestFrequency = harvestFrequency;
        _rebalanceThreshold = rebalanceThreshold;
    }
    
    function addStrategy(address protocol, uint256 allocation) 
        external 
        onlyRole(STRATEGY_MANAGER_ROLE)
        returns (uint256 strategyId) 
    {
        if (protocol == address(0)) revert InvalidStrategy();
        if (_totalAllocation + allocation > BASIS_POINTS) revert AllocationExceeded();
        
        strategyId = _nextStrategyId++;
        
        _strategies[strategyId] = Strategy({
            protocol: protocol,
            allocation: allocation,
            active: true,
            lastHarvest: block.timestamp,
            totalYield: 0,
            deployedAssets: 0
        });
        
        _strategyIds.push(strategyId);
        _totalAllocation += allocation;
        
        emit StrategyAdded(strategyId, protocol, allocation);
    }
    
    function removeStrategy(uint256 strategyId) 
        external 
        onlyRole(STRATEGY_MANAGER_ROLE) 
    {
        Strategy storage strategy = _strategies[strategyId];
        if (strategy.protocol == address(0)) revert InvalidStrategy();
        
        strategy.active = false;
        _totalAllocation -= strategy.allocation;
        
        emit StrategyRemoved(strategyId);
    }
    
    function updateAllocation(uint256 strategyId, uint256 newAllocation) 
        external 
        onlyRole(STRATEGY_MANAGER_ROLE) 
    {
        Strategy storage strategy = _strategies[strategyId];
        if (strategy.protocol == address(0)) revert InvalidStrategy();
        
        uint256 allocationChange = newAllocation > strategy.allocation
            ? newAllocation - strategy.allocation
            : strategy.allocation - newAllocation;
        
        if (newAllocation > strategy.allocation) {
            if (_totalAllocation + allocationChange > BASIS_POINTS) 
                revert AllocationExceeded();
            _totalAllocation += allocationChange;
        } else {
            _totalAllocation -= allocationChange;
        }
        
        strategy.allocation = newAllocation;
        
        emit StrategyUpdated(strategyId, newAllocation);
    }
    
    function setStrategyActive(uint256 strategyId, bool active) 
        external 
        onlyRole(STRATEGY_MANAGER_ROLE) 
    {
        Strategy storage strategy = _strategies[strategyId];
        if (strategy.protocol == address(0)) revert InvalidStrategy();
        
        strategy.active = active;
    }
    
    function harvest(uint256 strategyId) 
        external 
        returns (uint256 yield) 
    {
        Strategy storage strategy = _strategies[strategyId];
        if (!strategy.active) revert StrategyInactive();
        if (block.timestamp < strategy.lastHarvest + _harvestFrequency) 
            revert InvalidStrategy();
        
        // Call protocol-specific harvest function
        (bool success, bytes memory data) = strategy.protocol.call(
            abi.encodeWithSignature("harvest()")
        );
        require(success, "Harvest failed");
        
        yield = abi.decode(data, (uint256));
        strategy.totalYield += yield;
        strategy.lastHarvest = block.timestamp;
        _totalYield += yield;
        
        emit YieldHarvested(strategyId, yield);
    }
    
    function harvestAll() external returns (uint256 totalYield) {
        for (uint256 i = 0; i < _strategyIds.length; i++) {
            uint256 strategyId = _strategyIds[i];
            Strategy storage strategy = _strategies[strategyId];
            
            if (!strategy.active) continue;
            if (block.timestamp < strategy.lastHarvest + _harvestFrequency) continue;
            
            try this.harvest(strategyId) returns (uint256 yield) {
                totalYield += yield;
            } catch {}
        }
    }
    
    function rebalance() external onlyRole(STRATEGY_MANAGER_ROLE) {
        uint256 totalAssets = _getTotalAssets();
        
        for (uint256 i = 0; i < _strategyIds.length; i++) {
            uint256 strategyId = _strategyIds[i];
            Strategy storage strategy = _strategies[strategyId];
            
            if (!strategy.active) continue;
            
            uint256 targetAmount = (totalAssets * strategy.allocation) / BASIS_POINTS;
            
            if (targetAmount > strategy.deployedAssets) {
                uint256 toDeposit = targetAmount - strategy.deployedAssets;
                _depositToStrategy(strategyId, toDeposit);
            } else if (targetAmount < strategy.deployedAssets) {
                uint256 toWithdraw = strategy.deployedAssets - targetAmount;
                _withdrawFromStrategy(strategyId, toWithdraw);
            }
        }
        
        emit RebalanceExecuted(_totalAllocation);
    }
    
    function compound(uint256 strategyId) external {
        Strategy storage strategy = _strategies[strategyId];
        if (!strategy.active) revert StrategyInactive();
        
        uint256 yield = this.harvest(strategyId);
        _depositToStrategy(strategyId, yield);
    }
    
    function getActiveStrategies() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _strategyIds.length; i++) {
            if (_strategies[_strategyIds[i]].active) count++;
        }
        
        uint256[] memory active = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _strategyIds.length; i++) {
            uint256 strategyId = _strategyIds[i];
            if (_strategies[strategyId].active) {
                active[index++] = strategyId;
            }
        }
        
        return active;
    }
    
    function getAPY(uint256 strategyId) external view returns (uint256) {
        Strategy memory strategy = _strategies[strategyId];
        
        if (strategy.deployedAssets == 0) return 0;
        if (block.timestamp <= strategy.lastHarvest) return 0;
        
        uint256 timeElapsed = block.timestamp - strategy.lastHarvest;
        uint256 annualizedYield = (strategy.totalYield * 365 days) / timeElapsed;
        
        return (annualizedYield * BASIS_POINTS) / strategy.deployedAssets;
    }
    
    function getTotalYield() external view returns (uint256) {
        return _totalYield;
    }
    
    function getStrategy(uint256 strategyId) external view returns (
        address protocol,
        uint256 allocation,
        bool active,
        uint256 lastHarvest,
        uint256 totalYield,
        uint256 deployedAssets
    ) {
        Strategy memory strategy = _strategies[strategyId];
        return (
            strategy.protocol,
            strategy.allocation,
            strategy.active,
            strategy.lastHarvest,
            strategy.totalYield,
            strategy.deployedAssets
        );
    }
    
    function getPendingYield(uint256 strategyId) external view returns (uint256) {
        Strategy memory strategy = _strategies[strategyId];
        
        (bool success, bytes memory data) = strategy.protocol.staticcall(
            abi.encodeWithSignature("pendingRewards()")
        );
        
        if (!success) return 0;
        return abi.decode(data, (uint256));
    }
    
    function _depositToStrategy(uint256 strategyId, uint256 amount) internal {
        Strategy storage strategy = _strategies[strategyId];
        
        (bool success,) = strategy.protocol.call(
            abi.encodeWithSignature("deposit(uint256)", amount)
        );
        require(success, "Deposit failed");
        
        strategy.deployedAssets += amount;
    }
    
    function _withdrawFromStrategy(uint256 strategyId, uint256 amount) internal {
        Strategy storage strategy = _strategies[strategyId];
        
        (bool success,) = strategy.protocol.call(
            abi.encodeWithSignature("withdraw(uint256)", amount)
        );
        require(success, "Withdraw failed");
        
        strategy.deployedAssets -= amount;
    }
    
    function _getTotalAssets() internal view returns (uint256) {
        (bool success, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("totalAssets()")
        );
        require(success, "Failed to get total assets");
        return abi.decode(data, (uint256));
    }
    
    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}

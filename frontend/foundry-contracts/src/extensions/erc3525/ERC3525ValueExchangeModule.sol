// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC3525ValueExchangeModule.sol";
import "./storage/ValueExchangeStorage.sol";

/**
 * @title ERC3525ValueExchangeModule
 * @notice Automated value exchange system for ERC-3525 tokens
 * @dev Enables cross-slot value transfers with configurable exchange rates
 * 
 * Features:
 * - Configurable exchange rates between slots
 * - Automatic value conversion
 * - Liquidity pools for cross-slot exchanges
 * - Exchange rate management
 * - Exchange enable/disable per slot pair
 */
contract ERC3525ValueExchangeModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC3525ValueExchangeModule,
    ValueExchangeStorage
{
    // ============ Roles ============
    bytes32 public constant EXCHANGE_ADMIN_ROLE = keccak256("EXCHANGE_ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Constants ============
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000
    uint256 public constant MIN_RATE = 1; // 0.01%
    uint256 public constant MAX_RATE = 1000000; // 100x
    
    // Reference to ERC3525 token contract
    address public tokenContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize value exchange module
     * @param admin Admin address
     * @param token ERC3525 token contract address
     */
    function initialize(
        address admin,
        address token
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EXCHANGE_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        tokenContract = token;
        _exchangeEnabled = true;
        _nextPoolId = 1;
    }
    
    // ============ Exchange Rate Management ============
    
    function setExchangeRate(
        uint256 fromSlot,
        uint256 toSlot,
        uint256 rate
    ) external onlyRole(EXCHANGE_ADMIN_ROLE) {
        if (fromSlot == toSlot) revert SameSlotExchange();
        if (rate < MIN_RATE || rate > MAX_RATE) revert InvalidExchangeRate();
        
        _exchangeRates[fromSlot][toSlot] = ExchangeRate({
            rate: rate,
            enabled: true,
            lastUpdated: block.timestamp
        });
        
        emit ExchangeRateSet(fromSlot, toSlot, rate, msg.sender);
    }
    
    function getExchangeRate(
        uint256 fromSlot,
        uint256 toSlot
    ) external view returns (uint256) {
        return _exchangeRates[fromSlot][toSlot].rate;
    }
    
    function isExchangeEnabled(
        uint256 fromSlot,
        uint256 toSlot
    ) external view returns (bool) {
        return _exchangeRates[fromSlot][toSlot].enabled && _exchangeEnabled;
    }
    
    function enableExchange(
        uint256 fromSlot,
        uint256 toSlot,
        bool enabled
    ) external onlyRole(EXCHANGE_ADMIN_ROLE) {
        _exchangeRates[fromSlot][toSlot].enabled = enabled;
    }
    
    function setGlobalExchangeEnabled(bool enabled) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _exchangeEnabled = enabled;
    }
    
    // ============ Value Exchange ============
    
    function exchangeValue(
        uint256 fromTokenId,
        uint256 toTokenId,
        uint256 value
    ) external {
        if (!_exchangeEnabled) revert ExchangeDisabled();
        
        // Get slot information from token contract
        (bool success1, bytes memory data1) = tokenContract.call(
            abi.encodeWithSignature("slotOf(uint256)", fromTokenId)
        );
        (bool success2, bytes memory data2) = tokenContract.call(
            abi.encodeWithSignature("slotOf(uint256)", toTokenId)
        );
        
        require(success1 && success2, "Failed to get slot info");
        
        uint256 fromSlot = abi.decode(data1, (uint256));
        uint256 toSlot = abi.decode(data2, (uint256));
        
        if (fromSlot == toSlot) revert SameSlotExchange();
        
        ExchangeRate storage rate = _exchangeRates[fromSlot][toSlot];
        if (!rate.enabled || rate.rate == 0) {
            revert NoExchangeRate(fromSlot, toSlot);
        }
        
        // Calculate exchange amount
        uint256 toValue = calculateExchangeAmount(fromSlot, toSlot, value);
        
        // Perform the exchange via token contract
        // Note: This requires the token contract to have approved this module
        (bool success,) = tokenContract.call(
            abi.encodeWithSignature(
                "transferValueFrom(uint256,uint256,uint256)",
                fromTokenId,
                toTokenId,
                value
            )
        );
        
        require(success, "Exchange transfer failed");
        
        emit ValueExchanged(fromTokenId, toTokenId, value, toValue);
    }
    
    function calculateExchangeAmount(
        uint256 fromSlot,
        uint256 toSlot,
        uint256 value
    ) public view returns (uint256) {
        ExchangeRate storage rate = _exchangeRates[fromSlot][toSlot];
        if (rate.rate == 0) return 0;
        
        // Apply exchange rate: toValue = fromValue * rate / BASIS_POINTS
        return (value * rate.rate) / BASIS_POINTS;
    }
    
    // ============ Liquidity Pool Management ============
    
    function createExchangePool(
        uint256 slot1,
        uint256 slot2,
        uint256 initialLiquidity
    ) external onlyRole(EXCHANGE_ADMIN_ROLE) returns (uint256 poolId) {
        if (slot1 == slot2) revert SameSlotExchange();
        
        // Ensure pool doesn't already exist
        require(
            _poolIds[slot1][slot2] == 0 && _poolIds[slot2][slot1] == 0,
            "Pool already exists"
        );
        
        poolId = _nextPoolId++;
        
        _liquidityPools[poolId] = LiquidityPool({
            slot1: slot1,
            slot2: slot2,
            liquidity: initialLiquidity,
            active: true,
            createdAt: block.timestamp
        });
        
        _poolIds[slot1][slot2] = poolId;
        _poolIds[slot2][slot1] = poolId;
        
        emit ExchangePoolCreated(slot1, slot2, initialLiquidity);
        
        return poolId;
    }
    
    function addLiquidity(
        uint256 poolId,
        uint256 amount
    ) external {
        LiquidityPool storage pool = _liquidityPools[poolId];
        require(pool.active, "Pool not active");
        
        pool.liquidity += amount;
        _providerLiquidity[poolId][msg.sender] += amount;
        
        emit LiquidityAdded(poolId, amount, msg.sender);
    }
    
    function removeLiquidity(
        uint256 poolId,
        uint256 amount
    ) external {
        LiquidityPool storage pool = _liquidityPools[poolId];
        require(pool.active, "Pool not active");
        require(pool.liquidity >= amount, "Insufficient pool liquidity");
        require(
            _providerLiquidity[poolId][msg.sender] >= amount,
            "Insufficient provider liquidity"
        );
        
        pool.liquidity -= amount;
        _providerLiquidity[poolId][msg.sender] -= amount;
        
        emit LiquidityRemoved(poolId, amount, msg.sender);
    }
    
    function getPoolLiquidity(uint256 poolId) 
        external 
        view 
        returns (uint256) 
    {
        return _liquidityPools[poolId].liquidity;
    }
    
    function getProviderLiquidity(uint256 poolId, address provider) 
        external 
        view 
        returns (uint256) 
    {
        return _providerLiquidity[poolId][provider];
    }
    
    function getPoolInfo(uint256 poolId) 
        external 
        view 
        returns (
            uint256 slot1,
            uint256 slot2,
            uint256 liquidity,
            bool active
        ) 
    {
        LiquidityPool storage pool = _liquidityPools[poolId];
        return (pool.slot1, pool.slot2, pool.liquidity, pool.active);
    }
    
    // ============ Admin Functions ============
    
    function setMinExchangeAmount(uint256 amount) 
        external 
        onlyRole(EXCHANGE_ADMIN_ROLE) 
    {
        _minExchangeAmount = amount;
    }
    
    function setMaxExchangeAmount(uint256 amount) 
        external 
        onlyRole(EXCHANGE_ADMIN_ROLE) 
    {
        _maxExchangeAmount = amount;
    }
    
    function getExchangeLimits() 
        external 
        view 
        returns (uint256 min, uint256 max) 
    {
        return (_minExchangeAmount, _maxExchangeAmount);
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}

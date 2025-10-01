// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC3525ValueExchangeModule
 * @notice Interface for automated value transfers between ERC-3525 slots
 * @dev Enables cross-slot value exchanges with configurable rates
 */
interface IERC3525ValueExchangeModule {
    // ============ Events ============
    event ExchangeRateSet(uint256 indexed fromSlot, uint256 indexed toSlot, uint256 rate, address indexed setter);
    event ValueExchanged(uint256 indexed fromTokenId, uint256 indexed toTokenId, uint256 fromValue, uint256 toValue);
    event ExchangePoolCreated(uint256 indexed slot1, uint256 indexed slot2, uint256 liquidity);
    event LiquidityAdded(uint256 indexed poolId, uint256 amount, address indexed provider);
    event LiquidityRemoved(uint256 indexed poolId, uint256 amount, address indexed provider);
    
    // ============ Errors ============
    error InvalidExchangeRate();
    error NoExchangeRate(uint256 fromSlot, uint256 toSlot);
    error InsufficientLiquidity();
    error SameSlotExchange();
    error ExchangeDisabled();
    
    // ============ Functions ============
    function setExchangeRate(uint256 fromSlot, uint256 toSlot, uint256 rate) external;
    function getExchangeRate(uint256 fromSlot, uint256 toSlot) external view returns (uint256);
    function exchangeValue(uint256 fromTokenId, uint256 toTokenId, uint256 value) external;
    function calculateExchangeAmount(uint256 fromSlot, uint256 toSlot, uint256 value) external view returns (uint256);
    function isExchangeEnabled(uint256 fromSlot, uint256 toSlot) external view returns (bool);
}

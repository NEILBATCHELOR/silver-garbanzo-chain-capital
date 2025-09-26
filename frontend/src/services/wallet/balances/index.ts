/**
 * Balance Services - Comprehensive Multi-Chain Wallet Balance Fetching
 * 
 * This module provides unified access to all supported blockchain balance services:
 * - 14 Mainnet chains: Ethereum, Polygon, Optimism, Arbitrum, Base, BSC, zkSync, Avalanche, Bitcoin, Solana, Aptos, Sui, Near, Injective
 * - 13 Testnet chains: Sepolia, Holesky, Amoy, Optimism Sepolia, Arbitrum Sepolia, Base Sepolia, zkSync Sepolia, Avalanche Fuji, Bitcoin Testnet, Solana Devnet, Aptos Testnet, Sui Testnet, Near Testnet, Injective Testnet
 */

// Master orchestrator service (recommended entry point)
export { BalanceService, balanceService } from './BalanceService';

// Balance formatting utilities
export { BalanceFormatter, balanceFormatter } from './BalanceFormatter';

// Address validation utilities
export * from './utils/AddressValidator';

// Legacy interfaces (backward compatibility)
export type { WalletBalance, TokenBalance } from './BalanceService';

// Modern interfaces (recommended for new code)
export type { ChainBalance, TokenBalance as ChainTokenBalance, BaseBalanceService, BalanceServiceConfig } from './types';

// Base classes and utilities
export { BaseChainBalanceService } from './BaseChainBalanceService';
export { SimpleRateLimiter, SimpleCache, globalRateLimiter, globalCache } from './types';

// EVM Chain Services (16 services)
export * from './evm';

// Bitcoin Services (2 services)
export * from './bitcoin';

// Solana Services (2 services)  
export * from './solana';

// Aptos Services (2 services)
export * from './aptos';

// Sui Services (2 services)
export * from './sui';

// Near Services (2 services)
export * from './near';

// Injective Services (2 services)
export * from './injective';

// Ripple Services (2 services)
export * from './ripple';

// Stellar Services (1 service)
export * from './stellar';

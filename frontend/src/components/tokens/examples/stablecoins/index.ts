// Stablecoin Examples
// 
// This directory contains comprehensive JSON templates for different types of stablecoins
// based on current market research and Token Use.md specifications.
//
// Directory Structure:
// - fiat-backed/: USD and other fiat currency-backed stablecoins
// - crypto-backed/: Cryptocurrency-collateralized stablecoins  
// - commodity-backed/: Physical asset-backed stablecoins (gold, silver, etc.)
// - algorithmic/: Algorithm-controlled stablecoins (rebasing, seigniorage, fractional)
//
// Each category contains:
// - primary/: Primary implementation using recommended ERC standards
// - alternative/: Alternative implementations using different ERC standards
//
// Token Standards Used:
// - ERC-20: Standard fungible tokens for liquidity
// - ERC-1400: Security token standard for compliance
// - ERC-3525: Semi-fungible tokens for fractional ownership
// - ERC-4626: Vault standard for yield-bearing tokens
//
// Research Sources:
// Current market data from 2025 includes:
// - Fiat-backed: USDT ($157.6B), USDC ($58B+), BUSD, PYUSD
// - Crypto-backed: DAI ($5.3B+), FRAX, LUSD
// - Commodity-backed: PAXG ($840M), XAUT ($770M), DGX
// - Algorithmic: AMPL, FRAX (fractional), various experimental tokens
//
// Risk Levels:
// - Fiat-backed: Low to Moderate (regulatory/custodial risk)
// - Crypto-backed: Moderate (collateral volatility risk)  
// - Commodity-backed: Low to Moderate (commodity price risk)
// - Algorithmic: High to Very High (experimental mechanism risk)

export * as FiatBacked from './fiat-backed';
export * as CryptoBacked from './crypto-backed';
export * as CommodityBacked from './commodity-backed';
export * as Algorithmic from './algorithmic';

// Quick Reference:
// For enterprise/institutional use → fiat-backed/primary
// For DeFi protocols → crypto-backed/primary  
// For inflation hedging → commodity-backed/primary
// For research/experimentation → algorithmic/primary or alternative

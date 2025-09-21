/**
 * Wallet Transaction Builders Index
 * 
 * Exports all transaction builders for supported blockchain networks:
 * - EVM Chains (via TransactionBuilder)
 * - Bitcoin
 * - Solana
 * - Aptos
 * - Sui
 * - NEAR
 * - Injective
 * - Cosmos Ecosystem (Cosmos Hub, Osmosis, Juno, Secret, etc.)
 */

// ============================================================================
// MAIN TRANSACTION BUILDER (EVM Chains)
// ============================================================================

export {
  // Core transaction builder service
  transactionBuilder,
  
  // Universal transaction builder service
  universalTransactionBuilder,
  
  // EVM Transaction builder factory functions  
  EthereumTransactionBuilder,
  PolygonTransactionBuilder,
  ArbitrumTransactionBuilder,
  OptimismTransactionBuilder,
  BaseTransactionBuilder,
  BSCTransactionBuilder,
  ZkSyncTransactionBuilder,
  AvalancheTransactionBuilder,
  
  // Core EVM Transaction Builder class
  EVMTransactionBuilder,
  
  // Transaction builder services
  TransactionBuilderService,
  UniversalTransactionBuilderService,
  
  // Convenience functions
  createTransaction,
  getAccountBalance,
} from './TransactionBuilder';

// Export types from TransactionBuilder
export type {
  TransactionRequest,
  GasEstimate,
  SignedTransaction,
  BroadcastResult,
  TransactionBuilderConfig,
} from './TransactionBuilder';

// ============================================================================
// BITCOIN TRANSACTION BUILDER
// ============================================================================

// Bitcoin Transaction Builder - Testing import path
export {
  BitcoinTransactionBuilder,
  BitcoinMainnetTransactionBuilder,
  BitcoinTestnetTransactionBuilder,
  getBitcoinTransactionBuilder,
} from './BitcoinTransactionBuilder';

export type {
  BitcoinTransactionRequest,
  BitcoinGasEstimate,
  BitcoinSignedTransaction,
  BitcoinBroadcastResult,
  BitcoinTransactionBuilderConfig,
  BitcoinUTXO,
} from './BitcoinTransactionBuilder';

// ============================================================================
// COSMOS ECOSYSTEM TRANSACTION BUILDER
// ============================================================================

// COSMOS
export { 
  CosmosTransactionBuilder, 
  CosmosHubTransactionBuilder, 
  OsmosisTransactionBuilder,
  JunoTransactionBuilder,
  SecretNetworkTransactionBuilder,
  CosmosTestnetTransactionBuilder,
  getCosmosTransactionBuilder 
} from './CosmosTransactionBuilder';

export type { 
  CosmosTransactionRequest, 
  CosmosGasEstimate, 
  CosmosSignedTransaction, 
  CosmosBroadcastResult, 
  CosmosTransactionBuilderConfig,
  CosmosAccountInfo
} from './CosmosTransactionBuilder';

// ============================================================================
// OTHER BLOCKCHAIN BUILDERS
// ============================================================================

// SOLANA
export { SolanaTransactionBuilder, SolanaMainnetTransactionBuilder, SolanaDevnetTransactionBuilder, getSolanaTransactionBuilder } from './SolanaTransactionBuilder';
export type { SolanaTransactionRequest, SolanaGasEstimate, SolanaSignedTransaction, SolanaBroadcastResult, SolanaTransactionBuilderConfig } from './SolanaTransactionBuilder';

// APTOS  
export { AptosTransactionBuilder, AptosMainnetTransactionBuilder, AptosTestnetTransactionBuilder, getAptosTransactionBuilder } from './AptosTransactionBuilder';
export type { AptosTransactionRequest, AptosGasEstimate, AptosSignedTransaction, AptosBroadcastResult, AptosTransactionBuilderConfig } from './AptosTransactionBuilder';

// SUI
export { SuiTransactionBuilder, SuiMainnetTransactionBuilder, SuiTestnetTransactionBuilder, getSuiTransactionBuilder } from './SuiTransactionBuilder';
export type { SuiTransactionRequest, SuiGasEstimate, SuiSignedTransaction, SuiBroadcastResult, SuiTransactionBuilderConfig } from './SuiTransactionBuilder';

// NEAR
export { NearTransactionBuilder, NearMainnetTransactionBuilder, NearTestnetTransactionBuilder, getNearTransactionBuilder } from './NearTransactionBuilder';
export type { NearAccessKeyResponse, NearTransactionRequest, NearGasEstimate, NearSignedTransaction, NearBroadcastResult, NearTransactionBuilderConfig } from './NearTransactionBuilder';

// INJECTIVE
export { InjectiveTransactionBuilder, InjectiveMainnetTransactionBuilder, InjectiveTestnetTransactionBuilder, getInjectiveTransactionBuilder } from './InjectiveTransactionBuilder';
export type { InjectiveTransactionRequest, InjectiveGasEstimate, InjectiveSignedTransaction, InjectiveBroadcastResult, InjectiveTransactionBuilderConfig } from './InjectiveTransactionBuilder';

// RIPPLE
export { RippleTransactionBuilder, RippleMainnetTransactionBuilder, RippleTestnetTransactionBuilder, RippleDevnetTransactionBuilder, getRippleTransactionBuilder } from './RippleTransactionBuilder';
export type { RippleTransactionRequest, RippleGasEstimate, RippleSignedTransaction, RippleBroadcastResult, RippleTransactionBuilderConfig, RippleCurrency, RippleAmount, RippleAccountInfo } from './RippleTransactionBuilder';

// ============================================================================
// SHARED UTILITIES
// ============================================================================

// Re-export ChainType from AddressUtils (used by all builders)
export { ChainType } from '../AddressUtils';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Builder factory functions for quick access (EVM only for now)
// export const builders = {
//   // EVM Chains
//   ethereum: EthereumTransactionBuilder,
//   polygon: PolygonTransactionBuilder,
//   optimism: OptimismTransactionBuilder,
//   arbitrum: ArbitrumTransactionBuilder,
//   base: BaseTransactionBuilder,
//   bsc: BSCTransactionBuilder,
//   zksync: ZkSyncTransactionBuilder,
//   avalanche: AvalancheTransactionBuilder,
// } as const;

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

// Main transaction builder service as default export
export { transactionBuilder as default } from './TransactionBuilder';

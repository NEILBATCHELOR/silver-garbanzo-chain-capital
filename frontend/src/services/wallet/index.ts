// Main wallet services
export * from './balances/BalanceService';
export * from './TransactionHistoryService';
export * from './PriceFeedService';

// Enhanced Wallet Services - Full SDK Integration
export * from './solana';
export * from './bitcoin';
export * from './aptos';
export * from './sui';
export * from './near';
export * from './stellar';
export * from './ripple';

// Enhanced token detection service types (excluding conflicting exports)
export type {
  // Types from EnhancedTokenDetectionService (excluding conflicting ChainType)
  EnhancedTokenBalance,
  TokenStandard,
  ChainTokenBalances,
  BaseTokenBalance,
  ERC721Balance,
  ERC1155Balance,
  ERC3525Balance,
  ERC4626Balance,
  ERC721Token,
  ERC1155TokenType,
  ERC3525Token,
  NFTMetadata,
  SFTSlotMetadata,
  SPLTokenBalance,
  SolanaNFTBalance,
  SolanaTokenMetadata,
  SolanaCreator,
  NEARFTBalance,
  NEARNFTBalance,
  NEARTokenMetadata,
  NEARNFTToken,
  AptosCoinBalance,
  AptosNFTBalance,
  AptosCoinInfo,
  AptosNFTToken,
  SuiObjectBalance,
  SuiCoinMetadata,
  BitcoinTokenBalance,
  InjectiveTokenBalance
} from './EnhancedTokenDetectionService';

// Transaction builders (excluding conflicting exports)
export {
  // Core transaction builder service
  transactionBuilder,
  universalTransactionBuilder,
  EthereumTransactionBuilder,
  PolygonTransactionBuilder,
  ArbitrumTransactionBuilder,
  OptimismTransactionBuilder,
  BaseTransactionBuilder,
  BSCTransactionBuilder,
  ZkSyncTransactionBuilder,
  AvalancheTransactionBuilder,
  EVMTransactionBuilder,
  TransactionBuilderService,
  UniversalTransactionBuilderService,
  createTransaction,
  getAccountBalance,
  // Types from builders (avoiding duplicate GasEstimate and ChainType)
  type TransactionRequest,
  type SignedTransaction,
  type BroadcastResult,
  type TransactionBuilderConfig,
} from './builders';

// Explicitly export ChainType from builders to resolve conflict
export { ChainType } from './builders';
// Explicitly export GasEstimate from builders to resolve conflict  
export { type GasEstimate } from './builders';

// Wallet Generators
export * from './generators';

// Account abstraction services
export * from './UserOperationApiService';
export * from './SessionKeyApiService';
export * from './PaymasterApiService';
export * from './account-abstraction';

// Multi-signature services
export * from './multiSig';

// Other wallet services
export * from './WalletManager';
export * from './WalletGenerator';
export * from './WalletTransactionService';
export * from './WalletApiService';
export * from './SecurityService';
export * from './LightningNetworkService';
export * from './MultiSigWalletService';

// Import and re-export the service instances
import { BalanceService } from './balances/BalanceService';
import { transactionHistoryService } from './TransactionHistoryService';
import { priceFeedService } from './PriceFeedService';
import { enhancedTokenDetectionService } from './EnhancedTokenDetectionService';
import { walletApiService } from './WalletApiService';

// Import enhanced wallet service instances
import { solanaWalletService } from './solana';
import { bitcoinWalletService } from './bitcoin';
import { aptosWalletService } from './aptos';
import { suiWalletService } from './sui';
import { nearWalletService } from './near';
import { stellarWalletService } from './stellar';
import { rippleServices } from './ripple';

export {   
  BalanceService,
  transactionHistoryService,
  priceFeedService,
  enhancedTokenDetectionService,
  walletApiService,
  // Enhanced wallet services
  solanaWalletService,
  bitcoinWalletService,
  aptosWalletService,
  suiWalletService,
  nearWalletService,
  stellarWalletService,
  rippleServices
};

export type {
  // Balance service types
  WalletBalance,
  TokenBalance,
  ChainBalance as ChainBalanceData2,
  TokenBalance as TokenBalanceData2,
} from './balances/BalanceService';

export type {
  // Chain balance service types
  ChainBalance,
  BaseBalanceService,
  BalanceServiceConfig
} from './balances/types';

// Re-export domain types
export type { 
  EnhancedToken
} from '@/types/domain/wallet';

// Re-export Transaction type from core models with a clear alias
export type { Transaction } from '@/types/core/centralModels';

// Enhanced wallet service types
export type {
  SolanaAccountInfo,
  SolanaGenerationOptions,
  SolanaEncryptedWallet,
  SolanaNetworkInfo
} from './solana';

export type {
  BitcoinAccountInfo,
  BitcoinGenerationOptions,
  BitcoinEncryptedWallet,
  BitcoinNetworkInfo,
  BitcoinUTXO
} from './bitcoin';

export type {
  AptosAccountInfo,
  AptosGenerationOptions,
  AptosEncryptedWallet,
  AptosNetworkInfo
} from './aptos';

export type {
  SuiAccountInfo,
  SuiGenerationOptions,
  SuiEncryptedWallet,
  SuiNetworkInfo,
  SuiObjectInfo
} from './sui';

export type {
  NEARAccountInfo,
  NEARGenerationOptions,
  NEAREncryptedWallet,
  NEARNetworkInfo,
  NEARAccessKey
} from './near';

export type {
  StellarAccountInfo
} from './stellar';

export type {
  RippleAccountInfo
} from './ripple';

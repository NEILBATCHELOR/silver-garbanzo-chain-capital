// Main wallet services
export * from './balances/BalanceService';
export * from './TransactionHistoryService';
export * from './PriceFeedService';

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

// Account abstraction services
export * from './UserOperationApiService';
export * from './SessionKeyApiService';
export * from './PaymasterApiService';
export * from './account-abstraction';

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

export {   
  BalanceService,
  transactionHistoryService,
  priceFeedService,
  enhancedTokenDetectionService,
  walletApiService
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
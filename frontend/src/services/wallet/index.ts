// Main wallet services
export * from './MultiChainBalanceService';
export * from './TransactionHistoryService';
export * from './PriceFeedService';
export * from './EnhancedTokenDetectionService';

// Account abstraction services
export * from './SessionKeyApiService';
export * from './PaymasterApiService';
export * from './account-abstraction';

// Other wallet services
export * from './WalletManager';
export * from './WalletGenerator';
export * from './WalletTransactionService';
export * from './SecurityService';
export * from './LightningNetworkService';
export * from './MultiSigWalletService';

// Import and re-export the service instances
import { multiChainBalanceService } from './MultiChainBalanceService';
import { transactionHistoryService } from './TransactionHistoryService';
import { priceFeedService } from './PriceFeedService';
import { enhancedTokenDetectionService } from './EnhancedTokenDetectionService';

export { 
  multiChainBalanceService,
  transactionHistoryService,
  priceFeedService,
  enhancedTokenDetectionService
};

// Re-export domain types
export type { 
  EnhancedToken,
  TokenStandard,
  ERC721Balance,
  ERC1155Balance,
  ERC3525Balance,
  ERC4626Balance,
  EnhancedTokenBalance
} from '@/types/domain/wallet';

// Re-export types that don't conflict
export type { 
  MultiChainBalance,
  ChainBalanceData
} from './MultiChainBalanceService';

// Re-export Transaction type from core models with a clear alias
export type { Transaction } from '@/types/core/centralModels';

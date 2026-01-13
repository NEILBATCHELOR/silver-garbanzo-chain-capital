// Main wallet services
export * from './balances/BalanceService';
export * from './PriceFeedService';

// Enhanced Wallet Services - Full SDK Integration
export * from './evm';
export * from './solana';
export * from './bitcoin';
export * from './aptos';
export * from './sui';
export * from './near';
export * from './stellar';
export * from './ripple';
export * from './cosmos';
export * from './injective';

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

// Export account abstraction services with explicit type resolution for conflicts
export {
  bundlerService,
  BundlerService,
  paymasterService,
  PaymasterService,
  sessionKeyService,
  SessionKeyService,
  userOperationService,
  UserOperationService
} from './account-abstraction';

export type {
  BundlerConfiguration,
  BundleOperation,
  BundleStatus,
  BundleAnalytics,
  // Use PaymasterConfiguration from account-abstraction as PaymasterAAConfig to avoid conflict
  PaymasterConfiguration as PaymasterAAConfig,
  SponsorshipRequest,
  SponsorshipResponse,
  SessionKeyRequest,
  SessionPermission,
  SessionKeyData,
  SessionValidationResult,
  // Use UserOperationRequest from account-abstraction as UserOperationAARequest to avoid conflict
  UserOperationRequest as UserOperationAARequest,
  UserOperationData,
  UserOperationResponse,
  GasEstimation,
  BatchOperationRequest
} from './account-abstraction';

// Multi-signature services
export * from './multiSig';

// Multi-sig wallet management (service-specific types not in domain layer)
export { 
  MultiSigWalletService,
  type MultiSigWalletWithOwners,
  type MultiSigWalletOwner,
  type MultiSigTransaction,
  type MultiSigConfirmation
} from './multiSig/MultiSigWalletService';

// Other wallet services
export * from './WalletManager';
export * from './WalletGenerator';
// export * from './WalletTransactionService'; // DEPRECATED - Use TransactionMonitorService instead
export * from './WalletApiService';
export * from './SecurityService';
export * from './LightningNetworkService';

// Import and re-export the service instances
import { BalanceService } from './balances/BalanceService';
import { priceFeedService } from './PriceFeedService';
import { enhancedTokenDetectionService } from './EnhancedTokenDetectionService';
import { walletApiService } from './WalletApiService';

// Import enhanced wallet service instances
import { evmWalletService, ethereumWalletService, polygonWalletService, arbitrumWalletService, optimismWalletService, baseWalletService, avalancheWalletService, bscWalletService } from './evm';
import { solanaWalletService } from './solana';
import { bitcoinWalletService } from './bitcoin';
import { aptosWalletService } from './aptos';
import { suiWalletService } from './sui';
import { nearWalletService } from './near';
import { stellarWalletService } from './stellar';
import { rippleServices } from './ripple';
import { injectiveWalletService } from './injective';

export {   
  BalanceService,
  priceFeedService,
  enhancedTokenDetectionService,
  walletApiService,
  // Enhanced wallet services
  evmWalletService,
  ethereumWalletService,
  polygonWalletService,
  arbitrumWalletService,
  optimismWalletService,
  baseWalletService,
  avalancheWalletService,
  bscWalletService,
  solanaWalletService,
  bitcoinWalletService,
  aptosWalletService,
  suiWalletService,
  nearWalletService,
  stellarWalletService,
  rippleServices,
  injectiveWalletService
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
  EVMAccountInfo,
  EVMGenerationOptions,
  EVMEncryptedWallet,
  EVMNetworkInfo
} from './evm';

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

export type {
  InjectiveAccountInfo,
  InjectiveGenerationOptions,
  InjectiveEncryptedWallet,
  InjectiveNetworkInfo,
  InjectiveMarketOrder,
  InjectiveTransferParams
} from './injective';

// New wallet management services (note: ProjectWallet type conflicts resolved via domain types)
export {
  InternalWalletService
} from './InternalWalletService';
export type {
  ProjectWallet as InternalProjectWallet,
  UserWallet as InternalUserWallet,
  MultiSigWallet as InternalMultiSigWallet
} from './InternalWalletService';

// Unified Wallet Context (combines WalletContext + EnhancedWalletContext)
export {
  UnifiedWalletProvider,
  useWallet,
  type Wallet,
  type WalletTypeCompat,
  type UnifiedWalletContextProps,
  type WalletConnection,
  WalletType,
  WalletConnectionStatus
} from './UnifiedWalletContext';
export * from './TransferService';
export * from './TokenMintingService';
export * from './NonceManager';


// 🆕 Token Operation Services with Nonce Management
export * from './TokenBurningService';
export * from './TokenPauseService';
export * from './TokenLockingService';
export * from './TokenUnlockingService';
export * from './TokenBlockingService';
export * from './TokenUnblockingService';
export * from './TokenMaxSupplyService';

// Export all wallet services for easy importing
export { TransferService, transferService } from './TransferService';
export { RipplePaymentsService, ripplePaymentsService } from './RipplePaymentsService';
export { MoonpayService, moonpayService } from './MoonpayService';

// Export new production-ready services
export { PriceFeedService, priceFeedService } from './PriceFeedService';
export { MultiChainBalanceService, multiChainBalanceService } from './MultiChainBalanceService';
export { TransactionHistoryService, transactionHistoryService } from './TransactionHistoryService';
export { EnhancedTokenDetectionService, enhancedTokenDetectionService } from './EnhancedTokenDetectionService';
export { LightningNetworkService } from './LightningNetworkService';

// Export existing services
export { default as MultiSigWalletService } from './MultiSigWalletService';
export { default as TransactionMonitorService } from './TransactionMonitorService';
export { default as LiveDataService } from './LiveDataService';
export { default as WalletTransactionService } from './WalletTransactionService';
export * from './walletService';

// Export balance services
export { BalanceService, balanceService } from './balances/BalanceService';

// Export types
export type {
  TransferParams,
  TransferResult,
  TransferEstimate,
  TransferHistory
} from './TransferService';

export type {
  RipplePaymentParams,
  RipplePaymentResult,
  RippleQuote,
  RippleAccountInfo,
  RipplePaymentHistory
} from './RipplePaymentsService';

export type {
  MoonpayTransaction,
  MoonpayCurrency,
  MoonpayQuote,
  MoonpayLimits,
  MoonpayCustomer,
  MoonpayPaymentMethod
} from './MoonpayService';

export type {
  NetworkStatus,
  LiveTransaction
} from './LiveDataService';

export type {
  WalletTransaction
} from './WalletTransactionService';

// Export new service types
export type {
  TokenPrice,
  PriceRequest,
  PriceResponse
} from './PriceFeedService';

export type {
  ChainConfig,
  MultiChainBalance,
  ChainBalanceData,
  EnhancedTokenBalance as ERC20TokenBalance
} from './MultiChainBalanceService';

export type {
  Transaction,
  TransactionFilter,
  TransactionSummary,
  ContractInteraction,
  SwapDetails
} from './TransactionHistoryService';

export type {
  TokenBalance,
  WalletBalance
} from './balances/BalanceService';

export type {
  LightningInvoice,
  PaymentChannel,
  PaymentRoute,
  LightningNode
} from './LightningNetworkService';

export type {
  ERC721Balance,
  ERC1155Balance,
  ERC3525Balance,
  ERC4626Balance,
  EnhancedTokenBalance as EnhancedToken,
  TokenStandard,
  ChainTokenBalances,
  NFTMetadata,
  SFTSlotMetadata
} from './EnhancedTokenDetectionService';

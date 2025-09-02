// Export all wallet services for easy importing
export { TransferService, transferService } from './TransferService';
export { RipplePaymentsService, ripplePaymentsService } from './RipplePaymentsService';
export { MoonpayService, moonpayService } from './MoonpayService';

// Export existing services
export { default as MultiSigWalletService } from './MultiSigWalletService';
export { default as TransactionMonitorService } from './TransactionMonitorService';
export { default as LiveDataService } from './LiveDataService';
export { default as WalletTransactionService } from './WalletTransactionService';
export * from './walletService';

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

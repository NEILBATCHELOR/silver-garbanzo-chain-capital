/**
 * Ripple Services Index
 * Central export point for all Ripple/XRP related services
 */

// Transaction Builders - specific exports to avoid conflicts
export { 
  RippleTransactionBuilder,
  RippleMainnetTransactionBuilder,
  RippleTestnetTransactionBuilder
} from '../builders/RippleTransactionBuilder';

export type {
  RippleTransactionBuilderConfig,
  RippleTransactionRequest,
  RippleGasEstimate,
  RippleSignedTransaction,
  RippleAccountInfo
} from '../builders/RippleTransactionBuilder';

// Token Transaction Builder
export * from '../builders/ripple/RippleTokenTransactionBuilder';

// Balance Service - avoiding RippleTrustLine conflict
export { 
  rippleMainnetBalanceService,
  rippleTestnetBalanceService
} from '../balances/ripple/RippleBalanceService';

// Multi-Signature Service
export * from '../multiSig/RippleMultiSigService';

// Payment Services - specific exports to avoid conflicts
export { RipplePaymentsService } from './RipplePaymentsService';
export { RippleTransactionHistoryService } from './RippleTransactionHistoryService';
export { 
  RippleTokenDetectionService,
  rippleTokenDetection,
  rippleTestnetTokenDetection
} from './RippleTokenDetectionService';

// Export types from token detection service (including RippleTrustLine from this source)
export type {
  RippleToken,
  RippleTrustLine
} from './RippleTokenDetectionService';

// Re-export main services for convenience
import { rippleMainnetBalanceService, rippleTestnetBalanceService } from '../balances/ripple/RippleBalanceService';
import { rippleMultiSigService, rippleTestnetMultiSigService } from '../multiSig/RippleMultiSigService';
import { rippleTransactionHistory, rippleTestnetTransactionHistory } from './RippleTransactionHistoryService';
import { rippleTokenDetection, rippleTestnetTokenDetection } from './RippleTokenDetectionService';
import { RippleMainnetTransactionBuilder, RippleTestnetTransactionBuilder } from '../builders/RippleTransactionBuilder';

export const rippleServices = {
  mainnet: {
    balance: rippleMainnetBalanceService,
    multiSig: rippleMultiSigService,
    transactionHistory: rippleTransactionHistory,
    tokenDetection: rippleTokenDetection,
    transactionBuilder: RippleMainnetTransactionBuilder
  },
  testnet: {
    balance: rippleTestnetBalanceService,
    multiSig: rippleTestnetMultiSigService,
    transactionHistory: rippleTestnetTransactionHistory,
    tokenDetection: rippleTestnetTokenDetection,
    transactionBuilder: RippleTestnetTransactionBuilder
  }
};

export default rippleServices;
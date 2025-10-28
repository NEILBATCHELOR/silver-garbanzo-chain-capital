/**
 * PSP Hooks Index
 * Centralized exports for all PSP-related hooks
 */

export { useApiKeys } from './useApiKeys';

export { useBalances } from './useBalances';

export { useExternalAccounts } from './useExternalAccounts';

export { useIdentityCases } from './useIdentityCases';

export { usePayments } from './usePayments';

export { usePaymentSettings } from './usePaymentSettings';

export { usePSPMarketRates } from './usePSPMarketRates';
export type { MarketRate, MarketRatesResponse } from './usePSPMarketRates';

export { usePSPSpreads } from './usePSPSpreads';
export type {
  SpreadConfig,
  SpreadMatrixRow,
  UpdateSpreadParams,
  CopySpreadParams,
} from './usePSPSpreads';

export { usePSPQuotes } from './usePSPQuotes';
export type { TradingQuote } from './usePSPQuotes';

export { useTrades } from './useTrades';

export { useWebhooks } from './useWebhooks';


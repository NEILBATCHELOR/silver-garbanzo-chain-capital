/**
 * DFNS Fiat Types
 * 
 * Types for DFNS fiat on/off-ramp functionality
 */

// Fiat Provider Types
export type DfnsFiatProvider = 'ramp_network' | 'mt_pelerin';
export type DfnsFiatTransactionType = 'onramp' | 'offramp';
export type DfnsFiatTransactionStatus = 
  | 'pending'
  | 'processing' 
  | 'waiting_for_payment'
  | 'payment_received'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

// Fiat Transaction
export interface DfnsFiatTransaction {
  id: string;
  provider: DfnsFiatProvider;
  provider_transaction_id: string;
  type: DfnsFiatTransactionType;
  status: DfnsFiatTransactionStatus;
  amount: number;
  currency: string;
  crypto_asset: string;
  wallet_address: string;
  wallet_id?: string;
  payment_method?: string;
  bank_account?: {
    account_number?: string;
    routing_number?: string;
    account_holder_name?: string;
    bank_name?: string;
    iban?: string;
    swift?: string;
  };
  payment_url?: string;
  withdrawal_address?: string;
  tx_hash?: string;
  exchange_rate?: {
    rate: number;
    timestamp: string;
    provider: string;
  };
  fees?: {
    provider_fee?: number;
    network_fee?: number;
    total_fee?: number;
    currency?: string;
  };
  estimated_completion_time?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  user_id?: string;
  project_id?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

// Fiat Quote Request
export interface DfnsFiatQuoteRequest {
  provider: DfnsFiatProvider;
  type: DfnsFiatTransactionType;
  from_amount?: number;
  from_currency: string;
  to_currency: string;
  payment_method?: string;
  wallet_address?: string;
  // Infrastructure layer compatibility
  cryptoAssetSymbol?: string;
  fiatValue?: number;
  cryptoAmount?: string;
  paymentMethodType?: PaymentMethod;
}

// Fiat Quote
export interface DfnsFiatQuote {
  id: string;
  provider: DfnsFiatProvider;
  type: DfnsFiatTransactionType;
  from_amount: number;
  from_currency: string;
  to_amount: number;
  to_currency: string;
  exchange_rate: number;
  fees: {
    provider_fee?: number;
    network_fee?: number;
    payment_method_fee?: number;
    total_fee: number;
    currency: string;
  };
  payment_method: string;
  estimated_processing_time?: string;
  expires_at: string;
  created_at: string;
  // Infrastructure compatibility properties (required for components)
  fiatValue?: number;
  fiatCurrency?: string;
  cryptoAmount?: string;
  appliedFee?: number;
  baseRampFee?: number;
  networkFee?: number;
  asset?: RampAssetInfo;
  assetExchangeRate?: number;
}

// Fiat Provider Configuration
export interface DfnsFiatProviderConfig {
  id: string;
  provider: DfnsFiatProvider;
  configuration: Record<string, any>;
  is_enabled: boolean;
  supported_currencies: string[];
  supported_payment_methods: string[];
  created_at: string;
  updated_at: string;
  // Additional configuration properties for RAMP Network integration
  webhookSecret?: string;
  environment?: 'production' | 'staging';
  hostAppName?: string;
  hostLogoUrl?: string;
  apiKey?: string;
  // Webhooks configuration for RAMP Network
  webhooks?: {
    endpoint_url: string;
    secret_key: string;
    enabled_events: string[];
  };
}

// Fiat Transaction Request
export interface DfnsCreateFiatTransactionRequest {
  provider: DfnsFiatProvider;
  type: DfnsFiatTransactionType;
  amount: number;
  currency: string;
  crypto_asset: string;
  wallet_address: string;
  payment_method?: string;
  bank_account?: {
    account_number?: string;
    routing_number?: string;
    account_holder_name?: string;
    bank_name?: string;
    iban?: string;
    swift?: string;
  };
  user_id?: string;
  external_id?: string;
  // Additional RAMP Network specific properties
  userEmail?: string;
  returnUrl?: string;
}

// Fiat Activity Log
export interface DfnsFiatActivityLog {
  id: string;
  transaction_id: string;
  activity_type: string;
  status: string;
  description?: string;
  provider_data?: Record<string, any>;
  error_details?: Record<string, any>;
  created_at: string;
}

// On-ramp specific types
export interface DfnsOnrampTransaction extends DfnsFiatTransaction {
  type: 'onramp';
  payment_url: string;
}

// Off-ramp specific types  
export interface DfnsOfframpTransaction extends DfnsFiatTransaction {
  type: 'offramp';
  bank_account: NonNullable<DfnsFiatTransaction['bank_account']>;
  withdrawal_address: string;
}

// Type aliases for legacy/compatibility imports
export type FiatOnRampRequest = DfnsCreateFiatTransactionRequest;
export type FiatOffRampRequest = DfnsCreateFiatTransactionRequest;
export type FiatTransactionResponse = DfnsFiatTransaction;
export type FiatQuoteRequest = DfnsFiatQuoteRequest;
export type FiatQuoteResponse = DfnsFiatQuote;
export type RampNetworkConfig = DfnsFiatProviderConfig;
export type RampNetworkTransaction = DfnsFiatTransaction;
export type RampPurchaseStatus = DfnsFiatTransactionStatus;
export type RampSaleStatus = DfnsFiatTransactionStatus;
export type RampQuoteRequest = DfnsFiatQuoteRequest;

// Additional missing types
export interface RampNetworkWebhook {
  id: string;
  event_type: string;
  transaction_id: string;
  status: DfnsFiatTransactionStatus;
  data: Record<string, any>;
  timestamp: string;
  // Additional properties for RAMP Network webhooks
  type?: string;
  mode?: string;
  payload?: Record<string, any>;
  purchase?: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export type SupportedCurrency = 
  | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'CHF' | 'JPY'
  | 'ETH' | 'BTC' | 'USDC' | 'USDT' | 'DAI';

export type PaymentMethod = 
  | 'card' | 'bank_transfer' | 'sepa' | 'ach' | 'wire' | 'apple_pay' | 'google_pay'
  | 'CARD_PAYMENT' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'MANUAL_BANK_TRANSFER' | 'AUTO_BANK_TRANSFER' | 'PIX' | 'OPEN_BANKING';

// Type alias for compatibility with infrastructure layer
export type RampPaymentMethod = PaymentMethod;

export interface FiatServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface RampAssetInfo {
  symbol: string;
  name: string;
  network: string;
  contract_address?: string;
  decimals: number;
  icon_url?: string;
  min_purchase_amount?: number;
  max_purchase_amount?: number;
  // Additional properties for RAMP Network integration (infrastructure layer compatibility)
  chain?: string;
  type?: 'NATIVE' | 'ERC20';
  address?: string | null;
  logoUrl?: string;
  enabled?: boolean;
  hidden?: boolean;
  price?: Record<string, number>;
  currencyCode?: string;
  minPurchaseAmount?: number;
  maxPurchaseAmount?: number;
  minPurchaseCryptoAmount?: string;
  networkFee?: number;
}

export interface RampPurchase {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  crypto_amount: number;
  crypto_currency: string;
  status: DfnsFiatTransactionStatus;
  payment_method: PaymentMethod;
  created_at: string;
  finalTxHash?: string;
}

export interface RampSale {
  id: string;
  transaction_id: string;
  crypto_amount: number;
  crypto_currency: string;
  fiat_amount: number;
  fiat_currency: string;
  status: DfnsFiatTransactionStatus;
  withdrawal_method: PaymentMethod;
  created_at: string;
}

export interface DfnsRampNetworkConfig extends DfnsFiatProviderConfig {
  webhooks: {
    endpoint_url: string;
    secret_key: string;
    enabled_events: string[];
  };
  api_settings: {
    sandbox_mode: boolean;
    rate_limits: Record<string, number>;
    timeout_seconds: number;
  };
}

// Type compatibility bridge for RampNetworkEnhancedConfig
export interface RampNetworkConfigCompatibility {
  apiKey: string;
  hostAppName: string;
  hostLogoUrl: string;
  enabledFlows: ('onramp' | 'offramp')[] | ('ONRAMP' | 'OFFRAMP')[];
  webhookSecret?: string;
  environment?: 'production' | 'staging';
}

// Helper function to normalize flow values
function normalizeFlows(flows: ('onramp' | 'offramp')[] | ('ONRAMP' | 'OFFRAMP')[]): ('onramp' | 'offramp')[] {
  return flows.map(flow => flow.toLowerCase() as 'onramp' | 'offramp');
}

// Convert RampNetworkEnhancedConfig to DfnsRampNetworkConfig
export function toDfnsRampNetworkConfig(
  enhancedConfig: RampNetworkConfigCompatibility & Partial<DfnsRampNetworkConfig>
): DfnsRampNetworkConfig {
  const normalizedFlows = normalizeFlows(enhancedConfig.enabledFlows);
  
  return {
    id: enhancedConfig.id || `config-${Date.now()}`,
    provider: 'ramp_network',
    configuration: {
      apiKey: enhancedConfig.apiKey,
      hostAppName: enhancedConfig.hostAppName,
      hostLogoUrl: enhancedConfig.hostLogoUrl,
      enabledFlows: normalizedFlows,
    },
    is_enabled: true,
    supported_currencies: enhancedConfig.supported_currencies || ['USD', 'EUR', 'GBP'],
    supported_payment_methods: enhancedConfig.supported_payment_methods || ['card', 'bank_transfer'],
    created_at: enhancedConfig.created_at || new Date().toISOString(),
    updated_at: enhancedConfig.updated_at || new Date().toISOString(),
    webhooks: enhancedConfig.webhooks || {
      endpoint_url: '',
      secret_key: enhancedConfig.webhookSecret || '',
      enabled_events: ['purchase.created', 'purchase.completed'],
    },
    api_settings: enhancedConfig.api_settings || {
      sandbox_mode: enhancedConfig.environment !== 'production',
      rate_limits: { quotes: 100 },
      timeout_seconds: 30,
    },
  };
}

// Additional cache and transaction event types
export interface RampAssetCacheEntry {
  asset: RampAssetInfo;
  lastUpdated: string;
  isValid: boolean;
}

export interface RampTransactionEvent {
  id: string;
  type: string;
  status: DfnsFiatTransactionStatus;
  transaction_id: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface RampQuote {
  id: string;
  from_amount: number;
  from_currency: string;
  to_amount: number;
  to_currency: string;
  exchange_rate: number;
  fees: {
    total_fee: number;
    currency: string;
  };
  expires_at: string;
  // Infrastructure layer compatibility properties (required for full compatibility)
  appliedFee: number;
  baseRampFee: number;
  networkFee: number;
  cryptoAmount: string;
  fiatCurrency: string;
  fiatValue: number;
  asset: RampAssetInfo;
  assetExchangeRate: number;
  assetExchangeRateEur?: number;
  fiatExchangeRateEur?: number;
  paymentMethodType?: PaymentMethod;
}

// RAMP Network widget response types
export type RampWidgetResponse<T = any> = {
  kind: 'ramp_onramp_widget_success' | 'ramp_offramp_widget_success';
  data: T;
  error: null;
} | {
  kind: 'ramp_onramp_widget_error' | 'ramp_offramp_widget_error';
  data: null;
  error: {
    code: string;
    message: string;
  };
}

// RAMP SDK Configuration
export interface RampSDKConfig {
  hostAppName: string;
  hostLogoUrl?: string;
  hostApiKey?: string;
  apiKey?: string;
  variant?: 'auto' | 'desktop' | 'mobile';
  defaultAsset?: string;
  defaultFlow?: 'onramp' | 'offramp';
  userAddress?: string;
  userEmailAddress?: string;
  swapAsset?: string;
  swapAmount?: string | number;
  fiatCurrency?: string;
  fiatValue?: string | number;
  selectedCountryCode?: string;
  webhookStatusUrl?: string;
  webhookSecret?: string;
  environment?: 'production' | 'staging';
  finalUrl?: string;
  enabledFlows?: ('onramp' | 'offramp')[];
  offrampAsset?: string;
  paymentMethodType?: PaymentMethod;
}

// RAMP Event Types
export interface RampPurchaseCreatedEvent {
  purchase: {
    id: string;
    asset: string;
    crypto_amount: string;
    fiat_currency: string;
    fiat_value: number;
    applied_fee: number;
    status: string;
  };
}

export interface RampSaleCreatedEvent {
  sale: {
    id: string;
    asset: string;
    crypto_amount: string;
    fiat_currency: string;
    fiat_value: number;
    applied_fee: number;
    status: string;
  };
}

export interface RampSendCryptoRequestEvent {
  crypto_amount: string;
  asset: string;
  address: string;
}

export interface RampWidgetCloseEvent {
  // No specific data for close event
}

export interface RampWidgetConfigDoneEvent {
  // Widget configuration completed
}

export interface RampWidgetConfigFailedEvent {
  error: string;
}

export interface RampEventListeners {
  onPurchaseCreated?: (event: RampPurchaseCreatedEvent) => void;
  onSaleCreated?: (event: RampSaleCreatedEvent) => void;
  onSendCryptoRequest?: (event: RampSendCryptoRequestEvent) => void;
  onWidgetClose?: (event: RampWidgetCloseEvent) => void;
  onWidgetConfigDone?: (event: RampWidgetConfigDoneEvent) => void;
  onWidgetConfigFailed?: (event: RampWidgetConfigFailedEvent) => void;
};

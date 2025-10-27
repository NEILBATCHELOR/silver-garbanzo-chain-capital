/**
 * PSP Routes Type Definitions
 * 
 * Request and response types for PSP API routes
 */

// Payment Routes Types
export interface CreateFiatPaymentRequest {
  sourceWalletId: string;
  destinationAccountId: string;
  amount: string;
  currency: string;
  paymentRail?: 'ach' | 'wire' | 'rtp' | 'fednow';
  memo?: string;
  idempotencyKey?: string;
}

export interface CreateCryptoPaymentRequest {
  sourceWalletId: string;
  destinationAccountId: string;
  amount: string;
  currency: string;
  network: string;
  memo?: string;
  idempotencyKey?: string;
}

export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentType?: string;
  direction?: 'inbound' | 'outbound';
  dateFrom?: string; // ISO string
  dateTo?: string;   // ISO string
}

// Trade Routes Types
export interface CreateTradeRequest {
  source: {
    symbol: string;
    amount: string;
    network?: string;
  };
  destination: {
    symbol: string;
    network?: string;
  };
  virtualAccountId?: string;
}

export interface ListTradesQuery {
  virtualAccountId?: string;
  status?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  limit?: number;
  offset?: number;
}

export interface MarketRatesQuery {
  from?: string;
  to?: string;
}

// Settings Routes Types
export interface UpdatePaymentSettingsRequest {
  automation_enabled?: boolean;
  withdrawal_frequency?: 'continuous' | 'on_demand' | 'daily' | 'weekly';
  onramp_enabled?: boolean;
  onramp_target_asset?: string;
  onramp_target_network?: string;
  onramp_target_wallet_id?: string;
  offramp_enabled?: boolean;
  offramp_target_currency?: string;
  offramp_target_account_id?: string;
  default_fiat_rail?: 'ach' | 'wire' | 'rtp' | 'fednow';
}

// Virtual Account Routes Types
export interface CreateVirtualAccountRequest {
  accountName: string;
  accountType: 'individual' | 'business';
  identityCaseId?: string;
}

// Transaction Routes Types
export interface ListTransactionsQuery {
  page?: number;
  limit?: number;
  type?: 'payment' | 'trade' | 'all';
  status?: string;
  dateFrom?: string; // ISO string
  dateTo?: string;   // ISO string
}

export interface ExportTransactionsQuery {
  format?: 'csv' | 'pdf';
  type?: 'payment' | 'trade';
  status?: string;
  dateFrom?: string; // ISO string
  dateTo?: string;   // ISO string
}

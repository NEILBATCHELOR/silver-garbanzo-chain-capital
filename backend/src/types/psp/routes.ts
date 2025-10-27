/**
 * PSP Routes Type Definitions
 * 
 * Query parameter types and request body types for PSP API routes.
 */

// Payment Query Types
export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentType?: string;
  direction?: 'inbound' | 'outbound';
  dateFrom?: string; // ISO string
  dateTo?: string;   // ISO string
}

// Payment Request Bodies (Simplified API versions)
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

// Trade Query Types
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

// Trade Request Body
export interface CreateTradeRequest {
  virtualAccountId?: string;
  source: {
    symbol: string;
    amount: string;
    network?: string;
  };
  destination: {
    symbol: string;
    network?: string;
  };
}

// Transaction Query Types
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

// Settings Request Body
export interface UpdatePaymentSettingsRequest {
  automationEnabled?: boolean;
  withdrawalFrequency?: 'continuous' | 'on_demand' | 'daily' | 'weekly';
  onrampEnabled?: boolean;
  onrampTargetAsset?: string;
  onrampTargetNetwork?: string;
  onrampTargetWalletId?: string;
  offrampEnabled?: boolean;
  offrampTargetCurrency?: string;
  offrampTargetAccountId?: string;
  defaultFiatRail?: 'ach' | 'wire' | 'rtp' | 'fednow';
}

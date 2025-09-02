// Stripe FIAT-to-Stablecoin Integration - Type Definitions
// Phase 1: Foundation & Infrastructure

import type Stripe from 'stripe';

// Environment Configuration
export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  environment: 'test' | 'live';
  apiVersion: '2024-06-20'; // Specific API version literal type
}

// Stablecoin Account Types
export interface StablecoinAccount {
  id: string;
  userId: string;
  accountId: string; // Stripe account ID
  balanceUsdc: number;
  balanceUsdb: number;
  accountStatus: 'active' | 'suspended' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface StablecoinAccountInsert {
  userId: string;
  accountId: string;
  balanceUsdc?: number;
  balanceUsdb?: number;
  accountStatus?: 'active' | 'suspended' | 'closed';
}

export interface StablecoinAccountUpdate {
  balanceUsdc?: number;
  balanceUsdb?: number;
  accountStatus?: 'active' | 'suspended' | 'closed';
}

// Conversion Transaction Types
export type ConversionType = 'fiat_to_crypto' | 'crypto_to_fiat';

export interface ConversionTransaction {
  id: string;
  userId: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  conversionType: ConversionType;
  
  // Source details
  sourceCurrency: string;
  sourceAmount: number;
  sourceNetwork?: string;
  
  // Destination details  
  destinationCurrency: string;
  destinationAmount?: number;
  destinationNetwork?: string;
  destinationWallet?: string;
  
  // Transaction details
  exchangeRate?: number;
  fees?: number;
  stripeFee?: number;
  networkFee?: number;
  
  // Status tracking
  status: TransactionStatus;
  stripeStatus?: string;
  transactionHash?: string;
  blockNumber?: number;
  confirmations: number;
  
  // Metadata
  metadata?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionTransactionInsert {
  userId: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  conversionType: ConversionType;
  sourceCurrency: string;
  sourceAmount: number;
  sourceNetwork?: string;
  destinationCurrency: string;
  destinationAmount?: number;
  destinationNetwork?: string;
  destinationWallet?: string;
  exchangeRate?: number;
  fees?: number;
  stripeFee?: number;
  networkFee?: number;
  status?: TransactionStatus;
  stripeStatus?: string;
  metadata?: Record<string, any>;
}

export interface ConversionTransactionUpdate {
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  destinationAmount?: number;
  exchangeRate?: number;
  fees?: number;
  stripeFee?: number;
  networkFee?: number;
  status?: TransactionStatus;
  stripeStatus?: string;
  transactionHash?: string;
  blockNumber?: number;
  confirmations?: number;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

export type TransactionStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'expired';

// Webhook Event Types
export interface WebhookEvent {
  id: string;
  stripeEventId: string;
  eventType: string;
  processed: boolean;
  data: any; // Changed from Record<string, any> to any for flexibility
  createdAt: Date;
}

export interface WebhookEventInsert {
  stripeEventId: string;
  eventType: string;
  processed?: boolean;
  data: any; // Changed from Record<string, any> to any for flexibility
}

// Service Response Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// FIAT to Stablecoin Conversion
export interface FiatToStablecoinParams {
  userId: string;
  fiatAmount: number;
  fiatCurrency: string;
  targetStablecoin: 'USDC' | 'USDB';
  targetNetwork: 'ethereum' | 'solana' | 'polygon';
  walletAddress: string;
  metadata?: Record<string, any>;
}

export interface FiatToStablecoinResponse {
  sessionId: string;
  clientSecret: string;
  transactionId: string;
  estimatedAmount: number;
  exchangeRate: number;
  fees: {
    stripeFee: number;
    networkFee: number;
    totalFees: number;
  };
  expiresAt: Date;
}

// Stablecoin to FIAT Conversion
export interface StablecoinToFiatParams {
  userId: string;
  stablecoinAmount: number;
  stablecoin: 'USDC' | 'USDB';
  sourceNetwork: string;
  targetFiatCurrency: string;
  targetBankAccount: string;
  metadata?: Record<string, any>;
}

export interface StablecoinToFiatResponse {
  transferId: string;
  transactionId: string;
  estimatedAmount: number;
  exchangeRate: number;
  fees: {
    stripeFee: number;
    networkFee: number;
    totalFees: number;
  };
  estimatedArrival: Date;
}

// Supported Networks and Currencies
export type SupportedNetwork = 'ethereum' | 'solana' | 'polygon';
export type SupportedStablecoin = 'USDC' | 'USDB';
export type SupportedFiatCurrency = 'USD' | 'EUR' | 'GBP';

// Rate Information
export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
  validUntil: Date;
}

// Account Balance
export interface AccountBalance {
  currency: string;
  available: number;
  pending: number;
  total: number;
}

// Transaction Limits
export interface TransactionLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  remainingDaily: number;
  remainingMonthly: number;
}

// Stripe-specific types extensions
export interface StripeFinancialAccount extends Stripe.Treasury.FinancialAccount {
  // Add any custom properties if needed
}

export interface StripePaymentIntent extends Stripe.PaymentIntent {
  // Add any custom properties if needed
}

export interface StripeCheckoutSession extends Stripe.Checkout.Session {
  // Add any custom properties if needed
}

// Error types
export class StripeIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public stripeError?: Stripe.StripeRawError
  ) {
    super(message);
    this.name = 'StripeIntegrationError';
  }
}

export type StripeErrorCode = 
  | 'insufficient_funds'
  | 'invalid_currency'
  | 'unsupported_network'
  | 'rate_limit_exceeded'
  | 'kyc_required'
  | 'geographic_restriction'
  | 'amount_too_low'
  | 'amount_too_high'
  | 'webhook_verification_failed'
  | 'account_not_found'
  | 'transaction_not_found';

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

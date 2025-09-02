// Stripe FIAT-to-Stablecoin Integration - Utility Functions
// Phase 1: Foundation & Infrastructure

import type { 
  SupportedNetwork, 
  SupportedStablecoin, 
  SupportedFiatCurrency,
  StripeErrorCode
} from './types';
import { StripeIntegrationError } from './types';

// Environment Configuration
export const getStripeConfig = () => {
  const isDevelopment = import.meta.env.DEV;
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
  const webhookSecret = import.meta.env.VITE_STRIPE_WEBHOOK_SECRET as string;
  const environment = (import.meta.env.VITE_STRIPE_ENVIRONMENT as 'test' | 'live') || 'test';

  const config = {
    publishableKey,
    secretKey: '', // Client-side should never have secret key
    webhookSecret,
    environment,
    apiVersion: '2024-06-20' as const,
    isDevelopment
  };

  // In development, we can work without publishable key (using mock mode)
  if (!isDevelopment && !publishableKey) {
    throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is required for production');
  }
  
  // For development, warn but don't throw if no publishable key
  if (isDevelopment && !publishableKey) {
    console.warn('⚠️ VITE_STRIPE_PUBLISHABLE_KEY not set - Stripe integration will use mock mode');
  }

  return config;
};

// Feature flags
export const getStripeFeatures = () => ({
  enableStablecoinPayments: import.meta.env.VITE_STRIPE_ENABLE_STABLECOIN_PAYMENTS === 'true',
  enableCryptoOnramp: import.meta.env.VITE_STRIPE_ENABLE_CRYPTO_ONRAMP === 'true',
  enableStablecoinAccounts: import.meta.env.VITE_STRIPE_ENABLE_STABLECOIN_ACCOUNTS === 'true',
  enableBridgeIntegration: import.meta.env.VITE_STRIPE_ENABLE_BRIDGE_INTEGRATION === 'true'
});

// Supported currencies and networks
export const getSupportedStablecoins = (): SupportedStablecoin[] => {
  const stablecoins = import.meta.env.VITE_STRIPE_SUPPORTED_STABLECOINS as string;
  return (stablecoins?.split(',') || ['USDC', 'USDB']) as SupportedStablecoin[];
};

export const getSupportedNetworks = (): SupportedNetwork[] => {
  const networks = import.meta.env.VITE_STRIPE_SUPPORTED_NETWORKS as string;
  return (networks?.split(',') || ['ethereum', 'solana', 'polygon']) as SupportedNetwork[];
};

export const getSupportedFiatCurrencies = (): SupportedFiatCurrency[] => {
  return ['USD', 'EUR', 'GBP']; // Extend as needed
};

// Transaction limits
export const getTransactionLimits = () => ({
  minConversionAmount: parseFloat(import.meta.env.VITE_STRIPE_MIN_CONVERSION_AMOUNT) || 10,
  maxConversionAmount: parseFloat(import.meta.env.VITE_STRIPE_MAX_CONVERSION_AMOUNT) || 10000,
  dailyLimit: parseFloat(import.meta.env.VITE_STRIPE_DAILY_LIMIT) || 50000
});

// Currency validation
export const isValidStablecoin = (currency: string): currency is SupportedStablecoin => {
  return getSupportedStablecoins().includes(currency as SupportedStablecoin);
};

export const isValidNetwork = (network: string): network is SupportedNetwork => {
  return getSupportedNetworks().includes(network as SupportedNetwork);
};

export const isValidFiatCurrency = (currency: string): currency is SupportedFiatCurrency => {
  return getSupportedFiatCurrencies().includes(currency as SupportedFiatCurrency);
};

// Amount validation
export const validateConversionAmount = (amount: number): { isValid: boolean; error?: string } => {
  const limits = getTransactionLimits();
  
  if (amount < limits.minConversionAmount) {
    return {
      isValid: false,
      error: `Amount must be at least $${limits.minConversionAmount}`
    };
  }
  
  if (amount > limits.maxConversionAmount) {
    return {
      isValid: false,
      error: `Amount must not exceed $${limits.maxConversionAmount}`
    };
  }
  
  return { isValid: true };
};

// Format amounts for display
export const formatCurrencyAmount = (
  amount: number, 
  currency: string, 
  decimals: number = 2
): string => {
  if (isValidStablecoin(currency)) {
    // Stablecoins typically use more decimal places
    return `${amount.toFixed(6)} ${currency}`;
  }
  
  if (isValidFiatCurrency(currency)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  }
  
  return `${amount.toFixed(decimals)} ${currency}`;
};

// Calculate fees (simplified - replace with actual Stripe fee structure)
export const calculateStripeFees = (amount: number, conversionType: 'fiat_to_crypto' | 'crypto_to_fiat'): number => {
  // Stripe stablecoin payment fee is typically 1.5%
  if (conversionType === 'fiat_to_crypto') {
    return amount * 0.015; // 1.5%
  }
  
  // Fiat payout fees vary by destination
  if (conversionType === 'crypto_to_fiat') {
    return amount * 0.01; // 1.0%
  }
  
  return 0;
};

// Estimate network fees (simplified - replace with actual network fee estimation)
export const estimateNetworkFees = (network: SupportedNetwork, stablecoin: SupportedStablecoin): number => {
  // These are rough estimates - in production, use real-time fee estimation
  const networkFees: Record<SupportedNetwork, Record<SupportedStablecoin, number>> = {
    ethereum: { USDC: 15, USDB: 15 }, // Higher due to gas fees
    solana: { USDC: 0.01, USDB: 0.01 }, // Much lower fees
    polygon: { USDC: 0.1, USDB: 0.1 } // Low fees
  };
  
  return networkFees[network]?.[stablecoin] || 5; // Default fallback
};

// Wallet address validation
export const isValidWalletAddress = (address: string, network: SupportedNetwork): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  switch (network) {
    case 'ethereum':
    case 'polygon':
      // EVM address validation
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    
    case 'solana':
      // Solana address validation (base58, 32-44 characters)
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    
    default:
      return false;
  }
};

// Error handling utilities
export const createStripeError = (
  message: string,
  code: StripeErrorCode,
  statusCode?: number,
  originalError?: any
): StripeIntegrationError => {
  return new StripeIntegrationError(message, code, statusCode, originalError);
};

export const handleStripeError = (error: any): StripeIntegrationError => {
  if (error instanceof StripeIntegrationError) {
    return error;
  }
  
  // Handle Stripe API errors
  if (error.type && error.code) {
    return createStripeError(
      error.message || 'Stripe API error',
      error.code as StripeErrorCode,
      error.statusCode,
      error
    );
  }
  
  // Handle generic errors
  return createStripeError(
    error.message || 'An unexpected error occurred',
    'unknown_error' as StripeErrorCode,
    500,
    error
  );
};

// Rate limiting utilities
export const createRateLimitKey = (userId: string, operation: string): string => {
  return `stripe:${operation}:${userId}`;
};

// Metadata helpers
export const createTransactionMetadata = (
  userId: string,
  conversionType: 'fiat_to_crypto' | 'crypto_to_fiat',
  additionalData?: Record<string, any>
): Record<string, any> => {
  return {
    userId,
    conversionType,
    timestamp: new Date().toISOString(),
    source: 'chain-capital-stripe-integration',
    ...additionalData
  };
};

// Webhook signature verification
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean => {
  try {
    // This would typically use Stripe's webhook verification
    // For now, return true - implement actual verification in production
    return true;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
};

// Retry logic for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
};

// Type guards
export const isConversionTransaction = (obj: any): obj is any => {
  return obj && typeof obj === 'object' && 'conversionType' in obj;
};

export const isStablecoinAccount = (obj: any): obj is any => {
  return obj && typeof obj === 'object' && 'accountId' in obj && 'balanceUsdc' in obj;
};

// Date utilities
export const formatTransactionDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
};

// URL helpers for Stripe dashboard links
export const getStripeDashboardUrl = (environment: 'test' | 'live', path?: string): string => {
  const baseUrl = environment === 'test' 
    ? 'https://dashboard.stripe.com/test' 
    : 'https://dashboard.stripe.com';
  
  return path ? `${baseUrl}/${path}` : baseUrl;
};

export const getPaymentIntentDashboardUrl = (paymentIntentId: string, environment: 'test' | 'live'): string => {
  return getStripeDashboardUrl(environment, `payments/${paymentIntentId}`);
};

// Debug helpers
export const debugLog = (message: string, data?: any): void => {
  if (import.meta.env.DEV) {
    console.log(`[Stripe Integration] ${message}`, data || '');
  }
};

export const debugError = (message: string, error?: any): void => {
  if (import.meta.env.DEV) {
    console.error(`[Stripe Integration Error] ${message}`, error || '');
  }
};

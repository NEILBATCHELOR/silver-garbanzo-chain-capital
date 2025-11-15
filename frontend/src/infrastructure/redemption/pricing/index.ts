/**
 * Stage 8: Exchange Rate & Valuation Service - Exports
 * 
 * Centralized exports for pricing infrastructure
 */

// Type exports
export * from './types';

// Service exports
export * from './ExchangeRateService';
export * from './ExchangeRateCache';
export * from './ValuationOracle';
export * from './PriceHistoryTracker';

// Calculator exports
export * from './calculators';

// Hook exports - do not export to avoid conflicts, import directly from './hooks'
// Users should: import { useExchangeRate, useValuation } from '@/infrastructure/redemption/pricing/hooks';

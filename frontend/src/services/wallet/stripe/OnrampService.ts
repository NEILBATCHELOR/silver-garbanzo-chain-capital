// Stripe FIAT-to-Stablecoin Integration - Onramp Service
// Phase 1: Foundation & Infrastructure

import { stripeClient } from './StripeClient';
import { conversionService } from './ConversionService';
import { CHAIN_IDS } from '@/infrastructure/web3/utils';
import type { 
  FiatToStablecoinParams,
  FiatToStablecoinResponse,
  ServiceResponse,
  ExchangeRate,
  SupportedNetwork,
  SupportedStablecoin,
  SupportedFiatCurrency 
} from './types';
import { 
  debugLog, 
  debugError, 
  getSupportedStablecoins,
  getSupportedNetworks,
  getSupportedFiatCurrencies,
  isValidWalletAddress,
  validateConversionAmount,
  calculateStripeFees,
  estimateNetworkFees,
  formatCurrencyAmount
} from './utils';

/**
 * OnrampService - Specialized service for crypto onramp functionality
 * Handles FIAT to stablecoin conversions with enhanced features
 */
export class OnrampService {

  // ==========================================
  // ONRAMP SESSION MANAGEMENT
  // ==========================================

  /**
   * Create an enhanced onramp session with additional validation and features
   */
  public async createOnrampSession(
    params: FiatToStablecoinParams & {
      customerEmail?: string;
      customerName?: string;
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<ServiceResponse<FiatToStablecoinResponse>> {
    try {
      debugLog('Creating enhanced onramp session', params);

      // Enhanced validation
      const validation = await this.validateOnrampParams(params);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          code: 'validation_failed'
        };
      }

      // Use the main conversion service for the core functionality
      return conversionService.createFiatToStablecoinSession(params);
    } catch (error) {
      debugError('Failed to create onramp session', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create onramp session',
        code: 'onramp_session_failed'
      };
    }
  }

  /**
   * Get quote for FIAT to stablecoin conversion
   */
  public async getConversionQuote(params: {
    fiatCurrency: SupportedFiatCurrency;
    fiatAmount: number;
    targetStablecoin: SupportedStablecoin;
    targetNetwork: SupportedNetwork;
  }): Promise<ServiceResponse<{
    exchangeRate: number;
    estimatedAmount: number;
    fees: {
      stripeFee: number;
      networkFee: number;
      totalFees: number;
    };
    validUntil: Date;
  }>> {
    try {
      debugLog('Getting conversion quote', params);

      // Validate amount
      const amountValidation = validateConversionAmount(params.fiatAmount);
      if (!amountValidation.isValid) {
        return {
          success: false,
          error: amountValidation.error,
          code: 'invalid_amount'
        };
      }

      // Get exchange rate (mock implementation)
      const exchangeRate = await this.getExchangeRate(params.fiatCurrency, params.targetStablecoin);
      
      // Calculate fees
      const stripeFee = calculateStripeFees(params.fiatAmount, 'fiat_to_crypto');
      const networkFee = estimateNetworkFees(params.targetNetwork, params.targetStablecoin);
      const totalFees = stripeFee + networkFee;
      
      // Calculate estimated amount
      const estimatedAmount = (params.fiatAmount - totalFees) * exchangeRate;

      const quote = {
        exchangeRate,
        estimatedAmount,
        fees: {
          stripeFee,
          networkFee,
          totalFees
        },
        validUntil: new Date(Date.now() + 5 * 60 * 1000) // Valid for 5 minutes
      };

      debugLog('Conversion quote generated', quote);

      return {
        success: true,
        data: quote
      };
    } catch (error) {
      debugError('Failed to get conversion quote', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote',
        code: 'quote_failed'
      };
    }
  }

  // ==========================================
  // SUPPORTED ASSETS AND NETWORKS
  // ==========================================

  /**
   * Get supported stablecoins for onramp
   */
  public getSupportedStablecoins(): SupportedStablecoin[] {
    return getSupportedStablecoins();
  }

  /**
   * Get supported networks for onramp
   */
  public getSupportedNetworks(): SupportedNetwork[] {
    return getSupportedNetworks();
  }

  /**
   * Get supported fiat currencies for onramp
   */
  public getSupportedFiatCurrencies(): SupportedFiatCurrency[] {
    return getSupportedFiatCurrencies();
  }

  /**
   * Get supported combinations of stablecoin and network
   */
  public getSupportedCombinations(): Array<{
    stablecoin: SupportedStablecoin;
    networks: SupportedNetwork[];
  }> {
    return [
      {
        stablecoin: 'USDC',
        networks: ['ethereum', 'solana', 'polygon']
      },
      {
        stablecoin: 'USDB',
        networks: ['ethereum', 'polygon'] // USDB may not be available on all networks
      }
    ];
  }

  // ==========================================
  // NETWORK AND ASSET INFORMATION
  // ==========================================

  /**
   * Get network information
   */
  public getNetworkInfo(network: SupportedNetwork): {
    name: string;
    chainId?: number;
    blockTime: number;
    avgConfirmations: number;
    estimatedFees: {
      low: number;
      medium: number;
      high: number;
    };
  } {
    const networkInfo = {
      ethereum: {
        name: 'Ethereum',
        chainId: CHAIN_IDS.ethereum,
        blockTime: 12, // seconds
        avgConfirmations: 12,
        estimatedFees: { low: 10, medium: 15, high: 25 }
      },
      solana: {
        name: 'Solana',
        blockTime: 0.4, // seconds
        avgConfirmations: 32,
        estimatedFees: { low: 0.005, medium: 0.01, high: 0.02 }
      },
      polygon: {
        name: 'Polygon',
        chainId: CHAIN_IDS.polygon,
        blockTime: 2, // seconds
        avgConfirmations: 128,
        estimatedFees: { low: 0.01, medium: 0.1, high: 0.5 }
      }
    };

    return networkInfo[network];
  }

  /**
   * Get stablecoin information
   */
  public getStablecoinInfo(stablecoin: SupportedStablecoin): {
    name: string;
    symbol: string;
    decimals: number;
    description: string;
    issuer: string;
    isRegulated: boolean;
  } {
    const stablecoinInfo = {
      USDC: {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        description: 'A fully collateralized US dollar stablecoin',
        issuer: 'Circle',
        isRegulated: true
      },
      USDB: {
        name: 'USD Bridge',
        symbol: 'USDB',
        decimals: 6,
        description: 'Bridge-backed US dollar stablecoin',
        issuer: 'Bridge',
        isRegulated: true
      }
    };

    return stablecoinInfo[stablecoin];
  }

  // ==========================================
  // VALIDATION AND UTILITIES
  // ==========================================

  /**
   * Enhanced validation for onramp parameters
   */
  private async validateOnrampParams(params: FiatToStablecoinParams): Promise<{ isValid: boolean; error?: string }> {
    // Validate FIAT currency
    if (!getSupportedFiatCurrencies().includes(params.fiatCurrency as SupportedFiatCurrency)) {
      return {
        isValid: false,
        error: `Unsupported FIAT currency: ${params.fiatCurrency}. Supported: ${getSupportedFiatCurrencies().join(', ')}`
      };
    }

    // Validate stablecoin
    if (!getSupportedStablecoins().includes(params.targetStablecoin)) {
      return {
        isValid: false,
        error: `Unsupported stablecoin: ${params.targetStablecoin}. Supported: ${getSupportedStablecoins().join(', ')}`
      };
    }

    // Validate network
    if (!getSupportedNetworks().includes(params.targetNetwork)) {
      return {
        isValid: false,
        error: `Unsupported network: ${params.targetNetwork}. Supported: ${getSupportedNetworks().join(', ')}`
      };
    }

    // Validate stablecoin-network combination
    const supportedCombinations = this.getSupportedCombinations();
    const combination = supportedCombinations.find(c => c.stablecoin === params.targetStablecoin);
    
    if (!combination || !combination.networks.includes(params.targetNetwork)) {
      return {
        isValid: false,
        error: `${params.targetStablecoin} is not supported on ${params.targetNetwork} network`
      };
    }

    // Validate amount
    const amountValidation = validateConversionAmount(params.fiatAmount);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    // Validate wallet address
    if (!isValidWalletAddress(params.walletAddress, params.targetNetwork)) {
      return {
        isValid: false,
        error: `Invalid wallet address for ${params.targetNetwork} network`
      };
    }

    return { isValid: true };
  }

  /**
   * Get exchange rate (simplified implementation)
   */
  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // In production, this would fetch real-time rates from Stripe or external APIs
    debugLog('Getting exchange rate', { from: fromCurrency, to: toCurrency });
    
    const mockRates: Record<string, Record<string, number>> = {
      'USD': { 'USDC': 1.0, 'USDB': 1.0 },
      'EUR': { 'USDC': 1.1, 'USDB': 1.1 },
      'GBP': { 'USDC': 1.25, 'USDB': 1.25 }
    };

    return mockRates[fromCurrency]?.[toCurrency] || 1.0;
  }

  /**
   * Estimate processing time for conversion
   */
  public estimateProcessingTime(network: SupportedNetwork): {
    minimumMinutes: number;
    maximumMinutes: number;
    averageMinutes: number;
  } {
    const processingTimes = {
      ethereum: { minimumMinutes: 3, maximumMinutes: 15, averageMinutes: 8 },
      solana: { minimumMinutes: 1, maximumMinutes: 5, averageMinutes: 2 },
      polygon: { minimumMinutes: 1, maximumMinutes: 10, averageMinutes: 4 }
    };

    return processingTimes[network];
  }

  /**
   * Get recommended gas/priority fees for faster processing
   */
  public getRecommendedFees(network: SupportedNetwork): {
    slow: { fee: number; timeMinutes: number };
    standard: { fee: number; timeMinutes: number };
    fast: { fee: number; timeMinutes: number };
  } {
    const networkInfo = this.getNetworkInfo(network);
    
    return {
      slow: { 
        fee: networkInfo.estimatedFees.low, 
        timeMinutes: Math.ceil(networkInfo.blockTime * networkInfo.avgConfirmations * 2 / 60) 
      },
      standard: { 
        fee: networkInfo.estimatedFees.medium, 
        timeMinutes: Math.ceil(networkInfo.blockTime * networkInfo.avgConfirmations / 60) 
      },
      fast: { 
        fee: networkInfo.estimatedFees.high, 
        timeMinutes: Math.ceil(networkInfo.blockTime * networkInfo.avgConfirmations * 0.5 / 60) 
      }
    };
  }

  /**
   * Format conversion summary for display
   */
  public formatConversionSummary(params: {
    fiatAmount: number;
    fiatCurrency: string;
    targetStablecoin: string;
    targetNetwork: string;
    exchangeRate: number;
    fees: { stripeFee: number; networkFee: number; totalFees: number };
    estimatedAmount: number;
  }): {
    fromAmount: string;
    toAmount: string;
    exchangeRate: string;
    totalFees: string;
    estimatedTime: string;
  } {
    const processingTime = this.estimateProcessingTime(params.targetNetwork as SupportedNetwork);
    
    return {
      fromAmount: formatCurrencyAmount(params.fiatAmount, params.fiatCurrency),
      toAmount: formatCurrencyAmount(params.estimatedAmount, params.targetStablecoin),
      exchangeRate: `1 ${params.fiatCurrency} = ${params.exchangeRate.toFixed(6)} ${params.targetStablecoin}`,
      totalFees: formatCurrencyAmount(params.fees.totalFees, params.fiatCurrency),
      estimatedTime: `${processingTime.minimumMinutes}-${processingTime.maximumMinutes} minutes`
    };
  }
}

// Export singleton instance
export const onrampService = new OnrampService();
export default onrampService;

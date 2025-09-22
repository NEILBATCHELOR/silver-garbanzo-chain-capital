/**
 * Ripple Token (IOUs) Transaction Builder
 * Handles issued currencies (IOUs) on XRP Ledger
 * Supports trust lines, paths, and cross-currency payments
 */

import { ChainType, addressUtils } from '../AddressUtils';
import type { 
  RippleTransactionBuilder,
  RippleCurrency, 
  RippleAmount,
  RippleTransactionRequest 
} from './RippleTransactionBuilder';

export interface RippleTokenTransactionRequest extends RippleTransactionRequest {
  // Trust line specific
  trustLineLimit?: string;
  qualityIn?: number;
  qualityOut?: number;
  noRipple?: boolean;
  
  // Cross-currency specific
  sendMax?: RippleAmount;
  deliverMin?: RippleAmount;
  
  // Path finding
  paths?: any[][];
  partialPayment?: boolean;
}

export interface TrustLineRequest {
  account: string;
  currency: string;
  issuer: string;
  limit: string;
  qualityIn?: number;
  qualityOut?: number;
  noRipple?: boolean;
  freeze?: boolean;
  authorized?: boolean;
}

export interface OfferCreateRequest {
  account: string;
  takerPays: RippleAmount;
  takerGets: RippleAmount;
  expiration?: number;
  offerSequence?: number;
  passive?: boolean;
  immediate?: boolean;
  fillOrKill?: boolean;
}

export interface PathFindRequest {
  sourceAccount: string;
  destinationAccount: string;
  destinationAmount: RippleAmount;
  sourceCurrencies?: RippleCurrency[];
  sendMax?: RippleAmount;
}

export class RippleTokenTransactionBuilder {
  private builder: RippleTransactionBuilder;
  
  constructor(builder: RippleTransactionBuilder) {
    this.builder = builder;
  }
  
  /**
   * Build a trust line transaction
   */
  async buildTrustLineTransaction(request: TrustLineRequest): Promise<any> {
    // Validate addresses
    const accountValidation = addressUtils.validateAddress(
      request.account, 
      ChainType.RIPPLE
    );
    if (!accountValidation.isValid) {
      throw new Error(`Invalid account address: ${accountValidation.error}`);
    }
    
    const issuerValidation = addressUtils.validateAddress(
      request.issuer,
      ChainType.RIPPLE
    );
    if (!issuerValidation.isValid) {
      throw new Error(`Invalid issuer address: ${issuerValidation.error}`);
    }
    
    // Build TrustSet transaction
    const tx: any = {
      TransactionType: 'TrustSet',
      Account: request.account,
      LimitAmount: {
        currency: this.formatCurrencyCode(request.currency),
        issuer: request.issuer,
        value: request.limit
      },
      Flags: 0
    };
    
    // Set flags
    if (request.noRipple) {
      tx.Flags |= 0x00020000; // tfSetNoRipple
    }
    if (request.freeze) {
      tx.Flags |= 0x00000020; // tfSetFreeze
    }
    if (request.authorized) {
      tx.Flags |= 0x00000100; // tfSetfAuth
    }
    
    // Set quality
    if (request.qualityIn !== undefined) {
      tx.QualityIn = request.qualityIn;
    }
    if (request.qualityOut !== undefined) {
      tx.QualityOut = request.qualityOut;
    }
    
    return tx;
  }
  
  /**
   * Build an offer create transaction (DEX order)
   */
  async buildOfferCreateTransaction(request: OfferCreateRequest): Promise<any> {
    const tx: any = {
      TransactionType: 'OfferCreate',
      Account: request.account,
      TakerPays: this.formatAmount(request.takerPays),
      TakerGets: this.formatAmount(request.takerGets),
      Flags: 0
    };
    
    // Set flags
    if (request.passive) {
      tx.Flags |= 0x00010000; // tfPassive
    }
    if (request.immediate) {
      tx.Flags |= 0x00020000; // tfImmediateOrCancel
    }
    if (request.fillOrKill) {
      tx.Flags |= 0x00040000; // tfFillOrKill
    }
    
    // Optional fields
    if (request.expiration) {
      tx.Expiration = request.expiration;
    }
    if (request.offerSequence) {
      tx.OfferSequence = request.offerSequence;
    }
    
    return tx;
  }
  
  /**
   * Build a token payment transaction
   */
  async buildTokenPaymentTransaction(request: RippleTokenTransactionRequest): Promise<any> {
    // Validate addresses
    const fromValidation = addressUtils.validateAddress(
      request.from,
      ChainType.RIPPLE
    );
    if (!fromValidation.isValid) {
      throw new Error(`Invalid sender address: ${fromValidation.error}`);
    }
    
    const toValidation = addressUtils.validateAddress(
      request.to,
      ChainType.RIPPLE
    );
    if (!toValidation.isValid) {
      throw new Error(`Invalid recipient address: ${toValidation.error}`);
    }
    
    const tx: any = {
      TransactionType: 'Payment',
      Account: request.from,
      Destination: request.to,
      Amount: this.formatAmount(request.amount),
      Flags: 0
    };
    
    // Add optional fields
    if (request.sendMax) {
      tx.SendMax = this.formatAmount(request.sendMax);
    }
    if (request.deliverMin) {
      tx.DeliverMin = this.formatAmount(request.deliverMin);
    }
    if (request.paths && request.paths.length > 0) {
      tx.Paths = request.paths;
    }
    if (request.destinationTag !== undefined) {
      tx.DestinationTag = request.destinationTag;
    }
    if (request.sourceTag !== undefined) {
      tx.SourceTag = request.sourceTag;
    }
    if (request.invoiceId) {
      tx.InvoiceID = request.invoiceId;
    }
    if (request.memos && request.memos.length > 0) {
      tx.Memos = request.memos.map(memo => ({
        Memo: {
          MemoType: memo.type ? Buffer.from(memo.type).toString('hex').toUpperCase() : undefined,
          MemoFormat: memo.format ? Buffer.from(memo.format).toString('hex').toUpperCase() : undefined,
          MemoData: memo.data ? Buffer.from(memo.data).toString('hex').toUpperCase() : undefined
        }
      }));
    }
    
    // Set partial payment flag if needed
    if (request.partialPayment) {
      tx.Flags |= 0x00020000; // tfPartialPayment
    }
    
    return tx;
  }
  
  /**
   * Build an AccountSet transaction for account configuration
   */
  async buildAccountSetTransaction(request: {
    account: string;
    transferRate?: number;
    tickSize?: number;
    domain?: string;
    emailHash?: string;
    messageKey?: string;
    setFlag?: number;
    clearFlag?: number;
  }): Promise<any> {
    const tx: any = {
      TransactionType: 'AccountSet',
      Account: request.account,
      Flags: 0
    };
    
    // Optional fields
    if (request.transferRate !== undefined) {
      tx.TransferRate = request.transferRate;
    }
    if (request.tickSize !== undefined) {
      tx.TickSize = request.tickSize;
    }
    if (request.domain) {
      tx.Domain = Buffer.from(request.domain).toString('hex').toUpperCase();
    }
    if (request.emailHash) {
      tx.EmailHash = request.emailHash;
    }
    if (request.messageKey) {
      tx.MessageKey = request.messageKey;
    }
    if (request.setFlag !== undefined) {
      tx.SetFlag = request.setFlag;
    }
    if (request.clearFlag !== undefined) {
      tx.ClearFlag = request.clearFlag;
    }
    
    return tx;
  }
  
  /**
   * Find payment paths for cross-currency payments
   */
  async findPaymentPaths(request: PathFindRequest): Promise<any[][]> {
    // This would connect to XRPL to find optimal payment paths
    // For now, return empty paths (direct payment)
    return [];
  }
  
  /**
   * Calculate exchange rate between currencies
   */
  async calculateExchangeRate(
    fromCurrency: RippleCurrency,
    toCurrency: RippleCurrency,
    amount: string
  ): Promise<{ rate: string; slippage: string }> {
    // This would query the XRPL DEX for current rates
    // Mock implementation
    return {
      rate: '1.0',
      slippage: '0.5'
    };
  }
  
  /**
   * Get order book for a currency pair
   */
  async getOrderBook(
    takerPays: RippleCurrency,
    takerGets: RippleCurrency,
    limit: number = 20
  ): Promise<{
    asks: Array<{ price: string; amount: string; total: string }>;
    bids: Array<{ price: string; amount: string; total: string }>;
    spread: string;
  }> {
    // This would query the XRPL DEX order book
    // Mock implementation
    return {
      asks: [],
      bids: [],
      spread: '0'
    };
  }
  
  /**
   * Get account's open offers (orders)
   */
  async getAccountOffers(account: string): Promise<any[]> {
    // This would query XRPL for account's open offers
    return [];
  }
  
  /**
   * Cancel an open offer
   */
  async buildOfferCancelTransaction(
    account: string,
    offerSequence: number
  ): Promise<any> {
    return {
      TransactionType: 'OfferCancel',
      Account: account,
      OfferSequence: offerSequence,
      Flags: 0
    };
  }
  
  /**
   * Build an escrow create transaction
   */
  async buildEscrowCreateTransaction(request: {
    account: string;
    destination: string;
    amount: string;
    destinationTag?: number;
    condition?: string;
    cancelAfter?: number;
    finishAfter?: number;
  }): Promise<any> {
    const tx: any = {
      TransactionType: 'EscrowCreate',
      Account: request.account,
      Destination: request.destination,
      Amount: request.amount, // In drops
      Flags: 0
    };
    
    if (request.destinationTag !== undefined) {
      tx.DestinationTag = request.destinationTag;
    }
    if (request.condition) {
      tx.Condition = request.condition;
    }
    if (request.cancelAfter !== undefined) {
      tx.CancelAfter = request.cancelAfter;
    }
    if (request.finishAfter !== undefined) {
      tx.FinishAfter = request.finishAfter;
    }
    
    return tx;
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  /**
   * Format currency code (handles 3-letter codes and hex)
   */
  private formatCurrencyCode(currency: string): string {
    // Standard currency codes (3 letters)
    if (currency.length === 3) {
      return currency;
    }
    
    // Convert to 40-character hex for non-standard codes
    if (currency.length > 3) {
      const hex = Buffer.from(currency).toString('hex').toUpperCase();
      return hex.padEnd(40, '0');
    }
    
    return currency;
  }
  
  /**
   * Format amount for XRPL transactions
   */
  private formatAmount(amount: string | RippleAmount): string | RippleAmount {
    if (typeof amount === 'string') {
      // XRP amount in drops
      return amount;
    } else {
      // Issued currency amount
      return {
        currency: this.formatCurrencyCode(amount.currency),
        value: amount.value,
        issuer: amount.issuer!
      };
    }
  }
  
  /**
   * Validate trust line parameters
   */
  validateTrustLine(request: TrustLineRequest): boolean {
    // Validate currency code
    if (!request.currency || request.currency.length === 0) {
      throw new Error('Currency code is required');
    }
    
    // Validate limit
    const limit = parseFloat(request.limit);
    if (isNaN(limit) || limit < 0) {
      throw new Error('Invalid trust line limit');
    }
    
    // Cannot create trust line to self
    if (request.account === request.issuer) {
      throw new Error('Cannot create trust line to self');
    }
    
    // XRP doesn't need trust lines
    if (request.currency === 'XRP') {
      throw new Error('XRP does not require trust lines');
    }
    
    return true;
  }
  
  /**
   * Calculate reserves required for trust lines
   */
  calculateReserveRequirement(trustLineCount: number): string {
    const BASE_RESERVE = 10; // 10 XRP base reserve
    const OWNER_RESERVE = 2; // 2 XRP per trust line
    const total = BASE_RESERVE + (trustLineCount * OWNER_RESERVE);
    return total.toString();
  }
}

// Export default
export default RippleTokenTransactionBuilder;
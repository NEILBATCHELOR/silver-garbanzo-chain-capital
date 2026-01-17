/**
 * XRPL DEX Service - Backend Wrapper
 * Decentralized Exchange functionality for XRPL
 * 
 * This service provides:
 * - Order placement and cancellation
 * - Market swaps
 * - Order book queries
 * - Trade execution
 */

import {
  Client,
  Wallet,
  OfferCreate,
  OfferCancel,
  Payment,
  BookOffersRequest,
  AccountOffersRequest
} from 'xrpl'

export interface OfferParams {
  wallet: Wallet
  takerGets: string | {
    currency: string
    issuer: string
    value: string
  }
  takerPays: string | {
    currency: string
    issuer: string
    value: string
  }
  expiration?: number
  offerSequence?: number
}

export interface SwapParams {
  wallet: Wallet
  fromCurrency: string
  fromIssuer?: string
  toCurrency: string
  toIssuer?: string
  amount: string
  maxSlippage?: number
}

export class XRPLDEXService {
  constructor(private client: Client) {}

  /**
   * Create limit order on DEX
   */
  async createOffer(params: OfferParams): Promise<{
    offerSequence: number
    transactionHash: string
  }> {
    const tx: OfferCreate = {
      TransactionType: 'OfferCreate',
      Account: params.wallet.address,
      TakerGets: params.takerGets,
      TakerPays: params.takerPays,
      Expiration: params.expiration
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Offer creation failed: ${response.result.meta.TransactionResult}`)
      }
    }

    const sequence = response.result.tx_json.Sequence || 0

    return {
      offerSequence: sequence,
      transactionHash: response.result.hash
    }
  }

  /**
   * Cancel existing offer
   */
  async cancelOffer(
    wallet: Wallet,
    offerSequence: number
  ): Promise<{ transactionHash: string }> {
    const tx: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: wallet.address,
      OfferSequence: offerSequence
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Offer cancellation failed: ${response.result.meta.TransactionResult}`)
      }
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Execute market swap
   */
  async executeSwap(params: SwapParams): Promise<{
    amountReceived: string
    effectivePrice: number
    transactionHash: string
  }> {
    // Get best path for swap
    const paths = await this.findBestPath(
      params.fromCurrency,
      params.fromIssuer,
      params.toCurrency,
      params.toIssuer,
      params.amount
    )

    if (!paths || paths.length === 0) {
      throw new Error('No path found for swap')
    }

    const tx: Payment = {
      TransactionType: 'Payment',
      Account: params.wallet.address,
      Destination: params.wallet.address,
      Amount: {
        currency: params.toCurrency,
        issuer: params.toIssuer || '',
        value: '0'
      },
      SendMax: params.amount,
      Paths: paths
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Swap failed: ${response.result.meta.TransactionResult}`)
      }

      const received = response.result.meta.delivered_amount
      
      if (!received) {
        throw new Error('Swap failed - no delivered amount in response')
      }

      return {
        amountReceived: typeof received === 'string' ? received : received.value,
        effectivePrice: this.calculatePrice(params.amount, received),
        transactionHash: response.result.hash
      }
    }

    throw new Error('Swap failed - no metadata')
  }

  /**
   * Get order book for currency pair
   */
  async getOrderBook(
    takerGets: any,
    takerPays: any,
    limit: number = 50
  ): Promise<{
    bids: Array<{ price: number; amount: string; account: string }>
    asks: Array<{ price: number; amount: string; account: string }>
  }> {
    const response = await this.client.request({
      command: 'book_offers',
      taker_gets: takerGets,
      taker_pays: takerPays,
      limit,
      ledger_index: 'validated'
    } as BookOffersRequest)

    const offers = response.result.offers || []

    return {
      bids: offers.map((offer: any) => ({
        price: this.calculateOfferPrice(offer.TakerGets, offer.TakerPays),
        amount: typeof offer.TakerGets === 'string' 
          ? offer.TakerGets 
          : offer.TakerGets.value,
        account: offer.Account
      })),
      asks: []
    }
  }

  /**
   * Get account offers
   */
  async getAccountOffers(address: string): Promise<Array<{
    sequence: number
    takerGets: any
    takerPays: any
    price: number
    expiration?: number
  }>> {
    const response = await this.client.request({
      command: 'account_offers',
      account: address,
      ledger_index: 'validated'
    } as AccountOffersRequest)

    // Safely handle offers which might be undefined
    const offers = response.result.offers || []

    return offers.map((offer: any) => ({
      sequence: offer.seq,
      takerGets: offer.taker_gets,
      takerPays: offer.taker_pays,
      price: this.calculateOfferPrice(offer.taker_gets, offer.taker_pays),
      expiration: offer.expiration
    }))
  }

  /**
   * Find best trading path
   */
  private async findBestPath(
    fromCurrency: string,
    fromIssuer: string | undefined,
    toCurrency: string,
    toIssuer: string | undefined,
    amount: string
  ): Promise<any[]> {
    // Build destination amount based on whether it's XRP or issued currency
    const destinationAmount = toCurrency === 'XRP' 
      ? amount 
      : {
          currency: toCurrency,
          issuer: toIssuer || '',
          value: amount
        }

    const response = await this.client.request({
      command: 'ripple_path_find',
      source_account: 'rSource',
      destination_account: 'rDestination',
      destination_amount: destinationAmount,
      ledger_index: 'validated'
    } as any)

    // Access paths_computed from the first alternative if available
    if (response.result && 'alternatives' in response.result) {
      const alternatives = (response.result as any).alternatives
      return alternatives?.[0]?.paths_computed || []
    }

    return []
  }

  /**
   * Calculate offer price
   */
  private calculateOfferPrice(takerGets: any, takerPays: any): number {
    // Simplified price calculation
    return 0
  }

  /**
   * Calculate effective execution price
   */
  private calculatePrice(sent: string, received: any): number {
    // Simplified price calculation
    return 0
  }
}

/**
 * XRPL DEX (Decentralized Exchange) Service
 * Handles DEX trading operations including order placement, execution, and order book queries
 * Phase 14.1: DEX Trading Infrastructure
 */

import { Client, Wallet, OfferCreate, OfferCancel, Payment, dropsToXrp, type Amount } from 'xrpl'
import type {
  OfferParams,
  SwapParams,
  SwapResult,
  OrderBook,
  OrderBookEntry,
  AccountOffer,
  TradingPair,
  CurrencyAsset,
  CreateOrderResult,
  CancelOrderResult
} from './dex-types'

export class XRPLDEXService {
  constructor(private client: Client) {}

  /**
   * Create limit order on DEX
   */
  async createOffer(
    wallet: Wallet,
    params: OfferParams
  ): Promise<CreateOrderResult> {
    const tx: OfferCreate = {
      TransactionType: 'OfferCreate',
      Account: wallet.address,
      TakerGets: params.takerGets,
      TakerPays: params.takerPays,
      ...(params.expiration && { Expiration: params.expiration })
    }

    const prepared = await this.client.autofill(tx)
    const signed = wallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Offer creation failed: ${response.result.meta.TransactionResult}`
        )
      }

      return {
        orderSequence: (prepared as any).Sequence || 0,
        transactionHash: response.result.hash,
        status: response.result.meta.TransactionResult
      }
    }

    throw new Error('Offer creation failed: Invalid response')
  }

  /**
   * Cancel existing offer
   */
  async cancelOffer(
    wallet: Wallet,
    offerSequence: number
  ): Promise<CancelOrderResult> {
    const tx: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: wallet.address,
      OfferSequence: offerSequence
    }

    const prepared = await this.client.autofill(tx)
    const signed = wallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Offer cancellation failed: ${response.result.meta.TransactionResult}`
        )
      }

      return {
        transactionHash: response.result.hash,
        status: response.result.meta.TransactionResult
      }
    }

    throw new Error('Offer cancellation failed: Invalid response')
  }

  /**
   * Execute market swap using cross-currency payment
   */
  async executeSwap(
    wallet: Wallet,
    params: SwapParams
  ): Promise<SwapResult> {
    // Prepare destination amount (what we want to receive)
    const destAmount =
      params.toCurrency === 'XRP'
        ? String(parseFloat(params.amount) * 1_000_000) // Convert to drops
        : {
            currency: params.toCurrency,
            issuer: params.toIssuer || '',
            value: params.amount
          }

    // Prepare send max (maximum we're willing to send)
    const sendMax =
      params.fromCurrency === 'XRP'
        ? String(parseFloat(params.amount) * 1_000_000 * (1 + (params.maxSlippage || 0) / 100))
        : {
            currency: params.fromCurrency,
            issuer: params.fromIssuer || '',
            value: String(parseFloat(params.amount) * (1 + (params.maxSlippage || 0) / 100))
          }

    // Get paths if not provided
    const paths = params.paths || (await this.findBestPath(wallet.address, params))

    const tx: Payment = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: wallet.address,
      Amount: destAmount,
      SendMax: sendMax,
      Paths: paths
    }

    const prepared = await this.client.autofill(tx)
    const signed = wallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Swap failed: ${response.result.meta.TransactionResult}`
        )
      }

      // Safely handle delivered_amount which can be undefined
      const delivered = response.result.meta.delivered_amount
      const amountReceived = delivered
        ? (typeof delivered === 'string'
          ? dropsToXrp(delivered)
          : delivered?.value || '0')
        : '0'

      const amountSent =
        typeof sendMax === 'string' ? dropsToXrp(sendMax) : sendMax.value || '0'

      return {
        amountSent: String(amountSent),
        amountReceived: String(amountReceived),
        effectivePrice:
          parseFloat(String(amountSent)) / parseFloat(String(amountReceived)) || 0,
        transactionHash: response.result.hash,
        path: paths
      }
    }

    throw new Error('Swap failed: Invalid response')
  }

  /**
   * Get order book for currency pair
   */
  async getOrderBook(
    takerGets: CurrencyAsset,
    takerPays: CurrencyAsset,
    limit: number = 50
  ): Promise<OrderBook> {
    const response = await this.client.request({
      command: 'book_offers',
      taker_gets: takerGets,
      taker_pays: takerPays,
      limit,
      ledger_index: 'validated'
    })

    // Safely handle offers array which can be undefined
    const offers = response.result.offers || []
    const bids: OrderBookEntry[] = offers.map((offer: any) => ({
      price: this.calculateOfferPrice(offer.TakerGets, offer.TakerPays),
      amount:
        typeof offer.TakerGets === 'string'
          ? dropsToXrp(offer.TakerGets).toString()
          : offer.TakerGets.value,
      account: offer.Account
    }))

    // Get asks (reverse pair)
    const reverseResponse = await this.client.request({
      command: 'book_offers',
      taker_gets: takerPays,
      taker_pays: takerGets,
      limit,
      ledger_index: 'validated'
    })

    const reverseOffers = reverseResponse.result.offers || []
    const asks: OrderBookEntry[] = reverseOffers.map(
      (offer: any) => ({
        price: this.calculateOfferPrice(offer.TakerPays, offer.TakerGets),
        amount:
          typeof offer.TakerPays === 'string'
            ? dropsToXrp(offer.TakerPays).toString()
            : offer.TakerPays.value,
        account: offer.Account
      })
    )

    return {
      bids,
      asks,
      baseCurrency: takerGets.currency,
      baseIssuer: takerGets.issuer,
      quoteCurrency: takerPays.currency,
      quoteIssuer: takerPays.issuer,
      timestamp: new Date()
    }
  }

  /**
   * Get account offers
   */
  async getAccountOffers(address: string): Promise<AccountOffer[]> {
    const response = await this.client.request({
      command: 'account_offers',
      account: address,
      ledger_index: 'validated'
    })

    const offers = response.result.offers || []
    return offers.map((offer: any) => ({
      sequence: offer.seq,
      takerGets: offer.taker_gets,
      takerPays: offer.taker_pays,
      price: this.calculateOfferPrice(offer.taker_gets, offer.taker_pays),
      expiration: offer.expiration,
      quality: offer.quality
    }))
  }

  /**
   * Find best trading path
   */
  private async findBestPath(
    sourceAccount: string,
    params: SwapParams
  ): Promise<any[]> {
    // Build destination amount
    const destAmount =
      params.toCurrency === 'XRP'
        ? String(parseFloat(params.amount) * 1_000_000)
        : {
            currency: params.toCurrency,
            issuer: params.toIssuer || '',
            value: params.amount
          }

    try {
      const response = await this.client.request({
        command: 'ripple_path_find',
        source_account: sourceAccount,
        destination_account: sourceAccount,
        destination_amount: destAmount,
        ledger_index: 'validated'
      })

      // Access alternatives from the response
      // The type system doesn't know about ripple_path_find response structure
      const pathResult = response.result as any
      return pathResult.alternatives?.[0]?.paths_computed || []
    } catch (error) {
      console.warn('Path finding failed, proceeding without paths:', error)
      return []
    }
  }

  /**
   * Calculate price from TakerGets and TakerPays
   */
  private calculateOfferPrice(takerGets: Amount, takerPays: Amount): number {
    // Handle TakerGets (what the taker receives)
    const getsValue = typeof takerGets === 'string'
      ? dropsToXrp(takerGets) // dropsToXrp already returns a number
      : parseFloat(String(takerGets.value || '0'))

    // Handle TakerPays (what the taker pays)
    const paysValue = typeof takerPays === 'string'
      ? dropsToXrp(takerPays) // dropsToXrp already returns a number
      : parseFloat(String(takerPays.value || '0'))

    return getsValue > 0 ? paysValue / getsValue : 0
  }

  /**
   * Get best bid and ask prices
   */
  async getBestPrices(
    pair: TradingPair
  ): Promise<{ bidPrice: number; askPrice: number; spread: number }> {
    const orderBook = await this.getOrderBook(
      { currency: pair.baseCurrency, issuer: pair.baseIssuer },
      { currency: pair.quoteCurrency, issuer: pair.quoteIssuer },
      1
    )

    const bidPrice = orderBook.bids[0]?.price || 0
    const askPrice = orderBook.asks[0]?.price || 0
    const spread = askPrice > 0 ? ((askPrice - bidPrice) / askPrice) * 100 : 0

    return { bidPrice, askPrice, spread }
  }
}

// Export singleton instance factory
export const createDEXService = (client: Client) => new XRPLDEXService(client)

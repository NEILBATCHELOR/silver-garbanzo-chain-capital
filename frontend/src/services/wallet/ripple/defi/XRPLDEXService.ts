/**
 * XRPL DEX Service
 * Phase 14.1: DEX Trading Infrastructure
 * Handles order creation, cancellation, swaps, and order book queries
 */

import {
  Client,
  Wallet,
  OfferCreate,
  OfferCancel,
  Payment,
  Amount,
  validate,
  xrpToDrops,
  dropsToXrp
} from 'xrpl'
import {
  OfferParams,
  SwapParams,
  SwapResult,
  CreateOrderResult,
  CancelOrderResult,
  OrderBook,
  OrderBookEntry,
  AccountOffer,
  CurrencyAsset,
  TradingPair
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
      Expiration: params.expiration
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
    }

    return {
      orderSequence: (response.result as any).Sequence || 0,
      transactionHash: response.result.hash,
      status: 'success'
    }
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
    }

    return {
      transactionHash: response.result.hash,
      status: 'success'
    }
  }

  /**
   * Execute market swap using path finding
   */
  async executeSwap(
    wallet: Wallet,
    params: SwapParams
  ): Promise<SwapResult> {
    // Construct destination amount
    const destAmount: Amount = params.toIssuer
      ? {
          currency: params.toCurrency,
          issuer: params.toIssuer,
          value: params.amount
        }
      : params.amount // XRP amount in drops

    // Find best path if not provided
    let paths = params.paths
    if (!paths) {
      const pathFindResponse = await this.client.request({
        command: 'ripple_path_find',
        source_account: wallet.address,
        destination_account: wallet.address, // Swap to self
        destination_amount: destAmount,
        ledger_index: 'validated'
      })

      paths = pathFindResponse.result.alternatives[0]?.paths_computed || []
    }

    // Construct SendMax
    const sendMax: Amount = params.fromIssuer
      ? {
          currency: params.fromCurrency,
          issuer: params.fromIssuer,
          value: params.amount
        }
      : params.amount

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

      const delivered = response.result.meta.delivered_amount
      const amountReceived =
        typeof delivered === 'string'
          ? dropsToXrp(delivered)
          : delivered?.value || '0'

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

    const bids: OrderBookEntry[] = response.result.offers.map((offer: any) => ({
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

    const asks: OrderBookEntry[] = reverseResponse.result.offers.map(
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

    return response.result.offers.map((offer: any) => ({
      sequence: offer.seq,
      takerGets: offer.taker_gets,
      takerPays: offer.taker_pays,
      price: this.calculateOfferPrice(offer.taker_gets, offer.taker_pays),
      expiration: offer.expiration,
      quality: offer.quality
    }))
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

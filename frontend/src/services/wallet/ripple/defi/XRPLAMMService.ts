/**
 * XRPL AMM (Automated Market Maker) Service
 * Implements XLS-30d: Automated Market Maker
 * 
 * Provides functionality for:
 * - Creating AMM liquidity pools
 * - Adding/removing liquidity
 * - Voting on trading fees
 * - Bidding for auction slots
 * - Querying pool information
 */

import { 
  Client, 
  Wallet,
  AMMCreate,
  AMMDeposit,
  AMMWithdraw,
  AMMVote,
  AMMBid,
  AMMDelete,
  TxResponse,
  AccountSet,
  IssuedCurrencyAmount
} from 'xrpl'
import {
  AMMPoolParams,
  AMMAddLiquidityParams,
  AMMRemoveLiquidityParams,
  AMMVoteParams,
  AMMAuctionBidParams,
  AMMPoolInfo,
  AMMCreateResult,
  AMMLiquidityResult,
  AMMAuctionSlotResult,
  AMMCurrency
} from './types'

export class XRPLAMMService {
  private client: Client

  constructor(client: Client) {
    this.client = client
  }

  /**
   * Create new AMM liquidity pool
   * 
   * @param params - Pool creation parameters
   * @returns Pool ID, LP token ID, and transaction hash
   * @throws Error if pool creation fails
   */
  async createAMMPool(params: AMMPoolParams): Promise<AMMCreateResult> {
    try {
      const tx: AMMCreate = {
        TransactionType: 'AMMCreate',
        Account: params.wallet.address,
        Amount: this.formatCurrency(params.asset1),
        Amount2: this.formatCurrency(params.asset2),
        TradingFee: params.tradingFee
      }

      const response = await this.client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta !== 'string') {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`AMM creation failed: ${response.result.meta.TransactionResult}`)
        }
      }

      // Extract AMM ID and LP token ID from metadata
      const ammId = this.extractAMMId(response)
      const lpTokenId = this.extractLPTokenId(response)

      return {
        poolId: ammId,
        lpTokenId,
        transactionHash: response.result.hash,
        ledgerIndex: response.result.ledger_index,
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to create AMM pool: ${(error as Error).message}`)
    }
  }

  /**
   * Add liquidity to AMM pool
   * 
   * @param params - Liquidity addition parameters
   * @returns LP tokens received and transaction hash
   * @throws Error if liquidity addition fails
   */
  async addLiquidity(params: AMMAddLiquidityParams): Promise<AMMLiquidityResult> {
    try {
      // Get AMM info to retrieve LP token details
      const ammInfo = await this.getAMMInfo(params.asset1, params.asset2)
      
      const tx: AMMDeposit = {
        TransactionType: 'AMMDeposit',
        Account: params.wallet.address,
        Asset: this.formatCurrency(params.asset1),
        Asset2: this.formatCurrency(params.asset2),
        Amount: params.asset1Amount,
        Amount2: params.asset2Amount,
        // LPTokenOut requires full IssuedCurrencyAmount if specified
        LPTokenOut: params.lpTokensOut ? {
          currency: ammInfo.lpTokenSupply,
          issuer: ammInfo.ammId,
          value: params.lpTokensOut
        } as IssuedCurrencyAmount : undefined
      }

      const response = await this.client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta !== 'string') {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Liquidity addition failed: ${response.result.meta.TransactionResult}`)
        }
      }

      const lpTokens = this.extractLPTokens(response)

      return {
        lpTokensReceived: lpTokens,
        transactionHash: response.result.hash,
        ledgerIndex: response.result.ledger_index,
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to add liquidity: ${(error as Error).message}`)
    }
  }

  /**
   * Remove liquidity from AMM pool
   * 
   * @param params - Liquidity removal parameters
   * @returns Assets received and transaction hash
   * @throws Error if liquidity removal fails
   */
  async removeLiquidity(params: AMMRemoveLiquidityParams): Promise<AMMLiquidityResult> {
    try {
      // Get AMM info to retrieve LP token details
      const ammInfo = await this.getAMMInfo(params.asset1, params.asset2)
      
      const tx: AMMWithdraw = {
        TransactionType: 'AMMWithdraw',
        Account: params.wallet.address,
        Asset: this.formatCurrency(params.asset1),
        Asset2: this.formatCurrency(params.asset2),
        // LPTokenIn requires full IssuedCurrencyAmount
        LPTokenIn: {
          currency: ammInfo.lpTokenSupply,
          issuer: ammInfo.ammId,
          value: params.lpTokenAmount
        } as IssuedCurrencyAmount
      }

      const response = await this.client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta !== 'string') {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Liquidity removal failed: ${response.result.meta.TransactionResult}`)
        }
      }

      const amounts = this.extractWithdrawalAmounts(response)

      return {
        asset1Received: amounts.asset1,
        asset2Received: amounts.asset2,
        transactionHash: response.result.hash,
        ledgerIndex: response.result.ledger_index,
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to remove liquidity: ${(error as Error).message}`)
    }
  }

  /**
   * Vote to change AMM trading fee
   * 
   * @param params - Vote parameters
   * @returns Transaction hash
   * @throws Error if vote fails
   */
  async voteTradingFee(params: AMMVoteParams): Promise<{ transactionHash: string }> {
    try {
      const tx: AMMVote = {
        TransactionType: 'AMMVote',
        Account: params.wallet.address,
        Asset: this.formatCurrency(params.asset1),
        Asset2: this.formatCurrency(params.asset2),
        TradingFee: params.tradingFee
      }

      const response = await this.client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta !== 'string') {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Vote failed: ${response.result.meta.TransactionResult}`)
        }
      }

      return {
        transactionHash: response.result.hash
      }
    } catch (error) {
      throw new Error(`Failed to vote on trading fee: ${(error as Error).message}`)
    }
  }

  /**
   * Bid for AMM auction slot (discounted trading fees)
   * 
   * @param params - Auction bid parameters
   * @returns Slot price, fee discount, and transaction hash
   * @throws Error if bid fails
   */
  async bidAuctionSlot(params: AMMAuctionBidParams): Promise<AMMAuctionSlotResult> {
    try {
      // Get AMM info to retrieve LP token details for bidding
      const ammInfo = await this.getAMMInfo(params.asset1, params.asset2)
      
      const tx: AMMBid = {
        TransactionType: 'AMMBid',
        Account: params.wallet.address,
        Asset: this.formatCurrency(params.asset1),
        Asset2: this.formatCurrency(params.asset2),
        // BidMin and BidMax require full IssuedCurrencyAmount
        BidMin: params.bidMin ? {
          currency: ammInfo.lpTokenSupply,
          issuer: ammInfo.ammId,
          value: params.bidMin
        } as IssuedCurrencyAmount : undefined,
        BidMax: params.bidMax ? {
          currency: ammInfo.lpTokenSupply,
          issuer: ammInfo.ammId,
          value: params.bidMax
        } as IssuedCurrencyAmount : undefined,
        AuthAccounts: params.authAccounts?.map(acc => ({ 
          AuthAccount: { Account: acc } 
        }))
      }

      const response = await this.client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta !== 'string') {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Auction bid failed: ${response.result.meta.TransactionResult}`)
        }
      }

      // Extract auction slot info from metadata
      const slotInfo = this.extractAuctionSlotInfo(response)

      return {
        slotPrice: slotInfo.price,
        feeDiscount: slotInfo.discount,
        expiration: slotInfo.expiration,
        transactionHash: response.result.hash,
        ledgerIndex: response.result.ledger_index,
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to bid for auction slot: ${(error as Error).message}`)
    }
  }

  /**
   * Get AMM pool information
   * 
   * @param asset1 - First asset
   * @param asset2 - Second asset
   * @returns Pool information including balances, LP supply, and auction slot
   * @throws Error if pool not found
   */
  async getAMMInfo(asset1: AMMCurrency, asset2: AMMCurrency): Promise<AMMPoolInfo> {
    try {
      const response = await this.client.request({
        command: 'amm_info',
        asset: this.formatCurrency(asset1),
        asset2: this.formatCurrency(asset2),
        ledger_index: 'validated'
      })

      if (!response.result.amm) {
        throw new Error('AMM pool not found')
      }

      const amm = response.result.amm

      return {
        // AMM account address is the issuer of the LP token
        ammId: amm.lp_token.issuer,
        asset1,
        asset2,
        asset1Balance: typeof amm.amount === 'string' ? amm.amount : amm.amount.value,
        asset2Balance: typeof amm.amount2 === 'string' ? amm.amount2 : amm.amount2.value,
        lpTokenSupply: amm.lp_token.currency, // LP token currency code
        tradingFee: amm.trading_fee,
        auctionSlot: amm.auction_slot ? {
          account: amm.auction_slot.account,
          price: typeof amm.auction_slot.price === 'string' 
            ? amm.auction_slot.price 
            : amm.auction_slot.price?.value,
          // Convert string timestamp to number
          expiration: amm.auction_slot.expiration 
            ? parseInt(amm.auction_slot.expiration) 
            : undefined
        } : undefined
      }
    } catch (error) {
      throw new Error(`Failed to get AMM info: ${(error as Error).message}`)
    }
  }

  /**
   * Format currency for XRPL transactions
   */
  private formatCurrency(currency: AMMCurrency): any {
    if (currency.currency === 'XRP') {
      return currency.value || '0'
    }
    return {
      currency: currency.currency,
      issuer: currency.issuer,
      value: currency.value || '0'
    }
  }

  /**
   * Extract AMM ID from transaction response
   */
  private extractAMMId(response: TxResponse): string {
    // Extract from created nodes in metadata
    // This is a simplified implementation
    return '' // Placeholder - needs actual implementation based on XRPL response structure
  }

  /**
   * Extract LP token ID from transaction response
   */
  private extractLPTokenId(response: TxResponse): string {
    // Extract from created nodes in metadata
    return '' // Placeholder
  }

  /**
   * Extract LP tokens from deposit response
   */
  private extractLPTokens(response: TxResponse): string {
    // Extract from balance changes in metadata
    return '0' // Placeholder
  }

  /**
   * Extract withdrawal amounts from response
   */
  private extractWithdrawalAmounts(response: TxResponse): { asset1: string; asset2: string } {
    // Extract from balance changes in metadata
    return { asset1: '0', asset2: '0' } // Placeholder
  }

  /**
   * Extract auction slot info from response
   */
  private extractAuctionSlotInfo(response: TxResponse): { 
    price: string
    discount: number
    expiration: number
  } {
    // Extract from metadata
    return { price: '0', discount: 0, expiration: 0 } // Placeholder
  }

  /**
   * Calculate LP tokens for deposit
   * Formula: LP_tokens = sqrt(amount1 * amount2) for initial deposit
   * For subsequent deposits: LP_tokens = (amount1 / reserve1) * total_LP_supply
   * 
   * @param asset1Amount - Amount of first asset to deposit
   * @param asset2Amount - Amount of second asset to deposit
   * @param currentAsset1 - Current pool balance of first asset
   * @param currentAsset2 - Current pool balance of second asset
   * @param currentLPSupply - Current LP token supply
   * @returns Estimated LP tokens to receive
   */
  calculateLPTokens(
    asset1Amount: string,
    asset2Amount: string,
    currentAsset1: string,
    currentAsset2: string,
    currentLPSupply: string
  ): string {
    const amt1 = parseFloat(asset1Amount)
    const amt2 = parseFloat(asset2Amount)
    const reserve1 = parseFloat(currentAsset1)
    const reserve2 = parseFloat(currentAsset2)
    const supply = parseFloat(currentLPSupply)

    // If pool is empty (first deposit), use geometric mean
    if (supply === 0 || reserve1 === 0 || reserve2 === 0) {
      return Math.sqrt(amt1 * amt2).toFixed(6)
    }

    // For existing pools, calculate proportional LP tokens
    // Use the asset with better proportionality
    const lpFromAsset1 = (amt1 / reserve1) * supply
    const lpFromAsset2 = (amt2 / reserve2) * supply

    // Return the minimum to ensure both assets can be deposited
    return Math.min(lpFromAsset1, lpFromAsset2).toFixed(6)
  }

  /**
   * Calculate withdrawal amounts for LP tokens
   * Formula: asset_amount = (LP_tokens / total_LP_supply) * reserve
   * 
   * @param lpTokenAmount - LP tokens to burn
   * @param currentAsset1 - Current pool balance of first asset
   * @param currentAsset2 - Current pool balance of second asset
   * @param currentLPSupply - Current LP token supply
   * @returns Estimated amounts to receive
   */
  calculateWithdrawal(
    lpTokenAmount: string,
    currentAsset1: string,
    currentAsset2: string,
    currentLPSupply: string
  ): { asset1: string; asset2: string } {
    const lpTokens = parseFloat(lpTokenAmount)
    const reserve1 = parseFloat(currentAsset1)
    const reserve2 = parseFloat(currentAsset2)
    const supply = parseFloat(currentLPSupply)

    if (supply === 0) {
      return { asset1: '0', asset2: '0' }
    }

    // Calculate proportional withdrawal
    const shareRatio = lpTokens / supply
    const asset1Amount = reserve1 * shareRatio
    const asset2Amount = reserve2 * shareRatio

    return {
      asset1: asset1Amount.toFixed(6),
      asset2: asset2Amount.toFixed(6)
    }
  }
}

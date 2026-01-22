/**
 * Multi-Chain Derivatives Service - Backend
 * 
 * Orchestrates derivative trading across multiple blockchains
 * Routes to chain-specific adapters (Injective, Ethereum, etc.)
 */

import { getSupabaseClient } from '../../infrastructure/database/supabase';
import { InjectiveDerivativesAdapter } from './adapters/InjectiveDerivativesAdapter';
import type {
  LaunchPerpetualMarketParams,
  LaunchExpiryFutureParams,
  OpenPositionParams,
  ClosePositionParams,
  GetMarketsParams,
  GetPositionsParams,
  LaunchMarketResult,
  OpenPositionResult,
  ClosePositionResult,
  FundingRateInfo,
  MarketInfo,
  DerivativeMarket,
  DerivativePosition,
  IDerivativesAdapter
} from './types';

export class DerivativesService {
  /**
   * Launch a perpetual futures market
   */
  static async launchPerpetualMarket(
    params: LaunchPerpetualMarketParams
  ): Promise<LaunchMarketResult> {
    const adapter = this.getAdapter(params.blockchain);
    
    // Launch market via adapter
    const result = await adapter.launchPerpetualMarket(params);
    
    // Save to database
    await this.saveMarket({
      project_id: params.projectId || undefined,
      product_id: params.productId || undefined,
      blockchain: params.blockchain,
      network: params.network,
      chain_id: await this.getChainId(params.blockchain, params.network),
      market_id: result.marketId,
      market_type: 'perpetual',
      ticker: params.ticker,
      quote_denom: params.quoteDenom,
      oracle_config: {
        base: params.oracleBase,
        quote: params.oracleQuote,
        type: params.oracleType
      },
      margin_config: {
        initial_margin_ratio: params.initialMarginRatio,
        maintenance_margin_ratio: params.maintenanceMarginRatio
      },
      fees: {
        maker_fee_rate: params.makerFeeRate,
        taker_fee_rate: params.takerFeeRate
      },
      funding_config: {
        funding_interval: params.fundingInterval || 3600,
        min_funding_rate: params.minFundingRate || '-0.0005',
        max_funding_rate: params.maxFundingRate || '0.0005'
      },
      status: 'active'
    });
    
    return result;
  }

  /**
   * Launch an expiry futures market
   */
  static async launchExpiryFuture(
    params: LaunchExpiryFutureParams
  ): Promise<LaunchMarketResult> {
    const adapter = this.getAdapter(params.blockchain);
    
    // Launch market via adapter
    const result = await adapter.launchExpiryFuture(params);
    
    // Save to database
    await this.saveMarket({
      project_id: params.projectId || undefined,
      product_id: params.productId || undefined,
      blockchain: params.blockchain,
      network: params.network,
      chain_id: await this.getChainId(params.blockchain, params.network),
      market_id: result.marketId,
      market_type: 'expiry_future',
      ticker: params.ticker,
      quote_denom: params.quoteDenom,
      oracle_config: {
        base: params.oracleBase,
        quote: params.oracleQuote,
        type: params.oracleType
      },
      margin_config: {
        initial_margin_ratio: params.initialMarginRatio,
        maintenance_margin_ratio: params.maintenanceMarginRatio
      },
      fees: {
        maker_fee_rate: params.makerFeeRate,
        taker_fee_rate: params.takerFeeRate
      },
      expiry_date: params.expiryDate.toISOString(),
      status: 'active'
    });
    
    return result;
  }

  /**
   * Open a position
   */
  static async openPosition(
    params: OpenPositionParams
  ): Promise<OpenPositionResult> {
    const supabase = getSupabaseClient();
    
    // Get market info to determine blockchain
    const { data: market } = await supabase
      .from('derivative_markets')
      .select('blockchain, network')
      .eq('market_id', params.marketId)
      .single();
    
    if (!market) {
      throw new Error(`Market not found: ${params.marketId}`);
    }
    
    const adapter = this.getAdapter(market.blockchain);
    
    // Open position via adapter
    const result = await adapter.openPosition(params);
    
    // Save to database
    await this.savePosition(result.position);
    
    return result;
  }

  /**
   * Close a position
   */
  static async closePosition(
    params: ClosePositionParams
  ): Promise<ClosePositionResult> {
    const supabase = getSupabaseClient();
    
    // Get position info to determine blockchain
    const { data: position } = await supabase
      .from('derivative_positions')
      .select('blockchain, network, market_id')
      .eq('id', params.positionId)
      .single();
    
    if (!position) {
      throw new Error(`Position not found: ${params.positionId}`);
    }
    
    const adapter = this.getAdapter(position.blockchain);
    
    // Close position via adapter
    const result = await adapter.closePosition(params);
    
    // Update position in database
    await supabase
      .from('derivative_positions')
      .update({
        status: 'closed',
        realized_pnl: result.realizedPnl,
        fees_paid: result.fees,
        closed_at: new Date().toISOString()
      })
      .eq('id', params.positionId);
    
    return result;
  }

  /**
   * Get market information
   */
  static async getMarketInfo(
    marketId: string,
    blockchain: string,
    network: string = 'testnet'
  ): Promise<MarketInfo> {
    const adapter = this.getAdapter(blockchain);
    return adapter.getMarketInfo(marketId, network);
  }

  /**
   * Get funding rate
   */
  static async getFundingRate(
    marketId: string,
    blockchain: string,
    network: string = 'testnet'
  ): Promise<FundingRateInfo> {
    const adapter = this.getAdapter(blockchain);
    return adapter.getFundingRate(marketId, network);
  }

  /**
   * Get markets with filters
   */
  static async getMarkets(params: GetMarketsParams): Promise<DerivativeMarket[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('derivative_markets').select('*');
    
    if (params.projectId) query = query.eq('project_id', params.projectId);
    if (params.productId) query = query.eq('product_id', params.productId);
    if (params.blockchain) query = query.eq('blockchain', params.blockchain);
    if (params.network) query = query.eq('network', params.network);
    if (params.marketType) query = query.eq('market_type', params.marketType);
    if (params.status) query = query.eq('status', params.status);
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get positions with filters
   */
  static async getPositions(params: GetPositionsParams): Promise<DerivativePosition[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('derivative_positions').select('*');
    
    if (params.userAddress) query = query.eq('user_address', params.userAddress);
    if (params.marketId) query = query.eq('market_id', params.marketId);
    if (params.projectId) query = query.eq('project_id', params.projectId);
    if (params.productId) query = query.eq('product_id', params.productId);
    if (params.blockchain) query = query.eq('blockchain', params.blockchain);
    if (params.network) query = query.eq('network', params.network);
    if (params.status) query = query.eq('status', params.status);
    
    query = query.order('opened_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get orders for a user
   */
  static async getOrders(params: {
    userAddress: string;
    marketId?: string;
    status?: 'pending' | 'partial' | 'filled' | 'cancelled';
    side?: 'buy' | 'sell';
    blockchain: string;
    network: string;
  }): Promise<any[]> {
    const adapter = this.getAdapter(params.blockchain);
    return adapter.getOrders(params);
  }

  /**
   * Cancel an order
   */
  static async cancelOrder(params: {
    orderId: string;
    userAddress: string;
    marketId: string;
    blockchain: string;
    network: string;
    privateKey: string;
    subaccountId?: string;
  }): Promise<{ orderId: string; txHash: string }> {
    const adapter = this.getAdapter(params.blockchain);
    return adapter.cancelOrder(params);
  }

  /**
   * Get trade history for a user
   */
  static async getTradeHistory(params: {
    userAddress: string;
    marketId?: string;
    side?: 'buy' | 'sell';
    blockchain: string;
    network: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const adapter = this.getAdapter(params.blockchain);
    return adapter.getTradeHistory(params);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Get adapter for blockchain
   */
  private static getAdapter(blockchain: string): IDerivativesAdapter {
    switch (blockchain.toLowerCase()) {
      case 'injective':
        return new InjectiveDerivativesAdapter();
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  /**
   * Save market to database
   */
  private static async saveMarket(market: Partial<DerivativeMarket>): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('derivative_markets')
      .insert(market);
    
    if (error) throw error;
  }

  /**
   * Save position to database
   */
  private static async savePosition(position: Partial<DerivativePosition>): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('derivative_positions')
      .insert(position);
    
    if (error) throw error;
  }

  /**
   * Get chain ID for blockchain/network
   */
  private static async getChainId(blockchain: string, network: string): Promise<string> {
    const chainIds: Record<string, Record<string, string>> = {
      injective: {
        mainnet: '1',
        testnet: '1439',
        devnet: '1776'
      }
    };
    
    return chainIds[blockchain.toLowerCase()]?.[network.toLowerCase()] || '1';
  }
}

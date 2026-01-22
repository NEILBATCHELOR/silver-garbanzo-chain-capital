/**
 * Derivatives Backend Service - Frontend
 * 
 * Service to interact with backend derivatives APIs
 * Handles authentication, error handling, and data transformation
 */

import type {
  DerivativeMarket,
  DerivativePosition,
  OpenPositionParams,
  OpenPositionResult,
  LaunchPerpetualMarketParams,
  FundingRateInfo
} from './types';

// API Base URL from environment
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LaunchMarketResponse {
  marketId: string;
  txHash: string;
  market: DerivativeMarket;
}

interface OpenPositionResponse {
  positionId: string;
  txHash: string;
  position: DerivativePosition;
  requiredMargin: string;
  liquidationPrice: string;
  estimatedFees: string;
}

interface ClosePositionResponse {
  positionId: string;
  txHash: string;
  closedQuantity: string;
  exitPrice: string;
  realizedPnl: string;
  fees: string;
}

interface MarketInfoResponse {
  marketId: string;
  ticker: string;
  lastPrice: string;
  markPrice: string;
  indexPrice: string;
  volume24h: string;
  high24h: string;
  low24h: string;
  openInterest: string;
  orderbook: {
    bids: Array<{ price: string; quantity: string }>;
    asks: Array<{ price: string; quantity: string }>;
  };
  recentTrades: Array<{
    price: string;
    quantity: string;
    side: 'buy' | 'sell';
    timestamp: string;
  }>;
}

interface FundingRateResponse {
  currentRate: string;
  nextPaymentTime: string;
  estimatedPayment: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed (${endpoint}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// DERIVATIVES BACKEND SERVICE
// ============================================================================

export class DerivativesBackendService {
  
  // ==========================================================================
  // MARKET LAUNCH
  // ==========================================================================

  /**
   * Launch perpetual futures market
   */
  static async launchPerpetualMarket(
    params: LaunchPerpetualMarketParams & {
      deployerAddress: string;
      privateKey: string;
      fundingInterval?: number;
      fundingRateCoefficient?: string;
    }
  ): Promise<ApiResponse<LaunchMarketResponse>> {
    return apiRequest<LaunchMarketResponse>(
      '/api/injective/derivatives/launch-perpetual',
      'POST',
      params
    );
  }

  /**
   * Launch expiry futures market
   */
  static async launchExpiryFuture(
    params: LaunchPerpetualMarketParams & {
      deployerAddress: string;
      privateKey: string;
      expiryDate: string;
      settlementType: 'physical' | 'cash';
    }
  ): Promise<ApiResponse<LaunchMarketResponse>> {
    return apiRequest<LaunchMarketResponse>(
      '/api/injective/derivatives/launch-future',
      'POST',
      params
    );
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Open a derivative position
   */
  static async openPosition(
    params: OpenPositionParams & {
      privateKey: string;
      price?: string;
      maintenanceMarginRatio?: string;
    }
  ): Promise<ApiResponse<OpenPositionResponse>> {
    return apiRequest<OpenPositionResponse>(
      '/api/injective/derivatives/open-position',
      'POST',
      params
    );
  }

  /**
   * Close a derivative position
   */
  static async closePosition(params: {
    positionId: string;
    userAddress: string;
    marketId: string;
    isLong: boolean;
    quantity?: string;
    entryPrice: string;
    price?: string;
    blockchain: string;
    network: string;
    subaccountId?: string;
    privateKey: string;
  }): Promise<ApiResponse<ClosePositionResponse>> {
    return apiRequest<ClosePositionResponse>(
      '/api/injective/derivatives/close-position',
      'POST',
      params
    );
  }

  // ==========================================================================
  // MARKET QUERIES
  // ==========================================================================

  /**
   * Get markets with filters
   */
  static async getMarkets(filters?: {
    projectId?: string;
    productId?: string;
    blockchain?: string;
    network?: string;
    marketType?: string;
    status?: string;
  }): Promise<ApiResponse<DerivativeMarket[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/api/injective/derivatives/markets${params.toString() ? '?' + params.toString() : ''}`;
    return apiRequest<DerivativeMarket[]>(endpoint, 'GET');
  }

  /**
   * Get market information
   */
  static async getMarketInfo(
    marketId: string,
    blockchain: string = 'injective'
  ): Promise<ApiResponse<MarketInfoResponse>> {
    return apiRequest<MarketInfoResponse>(
      `/api/injective/derivatives/market-info/${marketId}?blockchain=${blockchain}`,
      'GET'
    );
  }

  /**
   * Get funding rate (perpetuals only)
   */
  static async getFundingRate(
    marketId: string,
    blockchain: string = 'injective'
  ): Promise<ApiResponse<FundingRateResponse>> {
    return apiRequest<FundingRateResponse>(
      `/api/injective/derivatives/funding-rate/${marketId}?blockchain=${blockchain}`,
      'GET'
    );
  }

  // ==========================================================================
  // POSITION QUERIES
  // ==========================================================================

  /**
   * Get positions with filters
   */
  static async getPositions(filters?: {
    userAddress?: string;
    marketId?: string;
    projectId?: string;
    productId?: string;
    blockchain?: string;
    network?: string;
    status?: string;
  }): Promise<ApiResponse<DerivativePosition[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/api/injective/derivatives/positions${params.toString() ? '?' + params.toString() : ''}`;
    return apiRequest<DerivativePosition[]>(endpoint, 'GET');
  }

  /**
   * Get user positions for a market
   */
  static async getUserMarketPositions(
    userAddress: string,
    marketId: string,
    blockchain: string = 'injective',
    network: string = 'testnet'
  ): Promise<ApiResponse<DerivativePosition[]>> {
    return this.getPositions({
      userAddress,
      marketId,
      blockchain,
      network,
      status: 'open'
    });
  }

  /**
   * Get all open positions for user
   */
  static async getUserOpenPositions(
    userAddress: string,
    blockchain: string = 'injective',
    network: string = 'testnet'
  ): Promise<ApiResponse<DerivativePosition[]>> {
    return this.getPositions({
      userAddress,
      blockchain,
      network,
      status: 'open'
    });
  }

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  /**
   * Get market summary (info + funding rate)
   */
  static async getMarketSummary(
    marketId: string,
    blockchain: string = 'injective'
  ): Promise<{
    info?: MarketInfoResponse;
    fundingRate?: FundingRateResponse;
    error?: string;
  }> {
    const [infoResponse, fundingResponse] = await Promise.all([
      this.getMarketInfo(marketId, blockchain),
      this.getFundingRate(marketId, blockchain)
    ]);

    return {
      info: infoResponse.data,
      fundingRate: fundingResponse.data,
      error: infoResponse.error || fundingResponse.error
    };
  }

  /**
   * Get position with market info
   */
  static async getPositionWithMarketInfo(
    positionId: string,
    blockchain: string = 'injective'
  ): Promise<{
    position?: DerivativePosition;
    marketInfo?: MarketInfoResponse;
    error?: string;
  }> {
    const positionsResponse = await this.getPositions({
      blockchain
    });

    if (!positionsResponse.success || !positionsResponse.data) {
      return { error: positionsResponse.error };
    }

    const position = positionsResponse.data.find(p => p.id === positionId);
    if (!position) {
      return { error: 'Position not found' };
    }

    const infoResponse = await this.getMarketInfo(position.marketId, blockchain);

    return {
      position,
      marketInfo: infoResponse.data,
      error: infoResponse.error
    };
  }

  /**
   * Calculate required margin for position
   */
  static calculateRequiredMargin(
    quantity: string,
    price: string,
    leverage: number
  ): string {
    const qty = parseFloat(quantity);
    const px = parseFloat(price);
    return ((qty * px) / leverage).toString();
  }

  /**
   * Calculate liquidation price
   */
  static calculateLiquidationPrice(
    entryPrice: string,
    leverage: number,
    isLong: boolean,
    maintenanceMargin: string = '0.025'
  ): string {
    const entry = parseFloat(entryPrice);
    const maintenance = parseFloat(maintenanceMargin);
    
    if (isLong) {
      // Long liquidation: entry * (1 - 1/leverage + maintenance)
      return (entry * (1 - 1/leverage + maintenance)).toString();
    } else {
      // Short liquidation: entry * (1 + 1/leverage - maintenance)
      return (entry * (1 + 1/leverage - maintenance)).toString();
    }
  }

  /**
   * Calculate estimated PnL
   */
  static calculatePnL(
    entryPrice: string,
    currentPrice: string,
    quantity: string,
    isLong: boolean
  ): string {
    const entry = parseFloat(entryPrice);
    const current = parseFloat(currentPrice);
    const qty = parseFloat(quantity);
    
    const pnl = isLong 
      ? (current - entry) * qty
      : (entry - current) * qty;
      
    return pnl.toString();
  }

  /**
   * Format position for display
   */
  static formatPosition(position: DerivativePosition): {
    side: 'Long' | 'Short';
    leverage: string;
    margin: string;
    pnl: string;
    pnlPercent: string;
    roe: string;
  } {
    const side = position.isLong ? 'Long' : 'Short';
    const leverage = position.leverage?.toString() || '1';
    const margin = parseFloat(position.margin).toFixed(2);
    
    const unrealizedPnl = parseFloat(position.unrealizedPnl || '0');
    const pnl = unrealizedPnl.toFixed(2);
    
    const marginValue = parseFloat(position.margin);
    const pnlPercent = marginValue > 0 
      ? ((unrealizedPnl / marginValue) * 100).toFixed(2)
      : '0.00';
    
    const roe = marginValue > 0 
      ? ((unrealizedPnl / marginValue) * 100).toFixed(2)
      : '0.00';

    return {
      side,
      leverage,
      margin,
      pnl,
      pnlPercent,
      roe
    };
  }

  // ==========================================================================
  // ORDERS & TRADE HISTORY (TODO: Backend endpoints needed)
  // ==========================================================================

  /**
   * Get orders for a user
   */
  static async getOrders(params: {
    userAddress: string;
    marketId?: string;
    status?: 'pending' | 'partial' | 'filled' | 'cancelled';
    side?: 'buy' | 'sell';
    blockchain?: string;
    network?: string;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest<any[]>(
      `/api/injective/derivatives/orders?${queryParams.toString()}`,
      'GET'
    );
  }

  /**
   * Cancel an order
   */
  static async cancelOrder(params: {
    orderId: string;
    userAddress: string;
    marketId: string;
    blockchain?: string;
    network?: string;
    privateKey: string;
  }): Promise<ApiResponse<{ orderId: string; txHash: string }>> {
    return apiRequest<{ orderId: string; txHash: string }>(
      '/api/injective/derivatives/cancel-order',
      'POST',
      params
    );
  }

  /**
   * Get trade history for a user
   */
  static async getTradeHistory(params: {
    userAddress: string;
    marketId?: string;
    side?: 'buy' | 'sell';
    blockchain?: string;
    network?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest<any[]>(
      `/api/injective/derivatives/trade-history?${queryParams.toString()}`,
      'GET'
    );
  }
}

export default DerivativesBackendService;

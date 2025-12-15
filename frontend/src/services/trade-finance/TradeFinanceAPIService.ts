/**
 * Trade Finance API Service
 * 
 * Handles all REST API calls to the backend for trade finance operations
 * Separate from CommodityPoolService which handles blockchain transactions
 * 
 * This service is for:
 * - Position queries (health factor, collateral, debt)
 * - Price data (current, historical)
 * - Haircut calculations (metrics, recommendations)
 * - Risk monitoring
 */

import { API_CONFIG } from '@/config/api';

// ============================================================================
// INTERFACES
// ============================================================================

export interface HealthFactorResponse {
  user: string;
  healthFactor: number;
  status: 'healthy' | 'warning' | 'danger' | 'liquidatable';
  totalCollateralValue: number;
  totalDebt: number;
  liquidationThreshold: number;
  updatedAt: string;
}

export interface PositionDetails {
  position: {
    walletAddress: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  collateral: Array<{
    id: string;
    commodity_type: string;
    token_address: string;
    token_id?: string;
    amount: string;
    value_usd: number;
    haircut_bps: number;
    quality?: string;
    certificate_date?: string;
    created_at: string;
  }>;
  debt: Array<{
    id: string;
    asset_address: string;
    amount: string;
    value_usd: number;
    interest_rate_bps: number;
    accrued_interest: string;
    created_at: string;
    last_updated: string;
  }>;
  metrics: {
    totalCollateralValue: number;
    totalDebt: number;
    healthFactor: number;
    liquidationThreshold: number;
    borrowingPower: number;
    availableToBorrow: number;
    utilizationRate: number;
  };
}

export interface LiquidatablePosition {
  walletAddress: string;
  healthFactor: number;
  totalCollateralValue: number;
  totalDebt: number;
  collateral: any[];
  debt: any[];
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface RiskMetrics {
  volatility: number;
  volatilityBps: number;
  maxDrawdown: number;
  maxDrawdownBps: number;
  valueAtRisk95: number;
  var95Bps: number;
  valueAtRisk99: number;
  var99Bps: number;
  sharpeRatio: number;
  liquidityScore: number;
  dataPoints: number;
  intervalType: 'hourly' | 'daily' | 'weekly' | 'irregular';
}

export interface HaircutRecommendation {
  totalHaircut: number;
  baseHaircut: number;
  volatilityComponent: number;
  drawdownComponent: number;
  liquidityComponent: number;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// TRADE FINANCE API SERVICE
// ============================================================================

export class TradeFinanceAPIService {
  private baseURL: string;
  private projectId: string;

  constructor(projectId: string, baseURL?: string) {
    this.baseURL = baseURL || API_CONFIG.baseURL || 'http://localhost:3001';
    this.projectId = projectId;
  }

  // ============================================================================
  // POSITION QUERIES
  // ============================================================================

  /**
   * Get health factor for a user
   */
  async getHealthFactor(userAddress: string): Promise<HealthFactorResponse> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/positions/health-factor/${userAddress}?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch health factor');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get detailed position information
   */
  async getPositionDetails(userAddress: string): Promise<PositionDetails> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/positions/details/${userAddress}?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch position details');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get all liquidatable positions
   */
  async getLiquidatablePositions(
    threshold: number = 1.0
  ): Promise<{ count: number; positions: LiquidatablePosition[]; threshold: number }> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/positions/liquidatable?project_id=${this.projectId}&threshold=${threshold}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch liquidatable positions');
    }

    const result = await response.json();
    return result.data;
  }

  // ============================================================================
  // HAIRCUT CALCULATIONS
  // ============================================================================

  /**
   * Calculate haircut from historical price data
   */
  async calculateHaircut(
    prices: PricePoint[],
    commodityType: string
  ): Promise<{
    metrics: RiskMetrics;
    recommendation: HaircutRecommendation;
    commodityType: string;
    timestamp: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/trade-finance/haircut/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prices,
        commodityType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to calculate haircut');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get current haircut metrics for a commodity
   */
  async getHaircutMetrics(commodity: string): Promise<RiskMetrics & { calculated_at: string }> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/haircut/metrics/${commodity}?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch haircut metrics');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get historical haircut metrics
   */
  async getHaircutHistory(commodity: string): Promise<Array<RiskMetrics & { calculated_at: string }>> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/haircut/history/${commodity}?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch haircut history');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Submit metrics to blockchain (Risk Admin only)
   */
  async submitMetricsOnChain(
    commodityType: string,
    metrics: RiskMetrics
  ): Promise<{
    success: boolean;
    commodityType: string;
    metrics: any;
    message: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/trade-finance/haircut/submit-onchain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commodityType,
        metrics,
        projectId: this.projectId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to submit metrics');
    }

    const result = await response.json();
    return result.data;
  }

  // ============================================================================
  // PRICE DATA
  // ============================================================================

  /**
   * Update commodity prices from FRED
   */
  async updatePrices(
    commodities?: string[]
  ): Promise<{
    updated: number;
    failed: number;
    success: string[];
    failures: string[];
    timestamp: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/trade-finance/prices/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: this.projectId,
        commodities,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update prices');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get current price for a commodity
   */
  async getCurrentPrice(
    commodity: string,
    maxAgeMinutes: number = 60
  ): Promise<{
    commodity: string;
    price: number;
    currency: string;
    timestamp: string;
    age_minutes: number;
  }> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/prices/current/${commodity}?project_id=${this.projectId}&max_age_minutes=${maxAgeMinutes}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch current price');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get historical prices for a commodity
   */
  async getHistoricalPrices(
    commodity: string,
    startDate: string,
    endDate: string
  ): Promise<PricePoint[]> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/prices/historical/${commodity}?project_id=${this.projectId}&start_date=${startDate}&end_date=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch historical prices');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Load historical data from FRED
   */
  async loadHistoricalData(
    commodities: string[],
    startDate: string,
    endDate: string
  ): Promise<{
    loaded: number;
    failed: number;
    success: string[];
    failures: string[];
  }> {
    const response = await fetch(`${this.baseURL}/api/trade-finance/prices/load-historical`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: this.projectId,
        commodities,
        start_date: startDate,
        end_date: endDate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to load historical data');
    }

    const result = await response.json();
    return result.data;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Trade Finance API service instance
 */
export function createTradeFinanceAPIService(projectId: string, baseURL?: string): TradeFinanceAPIService {
  return new TradeFinanceAPIService(projectId, baseURL);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TradeFinanceAPIService;

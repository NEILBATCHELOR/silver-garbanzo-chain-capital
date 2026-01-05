/**
 * Trade Finance Marketplace Service
 * 
 * Handles marketplace-specific API calls:
 * - Market overview and stats
 * - Commodity markets list
 * - User positions
 * - Recent activity
 */

import { API_CONFIG } from '@/config/api';
import type {
  MarketOverview,
  CommodityMarket,
  UserPosition,
  MarketStats,
  MarketActivity,
  MarketFilters,
} from '@/types/trade-finance/marketplace';

export class MarketplaceService {
  private baseURL: string;
  private projectId: string;

  constructor(projectId: string, baseURL?: string) {
    this.baseURL = baseURL || API_CONFIG.baseURL || 'http://localhost:3001';
    this.projectId = projectId;
  }

  // ============================================================================
  // MARKET OVERVIEW
  // ============================================================================

  /**
   * Get market overview (TVL, total supplied, total borrowed, etc.)
   */
  async getMarketOverview(): Promise<MarketOverview> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/marketplace/overview?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch market overview');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get market stats (aggregated statistics)
   */
  async getMarketStats(): Promise<MarketStats> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/marketplace/stats?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch market stats');
    }

    const result = await response.json();
    return result.data;
  }

  // ============================================================================
  // COMMODITY MARKETS
  // ============================================================================

  /**
   * Get all commodity markets
   */
  async getMarkets(filters?: MarketFilters): Promise<CommodityMarket[]> {
    const params = new URLSearchParams({ project_id: this.projectId });
    
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.commodityTypes) params.append('commodity_types', filters.commodityTypes.join(','));
      if (filters.minAPY !== undefined) params.append('min_apy', filters.minAPY.toString());
      if (filters.maxAPY !== undefined) params.append('max_apy', filters.maxAPY.toString());
      if (filters.onlyActive) params.append('only_active', 'true');
      if (filters.onlyCollateral) params.append('only_collateral', 'true');
      if (filters.onlyBorrowable) params.append('only_borrowable', 'true');
      if (filters.sortBy) params.append('sort_by', filters.sortBy);
      if (filters.sortOrder) params.append('sort_order', filters.sortOrder);
    }

    const response = await fetch(
      `${this.baseURL}/api/trade-finance/marketplace/markets?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch markets');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get specific commodity market
   */
  async getMarket(commodityType: string): Promise<CommodityMarket> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/marketplace/markets/${commodityType}?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch market');
    }

    const result = await response.json();
    return result.data;
  }

  // ============================================================================
  // USER POSITIONS
  // ============================================================================

  /**
   * Get user position
   */
  async getUserPosition(walletAddress: string): Promise<UserPosition> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/marketplace/positions/${walletAddress}?project_id=${this.projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch user position');
    }

    const result = await response.json();
    return result.data;
  }

  // ============================================================================
  // ACTIVITY
  // ============================================================================

  /**
   * Get recent market activity
   */
  async getRecentActivity(limit: number = 10): Promise<MarketActivity[]> {
    const response = await fetch(
      `${this.baseURL}/api/trade-finance/marketplace/activity?project_id=${this.projectId}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch activity');
    }

    const result = await response.json();
    return result.data;
  }
}

/**
 * Create a marketplace service instance
 */
export function createMarketplaceService(projectId: string, baseURL?: string): MarketplaceService {
  return new MarketplaceService(projectId, baseURL);
}

export default MarketplaceService;

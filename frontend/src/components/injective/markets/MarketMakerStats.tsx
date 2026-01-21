/**
 * MarketMakerStats Component
 * 
 * Displays key statistics for market making operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Activity, 
  DollarSign, 
  BarChart3,
  Loader2 
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';

interface MarketMakerStats {
  activeMarkets: number;
  totalVolume: string;
  ordersPlaced: number;
  successRate: number;
  loading: boolean;
}

export const MarketMakerStats: React.FC = () => {
  const [stats, setStats] = useState<MarketMakerStats>({
    activeMarkets: 0,
    totalVolume: '0',
    ordersPlaced: 0,
    successRate: 0,
    loading: true
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get active markets
      const { data: markets, error: marketsError } = await supabase
        .from('product_markets')
        .select('*')
        .eq('blockchain', 'injective')
        .eq('is_active', true);

      if (marketsError) throw marketsError;

      // Get market maker operations
      const { data: operations, error: opsError } = await supabase
        .from('market_maker_operations')
        .select('*')
        .eq('blockchain', 'injective');

      if (opsError) throw opsError;

      // Calculate stats
      const activeMarkets = markets?.length || 0;
      const totalVolume = markets?.reduce((sum, m) => sum + parseFloat(m.total_volume || '0'), 0).toString();
      const ordersPlaced = markets?.reduce((sum, m) => sum + (m.total_orders_placed || 0), 0) || 0;
      const successfulOps = operations?.filter(op => op.success).length || 0;
      const totalOps = operations?.length || 0;
      const successRate = totalOps > 0 ? (successfulOps / totalOps) * 100 : 0;

      setStats({
        activeMarkets,
        totalVolume,
        ordersPlaced,
        successRate,
        loading: false
      });
    } catch (error) {
      console.error('Error loading market maker stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Making Statistics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Making Statistics</CardTitle>
        <CardDescription>
          Automated market making performance across Injective DEX
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Active Markets */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>Active Markets</span>
            </div>
            <div className="text-2xl font-bold">{stats.activeMarkets}</div>
          </div>

          {/* Total Volume */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Total Volume</span>
            </div>
            <div className="text-2xl font-bold">
              ${parseFloat(stats.totalVolume).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Orders Placed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Orders Placed</span>
            </div>
            <div className="text-2xl font-bold">{stats.ordersPlaced.toLocaleString()}</div>
          </div>

          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Success Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {stats.successRate.toFixed(1)}%
              </div>
              <Badge variant={stats.successRate >= 95 ? 'default' : 'secondary'}>
                {stats.successRate >= 95 ? 'Excellent' : 'Good'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

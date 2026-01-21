/**
 * ActiveMarketsList Component
 * 
 * Displays list of active markets with quick actions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Pause, 
  Play, 
  Settings,
  TrendingUp,
  Loader2 
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { cn } from '@/utils/utils';

interface ProductMarket {
  id: string;
  product_id: string;
  market_id: string;
  blockchain: string;
  network: string;
  spread_bps: number;
  order_size: string;
  is_active: boolean;
  last_order_at: string;
  total_orders_placed: number;
  total_volume: string;
}

export const ActiveMarketsList: React.FC = () => {
  const [markets, setMarkets] = useState<ProductMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('product_markets')
        .select('*')
        .eq('blockchain', 'injective')
        .order('last_order_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setMarkets(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading markets:', error);
      setLoading(false);
    }
  };

  const handlePauseResume = async (marketId: string, currentlyActive: boolean) => {
    try {
      const { error } = await supabase
        .from('product_markets')
        .update({ is_active: !currentlyActive })
        .eq('market_id', marketId);

      if (error) throw error;

      // Reload markets
      await loadMarkets();
    } catch (error) {
      console.error('Error updating market status:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Markets</CardTitle>
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
        <CardTitle>Active Markets</CardTitle>
        <CardDescription>
          Recently active markets with automated market making
        </CardDescription>
      </CardHeader>
      <CardContent>
        {markets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No active markets found.</p>
            <p className="text-sm mt-2">Deploy a market maker to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {markets.map((market) => (
              <div
                key={market.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{market.market_id.slice(0, 8)}...</code>
                    <Badge variant={market.is_active ? 'default' : 'secondary'}>
                      {market.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Spread: {(market.spread_bps / 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      Orders: {market.total_orders_placed?.toLocaleString() || 0}
                    </div>
                    <div>
                      Volume: ${parseFloat(market.total_volume || '0').toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePauseResume(market.market_id, market.is_active)}
                  >
                    {market.is_active ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

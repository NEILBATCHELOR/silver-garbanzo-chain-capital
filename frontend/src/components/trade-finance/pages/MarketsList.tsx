/**
 * Markets List Page
 * Browse all available commodity markets
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketRow } from '@/components/trade-finance/markets/market-row';
import { WalletConnectButton } from '@/components/trade-finance/shared/wallet-connect-button';
import { useTradeFinance } from '@/providers/trade-finance';
import { createMarketplaceService } from '@/services/trade-finance/MarketplaceService';
import type { CommodityMarket, MarketFilters } from '@/types/trade-finance/marketplace';
import { Search, AlertCircle, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function MarketsList() {
  const { projectId } = useTradeFinance();
  const [markets, setMarkets] = useState<CommodityMarket[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<CommodityMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'supplyAPY' | 'borrowAPY' | 'totalSupply' | 'utilization'>('supplyAPY');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const marketplaceService = createMarketplaceService(projectId);

  useEffect(() => {
    loadMarkets();
  }, []);

  useEffect(() => {
    filterAndSortMarkets();
  }, [markets, searchQuery, sortBy, sortOrder]);

  const loadMarkets = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await marketplaceService.getMarkets();
      setMarkets(data);
    } catch (err) {
      console.error('Error loading markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortMarkets = () => {
    let filtered = [...markets];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.commodityName.toLowerCase().includes(query) ||
          m.symbol.toLowerCase().includes(query) ||
          m.commodityType.toLowerCase().includes(query)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortBy) {
        case 'supplyAPY':
          aVal = a.supplyAPY;
          bVal = b.supplyAPY;
          break;
        case 'borrowAPY':
          aVal = a.borrowAPY;
          bVal = b.borrowAPY;
          break;
        case 'totalSupply':
          aVal = a.totalSupplyUSD;
          bVal = b.totalSupplyUSD;
          break;
        case 'utilization':
          aVal = a.utilizationRate;
          bVal = b.utilizationRate;
          break;
        default:
          aVal = a.supplyAPY;
          bVal = b.supplyAPY;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    setFilteredMarkets(filtered);
  };

  if (loading) {
    return <MarketsListSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadMarkets} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Markets</h1>
          <p className="text-muted-foreground mt-1">
            {markets.length} commodit{markets.length === 1 ? 'y' : 'ies'} available
          </p>
        </div>
        <WalletConnectButton />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search commodities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supplyAPY">Supply APY</SelectItem>
                <SelectItem value="borrowAPY">Borrow APY</SelectItem>
                <SelectItem value="totalSupply">Total Supply</SelectItem>
                <SelectItem value="utilization">Utilization</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMarkets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No markets found matching your criteria
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMarkets.map((market) => (
                <MarketRow key={market.commodityType} market={market} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketsListSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-10 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MarketsList;

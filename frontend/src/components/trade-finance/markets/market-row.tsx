/**
 * Market Row Component
 * Individual row in the markets list
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CommodityMarket } from '@/types/trade-finance/marketplace';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/utils';

interface MarketRowProps {
  market: CommodityMarket;
}

export function MarketRow({ market }: MarketRowProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
      onClick={() => navigate(`/marketplace/markets/${market.commodityType}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{market.commodityName}</span>
          <Badge variant="outline">{market.symbol}</Badge>
          {!market.isActive && <Badge variant="destructive">Inactive</Badge>}
          {market.isIsolated && <Badge variant="secondary">Isolated</Badge>}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {formatCurrency(market.currentPrice)} per unit
        </div>
      </div>

      <div className="text-right w-24">
        <div className="text-sm text-muted-foreground">Supply</div>
        <div className="text-lg font-semibold text-green-600 flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          {formatPercent(market.supplyAPY)}
        </div>
      </div>

      <div className="text-right w-24">
        <div className="text-sm text-muted-foreground">Borrow</div>
        <div className="text-lg font-semibold text-blue-600 flex items-center gap-1">
          <TrendingDown className="h-4 w-4" />
          {formatPercent(market.borrowAPY)}
        </div>
      </div>

      <div className="text-right w-28">
        <div className="text-sm text-muted-foreground">Supply</div>
        <div className="font-medium">{formatCurrency(market.totalSupplyUSD)}</div>
      </div>

      <div className="text-right w-28">
        <div className="text-sm text-muted-foreground">Borrow</div>
        <div className="font-medium">{formatCurrency(market.totalBorrowUSD)}</div>
      </div>

      <div className="text-right w-24">
        <div className="text-sm text-muted-foreground">Utilization</div>
        <div className="font-medium">{formatPercent(market.utilizationRate)}</div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/marketplace/supply?commodity=${market.commodityType}`);
          }}
        >
          Supply
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/marketplace/borrow?commodity=${market.commodityType}`);
          }}
        >
          Borrow
        </Button>
      </div>
    </div>
  );
}

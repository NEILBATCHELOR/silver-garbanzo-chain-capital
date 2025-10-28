/**
 * Rate Preview Component
 * Shows real-time market rates and final rates with spreads applied
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { MarketRate } from '@/hooks/psp/usePSPMarketRates';
import { SpreadMatrixRow } from '@/hooks/psp/usePSPSpreads';

interface RatePreviewProps {
  rates: MarketRate[];
  matrix: SpreadMatrixRow[];
  loading: boolean;
  lastUpdated: string | null;
  selectedAsset: string | null;
  selectedTier: string | null;
}

export function RatePreview({
  rates,
  matrix,
  loading,
  lastUpdated,
  selectedAsset,
  selectedTier,
}: RatePreviewProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateFinalRate = (
    marketRate: number,
    spreadBps: number,
    direction: 'buy' | 'sell'
  ) => {
    const spreadMultiplier = spreadBps / 10000;
    if (direction === 'buy') {
      return marketRate * (1 + spreadMultiplier);
    } else {
      return marketRate * (1 - spreadMultiplier);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Real-Time Rates</h3>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        {lastUpdated && (
          <div className="text-xs text-gray-500">
            Last updated: {formatTime(lastUpdated)}
          </div>
        )}
      </Card>

      {/* Rate Cards */}
      <div className="space-y-3">
        {rates.map((rate) => {
          const row = matrix.find(m => m.cryptoAsset === rate.asset);
          const tierData = selectedTier && row ? row.tiers[selectedTier] : null;
          const isSelected = selectedAsset === rate.asset;

          return (
            <Card 
              key={rate.asset} 
              className={`p-4 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{rate.symbol}</span>
                  {isSelected && selectedTier && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTier}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {formatPrice(rate.usdPrice)}
                  </div>
                  <div className="text-xs text-gray-500">Market Rate</div>
                </div>
              </div>

              {tierData && isSelected && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  {/* Buy Rate with Spread */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium">Buy Rate</div>
                        <div className="text-xs text-gray-500">
                          +{tierData.buySpreadBps} bps
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {formatPrice(
                          calculateFinalRate(rate.usdPrice, tierData.buySpreadBps, 'buy')
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        +{formatPrice(
                          calculateFinalRate(rate.usdPrice, tierData.buySpreadBps, 'buy') - rate.usdPrice
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sell Rate with Spread */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="text-sm font-medium">Sell Rate</div>
                        <div className="text-xs text-gray-500">
                          -{tierData.sellSpreadBps} bps
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-red-600">
                        {formatPrice(
                          calculateFinalRate(rate.usdPrice, tierData.sellSpreadBps, 'sell')
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        -{formatPrice(
                          rate.usdPrice - calculateFinalRate(rate.usdPrice, tierData.sellSpreadBps, 'sell')
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isSelected && (
                <div className="mt-3 text-xs text-gray-400 text-center">
                  Click a cell to see spread rates
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {rates.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <div className="text-sm text-gray-500">
            No market rates available
          </div>
        </Card>
      )}
    </div>
  );
}

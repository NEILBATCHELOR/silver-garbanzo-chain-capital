import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DerivativesBackendService } from '@/services/derivatives/DerivativesBackendService';

interface FundingRateDisplayProps {
  marketId: string;
  ticker?: string;
}

interface FundingRate {
  currentRate: number;
  predictedRate: number;
  nextFundingTime: number;
  cumulativeFunding: number;
}

export const FundingRateDisplay: React.FC<FundingRateDisplayProps> = ({
  marketId,
  ticker,
}) => {
  const [fundingRate, setFundingRate] = useState<FundingRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeToFunding, setTimeToFunding] = useState<string>('');

  useEffect(() => {
    loadFundingRate();
    const interval = setInterval(loadFundingRate, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [marketId]);

  useEffect(() => {
    if (!fundingRate) return;

    const updateTimer = () => {
      const now = Date.now() / 1000;
      const remaining = fundingRate.nextFundingTime - now;

      if (remaining <= 0) {
        setTimeToFunding('Funding now...');
        loadFundingRate();
      } else {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        setTimeToFunding(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [fundingRate]);

  const loadFundingRate = async () => {
    setLoading(true);
    try {
      const response = await DerivativesBackendService.getFundingRate(marketId);
      
      if (response.success && response.data) {
        // Convert backend response to component format
        setFundingRate({
          currentRate: parseFloat(response.data.currentRate),
          predictedRate: parseFloat(response.data.currentRate), // Use current as predicted for now
          nextFundingTime: new Date(response.data.nextPaymentTime).getTime() / 1000,
          cumulativeFunding: parseFloat(response.data.estimatedPayment),
        });
      } else {
        console.error('Error loading funding rate:', response.error);
        setFundingRate(null);
      }
    } catch (error) {
      console.error('Error loading funding rate:', error);
      setFundingRate(null);
    } finally {
      setLoading(false);
    }
  };

  const formatRate = (rate: number): string => {
    return `${(rate * 100).toFixed(4)}%`;
  };

  const getRateColor = (rate: number): string => {
    return rate >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getRateIcon = (rate: number) => {
    return rate >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  if (!fundingRate) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading funding rate...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Funding Rate</CardTitle>
            {ticker && (
              <CardDescription>{ticker}</CardDescription>
            )}
          </div>
          <Button
            onClick={loadFundingRate}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Funding Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Current Rate</span>
            <div className="flex items-center gap-2">
              {getRateIcon(fundingRate.currentRate)}
              <span className={`text-lg font-bold ${getRateColor(fundingRate.currentRate)}`}>
                {formatRate(fundingRate.currentRate)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {fundingRate.currentRate >= 0
              ? 'Longs pay shorts'
              : 'Shorts pay longs'}
          </p>
        </div>

        {/* Predicted Funding Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Predicted Rate</span>
            <div className="flex items-center gap-2">
              {getRateIcon(fundingRate.predictedRate)}
              <span className={`font-semibold ${getRateColor(fundingRate.predictedRate)}`}>
                {formatRate(fundingRate.predictedRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Next Funding Time */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Next Funding</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {timeToFunding}
            </Badge>
          </div>
        </div>

        {/* Cumulative Funding */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cumulative (24h)</span>
            <span className={`font-semibold ${getRateColor(fundingRate.cumulativeFunding)}`}>
              {formatRate(fundingRate.cumulativeFunding)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Funding rates are exchanged every 8 hours. 
            Positive rates mean longs pay shorts, negative rates mean shorts pay longs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

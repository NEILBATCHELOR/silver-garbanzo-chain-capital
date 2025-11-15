/**
 * ValuationChart Component
 * 
 * Visualizes 4-hour OHLCV price periods with candlestick chart
 * Essential for understanding token performance over time
 */

import { useState, useMemo } from 'react';
import { usePriceHistory } from '@/infrastructure/redemption/pricing/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/utils/utils';

interface ValuationChartProps {
  tokenId: string;
  title?: string;
  showTWAP?: boolean;
  showVWAP?: boolean;
  showVolume?: boolean;
  className?: string;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

const TIME_RANGES: Record<TimeRange, { label: string; days: number }> = {
  '24h': { label: '24 Hours', days: 1 },
  '7d': { label: '7 Days', days: 7 },
  '30d': { label: '30 Days', days: 30 },
  '90d': { label: '90 Days', days: 90 }
};

export function ValuationChart({
  tokenId,
  title = '4-Hour Price Periods',
  showTWAP = true,
  showVWAP = true,
  showVolume = true,
  className
}: ValuationChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  
  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - TIME_RANGES[timeRange].days);
    
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }, [timeRange]);

  const { history, loading, error, refresh } = usePriceHistory(tokenId, startDate, endDate);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load price history: {error.message}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.periods.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              No price history available for this time range
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = history.periods.map(period => ({
    timestamp: new Date(period.period.start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit'
    }),
    open: period.ohlcv.open,
    high: period.ohlcv.high,
    low: period.ohlcv.low,
    close: period.ohlcv.close,
    volume: period.ohlcv.volume
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">
              {TIME_RANGES[timeRange].label} • {history.periods.length} periods
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              loading && "animate-spin"
            )} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList className="grid w-full grid-cols-4">
            {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
              <TabsTrigger key={range} value={range}>
                {TIME_RANGES[range].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Candlestick Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              domain={['dataMin - 0.01', 'dataMax + 0.01']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Volume bars */}
            {showVolume && (
              <Bar
                dataKey="volume"
                fill="#cbd5e1"
                fillOpacity={0.3}
                yAxisId="volume"
                name="Volume"
              />
            )}
            
            {/* Close price line */}
            <Line
              dataKey="close"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 0 }}
              name="Close"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Statistics Summary */}
        {history.statistics && (
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <StatCard
              label="High"
              value={formatPrice(history.statistics.maxPrice)}
              trend="up"
            />
            <StatCard
              label="Low"
              value={formatPrice(history.statistics.minPrice)}
              trend="down"
            />
            <StatCard
              label="Avg"
              value={formatPrice(history.statistics.averagePrice)}
            />
            <StatCard
              label="Volatility"
              value={`${history.statistics.volatility.toFixed(2)}%`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Custom tooltip for chart
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-medium mb-2">{data.timestamp}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Open:</span>
          <span className="font-medium">{data.open.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">High:</span>
          <span className="font-medium text-green-600">{data.high.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Low:</span>
          <span className="font-medium text-red-600">{data.low.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Close:</span>
          <span className="font-medium">{data.close.toFixed(4)}</span>
        </div>
        {data.volume > 0 && (
          <div className="flex justify-between gap-4 pt-1 border-t">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-medium">{data.volume.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Statistic card component
 */
interface StatCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}

function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn(
        "text-lg font-bold",
        trend === 'up' && "text-green-600",
        trend === 'down' && "text-red-600"
      )}>
        {value}
      </div>
    </div>
  );
}

/**
 * Format price value
 */
function formatPrice(value: number): string {
  return value.toFixed(4);
}

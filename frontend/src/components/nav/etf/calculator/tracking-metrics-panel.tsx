import { Activity, Target, TrendingUp, AlertCircle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import type { ETFProduct, ETFCalculationResult } from '@/types/nav/etf'

interface TrackingMetricsPanelProps {
  result: ETFCalculationResult
  product: ETFProduct
}

export function TrackingMetricsPanel({ result, product }: TrackingMetricsPanelProps) {
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A'
    return `${value.toFixed(4)}%`
  }

  const formatBps = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A'
    return `${value.toFixed(2)} bps`
  }

  const hasTrackingData = result.trackingError !== undefined || 
                          result.trackingDifference !== undefined

  if (!hasTrackingData) {
    return null
  }

  const getTrackingQuality = (error: number | undefined) => {
    if (!error) return null
    if (error < 0.10) return { label: 'Excellent', variant: 'default' as const }
    if (error < 0.50) return { label: 'Good', variant: 'secondary' as const }
    if (error < 1.00) return { label: 'Fair', variant: 'secondary' as const }
    return { label: 'Poor', variant: 'destructive' as const }
  }

  const trackingQuality = result.trackingError ? getTrackingQuality(result.trackingError) : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Tracking Performance
          </CardTitle>
          {trackingQuality && (
            <Badge variant={trackingQuality.variant}>{trackingQuality.label}</Badge>
          )}
        </div>
        <CardDescription>
          Performance vs benchmark: {product.benchmark_index || 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {result.trackingError !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Tracking Error</span>
              </div>
              <p className="text-2xl font-bold">{formatPercent(result.trackingError)}</p>
              <p className="text-xs text-muted-foreground">
                Volatility of return differences
              </p>
            </div>
          )}

          {result.trackingDifference !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Tracking Difference</span>
              </div>
              <p className="text-2xl font-bold">{formatBps(result.trackingDifference)}</p>
              <p className="text-xs text-muted-foreground">
                Average return difference
              </p>
            </div>
          )}

          {result.correlation !== undefined && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Correlation</span>
              <p className="text-2xl font-bold">{result.correlation.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">
                With benchmark
              </p>
            </div>
          )}

          {result.rSquared !== undefined && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">R-Squared</span>
              <p className="text-2xl font-bold">{(result.rSquared * 100).toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">
                Explanatory power
              </p>
            </div>
          )}
        </div>

        {result.trackingError !== undefined && result.trackingError > 1.0 && (
          <Alert className="mt-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              High tracking error ({'>'}1.0%) detected. This ETF may be deviating significantly from its 
              benchmark index. Consider reviewing the holdings and rebalancing strategy.
            </AlertDescription>
          </Alert>
        )}

        {result.trackingError !== undefined && result.trackingError < 0.10 && (
          <Alert className="mt-6">
            <AlertDescription>
              Excellent tracking performance! This ETF is closely following its benchmark index with 
              minimal deviation (&lt;0.10%).
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

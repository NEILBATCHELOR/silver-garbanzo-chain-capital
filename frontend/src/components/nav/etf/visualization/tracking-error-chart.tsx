/**
 * Tracking Error Chart
 * Line chart showing tracking error over time
 * Self-contained component that fetches its own data
 */

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Info } from 'lucide-react'
import { etfService } from '@/services/nav/etfService'

export interface TrackingErrorChartProps {
  etfId: string
}

export function TrackingErrorChart({ etfId }: TrackingErrorChartProps) {
  // Fetch ETF product data
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['etf-product', etfId],
    queryFn: () => etfService.getETFProduct(etfId),
  })

  // Fetch tracking error history
  const { data: trackingData, isLoading: isLoadingTracking } = useQuery({
    queryKey: ['etf-tracking-error', etfId],
    queryFn: () => etfService.getTrackingError(etfId, { periodType: 'monthly', limit: 12 }),
  })

  if (isLoadingProduct || isLoadingTracking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking Error</CardTitle>
          <CardDescription>Performance vs benchmark</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const product = productData?.data
  const trackingHistory = trackingData?.data || []

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Failed to load ETF data</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (trackingHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking Error</CardTitle>
          <CardDescription>Performance vs benchmark</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No tracking error data available. Calculate NAV with benchmark data to track performance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const latestTracking = trackingHistory[0]
  const avgTrackingError = trackingHistory.reduce((sum, t) => sum + (t.trackingError || 0), 0) / trackingHistory.length
  const avgTrackingDiff = trackingHistory.reduce((sum, t) => sum + (t.trackingDifference || 0), 0) / trackingHistory.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracking Error</CardTitle>
        <CardDescription>
          {product.fund_name} vs {product.benchmark_index || 'Benchmark'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Latest TE</p>
            <p className="text-2xl font-bold">{(latestTracking.trackingError || 0).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg TE</p>
            <p className="text-2xl font-bold">{avgTrackingError.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Diff</p>
            <p className={`text-2xl font-bold ${
              avgTrackingDiff > 0 ? 'text-green-600' : avgTrackingDiff < 0 ? 'text-red-600' : ''
            }`}>
              {avgTrackingDiff > 0 ? '+' : ''}{avgTrackingDiff.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="h-64 border rounded-md flex items-center justify-center bg-muted/20">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Line chart will be rendered here</p>
            <p className="text-sm text-muted-foreground">
              Tracking error over time visualization
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm">Tracking Error</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Tracking Difference</span>
          </div>
        </div>

        {/* Performance Quality */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tracking Quality</span>
            <Badge variant={avgTrackingError < 0.5 ? 'default' : avgTrackingError < 1.0 ? 'secondary' : 'destructive'}>
              {avgTrackingError < 0.5 ? 'Excellent' : avgTrackingError < 1.0 ? 'Good' : 'Fair'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {avgTrackingError < 0.5 
              ? 'Very low tracking error - closely follows benchmark'
              : avgTrackingError < 1.0
              ? 'Moderate tracking error - reasonably tracks benchmark'
              : 'Higher tracking error - consider reviewing portfolio'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

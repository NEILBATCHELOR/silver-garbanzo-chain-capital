/**
 * NAV Chart
 * Line chart visualization of NAV over time
 * Shows NAV, market price, and premium/discount
 * Self-contained component that fetches its own data
 */

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'
import { etfService } from '@/services/nav/etfService'

export interface NAVChartProps {
  etfId: string
  showMarketPrice?: boolean
  showPremiumDiscount?: boolean
}

export function NAVChart({
  etfId,
  showMarketPrice = true,
  showPremiumDiscount = true,
}: NAVChartProps) {
  // Fetch ETF product data
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['etf-product', etfId],
    queryFn: () => etfService.getETFProduct(etfId),
  })

  // Fetch NAV history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['etf-nav-history', etfId],
    queryFn: () => etfService.getNAVHistory(etfId, { limit: 90 }), // Last 90 days
  })

  if (isLoadingProduct || isLoadingHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NAV Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const product = productData?.data
  const navHistory = historyData?.data || []

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NAV Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Failed to load ETF data</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (navHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NAV Chart</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No NAV history found. Calculate NAV to start tracking performance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Calculate statistics
  const latestNAV = navHistory[0]
  const oldestNAV = navHistory[navHistory.length - 1]
  const navChange = ((latestNAV.nav_per_share - oldestNAV.nav_per_share) / oldestNAV.nav_per_share) * 100
  
  const minNAV = Math.min(...navHistory.map(n => n.nav_per_share))
  const maxNAV = Math.max(...navHistory.map(n => n.nav_per_share))
  const avgNAV = navHistory.reduce((sum, n) => sum + n.nav_per_share, 0) / navHistory.length

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: product.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>NAV Chart</CardTitle>
        <CardDescription>
          {product.fund_name} - {navHistory.length} data points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Row */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Latest NAV</p>
            <p className="text-lg font-semibold">{formatCurrency(latestNAV.nav_per_share)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Period Change</p>
            <div className="flex items-center gap-2">
              <p className={`text-lg font-semibold ${
                navChange > 0 ? 'text-green-600' : navChange < 0 ? 'text-red-600' : ''
              }`}>
                {navChange > 0 ? '+' : ''}{navChange.toFixed(2)}%
              </p>
              {navChange > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : navChange < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Range</p>
            <p className="text-lg font-semibold">
              {formatCurrency(minNAV)} - {formatCurrency(maxNAV)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average NAV</p>
            <p className="text-lg font-semibold">{formatCurrency(avgNAV)}</p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="h-80 border rounded-md flex items-center justify-center bg-muted/20">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Line chart will be rendered here</p>
            <p className="text-sm text-muted-foreground">
              NAV per share over time
            </p>
            {showMarketPrice && (
              <p className="text-sm text-muted-foreground">
                Market price overlay enabled
              </p>
            )}
            {showPremiumDiscount && (
              <p className="text-sm text-muted-foreground">
                Premium/discount shading enabled
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Chart.js integration pending
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm">NAV per Share</span>
          </div>
          {showMarketPrice && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm">Market Price</span>
            </div>
          )}
          {showPremiumDiscount && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500/30 rounded-full"></div>
                <span className="text-sm">Premium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/30 rounded-full"></div>
                <span className="text-sm">Discount</span>
              </div>
            </>
          )}
        </div>

        {/* Latest Premium/Discount Badge */}
        {latestNAV.premium_discount_pct !== null && latestNAV.premium_discount_pct !== undefined && (
          <div className="border-t pt-4 flex items-center justify-between">
            <span className="text-sm font-medium">Current Trading Status</span>
            <Badge
              variant={
                latestNAV.premium_discount_pct > 0.25
                  ? 'default'
                  : latestNAV.premium_discount_pct < -0.25
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {latestNAV.premium_discount_pct > 0.25 
                ? 'Trading at Premium' 
                : latestNAV.premium_discount_pct < -0.25
                  ? 'Trading at Discount'
                  : 'Fair Value'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

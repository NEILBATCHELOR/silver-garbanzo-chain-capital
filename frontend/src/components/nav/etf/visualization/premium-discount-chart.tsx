/**
 * Premium/Discount Chart
 * Visualization of market price vs NAV over time
 * Self-contained component that fetches its own data
 */

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import { etfService } from '@/services/nav/etfService'

export interface PremiumDiscountChartProps {
  etfId: string
}

export function PremiumDiscountChart({ etfId }: PremiumDiscountChartProps) {
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
          <CardTitle>Premium/Discount History</CardTitle>
          <CardDescription>Market price vs NAV over time</CardDescription>
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
  const history = historyData?.data || []

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Premium/Discount History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Failed to load ETF data</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Premium/Discount History</CardTitle>
          <CardDescription>Market price vs NAV over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No premium/discount data available. Market prices will appear once trading begins.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Calculate statistics
  const latest = history[0]
  const avgPremiumDiscount = history.reduce((sum, h) => sum + (h.premium_discount_pct || 0), 0) / history.length
  const maxPremium = Math.max(...history.map(h => h.premium_discount_pct || 0))
  const maxDiscount = Math.min(...history.map(h => h.premium_discount_pct || 0))
  const premiumDays = history.filter(h => (h.premium_discount_pct || 0) > 0.25).length
  const discountDays = history.filter(h => (h.premium_discount_pct || 0) < -0.25).length
  const fairValueDays = history.length - premiumDays - discountDays

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const getPremiumDiscountStatus = (pct: number): { label: string; variant: 'default' | 'secondary' | 'destructive' } => {
    if (pct > 0.25) return { label: 'Premium', variant: 'default' }
    if (pct < -0.25) return { label: 'Discount', variant: 'destructive' }
    return { label: 'Fair Value', variant: 'secondary' }
  }

  const status = getPremiumDiscountStatus(latest.premium_discount_pct || 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Premium/Discount History</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardTitle>
        <CardDescription>
          {product.fund_name} - Market price vs NAV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">NAV</p>
            <p className="text-xl font-bold">{formatCurrency(latest.nav_per_share)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Market Price</p>
            <p className="text-xl font-bold">{formatCurrency(latest.market_price || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Difference</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-bold ${
                (latest.premium_discount_pct || 0) > 0 
                  ? 'text-green-600' 
                  : (latest.premium_discount_pct || 0) < 0 
                    ? 'text-red-600' 
                    : ''
              }`}>
                {formatPercentage(latest.premium_discount_pct || 0)}
              </p>
              {(latest.premium_discount_pct || 0) > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (latest.premium_discount_pct || 0) < 0 ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Average</p>
            <p className={`text-lg font-semibold ${
              avgPremiumDiscount > 0 ? 'text-green-600' : avgPremiumDiscount < 0 ? 'text-red-600' : ''
            }`}>
              {formatPercentage(avgPremiumDiscount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Premium</p>
            <p className="text-lg font-semibold text-green-600">{formatPercentage(maxPremium)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Discount</p>
            <p className="text-lg font-semibold text-red-600">{formatPercentage(maxDiscount)}</p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="h-64 border rounded-md flex items-center justify-center bg-muted/20">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Bar chart will be rendered here</p>
            <p className="text-sm text-muted-foreground">
              Premium (green) / Discount (red) bars over time
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Chart.js integration pending
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Premium (&gt;0.25%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm">Fair Value (±0.25%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm">Discount (&lt;-0.25%)</span>
          </div>
        </div>

        {/* Trading Days Distribution */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Trading Days Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Premium Days</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(premiumDays / history.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">
                  {premiumDays}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Fair Value Days</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-400 h-2 rounded-full" 
                    style={{ width: `${(fairValueDays / history.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">
                  {fairValueDays}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Discount Days</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${(discountDays / history.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">
                  {discountDays}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Arbitrage Opportunities */}
        {(Math.abs(latest.premium_discount_pct || 0) > 0.5) && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {(latest.premium_discount_pct || 0) > 0.5 
                ? `Trading at ${formatPercentage(latest.premium_discount_pct || 0)} premium. Potential arbitrage opportunity for Authorized Participants.`
                : `Trading at ${formatPercentage(latest.premium_discount_pct || 0)} discount. May present buying opportunity.`
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

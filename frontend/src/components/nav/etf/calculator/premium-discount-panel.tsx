import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import type { ETFProduct, ETFCalculationResult } from '@/types/nav/etf'

interface PremiumDiscountPanelProps {
  result: ETFCalculationResult
  product: ETFProduct
}

export function PremiumDiscountPanel({ result, product }: PremiumDiscountPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: result.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(4)}%`
  }

  if (!result.marketPrice || result.premiumDiscountPct === undefined) {
    return null
  }

  const isPremium = result.premiumDiscountPct > 0.25
  const isDiscount = result.premiumDiscountPct < -0.25
  const isFairValue = !isPremium && !isDiscount

  const getStatusIcon = () => {
    if (isPremium) return <TrendingUp className="h-4 w-4" />
    if (isDiscount) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getStatusBadge = () => {
    if (isPremium) return <Badge className="bg-blue-500">Premium</Badge>
    if (isDiscount) return <Badge variant="destructive">Discount</Badge>
    return <Badge variant="secondary">Fair Value</Badge>
  }

  const premiumDiscountAmount = result.marketPrice - result.navPerShare

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Premium/Discount Analysis
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Market price vs intrinsic NAV comparison
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">NAV per Share</span>
            <p className="text-2xl font-bold">{formatCurrency(result.navPerShare)}</p>
            <p className="text-xs text-muted-foreground">Intrinsic value</p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Market Price</span>
            <p className="text-2xl font-bold">{formatCurrency(result.marketPrice)}</p>
            <p className="text-xs text-muted-foreground">Trading price</p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Difference</span>
            <p className={`text-2xl font-bold ${
              isPremium ? 'text-blue-500' : 
              isDiscount ? 'text-red-500' : 
              'text-gray-500'
            }`}>
              {formatPercent(result.premiumDiscountPct)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(Math.abs(premiumDiscountAmount))}
            </p>
          </div>
        </div>

        {(isPremium || isDiscount) && (
          <Alert className="mt-6" variant={isDiscount ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {isPremium ? 'Trading at Premium' : 'Trading at Discount'}
            </AlertTitle>
            <AlertDescription>
              {isPremium ? (
                <>
                  The ETF is trading at a <strong>{formatPercent(result.premiumDiscountPct)}</strong> premium 
                  to its NAV. This may indicate strong demand or limited supply. Authorized Participants may 
                  arbitrage this by creating new shares.
                </>
              ) : (
                <>
                  The ETF is trading at a <strong>{formatPercent(Math.abs(result.premiumDiscountPct))}</strong> discount 
                  to its NAV. This may present an arbitrage opportunity. Authorized Participants may redeem 
                  shares to profit from the discount.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isFairValue && (
          <Alert className="mt-6">
            <AlertDescription>
              The ETF is trading within ±0.25% of its NAV, indicating efficient pricing and strong 
              creation/redemption mechanisms.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

import { format } from 'date-fns'
import { TrendingUp, DollarSign, Percent, Activity, CheckCircle2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { ETFProduct, ETFCalculationResult } from '@/types/nav/etf'

interface CalculationResultsProps {
  result: ETFCalculationResult
  product: ETFProduct
}

export function CalculationResults({ result, product }: CalculationResultsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: result.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const getQualityBadge = (quality: string) => {
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'destructive',
    } as const

    return (
      <Badge variant={variants[quality as keyof typeof variants] || 'secondary'}>
        {quality.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main NAV Result */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>NAV Calculation Result</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <CardDescription>
            Calculated on {format(new Date(result.valuationDate), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">NAV per Share</span>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(result.navPerShare)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total Net Assets</span>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(result.breakdown.netAssets)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Shares Outstanding</span>
              </div>
              <p className="text-2xl font-semibold">{formatNumber(result.breakdown.sharesOutstanding)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Data Quality</span>
              </div>
              <div>{getQualityBadge(result.dataQuality)}</div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Breakdown */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Asset Breakdown</h4>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Assets</span>
                <span className="font-medium">{formatCurrency(result.breakdown.totalAssets)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Liabilities</span>
                <span className="font-medium">{formatCurrency(result.breakdown.totalLiabilities)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Securities Value</span>
                <span className="font-medium">{formatCurrency(result.breakdown.securitiesValue)}</span>
              </div>
              {result.breakdown.cryptoValue && result.breakdown.cryptoValue > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Crypto Value</span>
                  <span className="font-medium">{formatCurrency(result.breakdown.cryptoValue)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cash Position</span>
                <span className="font-medium">{formatCurrency(result.breakdown.cashPosition)}</span>
              </div>
              {result.breakdown.derivativesValue && result.breakdown.derivativesValue > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Derivatives Value</span>
                  <span className="font-medium">{formatCurrency(result.breakdown.derivativesValue)}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Calculation Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Calculation Method</span>
              <Badge variant="outline">{result.calculationMethod}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confidence Level</span>
              <Badge variant="outline">{result.confidence}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Data Sources</span>
              <span className="font-medium">{result.sources.join(', ')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

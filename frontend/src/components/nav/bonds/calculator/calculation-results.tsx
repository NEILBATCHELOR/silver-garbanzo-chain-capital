import { format } from 'date-fns'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock, CheckCircle2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

import type { NAVResult } from '@/types/nav/bonds'
import { CalculationBreakdown } from './calculation-breakdown'
import { RiskMetricsPanel } from './risk-metrics-panel'

interface CalculationResultsProps {
  result: NAVResult
  bondName: string
  onNewCalculation?: () => void
}

export function CalculationResults({
  result,
  bondName,
  onNewCalculation,
}: CalculationResultsProps) {
  // Add null safety checks
  if (!result || result.netAssetValue === undefined || result.netAssetValue === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Invalid calculation result</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            The calculation result is missing required data. Please try again.
          </div>
          {onNewCalculation && (
            <Button onClick={onNewCalculation} className="mt-4">
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const changeAmount = result.priorNAV
    ? result.netAssetValue - result.priorNAV
    : null
  const changePercent = result.priorNAV && changeAmount
    ? (changeAmount / result.priorNAV) * 100
    : null

  const dataSources = result.metadata?.dataSourcesUsed || []

  return (
    <div className="space-y-6">
      {/* Main NAV Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calculation Complete</CardTitle>
              <CardDescription>{bondName}</CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Success
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary NAV Value */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Net Asset Value</div>
            <div className="text-4xl font-bold">
              ${result.netAssetValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {changeAmount !== null && (
              <div className="flex items-center gap-2">
                {changeAmount >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={
                    changeAmount >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  ${Math.abs(changeAmount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ({changePercent?.toFixed(2)}%)
                </span>
                <span className="text-muted-foreground text-sm">
                  vs. previous
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                As Of Date
              </div>
              <div className="text-sm font-medium">
                {format(new Date(result.asOfDate), 'PPP')}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Calculated
              </div>
              <div className="text-sm font-medium">
                {format(new Date(result.metadata.calculatedAt), 'PPp')}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Method
              </div>
              <div className="text-sm font-medium">
                {result.calculationMethod}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Confidence</div>
              <Badge
                variant={
                  result.confidenceLevel === 'high'
                    ? 'default'
                    : result.confidenceLevel === 'medium'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {result.confidenceLevel}
              </Badge>
            </div>
          </div>

          {/* Data Sources */}
          {dataSources && dataSources.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Data Sources</div>
                <div className="space-y-1">
                  {dataSources.map((source, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {source}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onNewCalculation && (
              <Button onClick={onNewCalculation} variant="outline">
                New Calculation
              </Button>
            )}
            <Button variant="outline">Export Results</Button>
          </div>
        </CardContent>
      </Card>

      {/* Market Comparison (for HTM bonds) */}
      {result.marketComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Market Comparison</CardTitle>
            <CardDescription>
              Accounting value vs. current market value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Value Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Accounting Value (Amortized Cost)
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ${result.marketComparison.accountingValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Book value • YTM: {(result.marketComparison.accountingYTM * 100).toFixed(2)}%
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <div className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  Market Value
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  ${result.marketComparison.marketValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  As of {format(new Date(result.marketComparison.marketPriceDate), 'PP')} • YTM: {(result.marketComparison.marketYTM * 100).toFixed(2)}%
                </div>
              </div>

              <div className={`space-y-2 p-4 rounded-lg ${
                result.marketComparison.unrealizedGainLoss >= 0
                  ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className={`text-xs font-medium ${
                  result.marketComparison.unrealizedGainLoss >= 0
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  Unrealized {result.marketComparison.unrealizedGainLoss >= 0 ? 'Gain' : 'Loss'}
                </div>
                <div className={`text-2xl font-bold flex items-center gap-2 ${
                  result.marketComparison.unrealizedGainLoss >= 0
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {result.marketComparison.unrealizedGainLoss >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  ${Math.abs(result.marketComparison.unrealizedGainLoss).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className={`text-xs ${
                  result.marketComparison.unrealizedGainLoss >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {((result.marketComparison.unrealizedGainLoss / result.marketComparison.accountingValue) * 100).toFixed(2)}% difference
                </div>
              </div>
            </div>

            <Separator />

            {/* Yield Spread */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Yield Analysis</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Accounting YTM</div>
                  <div className="font-medium">{(result.marketComparison.accountingYTM * 100).toFixed(3)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Market YTM</div>
                  <div className="font-medium">{(result.marketComparison.marketYTM * 100).toFixed(3)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Yield Spread</div>
                  <div className={`font-medium ${
                    result.marketComparison.yieldSpread >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.marketComparison.yieldSpread >= 0 ? '+' : ''}{(result.marketComparison.yieldSpread * 100).toFixed(1)} bps
                  </div>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              ℹ️ <strong>Note:</strong> This bond uses Held-to-Maturity (HTM) accounting. The NAV reflects amortized cost (book value), 
              but current market value shows what the bond would be worth if sold today. The unrealized gain/loss is not recognized in the NAV 
              under HTM accounting unless impairment occurs.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown */}
      {result.breakdown && (
        <CalculationBreakdown breakdown={result.breakdown} />
      )}

      {/* Risk Metrics */}
      {result.riskMetrics && (
        <RiskMetricsPanel metrics={result.riskMetrics} />
      )}
    </div>
  )
}

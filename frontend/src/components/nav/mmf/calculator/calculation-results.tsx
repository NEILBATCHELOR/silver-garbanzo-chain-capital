import { format } from 'date-fns'
import { AlertTriangle, DollarSign, Calendar, Clock, CheckCircle2, TrendingDown } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import type { MMFNAVResult } from '@/types/nav/mmf'
import { LiquidityPanel } from './liquidity-panel'
import { ComplianceStatus } from './compliance-status'

interface CalculationResultsProps {
  result: MMFNAVResult
  fundName: string
  onNewCalculation?: () => void
}

export function CalculationResults({
  result,
  fundName,
  onNewCalculation,
}: CalculationResultsProps) {
  // Null safety check
  if (!result || result.stableNAV === undefined) {
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

  const dataSources = result.metadata?.dataSourcesUsed || []

  return (
    <div className="space-y-6">
      {/* Breaking the Buck Alert */}
      {result.isBreakingBuck && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Breaking the Buck Alert</AlertTitle>
          <AlertDescription>
            The stable NAV has fallen below $0.995 per share. This requires immediate
            board notification and potential regulatory action under SEC Rule 2a-7.
          </AlertDescription>
        </Alert>
      )}

      {/* Main NAV Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calculation Complete</CardTitle>
              <CardDescription>{fundName}</CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Success
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dual NAV Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stable NAV */}
            <div className="space-y-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Stable NAV (Amortized Cost)
              </div>
              <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                ${result.stableNAV.toFixed(4)}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Target: $1.0000 per share
              </div>
            </div>

            {/* Shadow NAV */}
            <div className="space-y-2 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <div className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Shadow NAV (Mark-to-Market)
              </div>
              <div className="text-4xl font-bold text-purple-900 dark:text-purple-100">
                ${result.shadowNAV.toFixed(4)}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                Current market value
              </div>
            </div>
          </div>

          {/* Deviation Display */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Deviation from $1.00</div>
              <Badge
                variant={Math.abs(result.deviationBps) < 50 ? 'default' : 'destructive'}
              >
                {result.deviationBps.toFixed(0)} bps
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {result.deviationFromStable < 0 && (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={
                  result.deviationFromStable < 0 ? 'text-red-600' : 'text-green-600'
                }
              >
                ${Math.abs(result.deviationFromStable).toFixed(4)}
              </span>
              <span className="text-muted-foreground text-sm">
                ({((result.deviationFromStable / 1.0) * 100).toFixed(3)}%)
              </span>
            </div>
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

      {/* Liquidity Panel */}
      <LiquidityPanel
        dailyLiquidPercentage={result.dailyLiquidPercentage}
        weeklyLiquidPercentage={result.weeklyLiquidPercentage}
        wam={result.wam}
        wal={result.wal}
      />

      {/* Compliance Status */}
      <ComplianceStatus
        complianceStatus={result.complianceStatus}
        wam={result.wam}
        wal={result.wal}
        dailyLiquidPercentage={result.dailyLiquidPercentage}
        weeklyLiquidPercentage={result.weeklyLiquidPercentage}
      />
    </div>
  )
}

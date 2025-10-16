import { format } from 'date-fns'
import { AlertTriangle, DollarSign, Calendar, Clock, CheckCircle2, TrendingDown } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import type { MMFNAVResult } from '@/types/nav/mmf'

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
  // Null safety check - use 'nav' as the stable NAV (amortized cost)
  if (!result || result.nav === undefined) {
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

  // Convert nav (Decimal) to number for display
  const stableNAV = typeof result.nav === 'number' ? result.nav : Number(result.nav)
  const shadowNAV = typeof result.shadowNAV === 'number' ? result.shadowNAV : Number(result.shadowNAV)
  
  const dataSources = result.metadata?.dataSourcesUsed || []
  
  // Format method name from snake_case to Title Case
  const formatMethodName = (method: string): string => {
    return method
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <Card>
      {/* Breaking the Buck Alert */}
      {result.isBreakingBuck && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Breaking the Buck Alert</AlertTitle>
          <AlertDescription>
            The stable NAV has fallen below $0.995 per share. This requires immediate
            board notification and potential regulatory action under SEC Rule 2a-7.
          </AlertDescription>
        </Alert>
      )}

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
                ${stableNAV.toFixed(4)}
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
                ${shadowNAV.toFixed(4)}
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
                variant={Math.abs(result.deviationBps || 0) < 50 ? 'default' : 'destructive'}
              >
                {(result.deviationBps || 0).toFixed(0)} bps
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {(result.deviationFromStable || 0) < 0 && (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={
                  (result.deviationFromStable || 0) < 0 ? 'text-red-600' : 'text-green-600'
                }
              >
                ${Math.abs(result.deviationFromStable || 0).toFixed(4)}
              </span>
              <span className="text-muted-foreground text-sm">
                ({(((result.deviationFromStable || 0) / 1.0) * 100).toFixed(3)}%)
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
                {formatMethodName(result.calculationMethod)}
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
                  {dataSources.map((source, index) => {
                    // Handle both string and object formats
                    const sourceText = typeof source === 'string' 
                      ? source 
                      : `${source.table} (${source.recordCount} records, ${source.completeness}% complete)`
                    return (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {sourceText}
                      </div>
                    )
                  })}
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
  )
}

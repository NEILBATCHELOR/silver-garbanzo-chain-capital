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

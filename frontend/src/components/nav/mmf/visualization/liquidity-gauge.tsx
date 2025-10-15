/**
 * Liquidity Gauge
 * Visual gauges for daily and weekly liquid assets
 * Color-coded with compliance thresholds
 */

import { Droplets, AlertCircle } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

import { useLatestMMFNAV } from '@/hooks/mmf'

interface LiquidityGaugeProps {
  fundId: string
}

export function LiquidityGauge({ fundId }: LiquidityGaugeProps) {
  const { data: latestNAVData, isLoading } = useLatestMMFNAV(fundId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!latestNAVData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No liquidity data available. Run a NAV calculation to monitor liquidity.
          </p>
        </CardContent>
      </Card>
    )
  }

  const latestNAV = latestNAVData.data

  // Liquidity metrics
  const dailyLiquid = latestNAV.daily_liquid_assets_percentage
  const weeklyLiquid = latestNAV.weekly_liquid_assets_percentage

  // Compliance thresholds
  const DAILY_MINIMUM = 25
  const WEEKLY_MINIMUM = 50
  const DAILY_CRITICAL = 12.5 // Board notification required

  // Status checks
  const isDailyCompliant = dailyLiquid >= DAILY_MINIMUM
  const isWeeklyCompliant = weeklyLiquid >= WEEKLY_MINIMUM
  const isDailyCritical = dailyLiquid < DAILY_CRITICAL
  const isFullyCompliant = isDailyCompliant && isWeeklyCompliant

  // Calculate cushions
  const dailyCushion = dailyLiquid - DAILY_MINIMUM
  const weeklyCushion = weeklyLiquid - WEEKLY_MINIMUM

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liquidity Monitor</CardTitle>
              <CardDescription>
                SEC Rule 2a-7 liquidity requirements
              </CardDescription>
            </div>
            <Droplets className="h-8 w-8 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Critical Alert */}
          {isDailyCritical && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Daily liquid assets below 12.5%. Board notification required within 1 business day.
              </AlertDescription>
            </Alert>
          )}

          {/* Non-Compliant Alert */}
          {!isFullyCompliant && !isDailyCritical && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!isDailyCompliant && 'Daily liquidity below 25%. '}
                {!isWeeklyCompliant && 'Weekly liquidity below 50%. '}
                Review portfolio composition.
              </AlertDescription>
            </Alert>
          )}

          {/* Overall Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Overall Liquidity Status:</span>
            <Badge variant={isFullyCompliant ? 'default' : 'destructive'} className="text-sm">
              {isFullyCompliant ? 'Compliant' : 'Non-Compliant'}
            </Badge>
          </div>

          {/* Daily Liquid Assets Gauge */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Daily Liquid Assets</h4>
                <p className="text-xs text-muted-foreground">
                  Minimum: 25% | Critical: 12.5%
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{dailyLiquid.toFixed(1)}%</p>
                <Badge variant={isDailyCompliant ? 'default' : 'destructive'} className="mt-1">
                  {isDailyCompliant ? 'Compliant' : 'Below Minimum'}
                </Badge>
              </div>
            </div>

            {/* Radial-style progress */}
            <div className="space-y-2">
              <Progress 
                value={Math.min((dailyLiquid / 100) * 100, 100)} 
                className="h-8"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="text-destructive">Critical (12.5%)</span>
                <span className="text-orange-500">Minimum (25%)</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cushion above minimum:</span>
                <span className={`font-medium ${dailyCushion < 0 ? 'text-destructive' : ''}`}>
                  {dailyCushion >= 0 ? '+' : ''}{dailyCushion.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance to critical:</span>
                <span className={`font-medium ${dailyLiquid - DAILY_CRITICAL < 5 ? 'text-orange-500' : ''}`}>
                  {(dailyLiquid - DAILY_CRITICAL).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Liquid Assets Gauge */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Weekly Liquid Assets</h4>
                <p className="text-xs text-muted-foreground">
                  Minimum: 50%
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{weeklyLiquid.toFixed(1)}%</p>
                <Badge variant={isWeeklyCompliant ? 'default' : 'destructive'} className="mt-1">
                  {isWeeklyCompliant ? 'Compliant' : 'Below Minimum'}
                </Badge>
              </div>
            </div>

            {/* Radial-style progress */}
            <div className="space-y-2">
              <Progress 
                value={Math.min((weeklyLiquid / 100) * 100, 100)} 
                className="h-8 bg-green-100"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="text-orange-500">Minimum (50%)</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cushion above minimum:</span>
                <span className={`font-medium ${weeklyCushion < 0 ? 'text-destructive' : ''}`}>
                  {weeklyCushion >= 0 ? '+' : ''}{weeklyCushion.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Includes daily liquid:</span>
                <span className="font-medium">
                  {dailyLiquid.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Liquidity Breakdown */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold">Liquidity Composition</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Daily Liquid Assets:</span>
                <span className="font-medium">{dailyLiquid.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Weekly Liquid (excl. daily):</span>
                <span className="font-medium">{(weeklyLiquid - dailyLiquid).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Weekly Liquid:</span>
                <span className="font-medium">{weeklyLiquid.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Non-Liquid Assets:</span>
                <span className="font-medium">{(100 - weeklyLiquid).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Regulatory Notes */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold">Regulatory Requirements</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Daily liquid assets must be ≥25% of total assets</li>
              <li>Weekly liquid assets must be ≥50% of total assets</li>
              <li>If daily liquid assets fall below 12.5%, notify board within 1 business day</li>
              <li>If weekly liquid assets fall below 30%, may impose liquidity fees or gates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

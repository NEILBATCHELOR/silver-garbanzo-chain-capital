/**
 * Shadow NAV Monitor
 * Real-time monitoring of NAV deviation from $1.00 target
 * Alert system for deviations and breaking the buck
 */

import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { AlertCircle, TrendingDown, TrendingUp, Activity } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useMMFNAVHistory, useLatestMMFNAV } from '@/hooks/mmf'

interface ShadowNAVMonitorProps {
  fundId: string
}

export function ShadowNAVMonitor({ fundId }: ShadowNAVMonitorProps) {
  const [alertThreshold, setAlertThreshold] = useState(0.5) // 0.5% default threshold

  const thirtyDaysAgo = subDays(new Date(), 30)
  const { data: navHistoryData } = useMMFNAVHistory(fundId, thirtyDaysAgo, new Date())
  const { data: latestNAVData } = useLatestMMFNAV(fundId)

  const navHistory = navHistoryData?.data || []
  const latestNAV = latestNAVData?.data

  if (!latestNAV) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shadow NAV Monitor</CardTitle>
          <CardDescription>No NAV data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Run a NAV calculation to start monitoring
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate deviation metrics
  const deviationPercent = Math.abs(
    ((latestNAV.market_based_nav - latestNAV.stable_nav) / latestNAV.stable_nav) * 100
  )
  const deviationBps = Math.abs(latestNAV.deviation_bps || 0)
  const isAboveThreshold = deviationPercent > alertThreshold
  const isBreakingBuck = latestNAV.is_breaking_the_buck

  // Calculate historical deviation stats
  const maxDeviation = Math.max(
    ...navHistory.map(nav => Math.abs(nav.deviation_bps || 0))
  )
  const avgDeviation = navHistory.length > 0
    ? navHistory.reduce((sum, nav) => sum + Math.abs(nav.deviation_bps || 0), 0) / navHistory.length
    : 0

  // Trend analysis (last 7 days)
  const recentHistory = navHistory.slice(-7)
  const isDeviationIncreasing = recentHistory.length >= 2 &&
    Math.abs(recentHistory[recentHistory.length - 1].deviation_bps || 0) >
    Math.abs(recentHistory[0].deviation_bps || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Shadow NAV Monitor</h3>
        <p className="text-sm text-muted-foreground">
          Real-time deviation tracking and alerts
        </p>
      </div>

      {/* Critical Alerts */}
      {isBreakingBuck && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Breaking the Buck!</AlertTitle>
          <AlertDescription>
            NAV has fallen below $0.995. Immediate action required per SEC Rule 2a-7.
            Current NAV: ${latestNAV.stable_nav.toFixed(4)}
          </AlertDescription>
        </Alert>
      )}

      {isAboveThreshold && !isBreakingBuck && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Deviation Alert</AlertTitle>
          <AlertDescription>
            Shadow NAV deviation exceeds threshold of {alertThreshold}%. 
            Current deviation: {deviationPercent.toFixed(2)}%
          </AlertDescription>
        </Alert>
      )}

      {/* Current Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stable NAV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${latestNAV.stable_nav.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Target: $1.0000
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shadow NAV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${latestNAV.market_based_nav.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Mark-to-market value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Deviation</CardTitle>
            {isDeviationIncreasing ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deviationBps} bps</div>
            <p className="text-xs text-muted-foreground">
              {deviationPercent.toFixed(3)}% from target
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deviation Gauge */}
      <Card>
        <CardHeader>
          <CardTitle>Deviation from $1.00 Target</CardTitle>
          <CardDescription>
            Acceptable range: ±{alertThreshold}% (±{(alertThreshold * 100).toFixed(0)} bps)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual gauge */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>-50 bps</span>
              <span>Target</span>
              <span>+50 bps</span>
            </div>
            <div className="relative h-8 rounded-full bg-muted overflow-hidden">
              {/* Acceptable range indicator */}
              <div
                className="absolute inset-y-0 bg-green-500/20"
                style={{
                  left: `${50 - alertThreshold * 100}%`,
                  right: `${50 - alertThreshold * 100}%`,
                }}
              />
              {/* Target line */}
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-primary" />
              {/* Current position */}
              <div
                className="absolute inset-y-0 flex items-center"
                style={{
                  left: `${50 + (deviationBps / 100) * (latestNAV.market_based_nav > latestNAV.stable_nav ? 1 : -1)}%`,
                }}
              >
                <div className={`w-2 h-8 rounded-full ${isAboveThreshold ? 'bg-destructive' : 'bg-primary'}`} />
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Deviation</p>
              <p className="text-xl font-bold">{deviationBps} bps</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">30-Day Average</p>
              <p className="text-xl font-bold">{avgDeviation.toFixed(1)} bps</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">30-Day Maximum</p>
              <p className="text-xl font-bold">{maxDeviation.toFixed(1)} bps</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Settings</CardTitle>
          <CardDescription>
            Configure deviation threshold for notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="threshold">Alert Threshold (%)</Label>
              <Input
                id="threshold"
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(parseFloat(e.target.value) || 0.5)}
              />
              <p className="text-xs text-muted-foreground">
                Alert when deviation exceeds this percentage
              </p>
            </div>

            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="flex items-center gap-2 h-10">
                {isAboveThreshold ? (
                  <Badge variant="destructive">Above Threshold</Badge>
                ) : (
                  <Badge variant="default">Within Limits</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Deviation Chart */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Deviation History</CardTitle>
          <CardDescription>
            Basis points deviation from $1.00
          </CardDescription>
        </CardHeader>
        <CardContent>
          {navHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No historical data available
            </p>
          ) : (
            <div className="space-y-2">
              {navHistory.slice(-10).reverse().map((nav) => {
                const devBps = Math.abs(nav.deviation_bps || 0)
                const progress = Math.min((devBps / 50) * 100, 100) // Scale to 50 bps max

                return (
                  <div key={nav.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{format(new Date(nav.valuation_date), 'MMM d, yyyy')}</span>
                      <span className="font-medium">{devBps} bps</span>
                    </div>
                    <Progress 
                      value={progress} 
                      className={devBps > alertThreshold * 100 ? 'bg-destructive/20' : ''}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Summary</CardTitle>
          <CardDescription>
            Current regulatory status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Breaking the Buck (NAV &lt; $0.995)</span>
              <Badge variant={latestNAV.is_breaking_the_buck ? 'destructive' : 'default'}>
                {latestNAV.is_breaking_the_buck ? 'Yes' : 'No'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">WAM Compliance (≤60 days)</span>
              <Badge variant={latestNAV.is_wam_compliant ? 'default' : 'destructive'}>
                {latestNAV.is_wam_compliant ? 'Compliant' : 'Non-Compliant'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">WAL Compliance (≤120 days)</span>
              <Badge variant={latestNAV.is_wal_compliant ? 'default' : 'destructive'}>
                {latestNAV.is_wal_compliant ? 'Compliant' : 'Non-Compliant'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Liquidity Requirements</span>
              <Badge variant={latestNAV.is_liquidity_compliant ? 'default' : 'destructive'}>
                {latestNAV.is_liquidity_compliant ? 'Compliant' : 'Non-Compliant'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Gate Status</span>
              <Badge variant={latestNAV.gate_status === 'open' ? 'default' : 'destructive'}>
                {latestNAV.gate_status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Deviation History
 * Area chart showing stable NAV vs shadow NAV over time
 * Highlights breaking the buck events
 */

import { format, subDays } from 'date-fns'
import { TrendingUp, AlertCircle } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useMMFNAVHistory } from '@/hooks/mmf'
import { useState } from 'react'

interface DeviationHistoryProps {
  fundId: string
}

export function DeviationHistory({ fundId }: DeviationHistoryProps) {
  const [timeRange, setTimeRange] = useState<number>(30)

  const startDate = subDays(new Date(), timeRange)
  const { data: navHistoryData, isLoading } = useMMFNAVHistory(fundId, startDate, new Date())

  const navHistory = navHistoryData?.data || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NAV Deviation History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (navHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NAV Deviation History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No historical data available. Run NAV calculations to track deviations.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate statistics
  const breakingBuckCount = navHistory.filter(nav => nav.is_breaking_the_buck).length
  const maxDeviation = Math.max(...navHistory.map(nav => Math.abs(nav.deviation_bps || 0)))
  const avgDeviation = navHistory.reduce((sum, nav) => sum + Math.abs(nav.deviation_bps || 0), 0) / navHistory.length

  // Find acceptable range (±50 bps for visualization)
  const ACCEPTABLE_RANGE_BPS = 50

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>NAV Deviation History</CardTitle>
            <CardDescription>
              Stable NAV vs Shadow NAV comparison
            </CardDescription>
          </div>
          <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(parseInt(value))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Breaking the Buck Alert */}
        {breakingBuckCount > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {breakingBuckCount} breaking the buck {breakingBuckCount === 1 ? 'event' : 'events'} in the last {timeRange} days
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Average Deviation</p>
            <p className="text-2xl font-bold">{avgDeviation.toFixed(1)} bps</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Maximum Deviation</p>
            <p className="text-2xl font-bold">{maxDeviation.toFixed(1)} bps</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Breaking the Buck</p>
            <p className="text-2xl font-bold">{breakingBuckCount}</p>
          </div>
        </div>

        {/* Visual Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Deviation from $1.00 Target</h4>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Stable NAV</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Shadow NAV</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {navHistory.slice(-15).reverse().map((nav, index) => {
              const deviationBps = nav.deviation_bps || 0
              const isBreakingBuck = nav.is_breaking_the_buck

              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(nav.valuation_date), 'MMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>
                        Stable: ${nav.stable_nav.toFixed(4)}
                      </span>
                      <span>
                        Shadow: ${nav.market_based_nav.toFixed(4)}
                      </span>
                      <span className={`font-medium ${Math.abs(deviationBps) > 10 ? 'text-destructive' : ''}`}>
                        {deviationBps > 0 ? '+' : ''}{deviationBps} bps
                      </span>
                      {isBreakingBuck && (
                        <Badge variant="destructive" className="text-xs">Buck</Badge>
                      )}
                    </div>
                  </div>

                  {/* Dual NAV visualization */}
                  <div className="relative h-10 rounded-lg bg-muted overflow-hidden">
                    {/* Target line at $1.00 */}
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-primary z-10" />
                    
                    {/* Acceptable range shading */}
                    <div
                      className="absolute inset-y-0 bg-green-500/10"
                      style={{
                        left: `${50 - (ACCEPTABLE_RANGE_BPS / 100) * 100}%`,
                        right: `${50 - (ACCEPTABLE_RANGE_BPS / 100) * 100}%`,
                      }}
                    />

                    {/* Stable NAV bar */}
                    <div
                      className={`absolute top-0 h-5 ${isBreakingBuck ? 'bg-destructive' : 'bg-primary'}`}
                      style={{
                        left: '50%',
                        width: `${Math.abs((nav.stable_nav - 1) * 10000)}%`,
                        transform: nav.stable_nav < 1 ? 'translateX(-100%)' : 'none',
                      }}
                    />

                    {/* Shadow NAV bar */}
                    <div
                      className="absolute bottom-0 h-5 bg-blue-500"
                      style={{
                        left: '50%',
                        width: `${Math.abs((nav.market_based_nav - 1) * 10000)}%`,
                        transform: nav.market_based_nav < 1 ? 'translateX(-100%)' : 'none',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            <span>-{ACCEPTABLE_RANGE_BPS} bps</span>
            <span>$1.00 Target</span>
            <span>+{ACCEPTABLE_RANGE_BPS} bps</span>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-semibold">Analysis</h4>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Points:</span>
                <span className="font-medium">{navHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Stable NAV:</span>
                <span className="font-medium">
                  ${(navHistory.reduce((sum, nav) => sum + nav.stable_nav, 0) / navHistory.length).toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Shadow NAV:</span>
                <span className="font-medium">
                  ${(navHistory.reduce((sum, nav) => sum + nav.market_based_nav, 0) / navHistory.length).toFixed(4)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Deviation:</span>
                <span className="font-medium">
                  {Math.min(...navHistory.map(nav => Math.abs(nav.deviation_bps || 0))).toFixed(1)} bps
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Deviation:</span>
                <span className="font-medium">
                  {maxDeviation.toFixed(1)} bps
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Std Deviation:</span>
                <span className="font-medium">
                  {(() => {
                    const deviations = navHistory.map(nav => Math.abs(nav.deviation_bps || 0))
                    const mean = deviations.reduce((sum, val) => sum + val, 0) / deviations.length
                    const variance = deviations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / deviations.length
                    return Math.sqrt(variance).toFixed(1)
                  })()} bps
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-semibold">Risk Indicators</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Volatility (Max Deviation)</span>
              <Badge variant={maxDeviation > 20 ? 'destructive' : maxDeviation > 10 ? 'secondary' : 'default'}>
                {maxDeviation > 20 ? 'High' : maxDeviation > 10 ? 'Medium' : 'Low'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Breaking the Buck Risk</span>
              <Badge variant={breakingBuckCount > 0 ? 'destructive' : 'default'}>
                {breakingBuckCount > 0 ? 'Occurred' : 'None'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stability</span>
              <Badge variant={avgDeviation < 5 ? 'default' : avgDeviation < 10 ? 'secondary' : 'destructive'}>
                {avgDeviation < 5 ? 'Excellent' : avgDeviation < 10 ? 'Good' : 'Poor'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

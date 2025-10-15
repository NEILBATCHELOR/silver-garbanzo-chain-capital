/**
 * WAM/WAL Chart
 * Line chart showing Weighted Average Maturity and Life trends
 * With compliance threshold lines
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

import { useMMFNAVHistory } from '@/hooks/mmf'

interface WAMWALChartProps {
  fundId: string
  days?: number
}

export function WAMWALChart({ fundId, days = 30 }: WAMWALChartProps) {
  const startDate = subDays(new Date(), days)
  const { data: navHistoryData, isLoading } = useMMFNAVHistory(fundId, startDate, new Date())

  const navHistory = navHistoryData?.data || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WAM/WAL Trends</CardTitle>
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
          <CardTitle>WAM/WAL Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No historical data available. Run NAV calculations to generate trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate stats
  const latestNav = navHistory[navHistory.length - 1]
  const avgWAM = navHistory.reduce((sum, nav) => sum + nav.weighted_average_maturity_days, 0) / navHistory.length
  const avgWAL = navHistory.reduce((sum, nav) => sum + nav.weighted_average_life_days, 0) / navHistory.length
  const maxWAM = Math.max(...navHistory.map(nav => nav.weighted_average_maturity_days))
  const maxWAL = Math.max(...navHistory.map(nav => nav.weighted_average_life_days))

  // Check for violations
  const wamViolations = navHistory.filter(nav => !nav.is_wam_compliant).length
  const walViolations = navHistory.filter(nav => !nav.is_wal_compliant).length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>WAM/WAL Trends</CardTitle>
          <CardDescription>
            Weighted Average Maturity and Life over last {days} days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alerts */}
          {(wamViolations > 0 || walViolations > 0) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {wamViolations > 0 && `${wamViolations} WAM violations `}
                {wamViolations > 0 && walViolations > 0 && 'and '}
                {walViolations > 0 && `${walViolations} WAL violations `}
                in the last {days} days
              </AlertDescription>
            </Alert>
          )}

          {/* Current Status */}
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Current WAM</p>
              <p className="text-2xl font-bold">{latestNav.weighted_average_maturity_days}</p>
              <p className="text-xs text-muted-foreground">days (limit: 60)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current WAL</p>
              <p className="text-2xl font-bold">{latestNav.weighted_average_life_days}</p>
              <p className="text-xs text-muted-foreground">days (limit: 120)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average WAM</p>
              <p className="text-2xl font-bold">{avgWAM.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">over {days} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average WAL</p>
              <p className="text-2xl font-bold">{avgWAL.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">over {days} days</p>
            </div>
          </div>

          {/* WAM Visual Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Weighted Average Maturity (WAM)</h4>
              <Badge variant={latestNav.is_wam_compliant ? 'default' : 'destructive'}>
                {latestNav.is_wam_compliant ? 'Compliant' : 'Non-Compliant'}
              </Badge>
            </div>
            <div className="space-y-1">
              {navHistory.slice(-10).reverse().map((nav, index) => {
                const percentage = (nav.weighted_average_maturity_days / 60) * 100
                const isViolation = !nav.is_wam_compliant

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(nav.valuation_date), 'MMM d')}</span>
                      <span className="font-medium">{nav.weighted_average_maturity_days} days</span>
                    </div>
                    <div className="relative h-6 rounded-full bg-muted overflow-hidden">
                      {/* Threshold line at 60 days */}
                      <div className="absolute inset-y-0 right-0 w-0.5 bg-destructive" />
                      {/* Progress bar */}
                      <div 
                        className={`h-full transition-all ${isViolation ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* WAL Visual Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Weighted Average Life (WAL)</h4>
              <Badge variant={latestNav.is_wal_compliant ? 'default' : 'destructive'}>
                {latestNav.is_wal_compliant ? 'Compliant' : 'Non-Compliant'}
              </Badge>
            </div>
            <div className="space-y-1">
              {navHistory.slice(-10).reverse().map((nav, index) => {
                const percentage = (nav.weighted_average_life_days / 120) * 100
                const isViolation = !nav.is_wal_compliant

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(nav.valuation_date), 'MMM d')}</span>
                      <span className="font-medium">{nav.weighted_average_life_days} days</span>
                    </div>
                    <div className="relative h-6 rounded-full bg-muted overflow-hidden">
                      {/* Threshold line at 120 days */}
                      <div className="absolute inset-y-0 right-0 w-0.5 bg-destructive" />
                      {/* Progress bar */}
                      <div 
                        className={`h-full transition-all ${isViolation ? 'bg-destructive' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">WAM Statistics</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-medium">{latestNav.weighted_average_maturity_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average:</span>
                  <span className="font-medium">{avgWAM.toFixed(1)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum:</span>
                  <span className="font-medium">{maxWAM} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Violations:</span>
                  <span className={`font-medium ${wamViolations > 0 ? 'text-destructive' : ''}`}>
                    {wamViolations}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">WAL Statistics</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-medium">{latestNav.weighted_average_life_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average:</span>
                  <span className="font-medium">{avgWAL.toFixed(1)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum:</span>
                  <span className="font-medium">{maxWAL} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Violations:</span>
                  <span className={`font-medium ${walViolations > 0 ? 'text-destructive' : ''}`}>
                    {walViolations}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

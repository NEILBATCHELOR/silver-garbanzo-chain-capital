/**
 * Daily NAV Tracker
 * Calendar view of daily NAV calculations
 * Shows stable NAV, shadow NAV, and compliance status
 */

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calculator, TrendingUp, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/shared/utils'

import { useMMFNAVHistory, useCalculateMMFNAV } from '@/hooks/mmf'
import type { MMFNAVHistory } from '@/types/nav/mmf'

interface DailyNAVTrackerProps {
  fundId: string
  onCalculate?: (date: Date) => void
}

export function DailyNAVTracker({ fundId, onCalculate }: DailyNAVTrackerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: navHistoryData, isLoading } = useMMFNAVHistory(
    fundId,
    monthStart,
    monthEnd
  )

  const navHistory = navHistoryData?.data || []

  const calculateMutation = useCalculateMMFNAV(fundId, {
    onSuccess: () => {
      setSelectedDate(null)
    }
  })

  // Generate calendar days
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Find NAV for a specific date
  const getNAVForDate = (date: Date): MMFNAVHistory | undefined => {
    return navHistory.find(nav => 
      isSameDay(new Date(nav.valuation_date), date)
    )
  }

  // Handle quick calculate
  const handleQuickCalculate = async () => {
    const today = new Date()
    await calculateMutation.mutateAsync({
      asOfDate: today
    })
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const selectedNav = selectedDate ? getNAVForDate(selectedDate) : null

  return (
    <div className="space-y-6">
      {/* Header with Quick Calculate */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daily NAV Tracker</h3>
          <p className="text-sm text-muted-foreground">
            Track daily NAV calculations and compliance
          </p>
        </div>
        <Button onClick={handleQuickCalculate} disabled={calculateMutation.isPending}>
          <Calculator className="mr-2 h-4 w-4" />
          Calculate Today
        </Button>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
              <CardDescription>
                {navHistory.length} NAV calculations this month
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}

            {/* Days */}
            {days.map((day) => {
              const nav = getNAVForDate(day)
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const hasNAV = !!nav

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'p-2 rounded-md border text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isToday && 'border-primary',
                    isSelected && 'bg-accent',
                    !hasNAV && 'text-muted-foreground',
                    hasNAV && !nav.is_liquidity_compliant && 'border-destructive'
                  )}
                >
                  <div className="text-right font-medium">{format(day, 'd')}</div>
                  {hasNAV && (
                    <div className="mt-1 space-y-0.5">
                      <div className="text-xs">
                        ${nav.stable_nav.toFixed(4)}
                      </div>
                      {nav.is_breaking_the_buck && (
                        <div className="flex justify-center">
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedNav && (
        <Card>
          <CardHeader>
            <CardTitle>NAV Details - {format(selectedDate!, 'PPP')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* NAV Values */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Stable NAV</p>
                  <p className="text-2xl font-bold">${selectedNav.stable_nav.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shadow NAV</p>
                  <p className="text-2xl font-bold">${selectedNav.market_based_nav.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deviation</p>
                  <p className="text-2xl font-bold">
                    {selectedNav.deviation_bps} bps
                  </p>
                </div>
              </div>

              {/* Compliance Status */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Compliance Status</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedNav.is_wam_compliant ? 'default' : 'destructive'}>
                    WAM: {selectedNav.is_wam_compliant ? 'Compliant' : 'Non-Compliant'}
                  </Badge>
                  <Badge variant={selectedNav.is_wal_compliant ? 'default' : 'destructive'}>
                    WAL: {selectedNav.is_wal_compliant ? 'Compliant' : 'Non-Compliant'}
                  </Badge>
                  <Badge variant={selectedNav.is_liquidity_compliant ? 'default' : 'destructive'}>
                    Liquidity: {selectedNav.is_liquidity_compliant ? 'Compliant' : 'Non-Compliant'}
                  </Badge>
                  {selectedNav.is_breaking_the_buck && (
                    <Badge variant="destructive">Breaking the Buck</Badge>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">WAM</p>
                  <p className="text-lg font-semibold">
                    {selectedNav.weighted_average_maturity_days} days
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WAL</p>
                  <p className="text-lg font-semibold">
                    {selectedNav.weighted_average_life_days} days
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Liquid</p>
                  <p className="text-lg font-semibold">
                    {selectedNav.daily_liquid_assets_percentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Liquid</p>
                  <p className="text-lg font-semibold">
                    {selectedNav.weekly_liquid_assets_percentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Yields */}
              {(selectedNav.seven_day_yield || selectedNav.thirty_day_yield) && (
                <div className="grid gap-4 md:grid-cols-3">
                  {selectedNav.seven_day_yield && (
                    <div>
                      <p className="text-sm text-muted-foreground">7-Day Yield</p>
                      <p className="text-lg font-semibold">
                        {selectedNav.seven_day_yield.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {selectedNav.thirty_day_yield && (
                    <div>
                      <p className="text-sm text-muted-foreground">30-Day Yield</p>
                      <p className="text-lg font-semibold">
                        {selectedNav.thirty_day_yield.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {selectedNav.effective_yield && (
                    <div>
                      <p className="text-sm text-muted-foreground">Effective Yield</p>
                      <p className="text-lg font-semibold">
                        {selectedNav.effective_yield.toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedNav.portfolio_manager_notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Portfolio Manager Notes</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedNav.portfolio_manager_notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Calculations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calculations</CardTitle>
          <CardDescription>Last 10 NAV calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Stable NAV</TableHead>
                  <TableHead className="text-right">Shadow NAV</TableHead>
                  <TableHead className="text-right">Deviation (bps)</TableHead>
                  <TableHead className="text-right">WAM</TableHead>
                  <TableHead className="text-right">WAL</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : navHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No NAV calculations yet
                    </TableCell>
                  </TableRow>
                ) : (
                  navHistory.slice(0, 10).map((nav) => (
                    <TableRow key={nav.id}>
                      <TableCell className="font-medium">
                        {format(new Date(nav.valuation_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        ${nav.stable_nav.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${nav.market_based_nav.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        {nav.deviation_bps}
                      </TableCell>
                      <TableCell className="text-right">
                        {nav.weighted_average_maturity_days}d
                      </TableCell>
                      <TableCell className="text-right">
                        {nav.weighted_average_life_days}d
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {nav.is_liquidity_compliant ? (
                            <Badge variant="default">Compliant</Badge>
                          ) : (
                            <Badge variant="destructive">Non-Compliant</Badge>
                          )}
                          {nav.is_breaking_the_buck && (
                            <Badge variant="destructive">Buck</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

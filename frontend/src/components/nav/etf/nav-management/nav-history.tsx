/**
 * NAV History
 * Historical NAV tracking with date range selection
 * Self-contained component that fetches its own data
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/utils/utils'
import { etfService } from '@/services/nav/etfService'

export interface NAVHistoryProps {
  etfId: string
}

export function NAVHistory({ etfId }: NAVHistoryProps) {
  const [dateRange, setDateRange] = useState<string>('30d')
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30))
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [customRangeOpen, setCustomRangeOpen] = useState(false)

  // Fetch ETF product data
  const { data: productData } = useQuery({
    queryKey: ['etf-product', etfId],
    queryFn: () => etfService.getETFProduct(etfId),
  })

  // Fetch NAV history with date range
  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['etf-nav-history', etfId, dateFrom, dateTo],
    queryFn: () => etfService.getNAVHistory(etfId, { 
      dateFrom, 
      dateTo 
    }),
  })

  const product = productData?.data
  const navHistory = historyData?.data || []

  const handleDateRangeChange = (range: string) => {
    setDateRange(range)

    let from: Date
    const to = new Date()

    switch (range) {
      case '7d':
        from = subDays(to, 7)
        break
      case '30d':
        from = subDays(to, 30)
        break
      case '90d':
        from = subDays(to, 90)
        break
      case '1y':
        from = subDays(to, 365)
        break
      case 'ytd':
        from = new Date(to.getFullYear(), 0, 1)
        break
      case 'custom':
        return
      default:
        from = subDays(to, 30)
    }

    setDateFrom(from)
    setDateTo(to)
  }

  const handleCustomDateRange = () => {
    if (dateFrom && dateTo) {
      setCustomRangeOpen(false)
      // Trigger refetch with new dates
      refetch()
    }
  }

  const handleExport = () => {
    const headers = [
      'Date',
      'NAV per Share',
      'Market Price',
      'Premium/Discount %',
      'Total Net Assets',
      'Shares Outstanding',
      'Volume',
    ]

    const rows = navHistory.map(record => [
      format(new Date(record.valuation_date), 'yyyy-MM-dd'),
      record.nav_per_share.toFixed(6),
      record.market_price?.toFixed(6) || 'N/A',
      record.premium_discount_pct?.toFixed(2) || 'N/A',
      record.total_net_assets?.toFixed(2) || 'N/A',
      record.shares_outstanding?.toFixed(0) || 'N/A',
      record.volume?.toFixed(0) || 'N/A',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${product?.fund_ticker || 'etf'}_nav_history_${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const formatPercentage = (value: number | null) => {
    if (value === null) return 'N/A'
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NAV History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Failed to load ETF data</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>NAV History</CardTitle>
            <CardDescription>
              {product.fund_name} - Historical net asset value tracking
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={navHistory.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Selector */}
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <Popover open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(dateFrom, 'MMM d, yyyy')} - {format(dateTo, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium">From Date</label>
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => date && setDateFrom(date)}
                      initialFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Date</label>
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => date && setDateTo(date)}
                    />
                  </div>
                  <Button onClick={handleCustomDateRange} className="w-full">
                    Apply Range
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* NAV History Table */}
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Loading NAV history...</p>
          </div>
        ) : navHistory.length === 0 ? (
          <Alert>
            <AlertDescription>
              No NAV history found for the selected date range. Calculate NAV to generate history records.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">NAV per Share</TableHead>
                  <TableHead className="text-right">Market Price</TableHead>
                  <TableHead className="text-right">Premium/Discount</TableHead>
                  <TableHead className="text-right">Daily Change</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {navHistory.map((record, index) => {
                  const prevRecord = navHistory[index + 1]
                  const dailyChange = prevRecord
                    ? ((record.nav_per_share - prevRecord.nav_per_share) / prevRecord.nav_per_share) * 100
                    : 0

                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.valuation_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(record.nav_per_share)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {record.market_price ? formatCurrency(record.market_price) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.premium_discount_pct !== null && record.premium_discount_pct !== undefined ? (
                          <Badge
                            variant={
                              record.premium_discount_pct > 0.25
                                ? 'default'
                                : record.premium_discount_pct < -0.25
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {formatPercentage(record.premium_discount_pct)}
                          </Badge>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {dailyChange !== 0 && prevRecord && (
                            <>
                              {dailyChange > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span
                                className={cn(
                                  'font-mono text-sm',
                                  dailyChange > 0 ? 'text-green-600' : 'text-red-600'
                                )}
                              >
                                {formatPercentage(dailyChange)}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {record.volume ? record.volume.toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Stats */}
        {navHistory.length > 0 && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Records</p>
                <p className="font-semibold">{navHistory.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Latest NAV</p>
                <p className="font-semibold">{formatCurrency(navHistory[0].nav_per_share)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Period Change</p>
                <p className={cn(
                  'font-semibold',
                  navHistory[0].nav_per_share > navHistory[navHistory.length - 1].nav_per_share
                    ? 'text-green-600'
                    : 'text-red-600'
                )}>
                  {formatPercentage(
                    ((navHistory[0].nav_per_share - navHistory[navHistory.length - 1].nav_per_share) / 
                    navHistory[navHistory.length - 1].nav_per_share) * 100
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Premium/Discount</p>
                <p className="font-semibold">
                  {formatPercentage(
                    navHistory.reduce((sum, r) => sum + (r.premium_discount_pct || 0), 0) / navHistory.length
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

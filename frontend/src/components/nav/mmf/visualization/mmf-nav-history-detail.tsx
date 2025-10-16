/**
 * MMF NAV History Detail Component
 * 
 * Comprehensive display of MMF NAV calculation history with:
 * - Timeline view of all calculations
 * - Stable NAV and Shadow NAV comparison
 * - Compliance monitoring (WAM, WAL, liquidity)
 * - Breaking the buck alerts
 * - Amortized cost vs mark-to-market analysis
 */

import React, { useState, useMemo } from 'react'
import { useMMFNAVHistory } from '@/hooks/mmf/useMMFData'
import { format, parseISO } from 'date-fns'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'

// Helper function to safely format dates (handles both Date objects and ISO strings)
const formatDate = (date: Date | string, formatString: string): string => {
  if (date instanceof Date) {
    return format(date, formatString)
  }
  return format(parseISO(date), formatString)
}
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import { cn } from '@/utils/utils'

interface MMFNAVHistoryDetailProps {
  fundId: string
  fundName?: string
}

export function MMFNAVHistoryDetail({ fundId, fundName }: MMFNAVHistoryDetailProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  
  // Fetch history data
  const { data: historyData, isLoading, error } = useMMFNAVHistory(fundId)
  
  const history = historyData?.data || []
  
  // Filter data based on selected period
  const filteredHistory = useMemo(() => {
    if (selectedPeriod === 'all') return history
    
    const now = new Date()
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
    const cutoff = new Date(now.setDate(now.getDate() - days))
    
    return history.filter(h => new Date(h.valuation_date) >= cutoff)
  }, [history, selectedPeriod])
  
  // Prepare chart data
  const chartData = useMemo(() => {
    return filteredHistory
      .map(h => ({
        date: formatDate(h.valuation_date, 'MMM dd'),
        stableNAV: Number(h.stable_nav || 0),
        shadowNAV: Number(h.market_based_nav || 0),
        deviation: Number(h.deviation_bps || 0),
        wam: h.weighted_average_maturity_days,
        wal: h.weighted_average_life_days,
        dailyLiquid: Number(h.daily_liquid_assets_percentage || 0),
        weeklyLiquid: Number(h.weekly_liquid_assets_percentage || 0),
        isBreakingBuck: h.is_breaking_the_buck || false
      }))
      .reverse() // Show oldest to newest for timeline
  }, [filteredHistory])
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null
    
    const latest = filteredHistory[0]
    const oldest = filteredHistory[filteredHistory.length - 1]
    
    const maxDeviation = Math.max(...chartData.map(d => Math.abs(d.deviation)))
    const avgWAM = chartData.reduce((sum, d) => sum + d.wam, 0) / chartData.length
    const avgWAL = chartData.reduce((sum, d) => sum + d.wal, 0) / chartData.length
    const avgDailyLiquid = chartData.reduce((sum, d) => sum + d.dailyLiquid, 0) / chartData.length
    const avgWeeklyLiquid = chartData.reduce((sum, d) => sum + d.weeklyLiquid, 0) / chartData.length
    
    const breakingBuckEvents = filteredHistory.filter(h => h.is_breaking_the_buck).length
    const complianceIssues = filteredHistory.filter(h => 
      !h.is_wam_compliant || !h.is_wal_compliant || !h.is_liquidity_compliant
    ).length
    
    return {
      latest,
      oldest,
      maxDeviation,
      avgWAM,
      avgWAL,
      avgDailyLiquid,
      avgWeeklyLiquid,
      breakingBuckEvents,
      complianceIssues,
      totalCalculations: filteredHistory.length
    }
  }, [filteredHistory, chartData])
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading History</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load NAV history'}
        </AlertDescription>
      </Alert>
    )
  }
  
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">No NAV History Available</p>
          <p className="text-gray-500 text-sm mt-2">
            Calculate NAV to start building history
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {fundName ? `${fundName} - ` : ''}NAV Calculation History
          </h3>
          <p className="text-sm text-muted-foreground">
            {stats?.totalCalculations} calculation{stats?.totalCalculations !== 1 ? 's' : ''} in selected period
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as typeof selectedPeriod)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latest Stable NAV</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Number(stats.latest.stable_nav || 0).toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(stats.latest.valuation_date, 'MMM dd, yyyy')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Max Deviation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.maxDeviation.toFixed(1)} bps
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Highest variance from $1.00
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Breaking the Buck</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold',
                stats.breakingBuckEvents > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {stats.breakingBuckEvents}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                NAV &lt; $0.995 events
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Compliance Issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold',
                stats.complianceIssues > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {stats.complianceIssues}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Regulatory violations
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Breaking the Buck Alerts */}
      {stats && stats.breakingBuckEvents > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Breaking the Buck Alert</AlertTitle>
          <AlertDescription>
            This fund has experienced {stats.breakingBuckEvents} instance{stats.breakingBuckEvents !== 1 ? 's' : ''} where 
            the NAV fell below $0.995 in the selected period. This requires immediate attention.
          </AlertDescription>
        </Alert>
      )}
      
      {/* NAV Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stable NAV vs Shadow NAV
          </CardTitle>
          <CardDescription>
            Compare amortized cost NAV (stable) with mark-to-market NAV (shadow)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0.99, 1.01]} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={1.0} stroke="#666" strokeDasharray="3 3" label="Target $1.00" />
              <ReferenceLine y={0.995} stroke="#ef4444" strokeDasharray="3 3" label="Breaking Buck Threshold" />
              <Line 
                type="monotone" 
                dataKey="stableNAV" 
                stroke="#2563eb" 
                name="Stable NAV" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="shadowNAV" 
                stroke="#f97316" 
                name="Shadow NAV" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Deviation Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            NAV Deviation (Basis Points)
          </CardTitle>
          <CardDescription>
            Difference between stable NAV and shadow NAV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#666" />
              <Area 
                type="monotone" 
                dataKey="deviation" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.3}
                name="Deviation (bps)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Compliance Metrics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WAM/WAL Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Maturity Metrics</CardTitle>
            <CardDescription>WAM and WAL compliance tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" label="WAM Limit" />
                <ReferenceLine y={120} stroke="#f97316" strokeDasharray="3 3" label="WAL Limit" />
                <Line type="monotone" dataKey="wam" stroke="#3b82f6" name="WAM (days)" strokeWidth={2} />
                <Line type="monotone" dataKey="wal" stroke="#8b5cf6" name="WAL (days)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            {stats && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Average WAM</p>
                  <p className="font-semibold">{stats.avgWAM.toFixed(1)} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Average WAL</p>
                  <p className="font-semibold">{stats.avgWAL.toFixed(1)} days</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Liquidity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Liquidity Ratios</CardTitle>
            <CardDescription>Daily and weekly liquid assets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="3 3" label="Daily Min" />
                <ReferenceLine y={50} stroke="#f97316" strokeDasharray="3 3" label="Weekly Min" />
                <Area 
                  type="monotone" 
                  dataKey="weeklyLiquid" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  name="Weekly Liquid %"
                />
                <Area 
                  type="monotone" 
                  dataKey="dailyLiquid" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.5}
                  name="Daily Liquid %"
                />
              </AreaChart>
            </ResponsiveContainer>
            {stats && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Avg Daily Liquid</p>
                  <p className="font-semibold">{stats.avgDailyLiquid.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Weekly Liquid</p>
                  <p className="font-semibold">{stats.avgWeeklyLiquid.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation History</CardTitle>
          <CardDescription>Complete timeline of all NAV calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Stable NAV</TableHead>
                  <TableHead>Shadow NAV</TableHead>
                  <TableHead>Deviation</TableHead>
                  <TableHead>WAM</TableHead>
                  <TableHead>WAL</TableHead>
                  <TableHead>Daily Liquid</TableHead>
                  <TableHead>Weekly Liquid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">
                      {formatDate(h.valuation_date, 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      ${Number(h.stable_nav || 0).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      ${Number(h.market_based_nav || 0).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'font-medium',
                        Math.abs(Number(h.deviation_bps || 0)) > 10 ? 'text-orange-600' : 'text-gray-600'
                      )}>
                        {Number(h.deviation_bps || 0).toFixed(1)} bps
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        h.weighted_average_maturity_days > 60 ? 'text-red-600' : 'text-gray-900'
                      )}>
                        {h.weighted_average_maturity_days} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        h.weighted_average_life_days > 120 ? 'text-red-600' : 'text-gray-900'
                      )}>
                        {h.weighted_average_life_days} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        Number(h.daily_liquid_assets_percentage) < 25 ? 'text-red-600' : 'text-gray-900'
                      )}>
                        {Number(h.daily_liquid_assets_percentage || 0).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        Number(h.weekly_liquid_assets_percentage) < 50 ? 'text-red-600' : 'text-gray-900'
                      )}>
                        {Number(h.weekly_liquid_assets_percentage || 0).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {h.is_breaking_the_buck && (
                          <Badge variant="destructive" className="text-xs">
                            Breaking Buck
                          </Badge>
                        )}
                        {(!h.is_wam_compliant || !h.is_wal_compliant || !h.is_liquidity_compliant) && (
                          <Badge variant="destructive" className="text-xs">
                            Non-Compliant
                          </Badge>
                        )}
                        {!h.is_breaking_the_buck && h.is_wam_compliant && h.is_wal_compliant && h.is_liquidity_compliant && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Compliant
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

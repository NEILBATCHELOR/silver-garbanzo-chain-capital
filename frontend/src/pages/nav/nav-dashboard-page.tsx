/**
 * NAV Dashboard Page
 * Main dashboard for NAV operations with KPIs, quick actions, and recent activity
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, TrendingUp, Clock, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  NavDashboardHeader,
  NavKpiCards,
  NavPermissionGuard,
  InlineNavPermissionGuard
} from '@/components/nav'
import { 
  useNavOverview,
  usePriorityCalculators 
} from '@/hooks/nav'
import { 
  assetTypeLabels,
  calculationStatusLabels,
  calculationStatusColors 
} from '@/types/nav'
import { NAV_PERMISSIONS } from '@/utils/nav'

export function NavDashboardPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Fetch overview data
  const {
    kpis,
    recentCalculations,
    calculationStats,
    trending,
    isLoading: overviewLoading,
    refetch: refetchOverview
  } = useNavOverview()

  // Fetch priority calculators for quick access
  const {
    priorityCalculators,
    isLoading: calculatorsLoading
  } = usePriorityCalculators()

  // Navigation handlers
  const handleQuickCalculate = () => {
    navigate('/nav/calculators')
  }

  const handleViewHistory = () => {
    navigate('/nav/history')
  }

  const handleViewCalculator = (calculatorId: string) => {
    navigate(`/nav/calculators/${calculatorId}`)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      // Navigate to calculators page with search
      navigate(`/nav/calculators?search=${encodeURIComponent(query)}`)
    }
  }

  const handleRefresh = () => {
    refetchOverview()
  }

  return (
    <NavPermissionGuard 
      permission={NAV_PERMISSIONS.VIEW_DASHBOARD}
      showPermissionNotice={true}
      className="space-y-6"
    >
      {/* Dashboard Header */}
      <NavDashboardHeader
        title="NAV Dashboard"
        subtitle="Net Asset Value calculations and analytics"
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onQuickCalculate={handleQuickCalculate}
        onViewHistory={handleViewHistory}
        isLoading={overviewLoading}
      />

      {/* KPI Cards */}
      <NavKpiCards 
        kpis={kpis}
        isLoading={overviewLoading}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Quick Calculators
              </CardTitle>
              <CardDescription>
                Start a calculation with the most popular calculators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {calculatorsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                priorityCalculators.slice(0, 6).map((calculator) => (
                  <Button
                    key={calculator.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleViewCalculator(calculator.id)}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-medium">{calculator.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {calculator.estimatedDuration || 'Variable time'}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {calculator.complexityLevel}
                    </Badge>
                  </Button>
                ))
              )}
              
              <InlineNavPermissionGuard permission={NAV_PERMISSIONS.VIEW_CALCULATORS}>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/nav/calculators')}
                >
                  View All Calculators
                </Button>
              </InlineNavPermissionGuard>
            </CardContent>
          </Card>
        </div>

        {/* Recent Calculations */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Calculations
              </CardTitle>
              <CardDescription>
                Latest NAV calculation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded">
                      <div className="space-y-1 flex-1">
                        <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                      </div>
                      <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : recentCalculations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent calculations</p>
                  <p className="text-sm">Run your first calculation to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalculations.map((calc) => (
                    <div key={calc.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 cursor-pointer">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: calc.currency,
                              notation: 'compact'
                            }).format(calc.navValue)}
                          </div>
                          {calc.assetType && (
                            <Badge variant="outline" className="text-xs">
                              {assetTypeLabels[calc.assetType as keyof typeof assetTypeLabels] || calc.assetType}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(calc.calculatedAt).toLocaleString()}
                        </div>
                      </div>
                      <Badge 
                        className={calculationStatusColors[calc.status as keyof typeof calculationStatusColors]}
                      >
                        {calculationStatusLabels[calc.status as keyof typeof calculationStatusLabels] || calc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              
              <InlineNavPermissionGuard permission={NAV_PERMISSIONS.VIEW_HISTORY}>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleViewHistory}
                >
                  View Full History
                </Button>
              </InlineNavPermissionGuard>
            </CardContent>
          </Card>
        </div>

        {/* Trending Assets */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trending Assets
              </CardTitle>
              <CardDescription>
                Most calculated asset types this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                      <div className="h-4 bg-muted rounded w-12 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : !trending?.popularAssetTypes.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trending data yet</p>
                  <p className="text-sm">Run some calculations to see trends</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trending.popularAssetTypes.map((asset, index) => (
                    <div key={asset.assetType} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {assetTypeLabels[asset.assetType as keyof typeof assetTypeLabels] || asset.assetType}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {asset.count} calculations
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {Math.round(asset.percentage)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              
              <InlineNavPermissionGuard permission={NAV_PERMISSIONS.VIEW_DASHBOARD}>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/nav/analytics')}
                >
                  View Analytics
                </Button>
              </InlineNavPermissionGuard>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistics Overview */}
      {calculationStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calculations</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculationStats.totalCalculations}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculationStats.completedToday}</div>
              <p className="text-xs text-muted-foreground">Since midnight</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Badge className="h-4 w-4 p-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculationStats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculationStats.totalCalculations > 0 
                  ? Math.round(((calculationStats.totalCalculations - calculationStats.failedCalculations) / calculationStats.totalCalculations) * 100)
                  : 100
                }%
              </div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
        </div>
      )}
    </NavPermissionGuard>
  )
}

export default NavDashboardPage

/**
 * MMF Detail View
 * Comprehensive view of a single MMF with tabs for different aspects
 * Overview, Holdings, NAV History, Compliance, Configuration
 * PLUS 5 Enhancement Tabs: Allocation, Fund Compliance, Risk, Fees/Gates, Transactions
 * Supports inline editing following Bonds pattern
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { 
  TrendingUp, 
  Briefcase, 
  Shield, 
  Settings,
  ArrowLeft,
  PieChart,
  AlertTriangle,
  DollarSign,
  ArrowRightLeft
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { useMMF, useLatestMMFNAV } from '@/hooks/mmf'
import type { MMFProduct } from '@/types/nav/mmf'
import { HoldingsManager } from '../data-input/holdings-manager'
import { MMFProductForm } from '../data-input/mmf-product-form'

// Import Enhancement Components
import {
  AllocationBreakdown,
  FundTypeCompliance,
  ConcentrationRiskDashboard,
  FeesGatesMonitor,
  TransactionManager
} from '../enhancements'

interface MMFDetailViewProps {
  fundId: string
  isEditMode?: boolean
  onBack?: () => void
  onEdit?: () => void
  onCalculate?: () => void
  onSave?: () => void
  onCancel?: () => void
}

export function MMFDetailView({ 
  fundId, 
  isEditMode = false,
  onBack, 
  onEdit, 
  onCalculate,
  onSave,
  onCancel 
}: MMFDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const { data: mmfData, isLoading, refetch } = useMMF(fundId)
  const { data: latestNAVData } = useLatestMMFNAV(fundId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading MMF details...</p>
      </div>
    )
  }

  if (!mmfData?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">MMF not found</p>
        {onBack && (
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        )}
      </div>
    )
  }

  const mmf = mmfData.data
  const holdings = mmf.holdings || []
  const navHistory = mmf.nav_history || []
  const latestNAV = latestNAVData?.data

  // Handle edit form success
  const handleFormSuccess = () => {
    refetch() // Refresh data
    onSave?.() // Exit edit mode
  }

  // If in edit mode, show the edit form
  if (isEditMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Money Market Fund</CardTitle>
          <CardDescription>Update fund information</CardDescription>
        </CardHeader>
        <CardContent>
          <MMFProductForm
            projectId={mmf.project_id}
            mmf={mmf}
            onSuccess={handleFormSuccess}
            onCancel={onCancel}
          />
        </CardContent>
      </Card>
    )
  }

  // Normal view mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{mmf.fund_name}</h2>
        {mmf.fund_ticker && (
          <p className="text-lg text-muted-foreground">
            <code className="text-sm bg-muted px-2 py-1 rounded">{mmf.fund_ticker}</code>
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current NAV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${latestNAV?.stable_nav.toFixed(4) || mmf.net_asset_value.toFixed(4)}
            </div>
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
            <div className="text-2xl font-bold">
              ${latestNAV?.market_based_nav.toFixed(4) || '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Deviation: {latestNAV?.deviation_bps || 0} bps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets Under Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(mmf.assets_under_management / 1_000_000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {holdings.length} holdings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={latestNAV?.is_liquidity_compliant ? 'default' : 'destructive'}>
                {latestNAV?.is_liquidity_compliant ? 'Compliant' : 'Non-Compliant'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              WAM: {latestNAV?.weighted_average_maturity_days || '—'} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          {/* Original 5 Tabs */}
          <TabsTrigger value="overview">
            <Briefcase className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="holdings">
            <TrendingUp className="mr-2 h-4 w-4" />
            Holdings
          </TabsTrigger>
          <TabsTrigger value="nav-history">
            <TrendingUp className="mr-2 h-4 w-4" />
            NAV History
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="mr-2 h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuration
          </TabsTrigger>
          
          {/* NEW ENHANCEMENT TABS */}
          <TabsTrigger value="allocation">
            <PieChart className="mr-2 h-4 w-4" />
            Asset Allocation
          </TabsTrigger>
          <TabsTrigger value="fund-compliance">
            <Shield className="mr-2 h-4 w-4" />
            Fund Compliance
          </TabsTrigger>
          <TabsTrigger value="risk">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Risk Analysis
          </TabsTrigger>
          <TabsTrigger value="fees-gates">
            <DollarSign className="mr-2 h-4 w-4" />
            Fees & Gates
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fund Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Fund Type</p>
                  <Badge variant="outline" className="mt-1">{mmf.fund_type}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Currency</p>
                  <p className="text-sm text-muted-foreground mt-1">{mmf.currency}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Inception Date</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(mmf.inception_date), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge className="mt-1">{mmf.status}</Badge>
                </div>
                {mmf.expense_ratio && (
                  <div>
                    <p className="text-sm font-medium">Expense Ratio</p>
                    <p className="text-sm text-muted-foreground mt-1">{mmf.expense_ratio.toFixed(2)}%</p>
                  </div>
                )}
                {mmf.benchmark_index && (
                  <div>
                    <p className="text-sm font-medium">Benchmark</p>
                    <p className="text-sm text-muted-foreground mt-1">{mmf.benchmark_index}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {latestNAV && (
            <Card>
              <CardHeader>
                <CardTitle>Latest Performance</CardTitle>
                <CardDescription>
                  As of {format(new Date(latestNAV.valuation_date), 'PPP')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium">7-Day Yield</p>
                    <p className="text-2xl font-bold mt-1">
                      {latestNAV.seven_day_yield ? `${latestNAV.seven_day_yield.toFixed(2)}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">30-Day Yield</p>
                    <p className="text-2xl font-bold mt-1">
                      {latestNAV.thirty_day_yield ? `${latestNAV.thirty_day_yield.toFixed(2)}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Shares Outstanding</p>
                    <p className="text-2xl font-bold mt-1">
                      {latestNAV.shares_outstanding.toLocaleString()}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Daily Liquid Assets</p>
                    <p className="text-2xl font-bold mt-1">
                      {latestNAV.daily_liquid_assets_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Minimum: 25%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Weekly Liquid Assets</p>
                    <p className="text-2xl font-bold mt-1">
                      {latestNAV.weekly_liquid_assets_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Minimum: 50%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings">
          <HoldingsManager fundId={fundId} fundCurrency={mmf.currency} />
        </TabsContent>

        {/* NAV History Tab */}
        <TabsContent value="nav-history">
          <Card>
            <CardHeader>
              <CardTitle>NAV History</CardTitle>
              <CardDescription>
                Historical NAV calculations and tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {navHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No NAV history available. Run a calculation to start tracking.
                </p>
              ) : (
                <div className="space-y-2">
                  {navHistory.slice(0, 10).map((nav, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">
                          {format(new Date(nav.valuation_date), 'PPP')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Stable: ${nav.stable_nav.toFixed(4)} | Shadow: ${nav.market_based_nav.toFixed(4)}
                        </p>
                      </div>
                      <Badge variant={nav.is_liquidity_compliant ? 'default' : 'destructive'}>
                        {nav.is_liquidity_compliant ? 'Compliant' : 'Non-Compliant'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>SEC Rule 2a-7 Compliance</CardTitle>
              <CardDescription>
                Regulatory compliance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestNAV ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">WAM Compliance</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={latestNAV.is_wam_compliant ? 'default' : 'destructive'}>
                          {latestNAV.is_wam_compliant ? 'Compliant' : 'Non-Compliant'}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {latestNAV.weighted_average_maturity_days} / 60 days
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">WAL Compliance</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={latestNAV.is_wal_compliant ? 'default' : 'destructive'}>
                          {latestNAV.is_wal_compliant ? 'Compliant' : 'Non-Compliant'}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {latestNAV.weighted_average_life_days} / 120 days
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Breaking the Buck</p>
                      <Badge variant={latestNAV.is_breaking_the_buck ? 'destructive' : 'default'}>
                        {latestNAV.is_breaking_the_buck ? 'Yes (NAV < $0.995)' : 'No'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Gate Status</p>
                      <Badge variant={latestNAV.gate_status === 'open' ? 'default' : 'destructive'}>
                        {latestNAV.gate_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No compliance data available. Run a calculation to generate compliance report.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Fund Configuration</CardTitle>
              <CardDescription>
                Advanced settings and limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configuration management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== NEW ENHANCEMENT TABS ========== */}

        {/* Asset Allocation Tab */}
        <TabsContent value="allocation">
          <AllocationBreakdown fundId={fundId} />
        </TabsContent>

        {/* Fund-Type Compliance Tab */}
        <TabsContent value="fund-compliance">
          <FundTypeCompliance fundId={fundId} fundType={mmf.fund_type} />
        </TabsContent>

        {/* Concentration Risk Tab */}
        <TabsContent value="risk">
          <ConcentrationRiskDashboard fundId={fundId} />
        </TabsContent>

        {/* Fees & Gates Tab */}
        <TabsContent value="fees-gates">
          <FeesGatesMonitor fundId={fundId} />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <TransactionManager fundId={fundId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

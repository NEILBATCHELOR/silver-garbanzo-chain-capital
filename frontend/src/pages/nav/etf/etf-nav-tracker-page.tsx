/**
 * ETF NAV Tracker Page
 * Real-time NAV tracking and monitoring
 * Following MMF NAV Tracker page pattern
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ETFNavigation, NAVChart } from '@/components/nav/etf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { etfService } from '@/services/nav/etfService'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent } from '@/utils/formatters'

export default function ETFNAVTrackerPage() {
  const navigate = useNavigate()
  const { fundId: urlFundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId
  const [selectedFundId, setSelectedFundId] = useState<string>(urlFundId || '')

  // Fetch ETFs for selector
  const { data: etfsData, refetch } = useQuery({
    queryKey: ['etf-products', projectId],
    queryFn: () => etfService.getETFProducts(projectId!),
    enabled: !!projectId,
  })
  const etfs = etfsData?.data || []

  // Set default fund if not specified
  useEffect(() => {
    if (!selectedFundId && etfs.length > 0) {
      setSelectedFundId(etfs[0].id)
    }
  }, [selectedFundId, etfs])

  const selectedETF = etfs.find(e => e.id === selectedFundId)

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/etf/nav-tracker`)
    }
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="ETF NAV Tracker"
          subtitle="Please select a project to track NAV"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              Please select a project to track NAV
            </p>
          </div>
        </div>
      </>
    )
  }

  if (etfs.length === 0) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="ETF NAV Tracker"
          subtitle="No ETFs found"
          onRefresh={handleRefresh}
          onProjectChange={handleProjectChange}
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              No ETFs found. Create one to track NAV.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="ETF NAV Tracker"
        subtitle={selectedETF ? `${selectedETF.fund_name} - Real-time NAV monitoring` : 'Real-time NAV monitoring'}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <ETFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Fund Selector */}
        <div className="flex justify-end">
          <Select value={selectedFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select ETF" />
            </SelectTrigger>
            <SelectContent>
              {etfs.map((etf) => (
                <SelectItem key={etf.id} value={etf.id}>
                  {etf.fund_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current NAV Summary */}
        {selectedETF && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Current NAV</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(selectedETF.net_asset_value, selectedETF.currency)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Market Price</CardDescription>
                <CardTitle className="text-2xl">
                  {selectedETF.market_price 
                    ? formatCurrency(selectedETF.market_price, selectedETF.currency)
                    : 'N/A'}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Premium/Discount</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {selectedETF.premium_discount_pct !== null && selectedETF.premium_discount_pct !== undefined ? (
                    <>
                      {formatPercent(selectedETF.premium_discount_pct / 100)}
                      <Badge variant={selectedETF.premium_discount_pct > 0 ? 'default' : selectedETF.premium_discount_pct < 0 ? 'destructive' : 'secondary'}>
                        {selectedETF.premium_discount_pct > 0 ? 'Premium' : selectedETF.premium_discount_pct < 0 ? 'Discount' : 'Fair'}
                      </Badge>
                    </>
                  ) : 'N/A'}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Tracking Error</CardDescription>
                <CardTitle className="text-2xl">
                  {selectedETF.tracking_error 
                    ? formatPercent(selectedETF.tracking_error / 100)
                    : 'N/A'}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* NAV Chart */}
        {selectedFundId && (
          <Card>
            <CardHeader>
              <CardTitle>NAV Performance</CardTitle>
              <CardDescription>30-day NAV and market price tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <NAVChart etfId={selectedFundId} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

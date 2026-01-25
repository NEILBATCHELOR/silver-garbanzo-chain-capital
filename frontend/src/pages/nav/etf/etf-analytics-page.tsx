/**
 * ETF Analytics Page
 * Premium/discount and tracking error analytics dashboard
 * Following MMF Analytics page pattern
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { 
  ETFNavigation, 
  PremiumDiscountChart, 
  TrackingErrorChart, 
  HoldingsBreakdownChart 
} from '@/components/nav/etf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { etfService } from '@/services/nav/etfService'
import { useQuery } from '@tanstack/react-query'

export default function ETFAnalyticsPage() {
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

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/etf/analytics`)
    }
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="ETF Analytics"
          subtitle="Please select a project to view analytics"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              Please select a project to view analytics
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
          title="ETF Analytics"
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
              No ETFs found. Create one to view analytics.
            </p>
          </div>
        </div>
      </>
    )
  }

  const selectedETF = etfs.find(e => e.id === selectedFundId)

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="ETF Analytics"
        subtitle={selectedETF ? `${selectedETF.fund_name} - Premium/discount and tracking analysis` : 'Premium/discount and tracking analysis'}
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

        {/* Analytics Dashboard */}
        {selectedFundId && (
          <div className="grid gap-6">
            {/* Premium/Discount Chart */}
            <PremiumDiscountChart etfId={selectedFundId} />

            {/* Tracking Error Chart */}
            <TrackingErrorChart etfId={selectedFundId} />

            {/* Holdings Breakdown */}
            <HoldingsBreakdownChart etfId={selectedFundId} />
          </div>
        )}
      </div>
    </>
  )
}

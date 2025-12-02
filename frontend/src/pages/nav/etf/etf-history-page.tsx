/**
 * ETF History Page
 * Historical NAV data display and management
 * Following MMF History page pattern
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ETFNavigation, NAVHistory } from '@/components/nav/etf'
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

export default function ETFHistoryPage() {
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
  if (!selectedFundId && etfs.length > 0) {
    setSelectedFundId(etfs[0].id)
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/etf/history`)
    }
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="ETF NAV History"
          subtitle="Please select a project to view NAV history"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              Please select a project to view NAV history
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
          title="ETF NAV History"
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
              No ETFs found. Create one to view NAV history.
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
        title="ETF NAV History"
        subtitle={selectedETF ? `${selectedETF.fund_name} - Historical NAV records` : 'Historical NAV records'}
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

        {/* NAV History Table */}
        {selectedFundId && <NAVHistory etfId={selectedFundId} />}
      </div>
    </>
  )
}

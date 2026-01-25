/**
 * MMF Analytics Page
 * Liquidity and compliance analytics dashboard
 * Following Bonds page pattern with enhanced header
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { MMFNavigation, WAMWALChart, LiquidityGauge, DeviationHistory } from '@/components/nav/mmf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'
import { useMMFs } from '@/hooks/mmf'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function MMFAnalyticsPage() {
  const navigate = useNavigate()
  const { fundId: urlFundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId
  const [selectedFundId, setSelectedFundId] = useState<string>(urlFundId || '')

  // Fetch MMFs for selector
  const { data: mmfsData, refetch } = useMMFs(projectId!)
  const mmfs = mmfsData?.data || []

  // Set default fund if not specified
  useEffect(() => {
    if (!selectedFundId && mmfs.length > 0) {
      setSelectedFundId(mmfs[0].id)
    }
  }, [selectedFundId, mmfs])

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/analytics`)
    }
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="MMF Analytics"
          subtitle="Please select a project to view analytics"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
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

  if (mmfs.length === 0) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="MMF Analytics"
          subtitle="No money market funds found"
          onRefresh={handleRefresh}
          onProjectChange={handleProjectChange}
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              No money market funds found. Create one to view analytics.
            </p>
          </div>
        </div>
      </>
    )
  }

  const selectedMMF = mmfs.find(m => m.id === selectedFundId)

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="MMF Analytics"
        subtitle={selectedMMF ? `${selectedMMF.fund_name} - Liquidity and compliance monitoring` : 'Liquidity and compliance monitoring'}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <MMFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Fund Selector */}
        <div className="flex justify-end">
          <Select value={selectedFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select fund" />
            </SelectTrigger>
            <SelectContent>
              {mmfs.map((mmf) => (
                <SelectItem key={mmf.id} value={mmf.id}>
                  {mmf.fund_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Analytics Dashboard */}
        {selectedFundId && (
          <div className="grid gap-6">
            {/* Liquidity Gauge */}
            <LiquidityGauge fundId={selectedFundId} />

            {/* WAM/WAL Chart */}
            <WAMWALChart fundId={selectedFundId} days={30} />

            {/* Deviation History */}
            <DeviationHistory fundId={selectedFundId} />
          </div>
        )}
      </div>
    </>
  )
}

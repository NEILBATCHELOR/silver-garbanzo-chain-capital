/**
 * MMF NAV Tracker Page
 * Daily NAV tracking with calendar view
 * Following Bonds page pattern with enhanced header
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { MMFNavigation, DailyNAVTracker, ShadowNAVMonitor } from '@/components/nav/mmf'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MMFNAVTrackerPage() {
  const navigate = useNavigate()
  const { fundId: urlFundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId
  const [selectedFundId, setSelectedFundId] = useState<string>(urlFundId || '')

  // Fetch MMFs for selector
  const { data: mmfsData, refetch } = useMMFs(projectId!)
  const mmfs = mmfsData?.data || []

  // Set default fund if not specified
  if (!selectedFundId && mmfs.length > 0) {
    setSelectedFundId(mmfs[0].id)
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/nav-tracker`)
    }
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="NAV Tracker"
          subtitle="Please select a project to track NAV"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
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

  if (mmfs.length === 0) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="NAV Tracker"
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
              No money market funds found. Create one to track NAV.
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
        title="NAV Tracker"
        subtitle={selectedMMF ? `${selectedMMF.fund_name} - Daily NAV monitoring and deviation tracking` : 'Daily NAV monitoring and deviation tracking'}
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

        {/* Tracker Tabs */}
        {selectedFundId && (
          <Tabs defaultValue="daily" className="space-y-6">
            <TabsList>
              <TabsTrigger value="daily">Daily Tracker</TabsTrigger>
              <TabsTrigger value="shadow">Shadow NAV Monitor</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-6">
              <DailyNAVTracker fundId={selectedFundId} />
            </TabsContent>

            <TabsContent value="shadow" className="space-y-6">
              <ShadowNAVMonitor fundId={selectedFundId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}

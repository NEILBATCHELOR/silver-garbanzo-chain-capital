/**
 * MMF NAV History Page
 * Project-level view of all MMF NAV calculations with detailed history
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { MMFNavigation } from '@/components/nav/mmf'
import { MMFNAVHistoryDetail } from '@/components/nav/mmf/visualization'
import { useTokenProjectContext } from '@/hooks/project'
import { useMMFs, useLatestMMFNAV, useMMFNAVHistory } from '@/hooks/mmf/useMMFData'
import { History, TrendingUp, Calendar, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'

// Component to show NAV history summary for a single MMF
function MMFHistoryRow({ 
  mmf, 
  projectId, 
  isSelected,
  onSelect 
}: { 
  mmf: any
  projectId: string
  isSelected: boolean
  onSelect: () => void
}) {
  // Fetch latest NAV and history count
  const { data: latestNAVData } = useLatestMMFNAV(mmf.id)
  const { data: historyData } = useMMFNAVHistory(mmf.id)
  
  const latestCalc = latestNAVData?.data
  const calculationsCount = historyData?.data?.length || 0
  
  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-4 cursor-pointer transition-colors border-l-4',
        isSelected 
          ? 'bg-blue-50 border-blue-600' 
          : 'hover:bg-gray-50 border-transparent'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">
            {mmf.fund_name || mmf.fund_ticker || 'Unnamed MMF'}
          </p>
          <p className="text-sm text-muted-foreground">
            {mmf.fund_type || 'Unknown Type'} • 
            {mmf.expense_ratio ? ` ${(mmf.expense_ratio * 100).toFixed(2)}%` : ' N/A'} • 
            Target: $1.00
          </p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{calculationsCount}</p>
            <p className="text-xs text-muted-foreground">Calculations</p>
          </div>
          {latestCalc && (
            <>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {latestCalc.stable_nav 
                    ? `$${Number(latestCalc.stable_nav).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Latest Stable NAV</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {latestCalc.valuation_date 
                    ? format(new Date(latestCalc.valuation_date), 'MMM dd, yyyy')
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Last Calculated</p>
              </div>
            </>
          )}
          {!latestCalc && (
            <div className="text-right text-muted-foreground">
              <p className="text-sm">No calculations yet</p>
              <p className="text-xs">Click to calculate</p>
            </div>
          )}
          <ChevronRight className={cn(
            'h-5 w-5 transition-transform',
            isSelected && 'rotate-90'
          )} />
        </div>
      </div>
    </div>
  )
}

export default function MMFHistoryPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const [selectedMMFId, setSelectedMMFId] = useState<string | null>(null)

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // Fetch MMFs for this project
  const { data: mmfsData, isLoading: isLoadingMMFs, error: mmfsError } = useMMFs(projectId || '', {
    enabled: !!projectId
  })

  const mmfs = mmfsData?.data || []
  
  // Find selected MMF
  const selectedMMF = mmfs.find(m => m.id === selectedMMFId)

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/history`)
      setSelectedMMFId(null)
    }
  }
  
  const handleSelectMMF = (mmfId: string) => {
    setSelectedMMFId(selectedMMFId === mmfId ? null : mmfId)
  }
  
  const handleBack = () => {
    setSelectedMMFId(null)
  }

  if (isLoadingProject || isLoadingMMFs) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="container mx-auto px-6 py-8">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          title="NAV History"
          subtitle="View calculation history for all Money Market Funds"
          onRefresh={handleRefresh}
          isLoading={false}
          showCalculateNav={false}
          showAddButtons={false}
        />
        
        <NavNavigation />
        <MMFNavigation />

        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No Project Selected</p>
            <p className="text-yellow-600 text-sm mt-2">
              Please select a project from the dropdown above to view NAV history.
            </p>
          </div>
        </div>
      </>
    )
  }

  // Show error if MMFs failed to load
  if (mmfsError) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="NAV History"
          subtitle="Complete calculation history for all Money Market Funds"
          onRefresh={handleRefresh}
          onProjectChange={handleProjectChange}
          isLoading={isLoadingProject}
          showCalculateNav={false}
          showAddButtons={false}
        />

        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />

        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-red-800 font-medium">Failed to Load MMFs</p>
            <p className="text-red-600 text-sm mt-2">
              {mmfsError instanceof Error ? mmfsError.message : 'An unknown error occurred'}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  const totalMMFs = mmfs.length

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="NAV History"
        subtitle="Complete calculation history for all Money Market Funds"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* MMF-specific Sub-navigation */}
      <MMFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {mmfs.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No Money Market Funds Found</p>
            <p className="text-gray-500 text-sm mt-2">
              Add MMFs and run calculations to view NAV history
            </p>
            <button
              onClick={() => navigate(`/projects/${projectId}/nav/mmf/create`)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create First MMF
            </button>
          </div>
        ) : (
          <>
            {/* Show detailed view if MMF selected */}
            {selectedMMFId && selectedMMF ? (
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to All MMFs
                </Button>
                
                <MMFNAVHistoryDetail 
                  fundId={selectedMMFId}
                  fundName={selectedMMF.fund_name || selectedMMF.fund_ticker}
                />
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total MMFs</p>
                        <p className="text-2xl font-bold mt-1">{totalMMFs}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Active MMFs</p>
                        <p className="text-2xl font-bold mt-1">
                          {mmfs.filter(m => m.status === 'active').length}
                        </p>
                        <p className="text-xs text-muted-foreground">Calculated funds</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <History className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total in Project</p>
                        <p className="text-2xl font-bold mt-1">{totalMMFs}</p>
                        <p className="text-xs text-muted-foreground">All MMF products</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MMF History List */}
                <div className="bg-white rounded-lg border">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <History className="h-5 w-5" />
                      NAV Calculation History
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click on any MMF to view detailed calculation history with charts and compliance tracking
                    </p>
                  </div>
                  <div className="divide-y">
                    {mmfs.map((mmf) => (
                      <MMFHistoryRow 
                        key={mmf.id} 
                        mmf={mmf} 
                        projectId={projectId}
                        isSelected={selectedMMFId === mmf.id}
                        onSelect={() => handleSelectMMF(mmf.id)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

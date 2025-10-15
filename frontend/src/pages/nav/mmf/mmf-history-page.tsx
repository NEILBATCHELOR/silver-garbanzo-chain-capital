/**
 * MMF NAV History Page
 * Project-level view of all MMF NAV calculations
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { MMFNavigation } from '@/components/nav/mmf'
import { useTokenProjectContext } from '@/hooks/project'
import { History, TrendingUp, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

// Component to show NAV history for a single MMF
function MMFHistoryRow({ mmf, projectId }: { mmf: any; projectId: string }) {
  const navigate = useNavigate()
  
  // For now, use mock data - will be replaced with actual hook when available
  const calculationsCount = 0
  const latestCalc = null
  
  return (
    <div
      onClick={() => navigate(`/projects/${projectId}/nav/mmf/${mmf.id}`)}
      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
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
                    ? `$${latestCalc.stable_nav.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
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
        </div>
      </div>
    </div>
  )
}

export default function MMFHistoryPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // TODO: Replace with actual MMF data hook when available
  const mmfs: any[] = []
  const isLoadingMMFs = false

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/history`)
    }
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
                    <p className="text-sm text-muted-foreground">MMFs with History</p>
                    <p className="text-2xl font-bold mt-1">-</p>
                    <p className="text-xs text-muted-foreground">Calculated funds</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center gap-3">
                  <History className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Calculations</p>
                    <p className="text-2xl font-bold mt-1">-</p>
                    <p className="text-xs text-muted-foreground">All time</p>
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
                  View calculation history for each MMF. Click on a fund to see detailed history.
                </p>
              </div>
              <div className="divide-y">
                {mmfs.map((mmf) => (
                  <MMFHistoryRow key={mmf.id} mmf={mmf} projectId={projectId} />
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">📊 MMF NAV History Features</p>
                  <ul className="text-blue-600 text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>View complete calculation history for each money market fund</li>
                    <li>Track stable NAV and shadow NAV changes over time</li>
                    <li>Monitor compliance status (WAM, WAL, liquidity ratios)</li>
                    <li>Identify breaking the buck alerts and regulatory violations</li>
                    <li>Compare amortized cost vs mark-to-market calculations</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

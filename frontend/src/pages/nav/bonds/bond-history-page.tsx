/**
 * Bond NAV History Page
 * Project-level view of all bond NAV calculations
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { BondNavigation } from '@/components/nav/bonds'
import { NAVHistoryTable } from '@/components/nav/bonds/nav-management'
import { useTokenProjectContext } from '@/hooks/project'
import { useBonds } from '@/hooks/bonds/useBondData'
import { History } from 'lucide-react'

export default function BondHistoryPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // Fetch all bonds for this project
  const { data: bondsData, isLoading: isLoadingBonds } = useBonds(projectId || '')

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/bonds/history`)
    }
  }

  if (isLoadingProject || isLoadingBonds) {
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
          subtitle="View calculation history for all bonds"
          onRefresh={handleRefresh}
          isLoading={false}
          showCalculateNav={false}
          showAddButtons={false}
        />
        
        <NavNavigation />
        <BondNavigation />

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

  const bonds = bondsData?.data || []

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="NAV History"
        subtitle="Complete calculation history for all bonds"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* Bond-specific Sub-navigation */}
      <BondNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {bonds.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No Bonds Found</p>
            <p className="text-gray-500 text-sm mt-2">
              Add bonds and run calculations to view NAV history
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Total Bonds</p>
                <p className="text-2xl font-bold mt-2">{bonds.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Calculations Run</p>
                <p className="text-2xl font-bold mt-2">0</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Latest NAV</p>
                <p className="text-2xl font-bold mt-2">-</p>
                <p className="text-xs text-muted-foreground mt-1">No calculations yet</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Avg Calculation Time</p>
                <p className="text-2xl font-bold mt-2">-</p>
                <p className="text-xs text-muted-foreground mt-1">No data</p>
              </div>
            </div>

            {/* Bond Selection for History View */}
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Select a Bond</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a bond to view its complete calculation history
                </p>
              </div>
              <div className="divide-y">
                {bonds.map((bond) => (
                  <div
                    key={bond.id}
                    onClick={() => navigate(`/projects/${projectId}/nav/bonds/${bond.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {bond.asset_name || bond.cusip || bond.isin || 'Unnamed Bond'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bond.issuer_name || 'Unknown Issuer'} • 
                          {bond.coupon_rate ? ` ${(bond.coupon_rate * 100).toFixed(2)}%` : ' N/A'} • 
                          {bond.accounting_treatment || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">0 calculations</p>
                        <p className="text-xs text-muted-foreground">Click to view details</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-blue-800 font-medium">📊 NAV History Features</p>
              <ul className="text-blue-600 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>View complete calculation history for each bond</li>
                <li>Track NAV changes over time with detailed breakdowns</li>
                <li>Export historical data to CSV for analysis</li>
                <li>Compare calculation methods and results</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  )
}

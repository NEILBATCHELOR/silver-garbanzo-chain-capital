/**
 * Bond Analytics Page
 * Project-level analytics dashboard for all bonds
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { BondNavigation } from '@/components/nav/bonds'
import { useTokenProjectContext } from '@/hooks/project'
import { DurationAnalytics } from '@/components/nav/bonds/visualization'
import { useBonds, useBondCalculationHistory } from '@/hooks/bonds/useBondData'

export default function BondAnalyticsPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // Fetch all bonds for this project
  const { data: bondsData, isLoading: isLoadingBonds } = useBonds(projectId || '')
  
  // Fetch calculation history for the first bond (as example)
  const firstBondId = bondsData?.data?.[0]?.id
  const { data: historyData } = useBondCalculationHistory(firstBondId || '', {
    enabled: !!firstBondId
  })

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/bonds/analytics`)
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
          title="Bond Analytics"
          subtitle="View portfolio-wide bond analytics and risk metrics"
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
              Please select a project from the dropdown above to view bond analytics.
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
        title="Bond Analytics"
        subtitle="Portfolio-wide bond analytics and risk metrics"
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
            <p className="text-gray-600 font-medium">No Bonds Found</p>
            <p className="text-gray-500 text-sm mt-2">
              Add bonds to view portfolio analytics
            </p>
          </div>
        ) : (
          <>
            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Total Bonds</p>
                <p className="text-2xl font-bold mt-2">{bonds.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Total Par Value</p>
                <p className="text-2xl font-bold mt-2">
                  ${bonds.reduce((sum, bond) => sum + (bond.par_value || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Avg Coupon Rate</p>
                <p className="text-2xl font-bold mt-2">
                  {bonds.length > 0 
                    ? (bonds.reduce((sum, bond) => sum + (bond.coupon_rate || 0), 0) / bonds.length * 100).toFixed(2)
                    : 0}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">Maturing Bonds</p>
                <p className="text-2xl font-bold mt-2">
                  {bonds.filter(bond => {
                    const maturityDate = new Date(bond.maturity_date)
                    const today = new Date()
                    const monthsToMaturity = (maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)
                    return monthsToMaturity <= 12
                  }).length}
                </p>
              </div>
            </div>

            {/* Duration Analytics for First Bond (as example) */}
            {bonds[0]?.id && historyData?.data && historyData.data.length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Sample Bond Analytics</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Showing analytics for: {bonds[0].asset_name || bonds[0].cusip || bonds[0].isin}
                </p>
                <DurationAnalytics 
                  data={historyData.data.map(calc => ({
                    calculationDate: calc.calculatedAt instanceof Date 
                      ? calc.calculatedAt.toISOString()
                      : String(calc.calculatedAt),
                    modifiedDuration: calc.riskMetrics?.modified_duration,
                    macaulayDuration: calc.riskMetrics?.macaulay_duration,
                    convexity: calc.riskMetrics?.convexity,
                    optionAdjustedDuration: calc.riskMetrics?.option_adjusted_duration
                  }))}
                  bondName={bonds[0].asset_name || bonds[0].cusip || bonds[0].isin || 'Bond'}
                />
              </div>
            )}


          </>
        )}
      </div>
    </>
  )
}

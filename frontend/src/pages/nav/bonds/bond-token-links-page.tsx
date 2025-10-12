/**
 * Bond Token Links Page
 * Project-level view of bond-token connections
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { BondNavigation } from '@/components/nav/bonds'
import { useTokenProjectContext } from '@/hooks/project'
import { useBonds } from '@/hooks/bonds/useBondData'
import { Link as LinkIcon } from 'lucide-react'

export default function BondTokenLinksPage() {
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
      navigate(`/projects/${newProjectId}/nav/bonds/token-links`)
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
          title="Bond-Token Links"
          subtitle="View and manage connections between bonds and tokens"
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
              Please select a project from the dropdown above to view bond-token links.
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
        title="Bond-Token Links"
        subtitle="Manage connections between bonds and tokenized assets"
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
            <LinkIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No Bonds Found</p>
            <p className="text-gray-500 text-sm mt-2">
              Add bonds to create token connections
            </p>
          </div>
        ) : (
          <>
            {/* Bond-Token Connection Summary */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Token Connection Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{bonds.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total Bonds</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">0</p>
                  <p className="text-sm text-muted-foreground mt-1">Connected</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{bonds.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Unconnected</p>
                </div>
              </div>
            </div>

            {/* Bonds List with Token Connection Status */}
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">All Bonds</h3>
                <p className="text-sm text-muted-foreground">
                  Click on a bond to configure its token connection
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
                          {bond.issuer_name || 'Unknown Issuer'} • {bond.coupon_rate ? `${(bond.coupon_rate * 100).toFixed(2)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Not Connected
                        </span>
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-blue-800 font-medium">💡 How Token Connections Work</p>
              <p className="text-blue-600 text-sm mt-2">
                Token connections allow you to link bonds to tokenized assets, set parity ratios, 
                and automatically update token valuations based on bond NAV calculations.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  )
}

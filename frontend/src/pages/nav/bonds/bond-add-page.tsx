/**
 * Bond Add Page
 * Page for creating a new bond using the BondProductForm
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BondProductForm } from '@/components/nav/bonds/data-input'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { BondNavigation } from '@/components/nav/bonds'
import { useTokenProjectContext } from '@/hooks/project'
import type { BondProduct } from '@/types/nav/bonds'

export default function BondAddPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  const handleSuccess = (bond: BondProduct) => {
    // Navigate to the bond detail page after successful creation
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/${bond.id}`)
    } else {
      navigate(`/nav/bonds/${bond.id}`)
    }
  }

  const handleCancel = () => {
    // Navigate back to bonds list
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds`)
    } else {
      navigate('/nav/bonds')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/bonds/new`)
    }
  }

  if (isLoadingProject) {
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
          title="Add New Bond"
          subtitle="Create a new bond for NAV calculations"
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
              Please select a project from the dropdown above to add a bond.
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
        title="Add New Bond"
        subtitle="Create a new bond for NAV calculations"
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

      <div className="container mx-auto px-6 py-8">
        <BondProductForm
          projectId={projectId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </>
  )
}

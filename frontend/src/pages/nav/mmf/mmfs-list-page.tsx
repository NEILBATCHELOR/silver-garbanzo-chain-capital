/**
 * MMFs List Page
 * Main page for viewing and managing all Money Market Funds in a project
 * Enhanced to match Bonds dashboard style
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { MMFListTable, MMFNavigation } from '@/components/nav/mmf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'

export default function MMFsListPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  const handleViewDetails = (mmf: any) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf/${mmf.id}`)
    } else {
      navigate(`/nav/mmf/${mmf.id}`)
    }
  }

  const handleCalculate = (mmf: any) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf/${mmf.id}/calculate`)
    } else {
      navigate(`/nav/mmf/${mmf.id}/calculate`)
    }
  }

  const handleAddNewMMF = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf/create`)
    } else {
      navigate('/nav/mmf/create')
    }
  }

  const handleBulkUpload = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf/upload`)
    } else {
      navigate('/nav/mmf/upload')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf`)
    }
  }

  if (isLoadingProject) {
    return (
      <>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="container mx-auto px-6 py-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Enhanced Header - Matches Bonds Style */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="Money Market Funds Management"
        subtitle="View and manage MMF holdings for NAV calculations"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        onAddItem={handleAddNewMMF}
        onBulkUpload={handleBulkUpload}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={true}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* MMF-specific Sub-navigation */}
      <MMFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* MMF List Table */}
        {projectId ? (
          <MMFListTable
            projectId={projectId}
            onViewDetails={handleViewDetails}
            onCalculate={handleCalculate}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No Project Selected</p>
            <p className="text-yellow-600 text-sm mt-2">
              Please select a project from the dropdown above to view Money Market Funds.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

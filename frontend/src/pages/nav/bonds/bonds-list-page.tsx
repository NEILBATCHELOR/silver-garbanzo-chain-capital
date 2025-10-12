/**
 * Bonds List Page
 * Main page for viewing and managing all bonds in a project
 * Enhanced to match ClimateReceivables dashboard style
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, FileSpreadsheet } from 'lucide-react'
import { BondListTable, BondNavigation } from '@/components/nav/bonds'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'

export default function BondsListPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  const handleSelectBond = (bondId: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/${bondId}`)
    } else {
      navigate(`/nav/bonds/${bondId}`)
    }
  }

  const handleEditBond = (bondId: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/${bondId}/edit`)
    } else {
      navigate(`/nav/bonds/${bondId}/edit`)
    }
  }

  const handleCalculateNAV = (bondId: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/${bondId}/calculate`)
    } else {
      navigate(`/nav/bonds/${bondId}/calculate`)
    }
  }

  const handleAddNewBond = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/new`)
    } else {
      navigate('/nav/bonds/new')
    }
  }

  const handleBulkUpload = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/upload`)
    } else {
      navigate('/nav/bonds/upload')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/bonds`)
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
      {/* Enhanced Header - Matches Climate Receivables Style */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="Bonds Management"
        subtitle="View and manage bond holdings for NAV calculations"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        onAddItem={handleAddNewBond}
        onBulkUpload={handleBulkUpload}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={true}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* Bond-specific Sub-navigation */}
      <BondNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Bonds Table */}
        {projectId ? (
          <BondListTable
            projectId={projectId}
            onSelect={handleSelectBond}
            onEdit={handleEditBond}
            onCalculate={handleCalculateNAV}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No Project Selected</p>
            <p className="text-yellow-600 text-sm mt-2">
              Please select a project from the dropdown above to view bonds.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

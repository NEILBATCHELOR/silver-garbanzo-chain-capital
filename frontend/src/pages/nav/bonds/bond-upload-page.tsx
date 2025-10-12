/**
 * Bond Bulk Upload Page
 * Page for uploading multiple bonds via CSV
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BondCSVUpload } from '@/components/nav/bonds/data-input'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { BondNavigation } from '@/components/nav/bonds'
import { useTokenProjectContext } from '@/hooks/project'
import { useToast } from '@/components/ui/use-toast'

export default function BondUploadPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  const handleUploadComplete = (result: any) => {
    if (result.success) {
      toast({
        title: 'Upload Successful',
        description: `Successfully uploaded ${result.successCount} bonds`,
        variant: 'default',
      })
      
      // Navigate back to bonds list after successful upload
      if (projectId) {
        navigate(`/projects/${projectId}/nav/bonds`)
      } else {
        navigate('/nav/bonds')
      }
    } else {
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${result.failureCount} bonds. Check the error report.`,
        variant: 'destructive',
      })
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/bonds/upload`)
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
          title="Bulk Upload Bonds"
          subtitle="Upload multiple bonds via CSV file"
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
              Please select a project from the dropdown above to upload bonds.
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
        title="Bulk Upload Bonds"
        subtitle="Upload multiple bonds via CSV file"
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
        <BondCSVUpload
          projectId={projectId}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </>
  )
}

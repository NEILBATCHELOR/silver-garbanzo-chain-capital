/**
 * MMF Detail Page
 * Detailed view of a single money market fund
 * Following Bonds page pattern with enhanced header
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Calculator } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MMFDetailView, MMFNavigation } from '@/components/nav/mmf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'
import { useMMF } from '@/hooks/mmf'

export default function MMFDetailPage() {
  const navigate = useNavigate()
  const { fundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  const [isEditMode, setIsEditMode] = useState(false)
  
  const projectId = urlProjectId || contextProjectId

  // Fetch MMF data for refresh functionality
  const { data: mmfData, isLoading, refetch } = useMMF(fundId!)

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf`)
    } else {
      navigate('/nav/mmf')
    }
  }

  const handleEdit = () => {
    setIsEditMode(true)
  }

  const handleView = () => {
    setIsEditMode(false)
  }

  const handleCalculate = () => {
    if (fundId) {
      if (projectId) {
        navigate(`/projects/${projectId}/nav/mmf/${fundId}/calculate`)
      } else {
        navigate(`/nav/mmf/${fundId}/calculate`)
      }
    }
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/${fundId}`)
    }
  }

  if (!fundId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="MMF Details"
          subtitle="View Money Market Fund information"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Invalid Fund ID</p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MMFs List
            </Button>
          </div>
        </div>
      </>
    )
  }

  const mmf = mmfData?.data

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="MMF Details"
        subtitle={mmf ? `${mmf.fund_name} (${mmf.fund_type})` : 'Loading...'}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoading || isLoadingProject}
        showCalculateNav={true}
        onCalculateNav={handleCalculate}
        showAddButtons={false}
      />

      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <MMFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>

          {!isEditMode ? (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleView}>
              View Mode
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleCalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            Calculate NAV
          </Button>
        </div>

        {/* MMF Detail View */}
        <MMFDetailView
          fundId={fundId}
          isEditMode={isEditMode}
          onBack={handleBack}
          onEdit={handleEdit}
          onCalculate={handleCalculate}
          onSave={() => setIsEditMode(false)}
          onCancel={() => setIsEditMode(false)}
        />
      </div>
    </>
  )
}

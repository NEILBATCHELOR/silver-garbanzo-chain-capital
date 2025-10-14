/**
 * NAV Dashboard Page
 * Main dashboard for NAV operations with KPIs, quick actions, and recent activity
 * Enhanced to match Climate Receivables dashboard style
 */

import { useNavigate, useParams } from 'react-router-dom'
import { 
  NavDashboardHeaderEnhanced,
  NavNavigation
} from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'

export function NavDashboardPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  // Use URL project ID if available, otherwise context project ID
  const projectId = urlProjectId || contextProjectId

  // Navigation handlers
  const handleQuickCalculate = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/calculators`)
    } else {
      navigate('/nav/calculators')
    }
  }

  const handleRefresh = () => {
    // Placeholder for refresh functionality
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav`)
    }
  }

  return (
    <>
      {/* Enhanced Header - Matches Climate Receivables Style */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="NAV Dashboard"
        subtitle="Net Asset Value calculations and analytics"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        onCalculateNav={handleQuickCalculate}
        isLoading={isLoadingProject}
        showCalculateNav={true}
      />

      {/* Horizontal Navigation */}
      <NavNavigation projectId={projectId} />
    </>
  )
}

export default NavDashboardPage

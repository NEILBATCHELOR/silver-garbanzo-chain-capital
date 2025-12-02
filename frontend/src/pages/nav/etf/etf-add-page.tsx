/**
 * New ETF Page
 * Create new ETF product using wizard
 * Enhanced to match MMF pattern with proper navigation hierarchy
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NewETFWizard, ETFNavigation } from '@/components/nav/etf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'
import { useToast } from '@/components/ui/use-toast'

export default function NewETFPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  const { toast } = useToast()
  
  const projectId = urlProjectId || contextProjectId

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf`)
    } else {
      navigate('/nav/etf')
    }
  }

  const handleComplete = (etfId: string) => {
    toast({
      title: 'ETF Created',
      description: 'Your ETF has been created successfully.',
    })

    // Navigate to the new ETF detail page
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/${etfId}`)
    } else {
      navigate(`/nav/etf/${etfId}`)
    }
  }

  const handleCancel = () => {
    handleBack()
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/etf/create`)
    }
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          title="Create New ETF"
          subtitle="Set up a new exchange-traded fund"
          onRefresh={handleRefresh}
          isLoading={isLoadingProject}
        />
        <NavNavigation />
        <ETFNavigation />
        <div className="container mx-auto py-6">
          <p className="text-destructive">Project context is required to create an ETF</p>
        </div>
      </>
    )
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
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="Create New ETF"
        subtitle="Set up a new exchange-traded fund product"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* ETF-specific Sub-navigation */}
      <ETFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to ETFs
        </Button>

        {/* Wizard */}
        <NewETFWizard
          projectId={projectId}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </>
  )
}

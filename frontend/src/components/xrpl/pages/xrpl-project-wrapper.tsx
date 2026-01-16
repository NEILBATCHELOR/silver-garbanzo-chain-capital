/**
 * XRPL Project Wrapper
 * Integrates XRPL functionality with Chain Capital's project/organization hierarchy
 * 
 * Purpose:
 * - Provides project context to all XRPL components
 * - Scopes XRPL wallets, tokens, and NFTs to specific projects
 * - Integrates with existing organization selector
 * - Ensures data isolation between projects
 * 
 * Features:
 * - Automatic project selection from URL params or primary project
 * - Project switcher in header
 * - Project-scoped data queries
 * - Audit trail for all XRPL operations
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { XRPLMasterPage } from './xrpl-master-page'
import { useToast } from '@/components/ui/use-toast'
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService'
import { CombinedOrgProjectSelector } from '@/components/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Project {
  id: string
  name: string
  organization_id?: string // Made optional since ProjectUI doesn't include it
}

export function XRPLProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load project on mount or when projectId changes
  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (projectId && projectId !== 'undefined') {
        // Load specific project
        const project = await fetchProject(projectId)
        if (project) {
          setCurrentProject(project)
        } else {
          setError('Project not found')
          toast({
            title: 'Project Not Found',
            description: 'The requested project could not be found',
            variant: 'destructive'
          })
        }
      } else {
        // Load primary or first project
        const project = await getPrimaryOrFirstProject()
        if (project) {
          setCurrentProject(project as Project)
          // Update URL to include project ID
          navigate(`/projects/${project.id}/xrpl`, { replace: true })
        } else {
          setError('No projects available')
          toast({
            title: 'No Projects',
            description: 'Please create a project to use XRPL features',
            variant: 'destructive'
          })
        }
      }
    } catch (err: any) {
      console.error('Error loading project:', err)
      setError(err.message || 'Failed to load project')
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProject = async (id: string): Promise<Project | null> => {
    // TODO: Implement actual project fetching
    // For now, return mock data
    return {
      id,
      name: 'Project ' + id,
      organization_id: 'org-123'
    }
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== currentProject?.id) {
      navigate(`/projects/${newProjectId}/xrpl`)
    }
  }

  const handleRefresh = () => {
    loadProject()
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mb-4 mx-auto text-primary" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !currentProject) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-destructive" />
              Unable to Load XRPL
            </CardTitle>
            <CardDescription>
              {error || 'No project selected'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Project Required</AlertTitle>
              <AlertDescription>
                XRPL features require a project context. Please select a project or create one to continue.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => navigate('/projects')} variant="default">
                Go to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {/* Project Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                XRPL Integration
                <Badge variant="secondary" className="text-xs">
                  XRP Ledger
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentProject.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Project Selector */}
            <CombinedOrgProjectSelector
              currentProjectId={currentProject.id}
              onProjectChange={handleProjectChange}
              layout="horizontal"
              compact={true}
            />
            
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* XRPL Master Page with Project Context */}
      <XRPLMasterPage projectId={currentProject.id} />
    </div>
  )
}

export default XRPLProjectWrapper

/**
 * Solana Project Wrapper
 * Integrates Solana functionality with Chain Capital's project/organization hierarchy
 * 
 * Purpose:
 * - Provides project context to all Solana components
 * - Scopes tokens and and token operations to specific projects
 * - Integrates with existing organization selector
 * - Ensures data isolation between projects
 * 
 * Features:
 * - Automatic project selection from URL params or primary project
 * - Project switcher in header
 * - Project-scoped data queries
 * - Audit trail for all solana operations
 * - Integrated navigation sidebar
 * - Consistent dashboard header
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Routes, Route, useLocation } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Solana components
import {
  SolanaTokenLaunchpad,
  TokenList,
  TokenDetails,
  TransferTokenForm,
  SolanaTokenDeploymentWizard,
  TokenOperationsWrapper
} from '../index';

// Shared components
import { SolanaNavigation, SolanaDashboardHeader } from './index'

interface Project {
  id: string
  name: string
  organization_id?: string
}

export function SolanaProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletConnected, setWalletConnected] = useState(false)

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
          navigate(`/projects/${project.id}/solana`, { replace: true })
        } else {
          setError('No projects available')
          toast({
            title: 'No Projects',
            description: 'Please create a project to use Solana features',
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
    // Import supabase client
    const { supabase } = await import('@/infrastructure/database/client')
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching project:', error)
      return null
    }

    return data
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== currentProject?.id) {
      navigate(`/projects/${newProjectId}/solana`)
    }
  }

  const handleRefresh = () => {
    loadProject()
  }

  const handleConnectWallet = () => {
    // TODO: Implement wallet connection
    toast({
      title: 'Wallet Connection',
      description: 'Wallet connection coming soon',
    })
  }

  const handleNetworkChange = (network: 'MAINNET' | 'TESTNET' | 'DEVNET') => {
    // TODO: Implement network switching
    console.log('Network changed to:', network)
  }

  const handleDeposit = () => {
    navigate(`/projects/${projectId}/solana/deposit`)
  }

  const handleWithdraw = () => {
    navigate(`/projects/${projectId}/solana/withdraw`)
  }

  const handleAnalytics = () => {
    navigate(`/projects/${projectId}/solana/analytics`)
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
              Unable to Load Solanas
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
                Solana features require a project context. Please select a project or create one to continue.
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
    <div className="w-full h-full flex flex-col">
      {/* Dashboard Header */}
      <SolanaDashboardHeader
        title={`${currentProject.name} - Solana Token Launchpad`}
        subtitle="Deploy and manage SPL and Token-2022 tokens"
        network="DEVNET"
        projectId={currentProject.id}
        showDeploy={true}
        showManage={true}
        isLoading={isLoading}
        onDeploy={() => navigate(`/projects/${currentProject.id}/solana/deploy`)}
        onManage={() => navigate(`/projects/${currentProject.id}/solana/list`)}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
      />

      {/* Main Content Area with Sidebar Navigation */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-muted/40 p-4 overflow-y-auto">
          <SolanaNavigation
            projectId={currentProject.id}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Dashboard */}
            <Route index element={<SolanaTokenLaunchpad projectId={currentProject.id} />} />
            
            {/* Token List */}
            <Route path="list" element={<TokenList projectId={currentProject.id} />} />
            
            {/* Deploy Token */}
            <Route path="deploy" element={<SolanaTokenDeploymentWizard projectId={currentProject.id} />} />
            
            {/* Token Details */}
            <Route path=":tokenId/details" element={<TokenDetails projectId={currentProject.id} />} />
            
            {/* Token Operations */}
            <Route path=":tokenId/operations" element={<TokenOperationsWrapper />} />
            
            {/* Transfer Token */}
            <Route path=":tokenId/transfer" element={<TransferTokenForm projectId={currentProject.id} />} />
            
            {/* Analytics */}
            <Route path="analytics" element={
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                    <CardDescription>
                      Performance analytics and metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            } />
            
            {/* Settings */}
            <Route path="settings" element={
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>
                      Solana configuration and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Settings page coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default SolanaProjectWrapper

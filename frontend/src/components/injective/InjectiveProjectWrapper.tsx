/**
 * Injective Project Wrapper
 * Integrates Injective functionality with Chain Capital's project/organization hierarchy
 * 
 * Purpose:
 * - Provides project context to all Injective components
 * - Scopes Injective tokens, markets, and vaults to specific projects
 * - Integrates with existing organization selector
 * - Ensures data isolation between projects
 * 
 * Features:
 * - Automatic project selection from URL params or primary project
 * - Wallet selector with auto-decryption
 * - Network switcher (Mainnet/Testnet)
 * - Project-scoped data queries
 * - Audit trail for all Injective operations
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Routes, Route } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  InjectiveDashboard,
  InjectiveNativeTokenDeployment,
  InjectiveMarketLaunch,
  InjectiveMTSTransfer,
  InjectiveTokenManager,
  InjectiveWalletManager,
  InjectiveTransactions,
  InjectiveDashboardHeader
} from '@/components/injective'
import { DerivativesProjectWrapper } from '@/components/injective/derivatives'
import { InjectiveNavigation } from '@/components/injective/shared'
import type { ProjectWalletData } from '@/services/project/project-wallet-service'
import { Network } from '@injectivelabs/networks'
import { InjectiveWalletService } from '@/services/wallet/injective'

interface Project {
  id: string
  name: string
  organization_id?: string
}

export function InjectiveProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Wallet and network state
  const [network, setNetwork] = useState<'MAINNET' | 'TESTNET'>('TESTNET')
  const [walletId, setWalletId] = useState<string | undefined>()
  const [walletAddress, setWalletAddress] = useState<string | undefined>()
  const [walletBalance, setWalletBalance] = useState<string>('0')
  const [walletPrivateKey, setWalletPrivateKey] = useState<string | undefined>()

  // Load project on mount or when projectId changes
  useEffect(() => {
    loadProject()
  }, [projectId])

  // Load wallet balance when wallet or network changes
  useEffect(() => {
    if (walletAddress) {
      loadWalletBalance()
    }
  }, [walletAddress, network])

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
          navigate(`/projects/${project.id}/injective`, { replace: true })
        } else {
          setError('No projects available')
          toast({
            title: 'No Projects',
            description: 'Please create a project to use Injective features',
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

  const loadWalletBalance = async () => {
    if (!walletAddress) return
    
    setIsLoadingBalance(true)
    try {
      const networkEnum = network === 'MAINNET' ? Network.Mainnet : Network.Testnet
      const walletService = new InjectiveWalletService(networkEnum)
      const balance = await walletService.getBalance(walletAddress)
      
      // Format balance (balance is in smallest unit - 1e18)
      const formatted = (parseFloat(balance.amount) / 1e18).toFixed(4)
      setWalletBalance(formatted)
    } catch (error) {
      console.error('Failed to load wallet balance:', error)
      setWalletBalance('0')
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== currentProject?.id) {
      navigate(`/projects/${newProjectId}/injective`)
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    await loadProject()
    if (walletAddress) {
      await loadWalletBalance()
    }
    setIsLoading(false)
  }

  const handleNetworkChange = (newNetwork: 'MAINNET' | 'TESTNET') => {
    setNetwork(newNetwork)
  }

  const handleWalletSelect = (wallet: ProjectWalletData & { decryptedPrivateKey?: string }) => {
    setWalletId(wallet.id)
    setWalletAddress(wallet.wallet_address)
    setWalletPrivateKey(wallet.decryptedPrivateKey)
    
    toast({
      title: 'Wallet Selected',
      description: `Connected to ${wallet.wallet_address.substring(0, 10)}...`,
    })
  }

  const handleDeploy = () => {
    navigate(`/projects/${currentProject?.id}/injective/deploy`)
  }

  const handleManage = () => {
    navigate(`/projects/${currentProject?.id}/injective/manage`)
  }

  const handleMarket = () => {
    navigate(`/projects/${currentProject?.id}/injective/market`)
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
              Unable to Load Injective
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
                Injective features require a project context. Please select a project or create one to continue.
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
      {/* Dashboard Header with Wallet Selector */}
      <InjectiveDashboardHeader
        projectId={currentProject.id}
        projectName={currentProject.name}
        network={network}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        walletId={walletId}
        title="Injective Integration"
        subtitle="Deploy and manage native tokens and markets on Injective"
        onRefresh={handleRefresh}
        onNetworkChange={handleNetworkChange}
        onProjectChange={handleProjectChange}
        onWalletSelect={handleWalletSelect}
        isLoading={isLoading}
        isLoadingBalance={isLoadingBalance}
        showDeploy={true}
        showManage={true}
        showMarket={true}
        onDeploy={handleDeploy}
        onManage={handleManage}
        onMarket={handleMarket}
      />

      {/* Horizontal Navigation - Persistent across all pages */}
      <InjectiveNavigation projectId={currentProject.id} />

      {/* Injective Routes with Project Context */}
      <div className="p-6">
        <Routes>
          <Route index element={<InjectiveDashboard projectId={currentProject.id} />} />
          <Route path="wallet" element={<InjectiveWalletManager projectId={currentProject.id} />} />
          <Route path="deploy" element={
            <InjectiveNativeTokenDeployment 
              projectId={currentProject.id}
              walletId={walletId}
              walletAddress={walletAddress}
              walletPrivateKey={walletPrivateKey}
              network={network.toLowerCase() as 'mainnet' | 'testnet'}
            />
          } />
          <Route path="market" element={<InjectiveMarketLaunch projectId={currentProject.id} />} />
          <Route path="derivatives/*" element={<DerivativesProjectWrapper />} />
          <Route path="mts-transfer" element={<InjectiveMTSTransfer projectId={currentProject.id} />} />
          <Route path="manage" element={<InjectiveTokenManager projectId={currentProject.id} />} />
          <Route path="transactions" element={<InjectiveTransactions projectId={currentProject.id} />} />
        </Routes>
      </div>
    </div>
  )
}

export default InjectiveProjectWrapper

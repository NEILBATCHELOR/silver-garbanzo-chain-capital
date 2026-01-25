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
 * - Horizontal navigation (replacing vertical sidebar)
 * - Wallet selection with persistence
 * - Network derived from selected wallet
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
import type { ProjectWalletData } from '@/services/project/project-wallet-service'

// Balance services
import { solanaBalanceService } from '@/services/wallet/balances/solana/SolanaBalanceService'
import { solanaDevnetBalanceService } from '@/services/wallet/balances/solana/SolanaDevnetBalanceService'

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

// Context
import { SolanaWalletProvider } from '../contexts/SolanaWalletContext'

interface Project {
  id: string
  name: string
  organization_id?: string
}

type NetworkType = 'MAINNET' | 'TESTNET' | 'DEVNET'

export function SolanaProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Wallet state management
  const [selectedWallet, setSelectedWallet] = useState<(ProjectWalletData & { decryptedPrivateKey?: string }) | null>(null)
  const [walletBalance, setWalletBalance] = useState<string>('0.00')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [network, setNetwork] = useState<NetworkType>('DEVNET')

  // Load project on mount or when projectId changes
  useEffect(() => {
    loadProject()
  }, [projectId])

  // Derive network from selected wallet
  useEffect(() => {
    if (selectedWallet) {
      const walletNetwork = deriveNetworkFromWallet(selectedWallet)
      setNetwork(walletNetwork)
    }
  }, [selectedWallet])

  // Refetch balance when network changes (manual override)
  useEffect(() => {
    if (selectedWallet) {
      fetchWalletBalance(selectedWallet.wallet_address, network)
    }
  }, [network])

  /**
   * Derive network type from wallet data
   */
  const deriveNetworkFromWallet = (wallet: ProjectWalletData): NetworkType => {
    const networkLower = wallet.net?.toLowerCase() || ''
    
    if (networkLower.includes('mainnet') || networkLower === 'mainnet-beta') {
      return 'MAINNET'
    } else if (networkLower.includes('testnet')) {
      return 'TESTNET'
    } else if (networkLower.includes('devnet')) {
      return 'DEVNET'
    }
    
    // Default to devnet for safety
    return 'DEVNET'
  }

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
    // Also refresh balance if wallet is selected
    if (selectedWallet) {
      fetchWalletBalance(selectedWallet.wallet_address, network)
    }
  }

  /**
   * Fetch wallet balance using appropriate balance service
   */
  const fetchWalletBalance = async (walletAddress: string, networkType: NetworkType) => {
    try {
      setIsLoadingBalance(true)
      
      // Select appropriate balance service based on network
      let balanceService
      switch (networkType) {
        case 'MAINNET':
          balanceService = solanaBalanceService
          console.log('📡 Using Solana MAINNET balance service')
          break
        case 'TESTNET':
          // Use devnet service for testnet as well
          balanceService = solanaDevnetBalanceService
          console.log('📡 Using Solana TESTNET balance service (devnet)')
          break
        case 'DEVNET':
        default:
          balanceService = solanaDevnetBalanceService
          console.log('📡 Using Solana DEVNET balance service')
          break
      }
      
      // Fetch balance using correct method name
      const balanceData = await balanceService.fetchBalance(walletAddress)
      
      // Format balance to 2 decimal places
      const formattedBalance = parseFloat(balanceData.nativeBalance).toFixed(2)
      setWalletBalance(formattedBalance)
      
      console.log(`✅ Fetched ${networkType} balance: ${formattedBalance} SOL for ${walletAddress.substring(0, 8)}...`)
    } catch (error: any) {
      console.error('Error fetching wallet balance:', error)
      setWalletBalance('0.00')
      toast({
        title: 'Balance Fetch Failed',
        description: error.message || 'Could not fetch wallet balance',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingBalance(false)
    }
  }

  /**
   * Handle wallet selection
   * Updates wallet state and derives network from wallet data
   */
  const handleWalletSelect = (wallet: ProjectWalletData & { decryptedPrivateKey?: string }) => {
    console.log('Wallet selected:', wallet.wallet_address)
    setSelectedWallet(wallet)
    
    // Derive network from wallet
    const walletNetwork = deriveNetworkFromWallet(wallet)
    setNetwork(walletNetwork)
    
    // Fetch balance for selected wallet
    fetchWalletBalance(wallet.wallet_address, walletNetwork)
    
    toast({
      title: 'Wallet Selected',
      description: `Connected to ${wallet.wallet_address.substring(0, 8)}...`
    })
  }

  /**
   * Handle network change (manual override)
   */
  const handleNetworkChange = (newNetwork: NetworkType) => {
    setNetwork(newNetwork)
    console.log('Network changed to:', newNetwork)
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
        title="Solana Token Launchpad"
        subtitle="Deploy and manage SPL and Token-2022 tokens"
        network={network}
        walletAddress={selectedWallet?.wallet_address}
        walletBalance={walletBalance}
        walletId={selectedWallet?.id}
        projectId={currentProject.id}
        projectName={currentProject.name}
        showDeploy={true}
        showManage={true}
        isLoading={isLoading}
        isLoadingBalance={isLoadingBalance}
        onDeploy={() => navigate(`/projects/${currentProject.id}/solana/deploy`)}
        onManage={() => navigate(`/projects/${currentProject.id}/solana/list`)}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        onNetworkChange={handleNetworkChange}
        onWalletSelect={handleWalletSelect}
      />

      {/* Horizontal Navigation */}
      <SolanaNavigation projectId={currentProject.id} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <SolanaWalletProvider selectedWallet={selectedWallet} network={network}>
          <Routes>
            {/* Dashboard */}
            <Route 
              index 
              element={
                <SolanaTokenLaunchpad 
                  projectId={currentProject.id} 
                  selectedWallet={selectedWallet?.wallet_address} 
                  network={network}
                />
              } 
            />
            
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
        </SolanaWalletProvider>
      </main>
    </div>
  )
}

export default SolanaProjectWrapper

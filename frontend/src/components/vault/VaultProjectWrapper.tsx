/**
 * Vault Project Wrapper
 * Integrates Vault functionality with Chain Capital's project/organization hierarchy
 * 
 * Purpose:
 * - Provides project context to all Vault components
 * - Scopes vaults and positions to specific projects
 * - Integrates with existing organization selector
 * - Ensures data isolation between projects
 * 
 * Features:
 * - Automatic project selection from URL params or primary project
 * - Project switcher in header
 * - Project-scoped data queries
 * - Audit trail for all vault operations
 * - Horizontal navigation
 * - Wallet selection with persistence
 * - Network derived from selected wallet chain_id
 * - Blockchain derived from chain_id mapping
 * - Consistent dashboard header
 * - Multi-chain EVM support
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Routes, Route } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { ProjectWalletData } from '@/services/project/project-wallet-service'

// Chain ID utilities
import { CHAIN_ID_TO_NAME, getChainInfo } from '@/infrastructure/web3/utils/chainIds'

// Balance services - import ALL at top level
import {
  ethereumBalanceService,
  sepoliaBalanceService,
  holeskyBalanceService,
  polygonBalanceService,
  amoyBalanceService,
  arbitrumBalanceService,
  arbitrumSepoliaBalanceService,
  baseBalanceService,
  baseSepoliaBalanceService,
  optimismBalanceService,
  optimismSepoliaBalanceService,
  avalancheBalanceService,
  avalancheTestnetBalanceService,
  bscBalanceService,
  zkSyncBalanceService,
  zkSyncSepoliaBalanceService
} from '@/services/wallet/balances/evm'

// Vault components
import { VaultDashboard } from './VaultDashboard'
import { VaultList } from './VaultList'
import { VaultDepositForm } from './VaultDepositForm'
import { VaultWithdrawForm } from './VaultWithdrawForm'

// Shared components
import { VaultNavigation, VaultDashboardHeader } from './shared'

// Context
import { VaultWalletProvider } from './contexts/VaultWalletContext'

interface Project {
  id: string
  name: string
  organization_id?: string
}

type NetworkType = 'MAINNET' | 'TESTNET' | 'DEVNET'

export function VaultProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Wallet state management
  const [selectedWallet, setSelectedWallet] = useState<(ProjectWalletData & { decryptedPrivateKey?: string }) | null>(null)
  const [walletBalance, setWalletBalance] = useState<string>('0.00')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [network, setNetwork] = useState<NetworkType>('TESTNET')

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
      fetchWalletBalance(selectedWallet)
    }
  }, [network])

  /**
   * Derive network type from wallet chain_id using CHAIN_INFO
   * EXACTLY like SolanaProjectWrapper pattern
   */
  const deriveNetworkFromWallet = (wallet: ProjectWalletData): NetworkType => {
    // First try chain_id
    if (wallet.chain_id) {
      const chainId = parseInt(wallet.chain_id, 10)
      if (!isNaN(chainId)) {
        const chainInfo = getChainInfo(chainId)
        if (chainInfo) {
          return chainInfo.type === 'mainnet' ? 'MAINNET' : 'TESTNET'
        }
      }
    }
    
    // Fallback to net field
    const networkLower = wallet.net?.toLowerCase() || ''
    if (networkLower.includes('mainnet')) return 'MAINNET'
    if (networkLower.includes('testnet')) return 'TESTNET'
    if (networkLower.includes('devnet')) return 'DEVNET'
    
    // Default to testnet for safety
    return 'TESTNET'
  }

  /**
   * Get blockchain name from wallet chain_id
   */
  const getBlockchainName = (wallet: ProjectWalletData): string => {
    if (!wallet.chain_id) {
      console.warn('⚠️ No chain_id found in wallet data')
      return 'ethereum'
    }
    
    const chainId = parseInt(wallet.chain_id, 10)
    if (isNaN(chainId)) {
      console.warn(`⚠️ Invalid chain_id: ${wallet.chain_id}`)
      return 'ethereum'
    }
    
    const blockchainName = CHAIN_ID_TO_NAME[chainId]
    if (!blockchainName) {
      console.warn(`⚠️ Unknown chain_id: ${chainId}`)
      return 'ethereum'
    }
    
    return blockchainName
  }

  /**
   * Get balance service based on blockchain name
   * Simplified - no network logic needed, use blockchain name directly
   */
  const getBalanceService = (blockchainName: string) => {
    // Map blockchain name to balance service
    switch (blockchainName) {
      // Ethereum
      case 'ethereum': return ethereumBalanceService
      case 'sepolia': return sepoliaBalanceService
      case 'holesky': return holeskyBalanceService
      case 'hoodi': return holeskyBalanceService // Hoodi uses Holesky service
      
      // Polygon
      case 'polygon': return polygonBalanceService
      case 'polygonAmoy': return amoyBalanceService
      
      // Arbitrum
      case 'arbitrumOne': return arbitrumBalanceService
      case 'arbitrumSepolia': return arbitrumSepoliaBalanceService
      
      // Base
      case 'base': return baseBalanceService
      case 'baseSepolia': return baseSepoliaBalanceService
      
      // Optimism
      case 'optimism': return optimismBalanceService
      case 'optimismSepolia': return optimismSepoliaBalanceService
      
      // Avalanche
      case 'avalanche': return avalancheBalanceService
      case 'avalancheFuji': return avalancheTestnetBalanceService
      
      // BSC
      case 'bnb': return bscBalanceService
      case 'bnbTestnet': return bscBalanceService
      
      // zkSync
      case 'zkSync': return zkSyncBalanceService
      case 'zkSyncSepolia': return zkSyncSepoliaBalanceService
      
      // Default to Ethereum
      default:
        console.warn(`⚠️ Unknown blockchain "${blockchainName}", defaulting to Ethereum`)
        return ethereumBalanceService
    }
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
          navigate(`/projects/${project.id}/vault`, { replace: true })
        } else {
          setError('No projects available')
          toast({
            title: 'No Projects',
            description: 'Please create a project to use Vault features',
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
      navigate(`/projects/${newProjectId}/vault`)
    }
  }

  const handleRefresh = () => {
    loadProject()
    // Also refresh balance if wallet is selected
    if (selectedWallet) {
      fetchWalletBalance(selectedWallet)
    }
  }

  /**
   * Fetch wallet balance using appropriate balance service
   * Uses BalanceFormatter like ProjectWalletList
   */
  const fetchWalletBalance = async (wallet: ProjectWalletData) => {
    try {
      setIsLoadingBalance(true)
      
      const walletAddress = wallet.wallet_address
      
      // Validate EVM address format - skip non-EVM wallets silently
      if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
        console.log(`⏭️ Skipping non-EVM wallet: ${walletAddress.substring(0, 8)}...`)
        setWalletBalance('N/A')
        return
      }
      
      // Get blockchain name from chain_id
      const blockchainName = getBlockchainName(wallet)
      const balanceService = getBalanceService(blockchainName)
      
      console.log(`📡 Fetching ${network} balance for ${blockchainName} wallet: ${walletAddress.substring(0, 8)}...`)
      
      // Fetch balance - returns structured balance object
      const balanceData = await balanceService.fetchBalance(walletAddress)
      
      // Import BalanceFormatter
      const { BalanceFormatter } = await import('@/services/wallet/balances/BalanceFormatter')
      
      // Use blockchainName if balanceData.chainName is undefined
      const networkForSymbol = balanceData.chainName || blockchainName
      
      // Format balance using the same formatter as ProjectWalletList
      const formattedBalance = BalanceFormatter.formatBalance(
        balanceData.nativeBalance,
        getNetworkSymbol(networkForSymbol),
        { showFullPrecision: false, useAbbreviation: false, maxDecimals: 4 }
      )
      
      setWalletBalance(formattedBalance)
      
      console.log(`✅ Fetched ${network} balance: ${formattedBalance} for ${walletAddress.substring(0, 8)}...`)
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
   * Get display symbol for a network
   * Maps network names to their proper ticker symbols
   * Same as ProjectWalletList
   */
  const getNetworkSymbol = (networkName: string | undefined | null): string => {
    // Handle undefined/null gracefully
    if (!networkName) {
      return 'ETH' // Default to ETH
    }
    
    const symbolMap: Record<string, string> = {
      'ethereum': 'ETH',
      'sepolia': 'ETH',
      'holesky': 'ETH',
      'hoodi': 'ETH',
      'polygon': 'MATIC',
      'polygonAmoy': 'MATIC',
      'amoy': 'MATIC',
      'arbitrum': 'ETH',
      'arbitrumOne': 'ETH',
      'arbitrum-sepolia': 'ETH',
      'arbitrumSepolia': 'ETH',
      'base': 'ETH',
      'baseSepolia': 'ETH',
      'base-sepolia': 'ETH',
      'optimism': 'ETH',
      'optimismSepolia': 'ETH',
      'optimism-sepolia': 'ETH',
      'avalanche': 'AVAX',
      'avalancheFuji': 'AVAX',
      'avalanche-testnet': 'AVAX',
      'bsc': 'BNB',
      'bnb': 'BNB',
      'bnbTestnet': 'BNB',
      'bsc-testnet': 'BNB',
      'zkSync': 'ETH',
      'zkSyncSepolia': 'ETH',
      'zksync': 'ETH',
      'zksync-sepolia': 'ETH',
      'injective': 'INJ',
      'injectiveTestnet': 'INJ',
      'injective-testnet': 'INJ',
      'xrplEvm': 'XRP',
      'xrplEvmTestnet': 'XRP',
      'xrpl-evm': 'XRP',
      'xrpl-evm-testnet': 'XRP',
    }
    
    const normalized = networkName.toLowerCase()
    return symbolMap[normalized] || networkName.toUpperCase()
  }

  /**
   * Handle wallet selection
   * Updates wallet state and derives network from wallet data
   * EXACTLY like SolanaProjectWrapper
   */
  const handleWalletSelect = (wallet: ProjectWalletData & { decryptedPrivateKey?: string }) => {
    console.log('Wallet selected:', wallet.wallet_address)
    console.log('Chain ID:', wallet.chain_id)
    console.log('Network:', wallet.net)
    
    setSelectedWallet(wallet)
    
    // Derive network from wallet
    const walletNetwork = deriveNetworkFromWallet(wallet)
    setNetwork(walletNetwork)
    
    // Fetch balance for selected wallet
    fetchWalletBalance(wallet)
    
    toast({
      title: 'Wallet Selected',
      description: `Connected to ${wallet.wallet_address.substring(0, 8)}...`
    })
  }

  /**
   * Handle network change (manual override)
   * EXACTLY like SolanaProjectWrapper
   */
  const handleNetworkChange = (newNetwork: NetworkType) => {
    setNetwork(newNetwork)
    console.log('Network changed to:', newNetwork)
  }

  const handleDeposit = () => {
    navigate(`/projects/${projectId}/vault/deposit`)
  }

  const handleWithdraw = () => {
    navigate(`/projects/${projectId}/vault/withdraw`)
  }

  const handleAnalytics = () => {
    navigate(`/projects/${projectId}/vault/analytics`)
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
              Unable to Load Vaults
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
                Vault features require a project context. Please select a project or create one to continue.
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
      <VaultDashboardHeader
        title="Yield Vaults"
        subtitle="Deploy and manage ERC-4626 vault positions"
        network={network}
        walletAddress={selectedWallet?.wallet_address}
        walletBalance={walletBalance}
        walletId={selectedWallet?.id}
        projectId={currentProject.id}
        projectName={currentProject.name}
        isLoading={isLoading}
        isLoadingBalance={isLoadingBalance}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        onNetworkChange={handleNetworkChange}
        onWalletSelect={handleWalletSelect}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onAnalytics={handleAnalytics}
      />

      {/* Horizontal Navigation */}
      <VaultNavigation projectId={currentProject.id} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <VaultWalletProvider selectedWallet={selectedWallet} network={network}>
          <Routes>
            {/* Dashboard */}
            <Route 
              index 
              element={
                <VaultDashboard 
                  projectId={currentProject.id}
                />
              } 
            />
            
            {/* Vault List */}
            <Route path="list" element={<VaultList projectId={currentProject.id} />} />
            
            {/* Deposit */}
            <Route path="deposit" element={
              <div className="p-6">
                <VaultDepositForm 
                  vault={null}
                  projectId={currentProject.id}
                  onClose={() => navigate(`/projects/${currentProject.id}/vault`)}
                />
              </div>
            } />
            
            {/* Withdraw */}
            <Route path="withdraw" element={
              <div className="p-6">
                <VaultWithdrawForm
                  vault={null}
                  position={null}
                  projectId={currentProject.id}
                  onClose={() => navigate(`/projects/${currentProject.id}/vault`)}
                />
              </div>
            } />
          
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
            
            {/* Reports */}
            <Route path="reports" element={
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reports</CardTitle>
                    <CardDescription>
                      Transaction history and reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Reports dashboard coming soon...</p>
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
                      Vault configuration and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Settings page coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            } />
          </Routes>
        </VaultWalletProvider>
      </main>
    </div>
  )
}

export default VaultProjectWrapper

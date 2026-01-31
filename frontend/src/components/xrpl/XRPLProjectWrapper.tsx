/**
 * XRPL Project Wrapper
 * Integrates XRPL functionality with Chain Capital's project/organization hierarchy
 * 
 * Architecture: Matches Solana pattern exactly
 * - All routing consolidated in this file
 * - Direct component imports (no separate page files)
 * - TabsContent pattern for tabs (preserves form state)
 * - Wallet context at top level
 * - Horizontal navigation
 * - Dashboard header with wallet selector
 * - NO useCallback (matches Solana - prevents re-render cascades)
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
 * - Wallet selection with balance fetching
 * - Network management
 * - Project-scoped data queries
 * - Audit trail for all XRPL operations
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { ProjectWalletData } from '@/services/project/project-wallet-service'
import { Wallet } from 'xrpl'

// Balance services
import { rippleMainnetBalanceService, rippleTestnetBalanceService } from '@/services/wallet/balances/ripple/RippleBalanceService'

// XRPL Shared Components
import { XRPLDashboardHeader } from './shared/xrpl-dashboard-header'
import { XRPLNavigation, XRPLStats } from './shared/xrpl-navigation'

// Wallet Components
import { WalletConnect } from './wallet/wallet-connect'
import { WalletBalance } from './wallet/wallet-balance'

// MPT Components
import { MPTCreator, MPTDashboard } from './mpt'
import { XRPLMPTDatabaseService } from '@/services/wallet/ripple/mpt/XRPLMPTDatabaseService'

// NFT Components
import { NFTMinter } from './nft/nft-minter'
import { NFTGallery } from './nft/nft-gallery'
import { NFTMarketplace } from './nft/nft-marketplace'

// Payment Components
import { XRPPaymentForm } from './payments/xrp-payment-form'
import { PaymentChannelManager } from './payments/payment-channel-manager'
import { EscrowManager } from './payments/escrow-manager'
import { CheckManager } from './payments/check-manager'

// Transaction Components
import { TransactionHistory } from './transactions/transaction-history'
import { TransactionMonitor } from './transactions/transaction-monitor'

// DeFi Components - AMM
import { 
  AMMPoolCreator, 
  AMMPoolList,
  AMMAddLiquidity,
  AMMRemoveLiquidity,
  AMMAuctionSlotManager,
  AMMVoteFee,
  AMMFeeCollection,
  type AMMPoolData 
} from './defi'

// DeFi Components - DEX
import { 
  DEXOrderPlacement,
  DEXOrderBook,
  DEXTradeHistory,
  DEXOrderManagement,
  DEXMarketSwap
} from './defi'

// Multi-Sig Components
import { 
  XRPLMultiSigManager,
  XRPLMultiSigSetupForm,
  XRPLMultiSigTransactionProposal,
  XRPLMultiSigSignerManager
} from './multisig'

// Identity Components
import {
  DIDManager,
  CredentialIssuer,
  CredentialVerifier
} from './identity'

// Compliance Components
import {
  FreezeManager,
  DepositAuthManager
} from './compliance'

// Security Components
import {
  KeyRotationManager,
  AccountConfig,
  SecuritySettings
} from './security'

// Advanced Tools Components
import {
  BatchOperations,
  PathFinder,
  PriceOracle
} from './tools'

// Monitoring Components
import {
  WebSocketMonitor,
  ActivityFeed
} from './monitoring'

// Trust Line Components
import {
  TrustLineManager,
  TrustLineList
} from './trustlines'

import { XRPLWalletProvider } from './contexts/XRPLWalletContext'
import { SelectedXRPLWallet, convertToSelectedXRPLWallet } from './types/xrpl-wallet-types'

interface Project {
  id: string
  name: string
  organization_id?: string
}

type NetworkType = 'MAINNET' | 'TESTNET' | 'DEVNET'

/**
 * Helper component for wallet-required routes
 * CRITICAL: Defined OUTSIDE main component to prevent re-creation on every render
 */
interface WalletRequiredCardProps {
  title: string
  description: string
  children: React.ReactNode
  wallet: Wallet | null
  network: NetworkType
  onWalletConnected: (wallet: Wallet, selectedNetwork: string) => void
}

const WalletRequiredCard: React.FC<WalletRequiredCardProps> = ({ 
  title, 
  description, 
  children,
  wallet,
  network,
  onWalletConnected
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {wallet ? (
          children
        ) : (
          <div className="text-center p-8">
            <p className="text-muted-foreground mb-4">Connect your wallet to access this feature</p>
            <WalletConnect 
              onWalletConnected={onWalletConnected}
              network={network}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function XRPLProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Wallet state management
  const [selectedWallet, setSelectedWallet] = useState<SelectedXRPLWallet | null>(null)
  const [selectedWalletData, setSelectedWalletData] = useState<ProjectWalletData | null>(null) // Full wallet data for components
  const [walletBalance, setWalletBalance] = useState<string>('0.00')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [network, setNetwork] = useState<NetworkType>('TESTNET')

  // Stats state
  const [stats, setStats] = useState({
    mptCount: 0,
    nftCount: 0,
    transactionCount: 0
  })

  // Tab state management - keeps tabs stable across navigation
  const [mptActiveTab, setMptActiveTab] = useState('manager')
  const [nftActiveTab, setNftActiveTab] = useState('gallery')
  const [advancedPaymentsTab, setAdvancedPaymentsTab] = useState('channels')
  const [transactionsTab, setTransactionsTab] = useState('history')
  const [ammTab, setAmmTab] = useState('pools')
  const [dexTab, setDexTab] = useState('orderbook')
  const [multisigTab, setMultisigTab] = useState('manage')
  const [identityTab, setIdentityTab] = useState('dids')
  const [complianceTab, setComplianceTab] = useState('freeze')
  const [securityTab, setSecurityTab] = useState('settings')
  const [toolsTab, setToolsTab] = useState('batch')
  const [monitoringTab, setMonitoringTab] = useState('websocket')
  const [trustlinesTab, setTrustlinesTab] = useState('manage')

  // AMM-specific state
  const [selectedAMMPool, setSelectedAMMPool] = useState<AMMPoolData | null>(null)

  // Load project on mount or when projectId changes
  useEffect(() => {
    loadProject()
  }, [projectId])

  // Derive network from selected wallet
  useEffect(() => {
    if (selectedWallet?.network) {
      const walletNetwork = deriveNetworkFromWallet(selectedWallet.network)
      setNetwork(walletNetwork)
    }
  }, [selectedWallet])

  // Refetch balance when network changes (manual override)
  useEffect(() => {
    if (selectedWallet?.address) {
      fetchWalletBalance(selectedWallet.address, network)
    }
  }, [network])

  /**
   * Derive network type from wallet data
   */
  const deriveNetworkFromWallet = (networkString: string): NetworkType => {
    const networkLower = networkString?.toLowerCase() || ''
    
    if (networkLower.includes('mainnet')) {
      return 'MAINNET'
    } else if (networkLower.includes('testnet')) {
      return 'TESTNET'
    } else if (networkLower.includes('devnet')) {
      return 'DEVNET'
    }
    
    // Default to testnet for XRP
    return 'TESTNET'
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
      navigate(`/projects/${newProjectId}/xrpl`)
    }
  }

  /**
   * Fetch wallet balance using appropriate balance service
   * NOT MEMOIZED - matches Solana pattern to prevent re-render cascades
   */
  const fetchWalletBalance = async (walletAddress: string, networkType: NetworkType) => {
    // Validate address exists
    if (!walletAddress || typeof walletAddress !== 'string') {
      console.error('Invalid wallet address:', walletAddress)
      setWalletBalance('0.00')
      return
    }

    try {
      setIsLoadingBalance(true)
      
      // Select appropriate balance service based on network
      let balanceService
      switch (networkType) {
        case 'MAINNET':
          balanceService = rippleMainnetBalanceService
          console.log('📡 Using XRPL MAINNET balance service')
          break
        case 'TESTNET':
        case 'DEVNET':
        default:
          balanceService = rippleTestnetBalanceService
          console.log('📡 Using XRPL TESTNET balance service')
          break
      }
      
      // Fetch balance
      const balanceData = await balanceService.fetchBalance(walletAddress)
      
      // Format balance to 2 decimal places
      const formattedBalance = parseFloat(balanceData.nativeBalance).toFixed(2)
      setWalletBalance(formattedBalance)
      
      console.log(`✅ Fetched ${networkType} balance: ${formattedBalance} XRP for ${walletAddress.substring(0, 8)}...`)
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

  const handleRefresh = () => {
    loadProject()
    // Also refresh balance and stats if wallet is selected
    if (selectedWallet?.address) {
      fetchWalletBalance(selectedWallet.address, network)
      loadStats()
    }
  }

  /**
   * Load dashboard statistics
   */
  const loadStats = async () => {
    if (!selectedWallet || !currentProject) return
    
    try {
      // Fetch actual MPT issuances from database
      const mptIssuances = await XRPLMPTDatabaseService.getIssuances(currentProject.id)
      
      // TODO: Implement NFT and transaction counting
      setStats({
        mptCount: mptIssuances.length,
        nftCount: 0, // TODO: Implement NFT counting
        transactionCount: 0 // TODO: Implement transaction counting
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      // Set to zero on error
      setStats({
        mptCount: 0,
        nftCount: 0,
        transactionCount: 0
      })
    }
  }

  /**
   * Handle wallet selection
   * Converts ProjectWalletData to internal SelectedXRPLWallet format
   * Updates wallet state and derives network from wallet data
   * Fetches full ProjectWalletData for components that need it
   * NOT MEMOIZED - matches Solana pattern to prevent re-render cascades
   */
  const handleWalletSelect = async (projectWallet: ProjectWalletData & { decryptedPrivateKey?: string }) => {
    // Convert ProjectWalletData to SelectedXRPLWallet
    const wallet = convertToSelectedXRPLWallet(projectWallet)
    
    // Validate conversion succeeded
    if (!wallet) {
      console.error('Failed to convert project wallet to selected wallet:', projectWallet)
      toast({
        title: 'Wallet Selection Failed',
        description: 'Invalid wallet data',
        variant: 'destructive'
      })
      return
    }

    // Additional null safety checks
    if (!wallet.address || !wallet.walletId) {
      console.error('Wallet missing required fields:', wallet)
      toast({
        title: 'Wallet Selection Failed',
        description: 'Wallet is missing required address or ID',
        variant: 'destructive'
      })
      return
    }
    
    console.log('Wallet selected:', wallet.address)
    setSelectedWallet(wallet)
    setSelectedWalletData(projectWallet)
    
    // Derive network from wallet
    const walletNetwork = deriveNetworkFromWallet(wallet.network)
    setNetwork(walletNetwork)
    
    // Fetch balance for selected wallet
    fetchWalletBalance(wallet.address, walletNetwork)
    
    // Load stats
    loadStats()
    
    toast({
      title: 'Wallet Selected',
      description: `Connected to ${wallet.address.substring(0, 8)}...`
    })
  }

  /**
   * Handle network change (manual override)
   * NOT MEMOIZED - matches Solana pattern to prevent re-render cascades
   */
  const handleNetworkChange = (newNetwork: NetworkType) => {
    setNetwork(newNetwork)
    console.log('Network changed to:', newNetwork)
    
    // Refetch balance when network changes manually
    if (selectedWallet?.address) {
      fetchWalletBalance(selectedWallet.address, newNetwork)
    }
    
    toast({
      title: 'Network Changed',
      description: `Switched to ${newNetwork}`
    })
  }

  /**
   * Handle wallet connection from WalletConnect component
   */
  const handleWalletConnected = (connectedWallet: Wallet, selectedNetwork: string) => {
    // Convert to SelectedXRPLWallet format
    const walletData: SelectedXRPLWallet = {
      walletId: 'temp-connected-wallet',
      address: connectedWallet.address,
      privateKey: connectedWallet.privateKey, // Use hex private key, not seed
      publicKey: connectedWallet.publicKey,
      network: selectedNetwork.toLowerCase(),
      isNativeXRPL: true
    }
    
    // For temporary connected wallets, create minimal ProjectWalletData
    const tempProjectWalletData: ProjectWalletData = {
      id: 'temp-connected-wallet',
      project_id: currentProject!.id,
      wallet_address: connectedWallet.address,
      public_key: connectedWallet.publicKey,
      net: selectedNetwork.toLowerCase(),
      non_evm_network: 'xrpl',
      wallet_type: 'ripple'
    }
    
    setSelectedWallet(walletData)
    setSelectedWalletData(tempProjectWalletData)
    
    // Derive network and fetch balance
    const walletNetwork = deriveNetworkFromWallet(selectedNetwork.toLowerCase())
    setNetwork(walletNetwork)
    fetchWalletBalance(connectedWallet.address, walletNetwork)
    loadStats()
    
    toast({
      title: 'Wallet Connected',
      description: `Connected to ${connectedWallet.address.substring(0, 8)}...`
    })
  }

  /**
   * Convert SelectedXRPLWallet to XRPL Wallet format
   * SOLANA PATTERN: Simple, no over-validation
   * 
   * CRITICAL: Uses new Wallet(publicKey, privateKey) NOT Wallet.fromSeed()
   * Database stores hex privateKey, not base58 seed
   */
  const xrplWallet: Wallet | null = useMemo(() => {
    if (!selectedWallet?.privateKey) {
      return null
    }
    
    try {
      // Create XRPL SDK Wallet instance - it will derive publicKey from privateKey if needed
      const wallet = selectedWallet.publicKey 
        ? new Wallet(selectedWallet.publicKey, selectedWallet.privateKey)
        : new Wallet(undefined as any, selectedWallet.privateKey) // Let XRPL derive publicKey
      
      console.log(`[XRPLProjectWrapper] Created XRPL wallet: ${wallet.address}`)
      return wallet
    } catch (error) {
      console.error('[XRPLProjectWrapper] Failed to create XRPL wallet:', error)
      return null
    }
  }, [selectedWallet?.privateKey, selectedWallet?.publicKey])

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
    <div className="w-full h-full flex flex-col">
      {/* Dashboard Header */}
      <XRPLDashboardHeader
        network={network}
        walletAddress={selectedWallet?.address}
        walletBalance={walletBalance}
        walletId={selectedWallet?.walletId}
        projectId={currentProject.id}
        projectName={currentProject.name}
        onRefresh={handleRefresh}
        onNetworkChange={handleNetworkChange}
        onProjectChange={handleProjectChange}
        onWalletSelect={handleWalletSelect}
        isLoading={isLoading}
        isLoadingBalance={isLoadingBalance}
        showMPT={true}
        showNFT={true}
        showPayments={true}
        onMPT={() => navigate(`/projects/${currentProject.id}/xrpl/mpt`)}
        onNFT={() => navigate(`/projects/${currentProject.id}/xrpl/nfts`)}
        onPayments={() => navigate(`/projects/${currentProject.id}/xrpl/payments`)}
      />

      {/* Horizontal Navigation */}
      <XRPLNavigation projectId={currentProject.id} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {/* Stats Section */}
          {selectedWallet && (
            <div className="mb-6">
              <XRPLStats
                walletBalance={walletBalance}
                mptCount={stats.mptCount}
                nftCount={stats.nftCount}
                transactionCount={stats.transactionCount}
              />
            </div>
          )}

          {/* Provide wallet context to all children */}
          <XRPLWalletProvider selectedWallet={selectedWalletData} network={network}>
            <Routes>
              {/* Redirect root to Wallet */}
              <Route 
                index 
                element={<Navigate to="wallet" replace />} 
              />

              {/* Wallet Management */}
              <Route 
                path="wallet" 
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>Wallet Management</CardTitle>
                      <CardDescription>Connect, import, or generate your XRPL wallet</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {xrplWallet ? (
                        <WalletBalance wallet={selectedWalletData!} network={network} />
                      ) : (
                        <WalletConnect 
                          onWalletConnected={handleWalletConnected}
                          network={network}
                        />
                      )}
                    </CardContent>
                  </Card>
                } 
              />

              {/* MPT Tokens - FIXED: TabsContent pattern preserves form state */}
              <Route 
                path="mpt" 
                element={
                  <WalletRequiredCard
                    title="Multi-Purpose Tokens (MPT)"
                    description="Create, manage, and transfer MPT tokens"
                    wallet={xrplWallet}
                    network={network}
                    onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={mptActiveTab} onValueChange={setMptActiveTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manager">Manager</TabsTrigger>
                        <TabsTrigger value="create">Create New</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="manager" className="mt-4">
                        <MPTDashboard 
                          wallet={xrplWallet!} 
                          network={network} 
                          projectId={currentProject.id}
                          onCreateNew={() => setMptActiveTab('create')}
                        />
                      </TabsContent>
                      <TabsContent value="create" className="mt-4">
                        <MPTCreator 
                          wallet={xrplWallet!} 
                          network={network} 
                          projectId={currentProject.id}
                          onSuccess={() => {
                            setMptActiveTab('manager')
                            loadStats() // Refresh stats counter
                          }}
                        />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* NFTs - FIXED: TabsContent pattern preserves form state */}
              <Route 
                path="nfts" 
                element={
                  <WalletRequiredCard
                    title="NFT Management"
                    description="Mint, trade, and manage your NFTs"
                    wallet={xrplWallet}
                    network={network}
                    onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={nftActiveTab} onValueChange={setNftActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="gallery">My NFTs</TabsTrigger>
                        <TabsTrigger value="mint">Mint</TabsTrigger>
                        <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="gallery" className="mt-4">
                        <NFTGallery wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="mint" className="mt-4">
                        <NFTMinter wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="marketplace" className="mt-4">
                        <NFTMarketplace wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Payments */}
              <Route 
                path="payments" 
                element={
                  <WalletRequiredCard
                    title="Payments"
                    description="Send XRP and tokens" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <XRPPaymentForm wallet={xrplWallet!} network={network} />
                  </WalletRequiredCard>
                } 
              />

              {/* Advanced Payment Features - FIXED: TabsContent pattern */}
              <Route 
                path="advanced" 
                element={
                  <WalletRequiredCard
                    title="Advanced Payment Features"
                    description="Payment channels, escrow, and checks" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={advancedPaymentsTab} onValueChange={setAdvancedPaymentsTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="channels">Payment Channels</TabsTrigger>
                        <TabsTrigger value="escrow">Escrow</TabsTrigger>
                        <TabsTrigger value="checks">Checks</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="channels" className="mt-4">
                        <PaymentChannelManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="escrow" className="mt-4">
                        <EscrowManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="checks" className="mt-4">
                        <CheckManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Transactions - FIXED: TabsContent pattern */}
              <Route 
                path="transactions" 
                element={
                  <WalletRequiredCard
                    title="Transaction History"
                    description="View and monitor your transactions" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={transactionsTab} onValueChange={setTransactionsTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="monitor">Monitor</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="history" className="mt-4">
                        <TransactionHistory wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="monitor" className="mt-4">
                        <TransactionMonitor wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* AMM Pools - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="amm" 
                element={
                  <WalletRequiredCard
                    title="Automated Market Maker (AMM)"
                    description="Create liquidity pools and earn trading fees" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={ammTab} onValueChange={setAmmTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pools">Pools</TabsTrigger>
                        <TabsTrigger value="create">Create</TabsTrigger>
                        <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="pools" className="mt-4">
                        <AMMPoolList 
                          wallet={xrplWallet!}
                          network={network}
                          projectId={currentProject.id}
                          onSelectPool={(pool) => {
                            setSelectedAMMPool(pool)
                            setAmmTab('liquidity')
                          }}
                        />
                      </TabsContent>
                      
                      <TabsContent value="create" className="mt-4">
                        <AMMPoolCreator 
                          wallet={xrplWallet!}
                          network={network}
                          projectId={currentProject.id}
                          onSuccess={() => {
                            toast({
                              title: 'Pool Created',
                              description: 'AMM pool created successfully'
                            })
                            setAmmTab('pools')
                          }}
                        />
                      </TabsContent>
                      
                      <TabsContent value="liquidity" className="mt-4">
                        {selectedAMMPool ? (
                          <Tabs defaultValue="add">
                            <TabsList>
                              <TabsTrigger value="add">Add Liquidity</TabsTrigger>
                              <TabsTrigger value="remove">Remove Liquidity</TabsTrigger>
                            </TabsList>
                            <TabsContent value="add">
                              <AMMAddLiquidity 
                                pool={selectedAMMPool} 
                                wallet={xrplWallet!} 
                                network={network}
                                projectId={currentProject.id}
                              />
                            </TabsContent>
                            <TabsContent value="remove">
                              <AMMRemoveLiquidity 
                                pool={selectedAMMPool} 
                                wallet={xrplWallet!} 
                                network={network}
                                projectId={currentProject.id}
                              />
                            </TabsContent>
                          </Tabs>
                        ) : (
                          <div className="text-center p-8">
                            <p className="text-muted-foreground">Select a pool from the Pools tab</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* DEX Trading - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="dex" 
                element={
                  <WalletRequiredCard
                    title="DEX Trading"
                    description="Trade on the XRPL decentralized exchange" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={dexTab} onValueChange={setDexTab}>
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="orderbook">Order Book</TabsTrigger>
                        <TabsTrigger value="place-order">Place Order</TabsTrigger>
                        <TabsTrigger value="swap">Market Swap</TabsTrigger>
                        <TabsTrigger value="my-orders">My Orders</TabsTrigger>
                        <TabsTrigger value="history">Trade History</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="orderbook" className="mt-4">
                        <DEXOrderBook 
                          wallet={xrplWallet!}
                          network={network} 
                          projectId={currentProject.id}
                        />
                      </TabsContent>
                      <TabsContent value="place-order" className="mt-4">
                        <DEXOrderPlacement 
                          wallet={xrplWallet!} 
                          network={network}
                          projectId={currentProject.id}
                        />
                      </TabsContent>
                      <TabsContent value="swap" className="mt-4">
                        <DEXMarketSwap 
                          wallet={xrplWallet!} 
                          network={network}
                          projectId={currentProject.id}
                        />
                      </TabsContent>
                      <TabsContent value="my-orders" className="mt-4">
                        <DEXOrderManagement 
                          wallet={xrplWallet!} 
                          network={network}
                          projectId={currentProject.id}
                        />
                      </TabsContent>
                      <TabsContent value="history" className="mt-4">
                        <DEXTradeHistory 
                          wallet={xrplWallet!} 
                          network={network}
                          projectId={currentProject.id}
                        />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Multi-Signature - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="multisig" 
                element={
                  <WalletRequiredCard
                    title="Multi-Signature Accounts"
                    description="Configure and manage multi-signature accounts" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={multisigTab} onValueChange={setMultisigTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="manage">Manage</TabsTrigger>
                        <TabsTrigger value="setup">Setup</TabsTrigger>
                        <TabsTrigger value="propose">Propose Transaction</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="manage" className="mt-4">
                        <XRPLMultiSigManager 
                          projectId={currentProject.id} 
                          walletAddress={selectedWallet?.address}
                        />
                      </TabsContent>
                      <TabsContent value="setup" className="mt-4">
                        <XRPLMultiSigSetupForm 
                          projectId={currentProject.id} 
                          walletAddress={selectedWallet?.address || ''}
                        />
                      </TabsContent>
                      <TabsContent value="propose" className="mt-4">
                        <XRPLMultiSigTransactionProposal 
                          projectId={currentProject.id} 
                          walletAddress={selectedWallet?.address || ''}
                        />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Identity Management - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="identity" 
                element={
                  <WalletRequiredCard
                    title="Identity Management"
                    description="Manage DIDs and verifiable credentials" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={identityTab} onValueChange={setIdentityTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="dids">DIDs</TabsTrigger>
                        <TabsTrigger value="issue">Issue Credentials</TabsTrigger>
                        <TabsTrigger value="verify">Verify</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="dids" className="mt-4">
                        <DIDManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="issue" className="mt-4">
                        <CredentialIssuer wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="verify" className="mt-4">
                        <CredentialVerifier wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Compliance - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="compliance" 
                element={
                  <WalletRequiredCard
                    title="Compliance Controls"
                    description="Asset freeze and deposit authorization" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={complianceTab} onValueChange={setComplianceTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="freeze">Asset Freeze</TabsTrigger>
                        <TabsTrigger value="deposit">Deposit Auth</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="freeze" className="mt-4">
                        <FreezeManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="deposit" className="mt-4">
                        <DepositAuthManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Security Settings - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="security" 
                element={
                  <WalletRequiredCard
                    title="Security Settings"
                    description="Key rotation and account security" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={securityTab} onValueChange={setSecurityTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="rotation">Key Rotation</TabsTrigger>
                        <TabsTrigger value="config">Account Config</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="settings" className="mt-4">
                        <SecuritySettings wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="rotation" className="mt-4">
                        <KeyRotationManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="config" className="mt-4">
                        <AccountConfig wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Advanced Tools - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="tools" 
                element={
                  <WalletRequiredCard
                    title="Advanced Tools"
                    description="Batch operations, path finding, and price oracles" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={toolsTab} onValueChange={setToolsTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="batch">Batch Operations</TabsTrigger>
                        <TabsTrigger value="paths">Path Finding</TabsTrigger>
                        <TabsTrigger value="oracles">Price Oracles</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="batch" className="mt-4">
                        <BatchOperations wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="paths" className="mt-4">
                        <PathFinder wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="oracles" className="mt-4">
                        <PriceOracle wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />

              {/* Monitoring - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="monitoring" 
                element={
                  <WalletRequiredCard
                    title="Real-Time Monitoring"
                    description="WebSocket monitoring and activity feeds" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    {xrplWallet && (
                      <Tabs value={monitoringTab} onValueChange={setMonitoringTab}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="websocket">WebSocket Monitor</TabsTrigger>
                          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="websocket" className="mt-4">
                          <WebSocketMonitor walletAddress={xrplWallet.address} network={network} />
                        </TabsContent>
                        <TabsContent value="activity" className="mt-4">
                          <ActivityFeed walletAddress={xrplWallet.address} network={network} />
                        </TabsContent>
                      </Tabs>
                    )}
                  </WalletRequiredCard>
                } 
              />

              {/* Trust Lines - CONSOLIDATED FROM PAGE FILE */}
              <Route 
                path="trustlines" 
                element={
                  <WalletRequiredCard
                    title="Trust Lines"
                    description="Manage token trust line relationships" wallet={xrplWallet} network={network} onWalletConnected={handleWalletConnected}
                  >
                    <Tabs value={trustlinesTab} onValueChange={setTrustlinesTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manage">Manage Trust Lines</TabsTrigger>
                        <TabsTrigger value="list">Trust Line List</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="manage" className="mt-4">
                        <TrustLineManager wallet={xrplWallet!} network={network} />
                      </TabsContent>
                      <TabsContent value="list" className="mt-4">
                        <TrustLineList wallet={xrplWallet!} network={network} />
                      </TabsContent>
                    </Tabs>
                  </WalletRequiredCard>
                } 
              />
            </Routes>
          </XRPLWalletProvider>
        </div>
      </main>
    </div>
  )
}

export default XRPLProjectWrapper

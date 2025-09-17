/**
 * Enhanced Production Wallet Dashboard
 * 
 * Main wallet interface combining Bitcoin, Lightning Network, EVM, and Account Abstraction features
 * Provides comprehensive multi-chain portfolio management and advanced wallet capabilities
 * Now includes full Lightning Network integration and hardware wallet security
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Wallet, 
  Bitcoin, 
  Zap, 
  Shield, 
  Users, 
  TrendingUp,
  Send,
  ArrowDown,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Coins,
  CreditCard,
  Layers,
  TestTube2,
  Usb
} from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'

// Import wallet services
import { 
  multiChainBalanceService, 
  transactionHistoryService, 
  priceFeedService,
  enhancedTokenDetectionService,
  type MultiChainBalance,
  type ChainBalanceData,
  type EnhancedToken
} from '@/services/wallet'
import type { Transaction } from '@/services/wallet/TransactionHistoryService'
import { TokenStandard } from '@/types/domain/wallet/enhancedTokenTypes'

// Import wallet components
import { ComprehensiveWalletSelector } from './ComprehensiveWalletSelector'
import EnhancedTokenDisplay from './EnhancedTokenDisplay'
import { 
  BitcoinTransactionBuilder, 
  UTXOManager,
  LightningInvoiceGenerator,
  LightningPaymentInterface,
  PaymentChannelManager,
  BitcoinHardwareWalletIntegration,
  BitcoinTestingDashboard
} from './bitcoin'
import { 
  UserOperationBuilder, 
  GaslessTransactionInterface, 
  SocialRecoveryInterface,
  BundlerManagementInterface,
  AdvancedPaymasterConfiguration,
  SessionKeyManager
} from './account-abstraction'

// Import additional types we need
import type { EnhancedTokenBalance } from '@/services/wallet/EnhancedTokenDetectionService'

// Helper functions for type conversion
const getTokenStandard = (standard: string): TokenStandard => {
  switch (standard) {
    case 'ERC-721': return TokenStandard.ERC721
    case 'ERC-1155': return TokenStandard.ERC1155
    case 'ERC-3525': return TokenStandard.ERC3525
    case 'ERC-4626': return TokenStandard.ERC4626
    default: return TokenStandard.ERC20
  }
}

const extractAdditionalProperties = (tokenBalance: EnhancedTokenBalance): Partial<EnhancedToken> => {
  const standard = getTokenStandard(tokenBalance.standard)
  
  switch (standard) {
    case TokenStandard.ERC721:
      const erc721 = tokenBalance as any
      return {
        ownedTokens: erc721.ownedTokens || []
      }
    case TokenStandard.ERC1155:
      const erc1155 = tokenBalance as any
      return {
        tokenTypes: erc1155.tokenTypes || [],
        totalValueUsd: erc1155.totalValueUsd
      }
    case TokenStandard.ERC3525:
      const erc3525 = tokenBalance as any
      return {
        ownedTokens: erc3525.ownedTokens || [],
        valueDecimals: erc3525.valueDecimals
      }
    case TokenStandard.ERC4626:
      const erc4626 = tokenBalance as any
      return {
        underlyingSymbol: erc4626.underlyingSymbol,
        underlyingValue: erc4626.underlyingValue,
        sharePrice: erc4626.sharePrice
      }
    default:
      return {}
  }
}

// Multi-chain configuration - now sourced from MultiChainBalanceService
const SUPPORTED_CHAINS = multiChainBalanceService.getSupportedChains().map(chain => ({
  id: chain.chainId,
  name: chain.name,
  symbol: chain.symbol,
  icon: chain.icon,
  color: chain.color
}));

interface PortfolioBalance {
  chainId: number;
  chainName: string;
  symbol: string;
  balance: string;
  usdValue: number;
  icon: string;
  color: string;
}

// Use transaction type directly from TransactionHistoryService
type WalletTransaction = Transaction

interface WalletFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'setup' | 'unavailable';
  component?: React.ComponentType;
}

export function ProductionWalletDashboard() {
  // Wallet connection
  const { address: walletAddress, isConnected, chain } = useAccount()
  const { data: ethBalance, isLoading: balanceLoading } = useBalance({ address: walletAddress })

  // State management
  const [currentTab, setCurrentTab] = useState('overview')
  const [portfolioBalances, setPortfolioBalances] = useState<PortfolioBalance[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0)
  const [hideBalances, setHideBalances] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [enhancedTokens, setEnhancedTokens] = useState<EnhancedToken[]>([])
  const [isLoadingEnhancedTokens, setIsLoadingEnhancedTokens] = useState(false)

  // Enhanced feature status including Lightning Network and Hardware Security
  const [features] = useState<WalletFeature[]>([
    {
      id: 'multi-chain',
      name: 'Multi-Chain Support',
      description: '9+ blockchain networks',
      icon: <Layers className="w-5 h-5" />,
      status: 'active'
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin Integration',
      description: 'UTXO management & transaction building',
      icon: <Bitcoin className="w-5 h-5" />,
      status: 'active'
    },
    {
      id: 'lightning',
      name: 'Lightning Network',
      description: 'Instant Bitcoin payments',
      icon: <Zap className="w-5 h-5 text-orange-500" />,
      status: 'active'
    },
    {
      id: 'account-abstraction',
      name: 'Account Abstraction',
      description: 'Gasless transactions via EIP-4337',
      icon: <Zap className="w-5 h-5" />,
      status: 'active'
    },
    {
      id: 'social-recovery',
      name: 'Social Recovery',
      description: 'Guardian-based account recovery',
      icon: <Shield className="w-5 h-5" />,
      status: 'setup'
    },
    {
      id: 'hardware-security',
      name: 'Hardware Security',
      description: 'Hardware wallet integration',
      icon: <Usb className="w-5 h-5 text-green-600" />,
      status: 'active'
    },
    {
      id: 'testing-suite',
      name: 'Testing & Validation',
      description: 'Comprehensive wallet testing',
      icon: <TestTube2 className="w-5 h-5 text-blue-600" />,
      status: 'active'
    }
  ])

  // Load portfolio balances across chains using real service
  const loadPortfolioBalances = useCallback(async () => {
    if (!walletAddress) return

    try {
      setIsRefreshing(true)

      console.log('Fetching real multi-chain balances...')
      
      // Use the real MultiChainBalanceService to fetch all balances
      const multiChainBalance: MultiChainBalance = await multiChainBalanceService.fetchMultiChainBalance(walletAddress)
      
      // Convert to portfolio balance format for UI
      const balances: PortfolioBalance[] = multiChainBalance.chains
        .filter(chain => chain.isOnline && (parseFloat(chain.nativeBalance) > 0 || chain.tokens.length > 0))
        .map(chain => ({
          chainId: chain.chainId,
          chainName: chain.chainName,
          symbol: chain.symbol,
          balance: chain.nativeBalance,
          usdValue: chain.totalUsdValue,
          icon: chain.icon,
          color: chain.color
        }))

      setPortfolioBalances(balances)
      setTotalPortfolioValue(multiChainBalance.totalUsdValue)

      console.log(`Loaded balances for ${balances.length} chains, total value: $${multiChainBalance.totalUsdValue.toFixed(2)}`)

    } catch (error) {
      console.error('Failed to load real portfolio balances:', error)
      
      // Fallback: try to load current chain balance only
      if (ethBalance && chain) {
        const chainConfig = SUPPORTED_CHAINS.find(c => c.id === chain.id)
        if (chainConfig) {
          try {
            const ethPrice = await priceFeedService.getTokenPrice('ETH')
            const balance = parseFloat(formatEther(ethBalance.value))
            const usdValue = balance * (ethPrice?.priceUsd || 0)
            
            setPortfolioBalances([{
              chainId: chain.id,
              chainName: chainConfig.name,
              symbol: chainConfig.symbol,
              balance: formatEther(ethBalance.value),
              usdValue,
              icon: chainConfig.icon,
              color: chainConfig.color
            }])
            setTotalPortfolioValue(usdValue)
          } catch (priceError) {
            console.error('Failed to get ETH price:', priceError)
            setPortfolioBalances([])
            setTotalPortfolioValue(0)
          }
        }
      } else {
        setPortfolioBalances([])
        setTotalPortfolioValue(0)
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [walletAddress, ethBalance, chain])

  // Load transaction history using real service
  const loadTransactions = useCallback(async () => {
    if (!walletAddress) return

    try {
      console.log('Fetching real transaction history...')
      
      // Use the real TransactionHistoryService to fetch transactions
      const transactions = await transactionHistoryService.fetchTransactionHistory(walletAddress, {
        limit: 50, // Load recent 50 transactions
        chainIds: portfolioBalances.length > 0 ? portfolioBalances.map(b => b.chainId) : undefined
      })

      console.log(`Loaded ${transactions.length} real transactions`)
      setTransactions(transactions)
      
    } catch (error) {
      console.error('Failed to load real transactions:', error)
      setTransactions([])
    }
  }, [walletAddress, portfolioBalances])

  // Load enhanced tokens (NFTs, SFTs, Vaults) using enhanced token detection service
  const loadEnhancedTokens = useCallback(async () => {
    if (!walletAddress) return

    try {
      setIsLoadingEnhancedTokens(true)
      console.log('Fetching enhanced token balances...')
      
      // Get all enhanced tokens across supported chains
      const allEnhancedTokens: EnhancedToken[] = []
      
      // Check each chain for enhanced tokens
      const supportedChains = [
        { chainId: 1, name: 'Ethereum' },
        { chainId: 137, name: 'Polygon' },
        { chainId: 42161, name: 'Arbitrum' },
        { chainId: 10, name: 'Optimism' },
        { chainId: 8453, name: 'Base' }
      ]
      
      for (const chain of supportedChains) {
        try {
          const chainTokens = await enhancedTokenDetectionService.detectTokenBalances(
            walletAddress,
            chain.chainId,
            chain.name
          )
          
          // Convert EnhancedTokenBalance[] to EnhancedToken[]
          const convertedTokens: EnhancedToken[] = chainTokens.tokens.map((tokenBalance) => ({
            standard: getTokenStandard(tokenBalance.standard),
            token: {
              address: tokenBalance.contractAddress,
              symbol: tokenBalance.symbol,
              name: tokenBalance.name,
              decimals: tokenBalance.decimals || 18,
              chainId: chain.chainId,
            },
            balance: '0', // Will be updated based on token type
            contractAddress: tokenBalance.contractAddress,
            valueUsd: tokenBalance.valueUsd,
            lastUpdated: tokenBalance.lastUpdated,
            source: 'api' as const,
            name: tokenBalance.name,
            symbol: tokenBalance.symbol,
            // Copy additional properties from the balance
            ...extractAdditionalProperties(tokenBalance)
          }))
          
          allEnhancedTokens.push(...convertedTokens)
        } catch (chainError) {
          console.warn(`Failed to load enhanced tokens for ${chain.name}:`, chainError)
        }
      }

      console.log(`Loaded ${allEnhancedTokens.length} enhanced tokens`)
      setEnhancedTokens(allEnhancedTokens)
      
    } catch (error) {
      console.error('Failed to load enhanced tokens:', error)
      setEnhancedTokens([])
    } finally {
      setIsLoadingEnhancedTokens(false)
    }
  }, [walletAddress])

  // Helper functions
  const formatBalance = (balance: string): string => {
    return hideBalances ? '••••••••' : balance
  }

  const formatUSD = (value: number): string => {
    return hideBalances ? '••••••' : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getFeatureStatusBadge = (status: WalletFeature['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>
      case 'setup':
        return <Badge variant="outline">Setup Required</Badge>
      case 'unavailable':
        return <Badge variant="secondary">Unavailable</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getTransactionIcon = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'send':
        return <Send className="w-4 h-4 text-red-500" />
      case 'receive':
        return <ArrowDown className="w-4 h-4 text-green-500" />
      case 'gasless':
        return <Zap className="w-4 h-4 text-blue-500" />
      case 'lightning':
        return <Zap className="w-4 h-4 text-orange-500" />
      case 'contract':
        return <CreditCard className="w-4 h-4 text-purple-500" />
      case 'swap':
        return <RefreshCw className="w-4 h-4 text-green-500" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: WalletTransaction['status']) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600 text-xs">Confirmed</Badge>
      case 'pending':
        return <Badge variant="outline" className="text-xs">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>
    }
  }

  // Effects
  useEffect(() => {
    if (isConnected) {
      loadPortfolioBalances()
    }
  }, [isConnected, loadPortfolioBalances])

  // Load transactions after portfolio balances are loaded
  useEffect(() => {
    if (isConnected && portfolioBalances.length > 0) {
      loadTransactions()
    }
  }, [isConnected, portfolioBalances, loadTransactions])

  // Load enhanced tokens when wallet is connected
  useEffect(() => {
    if (isConnected && walletAddress) {
      loadEnhancedTokens()
    }
  }, [isConnected, walletAddress, loadEnhancedTokens])

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Wallet className="w-6 h-6" />
              Production Wallet Dashboard
            </CardTitle>
            <CardDescription>
              Connect your wallet to access advanced features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ComprehensiveWalletSelector />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                Production Wallet Dashboard
              </CardTitle>
              <CardDescription>
                Advanced multi-chain wallet with Bitcoin, Lightning Network, and Account Abstraction
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHideBalances(!hideBalances)}
              >
                {hideBalances ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadPortfolioBalances}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Portfolio Overview</span>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatUSD(totalPortfolioValue)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Balance
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {portfolioBalances.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {portfolioBalances.map((balance) => (
                <Card key={balance.chainId} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{balance.icon}</div>
                      <div>
                        <div className="font-medium">{balance.chainName}</div>
                        <div className="text-sm text-muted-foreground">{balance.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatBalance(parseFloat(balance.balance).toFixed(4))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatUSD(balance.usdValue)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No balances found</p>
              <p className="text-sm">Get started by receiving some crypto</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Main Features Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bitcoin">Bitcoin</TabsTrigger>
          <TabsTrigger value="lightning">Lightning</TabsTrigger>
          <TabsTrigger value="account-abstraction">Gasless</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Enhanced Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-5">
                <Button className="flex flex-col items-center gap-2 h-auto py-4">
                  <Send className="w-5 h-5" />
                  <span>Send</span>
                </Button>
                
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <ArrowDown className="w-5 h-5" />
                  <span>Receive</span>
                </Button>
                
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4" 
                        onClick={() => setCurrentTab('lightning')}>
                  <Zap className="w-5 h-5 text-orange-500" />
                  <span>Lightning</span>
                </Button>
                
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4" 
                        onClick={() => setCurrentTab('account-abstraction')}>
                  <Zap className="w-5 h-5 text-blue-500" />
                  <span>Gasless</span>
                </Button>
                
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => setCurrentTab('bitcoin')}>
                  <Bitcoin className="w-5 h-5" />
                  <span>Bitcoin</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Wallet Features Status */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Features</CardTitle>
              <CardDescription>
                Status of advanced wallet capabilities including Lightning Network and Hardware Security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {feature.icon}
                      <div>
                        <div className="font-medium">{feature.name}</div>
                        <div className="text-sm text-muted-foreground">{feature.description}</div>
                      </div>
                    </div>
                    {getFeatureStatusBadge(feature.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Recent Transactions Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Transactions</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentTab('settings')}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 4).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <div className="font-medium capitalize flex items-center gap-2">
                            {tx.type} {tx.type === 'contract' && tx.contractInteraction?.contractName && `- ${tx.contractInteraction.contractName}`}
                            {tx.isGasless && <Badge variant="outline" className="text-xs">Gasless</Badge>}
                            {tx.isLightning && <Badge className="bg-orange-600 text-xs">Lightning</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tx.type === 'send' || tx.type === 'lightning' ? 
                              `To: ${tx.toAddress.slice(0, 8)}...${tx.toAddress.slice(-6)}` : 
                              `From: ${tx.fromAddress.slice(0, 8)}...${tx.fromAddress.slice(-6)}`
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tx.chainName} • {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {tx.type === 'send' || tx.type === 'lightning' ? '-' : '+'}
                          {hideBalances ? '••••' : `${parseFloat(tx.amount).toFixed(4)} ${tx.symbol}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {hideBalances ? '••••' : formatUSD(tx.usdValue)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Your transaction history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Token Display */}
          <EnhancedTokenDisplay 
            enhancedTokens={enhancedTokens}
            isLoading={isLoadingEnhancedTokens}
          />
        </TabsContent>

        {/* Enhanced Bitcoin Tab */}
        <TabsContent value="bitcoin" className="space-y-4">
          <Tabs defaultValue="transaction-builder">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transaction-builder">Transaction Builder</TabsTrigger>
              <TabsTrigger value="utxo-manager">UTXO Manager</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transaction-builder">
              <BitcoinTransactionBuilder />
            </TabsContent>
            
            <TabsContent value="utxo-manager">
              <UTXOManager />
            </TabsContent>

            <TabsContent value="testing">
              <BitcoinTestingDashboard />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* New Lightning Network Tab */}
        <TabsContent value="lightning" className="space-y-4">
          <Tabs defaultValue="invoices">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="invoices">Create Invoice</TabsTrigger>
              <TabsTrigger value="payments">Send Payment</TabsTrigger>
              <TabsTrigger value="channels">Manage Channels</TabsTrigger>
            </TabsList>
            
            <TabsContent value="invoices">
              <LightningInvoiceGenerator />
            </TabsContent>
            
            <TabsContent value="payments">
              <LightningPaymentInterface />
            </TabsContent>

            <TabsContent value="channels">
              <PaymentChannelManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Account Abstraction Tab */}
        <TabsContent value="account-abstraction" className="space-y-4">
          <Tabs defaultValue="gasless">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="gasless">Gasless Txns</TabsTrigger>
              <TabsTrigger value="user-operations">Batch Ops</TabsTrigger>
              <TabsTrigger value="recovery">Recovery</TabsTrigger>
              <TabsTrigger value="bundlers">Bundlers</TabsTrigger>
              <TabsTrigger value="paymasters">Paymasters</TabsTrigger>
              <TabsTrigger value="session-keys">Session Keys</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gasless">
              <GaslessTransactionInterface />
            </TabsContent>
            
            <TabsContent value="user-operations">
              <UserOperationBuilder />
            </TabsContent>

            <TabsContent value="recovery">
              <SocialRecoveryInterface />
            </TabsContent>

            <TabsContent value="bundlers">
              <BundlerManagementInterface />
            </TabsContent>

            <TabsContent value="paymasters">
              <AdvancedPaymasterConfiguration />
            </TabsContent>

            <TabsContent value="session-keys">
              <SessionKeyManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* New Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <BitcoinHardwareWalletIntegration />
        </TabsContent>

        {/* New Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <BitcoinTestingDashboard />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Settings</CardTitle>
              <CardDescription>
                Configure your wallet preferences and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Privacy Settings */}
                <div>
                  <h4 className="font-medium mb-3">Privacy Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Hide Balances</div>
                        <div className="text-sm text-muted-foreground">Hide balance amounts in the interface</div>
                      </div>
                      <Button
                        variant={hideBalances ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setHideBalances(!hideBalances)}
                      >
                        {hideBalances ? 'Hidden' : 'Visible'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Transaction History */}
                <div>
                  <h4 className="font-medium mb-3">Transaction History</h4>
                  {transactions.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            {getTransactionIcon(tx.type)}
                            <div>
                              <div className="font-medium capitalize flex items-center gap-2">
                                {tx.type} Transaction
                                {tx.isGasless && <Badge variant="outline">Gasless</Badge>}
                                {tx.isLightning && <Badge className="bg-orange-600">Lightning</Badge>}
                                {tx.type === 'contract' && tx.contractInteraction?.contractName && (
                                  <Badge variant="secondary">{tx.contractInteraction.contractName}</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tx.timestamp.toLocaleString()} • {tx.chainName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tx.type === 'send' ? `To: ${tx.toAddress}` : `From: ${tx.fromAddress}`}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {tx.hash.slice(0, 16)}...
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-medium">
                              {tx.type === 'send' || tx.type === 'lightning' ? '-' : '+'}
                              {formatBalance(`${parseFloat(tx.amount).toFixed(4)} ${tx.symbol}`)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatUSD(tx.usdValue)}
                            </div>
                            {tx.gasFeeUsd && tx.gasFeeUsd > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Gas: {formatUSD(tx.gasFeeUsd)}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(tx.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No transactions yet</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Production Wallet Dashboard
 * 
 * Main wallet interface combining Bitcoin, EVM, and Account Abstraction features
 * Provides multi-chain portfolio management and advanced wallet capabilities
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
  Layers
} from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'

// Import wallet components
import { ComprehensiveWalletSelector } from './ComprehensiveWalletSelector'
import { BitcoinTransactionBuilder, UTXOManager } from './bitcoin'
import { 
  UserOperationBuilder, 
  GaslessTransactionInterface, 
  SocialRecoveryInterface 
} from './account-abstraction'

// Multi-chain configuration
const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '⟠', color: 'text-blue-500' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '⬢', color: 'text-purple-500' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔷', color: 'text-blue-400' },
  { id: 10, name: 'Optimism', symbol: 'ETH', icon: '🔴', color: 'text-red-500' },
  { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵', color: 'text-blue-600' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', icon: '🏔️', color: 'text-red-400' },
]

interface PortfolioBalance {
  chainId: number;
  chainName: string;
  symbol: string;
  balance: string;
  usdValue: number;
  icon: string;
  color: string;
}

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'contract' | 'gasless';
  amount: string;
  symbol: string;
  to: string;
  from: string;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  chainId: number;
  gasless?: boolean;
}

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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0)
  const [hideBalances, setHideBalances] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Feature status
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
      description: 'UTXO management & Lightning Network',
      icon: <Bitcoin className="w-5 h-5" />,
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
      description: 'HSM & biometric authentication',
      icon: <Shield className="w-5 h-5" />,
      status: 'setup'
    }
  ])

  // Load portfolio balances across chains
  const loadPortfolioBalances = useCallback(async () => {
    if (!walletAddress) return

    try {
      setIsRefreshing(true)

      // This would call your multi-chain balance service
      const balances: PortfolioBalance[] = []
      
      // Add current chain balance
      if (ethBalance && chain) {
        const chainConfig = SUPPORTED_CHAINS.find(c => c.id === chain.id)
        if (chainConfig) {
          balances.push({
            chainId: chain.id,
            chainName: chainConfig.name,
            symbol: chainConfig.symbol,
            balance: formatEther(ethBalance.value),
            usdValue: parseFloat(formatEther(ethBalance.value)) * 2000, // Mock price
            icon: chainConfig.icon,
            color: chainConfig.color
          })
        }
      }

      // Mock additional chain balances for demo
      if (balances.length === 0 || chain?.id === 1) {
        const mockBalances = [
          { chainId: 137, balance: '156.789', usdValue: 125.43 },
          { chainId: 42161, balance: '2.1234', usdValue: 4246.80 },
          { chainId: 10, balance: '0.5678', usdValue: 1135.60 },
        ]

        mockBalances.forEach(mock => {
          const chainConfig = SUPPORTED_CHAINS.find(c => c.id === mock.chainId)
          if (chainConfig) {
            balances.push({
              ...mock,
              chainName: chainConfig.name,
              symbol: chainConfig.symbol,
              icon: chainConfig.icon,
              color: chainConfig.color
            })
          }
        })
      }

      setPortfolioBalances(balances)
      setTotalPortfolioValue(balances.reduce((sum, b) => sum + b.usdValue, 0))

    } catch (error) {
      console.error('Failed to load portfolio:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [walletAddress, ethBalance, chain])

  // Load recent transactions
  const loadTransactions = useCallback(async () => {
    if (!walletAddress) return

    // Mock transaction data for demo
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'gasless',
        amount: '50.0',
        symbol: 'USDC',
        to: '0x742d35Cc...',
        from: walletAddress,
        hash: '0x1234567890...',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        chainId: 1,
        gasless: true
      },
      {
        id: '2',
        type: 'receive',
        amount: '0.1',
        symbol: 'ETH',
        to: walletAddress,
        from: '0x8ba1f109...',
        hash: '0x0987654321...',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        chainId: 1
      },
      {
        id: '3',
        type: 'send',
        amount: '0.05',
        symbol: 'ETH',
        to: '0x1a2b3c4d...',
        from: walletAddress,
        hash: '0x1122334455...',
        status: 'pending',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        chainId: 137
      }
    ]

    setTransactions(mockTransactions)
  }, [walletAddress])

  // Effects
  useEffect(() => {
    if (isConnected) {
      loadPortfolioBalances()
      loadTransactions()
    }
  }, [isConnected, loadPortfolioBalances, loadTransactions])

  // Helper functions
  const formatBalance = (balance: string, decimals: number = 4): string => {
    if (hideBalances) return '••••'
    const num = parseFloat(balance)
    return num.toFixed(decimals)
  }

  const formatUSD = (value: number): string => {
    if (hideBalances) return '••••'
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send': return <Send className="w-4 h-4 text-red-500" />
      case 'receive': return <ArrowDown className="w-4 h-4 text-green-500" />
      case 'contract': return <CreditCard className="w-4 h-4 text-blue-500" />
      case 'gasless': return <Zap className="w-4 h-4 text-purple-500" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge variant="secondary">Confirmed</Badge>
      case 'pending': return <Badge variant="outline">Pending</Badge>
      case 'failed': return <Badge variant="destructive">Failed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getFeatureStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="secondary">Active</Badge>
      case 'setup': return <Badge variant="outline">Setup Required</Badge>
      case 'unavailable': return <Badge variant="destructive">Unavailable</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              Chain Capital Wallet
            </CardTitle>
            <CardDescription>
              Professional blockchain wallet with Bitcoin, EVM, and Account Abstraction support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ComprehensiveWalletSelector />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              Chain Capital Wallet
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHideBalances(!hideBalances)}
              >
                {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  loadPortfolioBalances()
                  loadTransactions()
                }}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Connected to {chain?.name || 'Unknown Network'} • {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Total Value */}
          <div className="text-center mb-6">
            <div className="text-3xl font-bold mb-2">
              {formatUSD(totalPortfolioValue)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Portfolio Value
            </div>
          </div>

          {/* Chain Balances */}
          <div className="space-y-3">
            {portfolioBalances.map((balance) => (
              <div key={balance.chainId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{balance.icon}</span>
                  <div>
                    <div className="font-medium">{balance.chainName}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatBalance(balance.balance)} {balance.symbol}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatUSD(balance.usdValue)}</div>
                  <div className="text-sm text-muted-foreground">
                    ${((balance.usdValue / parseFloat(balance.balance)) || 0).toFixed(2)} per {balance.symbol}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {portfolioBalances.length === 0 && !balanceLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No balances found</p>
              <p className="text-sm">Get started by receiving some crypto</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Features Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bitcoin">Bitcoin</TabsTrigger>
          <TabsTrigger value="account-abstraction">Gasless</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="transactions">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <Button className="flex flex-col items-center gap-2 h-auto py-4">
                  <Send className="w-5 h-5" />
                  <span>Send</span>
                </Button>
                
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <ArrowDown className="w-5 h-5" />
                  <span>Receive</span>
                </Button>
                
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4" 
                        onClick={() => setCurrentTab('account-abstraction')}>
                  <Zap className="w-5 h-5" />
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

          {/* Wallet Features Status */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Features</CardTitle>
              <CardDescription>
                Status of advanced wallet capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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

          {/* Recent Transactions Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Transactions</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentTab('transactions')}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <div className="font-medium capitalize">
                            {tx.type} {tx.gasless && <Badge variant="outline" className="ml-2 text-xs">Gasless</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tx.type === 'send' ? `To: ${tx.to.slice(0, 8)}...` : `From: ${tx.from.slice(0, 8)}...`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {tx.type === 'send' ? '-' : '+'}
                          {hideBalances ? '••••' : `${tx.amount} ${tx.symbol}`}
                        </div>
                        <div className="flex items-center gap-2">
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
        </TabsContent>

        {/* Bitcoin Tab */}
        <TabsContent value="bitcoin" className="space-y-4">
          <Tabs defaultValue="transaction-builder">
            <TabsList>
              <TabsTrigger value="transaction-builder">Transaction Builder</TabsTrigger>
              <TabsTrigger value="utxo-manager">UTXO Manager</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transaction-builder">
              <BitcoinTransactionBuilder />
            </TabsContent>
            
            <TabsContent value="utxo-manager">
              <UTXOManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Account Abstraction Tab */}
        <TabsContent value="account-abstraction" className="space-y-4">
          <Tabs defaultValue="gasless">
            <TabsList>
              <TabsTrigger value="gasless">Gasless Transactions</TabsTrigger>
              <TabsTrigger value="user-operations">Batch Operations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gasless">
              <GaslessTransactionInterface />
            </TabsContent>
            
            <TabsContent value="user-operations">
              <UserOperationBuilder />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery">
          <SocialRecoveryInterface />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All your transactions across supported networks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <div className="font-medium capitalize">
                            {tx.type} Transaction
                            {tx.gasless && <Badge variant="outline" className="ml-2">Gasless</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tx.timestamp.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {tx.hash.slice(0, 16)}...
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">
                          {tx.type === 'send' ? '-' : '+'}
                          {hideBalances ? '••••' : `${tx.amount} ${tx.symbol}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {SUPPORTED_CHAINS.find(c => c.id === tx.chainId)?.name}
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
                  <p>Your transaction history will appear here once you start using the wallet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Wallet Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security Settings */}
              <div>
                <h4 className="font-medium mb-3">Security</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Social Recovery</div>
                      <div className="text-sm text-muted-foreground">Guardian-based account recovery</div>
                    </div>
                    <Button variant="outline" onClick={() => setCurrentTab('recovery')}>
                      Configure
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Hardware Security</div>
                      <div className="text-sm text-muted-foreground">HSM and biometric authentication</div>
                    </div>
                    <Button variant="outline" disabled>
                      Setup Required
                    </Button>
                  </div>
                </div>
              </div>

              {/* Privacy Settings */}
              <div>
                <h4 className="font-medium mb-3">Privacy</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Hide Balances</div>
                      <div className="text-sm text-muted-foreground">Hide balance amounts for privacy</div>
                    </div>
                    <Button 
                      variant={hideBalances ? 'default' : 'outline'}
                      onClick={() => setHideBalances(!hideBalances)}
                    >
                      {hideBalances ? 'On' : 'Off'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Network Settings */}
              <div>
                <h4 className="font-medium mb-3">Networks</h4>
                <div className="text-sm text-muted-foreground mb-3">
                  Supported blockchain networks
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {SUPPORTED_CHAINS.map((chain) => (
                    <div key={chain.id} className="flex items-center gap-2 p-2 border rounded">
                      <span className="text-lg">{chain.icon}</span>
                      <span className="font-medium">{chain.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

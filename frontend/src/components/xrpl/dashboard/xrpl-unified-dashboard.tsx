/**
 * XRPL Unified Dashboard
 * 
 * Central hub for all XRPL features - fully integrated with shared components
 * Uses XRPLDashboardHeader and XRPLNavigation for consistency
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Coins, 
  Shield, 
  Users, 
  TrendingUp, 
  FileText, 
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Droplets,
  Send,
  Image,
  Key,
  ShieldCheck,
  User,
  Wrench
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { XRPLDashboardHeader } from '../shared/xrpl-dashboard-header'
import { XRPLNavigation } from '../shared/xrpl-navigation'
import { XRPLPortfolio } from './xrpl-portfolio'
import { useNavigate } from 'react-router-dom'

interface FeatureStatus {
  id: string
  name: string
  category: string
  href: string
  status: 'active' | 'pending' | 'error'
  icon: any
  lastActivity?: Date
  count?: number
}

interface DashboardStats {
  totalTransactions: number
  activeAMMs: number
  pendingMultisig: number
  credentialsIssued: number
  nftsOwned: number
  dexOrders: number
}

export const XRPLUnifiedDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState<string>()
  const [network, setNetwork] = useState<'MAINNET' | 'TESTNET' | 'DEVNET'>('TESTNET')
  const [walletAddress, setWalletAddress] = useState<string>()
  const [walletBalance, setWalletBalance] = useState<string>('0')
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    activeAMMs: 0,
    pendingMultisig: 0,
    credentialsIssued: 0,
    nftsOwned: 0,
    dexOrders: 0
  })

  const [features, setFeatures] = useState<FeatureStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [projectId, walletAddress, network])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // Load dashboard statistics and feature statuses
      // TODO: Implement actual API calls
      
      // Mock data for now
      setStats({
        totalTransactions: 1234,
        activeAMMs: 5,
        pendingMultisig: 3,
        credentialsIssued: 12,
        nftsOwned: 8,
        dexOrders: 15
      })

      setFeatures(getAllFeatures())
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAllFeatures = (): FeatureStatus[] => {
    return [
      // DeFi Features
      { id: 'amm', name: 'AMM Pools', category: 'DeFi', href: '/xrpl/amm', icon: Droplets, status: 'active', count: 5 },
      { id: 'dex', name: 'DEX Trading', category: 'DeFi', href: '/xrpl/dex', icon: TrendingUp, status: 'active', count: 15 },
      
      // Security Features
      { id: 'multisig', name: 'Multi-Signature', category: 'Security', href: '/xrpl/multisig', icon: Shield, status: 'active', count: 3 },
      { id: 'key-rotation', name: 'Key Rotation', category: 'Security', href: '/xrpl/security', icon: Key, status: 'active' },
      
      // Identity Features
      { id: 'did', name: 'Decentralized IDs', category: 'Identity', href: '/xrpl/identity', icon: User, status: 'active', count: 1 },
      { id: 'credentials', name: 'Credentials', category: 'Identity', href: '/xrpl/identity', icon: FileText, status: 'active', count: 12 },
      
      // Compliance Features
      { id: 'freeze', name: 'Asset Freeze', category: 'Compliance', href: '/xrpl/compliance', icon: ShieldCheck, status: 'active' },
      { id: 'deposit-auth', name: 'Deposit Authorization', category: 'Compliance', href: '/xrpl/compliance', icon: ShieldCheck, status: 'active' },
      
      // Payment Features
      { id: 'channels', name: 'Payment Channels', category: 'Payments', href: '/xrpl/advanced', icon: Send, status: 'active' },
      { id: 'escrow', name: 'Escrow', category: 'Payments', href: '/xrpl/advanced', icon: Clock, status: 'active' },
      { id: 'checks', name: 'Checks', category: 'Payments', href: '/xrpl/advanced', icon: CheckCircle, status: 'active' },
      
      // Token Features
      { id: 'mpt', name: 'MPT Tokens', category: 'Tokens', href: '/xrpl/mpt', icon: Coins, status: 'active' },
      { id: 'trustline', name: 'Trust Lines', category: 'Tokens', href: '/xrpl/trustlines', icon: Shield, status: 'active' },
      { id: 'nft', name: 'NFTs', category: 'Tokens', href: '/xrpl/nfts', icon: Image, status: 'active', count: 8 },
      
      // Advanced Features
      { id: 'batch', name: 'Batch Operations', category: 'Advanced Tools', href: '/xrpl/tools', icon: Wrench, status: 'active' },
      { id: 'paths', name: 'Path Finding', category: 'Advanced Tools', href: '/xrpl/tools', icon: Activity, status: 'active' },
      { id: 'oracles', name: 'Price Oracles', category: 'Advanced Tools', href: '/xrpl/tools', icon: TrendingUp, status: 'active' },
      
      // Monitoring Features
      { id: 'websocket', name: 'WebSocket Monitor', category: 'Monitoring', href: '/xrpl/monitoring', icon: Activity, status: 'active' },
      { id: 'transactions', name: 'Transaction History', category: 'Monitoring', href: '/xrpl/transactions', icon: FileText, status: 'active' },
    ]
  }

  const handleConnectWallet = () => {
    navigate('/xrpl/wallet')
  }

  const handleMPTClick = () => {
    navigate('/xrpl/mpt')
  }

  const handleNFTClick = () => {
    navigate('/xrpl/nfts')
  }

  const handlePaymentsClick = () => {
    navigate('/xrpl/payments')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DeFi':
        return <TrendingUp className="h-5 w-5" />
      case 'Security':
        return <Shield className="h-5 w-5" />
      case 'Identity':
        return <User className="h-5 w-5" />
      case 'Compliance':
        return <ShieldCheck className="h-5 w-5" />
      case 'Payments':
        return <Send className="h-5 w-5" />
      case 'Tokens':
        return <Coins className="h-5 w-5" />
      case 'Advanced Tools':
        return <Wrench className="h-5 w-5" />
      case 'Monitoring':
        return <Activity className="h-5 w-5" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const statCards = [
    { 
      title: 'Total Transactions', 
      value: stats.totalTransactions.toLocaleString(), 
      icon: Activity,
      color: 'text-blue-500',
      href: '/xrpl/transactions'
    },
    { 
      title: 'Active AMM Pools', 
      value: stats.activeAMMs.toString(), 
      icon: Droplets,
      color: 'text-green-500',
      href: '/xrpl/amm'
    },
    { 
      title: 'DEX Orders', 
      value: stats.dexOrders.toString(), 
      icon: TrendingUp,
      color: 'text-purple-500',
      href: '/xrpl/dex'
    },
    { 
      title: 'Pending Multi-sig', 
      value: stats.pendingMultisig.toString(), 
      icon: Users,
      color: 'text-orange-500',
      href: '/xrpl/multisig'
    },
    { 
      title: 'Credentials Issued', 
      value: stats.credentialsIssued.toString(), 
      icon: FileText,
      color: 'text-indigo-500',
      href: '/xrpl/identity'
    },
    { 
      title: 'NFTs Owned', 
      value: stats.nftsOwned.toString(), 
      icon: Image,
      color: 'text-pink-500',
      href: '/xrpl/nfts'
    },
  ]

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = []
    }
    acc[feature.category].push(feature)
    return acc
  }, {} as Record<string, FeatureStatus[]>)

  if (loading) {
    return (
      <div className="min-h-screen">
        <XRPLDashboardHeader
          network={network}
          walletAddress={walletAddress}
          walletBalance={walletBalance}
          title="XRPL Unified Dashboard"
          subtitle="Central hub for all XRPL features and operations"
          projectId={projectId}
          onNetworkChange={setNetwork}
          onProjectChange={setProjectId}
          onConnectWallet={handleConnectWallet}
          onRefresh={loadDashboardData}
          isLoading={loading}
          onMPT={handleMPTClick}
          onNFT={handleNFTClick}
          onPayments={handlePaymentsClick}
        />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Integrated Dashboard Header */}
      <XRPLDashboardHeader
        network={network}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        title="XRPL Unified Dashboard"
        subtitle="Central hub for all XRPL features and operations"
        projectId={projectId}
        onNetworkChange={setNetwork}
        onProjectChange={setProjectId}
        onConnectWallet={handleConnectWallet}
        onRefresh={loadDashboardData}
        isLoading={loading}
        onMPT={handleMPTClick}
        onNFT={handleNFTClick}
        onPayments={handlePaymentsClick}
      />

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-muted/10 p-6 min-h-[calc(100vh-4rem)]">
          <XRPLNavigation walletConnected={!!walletAddress} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {statCards.map((stat) => (
                <Card 
                  key={stat.title}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(stat.href)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Portfolio Overview - Integrated */}
            {walletAddress && (
              <XRPLPortfolio 
                walletAddress={walletAddress}
                network={network}
              />
            )}

            {/* Feature Categories */}
            {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <CardTitle>{category}</CardTitle>
                  </div>
                  <CardDescription>
                    {categoryFeatures.length} features available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {categoryFeatures.map((feature) => (
                      <Button
                        key={feature.id}
                        variant="outline"
                        className="justify-start h-auto py-3"
                        onClick={() => navigate(feature.href)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getStatusIcon(feature.status)}
                          <feature.icon className="h-4 w-4 shrink-0" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{feature.name}</div>
                            {feature.count !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                {feature.count} active
                              </div>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common operations and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  <Button variant="outline" onClick={() => navigate('/xrpl/amm')}>
                    <Droplets className="mr-2 h-4 w-4" />
                    Create AMM Pool
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/xrpl/multisig')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Setup Multi-sig
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/xrpl/identity')}>
                    <User className="mr-2 h-4 w-4" />
                    Issue Credential
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/xrpl/nfts')}>
                    <Image className="mr-2 h-4 w-4" />
                    Mint NFT
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

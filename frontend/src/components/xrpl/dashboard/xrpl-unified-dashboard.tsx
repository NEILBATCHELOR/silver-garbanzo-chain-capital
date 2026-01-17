/**
 * XRPL Unified Dashboard
 * 
 * Central hub for all 41 XRPL features
 * Provides quick access, status monitoring, and feature navigation
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Clock
} from 'lucide-react'
import { cn } from '@/utils/utils'

interface FeatureStatus {
  id: string
  name: string
  category: string
  status: 'active' | 'pending' | 'error'
  lastActivity?: Date
  count?: number
}

interface DashboardStats {
  totalTransactions: number
  activeAMMs: number
  pendingMultisig: number
  credentialsIssued: number
  nftsOwned: number
}

export const XRPLUnifiedDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    activeAMMs: 0,
    pendingMultisig: 0,
    credentialsIssued: 0,
    nftsOwned: 0
  })

  const [features, setFeatures] = useState<FeatureStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // Load dashboard statistics and feature statuses
      // This will be implemented with actual API calls
      
      // Mock data for now
      setStats({
        totalTransactions: 1234,
        activeAMMs: 5,
        pendingMultisig: 3,
        credentialsIssued: 12,
        nftsOwned: 8
      })

      setFeatures(getFeatureList())
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFeatureList = (): FeatureStatus[] => {
    return [
      // DeFi Features
      { id: 'amm', name: 'AMM Pools', category: 'DeFi', status: 'active', count: 5 },
      { id: 'dex', name: 'DEX Trading', category: 'DeFi', status: 'active', count: 12 },
      { id: 'liquidity', name: 'Liquidity Provision', category: 'DeFi', status: 'active' },
      
      // Security Features
      { id: 'multisig', name: 'Multi-Signature', category: 'Security', status: 'active', count: 3 },
      { id: 'key-rotation', name: 'Key Rotation', category: 'Security', status: 'active' },
      { id: 'regular-keys', name: 'Regular Keys', category: 'Security', status: 'active' },
      
      // Identity Features
      { id: 'did', name: 'Decentralized IDs', category: 'Identity', status: 'active', count: 1 },
      { id: 'credentials', name: 'Credentials', category: 'Identity', status: 'active', count: 12 },
      { id: 'verification', name: 'Credential Verification', category: 'Identity', status: 'active' },
      
      // Compliance Features
      { id: 'freeze', name: 'Asset Freeze', category: 'Compliance', status: 'active' },
      { id: 'deposit-auth', name: 'Deposit Authorization', category: 'Compliance', status: 'active' },
      { id: 'blacklist', name: 'Blackhole Accounts', category: 'Compliance', status: 'active' },
      
      // Payment Features
      { id: 'channels', name: 'Payment Channels', category: 'Payments', status: 'active' },
      { id: 'escrow', name: 'Escrow', category: 'Payments', status: 'active' },
      { id: 'checks', name: 'Checks', category: 'Payments', status: 'active' },
      
      // Token Features
      { id: 'mpt', name: 'MPT Tokens', category: 'Tokens', status: 'active' },
      { id: 'trustline', name: 'Trust Line Tokens', category: 'Tokens', status: 'active' },
      { id: 'nft', name: 'NFTs', category: 'Tokens', status: 'active', count: 8 },
      
      // Advanced Features
      { id: 'delegation', name: 'Account Delegation', category: 'Advanced', status: 'active' },
      { id: 'tickets', name: 'Transaction Tickets', category: 'Advanced', status: 'active' },
      { id: 'batch', name: 'Batch Operations', category: 'Advanced', status: 'active' },
      { id: 'paths', name: 'Path Finding', category: 'Advanced', status: 'active' },
      
      // Monitoring Features
      { id: 'websocket', name: 'WebSocket Monitor', category: 'Monitoring', status: 'active' },
      { id: 'oracles', name: 'Price Oracles', category: 'Monitoring', status: 'active' },
    ]
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
        return <FileText className="h-5 w-5" />
      case 'Compliance':
        return <CheckCircle className="h-5 w-5" />
      case 'Payments':
        return <Coins className="h-5 w-5" />
      case 'Tokens':
        return <Coins className="h-5 w-5" />
      case 'Advanced':
        return <Settings className="h-5 w-5" />
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
      color: 'text-blue-500'
    },
    { 
      title: 'Active AMM Pools', 
      value: stats.activeAMMs.toString(), 
      icon: TrendingUp,
      color: 'text-green-500'
    },
    { 
      title: 'Pending Multi-sig', 
      value: stats.pendingMultisig.toString(), 
      icon: Users,
      color: 'text-orange-500'
    },
    { 
      title: 'Credentials Issued', 
      value: stats.credentialsIssued.toString(), 
      icon: FileText,
      color: 'text-purple-500'
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">XRPL Dashboard</h1>
        <p className="text-muted-foreground">
          Unified control center for all XRPL features and operations
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
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

      {/* Feature Navigation */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Features</TabsTrigger>
          <TabsTrigger value="defi">DeFi</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
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
                      onClick={() => {
                        // Navigate to feature page
                        console.log('Navigate to:', feature.id)
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {getStatusIcon(feature.status)}
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
        </TabsContent>

        {/* Category-specific tabs */}
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
          <TabsContent key={category} value={category.toLowerCase()} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <CardTitle>{category} Features</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryFeatures.map((feature) => (
                    <Card key={feature.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{feature.name}</CardTitle>
                          {getStatusIcon(feature.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {feature.count !== undefined && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {feature.count} active
                          </p>
                        )}
                        <Button size="sm" className="w-full">
                          Open
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common operations and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Create AMM Pool
            </Button>
            <Button variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Setup Multi-sig
            </Button>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Issue Credential
            </Button>
            <Button variant="outline">
              <Coins className="mr-2 h-4 w-4" />
              Mint NFT
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

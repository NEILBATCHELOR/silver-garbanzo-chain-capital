import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet, 
  Coins, 
  Image, 
  TrendingUp, 
  Activity,
  RefreshCw,
  ExternalLink 
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { XRPLPortfolio } from './xrpl-portfolio'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Client } from 'xrpl'

interface AccountInfo {
  address: string
  balance: string
  ownerCount: number
  sequence: number
}

interface XRPLDashboardProps {
  walletAddress?: string
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export const XRPLDashboard: React.FC<XRPLDashboardProps> = ({ 
  walletAddress,
  network = 'TESTNET',
  projectId
}) => {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [client, setClient] = useState<Client | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    initializeClient()
  }, [network])

  useEffect(() => {
    if (walletAddress && client) {
      loadAccountInfo()
    }
  }, [walletAddress, client])

  const initializeClient = async () => {
    try {
      const xrplClient = await xrplClientManager.getClient(network)
      setClient(xrplClient)
    } catch (error) {
      console.error('Failed to initialize XRPL client:', error)
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to XRPL network',
        variant: 'destructive'
      })
    }
  }

  const loadAccountInfo = async () => {
    if (!walletAddress || !client) return

    setLoading(true)
    try {
      const response = await client.request({
        command: 'account_info',
        account: walletAddress,
        ledger_index: 'validated'
      })

      const accountData = response.result.account_data

      setAccountInfo({
        address: walletAddress,
        balance: (parseInt(accountData.Balance) / 1_000_000).toFixed(6),
        ownerCount: accountData.OwnerCount || 0,
        sequence: accountData.Sequence
      })
    } catch (error) {
      console.error('Failed to load account info:', error)
      toast({
        title: 'Error',
        description: 'Failed to load account information',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadAccountInfo()
  }

  const getNetworkBadgeColor = () => {
    switch (network) {
      case 'MAINNET': return 'bg-green-500'
      case 'TESTNET': return 'bg-yellow-500'
      case 'DEVNET': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">XRPL Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your XRP Ledger assets and transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getNetworkBadgeColor()}>
            {network}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || !walletAddress}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Overview */}
      {walletAddress && accountInfo && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">XRP Balance</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accountInfo.balance} XRP</div>
              <p className="text-xs text-muted-foreground mt-1">
                Available balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Objects</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accountInfo.ownerCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Trust lines, offers, etc.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sequence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accountInfo.sequence}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Next transaction sequence
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{network}</div>
              <a
                href={`https://${network.toLowerCase()}.xrpl.org/accounts/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolio">
            <Wallet className="h-4 w-4 mr-2" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="tokens">
            <Coins className="h-4 w-4 mr-2" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="nfts">
            <Image className="h-4 w-4 mr-2" />
            NFTs
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <XRPLPortfolio 
            walletAddress={walletAddress} 
            network={network}
          />
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Holdings</CardTitle>
              <CardDescription>
                Your MPT and Trust Line tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Token management interface coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nfts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NFT Collection</CardTitle>
              <CardDescription>
                Your XRPL NFTs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                NFT gallery coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Activity</CardTitle>
              <CardDescription>
                Recent transactions and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Activity feed coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* No Wallet Connected State */}
      {!walletAddress && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect an XRPL wallet to view your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You need to connect an XRPL wallet to access the dashboard features.
            </p>
            <Button>
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

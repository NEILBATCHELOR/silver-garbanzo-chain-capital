/**
 * XRPL Monitoring Dashboard
 * Combined WebSocket monitoring and activity feed with wallet selection
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WebSocketMonitor } from './websocket-monitor'
import { ActivityFeed } from './activity-feed'
import { Activity, Wallet, RefreshCw } from 'lucide-react'

interface MonitoringDashboardProps {
  defaultWallet?: string
  defaultNetwork?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

// Predefined wallets for testing
const PREDEFINED_WALLETS = [
  {
    label: 'Holder Wallet',
    address: 'rfiqYTop8o3HTDwQihFiEseDcv1CVTjoDe',
    description: 'MPT Holder Account'
  },
  {
    label: 'Issuer Wallet',
    address: 'rKPaP7wmyUstMh46P4jbZq1GGh2qFgQT6h',
    description: 'MPT Issuer Account'
  }
]

export function MonitoringDashboard({ 
  defaultWallet,
  defaultNetwork = 'TESTNET'
}: MonitoringDashboardProps) {
  const [selectedWallet, setSelectedWallet] = useState<string>(
    defaultWallet || PREDEFINED_WALLETS[0].address
  )
  const [network, setNetwork] = useState<'MAINNET' | 'TESTNET' | 'DEVNET'>(defaultNetwork)
  const [liveTransactionCount, setLiveTransactionCount] = useState(0)
  const [lastTransaction, setLastTransaction] = useState<any>(null)

  // Handle new transaction from WebSocket
  const handleTransactionReceived = (tx: any) => {
    setLiveTransactionCount(prev => prev + 1)
    setLastTransaction(tx)
  }

  // Get wallet label
  const getWalletLabel = (address: string): string => {
    const wallet = PREDEFINED_WALLETS.find(w => w.address === address)
    return wallet ? wallet.label : address
  }

  // Get wallet description
  const getWalletDescription = (address: string): string => {
    const wallet = PREDEFINED_WALLETS.find(w => w.address === address)
    return wallet ? wallet.description : 'Custom wallet'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6" />
                XRPL Real-Time Monitoring
              </CardTitle>
              <CardDescription>
                WebSocket monitoring and activity feed for XRPL wallets
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {liveTransactionCount > 0 && (
                <Badge variant="default" className="animate-pulse">
                  {liveTransactionCount} live events
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wallet Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Wallet</label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a wallet" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_WALLETS.map(wallet => (
                    <SelectItem key={wallet.address} value={wallet.address}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{wallet.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {wallet.address.slice(0, 12)}...{wallet.address.slice(-8)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getWalletDescription(selectedWallet)}
              </p>
            </div>

            {/* Network Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Network</label>
              <Select value={network} onValueChange={(val) => setNetwork(val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAINNET">Mainnet</SelectItem>
                  <SelectItem value="TESTNET">Testnet</SelectItem>
                  <SelectItem value="DEVNET">Devnet</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current network: {network}
              </p>
            </div>
          </div>

          {/* Current Wallet Info */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4" />
              <span className="text-sm font-medium">Monitoring Wallet</span>
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              {selectedWallet}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{getWalletLabel(selectedWallet)}</Badge>
              <Badge variant="secondary">{network}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="websocket">WebSocket Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <ActivityFeed
            walletAddress={selectedWallet}
            network={network}
            limit={20}
            autoRefresh={false}
          />
        </TabsContent>

        <TabsContent value="websocket" className="mt-6">
          <WebSocketMonitor
            walletAddress={selectedWallet}
            network={network}
            onTransactionReceived={handleTransactionReceived}
          />
        </TabsContent>
      </Tabs>

      {/* Last Transaction */}
      {lastTransaction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latest Live Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge>{lastTransaction.transaction?.TransactionType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hash:</span>
                <code className="text-xs">{lastTransaction.transaction?.hash?.slice(0, 16)}...</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Result:</span>
                <Badge variant={lastTransaction.meta?.TransactionResult === 'tesSUCCESS' ? 'default' : 'destructive'}>
                  {lastTransaction.meta?.TransactionResult}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

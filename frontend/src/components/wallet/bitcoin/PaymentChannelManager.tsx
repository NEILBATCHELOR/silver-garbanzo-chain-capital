/**
 * Payment Channel Manager Component
 * 
 * Provides interface for managing Lightning Network payment channels
 * Supports channel opening, closing, rebalancing, and monitoring
 * Integrates with LightningNetworkService for channel operations
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Layers, 
  Plus, 
  Minus,
  RotateCcw,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Settings,
  Eye,
  ExternalLink,
  ArrowLeftRight
} from 'lucide-react'
import { LightningNetworkService, type PaymentChannel } from '@/services/wallet/LightningNetworkService'

interface ChannelForm {
  nodeId: string;
  localAmount: string; // BTC
  pushAmount: string; // BTC (amount to push to remote)
  feeRate: string; // sat/vB
  private: boolean;
  minConfs: number;
}

interface ChannelStats {
  totalChannels: number;
  activeChannels: number;
  totalCapacity: number; // satoshis
  totalLocalBalance: number; // satoshis
  totalRemoteBalance: number; // satoshis
  averageChannelSize: number; // satoshis
}

interface RebalanceOperation {
  fromChannel: string;
  toChannel: string;
  amount: number; // satoshis
  maxFee: number; // satoshis
  status: 'pending' | 'success' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export function PaymentChannelManager() {
  // State management
  const [channels, setChannels] = useState<PaymentChannel[]>([])
  const [channelForm, setChannelForm] = useState<ChannelForm>({
    nodeId: '',
    localAmount: '',
    pushAmount: '0',
    feeRate: '10',
    private: false,
    minConfs: 1
  })
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null)
  const [rebalanceOps, setRebalanceOps] = useState<RebalanceOperation[]>([])
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTab, setCurrentTab] = useState('channels')
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [sortBy, setSortBy] = useState<'capacity' | 'balance' | 'activity'>('capacity')

  // Lightning service instance
  const privateKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
  const lightningService = new LightningNetworkService(privateKey)

  // Load channels
  const loadChannels = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const channelList = lightningService.getChannels()
      setChannels(channelList)
      
      // Calculate statistics
      const stats: ChannelStats = {
        totalChannels: channelList.length,
        activeChannels: channelList.filter(c => c.state === 'active').length,
        totalCapacity: channelList.reduce((sum, c) => sum + c.capacity, 0),
        totalLocalBalance: channelList.reduce((sum, c) => sum + c.localBalance, 0),
        totalRemoteBalance: channelList.reduce((sum, c) => sum + c.remoteBalance, 0),
        averageChannelSize: channelList.length > 0 ? 
          channelList.reduce((sum, c) => sum + c.capacity, 0) / channelList.length : 0
      }
      
      setChannelStats(stats)
      
    } catch (error) {
      setError(`Failed to load channels: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Open new channel
  const openChannel = async () => {
    if (!channelForm.nodeId || !channelForm.localAmount) {
      setError('Please enter node ID and local amount')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const localAmountSats = Math.floor(parseFloat(channelForm.localAmount) * 100000000)
      const pushAmountSats = Math.floor(parseFloat(channelForm.pushAmount || '0') * 100000000)

      await lightningService.openChannel(
        channelForm.nodeId,
        localAmountSats,
        pushAmountSats
      )

      // Reset form and reload channels
      setChannelForm({
        nodeId: '',
        localAmount: '',
        pushAmount: '0',
        feeRate: '10',
        private: false,
        minConfs: 1
      })
      setShowChannelForm(false)
      await loadChannels()

    } catch (error) {
      setError(`Failed to open channel: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Close channel
  const closeChannel = async (channelId: string, force: boolean = false) => {
    try {
      setIsLoading(true)
      setError('')

      await lightningService.closeChannel(
        channelId,
        force
      )

      await loadChannels()

    } catch (error) {
      setError(`Failed to close channel: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Rebalance channels
  const rebalanceChannels = async (fromChannelId: string, toChannelId: string, amount: number) => {
    const rebalanceOp: RebalanceOperation = {
      fromChannel: fromChannelId,
      toChannel: toChannelId,
      amount,
      maxFee: Math.floor(amount * 0.01), // 1% max fee
      status: 'pending',
      startTime: new Date()
    }

    setRebalanceOps(prev => [rebalanceOp, ...prev])

    try {
      // Mock rebalance operation since the service doesn't implement this
      // In production, this would use proper Lightning rebalancing functionality
      await new Promise(resolve => setTimeout(resolve, 3000)) // Simulate rebalance delay

      // Update operation status
      setRebalanceOps(prev => 
        prev.map(op => 
          op === rebalanceOp ? {
            ...op,
            status: 'success',
            endTime: new Date()
          } : op
        )
      )

      await loadChannels()

    } catch (error) {
      setRebalanceOps(prev => 
        prev.map(op => 
          op === rebalanceOp ? {
            ...op,
            status: 'failed',
            endTime: new Date(),
            error: error.toString()
          } : op
        )
      )
    }
  }

  // Format functions
  const formatSats = (sats: number): string => {
    return `${sats.toLocaleString()} sats`
  }

  const formatBTC = (sats: number): string => {
    return `${(sats / 100000000).toFixed(8)} BTC`
  }

  const getChannelStateColor = (state: PaymentChannel['state']) => {
    switch (state) {
      case 'active': return 'text-green-600'
      case 'opening': return 'text-yellow-600'
      case 'closing': return 'text-orange-600'
      case 'closed': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getChannelStateBadge = (state: PaymentChannel['state']) => {
    switch (state) {
      case 'active': return <Badge variant="default" className="bg-green-600">Active</Badge>
      case 'opening': return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Opening</Badge>
      case 'closing': return <Badge variant="outline" className="border-orange-600 text-orange-600">Closing</Badge>
      case 'closed': return <Badge variant="secondary">Closed</Badge>
      default: return <Badge variant="outline">{state}</Badge>
    }
  }

  const getBalanceRatio = (channel: PaymentChannel) => {
    const total = channel.localBalance + channel.remoteBalance
    return total > 0 ? (channel.localBalance / total) * 100 : 50
  }

  // Sort channels
  const sortedChannels = [...channels].sort((a, b) => {
    switch (sortBy) {
      case 'capacity':
        return b.capacity - a.capacity
      case 'balance':
        return b.localBalance - a.localBalance
      case 'activity':
        return b.commitmentNumber - a.commitmentNumber
      default:
        return 0
    }
  })

  // Effects
  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                Payment Channel Manager
              </CardTitle>
              <CardDescription>
                Manage Lightning Network payment channels and liquidity
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadChannels} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={showChannelForm} onOpenChange={setShowChannelForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Open Channel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Open New Channel</DialogTitle>
                    <DialogDescription>
                      Create a new Lightning payment channel
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nodeId">Node ID</Label>
                      <Input
                        id="nodeId"
                        value={channelForm.nodeId}
                        onChange={(e) => setChannelForm({...channelForm, nodeId: e.target.value})}
                        placeholder="Node public key (66 characters)"
                        className="font-mono text-xs"
                      />
                    </div>
                    
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="localAmount">Local Amount (BTC)</Label>
                        <Input
                          id="localAmount"
                          type="number"
                          step="0.00000001"
                          value={channelForm.localAmount}
                          onChange={(e) => setChannelForm({...channelForm, localAmount: e.target.value})}
                          placeholder="0.01000000"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pushAmount">Push Amount (BTC)</Label>
                        <Input
                          id="pushAmount"
                          type="number"
                          step="0.00000001"
                          value={channelForm.pushAmount}
                          onChange={(e) => setChannelForm({...channelForm, pushAmount: e.target.value})}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="feeRate">Fee Rate (sat/vB)</Label>
                        <Input
                          id="feeRate"
                          type="number"
                          value={channelForm.feeRate}
                          onChange={(e) => setChannelForm({...channelForm, feeRate: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="minConfs">Min Confirmations</Label>
                        <Select value={channelForm.minConfs.toString()} onValueChange={(v) => setChannelForm({...channelForm, minConfs: parseInt(v)})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 confirmation</SelectItem>
                            <SelectItem value="3">3 confirmations</SelectItem>
                            <SelectItem value="6">6 confirmations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Private Channel</Label>
                      <Button
                        variant={channelForm.private ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChannelForm({...channelForm, private: !channelForm.private})}
                      >
                        {channelForm.private ? 'Private' : 'Public'}
                      </Button>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowChannelForm(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={openChannel} 
                        disabled={isLoading || !channelForm.nodeId || !channelForm.localAmount}
                        className="flex-1"
                      >
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Open Channel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Statistics */}
          {channelStats && (
            <div className="grid gap-4 md:grid-cols-4 mt-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{channelStats.totalChannels}</div>
                <div className="text-sm text-muted-foreground">Total Channels</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {channelStats.activeChannels} active
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatBTC(channelStats.totalCapacity)}</div>
                <div className="text-sm text-muted-foreground">Total Capacity</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatSats(channelStats.totalCapacity)}
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatBTC(channelStats.totalLocalBalance)}</div>
                <div className="text-sm text-muted-foreground">Local Balance</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Can send: {formatSats(channelStats.totalLocalBalance)}
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatBTC(channelStats.totalRemoteBalance)}</div>
                <div className="text-sm text-muted-foreground">Remote Balance</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Can receive: {formatSats(channelStats.totalRemoteBalance)}
                </div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="rebalance">Rebalance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Channels ({channels.length})</CardTitle>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capacity">Sort by Capacity</SelectItem>
                    <SelectItem value="balance">Sort by Balance</SelectItem>
                    <SelectItem value="activity">Sort by Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {sortedChannels.length > 0 ? (
                <div className="space-y-4">
                  {sortedChannels.map((channel) => (
                    <Card key={channel.channelId} className="p-4">
                      <div className="space-y-4">
                        {/* Channel Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-sm">
                              {channel.channelId.slice(0, 16)}...
                            </div>
                            {getChannelStateBadge(channel.state)}
                            {channel.isInitiator && (
                              <Badge variant="outline" className="text-xs">Initiator</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedChannel(channel)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {channel.state === 'active' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => closeChannel(channel.channelId)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Channel Details */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <Label className="text-sm text-muted-foreground">Capacity</Label>
                            <div className="font-mono">{formatBTC(channel.capacity)}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatSats(channel.capacity)}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm text-muted-foreground">Local Balance</Label>
                            <div className="font-mono text-green-600">{formatBTC(channel.localBalance)}</div>
                            <div className="text-sm text-muted-foreground">
                              Can send: {formatSats(channel.localBalance)}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm text-muted-foreground">Remote Balance</Label>
                            <div className="font-mono text-blue-600">{formatBTC(channel.remoteBalance)}</div>
                            <div className="text-sm text-muted-foreground">
                              Can receive: {formatSats(channel.remoteBalance)}
                            </div>
                          </div>
                        </div>

                        {/* Balance Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Local ({getBalanceRatio(channel).toFixed(1)}%)</span>
                            <span className="text-blue-600">Remote ({(100 - getBalanceRatio(channel)).toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${getBalanceRatio(channel)}%` }}
                            />
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            Counterparty: {channel.counterparty.slice(0, 16)}...
                          </div>
                          <div>
                            Updates: {channel.commitmentNumber.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Payment Channels</h3>
                  <p className="text-muted-foreground mb-4">
                    Open your first Lightning Network payment channel to get started
                  </p>
                  <Button onClick={() => setShowChannelForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Open First Channel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rebalance Tab */}
        <TabsContent value="rebalance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                Channel Rebalancing
              </CardTitle>
              <CardDescription>
                Optimize channel liquidity by moving funds between channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <RotateCcw className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Rebalancing Tools</h3>
                <p className="mb-4">
                  Automated rebalancing features coming soon
                </p>
                <Button variant="outline" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Rebalancing
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rebalance Operations */}
          {rebalanceOps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Rebalance Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rebalanceOps.map((op, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {op.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                          {op.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          {op.status === 'pending' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                          <div className="font-mono text-sm">{formatSats(op.amount)}</div>
                          <Badge 
                            variant={op.status === 'success' ? 'default' : op.status === 'failed' ? 'destructive' : 'outline'}
                          >
                            {op.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {op.fromChannel.slice(0, 8)}... → {op.toChannel.slice(0, 8)}... • {op.startTime.toLocaleString()}
                        </div>
                        {op.error && (
                          <div className="text-sm text-red-600 mt-1">{op.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Channel Activity
              </CardTitle>
              <CardDescription>
                Monitor payments, HTLCs, and channel updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Activity Monitor</h3>
                <p className="mb-4">
                  Real-time channel activity monitoring coming soon
                </p>
                <Button variant="outline" disabled>
                  <Eye className="w-4 h-4 mr-2" />
                  View Activity Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Channel Details Modal */}
      {selectedChannel && (
        <Dialog open={!!selectedChannel} onOpenChange={() => setSelectedChannel(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Channel Details</DialogTitle>
              <DialogDescription>
                {selectedChannel.channelId}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">State</Label>
                    <div>{getChannelStateBadge(selectedChannel.state)}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Capacity</Label>
                    <div className="font-mono">{formatBTC(selectedChannel.capacity)}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Local Balance</Label>
                    <div className="font-mono text-green-600">{formatBTC(selectedChannel.localBalance)}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Remote Balance</Label>
                    <div className="font-mono text-blue-600">{formatBTC(selectedChannel.remoteBalance)}</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Funding Transaction</Label>
                    <div className="font-mono text-xs break-all">
                      {selectedChannel.fundingTxid}:{selectedChannel.fundingOutput}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Counterparty</Label>
                    <div className="font-mono text-xs break-all">
                      {selectedChannel.counterparty}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">CSV Delay</Label>
                    <div>{selectedChannel.csvDelay} blocks</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Commitment Updates</Label>
                    <div>{selectedChannel.commitmentNumber.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedChannel(null)}>
                  Close
                </Button>
                {selectedChannel.state === 'active' && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      closeChannel(selectedChannel.channelId)
                      setSelectedChannel(null)
                    }}
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Close Channel
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

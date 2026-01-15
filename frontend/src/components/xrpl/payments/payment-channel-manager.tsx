import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, DollarSign, X, ExternalLink } from 'lucide-react'
import { XRPLPaymentChannelService } from '@/services/wallet/ripple/channels/XRPLPaymentChannelService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPL_NETWORKS } from '@/services/wallet/ripple/config/XRPLConfig'
import type { Wallet } from 'xrpl'

interface PaymentChannelManagerProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

interface Channel {
  channelId: string
  destination: string
  amount: string
  balance: string
}

export const PaymentChannelManager: React.FC<PaymentChannelManagerProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeTab, setActiveTab] = useState('create')
  
  const [createForm, setCreateForm] = useState({
    destination: '',
    amount: '',
    settleDelay: '3600'
  })

  const [fundForm, setFundForm] = useState({
    channelId: '',
    amount: ''
  })

  const [claimForm, setClaimForm] = useState({
    channelId: '',
    amount: ''
  })

  useEffect(() => {
    loadChannels()
  }, [wallet.address, network])

  const loadChannels = async () => {
    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLPaymentChannelService(client)
      const accountChannels = await service.getAccountChannels(wallet.address)
      setChannels(accountChannels)
    } catch (error) {
      console.error('Failed to load channels:', error)
    }
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLPaymentChannelService(client)

      const result = await service.createChannel({
        source: wallet,
        destination: createForm.destination,
        amount: (parseFloat(createForm.amount) * 1_000_000).toString(),
        settleDelay: parseInt(createForm.settleDelay)
      })

      const explorerUrl = `${XRPL_NETWORKS[network].explorerUrl}/transactions/${result.transactionHash}`

      toast({
        title: 'Channel Created',
        description: (
          <div className="space-y-2">
            <p>Channel ID: {result.channelId.substring(0, 20)}...</p>
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
              View in Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )
      })

      setCreateForm({ destination: '', amount: '', settleDelay: '3600' })
      loadChannels()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create channel',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFundChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLPaymentChannelService(client)

      const result = await service.fundChannel(
        wallet,
        fundForm.channelId,
        (parseFloat(fundForm.amount) * 1_000_000).toString()
      )

      toast({
        title: 'Channel Funded',
        description: `Added ${fundForm.amount} XRP to channel`
      })

      setFundForm({ channelId: '', amount: '' })
      loadChannels()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fund channel',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClaimChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLPaymentChannelService(client)

      const result = await service.claimChannel(
        wallet,
        claimForm.channelId,
        (parseFloat(claimForm.amount) * 1_000_000).toString()
      )

      toast({
        title: 'Channel Claimed',
        description: `Claimed ${claimForm.amount} XRP from channel`
      })

      setClaimForm({ channelId: '', amount: '' })
      loadChannels()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to claim channel',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseChannel = async (channelId: string) => {
    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLPaymentChannelService(client)

      await service.closeChannel(wallet, channelId)

      toast({
        title: 'Channel Closed',
        description: 'Payment channel has been closed'
      })

      loadChannels()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to close channel',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Channel Manager</CardTitle>
        <CardDescription>Create and manage payment channels for micro-payments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="fund">Fund</TabsTrigger>
            <TabsTrigger value="claim">Claim</TabsTrigger>
            <TabsTrigger value="channels">My Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination Address *</Label>
                <Input
                  id="destination"
                  placeholder="rXXXXXXXXXXXXX"
                  value={createForm.destination}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, destination: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (XRP) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  placeholder="100.00"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settleDelay">Settle Delay (seconds) *</Label>
                <Input
                  id="settleDelay"
                  type="number"
                  placeholder="3600"
                  value={createForm.settleDelay}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, settleDelay: e.target.value }))}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Time to wait before channel can be closed (default: 1 hour)
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Channel
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="fund" className="space-y-4">
            <form onSubmit={handleFundChannel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fundChannelId">Channel ID *</Label>
                <Input
                  id="fundChannelId"
                  placeholder="Channel ID or select from list"
                  value={fundForm.channelId}
                  onChange={(e) => setFundForm(prev => ({ ...prev, channelId: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundAmount">Additional Amount (XRP) *</Label>
                <Input
                  id="fundAmount"
                  type="number"
                  step="0.000001"
                  placeholder="50.00"
                  value={fundForm.amount}
                  onChange={(e) => setFundForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Funding...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Fund Channel
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="claim" className="space-y-4">
            <form onSubmit={handleClaimChannel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="claimChannelId">Channel ID *</Label>
                <Input
                  id="claimChannelId"
                  placeholder="Channel ID"
                  value={claimForm.channelId}
                  onChange={(e) => setClaimForm(prev => ({ ...prev, channelId: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="claimAmount">Claim Amount (XRP) *</Label>
                <Input
                  id="claimAmount"
                  type="number"
                  step="0.000001"
                  placeholder="10.00"
                  value={claimForm.amount}
                  onChange={(e) => setClaimForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Claim from Channel
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            {channels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payment channels found
              </div>
            ) : (
              <div className="space-y-4">
                {channels.map((channel) => (
                  <Card key={channel.channelId}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Channel ID:</span>
                          <Badge variant="outline">
                            {channel.channelId.substring(0, 12)}...
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Destination:</span>
                          <span className="text-sm">{channel.destination.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Amount:</span>
                          <span className="text-sm">{(parseInt(channel.amount) / 1_000_000).toFixed(6)} XRP</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Balance:</span>
                          <span className="text-sm">{(parseInt(channel.balance) / 1_000_000).toFixed(6)} XRP</span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCloseChannel(channel.channelId)}
                          disabled={loading}
                          className="w-full mt-2"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Close Channel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

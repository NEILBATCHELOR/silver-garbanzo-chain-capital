import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lock, Clock, X, Check, ExternalLink } from 'lucide-react'
import { XRPLEscrowService } from '@/services/wallet/ripple/escrow/XRPLEscrowService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPL_NETWORKS } from '@/services/wallet/ripple/config/XRPLConfig'
import { usePrimaryProject } from '@/hooks/project/usePrimaryProject'
import type { Wallet } from 'xrpl'

interface EscrowManagerProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

interface Escrow {
  account: string
  destination: string
  amount: string
  sequence: number
  finishAfter?: number
  cancelAfter?: number
  condition?: string
}

export const EscrowManager: React.FC<EscrowManagerProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const { primaryProject } = usePrimaryProject()
  const [loading, setLoading] = useState(false)
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [activeTab, setActiveTab] = useState('create')

  const [createForm, setCreateForm] = useState({
    destination: '',
    amount: '',
    finishAfter: '',
    cancelAfter: '',
    useCondition: false
  })

  const [finishForm, setFinishForm] = useState({
    ownerAddress: '',
    sequence: '',
    fulfillment: ''
  })

  const [cancelForm, setCancelForm] = useState({
    ownerAddress: '',
    sequence: ''
  })

  useEffect(() => {
    loadEscrows()
  }, [wallet.address, network])

  const loadEscrows = async () => {
    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLEscrowService(client)
      const accountEscrows = await service.getAccountEscrows(wallet.address)
      setEscrows(accountEscrows)
    } catch (error) {
      console.error('Failed to load escrows:', error)
    }
  }

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!primaryProject?.id) {
      toast({
        title: 'Error',
        description: 'No primary project selected',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLEscrowService(client)

      const params = {
        projectId: primaryProject.id,
        wallet,
        destination: createForm.destination,
        amount: (parseFloat(createForm.amount) * 1_000_000).toString(),
        finishAfter: createForm.finishAfter 
          ? Math.floor(new Date(createForm.finishAfter).getTime() / 1000)
          : undefined,
        cancelAfter: createForm.cancelAfter
          ? Math.floor(new Date(createForm.cancelAfter).getTime() / 1000)
          : undefined
      }

      let result
      if (createForm.useCondition) {
        const { condition, fulfillment } = service.generateConditionAndFulfillment()
        result = await service.createConditionalEscrow({
          ...params,
          condition
        })
        
        toast({
          title: 'Escrow Created with Condition',
          description: (
            <div className="space-y-2">
              <p>Sequence: {result.sequence}</p>
              <p className="text-xs break-all">Fulfillment: {fulfillment}</p>
              <p className="text-xs text-yellow-600">Save this fulfillment! You'll need it to finish the escrow.</p>
            </div>
          )
        })
      } else {
        result = await service.createTimedEscrow(params)
        
        const explorerUrl = `${XRPL_NETWORKS[network].explorerUrl}/transactions/${result.transactionHash}`
        
        toast({
          title: 'Escrow Created',
          description: (
            <div className="space-y-2">
              <p>Sequence: {result.sequence}</p>
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                View in Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )
        })
      }

      setCreateForm({
        destination: '',
        amount: '',
        finishAfter: '',
        cancelAfter: '',
        useCondition: false
      })
      loadEscrows()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create escrow',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFinishEscrow = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!primaryProject?.id) {
      toast({
        title: 'Error',
        description: 'No primary project selected',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLEscrowService(client)

      const result = await service.finishEscrow(
        primaryProject.id,
        wallet,
        finishForm.ownerAddress,
        parseInt(finishForm.sequence),
        undefined,
        finishForm.fulfillment || undefined
      )

      toast({
        title: 'Escrow Finished',
        description: 'Funds have been released to destination'
      })

      setFinishForm({ ownerAddress: '', sequence: '', fulfillment: '' })
      loadEscrows()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to finish escrow',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEscrow = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!primaryProject?.id) {
      toast({
        title: 'Error',
        description: 'No primary project selected',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLEscrowService(client)

      const result = await service.cancelEscrow(
        primaryProject.id,
        wallet,
        cancelForm.ownerAddress,
        parseInt(cancelForm.sequence)
      )

      toast({
        title: 'Escrow Cancelled',
        description: 'Funds have been returned to sender'
      })

      setCancelForm({ ownerAddress: '', sequence: '' })
      loadEscrows()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel escrow',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escrow Manager</CardTitle>
        <CardDescription>Create and manage time-locked or conditional escrows</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="finish">Finish</TabsTrigger>
            <TabsTrigger value="cancel">Cancel</TabsTrigger>
            <TabsTrigger value="escrows">My Escrows</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleCreateEscrow} className="space-y-4">
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
                <Label htmlFor="finishAfter">Finish After (optional)</Label>
                <Input
                  id="finishAfter"
                  type="datetime-local"
                  value={createForm.finishAfter}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, finishAfter: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Funds can be released after this time
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancelAfter">Cancel After (optional)</Label>
                <Input
                  id="cancelAfter"
                  type="datetime-local"
                  value={createForm.cancelAfter}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, cancelAfter: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Funds can be returned after this time
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useCondition"
                  checked={createForm.useCondition}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, useCondition: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="useCondition" className="cursor-pointer">
                  Use crypto-condition (requires fulfillment to finish)
                </Label>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Create Escrow
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="finish" className="space-y-4">
            <form onSubmit={handleFinishEscrow} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="finishOwner">Escrow Owner Address *</Label>
                <Input
                  id="finishOwner"
                  placeholder="rXXXXXXXXXXXXX"
                  value={finishForm.ownerAddress}
                  onChange={(e) => setFinishForm(prev => ({ ...prev, ownerAddress: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finishSequence">Sequence Number *</Label>
                <Input
                  id="finishSequence"
                  type="number"
                  placeholder="12345"
                  value={finishForm.sequence}
                  onChange={(e) => setFinishForm(prev => ({ ...prev, sequence: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fulfillment">Fulfillment (if conditional)</Label>
                <Input
                  id="fulfillment"
                  placeholder="Enter fulfillment hex"
                  value={finishForm.fulfillment}
                  onChange={(e) => setFinishForm(prev => ({ ...prev, fulfillment: e.target.value }))}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Finish Escrow
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="cancel" className="space-y-4">
            <form onSubmit={handleCancelEscrow} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancelOwner">Escrow Owner Address *</Label>
                <Input
                  id="cancelOwner"
                  placeholder="rXXXXXXXXXXXXX"
                  value={cancelForm.ownerAddress}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, ownerAddress: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancelSequence">Sequence Number *</Label>
                <Input
                  id="cancelSequence"
                  type="number"
                  placeholder="12345"
                  value={cancelForm.sequence}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, sequence: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} variant="destructive" className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Escrow
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="escrows" className="space-y-4">
            {escrows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No escrows found
              </div>
            ) : (
              <div className="space-y-4">
                {escrows.map((escrow) => (
                  <Card key={`${escrow.account}-${escrow.sequence}`}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Sequence:</span>
                          <Badge variant="outline">{escrow.sequence}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">From:</span>
                          <span className="text-sm">{escrow.account.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">To:</span>
                          <span className="text-sm">{escrow.destination.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Amount:</span>
                          <span className="text-sm">{(parseInt(escrow.amount) / 1_000_000).toFixed(6)} XRP</span>
                        </div>
                        {escrow.finishAfter && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Finish After:
                            </span>
                            <span className="text-sm">{formatTimestamp(escrow.finishAfter)}</span>
                          </div>
                        )}
                        {escrow.cancelAfter && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Cancel After:
                            </span>
                            <span className="text-sm">{formatTimestamp(escrow.cancelAfter)}</span>
                          </div>
                        )}
                        {escrow.condition && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Type:</span>
                            <Badge>Conditional</Badge>
                          </div>
                        )}
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

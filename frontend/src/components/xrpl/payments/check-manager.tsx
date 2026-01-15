import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, DollarSign, X, ExternalLink } from 'lucide-react'
import { XRPLCheckService } from '@/services/wallet/ripple/checks/XRPLCheckService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPL_NETWORKS } from '@/services/wallet/ripple/config/XRPLConfig'
import type { Wallet } from 'xrpl'

interface CheckManagerProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

interface Check {
  checkId: string
  account: string
  destination: string
  sendMax: string | object
  expiration?: number
  invoiceID?: string
}

export const CheckManager: React.FC<CheckManagerProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checks, setChecks] = useState<Check[]>([])
  const [activeTab, setActiveTab] = useState('create')

  const [createForm, setCreateForm] = useState({
    destination: '',
    amount: '',
    expiration: '',
    invoiceId: ''
  })

  const [cashForm, setCashForm] = useState({
    checkId: '',
    amount: '',
    useExactAmount: true
  })

  useEffect(() => {
    loadChecks()
  }, [wallet.address, network])

  const loadChecks = async () => {
    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLCheckService(client)
      const accountChecks = await service.getAccountChecks(wallet.address)
      setChecks(accountChecks)
    } catch (error) {
      console.error('Failed to load checks:', error)
    }
  }

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLCheckService(client)

      const result = await service.createCheck({
        sender: wallet,
        destination: createForm.destination,
        sendMax: (parseFloat(createForm.amount) * 1_000_000).toString(),
        expiration: createForm.expiration
          ? Math.floor(new Date(createForm.expiration).getTime() / 1000)
          : undefined,
        invoiceID: createForm.invoiceId || undefined
      })

      const explorerUrl = `${XRPL_NETWORKS[network].explorerUrl}/transactions/${result.transactionHash}`

      toast({
        title: 'Check Created',
        description: (
          <div className="space-y-2">
            <p>Check ID: {result.checkId.substring(0, 20)}...</p>
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
              View in Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )
      })

      setCreateForm({
        destination: '',
        amount: '',
        expiration: '',
        invoiceId: ''
      })
      loadChecks()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create check',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCashCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLCheckService(client)

      const amount = (parseFloat(cashForm.amount) * 1_000_000).toString()

      const result = cashForm.useExactAmount
        ? await service.cashCheckExact(wallet, cashForm.checkId, amount)
        : await service.cashCheckFlexible(wallet, cashForm.checkId, amount)

      toast({
        title: 'Check Cashed',
        description: `Successfully cashed ${cashForm.amount} XRP`
      })

      setCashForm({ checkId: '', amount: '', useExactAmount: true })
      loadChecks()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cash check',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelCheck = async (checkId: string) => {
    setLoading(true)

    try {
      const client = await xrplClientManager.getClient(network)
      const service = new XRPLCheckService(client)

      await service.cancelCheck(wallet, checkId)

      toast({
        title: 'Check Cancelled',
        description: 'Check has been cancelled'
      })

      loadChecks()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel check',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: string | object): string => {
    if (typeof amount === 'string') {
      return `${(parseInt(amount) / 1_000_000).toFixed(6)} XRP`
    }
    return 'Custom Token'
  }

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check Manager</CardTitle>
        <CardDescription>Create and manage deferred payments with checks</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="cash">Cash</TabsTrigger>
            <TabsTrigger value="checks">My Checks</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleCreateCheck} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Recipient Address *</Label>
                <Input
                  id="destination"
                  placeholder="rXXXXXXXXXXXXX"
                  value={createForm.destination}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, destination: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Maximum Amount (XRP) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  placeholder="100.00"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Maximum amount that can be cashed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration (optional)</Label>
                <Input
                  id="expiration"
                  type="datetime-local"
                  value={createForm.expiration}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, expiration: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceId">Invoice ID (optional)</Label>
                <Input
                  id="invoiceId"
                  placeholder="INV-2024-001"
                  value={createForm.invoiceId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, invoiceId: e.target.value }))}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Check
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="cash" className="space-y-4">
            <form onSubmit={handleCashCheck} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cashCheckId">Check ID *</Label>
                <Input
                  id="cashCheckId"
                  placeholder="Check ID"
                  value={cashForm.checkId}
                  onChange={(e) => setCashForm(prev => ({ ...prev, checkId: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashAmount">Amount (XRP) *</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  step="0.000001"
                  placeholder="100.00"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useExactAmount"
                  checked={cashForm.useExactAmount}
                  onChange={(e) => setCashForm(prev => ({ ...prev, useExactAmount: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="useExactAmount" className="cursor-pointer">
                  Use exact amount (fails if amount not available)
                </Label>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cashing...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Cash Check
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="checks" className="space-y-4">
            {checks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No checks found
              </div>
            ) : (
              <div className="space-y-4">
                {checks.map((check) => (
                  <Card key={check.checkId}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Check ID:</span>
                          <Badge variant="outline">
                            {check.checkId.substring(0, 12)}...
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">From:</span>
                          <span className="text-sm">{check.account.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">To:</span>
                          <span className="text-sm">{check.destination.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Max Amount:</span>
                          <span className="text-sm">{formatAmount(check.sendMax)}</span>
                        </div>
                        {check.expiration && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Expires:</span>
                            <span className="text-sm">{formatTimestamp(check.expiration)}</span>
                          </div>
                        )}
                        {check.invoiceID && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Invoice ID:</span>
                            <span className="text-sm">{check.invoiceID}</span>
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelCheck(check.checkId)}
                          disabled={loading}
                          className="w-full mt-2"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel Check
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

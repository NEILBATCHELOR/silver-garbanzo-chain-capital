import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Send, CheckCircle2 } from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { usePrimaryProject } from '@/hooks/project/usePrimaryProject'
import type { Wallet } from 'xrpl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MPTBalance {
  issuanceId: string
  balance: string
  metadata: {
    ticker: string
    name: string
    icon?: string
  }
  assetScale: number
}

interface MPTTransferProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

export const MPTTransfer: React.FC<MPTTransferProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const { primaryProject } = usePrimaryProject()
  const [balances, setBalances] = useState<MPTBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  
  const [transferData, setTransferData] = useState({
    issuanceId: '',
    destination: '',
    amount: ''
  })

  useEffect(() => {
    loadBalances()
  }, [wallet])

  const loadBalances = async () => {
    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)
      const client = await xrplClientManager.getClient(network)

      // Get MPT balances for this wallet
      const response = await client.request({
        command: 'account_objects',
        account: wallet.address,
        type: 'mptoken',
        ledger_index: 'validated'
      })

      const balanceDetails = await Promise.all(
        response.result.account_objects.map(async (obj: any) => {
          const details = await mptService.getMPTIssuanceDetails(obj.MPTokenIssuanceID)
          return {
            issuanceId: obj.MPTokenIssuanceID,
            balance: obj.MPTAmount,
            metadata: details.metadata,
            assetScale: details.assetScale
          }
        })
      )

      setBalances(balanceDetails)
    } catch (error) {
      console.error('Failed to load balances:', error)
      toast({
        title: 'Error',
        description: 'Failed to load MPT balances',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transferData.issuanceId || !transferData.destination || !transferData.amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      })
      return
    }

    setSending(true)
    try {
      if (!primaryProject?.id) {
        toast({
          title: 'Error',
          description: 'No active project selected',
          variant: 'destructive'
        })
        return
      }

      const mptService = new XRPLMPTService(network)

      const result = await mptService.transferMPT({
        projectId: primaryProject.id,
        senderWallet: wallet,
        destination: transferData.destination,
        mptIssuanceId: transferData.issuanceId,
        amount: transferData.amount
      })

      toast({
        title: 'Transfer Successful',
        description: (
          <div className="space-y-2">
            <p>Sent {transferData.amount} tokens</p>
            <p className="text-xs">Hash: {result.transactionHash.slice(0, 8)}...</p>
          </div>
        )
      })

      // Reset form and reload balances
      setTransferData({
        issuanceId: '',
        destination: '',
        amount: ''
      })
      loadBalances()
    } catch (error) {
      console.error('Transfer failed:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Transfer failed',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }

  const selectedBalance = balances.find(b => b.issuanceId === transferData.issuanceId)

  const formatBalance = (balance: string, assetScale: number): string => {
    const num = parseFloat(balance) / Math.pow(10, assetScale)
    return num.toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer MPT Tokens</CardTitle>
        <CardDescription>
          Send Multi-Purpose Tokens to another address
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : balances.length === 0 ? (
          <Alert>
            <AlertDescription>
              You don't have any MPT tokens to transfer. You need to authorize and receive tokens first.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleTransfer} className="space-y-6">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label htmlFor="token">Select Token</Label>
              <Select
                value={transferData.issuanceId}
                onValueChange={(value) => setTransferData(prev => ({ 
                  ...prev, 
                  issuanceId: value,
                  amount: '' 
                }))}
              >
                <SelectTrigger id="token">
                  <SelectValue placeholder="Choose a token..." />
                </SelectTrigger>
                <SelectContent>
                  {balances.map((balance) => (
                    <SelectItem key={balance.issuanceId} value={balance.issuanceId}>
                      <div className="flex items-center gap-2">
                        {balance.metadata.icon && (
                          <img 
                            src={balance.metadata.icon} 
                            alt={balance.metadata.ticker}
                            className="h-5 w-5 rounded-full"
                          />
                        )}
                        <span>{balance.metadata.name} ({balance.metadata.ticker})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available Balance */}
            {selectedBalance && (
              <Alert>
                <AlertDescription>
                  Available balance: {formatBalance(selectedBalance.balance, selectedBalance.assetScale)} {selectedBalance.metadata.ticker}
                </AlertDescription>
              </Alert>
            )}

            {/* Recipient Address */}
            <div className="space-y-2">
              <Label htmlFor="destination">Recipient Address</Label>
              <Input
                id="destination"
                placeholder="rXXXXXXXXXXXXX"
                value={transferData.destination}
                onChange={(e) => setTransferData(prev => ({ 
                  ...prev, 
                  destination: e.target.value 
                }))}
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={transferData.amount}
                  onChange={(e) => setTransferData(prev => ({ 
                    ...prev, 
                    amount: e.target.value 
                  }))}
                  required
                />
                {selectedBalance && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => {
                      const maxAmount = formatBalance(selectedBalance.balance, selectedBalance.assetScale)
                      setTransferData(prev => ({ 
                        ...prev, 
                        amount: maxAmount 
                      }))
                    }}
                  >
                    Max
                  </Button>
                )}
              </div>
              {selectedBalance && (
                <p className="text-xs text-muted-foreground">
                  {selectedBalance.metadata.ticker} • {selectedBalance.assetScale} decimals
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={sending || !transferData.issuanceId}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Tokens
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

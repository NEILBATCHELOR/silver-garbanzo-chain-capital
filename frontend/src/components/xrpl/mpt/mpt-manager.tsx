import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Loader2, 
  ExternalLink, 
  Users, 
  Coins,
  ArrowUpDown,
  Ban,
  Settings
} from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { usePrimaryProject } from '@/hooks/project/usePrimaryProject'
import type { Wallet } from 'xrpl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MPTIssuance {
  issuanceId: string
  issuer: string
  assetScale: number
  maximumAmount?: string
  outstandingAmount: string
  metadata: {
    ticker: string
    name: string
    desc: string
    icon?: string
  }
  flags: number
}

interface MPTManagerProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

export const MPTManager: React.FC<MPTManagerProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const { primaryProject } = usePrimaryProject()
  const [issuances, setIssuances] = useState<MPTIssuance[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIssuance, setSelectedIssuance] = useState<string | null>(null)
  
  // Clawback dialog state
  const [clawbackOpen, setClawbackOpen] = useState(false)
  const [clawbackData, setClawbackData] = useState({
    holderAddress: '',
    amount: ''
  })

  useEffect(() => {
    loadIssuances()
  }, [wallet])

  const loadIssuances = async () => {
    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)
      const client = await xrplClientManager.getClient(network)

      // Get all MPT objects owned by this wallet
      const response = await client.request({
        command: 'account_objects',
        account: wallet.address,
        type: 'mpt_issuance',
        ledger_index: 'validated'
      })

      const issuanceDetails = await Promise.all(
        response.result.account_objects.map(async (obj: any) => {
          const details = await mptService.getMPTIssuanceDetails(obj.MPTokenIssuanceID)
          return {
            issuanceId: obj.MPTokenIssuanceID,
            ...details
          }
        })
      )

      setIssuances(issuanceDetails)
    } catch (error) {
      console.error('Failed to load issuances:', error)
      toast({
        title: 'Error',
        description: 'Failed to load MPT issuances',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClawback = async () => {
    if (!selectedIssuance) return

    if (!primaryProject?.id) {
      toast({
        title: 'Error',
        description: 'No active project selected',
        variant: 'destructive'
      })
      return
    }

    try {
      const mptService = new XRPLMPTService(network)

      await mptService.clawbackMPT({
        projectId: primaryProject.id,
        issuerWallet: wallet,
        holderAddress: clawbackData.holderAddress,
        mptIssuanceId: selectedIssuance,
        amount: clawbackData.amount
      })

      toast({
        title: 'Clawback Successful',
        description: `Clawed back ${clawbackData.amount} tokens from holder`
      })

      setClawbackOpen(false)
      setClawbackData({ holderAddress: '', amount: '' })
      loadIssuances()
    } catch (error) {
      console.error('Clawback failed:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Clawback failed',
        variant: 'destructive'
      })
    }
  }

  const formatAmount = (amount: string, assetScale: number): string => {
    const num = parseFloat(amount) / Math.pow(10, assetScale)
    return num.toLocaleString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage MPT Tokens</CardTitle>
          <CardDescription>Loading your issued tokens...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (issuances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage MPT Tokens</CardTitle>
          <CardDescription>
            You haven't issued any MPT tokens yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create your first Multi-Purpose Token to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage MPT Tokens</CardTitle>
          <CardDescription>
            Your issued MPT tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {issuances.map((issuance) => (
            <Card key={issuance.issuanceId} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    {issuance.metadata.icon && (
                      <img 
                        src={issuance.metadata.icon} 
                        alt={issuance.metadata.ticker}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {issuance.metadata.name}
                        </h3>
                        <Badge variant="secondary">
                          {issuance.metadata.ticker}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {issuance.metadata.desc}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-semibold">
                        {formatAmount(issuance.outstandingAmount, issuance.assetScale)}
                      </p>
                    </div>
                    {issuance.maximumAmount && (
                      <div>
                        <p className="text-sm text-muted-foreground">Max Supply</p>
                        <p className="text-lg font-semibold">
                          {formatAmount(issuance.maximumAmount, issuance.assetScale)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Decimals</p>
                      <p className="text-lg font-semibold">
                        {issuance.assetScale}
                      </p>
                    </div>
                  </div>

                  {/* Issuance ID */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>ID: {issuance.issuanceId.slice(0, 8)}...{issuance.issuanceId.slice(-6)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(issuance.issuanceId)
                        toast({
                          title: 'Copied',
                          description: 'Issuance ID copied to clipboard'
                        })
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        View Holders
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Token Holders</DialogTitle>
                        <DialogDescription>
                          Accounts holding {issuance.metadata.ticker}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="text-sm text-muted-foreground">
                        Holder list will be displayed here...
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Clawback button (only if enabled) */}
                  {(issuance.flags & 0x00000004) !== 0 && (
                    <Dialog open={clawbackOpen} onOpenChange={setClawbackOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedIssuance(issuance.issuanceId)}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Clawback
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Clawback Tokens</DialogTitle>
                          <DialogDescription>
                            Retrieve tokens from a holder's account
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="holder">Holder Address</Label>
                            <Input
                              id="holder"
                              placeholder="rXXXXXXXXXXXXX"
                              value={clawbackData.holderAddress}
                              onChange={(e) => setClawbackData(prev => ({
                                ...prev,
                                holderAddress: e.target.value
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="0.00"
                              value={clawbackData.amount}
                              onChange={(e) => setClawbackData(prev => ({
                                ...prev,
                                amount: e.target.value
                              }))}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setClawbackOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleClawback}
                          >
                            Clawback Tokens
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Batch Burn Dialog
 * Dialog for burning tokens in multiple amounts
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Package, Plus, X, AlertTriangle } from 'lucide-react'
import { supabase } from '@/infrastructure/database/client'

interface BatchBurnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokens: Array<{
    id: string
    denom: string
    name: string
    symbol: string
    decimals: number
    admin_address: string
  }>
  network: 'mainnet' | 'testnet'
  onSuccess: () => void
}

interface BurnAmount {
  amount: string
}

export function BatchBurnDialog({ 
  open, 
  onOpenChange, 
  tokens, 
  network, 
  onSuccess 
}: BatchBurnDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState('')
  const [amounts, setAmounts] = useState<BurnAmount[]>([{ amount: '' }])
  const [walletId, setWalletId] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  function addAmount() {
    setAmounts([...amounts, { amount: '' }])
  }

  function removeAmount(index: number) {
    setAmounts(amounts.filter((_, i) => i !== index))
  }

  function updateAmount(index: number, value: string) {
    const updated = [...amounts]
    updated[index].amount = value
    setAmounts(updated)
  }

  async function handleSubmit() {
    if (!selectedToken || !walletId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a token and wallet',
        variant: 'destructive'
      })
      return
    }

    if (!confirmed) {
      toast({
        title: 'Confirmation Required',
        description: 'Please confirm you understand this action is irreversible',
        variant: 'destructive'
      })
      return
    }

    const validAmounts = amounts.filter(a => a.amount && Number(a.amount) > 0)
    if (validAmounts.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one valid amount',
        variant: 'destructive'
      })
      return
    }

    const token = tokens.find(t => t.id === selectedToken)
    if (!token) return

    setLoading(true)
    const batchId = crypto.randomUUID()

    try {
      for (let i = 0; i < validAmounts.length; i++) {
        const burnAmount = validAmounts[i]

        const response = await fetch(`/api/injective/native/tokens/${encodeURIComponent(token.denom)}/burn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: burnAmount.amount,
            walletId,
            network
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to burn amount ${i + 1}`)
        }

        const result = await response.json()

        await supabase
          .from('injective_native_token_transactions')
          .insert({
            token_id: token.id,
            denom: token.denom,
            transaction_type: 'batch_burn',
            from_address: token.admin_address,
            amount: burnAmount.amount,
            tx_hash: result.txHash,
            network,
            chain_id: network === 'mainnet' ? 'injective-1' : 'injective-888',
            status: 'confirmed',
            wallet_id: walletId,
            signer_address: token.admin_address,
            batch_id: batchId,
            batch_index: i,
            batch_total: validAmounts.length
          })
      }

      toast({
        title: 'Success',
        description: `Burned ${validAmounts.length} batches of ${token.symbol} tokens`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Batch burn error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete batch burn',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelectedToken('')
    setAmounts([{ amount: '' }])
    setWalletId('')
    setConfirmed(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Batch Burn Tokens
          </DialogTitle>
          <DialogDescription>
            Burn tokens in multiple amounts
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action is irreversible. All burned tokens cannot be recovered.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="token">Token *</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger id="token">
                <SelectValue placeholder="Select token to burn" />
              </SelectTrigger>
              <SelectContent>
                {tokens.map(token => (
                  <SelectItem key={token.id} value={token.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-muted-foreground">- {token.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amounts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Amounts to Burn ({amounts.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAmount}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Amount
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {amounts.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="Amount to burn"
                      value={item.amount}
                      onChange={(e) => updateAmount(index, e.target.value)}
                    />
                  </div>
                  {amounts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAmount(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wallet ID */}
          <div className="space-y-2">
            <Label htmlFor="walletId">Wallet ID *</Label>
            <Input
              id="walletId"
              type="text"
              placeholder="UUID of admin wallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            />
          </div>

          {/* Confirmation */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="confirm" className="text-sm cursor-pointer">
              I understand this action is permanent and cannot be undone
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={loading || !confirmed}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Burning Batch...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Burn Batch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

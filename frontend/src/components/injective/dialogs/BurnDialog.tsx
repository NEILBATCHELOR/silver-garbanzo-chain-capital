/**
 * Burn Dialog
 * Dialog for burning tokens from supply
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
import { Loader2, Minus, AlertTriangle } from 'lucide-react'
import { supabase } from '@/infrastructure/database/client'

interface BurnDialogProps {
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

export function BurnDialog({ 
  open, 
  onOpenChange, 
  tokens, 
  network, 
  onSuccess 
}: BurnDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState('')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit() {
    if (!selectedToken || !amount || !walletId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
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

    const token = tokens.find(t => t.id === selectedToken)
    if (!token) return

    setLoading(true)
    try {
      // Call backend API to burn tokens
      const response = await fetch(`/api/injective/native/tokens/${encodeURIComponent(token.denom)}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          walletId,
          network
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to burn tokens')
      }

      const result = await response.json()

      // Record transaction in database
      await supabase
        .from('injective_native_token_transactions')
        .insert({
          token_id: token.id,
          denom: token.denom,
          transaction_type: 'burn',
          from_address: token.admin_address,
          amount,
          tx_hash: result.txHash,
          network,
          chain_id: network === 'mainnet' ? 'injective-1' : 'injective-888',
          status: 'confirmed',
          wallet_id: walletId,
          signer_address: token.admin_address
        })

      toast({
        title: 'Success',
        description: `Burned ${amount} ${token.symbol} tokens`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Burn error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to burn tokens',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelectedToken('')
    setAmount('')
    setWalletId('')
    setConfirmed(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5" />
            Burn Tokens
          </DialogTitle>
          <DialogDescription>
            Permanently destroy tokens from the total supply
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action is irreversible. Burned tokens cannot be recovered.
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

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="text"
              placeholder="1000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {selectedToken && (
              <p className="text-xs text-muted-foreground">
                Amount in base units (with {tokens.find(t => t.id === selectedToken)?.decimals || 0} decimals)
              </p>
            )}
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
            <p className="text-xs text-muted-foreground">
              Must be the admin wallet for this token
            </p>
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
                Burning...
              </>
            ) : (
              <>
                <Minus className="mr-2 h-4 w-4" />
                Burn Tokens
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Mint Dialog
 * Dialog for minting new tokens to a recipient
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
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus } from 'lucide-react'
import { supabase } from '@/infrastructure/database/client'

interface MintDialogProps {
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

export function MintDialog({ 
  open, 
  onOpenChange, 
  tokens, 
  network, 
  onSuccess 
}: MintDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')

  async function handleSubmit() {
    if (!selectedToken || !amount || !walletId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    const token = tokens.find(t => t.id === selectedToken)
    if (!token) return

    setLoading(true)
    try {
      // Call backend API to mint tokens
      const response = await fetch(`/api/injective/native/tokens/${encodeURIComponent(token.denom)}/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          recipient: recipient || undefined,
          walletId,
          network
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to mint tokens')
      }

      const result = await response.json()

      // Record transaction in database
      await supabase
        .from('injective_native_token_transactions')
        .insert({
          token_id: token.id,
          denom: token.denom,
          transaction_type: 'mint',
          to_address: recipient || token.admin_address,
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
        description: `Minted ${amount} ${token.symbol} tokens`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Mint error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mint tokens',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelectedToken('')
    setRecipient('')
    setAmount('')
    setWalletId('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Mint Tokens
          </DialogTitle>
          <DialogDescription>
            Create new tokens and send to a recipient address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="token">Token *</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger id="token">
                <SelectValue placeholder="Select token to mint" />
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

          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="inj1... (leave empty to mint to admin)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Mint Tokens
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

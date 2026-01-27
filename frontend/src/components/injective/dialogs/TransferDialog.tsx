/**
 * Transfer Dialog
 * Dialog for transferring tokens between addresses
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
import { Loader2, Send } from 'lucide-react'
import { supabase } from '@/infrastructure/database/client'
import { MsgSend } from '@injectivelabs/sdk-ts'
import { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } from '@/services/wallet/injective'

interface TransferDialogProps {
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

export function TransferDialog({ 
  open, 
  onOpenChange, 
  tokens, 
  network, 
  onSuccess 
}: TransferDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')

  async function handleSubmit() {
    if (!selectedToken || !fromAddress || !toAddress || !amount || !walletId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    // Validate addresses
    if (!fromAddress.startsWith('inj1') || fromAddress.length !== 42) {
      toast({
        title: 'Invalid Address',
        description: 'From address must be a valid Injective address (inj1...)',
        variant: 'destructive'
      })
      return
    }

    if (!toAddress.startsWith('inj1') || toAddress.length !== 42) {
      toast({
        title: 'Invalid Address',
        description: 'To address must be a valid Injective address (inj1...)',
        variant: 'destructive'
      })
      return
    }

    const token = tokens.find(t => t.id === selectedToken)
    if (!token) return

    setLoading(true)
    try {
      // Get the appropriate service
      const service = network === 'mainnet' 
        ? injectiveNativeTokenServiceMainnet 
        : injectiveNativeTokenServiceTestnet

      // For now, we'll need to implement transfer in the service
      // This is a placeholder that shows the structure
      const response = await fetch('/api/injective/native/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denom: token.denom,
          fromAddress,
          toAddress,
          amount,
          walletId,
          network
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to transfer tokens')
      }

      const result = await response.json()

      // Record transaction in database
      await supabase
        .from('injective_native_token_transactions')
        .insert({
          token_id: token.id,
          denom: token.denom,
          transaction_type: 'transfer',
          from_address: fromAddress,
          to_address: toAddress,
          amount,
          tx_hash: result.txHash,
          network,
          chain_id: network === 'mainnet' ? 'injective-1' : 'injective-888',
          status: 'confirmed',
          wallet_id: walletId,
          signer_address: fromAddress
        })

      toast({
        title: 'Success',
        description: `Transferred ${amount} ${token.symbol} tokens`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Transfer error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to transfer tokens',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelectedToken('')
    setFromAddress('')
    setToAddress('')
    setAmount('')
    setWalletId('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Transfer Tokens
          </DialogTitle>
          <DialogDescription>
            Send tokens from one address to another
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="token">Token *</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger id="token">
                <SelectValue placeholder="Select token to transfer" />
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

          {/* From Address */}
          <div className="space-y-2">
            <Label htmlFor="fromAddress">From Address *</Label>
            <Input
              id="fromAddress"
              type="text"
              placeholder="inj1..."
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
            />
          </div>

          {/* To Address */}
          <div className="space-y-2">
            <Label htmlFor="toAddress">To Address *</Label>
            <Input
              id="toAddress"
              type="text"
              placeholder="inj1..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
            />
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
              placeholder="UUID of sender wallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must be the wallet controlling the from address
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
                Transferring...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Transfer Tokens
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

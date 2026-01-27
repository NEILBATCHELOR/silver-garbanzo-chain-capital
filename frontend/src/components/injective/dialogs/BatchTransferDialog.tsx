/**
 * Batch Transfer Dialog
 * Dialog for transferring tokens to multiple recipients
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Package, Plus, X } from 'lucide-react'
import { supabase } from '@/infrastructure/database/client'

interface BatchTransferDialogProps {
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

interface TransferRecipient {
  address: string
  amount: string
}

export function BatchTransferDialog({ 
  open, 
  onOpenChange, 
  tokens, 
  network, 
  onSuccess 
}: BatchTransferDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [recipients, setRecipients] = useState<TransferRecipient[]>([
    { address: '', amount: '' }
  ])
  const [walletId, setWalletId] = useState('')
  const [csvInput, setCsvInput] = useState('')

  function addRecipient() {
    setRecipients([...recipients, { address: '', amount: '' }])
  }

  function removeRecipient(index: number) {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  function updateRecipient(index: number, field: 'address' | 'amount', value: string) {
    const updated = [...recipients]
    updated[index][field] = value
    setRecipients(updated)
  }

  function parseCsv() {
    if (!csvInput.trim()) return

    try {
      const lines = csvInput.trim().split('\n')
      const parsed = lines.map(line => {
        const [address, amount] = line.split(',').map(s => s.trim())
        return { address, amount }
      })

      setRecipients(parsed)
      setCsvInput('')
      
      toast({
        title: 'CSV Imported',
        description: `Loaded ${parsed.length} recipients`
      })
    } catch (error) {
      toast({
        title: 'CSV Parse Error',
        description: 'Invalid CSV format. Use: address,amount per line',
        variant: 'destructive'
      })
    }
  }

  async function handleSubmit() {
    if (!selectedToken || !fromAddress || !walletId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    const validRecipients = recipients.filter(r => r.address && r.amount)
    if (validRecipients.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one valid recipient',
        variant: 'destructive'
      })
      return
    }

    const token = tokens.find(t => t.id === selectedToken)
    if (!token) return

    setLoading(true)
    const batchId = crypto.randomUUID()

    try {
      for (let i = 0; i < validRecipients.length; i++) {
        const recipient = validRecipients[i]

        const response = await fetch('/api/injective/native/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            denom: token.denom,
            fromAddress,
            toAddress: recipient.address,
            amount: recipient.amount,
            walletId,
            network
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to transfer to ${recipient.address}`)
        }

        const result = await response.json()

        await supabase
          .from('injective_native_token_transactions')
          .insert({
            token_id: token.id,
            denom: token.denom,
            transaction_type: 'batch_transfer',
            from_address: fromAddress,
            to_address: recipient.address,
            amount: recipient.amount,
            tx_hash: result.txHash,
            network,
            chain_id: network === 'mainnet' ? 'injective-1' : 'injective-888',
            status: 'confirmed',
            wallet_id: walletId,
            signer_address: fromAddress,
            batch_id: batchId,
            batch_index: i,
            batch_total: validRecipients.length
          })
      }

      toast({
        title: 'Success',
        description: `Transferred ${validRecipients.length} batches of ${token.symbol} tokens`,
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Batch transfer error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete batch transfer',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelectedToken('')
    setFromAddress('')
    setRecipients([{ address: '', amount: '' }])
    setWalletId('')
    setCsvInput('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Batch Transfer Tokens
          </DialogTitle>
          <DialogDescription>
            Transfer tokens to multiple recipients at once
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

          {/* CSV Import */}
          <div className="space-y-2">
            <Label htmlFor="csv">Or Import CSV</Label>
            <div className="flex gap-2">
              <Textarea
                id="csv"
                placeholder="inj1...,1000000&#10;inj1...,500000"
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                rows={3}
              />
              <Button 
                variant="outline" 
                onClick={parseCsv}
                disabled={!csvInput}
              >
                Import
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: address,amount (one per line)
            </p>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recipients ({recipients.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRecipient}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Recipient
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="inj1..."
                      value={recipient.address}
                      onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      placeholder="Amount"
                      value={recipient.amount}
                      onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                    />
                  </div>
                  {recipients.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(index)}
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
              placeholder="UUID of sender wallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            />
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
                Transferring Batch...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Transfer Batch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

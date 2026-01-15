import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Send } from 'lucide-react'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Wallet, Payment } from 'xrpl'

interface XRPPaymentFormProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

export const XRPPaymentForm: React.FC<XRPPaymentFormProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    destination: '',
    amount: '',
    destinationTag: '',
    memo: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.destination || !formData.amount) {
      toast({
        title: 'Validation Error',
        description: 'Destination and amount are required',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const client = await xrplClientManager.getClient(network)

      const payment: Payment = {
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: formData.destination,
        Amount: (parseFloat(formData.amount) * 1_000_000).toString(),
        DestinationTag: formData.destinationTag ? parseInt(formData.destinationTag) : undefined,
        Memos: formData.memo ? [{
          Memo: {
            MemoData: Buffer.from(formData.memo).toString('hex')
          }
        }] : undefined
      }

      const response = await client.submitAndWait(payment, {
        wallet,
        autofill: true
      })

      const meta = response.result.meta
      const isSuccess = typeof meta === 'object' && 'TransactionResult' in meta 
        ? meta.TransactionResult === 'tesSUCCESS'
        : false

      if (isSuccess) {
        toast({
          title: 'Payment Sent',
          description: `Successfully sent ${formData.amount} XRP`
        })
        setFormData({ destination: '', amount: '', destinationTag: '', memo: '' })
      } else {
        const errorMsg = typeof meta === 'object' && 'TransactionResult' in meta 
          ? meta.TransactionResult 
          : 'Payment failed'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('Payment failed:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Payment failed',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send XRP Payment</CardTitle>
        <CardDescription>Transfer XRP to another address</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Recipient Address *</Label>
            <Input
              id="destination"
              placeholder="rXXXXXXXXXXXXX"
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (XRP) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationTag">Destination Tag (optional)</Label>
            <Input
              id="destinationTag"
              type="number"
              placeholder="12345"
              value={formData.destinationTag}
              onChange={(e) => setFormData(prev => ({ ...prev, destinationTag: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">Memo (optional)</Label>
            <Input
              id="memo"
              placeholder="Payment for services"
              value={formData.memo}
              onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Payment
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

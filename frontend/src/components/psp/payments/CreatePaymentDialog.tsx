/**
 * Create Payment Dialog Component
 * Dialog for creating fiat or crypto payments
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { CreateFiatPaymentRequest, CreateCryptoPaymentRequest, PaymentRail } from '@/types/psp'
import type { PspExternalAccount } from '@/types/psp'

interface CreatePaymentDialogProps {
  open: boolean
  onClose: () => void
  onSubmitFiat: (data: CreateFiatPaymentRequest) => Promise<void>
  onSubmitCrypto: (data: CreateCryptoPaymentRequest) => Promise<void>
  projectId: string
  fiatAccounts: PspExternalAccount[]
  cryptoAccounts: PspExternalAccount[]
}

export function CreatePaymentDialog({
  open,
  onClose,
  onSubmitFiat,
  onSubmitCrypto,
  projectId,
  fiatAccounts,
  cryptoAccounts
}: CreatePaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [paymentType, setPaymentType] = useState<'fiat' | 'crypto'>('fiat')
  
  const [fiatData, setFiatData] = useState<Partial<CreateFiatPaymentRequest>>({
    project_id: projectId,
    payment_rail: 'ach',
    idempotency_key: `pmt_${Date.now()}`
  })
  
  const [cryptoData, setCryptoData] = useState<Partial<CreateCryptoPaymentRequest>>({
    project_id: projectId,
    network: 'ethereum',
    idempotency_key: `pmt_${Date.now()}`
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (paymentType === 'fiat') {
        if (!fiatData.source_wallet_id || !fiatData.destination_account_id || !fiatData.amount) {
          return
        }
        await onSubmitFiat(fiatData as CreateFiatPaymentRequest)
      } else {
        if (!cryptoData.source_wallet_id || !cryptoData.destination_account_id || !cryptoData.amount || !cryptoData.network) {
          return
        }
        await onSubmitCrypto(cryptoData as CreateCryptoPaymentRequest)
      }
      onClose()
      resetForm()
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFiatData({
      project_id: projectId,
      payment_rail: 'ach',
      idempotency_key: `pmt_${Date.now()}`
    })
    setCryptoData({
      project_id: projectId,
      network: 'ethereum',
      idempotency_key: `pmt_${Date.now()}`
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Payment</DialogTitle>
          <DialogDescription>
            Send a fiat or cryptocurrency payment
          </DialogDescription>
        </DialogHeader>

        <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as 'fiat' | 'crypto')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fiat">Fiat Payment</TabsTrigger>
            <TabsTrigger value="crypto">Crypto Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="fiat" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Destination Account *</Label>
              <Select
                value={fiatData.destination_account_id}
                onValueChange={(value) => setFiatData({ ...fiatData, destination_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {fiatAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.description} (****{account.account_number_last4})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Rail *</Label>
              <Select
                value={fiatData.payment_rail}
                onValueChange={(value) => setFiatData({ ...fiatData, payment_rail: value as PaymentRail })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="wire">Wire</SelectItem>
                  <SelectItem value="rtp">RTP</SelectItem>
                  <SelectItem value="fednow">FedNow</SelectItem>
                  <SelectItem value="push_to_card">Push to Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (USD) *</Label>
              <Input
                type="number"
                step="0.01"
                value={fiatData.amount || ''}
                onChange={(e) => setFiatData({ ...fiatData, amount: e.target.value })}
                placeholder="100.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Memo (Optional)</Label>
              <Textarea
                value={fiatData.memo || ''}
                onChange={(e) => setFiatData({ ...fiatData, memo: e.target.value })}
                placeholder="Payment description"
              />
            </div>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Destination Account *</Label>
              <Select
                value={cryptoData.destination_account_id}
                onValueChange={(value) => setCryptoData({ ...cryptoData, destination_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {cryptoAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.description} ({account.network})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Network *</Label>
              <Select
                value={cryptoData.network}
                onValueChange={(value) => setCryptoData({ ...cryptoData, network: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="stellar">Stellar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.000001"
                value={cryptoData.amount || ''}
                onChange={(e) => setCryptoData({ ...cryptoData, amount: e.target.value })}
                placeholder="1.000000"
              />
            </div>

            <div className="space-y-2">
              <Label>Memo (Optional)</Label>
              <Textarea
                value={cryptoData.memo || ''}
                onChange={(e) => setCryptoData({ ...cryptoData, memo: e.target.value })}
                placeholder="Payment description"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating Payment...' : 'Create Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

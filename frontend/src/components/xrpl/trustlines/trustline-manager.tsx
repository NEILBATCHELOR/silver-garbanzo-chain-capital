/**
 * Trust Line Manager Component
 * Create and manage trust lines
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLTrustLineService } from '@/services/wallet/ripple/tokens'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TrustLineManagerProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function TrustLineManager({ wallet, network, projectId }: TrustLineManagerProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    currency: '',
    issuer: '',
    limit: ''
  })

  const handleCreate = async () => {
    try {
      setIsCreating(true)

      const trustLineService = new XRPLTrustLineService(network)

      // Pass single TrustLineParams object as per service signature
      await trustLineService.createTrustLine({
        holderWallet: wallet,
        issuerAddress: formData.issuer,
        currencyCode: formData.currency,
        limit: formData.limit
      })

      toast({
        title: 'Trust Line Created',
        description: `Trust line for ${formData.currency} created`
      })

      setFormData({ currency: '', issuer: '', limit: '' })

    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust Line Manager</CardTitle>
        <CardDescription>
          Create and configure trust lines for tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Trust lines allow you to hold and trade tokens issued on XRPL
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div>
            <Label>Currency Code</Label>
            <Input
              placeholder="USD"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            />
          </div>

          <div>
            <Label>Issuer Address</Label>
            <Input
              placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
            />
          </div>

          <div>
            <Label>Trust Limit</Label>
            <Input
              type="number"
              placeholder="1000000"
              value={formData.limit}
              onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
            />
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={isCreating || !formData.currency || !formData.issuer || !formData.limit}
          className="w-full"
        >
          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="h-4 w-4 mr-2" />
          Create Trust Line
        </Button>
      </CardContent>
    </Card>
  )
}

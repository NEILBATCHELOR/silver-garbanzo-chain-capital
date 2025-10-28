/**
 * Crypto Account Form Component
 * Form for adding cryptocurrency wallet addresses
 */

import { useState } from 'react'
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
import type { CreateCryptoAccountRequest } from '@/types/psp'

interface CryptoAccountFormProps {
  projectId: string
  onSubmit: (data: CreateCryptoAccountRequest) => Promise<void>
  loading: boolean
}

const NETWORKS = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
  { value: 'stellar', label: 'Stellar' },
  { value: 'bitcoin', label: 'Bitcoin' }
]

export function CryptoAccountForm({ projectId, onSubmit, loading }: CryptoAccountFormProps) {
  const [data, setData] = useState<Partial<CreateCryptoAccountRequest>>({
    project_id: projectId,
    network: 'ethereum'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!data.network || !data.wallet_address || !data.description) {
      return
    }
    
    await onSubmit(data as CreateCryptoAccountRequest)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Account Description *</Label>
        <Input
          id="description"
          value={data.description || ''}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder="Treasury USDC Wallet"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="network">Network *</Label>
        <Select
          value={data.network}
          onValueChange={(value) => setData({ ...data, network: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NETWORKS.map((network) => (
              <SelectItem key={network.value} value={network.value}>
                {network.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wallet_address">Wallet Address *</Label>
        <Input
          id="wallet_address"
          value={data.wallet_address || ''}
          onChange={(e) => setData({ ...data, wallet_address: e.target.value })}
          placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Enter the wallet address where you want to receive payments
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding Account...' : 'Add Account'}
        </Button>
      </div>
    </form>
  )
}

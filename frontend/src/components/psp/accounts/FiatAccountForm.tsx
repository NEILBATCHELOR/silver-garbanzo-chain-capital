/**
 * Fiat Account Form Component
 * Form for adding ACH or Wire bank accounts
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CreateAchAccountRequest, CreateWireAccountRequest, AccountClassification } from '@/types/psp'

interface FiatAccountFormProps {
  projectId: string
  onSubmit: (data: CreateAchAccountRequest | CreateWireAccountRequest, type: 'ach' | 'wire') => Promise<void>
  loading: boolean
}

export function FiatAccountForm({ projectId, onSubmit, loading }: FiatAccountFormProps) {
  const [accountType, setAccountType] = useState<'ach' | 'wire'>('ach')
  
  const [achData, setAchData] = useState<Partial<CreateAchAccountRequest>>({
    project_id: projectId,
    account_classification: 'checking'
  })
  
  const [wireData, setWireData] = useState<Partial<CreateWireAccountRequest>>({
    project_id: projectId
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (accountType === 'ach') {
      if (!achData.routing_number || !achData.account_number || !achData.account_holder_name || !achData.description) {
        return
      }
      await onSubmit(achData as CreateAchAccountRequest, 'ach')
    } else {
      if (!wireData.routing_number || !wireData.account_number || !wireData.account_holder_name || !wireData.description) {
        return
      }
      await onSubmit(wireData as CreateWireAccountRequest, 'wire')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={accountType} onValueChange={(v) => setAccountType(v as 'ach' | 'wire')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ach">ACH</TabsTrigger>
          <TabsTrigger value="wire">Wire</TabsTrigger>
        </TabsList>

        <TabsContent value="ach" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="ach-description">Account Description *</Label>
            <Input
              id="ach-description"
              value={achData.description || ''}
              onChange={(e) => setAchData({ ...achData, description: e.target.value })}
              placeholder="Primary Business Account"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ach-holder">Account Holder Name *</Label>
            <Input
              id="ach-holder"
              value={achData.account_holder_name || ''}
              onChange={(e) => setAchData({ ...achData, account_holder_name: e.target.value })}
              placeholder="Acme Corporation"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ach-routing">Routing Number *</Label>
              <Input
                id="ach-routing"
                value={achData.routing_number || ''}
                onChange={(e) => setAchData({ ...achData, routing_number: e.target.value })}
                placeholder="021000021"
                maxLength={9}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ach-account">Account Number *</Label>
              <Input
                id="ach-account"
                type="password"
                value={achData.account_number || ''}
                onChange={(e) => setAchData({ ...achData, account_number: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ach-classification">Account Type *</Label>
            <Select
              value={achData.account_classification}
              onValueChange={(value) => setAchData({ ...achData, account_classification: value as AccountClassification })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="wire" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="wire-description">Account Description *</Label>
            <Input
              id="wire-description"
              value={wireData.description || ''}
              onChange={(e) => setWireData({ ...wireData, description: e.target.value })}
              placeholder="Primary Wire Account"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wire-holder">Account Holder Name *</Label>
            <Input
              id="wire-holder"
              value={wireData.account_holder_name || ''}
              onChange={(e) => setWireData({ ...wireData, account_holder_name: e.target.value })}
              placeholder="Acme Corporation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wire-bank">Bank Name *</Label>
            <Input
              id="wire-bank"
              value={wireData.bank_name || ''}
              onChange={(e) => setWireData({ ...wireData, bank_name: e.target.value })}
              placeholder="Chase Bank"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wire-routing">Routing Number *</Label>
              <Input
                id="wire-routing"
                value={wireData.routing_number || ''}
                onChange={(e) => setWireData({ ...wireData, routing_number: e.target.value })}
                placeholder="021000021"
                maxLength={9}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wire-account">Account Number *</Label>
              <Input
                id="wire-account"
                type="password"
                value={wireData.account_number || ''}
                onChange={(e) => setWireData({ ...wireData, account_number: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding Account...' : 'Add Account'}
        </Button>
      </div>
    </form>
  )
}

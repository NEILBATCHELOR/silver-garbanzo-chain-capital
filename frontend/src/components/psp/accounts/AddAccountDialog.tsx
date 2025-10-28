/**
 * Add Account Dialog Component
 * Dialog for selecting account type to add
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FiatAccountForm } from './FiatAccountForm'
import { CryptoAccountForm } from './CryptoAccountForm'
import { Building2, Coins } from 'lucide-react'
import type {
  CreateAchAccountRequest,
  CreateWireAccountRequest,
  CreateCryptoAccountRequest
} from '@/types/psp'

interface AddAccountDialogProps {
  open: boolean
  onClose: () => void
  onSubmitAch: (data: CreateAchAccountRequest) => Promise<void>
  onSubmitWire: (data: CreateWireAccountRequest) => Promise<void>
  onSubmitCrypto: (data: CreateCryptoAccountRequest) => Promise<void>
  projectId: string
}

export function AddAccountDialog({
  open,
  onClose,
  onSubmitAch,
  onSubmitWire,
  onSubmitCrypto,
  projectId
}: AddAccountDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleFiatSubmit = async (data: CreateAchAccountRequest | CreateWireAccountRequest, type: 'ach' | 'wire') => {
    setLoading(true)
    try {
      if (type === 'ach') {
        await onSubmitAch(data as CreateAchAccountRequest)
      } else {
        await onSubmitWire(data as CreateWireAccountRequest)
      }
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleCryptoSubmit = async (data: CreateCryptoAccountRequest) => {
    setLoading(true)
    try {
      await onSubmitCrypto(data)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Connected Account</DialogTitle>
          <DialogDescription>
            Connect an external account to send or receive payments
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fiat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fiat" className="gap-2">
              <Building2 className="h-4 w-4" />
              Fiat Account
            </TabsTrigger>
            <TabsTrigger value="crypto" className="gap-2">
              <Coins className="h-4 w-4" />
              Crypto Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fiat" className="mt-6">
            <FiatAccountForm
              projectId={projectId}
              onSubmit={handleFiatSubmit}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="crypto" className="mt-6">
            <CryptoAccountForm
              projectId={projectId}
              onSubmit={handleCryptoSubmit}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

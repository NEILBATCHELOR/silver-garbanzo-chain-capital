/**
 * Key Rotation Manager Component
 * Manage regular key rotation for account security
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLKeyRotationService } from '@/services/wallet/ripple/security'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Key, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface KeyRotationManagerProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function KeyRotationManager({ wallet, network, projectId }: KeyRotationManagerProps) {
  const { toast } = useToast()
  const [isRotating, setIsRotating] = useState(false)
  const [newKeyAddress, setNewKeyAddress] = useState('')

  const handleRotate = async () => {
    try {
      setIsRotating(true)

      const client = await xrplClientManager.getClient(network)
      const rotationService = new XRPLKeyRotationService(client)

      await rotationService.setRegularKey(wallet, {
        regularKey: newKeyAddress
      })

      toast({
        title: 'Key Rotated',
        description: 'Regular key has been updated'
      })

      setNewKeyAddress('')

    } catch (error) {
      toast({
        title: 'Rotation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsRotating(false)
    }
  }

  const handleRemove = async () => {
    try {
      setIsRotating(true)

      const client = await xrplClientManager.getClient(network)
      const rotationService = new XRPLKeyRotationService(client)

      await rotationService.removeRegularKey(wallet)

      toast({
        title: 'Regular Key Removed',
        description: 'Account is now using master key only'
      })

    } catch (error) {
      toast({
        title: 'Removal Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsRotating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Key Rotation Manager
        </CardTitle>
        <CardDescription>
          Manage regular key for enhanced security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Regular keys allow you to sign transactions without exposing your master key
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div>
            <Label>New Regular Key Address</Label>
            <Input
              placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
              value={newKeyAddress}
              onChange={(e) => setNewKeyAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleRotate}
            disabled={isRotating || !newKeyAddress}
            className="flex-1"
          >
            {isRotating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="h-4 w-4 mr-2" />
            Set Regular Key
          </Button>

          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isRotating}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

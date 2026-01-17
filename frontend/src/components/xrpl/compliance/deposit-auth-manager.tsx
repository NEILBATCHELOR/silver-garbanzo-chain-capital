/**
 * Deposit Authorization Manager Component
 * Manage deposit pre-authorization whitelist
 */

import React, { useState, useEffect } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLDepositPreAuthService } from '@/services/wallet/ripple/compliance'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, UserPlus, UserMinus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DepositAuthManagerProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function DepositAuthManager({ wallet, network, projectId }: DepositAuthManagerProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [address, setAddress] = useState('')
  const [authorizedAddresses, setAuthorizedAddresses] = useState<string[]>([])

  const handleAuthorize = async () => {
    try {
      setIsProcessing(true)

      const client = await xrplClientManager.getClient(network)
      const authService = new XRPLDepositPreAuthService(client)

      await authService.authorizeDepositor(wallet, {
        authorizedAddress: address
      })

      setAuthorizedAddresses([...authorizedAddresses, address])

      toast({
        title: 'Address Authorized',
        description: `${address} can now send deposits`
      })

      setAddress('')

    } catch (error) {
      toast({
        title: 'Authorization Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevoke = async (authorizedAddress: string) => {
    try {
      setIsProcessing(true)

      const client = await xrplClientManager.getClient(network)
      const authService = new XRPLDepositPreAuthService(client)

      await authService.revokeAuthorization(wallet, {
        unauthorizedAddress: authorizedAddress
      })

      setAuthorizedAddresses(authorizedAddresses.filter(a => a !== authorizedAddress))

      toast({
        title: 'Authorization Revoked',
        description: `${authorizedAddress} can no longer send deposits`
      })

    } catch (error) {
      toast({
        title: 'Revocation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit Authorization</CardTitle>
        <CardDescription>
          Manage whitelist for incoming deposits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            When deposit authorization is enabled, only whitelisted addresses can send you payments.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Authorize Address</Label>
            <div className="flex gap-2">
              <Input
                placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Button
                onClick={handleAuthorize}
                disabled={isProcessing || !address}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Authorized Addresses</Label>
            {authorizedAddresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No authorized addresses</p>
            ) : (
              <div className="space-y-2">
                {authorizedAddresses.map((addr) => (
                  <div key={addr} className="flex items-center justify-between p-3 border rounded-lg">
                    <code className="text-sm">{addr}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(addr)}
                      disabled={isProcessing}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

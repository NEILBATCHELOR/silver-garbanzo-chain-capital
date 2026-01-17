/**
 * Account Config Component
 * Configure account-level security settings
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLAccountConfigurationService } from '@/services/wallet/ripple/advanced'
import { AccountSetAsfFlags } from '@/services/wallet/ripple/advanced/types'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Shield } from 'lucide-react'

interface AccountConfigProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function AccountConfig({ wallet, network, projectId }: AccountConfigProps) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [settings, setSettings] = useState({
    requireDestTag: false,
    disallowXRP: false,
    depositAuth: false
  })

  const handleUpdate = async () => {
    try {
      setIsUpdating(true)

      const client = await xrplClientManager.getClient(network)
      const configService = new XRPLAccountConfigurationService(client)

      // Set or clear require destination tag flag
      if (settings.requireDestTag) {
        await configService.setAccountFlag(wallet, AccountSetAsfFlags.asfRequireDest)
      } else {
        await configService.clearAccountFlag(wallet, AccountSetAsfFlags.asfRequireDest)
      }

      // Set or clear disallow XRP flag
      if (settings.disallowXRP) {
        await configService.setAccountFlag(wallet, AccountSetAsfFlags.asfDisallowXRP)
      } else {
        await configService.clearAccountFlag(wallet, AccountSetAsfFlags.asfDisallowXRP)
      }

      // Set or clear deposit auth flag
      if (settings.depositAuth) {
        await configService.setAccountFlag(wallet, AccountSetAsfFlags.asfDepositAuth)
      } else {
        await configService.clearAccountFlag(wallet, AccountSetAsfFlags.asfDepositAuth)
      }

      toast({
        title: 'Settings Updated',
        description: 'Account configuration has been updated'
      })

    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Account Configuration
        </CardTitle>
        <CardDescription>
          Configure account-level security settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Require Destination Tag</Label>
            <p className="text-xs text-muted-foreground">Require a tag on incoming payments</p>
          </div>
          <Switch
            checked={settings.requireDestTag}
            onCheckedChange={(checked) => setSettings({ ...settings, requireDestTag: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Disallow Incoming XRP</Label>
            <p className="text-xs text-muted-foreground">Block direct XRP payments to this account</p>
          </div>
          <Switch
            checked={settings.disallowXRP}
            onCheckedChange={(checked) => setSettings({ ...settings, disallowXRP: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Deposit Authorization</Label>
            <p className="text-xs text-muted-foreground">Require pre-authorization for deposits</p>
          </div>
          <Switch
            checked={settings.depositAuth}
            onCheckedChange={(checked) => setSettings({ ...settings, depositAuth: checked })}
          />
        </div>

        <Button onClick={handleUpdate} disabled={isUpdating} className="w-full">
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Settings
        </Button>
      </CardContent>
    </Card>
  )
}

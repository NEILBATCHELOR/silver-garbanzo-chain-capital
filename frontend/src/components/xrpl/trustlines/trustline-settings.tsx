/**
 * Trust Line Settings Component
 * Configure trust line preferences
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Settings } from 'lucide-react'

interface TrustLineSettingsProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function TrustLineSettings({ wallet, network, projectId }: TrustLineSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [settings, setSettings] = useState({
    allowRippling: false,
    freezeTrustLine: false,
    authorizedTrustLine: false
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Trust Line Settings
        </CardTitle>
        <CardDescription>
          Configure trust line preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Allow Rippling</Label>
            <p className="text-xs text-muted-foreground">Allow tokens to flow through this account</p>
          </div>
          <Switch
            checked={settings.allowRippling}
            onCheckedChange={(checked) => setSettings({ ...settings, allowRippling: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Freeze Trust Line</Label>
            <p className="text-xs text-muted-foreground">Freeze this specific trust line</p>
          </div>
          <Switch
            checked={settings.freezeTrustLine}
            onCheckedChange={(checked) => setSettings({ ...settings, freezeTrustLine: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Authorized Trust Line</Label>
            <p className="text-xs text-muted-foreground">Require authorization for this trust line</p>
          </div>
          <Switch
            checked={settings.authorizedTrustLine}
            onCheckedChange={(checked) => setSettings({ ...settings, authorizedTrustLine: checked })}
          />
        </div>

        <Button disabled={isUpdating} className="w-full">
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  )
}

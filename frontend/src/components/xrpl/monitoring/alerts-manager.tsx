/**
 * Alerts Manager Component
 * Configure and view account alerts
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, AlertTriangle, Info } from 'lucide-react'

interface AlertsManagerProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function AlertsManager({ wallet, network, projectId }: AlertsManagerProps) {
  const [alerts, setAlerts] = useState({
    largeTransactions: true,
    trustLineChanges: true,
    accountSettings: false
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert Settings
        </CardTitle>
        <CardDescription>Configure account notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Large Transactions</Label>
            <p className="text-xs text-muted-foreground">Alert on transactions over 1000 XRP</p>
          </div>
          <Switch
            checked={alerts.largeTransactions}
            onCheckedChange={(checked) => setAlerts({ ...alerts, largeTransactions: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Trust Line Changes</Label>
            <p className="text-xs text-muted-foreground">Alert when trust lines are created/removed</p>
          </div>
          <Switch
            checked={alerts.trustLineChanges}
            onCheckedChange={(checked) => setAlerts({ ...alerts, trustLineChanges: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Account Settings</Label>
            <p className="text-xs text-muted-foreground">Alert on account configuration changes</p>
          </div>
          <Switch
            checked={alerts.accountSettings}
            onCheckedChange={(checked) => setAlerts({ ...alerts, accountSettings: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}

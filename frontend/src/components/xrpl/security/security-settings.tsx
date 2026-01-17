/**
 * Security Settings Component
 * Overview of account security settings
 */

import React from 'react'
import type { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Key, Lock, CheckCircle2 } from 'lucide-react'

interface SecuritySettingsProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function SecuritySettings({ wallet, network, projectId }: SecuritySettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Overview
        </CardTitle>
        <CardDescription>
          Your account security status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Master Key</p>
                <p className="text-xs text-muted-foreground">Primary account key</p>
              </div>
            </div>
            <Badge variant="default">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Regular Key</p>
                <p className="text-xs text-muted-foreground">Transaction signing key</p>
              </div>
            </div>
            <Badge variant="secondary">Not Set</Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Multi-Signature</p>
                <p className="text-xs text-muted-foreground">Signer list configuration</p>
              </div>
            </div>
            <Badge variant="secondary">Disabled</Badge>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Security Recommendations</p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Enable regular key for day-to-day transactions</li>
            <li>• Consider multi-signature for high-value accounts</li>
            <li>• Regularly review account settings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

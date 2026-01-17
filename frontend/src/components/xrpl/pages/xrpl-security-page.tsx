/**
 * XRPL Security Page
 * Key rotation and account security settings
 */

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Wallet } from 'xrpl'

// Import security components
import { KeyRotationManager } from '../security/key-rotation-manager'
import { AccountConfig } from '../security/account-config'
import { SecuritySettings } from '../security/security-settings'

interface XRPLSecurityPageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLSecurityPage({ wallet, network, projectId }: XRPLSecurityPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage key rotation and account security configurations
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Security Overview</TabsTrigger>
          <TabsTrigger value="key-rotation">Key Rotation</TabsTrigger>
          <TabsTrigger value="account-config">Account Config</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Security Overview</CardTitle>
              <CardDescription>
                Current security status and recommended actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SecuritySettings wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="key-rotation">
          <Card>
            <CardHeader>
              <CardTitle>Key Rotation Management</CardTitle>
              <CardDescription>
                Rotate regular keys for enhanced security without changing master keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KeyRotationManager wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account-config">
          <Card>
            <CardHeader>
              <CardTitle>Account Configuration</CardTitle>
              <CardDescription>
                Configure account settings, flags, and security options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountConfig wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

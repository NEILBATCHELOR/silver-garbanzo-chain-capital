/**
 * XRPL Trust Lines Page
 * Manage token trust line relationships
 */

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Wallet } from 'xrpl'

// Import trust line components
import { TrustLineManager } from '../trustlines/trustline-manager'
import { TrustLineList } from '../trustlines/trustline-list'
import { TrustLineSettings } from '../trustlines/trustline-settings'

interface XRPLTrustLinesPageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLTrustLinesPage({ wallet, network, projectId }: XRPLTrustLinesPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trust Lines</h2>
        <p className="text-muted-foreground">
          Manage token trust line relationships and settings
        </p>
      </div>

      <Tabs defaultValue="manager" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manager">Trust Line Manager</TabsTrigger>
          <TabsTrigger value="list">My Trust Lines</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="manager">
          <Card>
            <CardHeader>
              <CardTitle>Trust Line Manager</CardTitle>
              <CardDescription>
                Create and manage trust lines for tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrustLineManager wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>My Trust Lines</CardTitle>
              <CardDescription>
                View all your active trust line relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrustLineList wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Trust Line Settings</CardTitle>
              <CardDescription>
                Configure trust line limits and authorization settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrustLineSettings wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

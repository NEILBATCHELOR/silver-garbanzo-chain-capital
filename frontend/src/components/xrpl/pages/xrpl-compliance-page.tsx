/**
 * XRPL Compliance Page
 * Asset freeze controls and deposit authorization
 */

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Wallet } from 'xrpl'

// Import compliance components
import { FreezeManager } from '../compliance/freeze-manager'
import { DepositAuthManager } from '../compliance/deposit-auth-manager'
import { ComplianceDashboard } from '../compliance/compliance-dashboard'

interface XRPLCompliancePageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLCompliancePage({ wallet, network, projectId }: XRPLCompliancePageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Compliance Controls</h2>
        <p className="text-muted-foreground">
          Asset freeze and deposit authorization management
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="freeze">Freeze Controls</TabsTrigger>
          <TabsTrigger value="deposit-auth">Deposit Authorization</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Dashboard</CardTitle>
              <CardDescription>
                Overview of all compliance settings and controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComplianceDashboard wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freeze">
          <Card>
            <CardHeader>
              <CardTitle>Asset Freeze Management</CardTitle>
              <CardDescription>
                Control global, individual, and no-freeze settings for issued assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FreezeManager wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposit-auth">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Authorization</CardTitle>
              <CardDescription>
                Manage deposit preauthorization and whitelist controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DepositAuthManager wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

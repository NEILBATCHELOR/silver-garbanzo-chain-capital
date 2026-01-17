/**
 * XRPL Monitoring Page
 * Real-time WebSocket monitoring and activity feeds
 */

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Wallet } from 'xrpl'

// Import monitoring components
import { WebSocketMonitor } from '../monitoring/websocket-monitor'
import { ActivityFeed } from '../monitoring/activity-feed'
import { AlertsManager } from '../monitoring/alerts-manager'

interface XRPLMonitoringPageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLMonitoringPage({ wallet, network, projectId }: XRPLMonitoringPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Real-Time Monitoring</h2>
        <p className="text-muted-foreground">
          Monitor blockchain activity with WebSocket connections
        </p>
      </div>

      <Tabs defaultValue="websocket" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="websocket">WebSocket Monitor</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="websocket">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Monitor</CardTitle>
              <CardDescription>
                Live connection to XRPL with real-time updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebSocketMonitor wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                Real-time feed of transactions and account activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Notifications</CardTitle>
              <CardDescription>
                Configure alerts for specific on-chain events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertsManager wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

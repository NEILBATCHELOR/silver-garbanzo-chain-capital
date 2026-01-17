/**
 * XRPL Advanced Tools Page
 * Batch operations, path finding, and price oracles
 */

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Wallet } from 'xrpl'

// Import advanced tool components
import { BatchOperations } from '../tools/batch-operations'
import { PathFinder } from '../tools/path-finder'
import { PriceOracle } from '../tools/price-oracle'

interface XRPLAdvancedToolsPageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLAdvancedToolsPage({ wallet, network, projectId }: XRPLAdvancedToolsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Advanced Tools</h2>
        <p className="text-muted-foreground">
          Batch operations, path finding, and price oracle integration
        </p>
      </div>

      <Tabs defaultValue="batch" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="batch">Batch Operations</TabsTrigger>
          <TabsTrigger value="pathfinder">Path Finding</TabsTrigger>
          <TabsTrigger value="oracle">Price Oracles</TabsTrigger>
        </TabsList>

        <TabsContent value="batch">
          <Card>
            <CardHeader>
              <CardTitle>Batch Operations</CardTitle>
              <CardDescription>
                Execute multiple transactions efficiently in a single batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatchOperations wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pathfinder">
          <Card>
            <CardHeader>
              <CardTitle>Payment Path Finder</CardTitle>
              <CardDescription>
                Find optimal payment paths for cross-currency transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PathFinder wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oracle">
          <Card>
            <CardHeader>
              <CardTitle>Price Oracle Integration</CardTitle>
              <CardDescription>
                Access on-chain price feeds and oracle data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceOracle wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

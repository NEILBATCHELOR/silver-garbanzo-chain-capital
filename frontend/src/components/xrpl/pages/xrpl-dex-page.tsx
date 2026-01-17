/**
 * XRPL DEX Trading Page
 * Decentralized exchange order book trading
 */

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Wallet } from 'xrpl'

// Import DEX components
import { DEXOrderPlacement } from '../defi/dex-order-placement'
import { DEXOrderBook } from '../defi/dex-order-book'
import { DEXTradeHistory } from '../defi/dex-trade-history'
import { DEXOrderManagement } from '../defi/dex-order-management'
import { DEXMarketSwap } from '../defi/dex-market-swap'

interface XRPLDEXPageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLDEXPage({ wallet, network, projectId }: XRPLDEXPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">DEX Trading</h2>
        <p className="text-muted-foreground">
          Trade on the XRPL decentralized exchange order books
        </p>
      </div>

      <Tabs defaultValue="orderbook" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="orderbook">Order Book</TabsTrigger>
          <TabsTrigger value="place-order">Place Order</TabsTrigger>
          <TabsTrigger value="swap">Market Swap</TabsTrigger>
          <TabsTrigger value="manage">My Orders</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="orderbook">
          <Card>
            <CardHeader>
              <CardTitle>Order Book</CardTitle>
              <CardDescription>
                View current buy and sell orders for token pairs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DEXOrderBook wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="place-order">
          <Card>
            <CardHeader>
              <CardTitle>Place Order</CardTitle>
              <CardDescription>
                Create limit or market orders on the DEX
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DEXOrderPlacement wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swap">
          <Card>
            <CardHeader>
              <CardTitle>Market Swap</CardTitle>
              <CardDescription>
                Instant token swaps at current market price
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DEXMarketSwap wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>
                View and manage your active orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DEXOrderManagement wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>
                View your completed trades and order history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DEXTradeHistory wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

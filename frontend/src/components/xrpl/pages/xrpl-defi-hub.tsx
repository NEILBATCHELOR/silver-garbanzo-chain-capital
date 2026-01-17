import React, { useState } from 'react'
import { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Droplets, TrendingUp, Info, Zap } from 'lucide-react'
import {
  AMMPoolList,
  AMMPoolCreator,
  AMMPool,
  DEXOrderPlacement,
  DEXOrderBook,
  DEXMarketSwap
} from '@/components/xrpl/defi'

interface XRPLDeFiHubProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
}

export function XRPLDeFiHub({ wallet, network, projectId }: XRPLDeFiHubProps) {
  const [selectedPair, setSelectedPair] = useState({
    baseCurrency: 'XRP',
    baseIssuer: undefined as string | undefined,
    quoteCurrency: 'USD',
    quoteIssuer: undefined as string | undefined
  })
  const [selectedOrderPrice, setSelectedOrderPrice] = useState<number | undefined>()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handlePriceSelect = (price: number) => {
    setSelectedOrderPrice(price)
  }

  if (!wallet) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6" />
          <h1 className="text-3xl font-bold">DeFi Hub</h1>
          <Badge variant="secondary">Beta</Badge>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please connect your XRPL wallet to access DeFi features.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6" />
          <h1 className="text-3xl font-bold">DeFi Hub</h1>
          <Badge variant="secondary">Beta</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Connected: {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
          </Badge>
          <Badge variant="outline">{network}</Badge>
        </div>
      </div>

      {/* Main DeFi Tabs */}
      <Tabs defaultValue="dex" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dex" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            DEX Trading
          </TabsTrigger>
          <TabsTrigger value="amm" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            AMM Pools
          </TabsTrigger>
          <TabsTrigger value="swap" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Swap
          </TabsTrigger>
        </TabsList>

        {/* DEX Trading Tab */}
        <TabsContent value="dex" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Book */}
            <div className="lg:col-span-2">
              <DEXOrderBook
                wallet={wallet}
                network={network}
                projectId={projectId}
                baseCurrency={selectedPair.baseCurrency}
                baseIssuer={selectedPair.baseIssuer}
                quoteCurrency={selectedPair.quoteCurrency}
                quoteIssuer={selectedPair.quoteIssuer}
                onPriceSelect={handlePriceSelect}
              />
            </div>

            {/* Order Placement */}
            <div className="lg:col-span-2">
              <DEXOrderPlacement
                wallet={wallet}
                network={network}
                projectId={projectId}
                baseCurrency={selectedPair.baseCurrency}
                baseIssuer={selectedPair.baseIssuer}
                quoteCurrency={selectedPair.quoteCurrency}
                quoteIssuer={selectedPair.quoteIssuer}
                onSuccess={handleSuccess}
              />
            </div>
          </div>

          {/* DEX Info */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                About DEX Trading
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                The XRPL Decentralized Exchange (DEX) enables peer-to-peer token trading without intermediaries.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Place limit orders on the order book</li>
                <li>Orders execute automatically when prices match</li>
                <li>No custody - you maintain control of your assets</li>
                <li>Transparent pricing through the order book</li>
                <li>Low fees compared to centralized exchanges</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AMM Pools Tab */}
        <TabsContent value="amm" className="space-y-6">
          <Tabs defaultValue="my-pools" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-pools">My Pools</TabsTrigger>
              <TabsTrigger value="create-pool">Create Pool</TabsTrigger>
            </TabsList>

            <TabsContent value="my-pools" className="space-y-4">
              <AMMPoolList
                wallet={wallet}
                network={network}
                projectId={projectId}
                onSelectPool={(pool: AMMPool) => {
                  // Navigate to AMM page with selected pool
                  window.location.href = `/xrpl/amm?pool=${pool.id}`
                }}
              />
            </TabsContent>

            <TabsContent value="create-pool" className="space-y-4">
              <AMMPoolCreator
                wallet={wallet}
                network={network}
                projectId={projectId}
                onSuccess={handleSuccess}
              />
            </TabsContent>
          </Tabs>

          {/* AMM Info */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                About AMM Pools
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Automated Market Makers (AMMs) provide always-available liquidity for token pairs.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Earn passive income from trading fees</li>
                <li>Provide liquidity to earn LP tokens</li>
                <li>Automated price discovery using constant product formula</li>
                <li>Bid on auction slots for reduced trading fees</li>
                <li>Vote on fee adjustments with your LP tokens</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Swap Tab */}
        <TabsContent value="swap" className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <DEXMarketSwap
              wallet={wallet}
              network={network}
              projectId={projectId}
              onSuccess={handleSuccess}
            />
          </div>

          {/* Swap Info */}
          <Card className="bg-muted/50 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                About Quick Swap
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Quick Swap executes instant token swaps at current market prices.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Instant execution without waiting for orders to fill</li>
                <li>Automatic path finding for best exchange rates</li>
                <li>Slippage protection to prevent unfavorable price movements</li>
                <li>Uses both AMM pools and DEX order book liquidity</li>
                <li>Perfect for quick, one-time trades</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trading Pairs Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Trading Pair</CardTitle>
          <CardDescription>
            Choose the currency pair you want to trade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Base Currency */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Currency</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., XRP"
                value={selectedPair.baseCurrency}
                onChange={(e) => setSelectedPair({
                  ...selectedPair,
                  baseCurrency: e.target.value
                })}
              />
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Issuer (optional)"
                value={selectedPair.baseIssuer || ''}
                onChange={(e) => setSelectedPair({
                  ...selectedPair,
                  baseIssuer: e.target.value || undefined
                })}
              />
            </div>

            {/* Quote Currency */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quote Currency</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., USD"
                value={selectedPair.quoteCurrency}
                onChange={(e) => setSelectedPair({
                  ...selectedPair,
                  quoteCurrency: e.target.value
                })}
              />
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Issuer (optional)"
                value={selectedPair.quoteIssuer || ''}
                onChange={(e) => setSelectedPair({
                  ...selectedPair,
                  quoteIssuer: e.target.value || undefined
                })}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>
              Current pair: <strong>{selectedPair.baseCurrency}/{selectedPair.quoteCurrency}</strong>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default XRPLDeFiHub

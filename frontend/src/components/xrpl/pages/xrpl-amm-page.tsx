import React, { useState } from 'react'
import { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Droplets, Info, ArrowLeft } from 'lucide-react'
import { 
  AMMPoolCreator, 
  AMMPoolList,
  AMMAddLiquidity,
  AMMRemoveLiquidity,
  AMMAuctionSlotManager,
  AMMVoteFee,
  AMMFeeCollection,
  AMMPriceHistory,
  AMMPool 
} from '@/components/xrpl/defi'

interface XRPLAMMPageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
}

export function XRPLAMMPage({ wallet, network, projectId }: XRPLAMMPageProps) {
  const [selectedPool, setSelectedPool] = useState<AMMPool | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSuccess = () => {
    // Trigger refresh of pool data
    setRefreshTrigger(prev => prev + 1)
  }

  const handlePoolSelect = (pool: AMMPool) => {
    setSelectedPool(pool)
  }

  const handleBackToList = () => {
    setSelectedPool(null)
  }

  if (!wallet) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6" />
          <h1 className="text-3xl font-bold">AMM Pools</h1>
          <Badge variant="secondary">New</Badge>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please connect your XRPL wallet to manage AMM pools.
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
          <h1 className="text-3xl font-bold">AMM Pools</h1>
          <Badge variant="secondary">New</Badge>
        </div>
        {selectedPool && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToList}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pool List
          </Button>
        )}
      </div>

      {/* Pool Management Tabs */}
      {!selectedPool ? (
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
              onSelectPool={handlePoolSelect}
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
      ) : (
        /* Pool Detail View */
        <div className="space-y-6">
          {/* Pool Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                {selectedPool.asset1Currency}/{selectedPool.asset2Currency} Pool
              </CardTitle>
              <CardDescription>
                Pool ID: {selectedPool.ammId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{selectedPool.asset1Currency} Balance</div>
                  <div className="text-lg font-semibold">{selectedPool.asset1Balance}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{selectedPool.asset2Currency} Balance</div>
                  <div className="text-lg font-semibold">{selectedPool.asset2Balance}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">LP Token Supply</div>
                  <div className="text-lg font-semibold">{selectedPool.lpTokenSupply}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Trading Fee</div>
                  <div className="text-lg font-semibold">{selectedPool.tradingFee / 10}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pool Management Tabs */}
          <Tabs defaultValue="add-liquidity" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="add-liquidity">Add Liquidity</TabsTrigger>
              <TabsTrigger value="remove-liquidity">Remove Liquidity</TabsTrigger>
              <TabsTrigger value="auction-slot">Auction Slot</TabsTrigger>
              <TabsTrigger value="vote-fee">Vote Fee</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="price">Price History</TabsTrigger>
            </TabsList>

            <TabsContent value="add-liquidity" className="space-y-4">
              <AMMAddLiquidity
                pool={selectedPool}
                wallet={wallet}
                network={network}
                projectId={projectId}
                onSuccess={handleSuccess}
              />
            </TabsContent>

            <TabsContent value="remove-liquidity" className="space-y-4">
              <AMMRemoveLiquidity
                pool={selectedPool}
                wallet={wallet}
                network={network}
                projectId={projectId}
                onSuccess={handleSuccess}
              />
            </TabsContent>

            <TabsContent value="auction-slot" className="space-y-4">
              <AMMAuctionSlotManager
                pool={selectedPool}
                wallet={wallet}
                network={network}
                projectId={projectId}
                onSuccess={handleSuccess}
              />
            </TabsContent>

            <TabsContent value="vote-fee" className="space-y-4">
              <AMMVoteFee
                pool={selectedPool}
                wallet={wallet}
                network={network}
                projectId={projectId}
                onSuccess={handleSuccess}
              />
            </TabsContent>

            <TabsContent value="fees" className="space-y-4">
              <AMMFeeCollection
                pool={selectedPool}
                wallet={wallet}
                network={network}
                projectId={projectId}
              />
            </TabsContent>

            <TabsContent value="price" className="space-y-4">
              <AMMPriceHistory
                pool={selectedPool}
                wallet={wallet}
                network={network}
                projectId={projectId}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Info Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            About XRPL AMM
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Automated Market Makers (AMMs) provide decentralized liquidity for token trading on the XRPL.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Earn trading fees by providing liquidity to pools</li>
            <li>Receive LP tokens representing your share of the pool</li>
            <li>Bid on auction slots for discounted trading fees (1/10th normal fee)</li>
            <li>Vote on trading fee changes with your LP tokens</li>
            <li>Single-sided or dual-sided liquidity deposits supported</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default XRPLAMMPage

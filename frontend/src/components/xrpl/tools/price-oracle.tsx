/**
 * Price Oracle Component
 * Submit and query price oracle data on XRPL
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLPriceOracleService } from '@/services/wallet/ripple/oracle'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Upload, Search } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PriceOracleProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function PriceOracle({ wallet, network, projectId }: PriceOracleProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [priceData, setPriceData] = useState<any>(null)
  const [submitData, setSubmitData] = useState({
    baseCurrency: 'XRP',
    quoteCurrency: 'USD',
    price: '',
    scale: 8
  })
  const [queryData, setQueryData] = useState({
    oracleId: ''
  })

  const handleSubmitPrice = async () => {
    try {
      setIsSubmitting(true)

      if (!projectId) {
        throw new Error('Project ID is required')
      }

      const client = await xrplClientManager.getClient(network)
      const oracleService = new XRPLPriceOracleService(client)

      const result = await oracleService.setOracle(projectId, {
        oracleWallet: wallet,
        oracleDocumentId: 1, // You may want to make this configurable
        provider: 'Chain Capital',
        uri: 'https://chain-capital.example.com',
        lastUpdateTime: Math.floor(Date.now() / 1000),
        assetClass: 'currency',
        priceDataSeries: [{
          baseAsset: submitData.baseCurrency,
          quoteAsset: submitData.quoteCurrency,
          assetPrice: parseInt(submitData.price),
          scale: submitData.scale
        }]
      })

      toast({
        title: 'Price Submitted',
        description: `Oracle ID: ${result.oracleDocumentId}`
      })

      setSubmitData({
        baseCurrency: 'XRP',
        quoteCurrency: 'USD',
        price: '',
        scale: 8
      })

    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuery = async () => {
    try {
      setIsQuerying(true)

      const client = await xrplClientManager.getClient(network)
      const oracleService = new XRPLPriceOracleService(client)

      const result = await oracleService.getOraclePriceData(
        wallet.address,
        parseInt(queryData.oracleId) || 1
      )

      setPriceData(result)

      toast({
        title: 'Oracle Data Retrieved',
        description: 'Price data loaded successfully'
      })

    } catch (error) {
      toast({
        title: 'Query Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Oracle</CardTitle>
        <CardDescription>
          Submit and query price oracle data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="submit">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submit">Submit Price</TabsTrigger>
            <TabsTrigger value="query">Query Oracle</TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4">
            <Alert>
              <AlertDescription>
                Submit price data to the XRPL price oracle network
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Currency</Label>
                  <Input
                    placeholder="XRP"
                    value={submitData.baseCurrency}
                    onChange={(e) => setSubmitData({ ...submitData, baseCurrency: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quote Currency</Label>
                  <Input
                    placeholder="USD"
                    value={submitData.quoteCurrency}
                    onChange={(e) => setSubmitData({ ...submitData, quoteCurrency: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder="0.50"
                  value={submitData.price}
                  onChange={(e) => setSubmitData({ ...submitData, price: e.target.value })}
                />
              </div>

              <div>
                <Label>Scale (decimal places)</Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={submitData.scale}
                  onChange={(e) => setSubmitData({ ...submitData, scale: parseInt(e.target.value) || 8 })}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmitPrice}
              disabled={isSubmitting || !submitData.price}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="h-4 w-4 mr-2" />
              Submit Price
            </Button>
          </TabsContent>

          <TabsContent value="query" className="space-y-4">
            <Alert>
              <AlertDescription>
                Query price data from an oracle
              </AlertDescription>
            </Alert>

            <div>
              <Label>Oracle ID</Label>
              <Input
                placeholder="Enter oracle identifier"
                value={queryData.oracleId}
                onChange={(e) => setQueryData({ ...queryData, oracleId: e.target.value })}
              />
            </div>

            <Button
              onClick={handleQuery}
              disabled={isQuerying || !queryData.oracleId}
              className="w-full"
            >
              {isQuerying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Search className="h-4 w-4 mr-2" />
              Query Oracle
            </Button>

            {priceData && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Oracle Data</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(priceData, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

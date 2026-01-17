import React, { useState, useEffect } from 'react'
import { Client, Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, BookOpen, TrendingUp, TrendingDown, RefreshCw, Info } from 'lucide-react'
import { XRPLDEXService } from '@/services/wallet/ripple/defi/XRPLDEXService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { OrderBook as OrderBookType, CurrencyAsset } from '@/services/wallet/ripple/defi/dex-types'

interface DEXOrderBookProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  baseCurrency?: string
  baseIssuer?: string
  quoteCurrency?: string
  quoteIssuer?: string
  onPriceSelect?: (price: number) => void
}

export function DEXOrderBook({
  wallet,
  network,
  projectId,
  baseCurrency = 'XRP',
  baseIssuer,
  quoteCurrency = 'USD',
  quoteIssuer,
  onPriceSelect
}: DEXOrderBookProps) {
  const [orderBook, setOrderBook] = useState<OrderBookType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const [client, setClient] = useState<Client | null>(null)
  const [dexService, setDexService] = useState<XRPLDEXService | null>(null)

  // Initialize XRPL client
  useEffect(() => {
    const initClient = async () => {
      const xrplClient = await xrplClientManager.getClient(network)
      setClient(xrplClient)
      setDexService(new XRPLDEXService(xrplClient))
    }
    initClient()
  }, [network])

  // Load order book when client is ready or currencies change
  useEffect(() => {
    if (dexService) {
      loadOrderBook()
    }
  }, [dexService, baseCurrency, baseIssuer, quoteCurrency, quoteIssuer])

  const loadOrderBook = async () => {
    if (!dexService) return

    setIsLoading(true)
    try {
      // Build proper CurrencyAsset objects for XRPL SDK
      // For XRP, only currency is needed; for tokens, issuer is required
      const takerGets: CurrencyAsset = baseCurrency === 'XRP'
        ? { currency: 'XRP' }
        : { 
            currency: baseCurrency, 
            issuer: baseIssuer || '' 
          }

      const takerPays: CurrencyAsset = quoteCurrency === 'XRP'
        ? { currency: 'XRP' }
        : { 
            currency: quoteCurrency, 
            issuer: quoteIssuer || '' 
          }

      // Validate non-XRP currencies have issuers
      if (baseCurrency !== 'XRP' && !baseIssuer) {
        throw new Error(`Issuer required for ${baseCurrency}`)
      }
      if (quoteCurrency !== 'XRP' && !quoteIssuer) {
        throw new Error(`Issuer required for ${quoteCurrency}`)
      }

      const book = await dexService.getOrderBook(
        takerGets,
        takerPays,
        50 // Limit to 50 orders per side
      )

      setOrderBook(book)
      setLastUpdate(new Date())

    } catch (error) {
      console.error('Failed to load order book:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate spread and mid price
  const marketStats = React.useMemo(() => {
    if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return { spread: 0, spreadPercent: 0, midPrice: 0 }
    }

    const bestBid = orderBook.bids[0].price
    const bestAsk = orderBook.asks[0].price
    const spread = bestAsk - bestBid
    const midPrice = (bestBid + bestAsk) / 2
    const spreadPercent = (spread / midPrice) * 100

    return { spread, spreadPercent, midPrice }
  }, [orderBook])

  if (!client || !dexService || isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Market Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {baseCurrency}/{quoteCurrency} Order Book
              </CardTitle>
              <CardDescription>
                Real-time order book depth
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadOrderBook}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Mid Price</div>
              <div className="text-2xl font-bold">
                {marketStats.midPrice.toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">{quoteCurrency}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Spread</div>
              <div className="text-2xl font-bold">
                {marketStats.spread.toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">
                {marketStats.spreadPercent.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Update</div>
              <div className="text-lg font-semibold">
                {lastUpdate.toLocaleTimeString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Book Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asks (Sell Orders) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <TrendingDown className="h-4 w-4" />
              Asks (Sell Orders)
            </CardTitle>
            <CardDescription>
              {orderBook?.asks.length || 0} orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!orderBook || orderBook.asks.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No sell orders available
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 pb-2 border-b font-semibold text-xs">
                  <div className="text-right">Price</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {orderBook.asks.map((ask, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-3 gap-2 py-1.5 text-sm hover:bg-red-50 rounded cursor-pointer"
                      onClick={() => onPriceSelect?.(ask.price)}
                    >
                      <div className="text-right font-mono text-red-600 font-semibold">
                        {ask.price.toFixed(6)}
                      </div>
                      <div className="text-right font-mono">
                        {parseFloat(ask.amount).toFixed(4)}
                      </div>
                      <div className="text-right font-mono text-muted-foreground">
                        {ask.total ? parseFloat(ask.total).toFixed(4) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bids (Buy Orders) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              Bids (Buy Orders)
            </CardTitle>
            <CardDescription>
              {orderBook?.bids.length || 0} orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!orderBook || orderBook.bids.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No buy orders available
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 pb-2 border-b font-semibold text-xs">
                  <div className="text-right">Price</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {orderBook.bids.map((bid, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-3 gap-2 py-1.5 text-sm hover:bg-green-50 rounded cursor-pointer"
                      onClick={() => onPriceSelect?.(bid.price)}
                    >
                      <div className="text-right font-mono text-green-600 font-semibold">
                        {bid.price.toFixed(6)}
                      </div>
                      <div className="text-right font-mono">
                        {parseFloat(bid.amount).toFixed(4)}
                      </div>
                      <div className="text-right font-mono text-muted-foreground">
                        {bid.total ? parseFloat(bid.total).toFixed(4) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1 text-xs">
            <p><strong>How to use the order book:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>Click on any price to auto-fill the order form</li>
              <li>Green (bids) = buyers willing to purchase at that price</li>
              <li>Red (asks) = sellers willing to sell at that price</li>
              <li>Spread = difference between best bid and best ask</li>
              <li>Tighter spreads indicate more liquid markets</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default DEXOrderBook

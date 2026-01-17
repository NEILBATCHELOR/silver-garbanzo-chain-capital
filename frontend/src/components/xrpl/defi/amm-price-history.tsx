import React, { useState, useEffect } from 'react'
import { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, TrendingUp, TrendingDown, Activity, Info, Minus } from 'lucide-react'
import { supabase } from '@/infrastructure/database/client'
import { AMMPool } from './types'

interface PricePoint {
  id: string
  price: string
  inversePrice: string
  asset1Balance: string
  asset2Balance: string
  timestamp: string
  ledgerIndex: number
}

interface AMMPriceHistoryProps {
  pool: AMMPool
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
}

export function AMMPriceHistory({ 
  pool, 
  wallet, 
  network,
  projectId 
}: AMMPriceHistoryProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    loadPriceHistory()
  }, [pool.id, projectId, timeframe])

  const loadPriceHistory = async () => {
    setIsLoading(true)
    try {
      // Calculate time range based on timeframe
      const now = new Date()
      let startTime = new Date()
      
      switch (timeframe) {
        case '1h':
          startTime.setHours(now.getHours() - 1)
          break
        case '24h':
          startTime.setHours(now.getHours() - 24)
          break
        case '7d':
          startTime.setDate(now.getDate() - 7)
          break
        case '30d':
          startTime.setDate(now.getDate() - 30)
          break
      }

      // Load price history from database
      const { data, error } = await supabase
        .from('xrpl_amm_price_history')
        .select('*')
        .eq('pool_id', pool.id)
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) throw error

      const prices: PricePoint[] = (data || []).map(row => ({
        id: row.id,
        price: row.price,
        inversePrice: row.inverse_price,
        asset1Balance: row.asset1_balance,
        asset2Balance: row.asset2_balance,
        timestamp: row.timestamp,
        ledgerIndex: row.ledger_index
      }))

      setPriceHistory(prices)

    } catch (error) {
      console.error('Failed to load price history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate price statistics
  const priceStats = React.useMemo(() => {
    if (priceHistory.length === 0) {
      return {
        current: '0',
        high: '0',
        low: '0',
        change: '0',
        changePercent: '0'
      }
    }

    const prices = priceHistory.map(p => parseFloat(p.price))
    const current = prices[0]
    const oldest = prices[prices.length - 1]
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const change = current - oldest
    const changePercent = oldest > 0 ? ((change / oldest) * 100).toFixed(2) : '0'

    return {
      current: current.toFixed(8),
      high: high.toFixed(8),
      low: low.toFixed(8),
      change: change.toFixed(8),
      changePercent
    }
  }, [priceHistory])

  const isPositive = parseFloat(priceStats.changePercent) > 0
  const isNegative = parseFloat(priceStats.changePercent) < 0

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
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
      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {pool.asset1Currency}/{pool.asset2Currency} Price
            </span>
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
              <TabsList>
                <TabsTrigger value="1h">1H</TabsTrigger>
                <TabsTrigger value="24h">24H</TabsTrigger>
                <TabsTrigger value="7d">7D</TabsTrigger>
                <TabsTrigger value="30d">30D</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Current Price */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Price</div>
              <div className="text-2xl font-bold">{priceStats.current}</div>
              <div className="text-xs text-muted-foreground">
                {pool.asset2Currency} per {pool.asset1Currency}
              </div>
            </div>

            {/* Change */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Change ({timeframe})</div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : ''
              }`}>
                {isPositive && <TrendingUp className="h-5 w-5" />}
                {isNegative && <TrendingDown className="h-5 w-5" />}
                {!isPositive && !isNegative && <Minus className="h-5 w-5" />}
                {priceStats.changePercent}%
              </div>
              <div className={`text-xs ${
                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {isPositive ? '+' : ''}{priceStats.change}
              </div>
            </div>

            {/* High */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">High ({timeframe})</div>
              <div className="text-2xl font-bold text-green-600">{priceStats.high}</div>
              <div className="text-xs text-muted-foreground">
                Peak price
              </div>
            </div>

            {/* Low */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Low ({timeframe})</div>
              <div className="text-2xl font-bold text-red-600">{priceStats.low}</div>
              <div className="text-xs text-muted-foreground">
                Lowest price
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Price History</CardTitle>
          <CardDescription>
            Last {priceHistory.length} price updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {priceHistory.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No price history available yet. Prices are tracked as trades occur.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-6 gap-4 pb-2 border-b font-semibold text-sm">
                <div>Time</div>
                <div className="text-right">Price</div>
                <div className="text-right">{pool.asset1Currency}</div>
                <div className="text-right">{pool.asset2Currency}</div>
                <div className="text-right">Ledger</div>
                <div className="text-right">Change</div>
              </div>

              <div className="space-y-1 max-h-96 overflow-y-auto">
                {priceHistory.map((point, index) => {
                  const prevPrice = index < priceHistory.length - 1 
                    ? parseFloat(priceHistory[index + 1].price) 
                    : parseFloat(point.price)
                  const currentPrice = parseFloat(point.price)
                  const priceChange = currentPrice - prevPrice
                  const isUp = priceChange > 0
                  const isDown = priceChange < 0

                  return (
                    <div 
                      key={point.id} 
                      className="grid grid-cols-6 gap-4 py-2 text-sm hover:bg-muted/50 rounded-lg px-2"
                    >
                      <div className="text-muted-foreground">
                        {formatTime(point.timestamp)}
                        <div className="text-xs">{formatDate(point.timestamp)}</div>
                      </div>
                      <div className="text-right font-mono font-semibold">
                        {parseFloat(point.price).toFixed(6)}
                      </div>
                      <div className="text-right font-mono text-xs">
                        {parseFloat(point.asset1Balance).toFixed(2)}
                      </div>
                      <div className="text-right font-mono text-xs">
                        {parseFloat(point.asset2Balance).toFixed(2)}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {point.ledgerIndex.toLocaleString()}
                        </Badge>
                      </div>
                      <div className={`text-right font-semibold ${
                        isUp ? 'text-green-600' : isDown ? 'text-red-600' : ''
                      }`}>
                        {isUp && <span>+{(priceChange * 100).toFixed(2)}%</span>}
                        {isDown && <span>{(priceChange * 100).toFixed(2)}%</span>}
                        {!isUp && !isDown && <span>-</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1 text-xs">
            <p><strong>About price tracking:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>Prices are automatically tracked with every trade</li>
              <li>Price = {pool.asset2Currency} amount / {pool.asset1Currency} amount</li>
              <li>Historical data helps identify optimal entry/exit points</li>
              <li>Price changes reflect supply/demand dynamics in the pool</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default AMMPriceHistory

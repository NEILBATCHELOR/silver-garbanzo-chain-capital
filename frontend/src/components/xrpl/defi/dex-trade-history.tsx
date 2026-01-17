import React, { useState, useEffect, useMemo } from 'react'
import { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Loader2, 
  History, 
  RefreshCw, 
  Info,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { XRPLDEXDatabaseService } from '@/services/wallet/ripple/defi/XRPLDEXDatabaseService'
import { DEXTrade, TradeHistoryQuery } from '@/services/wallet/ripple/defi/dex-types'

interface DEXTradeHistoryProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  baseCurrency?: string
  quoteCurrency?: string
}

type TimeRange = '24h' | '7d' | '30d' | 'all' | 'custom'

export function DEXTradeHistory({
  wallet,
  network,
  projectId,
  baseCurrency,
  quoteCurrency
}: DEXTradeHistoryProps) {
  const { toast } = useToast()

  const [trades, setTrades] = useState<DEXTrade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [limit, setLimit] = useState(50)

  const databaseService = useMemo(
    () => new XRPLDEXDatabaseService(),
    []
  )

  useEffect(() => {
    loadTrades()
  }, [projectId, timeRange, baseCurrency, quoteCurrency, limit])

  const loadTrades = async () => {
    setIsLoading(true)
    try {
      // Calculate date range based on timeRange
      let startDate: Date | undefined
      let endDate: Date | undefined

      const now = new Date()
      
      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'custom':
          if (customStartDate) startDate = new Date(customStartDate)
          if (customEndDate) endDate = new Date(customEndDate)
          break
        case 'all':
        default:
          // No date filter
          break
      }

      const query: TradeHistoryQuery = {
        projectId,
        startDate,
        endDate,
        limit,
        pair: baseCurrency && quoteCurrency 
          ? { baseCurrency, quoteCurrency }
          : undefined
      }

      const tradeHistory = await databaseService.getTradeHistory(query)
      setTrades(tradeHistory)

    } catch (error) {
      console.error('Failed to load trade history:', error)
      toast({
        title: 'Load Failed',
        description: 'Failed to load trade history',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        totalVolume: '0',
        avgPrice: '0',
        buyCount: 0,
        sellCount: 0
      }
    }

    const totalVolume = trades.reduce((sum, trade) => {
      return sum + parseFloat(trade.quoteAmount)
    }, 0)

    const avgPrice = trades.reduce((sum, trade) => {
      return sum + parseFloat(trade.price)
    }, 0) / trades.length

    // Determine buy/sell based on if wallet is taker or maker
    const buyCount = trades.filter(t => 
      t.takerAddress === wallet.address
    ).length

    const sellCount = trades.filter(t => 
      t.makerAddress === wallet.address
    ).length

    return {
      totalTrades: trades.length,
      totalVolume: totalVolume.toFixed(2),
      avgPrice: avgPrice.toFixed(6),
      buyCount,
      sellCount
    }
  }, [trades, wallet.address])

  const exportToCSV = () => {
    if (trades.length === 0) {
      toast({
        title: 'No Data',
        description: 'No trades to export',
        variant: 'destructive'
      })
      return
    }

    const headers = [
      'Date',
      'Pair',
      'Type',
      'Price',
      'Amount',
      'Total',
      'Transaction Hash'
    ]

    const rows = trades.map(trade => {
      const isBuy = trade.takerAddress === wallet.address
      return [
        new Date(trade.executedAt).toISOString(),
        `${trade.baseCurrency}/${trade.quoteCurrency}`,
        isBuy ? 'BUY' : 'SELL',
        trade.price,
        trade.baseAmount,
        trade.quoteAmount,
        trade.transactionHash
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trade-history-${new Date().toISOString()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Export Complete',
      description: `Exported ${trades.length} trades to CSV`
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getExplorerUrl = (txHash: string) => {
    const baseUrls = {
      MAINNET: 'https://livenet.xrpl.org',
      TESTNET: 'https://testnet.xrpl.org',
      DEVNET: 'https://devnet.xrpl.org'
    }
    return `${baseUrls[network]}/transactions/${txHash}`
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="text-2xl font-bold">{calculateStats.totalTrades}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Volume</div>
            <div className="text-2xl font-bold">${calculateStats.totalVolume}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Avg Price</div>
            <div className="text-2xl font-bold">{calculateStats.avgPrice}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Buy/Sell</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold">{calculateStats.buyCount}</span>
              </div>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-4 w-4" />
                <span className="font-bold">{calculateStats.sellCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Trade History
              </CardTitle>
              <CardDescription>
                View your past trades and performance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={trades.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTrades}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Time Range */}
            <div className="space-y-2">
              <Label htmlFor="timeRange" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Time Range
              </Label>
              <Select
                value={timeRange}
                onValueChange={(value) => setTimeRange(value as TimeRange)}
              >
                <SelectTrigger id="timeRange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="space-y-2">
              <Label htmlFor="limit">Results Limit</Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger id="limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 trades</SelectItem>
                  <SelectItem value="50">50 trades</SelectItem>
                  <SelectItem value="100">100 trades</SelectItem>
                  <SelectItem value="200">200 trades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Placeholder for symmetry */}
            <div />
          </div>

          {/* Custom Date Range */}
          {timeRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardContent className="pt-6">
          {trades.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No trades found for the selected time range and filters.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => {
                    const isBuy = trade.takerAddress === wallet.address
                    return (
                      <TableRow key={trade.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(trade.executedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={isBuy ? 'default' : 'destructive'}
                            className={isBuy ? 'bg-green-600' : 'bg-red-600'}
                          >
                            {isBuy ? 'BUY' : 'SELL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {trade.baseCurrency}/{trade.quoteCurrency}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(trade.price).toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(trade.baseAmount).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(trade.quoteAmount).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getExplorerUrl(trade.transactionHash), '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1 text-xs">
            <p><strong>Trade History Information:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><strong>BUY:</strong> You were the taker (purchased base currency)</li>
              <li><strong>SELL:</strong> You were the maker (sold base currency)</li>
              <li>Trades are sorted by most recent first</li>
              <li>Click the transaction icon to view on XRPL explorer</li>
              <li>Export to CSV for detailed analysis in Excel or other tools</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default DEXTradeHistory

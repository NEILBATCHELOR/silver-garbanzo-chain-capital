/**
 * Trades Management Page
 * Simple CRUD interface for currency trading (USD ↔ Crypto)
 */

import React, { useState } from 'react'
import { useTrades } from '@/hooks/psp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Eye, TrendingUp } from 'lucide-react'
import { PspTrade, CreateTradeRequest } from '@/types/psp'
import { cn } from '@/utils/utils'

interface TradesPageProps {
  projectId: string
}

export default function TradesPage({ projectId }: TradesPageProps) {
  const {
    trades,
    summary,
    marketRates,
    loading,
    error,
    fetchTrades,
    fetchMarketRates,
    createTrade
  } = useTrades(projectId)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<PspTrade | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState({
    sourceSymbol: 'USD',
    sourceNetwork: '',
    sourceAmount: '',
    destinationSymbol: 'USDC',
    destinationNetwork: 'ethereum'
  })

  const filteredTrades = Array.isArray(trades)
    ? trades.filter((trade) => {
        return statusFilter === 'all' || trade.status === statusFilter
      })
    : []

  const handleCreateTrade = async () => {
    try {
      const request: CreateTradeRequest = {
        project_id: projectId,
        source_symbol: formData.sourceSymbol,
        source_network: formData.sourceNetwork || undefined,
        source_amount: formData.sourceAmount,
        destination_symbol: formData.destinationSymbol,
        destination_network: formData.destinationNetwork || undefined
      }
      await createTrade(request)
      setCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error('Failed to create trade:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      sourceSymbol: 'USD',
      sourceNetwork: '',
      sourceAmount: '',
      destinationSymbol: 'USDC',
      destinationNetwork: 'ethereum'
    })
  }

  const formatAmount = (amount: string, symbol: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return `0 ${symbol}`
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${symbol}`
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      executing: 'default',
      completed: 'success',
      failed: 'destructive',
      cancelled: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trades</h1>
          <p className="text-muted-foreground">Exchange between USD and cryptocurrencies</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Trade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Trade</DialogTitle>
              <DialogDescription>
                Exchange between fiat and crypto currencies
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Source Currency */}
              <div className="space-y-2">
                <Label>Source Currency</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sourceSymbol" className="text-xs text-muted-foreground">Symbol</Label>
                    <Input
                      id="sourceSymbol"
                      value={formData.sourceSymbol}
                      onChange={(e) => setFormData({ ...formData, sourceSymbol: e.target.value })}
                      placeholder="USD, USDC, ETH, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="sourceNetwork" className="text-xs text-muted-foreground">Network (if crypto)</Label>
                    <Input
                      id="sourceNetwork"
                      value={formData.sourceNetwork}
                      onChange={(e) => setFormData({ ...formData, sourceNetwork: e.target.value })}
                      placeholder="ethereum, polygon, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="sourceAmount">Amount</Label>
                <Input
                  id="sourceAmount"
                  type="number"
                  step="0.01"
                  value={formData.sourceAmount}
                  onChange={(e) => setFormData({ ...formData, sourceAmount: e.target.value })}
                  placeholder="100.00"
                />
              </div>

              {/* Destination Currency */}
              <div className="space-y-2">
                <Label>Destination Currency</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="destinationSymbol" className="text-xs text-muted-foreground">Symbol</Label>
                    <Input
                      id="destinationSymbol"
                      value={formData.destinationSymbol}
                      onChange={(e) => setFormData({ ...formData, destinationSymbol: e.target.value })}
                      placeholder="USD, USDC, ETH, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="destinationNetwork" className="text-xs text-muted-foreground">Network (if crypto)</Label>
                    <Input
                      id="destinationNetwork"
                      value={formData.destinationNetwork}
                      onChange={(e) => setFormData({ ...formData, destinationNetwork: e.target.value })}
                      placeholder="ethereum, polygon, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Market Rate Preview */}
              {marketRates && marketRates.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Current Market Rates</p>
                  <div className="space-y-1">
                    {marketRates.slice(0, 3).map((rate) => (
                      <p key={`${rate.from_symbol}-${rate.to_symbol}`} className="text-sm">
                        <span className="font-medium">{rate.from_symbol}/{rate.to_symbol}</span>: ${rate.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTrade} disabled={!formData.sourceAmount || !formData.sourceSymbol || !formData.destinationSymbol}>
                Create Trade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Trades</CardDescription>
            <CardTitle className="text-2xl">{summary?.total_count || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">{summary?.by_status?.completed || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{summary?.by_status?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Volume</CardDescription>
            <CardTitle className="text-2xl">${summary?.total_volume_usd || '0'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="executing">Executing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => { fetchTrades(); fetchMarketRates(); }}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trades List</CardTitle>
          <CardDescription>
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No trades found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-xs">
                      {trade.warp_trade_id?.substring(0, 8) || trade.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {trade.source_symbol}
                      {trade.source_network && <span className="text-xs text-muted-foreground ml-1">({trade.source_network})</span>}
                    </TableCell>
                    <TableCell>
                      {trade.destination_symbol}
                      {trade.destination_network && <span className="text-xs text-muted-foreground ml-1">({trade.destination_network})</span>}
                    </TableCell>
                    <TableCell>{formatAmount(trade.source_amount, trade.source_symbol)}</TableCell>
                    <TableCell>
                      {trade.exchange_rate ? parseFloat(trade.exchange_rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(trade.status)}</TableCell>
                    <TableCell>
                      {new Date(trade.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTrade(trade)
                          setViewDialogOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Trade Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trade Details</DialogTitle>
            <DialogDescription>
              Complete trade information
            </DialogDescription>
          </DialogHeader>
          {selectedTrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Trade ID</Label>
                  <p className="font-mono text-sm">{selectedTrade.warp_trade_id || selectedTrade.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTrade.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">From</Label>
                  <p>{selectedTrade.source_symbol} {selectedTrade.source_network && `(${selectedTrade.source_network})`}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">To</Label>
                  <p>{selectedTrade.destination_symbol} {selectedTrade.destination_network && `(${selectedTrade.destination_network})`}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source Amount</Label>
                  <p className="font-semibold">{formatAmount(selectedTrade.source_amount, selectedTrade.source_symbol)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Destination Amount</Label>
                  <p className="font-semibold">
                    {selectedTrade.destination_amount ? formatAmount(selectedTrade.destination_amount, selectedTrade.destination_symbol) : 'Pending'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Exchange Rate</Label>
                  <p>
                    {selectedTrade.exchange_rate ? parseFloat(selectedTrade.exchange_rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : '-'}
                  </p>
                </div>
                {selectedTrade.fee_amount && (
                  <div>
                    <Label className="text-muted-foreground">Fee</Label>
                    <p>{formatAmount(selectedTrade.fee_amount, selectedTrade.fee_currency || selectedTrade.source_symbol)}</p>
                  </div>
                )}
                {selectedTrade.error_message && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-destructive">Error</Label>
                    <p className="text-destructive text-sm">{selectedTrade.error_message}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{new Date(selectedTrade.created_at).toLocaleString()}</p>
                </div>
                {selectedTrade.executed_at && (
                  <div>
                    <Label className="text-muted-foreground">Executed</Label>
                    <p>{new Date(selectedTrade.executed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

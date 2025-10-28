/**
 * Trades List Component
 * Displays all currency trades
 */

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight } from 'lucide-react'
import type { PspTrade } from '@/types/psp'
import { TransactionStatusBadge, CurrencyAmount } from '../shared'
import { formatDistanceToNow } from 'date-fns'

interface TradesListProps {
  trades: PspTrade[]
  onView: (trade: PspTrade) => void
  loading?: boolean
}

export function TradesList({ trades, onView, loading }: TradesListProps) {
  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="text-sm text-muted-foreground">Loading trades...</div></div>
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ArrowRight className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No trades</h3>
        <p className="text-sm text-muted-foreground mt-2">Create a trade to exchange currencies</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onView(trade)}>
              <TableCell>
                <CurrencyAmount amount={trade.source_amount} currency={trade.source_symbol} />
              </TableCell>
              <TableCell>
                <CurrencyAmount amount={trade.destination_amount || '0'} currency={trade.destination_symbol} />
              </TableCell>
              <TableCell>
                {trade.exchange_rate && <span className="font-mono text-sm">{trade.exchange_rate}</span>}
              </TableCell>
              <TableCell><TransactionStatusBadge status={trade.status} /></TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

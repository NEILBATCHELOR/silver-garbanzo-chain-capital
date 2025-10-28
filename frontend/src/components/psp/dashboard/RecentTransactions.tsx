/**
 * Recent Transactions Component
 * Displays recent payments and trades
 */

import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePayments, useTrades } from '@/hooks/psp'
import { 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight,
  ExternalLink,
  AlertCircle,
  Clock
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { formatDistanceToNow } from 'date-fns'

interface RecentTransactionsProps {
  projectId: string
  limit?: number
  className?: string
}

type Transaction = {
  id: string
  type: 'payment' | 'trade'
  direction?: 'inbound' | 'outbound'
  amount: string
  currency: string
  status: string
  timestamp: string
  description: string
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  projectId,
  limit = 10,
  className
}) => {
  const { payments, loading: paymentsLoading, error: paymentsError, fetchPayments } = usePayments(projectId, {
    limit,
    project_id: projectId
  })
  
  const { trades, loading: tradesLoading, error: tradesError, fetchTrades } = useTrades(projectId, {
    limit,
    project_id: projectId
  })

  const loading = paymentsLoading || tradesLoading
  const error = paymentsError || tradesError

  // Combine and sort transactions
  const transactions = useMemo(() => {
    const combined: Transaction[] = []
    
    // Add payments
    if (payments) {
      payments.forEach(payment => {
        combined.push({
          id: payment.id,
          type: 'payment',
          direction: payment.direction,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          timestamp: payment.created_at,
          description: `${payment.payment_type} - ${payment.payment_rail || 'crypto'}`
        })
      })
    }
    
    // Add trades
    if (trades) {
      trades.forEach(trade => {
        combined.push({
          id: trade.id,
          type: 'trade',
          amount: trade.source_amount,
          currency: `${trade.source_symbol} → ${trade.destination_symbol}`,
          status: trade.status,
          timestamp: trade.created_at,
          description: `Trade ${trade.source_symbol} to ${trade.destination_symbol}`
        })
      })
    }
    
    // Sort by timestamp descending
    return combined
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }, [payments, trades, limit])

  const handleRefresh = () => {
    fetchPayments()
    fetchTrades()
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 dark:text-green-400'
      case 'pending':
      case 'processing':
      case 'executing':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
      case 'failed':
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 dark:text-red-400'
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
    }
  }

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return `0 ${currency}`
    
    return `${num.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 8 
    })} ${currency}`
  }

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest payments and trades activity
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && transactions.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground">
              No recent transactions
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                      'rounded-full p-2',
                      transaction.direction === 'inbound' 
                        ? 'bg-green-500/10' 
                        : transaction.direction === 'outbound'
                        ? 'bg-blue-500/10'
                        : 'bg-purple-500/10'
                    )}>
                      {transaction.direction === 'inbound' ? (
                        <ArrowDownRight className="h-4 w-4 text-green-600" />
                      ) : transaction.direction === 'outbound' ? (
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {transaction.description}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={cn('text-xs', getStatusColor(transaction.status))}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs mt-1"
                      onClick={() => {
                        // Navigate to transaction details
                        window.location.href = `/psp/transactions/${transaction.id}`
                      }}
                    >
                      View
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

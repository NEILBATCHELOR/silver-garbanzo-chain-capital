import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ExternalLink, Filter, RefreshCw } from 'lucide-react'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPL_NETWORKS } from '@/services/wallet/ripple/config/XRPLConfig'
import type { Wallet } from 'xrpl'

interface TransactionHistoryProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  onSelectTransaction?: (txHash: string) => void
}

interface Transaction {
  hash: string
  type: string
  date: string
  result: string
  account: string
  destination?: string
  amount?: string
  fee: string
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  wallet,
  network = 'TESTNET',
  onSelectTransaction
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    loadTransactions()
  }, [wallet.address, network])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const client = await xrplClientManager.getClient(network)
      
      const response = await client.request({
        command: 'account_tx',
        account: wallet.address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 50
      })

      const txs = response.result.transactions.map((tx: any) => ({
        hash: tx.tx.hash,
        type: tx.tx.TransactionType,
        date: tx.tx.date 
          ? new Date((tx.tx.date + 946684800) * 1000).toISOString()
          : new Date().toISOString(),
        result: tx.meta.TransactionResult,
        account: tx.tx.Account,
        destination: tx.tx.Destination,
        amount: tx.tx.Amount,
        fee: tx.tx.Fee
      }))

      setTransactions(txs)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transaction history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = filter === '' || 
      tx.hash.toLowerCase().includes(filter.toLowerCase()) ||
      tx.type.toLowerCase().includes(filter.toLowerCase()) ||
      tx.destination?.toLowerCase().includes(filter.toLowerCase())

    const matchesType = typeFilter === 'all' || tx.type === typeFilter

    return matchesSearch && matchesType
  })

  const transactionTypes = ['all', ...Array.from(new Set(transactions.map(tx => tx.type)))]

  const formatAmount = (amount?: string): string => {
    if (!amount) return 'N/A'
    if (typeof amount === 'string' && !isNaN(Number(amount))) {
      return `${(parseInt(amount) / 1_000_000).toFixed(6)} XRP`
    }
    return 'Token'
  }

  const getStatusColor = (result: string) => {
    if (result === 'tesSUCCESS') return 'bg-green-500'
    if (result.startsWith('tec')) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View your XRPL transaction history</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by hash, type, or destination..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-md border"
            >
              {transactionTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <Card 
                  key={tx.hash}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onSelectTransaction?.(tx.hash)}
                >
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(tx.result)}`} />
                          <Badge variant="outline">{tx.type}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">{tx.hash.substring(0, 16)}...</span>
                        <a
                          href={`${XRPL_NETWORKS[network].explorerUrl}/transactions/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {tx.destination && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">To:</span>
                          <span className="font-mono">{tx.destination.substring(0, 12)}...</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-semibold">{formatAmount(tx.amount)}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Fee:</span>
                        <span>{(parseInt(tx.fee) / 1_000_000).toFixed(6)} XRP</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredTransactions.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Activity Feed Component
 * Display real-time account activity with transaction details
 */

import React, { useState, useEffect } from 'react'
import { Client } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  ExternalLink,
  Coins,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityFeedProps {
  walletAddress: string
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface Transaction {
  hash: string
  type: string
  result: string
  account: string
  destination?: string
  amount?: any
  ledger_index: number
  date: number
  fee: string
  validated: boolean
  mptIssuanceID?: string
  holder?: string
  flags?: number
}

export function ActivityFeed({ 
  walletAddress, 
  network, 
  limit = 20,
  autoRefresh = false,
  refreshInterval = 30000 
}: ActivityFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get WebSocket URL based on network
  const getWsUrl = () => {
    switch (network) {
      case 'MAINNET': return 'wss://xrplcluster.com'
      case 'TESTNET': return 'wss://s.altnet.rippletest.net:51233'
      case 'DEVNET': return 'wss://s.devnet.rippletest.net:51233'
      default: return 'wss://s.altnet.rippletest.net:51233'
    }
  }

  // Get explorer URL
  const getExplorerUrl = (hash: string) => {
    switch (network) {
      case 'MAINNET': return `https://livenet.xrpl.org/transactions/${hash}`
      case 'TESTNET': return `https://testnet.xrpl.org/transactions/${hash}`
      case 'DEVNET': return `https://devnet.xrpl.org/transactions/${hash}`
      default: return `https://testnet.xrpl.org/transactions/${hash}`
    }
  }

  // Fetch account transactions
  const fetchTransactions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const client = new Client(getWsUrl())
      await client.connect()

      const response = await client.request({
        command: 'account_tx',
        account: walletAddress,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit
      })

      if (response.result.transactions) {
        const txData = response.result.transactions.map((tx: any) => {
          const transaction = tx.tx || tx.tx_json || tx.transaction
          const meta = tx.meta

          return {
            hash: transaction.hash || tx.hash,
            type: transaction.TransactionType,
            result: meta?.TransactionResult || 'unknown',
            account: transaction.Account,
            destination: transaction.Destination,
            amount: transaction.Amount || transaction.DeliverMax,
            ledger_index: transaction.ledger_index || tx.ledger_index,
            date: transaction.date,
            fee: transaction.Fee,
            validated: tx.validated,
            mptIssuanceID: transaction.MPTokenIssuanceID,
            holder: transaction.Holder,
            flags: transaction.Flags
          }
        })

        setTransactions(txData)
        setLastUpdate(new Date())
      }

      await client.disconnect()
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
      setError(err.message || 'Failed to fetch transactions')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    fetchTransactions()

    if (autoRefresh) {
      const interval = setInterval(fetchTransactions, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [walletAddress, network, limit, autoRefresh, refreshInterval])

  // Get transaction icon
  const getTransactionIcon = (tx: Transaction) => {
    if (tx.result !== 'tesSUCCESS') {
      return <XCircle className="h-4 w-4 text-red-500" />
    }

    switch (tx.type) {
      case 'Payment':
        return tx.account === walletAddress ? (
          <ArrowUpRight className="h-4 w-4 text-red-500" />
        ) : (
          <ArrowDownLeft className="h-4 w-4 text-green-500" />
        )
      case 'MPTokenIssuanceCreate':
        return <Coins className="h-4 w-4 text-blue-500" />
      case 'MPTokenAuthorize':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'Clawback':
        return <ArrowDownLeft className="h-4 w-4 text-orange-500" />
      case 'MPTokenIssuanceSet':
        return tx.flags && (tx.flags & 0x00000001) ? (
          <Lock className="h-4 w-4 text-yellow-500" />
        ) : (
          <Unlock className="h-4 w-4 text-green-500" />
        )
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  // Get transaction description
  const getTransactionDescription = (tx: Transaction): string => {
    const isSent = tx.account === walletAddress

    switch (tx.type) {
      case 'Payment':
        const direction = isSent ? 'Sent to' : 'Received from'
        const address = isSent ? tx.destination : tx.account
        const shortAddr = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'unknown'
        
        if (typeof tx.amount === 'object' && tx.amount.mpt_issuance_id) {
          return `${direction} ${shortAddr} (MPT)`
        }
        return `${direction} ${shortAddr}`

      case 'MPTokenIssuanceCreate':
        return 'Created MPT Issuance'

      case 'MPTokenAuthorize':
        if (tx.holder) {
          return `Authorized holder ${tx.holder.slice(0, 8)}...`
        }
        return isSent ? 'Authorized as holder' : 'Authorization request'

      case 'Clawback':
        return `Clawed back from ${tx.holder ? tx.holder.slice(0, 8) + '...' : 'holder'}`

      case 'MPTokenIssuanceSet':
        if (tx.flags && (tx.flags & 0x00000001)) {
          return 'Locked MPT balances'
        } else if (tx.flags && (tx.flags & 0x00000002)) {
          return 'Unlocked MPT balances'
        }
        return 'Updated MPT issuance'

      case 'MPTokenIssuanceDestroy':
        return 'Destroyed MPT issuance'

      case 'TrustSet':
        return 'Updated trust line'

      case 'AccountSet':
        return 'Updated account settings'

      default:
        return tx.type || 'Unknown transaction'
    }
  }

  // Format amount
  const formatAmount = (amount: any): string | null => {
    if (!amount) return null

    if (typeof amount === 'string') {
      // XRP amount (in drops)
      const xrp = parseFloat(amount) / 1_000_000
      return `${xrp.toFixed(6)} XRP`
    }

    if (typeof amount === 'object') {
      if (amount.mpt_issuance_id) {
        // MPT amount
        return `${amount.value} MPT`
      }
      if (amount.currency && amount.value) {
        // IOU amount
        return `${amount.value} ${amount.currency}`
      }
    }

    return null
  }

  // Format date
  const formatDate = (rippleTime: number): string => {
    // Ripple epoch starts at 2000-01-01T00:00:00Z
    const unixTime = (rippleTime + 946684800) * 1000
    return formatDistanceToNow(new Date(unixTime), { addSuffix: true })
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Recent transactions for {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </CardDescription>
          </div>
          <Button 
            onClick={fetchTransactions} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground mt-2">
            <Clock className="h-3 w-3 inline mr-1" />
            Last updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {isLoading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div 
                  key={tx.hash} 
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getTransactionIcon(tx)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {getTransactionDescription(tx)}
                      </p>
                      <Badge 
                        variant={tx.result === 'tesSUCCESS' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {tx.result === 'tesSUCCESS' ? 'Success' : tx.result}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(tx.date)}</span>
                      <span>•</span>
                      <span>Ledger {tx.ledger_index.toLocaleString()}</span>
                    </div>

                    <a
                      href={getExplorerUrl(tx.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      View on explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {formatAmount(tx.amount) && (
                    <div className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {formatAmount(tx.amount)}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Activity, Pause, Play, TrendingUp, TrendingDown } from 'lucide-react'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Wallet } from 'xrpl'

interface TransactionMonitorProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

interface RecentActivity {
  hash: string
  type: string
  time: string
  status: string
}

interface Stats {
  totalTx: number
  successRate: number
  avgFee: number
  lastActivity: string
}

// Type for XRPL transaction response
interface XRPLTransaction {
  tx: {
    hash: string
    TransactionType: string
    Fee: string
    date?: number
    [key: string]: any
  }
  meta?: {
    TransactionResult: string
    [key: string]: any
  }
  [key: string]: any
}

export const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [monitoring, setMonitoring] = useState(false)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [stats, setStats] = useState<Stats>({
    totalTx: 0,
    successRate: 0,
    avgFee: 0,
    lastActivity: 'Never'
  })

  const loadStats = useCallback(async () => {
    try {
      const client = await xrplClientManager.getClient(network)
      
      const response = await client.request({
        command: 'account_tx',
        account: wallet.address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 100
      })

      const txs = response.result.transactions as XRPLTransaction[]

      // Calculate stats
      const total = txs.length
      const successful = txs.filter((tx) => 
        tx.meta?.TransactionResult === 'tesSUCCESS'
      ).length
      const totalFee = txs.reduce((sum, tx) => 
        sum + parseInt(tx.tx.Fee), 0
      )
      const avgFee = total > 0 ? totalFee / total / 1_000_000 : 0
      const lastTx = txs[0]
      const lastTime = lastTx?.tx?.date 
        ? new Date((lastTx.tx.date + 946684800) * 1000).toLocaleString()
        : 'Never'

      setStats({
        totalTx: total,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        avgFee,
        lastActivity: lastTime
      })

      // Update recent activity
      const recent = txs.slice(0, 5).map((tx) => ({
        hash: tx.tx.hash,
        type: tx.tx.TransactionType,
        time: tx.tx.date 
          ? new Date((tx.tx.date + 946684800) * 1000).toLocaleTimeString()
          : 'Unknown',
        status: tx.meta?.TransactionResult || 'Unknown'
      }))

      setRecentActivity(recent)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [wallet.address, network])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (!monitoring) return

    const interval = setInterval(() => {
      loadStats()
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [monitoring, loadStats])

  const toggleMonitoring = () => {
    setMonitoring(prev => {
      const newState = !prev
      toast({
        title: newState ? 'Monitoring Started' : 'Monitoring Paused',
        description: newState 
          ? 'Real-time transaction monitoring is active'
          : 'Transaction monitoring has been paused'
      })
      return newState
    })
  }

  const getStatusColor = (status: string) => {
    if (status === 'tesSUCCESS') return 'bg-green-500'
    if (status?.startsWith('tec')) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Transaction Monitor
            </CardTitle>
            <CardDescription>Real-time monitoring of your XRPL activity</CardDescription>
          </div>
          <Button
            variant={monitoring ? 'destructive' : 'default'}
            size="sm"
            onClick={toggleMonitoring}
          >
            {monitoring ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Monitor
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total Transactions</div>
                <div className="text-2xl font-bold">{stats.totalTx}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                  {stats.successRate >= 95 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Avg Fee</div>
                <div className="text-2xl font-bold">{stats.avgFee.toFixed(6)} XRP</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Last Activity</div>
                <div className="text-sm font-medium truncate">{stats.lastActivity}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Recent Activity</h3>
            {monitoring && (
              <Badge variant="outline" className="animate-pulse">
                <Activity className="mr-1 h-3 w-3" />
                Live
              </Badge>
            )}
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <Card key={activity.hash}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`} />
                          <Badge variant="outline" className="text-xs">
                            {activity.type}
                          </Badge>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {activity.hash.substring(0, 16)}...
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activity.time}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Monitoring Status */}
        <div className={`p-4 rounded-lg ${monitoring ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${monitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {monitoring ? 'Monitoring active - Updates every 10 seconds' : 'Monitoring paused - Click "Monitor" to start'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

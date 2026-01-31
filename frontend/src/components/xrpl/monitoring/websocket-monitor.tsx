/**
 * WebSocket Monitor Component
 * Real-time XRPL blockchain monitoring with live transaction stream
 */

import React, { useState, useEffect } from 'react'
import { Client } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, Square, Circle, ExternalLink, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface WebSocketMonitorProps {
  walletAddress: string
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  onTransactionReceived?: (tx: any) => void
}

interface TransactionEvent {
  hash: string
  type: string
  ledger_index: number
  validated: boolean
  timestamp: number
  account: string
  destination?: string
  amount?: any
  result: string
}

export function WebSocketMonitor({ 
  walletAddress, 
  network,
  onTransactionReceived
}: WebSocketMonitorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<TransactionEvent[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
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

  // Connect to WebSocket
  const handleConnect = async () => {
    try {
      setConnectionStatus('connecting')
      setError(null)

      const xrplClient = new Client(getWsUrl())
      
      // Set up event listeners
      xrplClient.on('connected', () => {
        console.log('✅ WebSocket connected')
        setConnectionStatus('connected')
        setIsConnected(true)
      })

      xrplClient.on('disconnected', (code: number) => {
        console.log(`⚠️ WebSocket disconnected (code: ${code})`)
        setConnectionStatus('disconnected')
        setIsConnected(false)
      })

      xrplClient.on('error', (error: any) => {
        console.error('WebSocket error:', error)
        setError(error.message || 'Connection error')
      })

      // Listen for transactions
      xrplClient.on('transaction', (tx: any) => {
        console.log('🔔 New transaction:', tx)
        
        const transaction = tx.transaction
        const meta = tx.meta

        const event: TransactionEvent = {
          hash: transaction.hash,
          type: transaction.TransactionType,
          ledger_index: transaction.ledger_index,
          validated: tx.validated,
          timestamp: Date.now(),
          account: transaction.Account,
          destination: transaction.Destination,
          amount: transaction.Amount || transaction.DeliverMax,
          result: meta?.TransactionResult || 'pending'
        }

        setEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events

        // Callback for parent component
        if (onTransactionReceived) {
          onTransactionReceived(tx)
        }
      })

      // Connect
      await xrplClient.connect()

      // Subscribe to account
      await xrplClient.request({
        command: 'subscribe',
        accounts: [walletAddress]
      })

      console.log(`📡 Subscribed to ${walletAddress}`)

      setClient(xrplClient)
    } catch (err: any) {
      console.error('Failed to connect:', err)
      setError(err.message || 'Failed to connect')
      setConnectionStatus('disconnected')
      setIsConnected(false)
    }
  }

  // Disconnect from WebSocket
  const handleDisconnect = async () => {
    if (client) {
      try {
        await client.request({
          command: 'unsubscribe',
          accounts: [walletAddress]
        })

        await client.disconnect()
        setClient(null)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        console.log('✅ WebSocket disconnected')
      } catch (err: any) {
        console.error('Error disconnecting:', err)
      }
    }
  }

  // Toggle connection
  const handleToggle = () => {
    if (isConnected) {
      handleDisconnect()
    } else {
      handleConnect()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.disconnect().catch(console.error)
      }
    }
  }, [client])

  // Format transaction type for display
  const formatTransactionType = (type: string): string => {
    return type.replace(/([A-Z])/g, ' $1').trim()
  }

  // Get status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      case 'disconnected': return 'text-gray-400'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className={`h-5 w-5 ${getStatusColor()}`} />
              ) : (
                <WifiOff className="h-5 w-5 text-gray-400" />
              )}
              WebSocket Monitor
            </CardTitle>
            <CardDescription>
              Real-time blockchain events for {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </CardDescription>
          </div>
          <Button 
            onClick={handleToggle} 
            variant={isConnected ? 'destructive' : 'default'}
            disabled={connectionStatus === 'connecting'}
          >
            {connectionStatus === 'connecting' ? (
              <>
                <Circle className="h-4 w-4 mr-2 animate-pulse" />
                Connecting...
              </>
            ) : isConnected ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 ${isConnected ? 'animate-pulse' : ''} ${getStatusColor()}`} />
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {network}
            </Badge>
            {isConnected && (
              <Badge variant="outline">
                {events.length} events
              </Badge>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center justify-between">
            <span>Live Events</span>
            {events.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEvents([])}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            )}
          </h3>

          {!isConnected ? (
            <div className="text-center py-8 text-muted-foreground">
              <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click "Start" to begin monitoring</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
              <p className="text-sm">Listening for transactions...</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {events.map((event, i) => (
                  <div 
                    key={`${event.hash}-${i}`} 
                    className="p-3 bg-muted rounded-lg space-y-2 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {formatTransactionType(event.type)}
                          </Badge>
                          <Badge 
                            variant={event.result === 'tesSUCCESS' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {event.result}
                          </Badge>
                          {event.validated && (
                            <Badge variant="secondary" className="text-xs">
                              Validated
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {event.hash}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>
                            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                          </span>
                          <span>•</span>
                          <span>Ledger {event.ledger_index.toLocaleString()}</span>
                        </div>

                        <a
                          href={getExplorerUrl(event.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          View details
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {event.amount && typeof event.amount === 'string' && (
                        <div className="text-right">
                          <Badge variant="outline" className="font-mono text-xs">
                            {(parseFloat(event.amount) / 1_000_000).toFixed(2)} XRP
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

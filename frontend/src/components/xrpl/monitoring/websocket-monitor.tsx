/**
 * WebSocket Monitor Component
 * Real-time XRPL blockchain monitoring
 */

import React, { useState, useEffect } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLWebSocketMonitorService } from '@/services/wallet/ripple/monitoring'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Square, Circle } from 'lucide-react'

interface WebSocketMonitorProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function WebSocketMonitor({ wallet, network, projectId }: WebSocketMonitorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [monitorService, setMonitorService] = useState<XRPLWebSocketMonitorService | null>(null)

  const handleToggleMonitor = async () => {
    if (isConnected && monitorService) {
      monitorService.disconnect()
      setMonitorService(null)
      setIsConnected(false)
    } else {
      setIsConnected(true)
      
      // Get WebSocket URL based on network
      const wsUrl = network === 'MAINNET' 
        ? 'wss://xrplcluster.com'
        : network === 'TESTNET'
        ? 'wss://s.altnet.rippletest.net:51233'
        : 'wss://s.devnet.rippletest.net:51233'
      
      const service = new XRPLWebSocketMonitorService(wsUrl)
      
      // Set handlers first
      service.setHandlers({
        onTransaction: (tx) => {
          setEvents(prev => [{ type: 'transaction', data: tx, timestamp: Date.now() }, ...prev.slice(0, 19)])
        }
      })
      
      // Connect and subscribe
      await service.connect()
      await service.subscribe({
        accounts: [wallet.address]
      })
      
      setMonitorService(service)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>WebSocket Monitor</CardTitle>
            <CardDescription>Real-time blockchain events</CardDescription>
          </div>
          <Button onClick={handleToggleMonitor} variant={isConnected ? 'destructive' : 'default'}>
            {isConnected ? <Square className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
            {isConnected ? 'Stop' : 'Start'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${isConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent Events</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-auto">
              {events.map((event, i) => (
                <div key={i} className="text-xs p-2 bg-muted rounded">
                  <Badge variant="outline" className="mr-2">{event.type}</Badge>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

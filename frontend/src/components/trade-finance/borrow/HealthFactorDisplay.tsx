/**
 * Health Factor Display Component
 * Shows user's current health factor with visual indicator and real-time updates
 * Pattern: Reusable status display component with API and WebSocket integration
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Import services
import { createTradeFinanceAPIService, TradeFinanceAPIService, HealthFactorResponse } from '@/services/trade-finance'
import { TradeFinanceWebSocketClient, HealthFactorUpdate } from '@/services/trade-finance/WebSocketClient'

interface HealthFactorDisplayProps {
  userAddress: string
  projectId: string
  apiBaseURL?: string
  wsURL?: string
  className?: string
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function HealthFactorDisplay({
  userAddress,
  projectId,
  apiBaseURL,
  wsURL,
  className = '',
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 30000
}: HealthFactorDisplayProps) {
  const [healthData, setHealthData] = useState<HealthFactorResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiService, setApiService] = useState<TradeFinanceAPIService | null>(null)
  const [wsClient, setWsClient] = useState<TradeFinanceWebSocketClient | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Initialize API service
  useEffect(() => {
    const service = createTradeFinanceAPIService(projectId, apiBaseURL)
    setApiService(service)
  }, [projectId, apiBaseURL])

  // Initialize WebSocket client
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        const client = new TradeFinanceWebSocketClient(projectId, wsURL)
        await client.connect()

        // Subscribe to health factor updates for this user
        client.subscribe(`health-factor:${userAddress}`)

        // Handle real-time health factor updates
        client.on('HEALTH_FACTOR_UPDATE', (data: HealthFactorUpdate) => {
          if (data.userAddress === userAddress) {
            setHealthData(prev => prev ? {
              ...prev,
              healthFactor: data.healthFactor,
              status: data.status,
              updatedAt: data.timestamp
            } : null)

            setLastUpdate(new Date())

            // Show critical notifications
            if (data.status === 'liquidatable') {
              toast.error('Critical: Position Liquidatable!', {
                description: `Health Factor: ${data.healthFactor.toFixed(2)}`
              })
            } else if (data.status === 'danger') {
              toast.warning('Warning: Low Health Factor', {
                description: `Health Factor: ${data.healthFactor.toFixed(2)}`
              })
            }
          }
        })

        setWsClient(client)
      } catch (error) {
        console.error('WebSocket connection failed:', error)
        // Continue without WebSocket
      }
    }

    initWebSocket()

    return () => {
      if (wsClient) {
        wsClient.disconnect()
      }
    }
  }, [userAddress, projectId, wsURL])

  // Fetch health factor from API
  const fetchHealthFactor = useCallback(async () => {
    if (!apiService) return

    try {
      setIsLoading(true)
      setError(null)

      const data = await apiService.getHealthFactor(userAddress)
      setHealthData(data)
      setLastUpdate(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch health factor'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userAddress, apiService])

  // Initial fetch
  useEffect(() => {
    fetchHealthFactor()
  }, [fetchHealthFactor])

  // Auto-refresh (only if WebSocket is not connected)
  useEffect(() => {
    if (!autoRefresh || wsClient) return

    const interval = setInterval(() => {
      fetchHealthFactor()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, wsClient, fetchHealthFactor])

  const getHealthStatus = (hf: number) => {
    if (hf >= 1.5) {
      return {
        label: 'Healthy',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-500',
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        badge: 'default',
        badgeClass: 'bg-green-500'
      }
    } else if (hf >= 1.1) {
      return {
        label: 'Warning',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500',
        icon: <Info className="h-5 w-5 text-yellow-600" />,
        badge: 'default',
        badgeClass: 'bg-yellow-500'
      }
    } else if (hf >= 1.0) {
      return {
        label: 'At Risk',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-500',
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
        badge: 'default',
        badgeClass: 'bg-orange-500'
      }
    } else {
      return {
        label: 'Liquidatable',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
        badge: 'destructive',
        badgeClass: 'bg-red-500'
      }
    }
  }

  if (isLoading && !healthData) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading health factor...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !healthData) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHealthFactor}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!healthData) return null

  const status = getHealthStatus(healthData.healthFactor)
  const progressValue = Math.min((healthData.healthFactor / 2) * 100, 100)
  const timeSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Health Factor</CardTitle>
            {wsClient && (
              <Badge variant="secondary" className="text-xs">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {timeSinceUpdate}s ago
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHealthFactor}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Position health and liquidation risk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Health Factor Display */}
        <div className="flex items-center justify-between p-4 rounded-lg border-2" 
             style={{ borderColor: `var(--${status.borderColor})` }}>
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Health Factor</p>
              <p className={`text-3xl font-bold ${status.color}`}>
                {healthData.healthFactor.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className={`text-sm font-semibold ${status.color}`}>
              {status.label}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={progressValue} 
            className={healthData.healthFactor < 1.0 ? 'bg-red-200' : ''} 
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Liquidatable (&lt; 1.0)</span>
            <span>Healthy (≥ 1.5)</span>
          </div>
        </div>

        {/* Warning Alert */}
        {healthData.healthFactor < 1.1 && healthData.healthFactor >= 1.0 && (
          <Alert className="border-orange-500 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Your position is at risk. Consider adding more collateral or repaying debt.
            </AlertDescription>
          </Alert>
        )}

        {healthData.healthFactor < 1.0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your position can be liquidated! Add collateral or repay debt immediately.
            </AlertDescription>
          </Alert>
        )}

        {/* Details Section */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total Collateral</p>
              <p className="text-lg font-semibold">
                ${healthData.totalCollateralValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="text-lg font-semibold">
                ${healthData.totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liq. Threshold</p>
              <p className="text-lg font-semibold">
                {(healthData.liquidationThreshold * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={status.badgeClass}>
                {status.label}
              </Badge>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            Health Factor = (Collateral × Liq. Threshold) / Total Debt. 
            Below 1.0, your position can be liquidated by anyone.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default HealthFactorDisplay

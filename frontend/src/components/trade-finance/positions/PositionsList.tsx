/**
 * Positions List Component
 * Displays all user positions in a table format with real-time updates
 * Shows: Collateral supplied, Amount borrowed, Health Factor, Actions
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle2, Info, TrendingDown, TrendingUp, ExternalLink, Plus, Loader2, RefreshCw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// Import services
import { createTradeFinanceAPIService, TradeFinanceAPIService, PositionDetails } from '@/services/trade-finance'
import { TradeFinanceWebSocketClient, HealthFactorUpdate, PositionUpdate } from '@/services/trade-finance/WebSocketClient'

interface Position {
  id: string
  commodityToken: string
  commodityName: string
  collateralAmount: string
  collateralValueUSD: string
  borrowedAsset: string
  borrowedAmount: string
  borrowedValueUSD: string
  healthFactor: number
  liquidationThreshold: number
  availableToBorrow: string
  updatedAt: Date
}

interface PositionsListProps {
  userAddress?: string
  projectId: string
  apiBaseURL?: string
  wsURL?: string
  onSupply?: () => void
  onBorrow?: () => void
  onRepay?: (position: Position) => void
  onWithdraw?: (position: Position) => void
  onViewDetails?: (position: Position) => void
}

export function PositionsList({
  userAddress,
  projectId,
  apiBaseURL,
  wsURL,
  onSupply,
  onBorrow,
  onRepay,
  onWithdraw,
  onViewDetails
}: PositionsListProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiService, setApiService] = useState<TradeFinanceAPIService | null>(null)
  const [wsClient, setWsClient] = useState<TradeFinanceWebSocketClient | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Initialize API service
  useEffect(() => {
    const service = createTradeFinanceAPIService(projectId, apiBaseURL)
    setApiService(service)
  }, [projectId, apiBaseURL])

  // Initialize WebSocket client
  useEffect(() => {
    if (!userAddress) return

    const initWebSocket = async () => {
      try {
        setIsConnecting(true)
        const client = new TradeFinanceWebSocketClient(projectId, wsURL)
        await client.connect()

        // Subscribe to health factor updates for this user
        client.subscribe(`health-factor:${userAddress}`)
        client.subscribe(`position:${userAddress}`)

        // Handle health factor updates
        client.on('HEALTH_FACTOR_UPDATE', (data: HealthFactorUpdate) => {
          if (data.userAddress === userAddress) {
            // Update the health factor in positions
            setPositions(prev => prev.map(pos => ({
              ...pos,
              healthFactor: data.healthFactor
            })))

            // Show toast for critical changes
            if (data.status === 'liquidatable') {
              toast.error('Warning: Position liquidatable!', {
                description: `Health Factor: ${data.healthFactor.toFixed(2)}`
              })
            } else if (data.status === 'danger') {
              toast.warning('Warning: Low Health Factor', {
                description: `Health Factor: ${data.healthFactor.toFixed(2)}`
              })
            }
          }
        })

        // Handle position updates
        client.on('POSITION_UPDATE', (data: PositionUpdate) => {
          if (data.userAddress === userAddress) {
            // Refresh positions when changes occur
            fetchPositions()
            
            toast.success(`Position ${data.action}`, {
              description: `Action: ${data.action}`
            })
          }
        })

        setWsClient(client)
        setIsConnecting(false)
      } catch (error) {
        console.error('WebSocket connection failed:', error)
        setIsConnecting(false)
        // Continue without WebSocket (polling fallback)
      }
    }

    initWebSocket()

    // Cleanup
    return () => {
      if (wsClient) {
        wsClient.disconnect()
      }
    }
  }, [userAddress, projectId, wsURL])

  // Fetch user positions from API
  const fetchPositions = useCallback(async () => {
    if (!userAddress || !apiService) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Get position details from API
      const positionDetails = await apiService.getPositionDetails(userAddress)

      // Transform API response to Position format
      const transformedPositions: Position[] = positionDetails.collateral.map((collateral, index) => {
        const debt = positionDetails.debt[index] || positionDetails.debt[0]
        
        return {
          id: collateral.id,
          commodityToken: collateral.token_address,
          commodityName: `${collateral.commodity_type} (${collateral.token_address.slice(0, 6)}...)`,
          collateralAmount: (parseFloat(collateral.amount) / 1e18).toFixed(4),
          collateralValueUSD: collateral.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          borrowedAsset: debt?.asset_address || 'N/A',
          borrowedAmount: debt ? (parseFloat(debt.amount) / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0',
          borrowedValueUSD: debt?.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0',
          healthFactor: positionDetails.metrics.healthFactor,
          liquidationThreshold: positionDetails.metrics.liquidationThreshold * 100,
          availableToBorrow: positionDetails.metrics.availableToBorrow.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          updatedAt: new Date(collateral.created_at)
        }
      })

      setPositions(transformedPositions)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch positions'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userAddress, apiService])

  // Fetch positions on mount and when dependencies change
  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  // Poll for updates every 30 seconds if WebSocket is not connected
  useEffect(() => {
    if (!wsClient && userAddress) {
      const interval = setInterval(() => {
        fetchPositions()
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [wsClient, userAddress, fetchPositions])

  // Get health factor color and status
  const getHealthFactorColor = (hf: number): string => {
    if (hf >= 1.5) return 'text-green-600'
    if (hf >= 1.1) return 'text-yellow-600'
    if (hf >= 1.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getHealthFactorStatus = (hf: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (hf >= 1.5) return { label: 'Healthy', variant: 'default' }
    if (hf >= 1.1) return { label: 'Warning', variant: 'secondary' }
    if (hf >= 1.0) return { label: 'At Risk', variant: 'outline' }
    return { label: 'Liquidatable', variant: 'destructive' }
  }

  const getHealthFactorIcon = (hf: number) => {
    if (hf >= 1.5) return <CheckCircle2 className="h-4 w-4 text-green-600" />
    if (hf >= 1.1) return <Info className="h-4 w-4 text-yellow-600" />
    return <AlertCircle className="h-4 w-4 text-red-600" />
  }

  const getHealthFactorProgress = (hf: number): number => {
    return Math.min((hf / 2.0) * 100, 100)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading positions...</p>
            {isConnecting && (
              <p className="text-xs text-muted-foreground">Connecting to real-time updates...</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchPositions()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!userAddress) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Info className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Connect wallet to view positions</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Info className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No positions found</p>
            <div className="flex gap-2">
              {onSupply && (
                <Button size="sm" onClick={onSupply}>
                  <Plus className="h-4 w-4 mr-2" />
                  Supply Collateral
                </Button>
              )}
              {onBorrow && (
                <Button size="sm" variant="outline" onClick={onBorrow}>
                  <Plus className="h-4 w-4 mr-2" />
                  Borrow
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              My Positions
              {wsClient && (
                <Badge variant="secondary" className="text-xs">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {positions.length} active position{positions.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => fetchPositions()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onSupply && (
              <Button size="sm" onClick={onSupply}>
                <Plus className="h-4 w-4 mr-2" />
                Supply
              </Button>
            )}
            {onBorrow && (
              <Button size="sm" variant="outline" onClick={onBorrow}>
                <Plus className="h-4 w-4 mr-2" />
                Borrow
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collateral</TableHead>
                <TableHead>Borrowed</TableHead>
                <TableHead>Health Factor</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const hfStatus = getHealthFactorStatus(position.healthFactor)
                const hfProgress = getHealthFactorProgress(position.healthFactor)

                return (
                  <TableRow key={position.id}>
                    {/* Collateral */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-medium">{position.commodityName}</span>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{position.collateralAmount}</span>
                          <span className="text-xs">≈ ${position.collateralValueUSD}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Borrowed */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-medium">{position.borrowedAsset.slice(0, 8)}...</span>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>${position.borrowedAmount}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Health Factor */}
                    <TableCell>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          {getHealthFactorIcon(position.healthFactor)}
                          <span className={`font-semibold ${getHealthFactorColor(position.healthFactor)}`}>
                            {position.healthFactor.toFixed(2)}
                          </span>
                          <Badge variant={hfStatus.variant} className="text-xs">
                            {hfStatus.label}
                          </Badge>
                        </div>
                        <Progress value={hfProgress} className="h-1" />
                      </div>
                    </TableCell>

                    {/* Available to Borrow */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-medium text-green-600">${position.availableToBorrow}</span>
                        <span className="text-xs text-muted-foreground">LT: {position.liquidationThreshold.toFixed(0)}%</span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {onViewDetails && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewDetails(position)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {onRepay && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRepay(position)}
                          >
                            Repay
                          </Button>
                        )}
                        {onWithdraw && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onWithdraw(position)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

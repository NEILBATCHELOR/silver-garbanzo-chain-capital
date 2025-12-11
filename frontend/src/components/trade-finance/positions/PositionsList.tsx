/**
 * Positions List Component
 * Displays all user positions in a table format
 * Shows: Collateral supplied, Amount borrowed, Health Factor, Actions
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle2, Info, TrendingDown, TrendingUp, ExternalLink, Plus, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// Import services
import { createCommodityPoolService, ChainType } from '@/services/trade-finance'

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
  poolAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
  onSupply?: () => void
  onBorrow?: () => void
  onRepay?: (position: Position) => void
  onWithdraw?: (position: Position) => void
  onViewDetails?: (position: Position) => void
}

export function PositionsList({
  userAddress,
  poolAddress = '0x...',
  chainId = 11155111,
  networkType = 'testnet',
  onSupply,
  onBorrow,
  onRepay,
  onWithdraw,
  onViewDetails
}: PositionsListProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user positions
  useEffect(() => {
    const fetchPositions = async () => {
      if (!userAddress) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // TODO: Replace with actual service call
        // const poolService = createCommodityPoolService({
        //   poolAddress,
        //   chainType: ChainType.ETHEREUM,
        //   chainId,
        //   networkType
        // })
        // const result = await poolService.getUserPositions(userAddress)

        // Mock data for now
        const mockPositions: Position[] = [
          {
            id: '1',
            commodityToken: '0xabc123',
            commodityName: 'Gold (GOLD)',
            collateralAmount: '10.5',
            collateralValueUSD: '21,525.00',
            borrowedAsset: 'USDC',
            borrowedAmount: '15,000',
            borrowedValueUSD: '15,000.00',
            healthFactor: 1.43,
            liquidationThreshold: 85,
            availableToBorrow: '3,296.25',
            updatedAt: new Date()
          },
          {
            id: '2',
            commodityToken: '0xdef456',
            commodityName: 'Silver (SILVER)',
            collateralAmount: '500.0',
            collateralValueUSD: '12,250.00',
            borrowedAsset: 'USDT',
            borrowedAmount: '8,000',
            borrowedValueUSD: '8,000.00',
            healthFactor: 1.28,
            liquidationThreshold: 85,
            availableToBorrow: '2,412.50',
            updatedAt: new Date()
          },
          {
            id: '3',
            commodityToken: '0xghi789',
            commodityName: 'Crude Oil (OIL)',
            collateralAmount: '1000.0',
            collateralValueUSD: '72,450.00',
            borrowedAsset: 'DAI',
            borrowedAmount: '50,000',
            borrowedValueUSD: '50,000.00',
            healthFactor: 1.23,
            liquidationThreshold: 75,
            availableToBorrow: '4,337.50',
            updatedAt: new Date()
          }
        ]

        setPositions(mockPositions)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch positions'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPositions()
  }, [userAddress, poolAddress, chainId, networkType])

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
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
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
            <CardTitle>My Positions</CardTitle>
            <CardDescription>
              {positions.length} active position{positions.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex gap-2">
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
                        <span className="font-medium">{position.borrowedAsset}</span>
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
                        <span className="text-xs text-muted-foreground">LT: {position.liquidationThreshold}%</span>
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

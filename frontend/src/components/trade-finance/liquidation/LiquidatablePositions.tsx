/**
 * Liquidatable Positions Component
 * Dashboard for liquidators showing positions available for liquidation
 * Filters: Health Factor < 1.0, sorts by profitability
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, TrendingDown, Zap, Loader2, Search, RefreshCw, DollarSign } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface LiquidatablePosition {
  id: string
  borrower: string
  commodityToken: string
  commodityName: string
  collateralAmount: string
  collateralValueUSD: string
  borrowedAsset: string
  borrowedAmount: string
  borrowedValueUSD: string
  healthFactor: number
  liquidationBonus: number
  potentialProfit: string
  liquidationThreshold: number
  urgency: 'critical' | 'high' | 'medium'
}

interface LiquidatablePositionsProps {
  poolAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
  onLiquidate?: (position: LiquidatablePosition) => void
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

export function LiquidatablePositions({
  poolAddress = '0x...',
  chainId = 11155111,
  networkType = 'testnet',
  onLiquidate,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: LiquidatablePositionsProps) {
  const [positions, setPositions] = useState<LiquidatablePosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'profit' | 'healthFactor' | 'urgency'>('profit')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Fetch liquidatable positions
  const fetchPositions = async () => {
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
      // const result = await poolService.getLiquidatablePositions()

      // Mock data
      const mockPositions: LiquidatablePosition[] = [
        {
          id: '1',
          borrower: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          commodityToken: '0xabc123',
          commodityName: 'Gold (GOLD)',
          collateralAmount: '5.2',
          collateralValueUSD: '10,660',
          borrowedAsset: 'USDC',
          borrowedAmount: '10,800',
          borrowedValueUSD: '10,800',
          healthFactor: 0.97,
          liquidationBonus: 5,
          potentialProfit: '533',
          liquidationThreshold: 85,
          urgency: 'critical'
        },
        {
          id: '2',
          borrower: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
          commodityToken: '0xdef456',
          commodityName: 'Silver (SILVER)',
          collateralAmount: '450.0',
          collateralValueUSD: '11,025',
          borrowedAsset: 'USDT',
          borrowedAmount: '11,100',
          borrowedValueUSD: '11,100',
          healthFactor: 0.99,
          liquidationBonus: 5,
          potentialProfit: '551.25',
          liquidationThreshold: 85,
          urgency: 'high'
        },
        {
          id: '3',
          borrower: '0x9F2f3C2c0b735e62f39d1a8b63a1c4f9B5e4D3A1',
          commodityToken: '0xghi789',
          commodityName: 'Crude Oil (OIL)',
          collateralAmount: '800.0',
          collateralValueUSD: '57,960',
          borrowedAsset: 'DAI',
          borrowedAmount: '58,500',
          borrowedValueUSD: '58,500',
          healthFactor: 0.99,
          liquidationBonus: 8,
          potentialProfit: '4,636.80',
          liquidationThreshold: 75,
          urgency: 'high'
        }
      ]

      setPositions(mockPositions)
      setLastRefresh(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch positions'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchPositions()
  }, [poolAddress, chainId, networkType])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchPositions()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Filter positions
  const filteredPositions = positions.filter(p => 
    p.borrower.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.commodityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.borrowedAsset.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort positions
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    switch (sortBy) {
      case 'profit':
        return parseFloat(b.potentialProfit) - parseFloat(a.potentialProfit)
      case 'healthFactor':
        return a.healthFactor - b.healthFactor
      case 'urgency':
        const urgencyOrder = { critical: 0, high: 1, medium: 2 }
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      default:
        return 0
    }
  })

  // Get urgency badge
  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      critical: { variant: 'destructive' as const, label: 'Critical', icon: <AlertCircle className="h-3 w-3" /> },
      high: { variant: 'outline' as const, label: 'High', icon: <TrendingDown className="h-3 w-3" /> },
      medium: { variant: 'secondary' as const, label: 'Medium', icon: <TrendingDown className="h-3 w-3" /> }
    }
    const config = variants[urgency as keyof typeof variants]
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  // Get health factor color
  const getHealthFactorColor = (hf: number): string => {
    if (hf < 0.95) return 'text-red-600 font-bold'
    if (hf < 1.0) return 'text-orange-600 font-semibold'
    return 'text-yellow-600'
  }

  if (isLoading && positions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Scanning for liquidatable positions...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && positions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPositions}>
              Retry
            </Button>
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
              <Zap className="h-5 w-5 text-orange-500" />
              Liquidatable Positions
            </CardTitle>
            <CardDescription>
              {sortedPositions.length} position{sortedPositions.length !== 1 ? 's' : ''} available for liquidation
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {Math.floor((Date.now() - lastRefresh.getTime()) / 1000)}s ago
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPositions}
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address, commodity, or asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit">Highest Profit</SelectItem>
              <SelectItem value="healthFactor">Lowest Health Factor</SelectItem>
              <SelectItem value="urgency">Most Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Potential Profit</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${sortedPositions.reduce((sum, p) => sum + parseFloat(p.potentialProfit), 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Positions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {sortedPositions.filter(p => p.urgency === 'critical').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Health Factor</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(sortedPositions.reduce((sum, p) => sum + p.healthFactor, 0) / sortedPositions.length).toFixed(2)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Positions Table */}
        {sortedPositions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">No liquidatable positions found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Collateral</TableHead>
                  <TableHead>Debt</TableHead>
                  <TableHead>Health Factor</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPositions.map((position) => (
                  <TableRow key={position.id}>
                    {/* Borrower */}
                    <TableCell className="font-mono text-xs">
                      {position.borrower.slice(0, 6)}...{position.borrower.slice(-4)}
                    </TableCell>

                    {/* Collateral */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-medium">{position.commodityName}</span>
                        <span className="text-xs text-muted-foreground">
                          {position.collateralAmount} ≈ ${position.collateralValueUSD}
                        </span>
                      </div>
                    </TableCell>

                    {/* Debt */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-medium">{position.borrowedAsset}</span>
                        <span className="text-xs text-muted-foreground">
                          ${position.borrowedAmount}
                        </span>
                      </div>
                    </TableCell>

                    {/* Health Factor */}
                    <TableCell>
                      <div className="flex flex-col space-y-2">
                        <span className={getHealthFactorColor(position.healthFactor)}>
                          {position.healthFactor.toFixed(2)}
                        </span>
                        <Progress 
                          value={position.healthFactor * 50} 
                          className="h-1"
                        />
                      </div>
                    </TableCell>

                    {/* Profit */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-bold text-green-600">${position.potentialProfit}</span>
                        <span className="text-xs text-muted-foreground">
                          +{position.liquidationBonus}% bonus
                        </span>
                      </div>
                    </TableCell>

                    {/* Urgency */}
                    <TableCell>
                      {getUrgencyBadge(position.urgency)}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      {onLiquidate && (
                        <Button
                          size="sm"
                          onClick={() => onLiquidate(position)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Liquidate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

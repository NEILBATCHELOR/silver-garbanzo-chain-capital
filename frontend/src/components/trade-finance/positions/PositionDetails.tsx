/**
 * Position Details Component
 * Detailed view of a single position
 * Shows: Collateral details, Borrow details, Health metrics, Actions
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle2, Info, TrendingDown, TrendingUp, ExternalLink, Clock } from 'lucide-react'

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
  interestRate: string
  accruedInterest: string
  updatedAt: Date
}

interface PositionDetailsProps {
  position: Position
  onRepay?: () => void
  onWithdraw?: () => void
  onBorrowMore?: () => void
  onSupplyMore?: () => void
}

export function PositionDetails({
  position,
  onRepay,
  onWithdraw,
  onBorrowMore,
  onSupplyMore
}: PositionDetailsProps) {
  // Get health factor color and status
  const getHealthFactorColor = (hf: number): string => {
    if (hf >= 1.5) return 'text-green-600'
    if (hf >= 1.1) return 'text-yellow-600'
    if (hf >= 1.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getHealthFactorBgColor = (hf: number): string => {
    if (hf >= 1.5) return 'bg-green-50 border-green-200'
    if (hf >= 1.1) return 'bg-yellow-50 border-yellow-200'
    if (hf >= 1.0) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  const getHealthFactorStatus = (hf: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (hf >= 1.5) return { label: 'Healthy', variant: 'default' }
    if (hf >= 1.1) return { label: 'Warning', variant: 'secondary' }
    if (hf >= 1.0) return { label: 'At Risk', variant: 'outline' }
    return { label: 'Liquidatable', variant: 'destructive' }
  }

  const getHealthFactorIcon = (hf: number) => {
    if (hf >= 1.5) return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (hf >= 1.1) return <Info className="h-5 w-5 text-yellow-600" />
    return <AlertCircle className="h-5 w-5 text-red-600" />
  }

  const getHealthFactorProgress = (hf: number): number => {
    return Math.min((hf / 2.0) * 100, 100)
  }

  const hfStatus = getHealthFactorStatus(position.healthFactor)
  const hfProgress = getHealthFactorProgress(position.healthFactor)

  const utilizationRate = (parseFloat(position.borrowedValueUSD.replace(/,/g, '')) / 
                          parseFloat(position.collateralValueUSD.replace(/,/g, '')) * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Health Factor Card */}
      <Card className={`${getHealthFactorBgColor(position.healthFactor)} border-2`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getHealthFactorIcon(position.healthFactor)}
              <div>
                <CardTitle>Health Factor</CardTitle>
                <CardDescription>Current position health</CardDescription>
              </div>
            </div>
            <Badge variant={hfStatus.variant} className="text-sm">
              {hfStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-4xl font-bold ${getHealthFactorColor(position.healthFactor)}`}>
              {position.healthFactor.toFixed(2)}
            </span>
            <div className="text-right space-y-1">
              <div className="text-sm text-muted-foreground">Liquidation at</div>
              <div className="text-lg font-semibold">1.00</div>
            </div>
          </div>
          <Progress value={hfProgress} className="h-2" />
          {position.healthFactor < 1.1 && (
            <div className="flex items-start space-x-2 p-3 bg-white border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Position at risk</p>
                <p className="text-amber-700">Consider supplying more collateral or repaying debt</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collateral & Debt Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collateral Card */}
        <Card>
          <CardHeader>
            <CardTitle>Collateral Supplied</CardTitle>
            <CardDescription>{position.commodityName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{position.collateralAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value (USD)</span>
                <span className="font-semibold text-lg">${position.collateralValueUSD}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Token</span>
                <span className="font-mono text-xs">{position.commodityToken.slice(0, 10)}...</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Liquidation Threshold</span>
              <Badge variant="outline">{position.liquidationThreshold}%</Badge>
            </div>
            {onSupplyMore && (
              <Button className="w-full" variant="outline" onClick={onSupplyMore}>
                Supply More
              </Button>
            )}
            {onWithdraw && (
              <Button className="w-full" variant="outline" onClick={onWithdraw}>
                Withdraw
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Debt Card */}
        <Card>
          <CardHeader>
            <CardTitle>Amount Borrowed</CardTitle>
            <CardDescription>{position.borrowedAsset}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-medium">${position.borrowedAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accrued Interest</span>
                <span className="font-medium">${position.accruedInterest || '125.50'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Debt</span>
                <span className="font-semibold text-lg">${position.borrowedValueUSD}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interest Rate (APY)</span>
              <Badge variant="outline">{position.interestRate || '5.25'}%</Badge>
            </div>
            {onBorrowMore && (
              <Button className="w-full" variant="outline" onClick={onBorrowMore}>
                Borrow More
              </Button>
            )}
            {onRepay && (
              <Button className="w-full" onClick={onRepay}>
                Repay
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Position Metrics</CardTitle>
          <CardDescription>Key statistics and ratios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Utilization</p>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{utilizationRate}%</p>
                <Progress value={parseFloat(utilizationRate)} className="h-1" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Available to Borrow</p>
              <p className="text-2xl font-bold text-green-600">${position.availableToBorrow}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Liquidation Price</p>
              <p className="text-2xl font-bold text-red-600">
                ${(parseFloat(position.borrowedValueUSD.replace(/,/g, '')) / 
                   parseFloat(position.collateralAmount) * 1.18).toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {position.updatedAt.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-blue-900">How Health Factor Works</p>
              <p className="text-blue-700">
                Health Factor = (Collateral Value × Liquidation Threshold) / Total Debt
              </p>
              <p className="text-blue-700">
                Keep your health factor above 1.1 to avoid liquidation risk. Below 1.0, your position can be liquidated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Supply Summary Component
 * Summary card showing total collateral supplied
 * Displays: Total value, breakdown by commodity, actions
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react'

interface CommoditySupply {
  commodityToken: string
  commodityName: string
  amount: string
  valueUSD: string
  percentage: number
}

interface SupplySummaryProps {
  totalValueUSD: string
  commodities: CommoditySupply[]
  changePercent24h?: number
  onSupplyMore?: () => void
  onWithdraw?: () => void
}

export function SupplySummary({
  totalValueUSD,
  commodities,
  changePercent24h = 0,
  onSupplyMore,
  onWithdraw
}: SupplySummaryProps) {
  const isPositiveChange = changePercent24h >= 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Total Collateral Supplied</CardTitle>
            <CardDescription>Across all commodity types</CardDescription>
          </div>
          <Badge variant={isPositiveChange ? 'default' : 'destructive'} className="h-6">
            {isPositiveChange ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {changePercent24h > 0 ? '+' : ''}{changePercent24h.toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Value */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold">${totalValueUSD}</span>
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Total value of supplied collateral
          </p>
        </div>

        {/* Commodity Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Commodity Breakdown</span>
            <span className="text-xs text-muted-foreground">{commodities.length} types</span>
          </div>

          <div className="space-y-3">
            {commodities.map((commodity, index) => (
              <div key={commodity.commodityToken} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{commodity.commodityName}</span>
                    <Badge variant="outline" className="text-xs">
                      {commodity.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">${commodity.valueUSD}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={commodity.percentage} 
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {commodity.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onSupplyMore && (
            <Button className="flex-1" onClick={onSupplyMore}>
              <Plus className="h-4 w-4 mr-2" />
              Supply More
            </Button>
          )}
          {onWithdraw && (
            <Button className="flex-1" variant="outline" onClick={onWithdraw}>
              <Minus className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Earning Potential</span>
            <span className="font-medium text-green-600">+2.5% APY</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used as Collateral</span>
            <span className="font-medium">100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

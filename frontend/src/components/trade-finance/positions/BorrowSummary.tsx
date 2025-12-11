/**
 * Borrow Summary Component
 * Summary card showing total amount borrowed
 * Displays: Total debt, breakdown by asset, interest rates, actions
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, TrendingUp, Plus, DollarSign } from 'lucide-react'

interface AssetBorrow {
  asset: string
  assetName: string
  principal: string
  accruedInterest: string
  totalDebt: string
  interestRate: string
  percentage: number
}

interface BorrowSummaryProps {
  totalDebtUSD: string
  totalInterestUSD: string
  assets: AssetBorrow[]
  weightedAvgAPY?: string
  onBorrowMore?: () => void
  onRepay?: () => void
}

export function BorrowSummary({
  totalDebtUSD,
  totalInterestUSD,
  assets,
  weightedAvgAPY = '5.23',
  onBorrowMore,
  onRepay
}: BorrowSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Total Amount Borrowed</CardTitle>
            <CardDescription>Across all borrowed assets</CardDescription>
          </div>
          <Badge variant="outline" className="h-6">
            <TrendingUp className="h-3 w-3 mr-1" />
            {weightedAvgAPY}% APY
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Debt */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold text-orange-600">${totalDebtUSD}</span>
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Accrued Interest:
            </span>
            <span className="text-sm font-medium text-orange-600">
              ${totalInterestUSD}
            </span>
          </div>
        </div>

        {/* Asset Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Asset Breakdown</span>
            <span className="text-xs text-muted-foreground">{assets.length} asset{assets.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.asset} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{asset.assetName}</span>
                    <Badge variant="outline" className="text-xs">
                      {asset.interestRate}% APY
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {asset.percentage.toFixed(1)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Principal</p>
                    <p className="font-medium">${asset.principal}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest</p>
                    <p className="font-medium text-orange-600">${asset.accruedInterest}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">${asset.totalDebt}</p>
                  </div>
                </div>

                <Progress 
                  value={asset.percentage} 
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onRepay && (
            <Button className="flex-1" onClick={onRepay}>
              Repay Debt
            </Button>
          )}
          {onBorrowMore && (
            <Button className="flex-1" variant="outline" onClick={onBorrowMore}>
              <Plus className="h-4 w-4 mr-2" />
              Borrow More
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Interest Accruing</span>
            <span className="font-medium">${(parseFloat(totalDebtUSD.replace(/,/g, '')) * parseFloat(weightedAvgAPY) / 100 / 365).toFixed(2)}/day</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Next Interest Update</span>
            <span className="font-medium">~12 hours</span>
          </div>
        </div>

        {/* Warning */}
        {parseFloat(totalDebtUSD.replace(/,/g, '')) > 50000 && (
          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">High debt level</p>
              <p className="text-amber-700">Consider monitoring your health factor closely</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

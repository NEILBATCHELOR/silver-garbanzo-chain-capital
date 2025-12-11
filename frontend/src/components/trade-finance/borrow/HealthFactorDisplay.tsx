/**
 * Health Factor Display Component
 * Shows user's current health factor with visual indicator
 * Pattern: Reusable status display component
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface HealthFactorDisplayProps {
  healthFactor: number
  totalCollateralUSD: number
  totalDebtUSD: number
  availableToBorrowUSD: number
  liquidationThreshold: number
  className?: string
  showDetails?: boolean
}

export function HealthFactorDisplay({
  healthFactor,
  totalCollateralUSD,
  totalDebtUSD,
  availableToBorrowUSD,
  liquidationThreshold,
  className = '',
  showDetails = true
}: HealthFactorDisplayProps) {
  
  const getHealthStatus = () => {
    if (healthFactor >= 1.5) {
      return {
        label: 'Healthy',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-500',
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        badge: 'default',
        badgeClass: 'bg-green-500'
      }
    } else if (healthFactor >= 1.1) {
      return {
        label: 'Warning',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500',
        icon: <Info className="h-5 w-5 text-yellow-600" />,
        badge: 'default',
        badgeClass: 'bg-yellow-500'
      }
    } else if (healthFactor >= 1.0) {
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

  const status = getHealthStatus()
  const progressValue = Math.min((healthFactor / 2) * 100, 100)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Health Factor</CardTitle>
          <Badge className={status.badgeClass}>
            {status.label}
          </Badge>
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
                {healthFactor.toFixed(2)}
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
            className={healthFactor < 1.0 ? 'bg-red-200' : ''} 
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Liquidatable (&lt; 1.0)</span>
            <span>Healthy (≥ 1.5)</span>
          </div>
        </div>

        {/* Warning Alert */}
        {healthFactor < 1.1 && healthFactor >= 1.0 && (
          <Alert className="border-orange-500 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Your position is at risk. Consider adding more collateral or repaying debt.
            </AlertDescription>
          </Alert>
        )}

        {healthFactor < 1.0 && (
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
                ${totalCollateralUSD.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="text-lg font-semibold">
                ${totalDebtUSD.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available to Borrow</p>
              <p className="text-lg font-semibold text-green-600">
                ${availableToBorrowUSD.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liq. Threshold</p>
              <p className="text-lg font-semibold">
                {liquidationThreshold}%
              </p>
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

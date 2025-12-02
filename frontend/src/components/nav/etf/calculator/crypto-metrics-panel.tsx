import { Bitcoin, TrendingUp, Layers } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { ETFProduct, ETFCalculationResult, Blockchain } from '@/types/nav/etf'

interface CryptoMetricsPanelProps {
  metrics: NonNullable<ETFCalculationResult['cryptoMetrics']>
  product: ETFProduct
}

export function CryptoMetricsPanel({ metrics, product }: CryptoMetricsPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const getBlockchainIcon = (blockchain: string) => {
    // You can replace this with actual blockchain icons
    return <Bitcoin className="h-4 w-4" />
  }

  const holdingsByChainArray = Object.entries(metrics.holdingsByChain || {})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Crypto Holdings Analysis
        </CardTitle>
        <CardDescription>
          Blockchain-specific metrics and staking yields
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Metrics */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Total Crypto Value</span>
              <p className="text-2xl font-bold">{formatCurrency(metrics.totalCryptoValue)}</p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Staking Rewards</span>
              <p className="text-2xl font-bold">{formatCurrency(metrics.stakingRewardsAccrued)}</p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Avg Staking Yield</span>
              <p className="text-2xl font-bold flex items-center gap-2">
                {formatPercent(metrics.averageStakingYield)}
                <TrendingUp className="h-4 w-4 text-green-500" />
              </p>
            </div>
          </div>

          <Separator />

          {/* Holdings by Blockchain */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Holdings by Blockchain</h4>
            <div className="space-y-3">
              {holdingsByChainArray.map(([blockchain, value]) => {
                const percentage = (value / metrics.totalCryptoValue) * 100
                return (
                  <div key={blockchain} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getBlockchainIcon(blockchain)}
                        <span className="text-sm font-medium capitalize">{blockchain}</span>
                        <Badge variant="outline">{formatPercent(percentage)}</Badge>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(value)}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {metrics.averageStakingYield > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Staking Information</h4>
                <p className="text-sm text-muted-foreground">
                  This ETF earns staking rewards from proof-of-stake blockchain holdings. 
                  Staking rewards are automatically accrued and included in the NAV calculation.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    APY: {formatPercent(metrics.averageStakingYield)}
                  </Badge>
                  <Badge variant="secondary">
                    Accrued: {formatCurrency(metrics.stakingRewardsAccrued)}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Balances Overview Component
 * Displays multi-asset balance summary with real-time updates
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useBalances } from '@/hooks/psp'
import { RefreshCw, DollarSign, Coins, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/utils'

interface BalancesOverviewProps {
  projectId: string
  className?: string
}

export const BalancesOverview: React.FC<BalancesOverviewProps> = ({
  projectId,
  className
}) => {
  const { balances, summary, loading, error, fetchBalances, syncBalances } = useBalances(projectId)

  const handleSync = async () => {
    await syncBalances({ project_id: projectId })
  }

  const formatCurrency = (amount: string, symbol: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return `0 ${symbol}`
    
    if (symbol === 'USD' || symbol.includes('USD')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num)
    }
    
    return `${num.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 8 
    })} ${symbol}`
  }

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchBalances} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Balances Overview
            </CardTitle>
            <CardDescription>
              Multi-asset balances across fiat and crypto
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Sync
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !summary ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* Total USD Value */}
            <div className="bg-muted/50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                  <p className="text-3xl font-bold mt-1">
                    {summary?.total_usd_value !== undefined && summary.total_usd_value !== null
                      ? formatCurrency(summary.total_usd_value.toString(), 'USD')
                      : '$0.00'}
                  </p>
                </div>
                <div className="bg-primary/10 rounded-full p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Fiat Balances */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fiat Balances
                </h3>
                <Badge variant="secondary">
                  {summary?.fiat_balances?.length || 0}
                </Badge>
              </div>
              <div className="space-y-3">
                {summary?.fiat_balances && summary.fiat_balances.length > 0 ? (
                  summary.fiat_balances.map((balance) => (
                    <div
                      key={balance.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{balance.asset_symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            Available: {formatCurrency(balance.available_balance, balance.asset_symbol)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(balance.total_balance, balance.asset_symbol)}
                        </p>
                        {parseFloat(balance.locked_balance) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Locked: {formatCurrency(balance.locked_balance, balance.asset_symbol)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No fiat balances available
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Crypto Balances */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Crypto Balances
                </h3>
                <Badge variant="secondary">
                  {summary?.crypto_balances?.length || 0}
                </Badge>
              </div>
              <div className="space-y-3">
                {summary?.crypto_balances && summary.crypto_balances.length > 0 ? (
                  summary.crypto_balances.map((balance) => (
                    <div
                      key={balance.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Coins className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{balance.asset_symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {balance.network} • Available: {formatCurrency(balance.available_balance, balance.asset_symbol)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(balance.total_balance, balance.asset_symbol)}
                        </p>
                        {parseFloat(balance.locked_balance) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Locked: {formatCurrency(balance.locked_balance, balance.asset_symbol)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No crypto balances available
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

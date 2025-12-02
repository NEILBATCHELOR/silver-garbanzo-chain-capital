/**
 * Seed Capital Tracker
 * Tracks initial funding and investor commitments for ETF launch
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, Users, CheckCircle2, Info } from 'lucide-react'
import type { ETFProduct } from '@/types/nav/etf'

interface SeedInvestor {
  id: string
  name: string
  commitment: number
  funded: number
  status: 'pending' | 'partial' | 'complete'
}

interface SeedCapitalTrackerProps {
  product: ETFProduct
  investors?: SeedInvestor[]
  targetCapital?: number
  onAddInvestor?: () => void
}

export function SeedCapitalTracker({ 
  product, 
  investors = [],
  targetCapital,
  onAddInvestor 
}: SeedCapitalTrackerProps) {
  // Calculate totals
  const totalCommitments = investors.reduce((sum, inv) => sum + inv.commitment, 0)
  const totalFunded = investors.reduce((sum, inv) => sum + inv.funded, 0)
  const currentAUM = product.assets_under_management || 0
  const target = targetCapital || currentAUM * 1.5 // Default target 50% above current
  const progressPercentage = (currentAUM / target) * 100

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getInvestorStatusBadge = (status: SeedInvestor['status']) => {
    switch (status) {
      case 'complete':
        return <Badge variant="default" className="bg-green-600">Funded</Badge>
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const isLaunchReady = currentAUM >= target

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Seed Capital Overview</CardTitle>
          <CardDescription>
            {product.fund_ticker} - Initial funding progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Funding Progress</span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(currentAUM)} of {formatCurrency(target)}
              </span>
            </div>
            <Progress value={Math.min(progressPercentage, 100)} />
            <p className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}% funded
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Current AUM</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(currentAUM)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Commitments</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalCommitments)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs">Investors</span>
              </div>
              <p className="text-2xl font-bold">{investors.length}</p>
            </div>
          </div>

          {/* Launch Status */}
          {isLaunchReady ? (
            <Alert className="border-green-600">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Seed capital target reached! ETF is ready for launch.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {formatCurrency(target - currentAUM)} remaining to reach launch target
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Investors List */}
      {investors.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Seed Investors</CardTitle>
                <CardDescription>
                  Commitments and funding status
                </CardDescription>
              </div>
              {onAddInvestor && (
                <Button onClick={onAddInvestor} size="sm">
                  Add Investor
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {investors.map((investor) => (
                <div key={investor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{investor.name}</p>
                      {getInvestorStatusBadge(investor.status)}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Committed: {formatCurrency(investor.commitment)}</span>
                      <span>Funded: {formatCurrency(investor.funded)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {((investor.funded / investor.commitment) * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Users className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No seed investors yet</p>
                <p className="text-sm text-muted-foreground">
                  Add investors to track commitments
                </p>
              </div>
              {onAddInvestor && (
                <Button onClick={onAddInvestor} variant="outline">
                  Add First Investor
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capital Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Capital Structure</CardTitle>
          <CardDescription>Per-share breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">NAV per Share</span>
              <span className="font-mono font-semibold">
                {formatCurrency(product.net_asset_value)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Shares Outstanding</span>
              <span className="font-mono font-semibold">
                {product.shares_outstanding?.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total AUM</span>
              <span className="font-mono font-semibold">
                {formatCurrency(currentAUM)}
              </span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Shares per Creation Unit</span>
              <span className="font-mono font-semibold">50,000</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

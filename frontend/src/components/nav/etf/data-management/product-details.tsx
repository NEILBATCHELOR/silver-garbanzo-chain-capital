/**
 * ETF Product Details
 * Comprehensive detail view for a single ETF
 * Includes: Overview, Holdings, Performance, Share Classes, Token Links
 */

import { useState } from 'react'
import {
  ArrowLeft,
  Calculator,
  Plus,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

import type { ETFProduct, ETFHolding } from '@/types/nav/etf'
import { HoldingsTable } from './holdings-table'
import { ShareClassesTable } from './share-classes-table'

interface ProductDetailsProps {
  product: ETFProduct
  projectId?: string
  holdings: ETFHolding[]
  shareClasses?: ETFProduct[]
  navHistory?: any[]
  isLoading?: boolean
  onBack?: () => void
  onCalculate?: () => void
  onAddHolding?: () => void
  onEditHolding?: (holding: ETFHolding) => void
  onDeleteHolding?: (holdingId: string) => void
  onExportHoldings?: () => void
  onRefresh?: () => void
}

export function ProductDetails({
  product,
  holdings,
  shareClasses = [],
  navHistory = [],
  isLoading,
  onBack,
  onCalculate,
  onAddHolding,
  onEditHolding,
  onDeleteHolding,
  onExportHoldings,
  onRefresh,
}: ProductDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercentage = (value: number | null | undefined, decimals: number = 2) => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(decimals)}%`
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalHoldingsValue = holdings.reduce((sum, h) => sum + h.market_value, 0)
  const isCryptoETF = product.metadata?.is_crypto_etf || false

  const getPremiumDiscountBadge = () => {
    if (!product.premium_discount_pct) return null

    const value = product.premium_discount_pct
    const absValue = Math.abs(value)

    if (absValue < 0.25) {
      return (
        <Badge variant="default">
          Fair Value
        </Badge>
      )
    }

    if (value > 0) {
      return (
        <Badge className="bg-green-500">
          <TrendingUp className="mr-1 h-3 w-3" />
          Premium {formatPercentage(value)}
        </Badge>
      )
    }

    return (
      <Badge variant="destructive">
        <TrendingDown className="mr-1 h-3 w-3" />
        Discount {formatPercentage(value)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{product.fund_name}</h2>
              {product.share_class_name && (
                <Badge variant="outline">{product.share_class_name}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <code>{product.fund_ticker}</code>
              <span>•</span>
              <span>{product.fund_type}</span>
              {isCryptoETF && (
                <>
                  <span>•</span>
                  <Badge variant="default">Crypto ETF</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
          {onCalculate && (
            <Button onClick={onCalculate}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate NAV
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>NAV per Share</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(product.net_asset_value)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {product.currency}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Market Price</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(product.market_price)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getPremiumDiscountBadge()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assets Under Management</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(product.assets_under_management)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {product.shares_outstanding.toLocaleString()} shares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expense Ratio</CardDescription>
            <CardTitle className="text-2xl">
              {formatPercentage(product.expense_ratio)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {product.tracking_error ? `TE: ${formatPercentage(product.tracking_error)}` : 'No tracking data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="holdings">
            Holdings ({holdings.length})
          </TabsTrigger>
          {shareClasses.length > 0 && (
            <TabsTrigger value="share-classes">
              Share Classes ({shareClasses.length + 1})
            </TabsTrigger>
          )}
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tokens">Token Links</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ETF Information</CardTitle>
              <CardDescription>Basic details and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Benchmark Index</p>
                  <p className="text-sm">{product.benchmark_index || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inception Date</p>
                  <p className="text-sm">{formatDate(product.inception_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                    {product.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exchange</p>
                  <p className="text-sm">{product.exchange || '-'}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ISIN</p>
                  <p className="text-sm font-mono">{product.isin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Replication Method</p>
                  <p className="text-sm">{product.replication_method || '-'}</p>
                </div>
              </div>

              {isCryptoETF && product.metadata && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Supported Blockchains</p>
                    <div className="flex flex-wrap gap-2">
                      {product.metadata.supported_blockchains?.map((chain) => (
                        <Badge key={chain} variant="secondary">{chain}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Staking Enabled:</p>
                    <Badge variant={product.metadata.staking_enabled ? 'default' : 'secondary'}>
                      {product.metadata.staking_enabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Holdings Summary</CardTitle>
              <CardDescription>Portfolio composition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Holdings</p>
                    <p className="text-2xl font-bold">{holdings.length}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Market Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalHoldingsValue)}</p>
                  </div>
                </div>

                {holdings.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Top 5 Holdings</p>
                    <div className="space-y-2">
                      {holdings.slice(0, 5).map((holding, index) => (
                        <div key={holding.id} className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span>{holding.security_name}</span>
                            {holding.blockchain && (
                              <Badge variant="outline" className="text-xs">{holding.blockchain}</Badge>
                            )}
                          </span>
                          <span className="font-mono">{holding.weight_percentage.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings">
          <HoldingsTable
            holdings={holdings}
            isLoading={isLoading}
            onEdit={onEditHolding}
            onDelete={onDeleteHolding}
            onAdd={onAddHolding}
            onExport={onExportHoldings}
          />
        </TabsContent>

        {/* Share Classes Tab */}
        {shareClasses.length > 0 && (
          <TabsContent value="share-classes">
            <ShareClassesTable
              parentProduct={product}
              shareClasses={shareClasses}
              isLoading={isLoading}
            />
          </TabsContent>
        )}

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Historical NAV and tracking data</CardDescription>
            </CardHeader>
            <CardContent>
              {navHistory.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No performance data available yet. Calculate NAV to start tracking performance.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Performance charts will be displayed here
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Token Links Tab */}
        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Token Links</CardTitle>
              <CardDescription>Blockchain token integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Token linking functionality will be available here
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

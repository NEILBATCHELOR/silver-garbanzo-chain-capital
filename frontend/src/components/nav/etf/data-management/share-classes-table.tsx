/**
 * ETF Share Classes Table
 * Compare multiple share classes side-by-side
 * Shows differences in fees, NAV, and characteristics
 */

import { Eye, Calculator, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { ETFProduct } from '@/types/nav/etf'

interface ShareClassesTableProps {
  parentProduct: ETFProduct
  shareClasses: ETFProduct[]
  isLoading?: boolean
  onViewDetails?: (product: ETFProduct) => void
  onCalculate?: (product: ETFProduct) => void
}

export function ShareClassesTable({
  parentProduct,
  shareClasses,
  isLoading,
  onViewDetails,
  onCalculate,
}: ShareClassesTableProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const formatPercentage = (value: number | null | undefined, decimals: number = 4) => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(decimals)}%`
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US').format(value)
  }

  const allProducts = [parentProduct, ...shareClasses]

  const calculateNAVDifference = (shareClass: ETFProduct) => {
    const parentNAV = parentProduct.net_asset_value
    const classNAV = shareClass.net_asset_value
    
    if (!parentNAV || !classNAV) return null
    
    const difference = classNAV - parentNAV
    const percentDiff = (difference / parentNAV) * 100
    
    return {
      amount: difference,
      percent: percentDiff
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Class Comparison</CardTitle>
        <CardDescription>
          Compare {parentProduct.fund_name} share classes - Same portfolio, different fees
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading share classes...
          </div>
        ) : shareClasses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No share classes found. This ETF has a single share class.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics Comparison */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {allProducts.map((product) => (
                      <TableHead key={product.id} className="text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {product.share_class_name || 'Parent'}
                          </span>
                          <code className="text-xs text-muted-foreground">
                            {product.fund_ticker}
                          </code>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* NAV Per Share */}
                  <TableRow>
                    <TableCell className="font-medium">NAV per Share</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center font-mono">
                        {formatCurrency(product.net_asset_value)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* NAV Difference from Parent */}
                  {shareClasses.length > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">Difference from Parent</TableCell>
                      <TableCell className="text-center text-muted-foreground">-</TableCell>
                      {shareClasses.map((shareClass) => {
                        const diff = calculateNAVDifference(shareClass)
                        return (
                          <TableCell key={shareClass.id} className="text-center font-mono">
                            {diff ? (
                              <div className="flex flex-col">
                                <span className={diff.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(diff.amount)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({diff.percent >= 0 ? '+' : ''}{diff.percent.toFixed(2)}%)
                                </span>
                              </div>
                            ) : '-'}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )}

                  {/* Expense Ratio */}
                  <TableRow>
                    <TableCell className="font-medium">Expense Ratio</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center font-mono">
                        {formatPercentage(product.expense_ratio)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Total Expense Ratio */}
                  <TableRow>
                    <TableCell className="font-medium">Total Expense Ratio</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center font-mono">
                        {formatPercentage(product.total_expense_ratio)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Assets Under Management */}
                  <TableRow>
                    <TableCell className="font-medium">AUM</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center font-mono">
                        {formatCurrency(product.assets_under_management)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Shares Outstanding */}
                  <TableRow>
                    <TableCell className="font-medium">Shares Outstanding</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center font-mono">
                        {formatNumber(product.shares_outstanding)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Market Price */}
                  <TableRow>
                    <TableCell className="font-medium">Market Price</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center font-mono">
                        {formatCurrency(product.market_price)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Premium/Discount */}
                  <TableRow>
                    <TableCell className="font-medium">Premium/Discount</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center font-mono">
                        {product.premium_discount_pct ? (
                          <span className={
                            product.premium_discount_pct > 0 
                              ? 'text-green-600' 
                              : product.premium_discount_pct < 0 
                                ? 'text-red-600' 
                                : ''
                          }>
                            {formatPercentage(product.premium_discount_pct)}
                          </span>
                        ) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Tracking Error */}
                  {parentProduct.tracking_error !== null && parentProduct.tracking_error !== undefined && (
                    <TableRow>
                      <TableCell className="font-medium">Tracking Error</TableCell>
                      {allProducts.map((product) => (
                        <TableCell key={product.id} className="text-center font-mono">
                          {formatPercentage(product.tracking_error)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}

                  {/* Status */}
                  <TableRow>
                    <TableCell className="font-medium">Status</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center">
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Actions */}
                  <TableRow>
                    <TableCell className="font-medium">Actions</TableCell>
                    {allProducts.map((product) => (
                      <TableCell key={product.id} className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            
                            {onViewDetails && (
                              <DropdownMenuItem onClick={() => onViewDetails(product)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            )}
                            
                            {onCalculate && (
                              <DropdownMenuItem onClick={() => onCalculate(product)}>
                                <Calculator className="mr-2 h-4 w-4" />
                                Calculate NAV
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Key Insights */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Key Insights</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• All share classes hold the same underlying portfolio</p>
                <p>• NAV differences are due to varying expense ratios</p>
                <p>• Lower expense ratios generally result in higher NAVs over time</p>
                <p>• Institutional share classes typically have lower fees and higher minimums</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

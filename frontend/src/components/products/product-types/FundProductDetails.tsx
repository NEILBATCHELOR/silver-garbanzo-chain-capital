/**
 * Component to display fund/ETF/ETP product details
 */

import React from 'react';
import { FundProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface FundProductDetailsProps {
  product: FundProduct;
}

export default function FundProductDetails({ product }: FundProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Fund Information</h3>
            <div className="space-y-2">
              {product.fundName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund Name:</span>
                  <span className="font-medium">{product.fundName}</span>
                </div>
              )}
              {product.fundTicker && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticker:</span>
                  <span className="font-medium">{product.fundTicker}</span>
                </div>
              )}
              {product.fundType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund Type:</span>
                  <span className="font-medium">{product.fundType}</span>
                </div>
              )}
              {product.status && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>
                    {product.status}
                  </Badge>
                </div>
              )}
              {product.currency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="font-medium">{product.currency}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Financial Metrics</h3>
            <div className="space-y-2">
              {product.netAssetValue !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NAV:</span>
                  <span className="font-medium">{formatCurrency(product.netAssetValue, product.currency)}</span>
                </div>
              )}
              {product.assetsUnderManagement !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AUM:</span>
                  <span className="font-medium">{formatCurrency(product.assetsUnderManagement, product.currency)}</span>
                </div>
              )}
              {product.expenseRatio !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expense Ratio:</span>
                  <span className="font-medium">{formatPercent(product.expenseRatio)}</span>
                </div>
              )}
              {product.trackingError !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking Error:</span>
                  <span className="font-medium">{formatPercent(product.trackingError)}</span>
                </div>
              )}
              {product.targetRaise !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Raise:</span>
                  <span className="font-medium">{formatCurrency(product.targetRaise, product.currency)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Fund Strategy & Focus</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Strategy</h4>
              <div className="space-y-2">
                {product.benchmarkIndex && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Benchmark Index:</span>
                    <span className="font-medium">{product.benchmarkIndex}</span>
                  </div>
                )}
                {product.distributionFrequency && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distribution Frequency:</span>
                    <span className="font-medium">{product.distributionFrequency}</span>
                  </div>
                )}
                {product.fundVintageYear && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vintage Year:</span>
                    <span className="font-medium">{product.fundVintageYear}</span>
                  </div>
                )}
                {product.investmentStage && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investment Stage:</span>
                    <span className="font-medium">{product.investmentStage}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Focus Areas</h4>
              <div className="space-y-2">
                {product.sectorFocus && (
                  <div>
                    <span className="text-muted-foreground text-sm">Sector Focus:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(product.sectorFocus) ? product.sectorFocus : [product.sectorFocus]).map((sector, index) => (
                        <Badge key={index} variant="outline">{sector}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {product.geographicFocus && (
                  <div>
                    <span className="text-muted-foreground text-sm">Geographic Focus:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(product.geographicFocus) ? product.geographicFocus : [product.geographicFocus]).map((geo, index) => (
                        <Badge key={index} variant="outline">{geo}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.inceptionDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inception Date:</span>
                  <span className="font-medium">{formatDate(product.inceptionDate)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.closureLiquidationDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closure/Liquidation Date:</span>
                  <span className="font-medium">{formatDate(product.closureLiquidationDate)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {product.holdings && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Holdings</h3>
            <div className="space-y-4">
              <div>
                {typeof product.holdings === 'object' && product.holdings !== null ? (
                  <div className="space-y-2">
                    {Array.isArray(product.holdings) ? (
                      product.holdings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {product.holdings.map((holding: any, index: number) => (
                            <div key={index} className="border rounded p-3">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{holding.name || holding.symbol || `Holding ${index + 1}`}</span>
                                <span className="text-sm text-muted-foreground">
                                  {holding.percentage ? formatPercent(holding.percentage) : ''}
                                </span>
                              </div>
                              {holding.value && (
                                <div className="text-sm text-muted-foreground">
                                  Value: {formatCurrency(holding.value, product.currency)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No holdings data available</p>
                      )
                    ) : (
                      <div className="text-sm">
                        <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded">
                          {JSON.stringify(product.holdings, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Holdings data structure available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(product.performanceHistory || product.creationRedemptionHistory || product.flowData) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Performance & Historical Data</h3>
            <div className="space-y-4">
              {product.performanceHistory && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Performance History</h4>
                  <div className="text-sm">
                    {typeof product.performanceHistory === 'object' ? (
                      <div className="space-y-2">
                        {Object.entries(product.performanceHistory).map(([key, value], index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">
                              {typeof value === 'number' ? formatPercent(value) : value?.toString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Performance history data available</p>
                    )}
                  </div>
                </div>
              )}

              {product.creationRedemptionHistory && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Creation/Redemption History</h4>
                  <div className="text-sm">
                    {typeof product.creationRedemptionHistory === 'object' ? (
                      <p>Creation/redemption activity data available</p>
                    ) : (
                      <p>{product.creationRedemptionHistory}</p>
                    )}
                  </div>
                </div>
              )}

              {product.flowData && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Flow Data</h4>
                  <div className="text-sm">
                    {typeof product.flowData === 'object' ? (
                      <p>Fund flow data available</p>
                    ) : (
                      <p>{product.flowData}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Record Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.createdAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium text-xs">{formatDate(product.createdAt)}</span>
              </div>
            )}
            {product.updatedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium text-xs">{formatDate(product.updatedAt)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

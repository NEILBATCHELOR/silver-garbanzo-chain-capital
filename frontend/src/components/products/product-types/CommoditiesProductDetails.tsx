/**
 * Component to display commodities product details
 */

import React from 'react';
import { CommoditiesProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface CommoditiesProductDetailsProps {
  product: CommoditiesProduct;
}

export default function CommoditiesProductDetails({ product }: CommoditiesProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.commodityName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commodity Name:</span>
                  <span className="font-medium">{product.commodityName}</span>
                </div>
              )}
              {product.commodityId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commodity ID:</span>
                  <span className="font-medium">{product.commodityId}</span>
                </div>
              )}
              {product.commodityType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{product.commodityType}</span>
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
              {product.exchange && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange:</span>
                  <span className="font-medium">{product.exchange}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Contract Specifications</h3>
            <div className="space-y-2">
              {product.unitOfMeasure && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit of Measure:</span>
                  <span className="font-medium">{product.unitOfMeasure}</span>
                </div>
              )}
              {product.contractSize !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Size:</span>
                  <span className="font-medium">{formatNumber(product.contractSize)}</span>
                </div>
              )}
              {product.gradeQuality && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grade/Quality:</span>
                  <span className="font-medium">{product.gradeQuality}</span>
                </div>
              )}
              {product.deliveryMonths && product.deliveryMonths.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Months:</span>
                  <span className="font-medium">{product.deliveryMonths.join(', ')}</span>
                </div>
              )}
              {product.liquidityMetric !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquidity Metric:</span>
                  <span className="font-medium">{formatNumber(product.liquidityMetric)}</span>
                </div>
              )}
              {product.storageDeliveryCosts !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage/Delivery Costs:</span>
                  <span className="font-medium">{formatCurrency(product.storageDeliveryCosts, product.currency)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Lifecycle Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Dates</h4>
              <div className="space-y-2">
                {product.contractIssueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contract Issue Date:</span>
                    <span className="font-medium">{formatDate(product.contractIssueDate)}</span>
                  </div>
                )}
                {product.expirationDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expiration Date:</span>
                    <span className="font-medium">{formatDate(product.expirationDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Inventory & Production</h4>
              <div className="space-y-2">
                {product.productionInventoryLevels && product.productionInventoryLevels.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">Inventory Levels:</span>
                    <div className="mt-1">
                      {product.productionInventoryLevels.map((level, index) => (
                        <div key={index} className="text-sm font-medium">
                          Level {index + 1}: {formatNumber(level)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(!product.productionInventoryLevels || product.productionInventoryLevels.length === 0) && (
                  <div className="text-sm text-muted-foreground">
                    No inventory data available
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Target</h4>
              <div className="space-y-2">
                {product.targetRaise !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Raise:</span>
                    <span className="font-medium">{formatCurrency(product.targetRaise, product.currency)}</span>
                  </div>
                )}
                {(!product.targetRaise && product.targetRaise !== 0) && (
                  <div className="text-sm text-muted-foreground">
                    No target set
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {product.rollHistory && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Roll History</h3>
            <div className="space-y-4">
              <div>
                {typeof product.rollHistory === 'object' && product.rollHistory !== null ? (
                  <div className="space-y-2">
                    {Array.isArray(product.rollHistory) ? (
                      product.rollHistory.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {product.rollHistory.map((roll: any, index: number) => (
                            <li key={index} className="text-sm">
                              {roll.date && formatDate(roll.date)}: {roll.description || roll.details || 'Roll event'}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No roll history available</p>
                      )
                    ) : (
                      <div className="text-sm">
                        <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded">
                          {JSON.stringify(product.rollHistory, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {product.rollHistory ? product.rollHistory.toString() : 'No roll history available'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">System Fields</h4>
              <div className="space-y-2">
                {product.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium text-sm">{formatDate(product.createdAt)}</span>
                  </div>
                )}
                {product.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium text-sm">{formatDate(product.updatedAt)}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Identifiers</h4>
              <div className="space-y-2">
                {product.id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product ID:</span>
                    <span className="font-medium text-xs font-mono">{product.id}</span>
                  </div>
                )}
                {product.projectId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project ID:</span>
                    <span className="font-medium text-xs font-mono">{product.projectId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

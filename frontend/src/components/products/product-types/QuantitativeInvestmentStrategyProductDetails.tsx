/**
 * Component to display quantitative investment strategy product details
 */

import React from 'react';
import { QuantitativeInvestmentStrategyProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface QuantitativeInvestmentStrategyProductDetailsProps {
  product: QuantitativeInvestmentStrategyProduct;
}

export default function QuantitativeInvestmentStrategyProductDetails({ 
  product 
}: QuantitativeInvestmentStrategyProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.strategyName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategy Name:</span>
                  <span className="font-medium">{product.strategyName}</span>
                </div>
              )}
              {product.strategyId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategy ID:</span>
                  <span className="font-medium">{product.strategyId}</span>
                </div>
              )}
              {product.strategyType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategy Type:</span>
                  <span className="font-medium">{product.strategyType}</span>
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
              {product.benchmark && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Benchmark:</span>
                  <span className="font-medium">{product.benchmark}</span>
                </div>
              )}
              {product.machineLearningFlags !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Machine Learning:</span>
                  <Badge variant={product.machineLearningFlags ? 'default' : 'secondary'}>
                    {product.machineLearningFlags ? 'Yes' : 'No'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Strategy Details</h3>
            <div className="space-y-2">
              {product.underlyingAssets && product.underlyingAssets.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Underlying Assets:</span>
                  <span className="font-medium">{product.underlyingAssets.join(', ')}</span>
                </div>
              )}
              {product.dataSources && product.dataSources.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Sources:</span>
                  <span className="font-medium">{product.dataSources.join(', ')}</span>
                </div>
              )}
              {product.riskMetrics !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Metrics:</span>
                  <span className="font-medium">{formatNumber(product.riskMetrics)}</span>
                </div>
              )}
              {product.parameters && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parameters:</span>
                  <span className="font-medium">
                    {typeof product.parameters === 'object' 
                      ? Object.keys(product.parameters).length + ' parameters' 
                      : 'Parameters available'}
                  </span>
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
                {product.inceptionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inception Date:</span>
                    <span className="font-medium">{formatDate(product.inceptionDate)}</span>
                  </div>
                )}
                {product.terminationDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Termination Date:</span>
                    <span className="font-medium">{formatDate(product.terminationDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Performance</h4>
              <div className="space-y-2">
                {product.backtestHistory && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Backtest Data:</span>
                    <span className="font-medium">Available</span>
                  </div>
                )}
                {product.performanceAttribution && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performance Attribution:</span>
                    <span className="font-medium">Available</span>
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(product.backtestHistory || product.adjustmentHistory) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">History & Adjustments</h3>
            <div className="space-y-4">
              {product.backtestHistory && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Backtest History</h4>
                  <div className="text-sm">
                    {Array.isArray(product.backtestHistory) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {product.backtestHistory.map((item, index) => (
                          <li key={index}>
                            {item.date && formatDate(item.date)}: {item.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Backtest history data available</p>
                    )}
                  </div>
                </div>
              )}

              {product.adjustmentHistory && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2 mt-4">Adjustment History</h4>
                  <div className="text-sm">
                    {Array.isArray(product.adjustmentHistory) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {product.adjustmentHistory.map((adjustment, index) => (
                          <li key={index}>
                            {adjustment.date && formatDate(adjustment.date)}: {adjustment.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Adjustment history data available</p>
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

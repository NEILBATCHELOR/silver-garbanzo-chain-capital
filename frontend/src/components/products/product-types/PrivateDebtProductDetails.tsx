/**
 * Component to display private debt product details
 */

import React from 'react';
import { PrivateDebtProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface PrivateDebtProductDetailsProps {
  product: PrivateDebtProduct;
}

export default function PrivateDebtProductDetails({ product }: PrivateDebtProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.dealId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deal ID:</span>
                  <span className="font-medium">{product.dealId}</span>
                </div>
              )}
              {product.companyName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company Name:</span>
                  <span className="font-medium">{product.companyName}</span>
                </div>
              )}
              {product.industrySector && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry Sector:</span>
                  <span className="font-medium">{product.industrySector}</span>
                </div>
              )}
              {product.opportunitySource && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opportunity Source:</span>
                  <span className="font-medium">{product.opportunitySource}</span>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Deal Details</h3>
            <div className="space-y-2">
              {product.dealSize !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deal Size:</span>
                  <span className="font-medium">{formatCurrency(product.dealSize)}</span>
                </div>
              )}
              {product.valuationAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valuation Amount:</span>
                  <span className="font-medium">{formatCurrency(product.valuationAmount)}</span>
                </div>
              )}
              {product.dealStructureDetails && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deal Structure:</span>
                  <span className="font-medium">{product.dealStructureDetails}</span>
                </div>
              )}
              {product.riskProfile && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Profile:</span>
                  <span className="font-medium">{product.riskProfile}</span>
                </div>
              )}
              {product.monitoringFrequency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monitoring Frequency:</span>
                  <span className="font-medium">{product.monitoringFrequency} days</span>
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
              <h4 className="font-medium text-muted-foreground mb-2">Process Status</h4>
              <div className="space-y-2">
                {product.screeningStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Screening Status:</span>
                    <Badge variant="outline">{product.screeningStatus}</Badge>
                  </div>
                )}
                {product.dueDiligenceStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Diligence Status:</span>
                    <Badge variant="outline">{product.dueDiligenceStatus}</Badge>
                  </div>
                )}
                {product.transactionStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction Status:</span>
                    <Badge variant="outline">{product.transactionStatus}</Badge>
                  </div>
                )}
                {product.complianceStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compliance Status:</span>
                    <Badge variant="outline">{product.complianceStatus}</Badge>
                  </div>
                )}
                {product.exitStrategyStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exit Strategy Status:</span>
                    <Badge variant="outline">{product.exitStrategyStatus}</Badge>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Dates & Services</h4>
              <div className="space-y-2">
                {product.executionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution Date:</span>
                    <span className="font-medium">{formatDate(product.executionDate)}</span>
                  </div>
                )}
                {product.advisoryServiceType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Advisory Service Type:</span>
                    <span className="font-medium">{product.advisoryServiceType}</span>
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
                    <span className="font-medium">{formatCurrency(product.targetRaise)}</span>
                  </div>
                )}
                {product.outcome && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outcome:</span>
                    <span className="font-medium">{product.outcome}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {product.financialMetrics && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Financial Metrics</h3>
            <div className="space-y-4">
              <div className="text-sm">
                {typeof product.financialMetrics === 'object' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.financialMetrics).map(([key, value], index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' ? formatNumber(value) : value?.toString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Financial metrics data available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {product.portfolioPerformanceMetrics && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
            <div className="space-y-4">
              <div className="text-sm">
                {typeof product.portfolioPerformanceMetrics === 'object' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.portfolioPerformanceMetrics).map(([key, value], index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' ? formatNumber(value) : value?.toString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Portfolio performance data available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Credit & Collection Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Credit Quality</h4>
              <div className="space-y-2">
                {product.debtorCreditQuality && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Debtor Credit Quality:</span>
                    <span className="font-medium">{product.debtorCreditQuality}</span>
                  </div>
                )}
                {product.recoveryRatePercentage !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recovery Rate:</span>
                    <span className="font-medium">{formatPercent(product.recoveryRatePercentage)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Collection</h4>
              <div className="space-y-2">
                {product.collectionPeriodDays !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collection Period:</span>
                    <span className="font-medium">{product.collectionPeriodDays} days</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {product.diversificationMetrics && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Diversification Metrics</h3>
            <div className="space-y-4">
              <div className="text-sm">
                {typeof product.diversificationMetrics === 'object' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.diversificationMetrics).map(([key, value], index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' ? formatNumber(value) : value?.toString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Diversification metrics data available</p>
                )}
              </div>
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

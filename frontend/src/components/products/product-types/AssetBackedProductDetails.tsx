/**
 * Component to display asset backed product details
 */

import React from 'react';
import { AssetBackedProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface AssetBackedProductDetailsProps {
  product: AssetBackedProduct;
}

export default function AssetBackedProductDetails({ product }: AssetBackedProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.assetNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Number:</span>
                  <span className="font-medium">{product.assetNumber}</span>
                </div>
              )}
              {product.assetType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Type:</span>
                  <span className="font-medium">{product.assetType}</span>
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
              {product.lienPosition && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lien Position:</span>
                  <span className="font-medium">{product.lienPosition}</span>
                </div>
              )}
              {product.debtorCreditQuality && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debtor Credit Quality:</span>
                  <span className="font-medium">{product.debtorCreditQuality}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Financial Terms</h3>
            <div className="space-y-2">
              {product.originalAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Amount:</span>
                  <span className="font-medium">{formatCurrency(product.originalAmount)}</span>
                </div>
              )}
              {product.currentBalance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-medium">{formatCurrency(product.currentBalance)}</span>
                </div>
              )}
              {product.interestRate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-medium">{formatPercent(product.interestRate)}</span>
                </div>
              )}
              {product.accrualType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accrual Type:</span>
                  <span className="font-medium">{product.accrualType}</span>
                </div>
              )}
              {product.paymentFrequency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Frequency:</span>
                  <span className="font-medium">{product.paymentFrequency}</span>
                </div>
              )}
              {product.prepaymentPenalty !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prepayment Penalty:</span>
                  <span className="font-medium">{formatCurrency(product.prepaymentPenalty)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Performance & Collection Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Performance</h4>
              <div className="space-y-2">
                {product.delinquencyStatus !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Past Due:</span>
                    <span className="font-medium">{product.delinquencyStatus}</span>
                  </div>
                )}
                {product.modificationIndicator !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modified:</span>
                    <span className="font-medium">{product.modificationIndicator ? 'Yes' : 'No'}</span>
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
                {product.diversificationMetrics && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diversification:</span>
                    <span className="font-medium">{product.diversificationMetrics}</span>
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Lifecycle Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Origination</h4>
              <div className="space-y-2">
                {product.originationDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origination Date:</span>
                    <span className="font-medium">{formatDate(product.originationDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Maturity</h4>
              <div className="space-y-2">
                {product.maturityDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maturity Date:</span>
                    <span className="font-medium">{formatDate(product.maturityDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Resolution</h4>
              <div className="space-y-2">
                {product.demandResolutionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolution Date:</span>
                    <span className="font-medium">{formatDate(product.demandResolutionDate)}</span>
                  </div>
                )}
                {product.repurchaseAmount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repurchase Amount:</span>
                    <span className="font-medium">{formatCurrency(product.repurchaseAmount)}</span>
                  </div>
                )}
                {product.repurchaser && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repurchaser:</span>
                    <span className="font-medium">{product.repurchaser}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

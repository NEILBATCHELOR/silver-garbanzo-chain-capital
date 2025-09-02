/**
 * Enhanced component to display private equity product details with ALL 37 database fields
 */

import React from 'react';
import { PrivateEquityProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface PrivateEquityProductDetailsProps {
  product: PrivateEquityProduct;
}

export default function PrivateEquityProductDetails({ product }: PrivateEquityProductDetailsProps) {
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
              {product.fundId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund ID:</span>
                  <span className="font-medium">{product.fundId}</span>
                </div>
              )}
              {product.fundType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund Type:</span>
                  <span className="font-medium">{product.fundType}</span>
                </div>
              )}
              {product.fundVintageYear && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vintage Year:</span>
                  <span className="font-medium">{product.fundVintageYear}</span>
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
              {product.targetRaise !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Raise:</span>
                  <span className="font-medium">{formatCurrency(product.targetRaise)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Fund Structure</h3>
            <div className="space-y-2">
              {product.fundSize !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund Size:</span>
                  <span className="font-medium">{formatCurrency(product.fundSize)}</span>
                </div>
              )}
              {product.commitmentPeriod !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commitment Period:</span>
                  <span className="font-medium">{product.commitmentPeriod} months</span>
                </div>
              )}
              {product.capitalCommitment !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital Commitment:</span>
                  <span className="font-medium">{formatCurrency(product.capitalCommitment)}</span>
                </div>
              )}
              {product.investorType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investor Type:</span>
                  <span className="font-medium">{product.investorType}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Investment Strategy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.investmentStage && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Stage:</span>
                  <span className="font-medium">{product.investmentStage}</span>
                </div>
              )}
              {product.sectorFocus && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sector Focus:</span>
                  <span className="font-medium">{product.sectorFocus}</span>
                </div>
              )}
              {product.geographicFocus && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geographic Focus:</span>
                  <span className="font-medium">{product.geographicFocus}</span>
                </div>
              )}
              {product.stageOfDevelopment && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stage of Development:</span>
                  <span className="font-medium">{product.stageOfDevelopment}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.exitMechanism && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exit Mechanism:</span>
                  <span className="font-medium">{product.exitMechanism}</span>
                </div>
              )}
              {product.portfolioCompanyId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Portfolio Company ID:</span>
                  <span className="font-medium">{product.portfolioCompanyId}</span>
                </div>
              )}
              {product.financingRound && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Financing Round:</span>
                  <span className="font-medium">{product.financingRound}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Financial Terms</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground mb-2">Fee Structure</h4>
              {product.managementFee !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Management Fee:</span>
                  <span className="font-medium">{formatPercent(product.managementFee)}</span>
                </div>
              )}
              {product.carriedInterest !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carried Interest:</span>
                  <span className="font-medium">{formatPercent(product.carriedInterest)}</span>
                </div>
              )}
              {product.hurdleRate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hurdle Rate:</span>
                  <span className="font-medium">{formatPercent(product.hurdleRate)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground mb-2">Capital Flow</h4>
              {product.capitalCall !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital Called:</span>
                  <span className="font-medium">{formatCurrency(product.capitalCall)}</span>
                </div>
              )}
              {product.investedCapital !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invested Capital:</span>
                  <span className="font-medium">{formatCurrency(product.investedCapital)}</span>
                </div>
              )}
              {product.investmentAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Amount:</span>
                  <span className="font-medium">{formatCurrency(product.investmentAmount)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground mb-2">Performance</h4>
              {product.internalRateOfReturn !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IRR:</span>
                  <span className="font-medium">{formatPercent(product.internalRateOfReturn)}</span>
                </div>
              )}
              {product.netAssetValue !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NAV:</span>
                  <span className="font-medium">{formatCurrency(product.netAssetValue)}</span>
                </div>
              )}
              {product.distributedToPaidIn !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DPI:</span>
                  <span className="font-medium">
                    {product.distributedToPaidIn !== null 
                      ? `${formatNumber(product.distributedToPaidIn, 2)}x` 
                      : 'N/A'}
                  </span>
                </div>
              )}
              {product.residualValueToPaidIn !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RVPI:</span>
                  <span className="font-medium">
                    {product.residualValueToPaidIn !== null 
                      ? `${formatNumber(product.residualValueToPaidIn, 2)}x` 
                      : 'N/A'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Valuation Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              {product.valuationPreMoney !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pre-Money Valuation:</span>
                  <span className="font-medium">{formatCurrency(product.valuationPreMoney)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.valuationPostMoney !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Post-Money Valuation:</span>
                  <span className="font-medium">{formatCurrency(product.valuationPostMoney)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.ownershipPercentage !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ownership Percentage:</span>
                  <span className="font-medium">{formatPercent(product.ownershipPercentage)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Fund Lifecycle</h4>
              <div className="space-y-2">
                {product.formationDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Formation Date:</span>
                    <span className="font-medium">{formatDate(product.formationDate)}</span>
                  </div>
                )}
                {product.investmentDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investment Date:</span>
                    <span className="font-medium">{formatDate(product.investmentDate)}</span>
                  </div>
                )}
                {product.exitDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exit Date:</span>
                    <span className="font-medium">{formatDate(product.exitDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Record Metadata</h4>
              <div className="space-y-2">
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
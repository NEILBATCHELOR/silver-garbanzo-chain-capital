/**
 * Component to display bond product details
 */

import React from 'react';
import { BondProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters';

interface BondProductDetailsProps {
  product: BondProduct;
}

export default function BondProductDetails({ product }: BondProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.bondIdentifier && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bond Identifier:</span>
                  <span className="font-medium">{product.bondIdentifier}</span>
                </div>
              )}
              {product.issuerName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issuer:</span>
                  <span className="font-medium">{product.issuerName}</span>
                </div>
              )}
              {product.bondType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bond Type:</span>
                  <span className="font-medium">{product.bondType}</span>
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
            <h3 className="text-lg font-semibold mb-4">Bond Terms</h3>
            <div className="space-y-2">
              {product.couponRate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coupon Rate:</span>
                  <span className="font-medium">{formatPercent(product.couponRate)}</span>
                </div>
              )}
              {product.faceValue !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Face Value:</span>
                  <span className="font-medium">{formatCurrency(product.faceValue, product.currency)}</span>
                </div>
              )}
              {product.creditRating && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Rating:</span>
                  <span className="font-medium">{product.creditRating}</span>
                </div>
              )}
              {product.yieldToMaturity !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Yield to Maturity:</span>
                  <span className="font-medium">{formatPercent(product.yieldToMaturity)}</span>
                </div>
              )}
              {product.duration !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{product.duration.toFixed(2)} years</span>
                </div>
              )}
              {product.couponFrequency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coupon Frequency:</span>
                  <span className="font-medium">{product.couponFrequency}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              {product.issueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Date:</span>
                  <span className="font-medium">{formatDate(product.issueDate)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.maturityDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maturity Date:</span>
                  <span className="font-medium">{formatDate(product.maturityDate)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.redemptionCallDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Redemption Date:</span>
                  <span className="font-medium">{formatDate(product.redemptionCallDate)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Additional Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.callableFlag !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Callable:</span>
                  <span className="font-medium">{product.callableFlag ? 'Yes' : 'No'}</span>
                </div>
              )}
              {product.callableFeatures && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Callable Features:</span>
                  <span className="font-medium">{product.callableFeatures}</span>
                </div>
              )}
              {product.callDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Call Date:</span>
                  <span className="font-medium">{formatDate(product.callDate)}</span>
                </div>
              )}
              {product.callPrice !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Call Price:</span>
                  <span className="font-medium">{formatCurrency(product.callPrice, product.currency)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.securityCollateral && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security/Collateral:</span>
                  <span className="font-medium">{product.securityCollateral}</span>
                </div>
              )}
              {product.accruedInterest !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accrued Interest:</span>
                  <span className="font-medium">{formatCurrency(product.accruedInterest, product.currency)}</span>
                </div>
              )}
              {product.targetRaise !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Raise:</span>
                  <span className="font-medium">{formatCurrency(product.targetRaise, product.currency)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(product.callPutDates && product.callPutDates.length > 0) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Call/Put Schedule</h3>
            <div className="text-sm">
              <ul className="list-disc pl-5 space-y-1">
                {product.callPutDates.map((date, index) => (
                  <li key={index}>{formatDate(date)}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {product.couponPaymentHistory && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Coupon Payment History</h3>
            <div className="text-sm">
              {Array.isArray(product.couponPaymentHistory) ? (
                <ul className="list-disc pl-5 space-y-1">
                  {product.couponPaymentHistory.map((payment, index) => (
                    <li key={index}>
                      {payment.date && formatDate(payment.date)}: {formatCurrency(payment.amount, product.currency)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Coupon payment history available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Record Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.createdAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium text-xs">{formatDate(product.createdAt)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium text-xs">{formatDate(product.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

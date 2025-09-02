/**
 * Enhanced component to display structured product details with ALL database fields
 */

import React from 'react';
import { StructuredProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters';

interface StructuredProductDetailsProps {
  product: StructuredProduct;
}

export default function StructuredProductDetails({ product }: StructuredProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.productName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Name:</span>
                  <span className="font-medium">{product.productName}</span>
                </div>
              )}
              {product.productId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product ID:</span>
                  <span className="font-medium">{product.productId}</span>
                </div>
              )}
              {product.issuer && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issuer:</span>
                  <span className="font-medium">{product.issuer}</span>
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
            <h3 className="text-lg font-semibold mb-4">Financial Terms</h3>
            <div className="space-y-2">
              {product.underlyingAssets && product.underlyingAssets.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Underlying Assets:</span>
                  <span className="font-medium">{product.underlyingAssets.join(', ')}</span>
                </div>
              )}
              {product.payoffStructure && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payoff Structure:</span>
                  <span className="font-medium">{product.payoffStructure}</span>
                </div>
              )}
              {product.barrierLevel !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Barrier Level:</span>
                  <span className="font-medium">{formatPercent(product.barrierLevel)}</span>
                </div>
              )}
              {product.couponRate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coupon Rate:</span>
                  <span className="font-medium">{formatPercent(product.couponRate)}</span>
                </div>
              )}
              {product.strikePrice !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strike Price:</span>
                  <span className="font-medium">{formatCurrency(product.strikePrice, product.currency)}</span>
                </div>
              )}
              {product.protectionLevel !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protection Level:</span>
                  <span className="font-medium">{formatPercent(product.protectionLevel)}</span>
                </div>
              )}
              {product.nominalAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Amount:</span>
                  <span className="font-medium">{formatCurrency(product.nominalAmount, product.currency)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Enhanced Product Details</h3>
            <div className="space-y-2">
              {product.targetAudience && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Audience:</span>
                  <span className="font-medium">{product.targetAudience}</span>
                </div>
              )}
              {product.distributionStrategy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distribution Strategy:</span>
                  <span className="font-medium">{product.distributionStrategy}</span>
                </div>
              )}
              {product.riskRating !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Rating:</span>
                  <Badge variant={product.riskRating <= 3 ? 'default' : product.riskRating <= 6 ? 'secondary' : 'destructive'}>
                    {product.riskRating}/10
                  </Badge>
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

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Risk Profile</h3>
            <div className="space-y-2">
              {product.riskIndicators !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Score:</span>
                  <span className="font-medium">{product.riskIndicators}/10</span>
                </div>
              )}
              {product.monitoringTriggers && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Monitoring Triggers</h4>
                  <div className="text-sm">
                    {typeof product.monitoringTriggers === 'object' ? (
                      <div className="space-y-1">
                        {Object.entries(product.monitoringTriggers).map(([key, value], index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Monitoring triggers configured</p>
                    )}
                  </div>
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
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Issuance & Maturity</h4>
              <div className="space-y-2">
                {product.issueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issue Date:</span>
                    <span className="font-medium">{formatDate(product.issueDate)}</span>
                  </div>
                )}
                {product.maturityDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maturity Date:</span>
                    <span className="font-medium">{formatDate(product.maturityDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Redemption</h4>
              <div className="space-y-2">
                {product.redemptionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redemption Date:</span>
                    <span className="font-medium">{formatDate(product.redemptionDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Metadata</h4>
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

      {product.complexFeatures && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Complex Features</h3>
            <div className="text-sm">
              {typeof product.complexFeatures === 'object' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.complexFeatures).map(([key, value], index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Complex features configuration available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(product.eventHistory || product.valuationHistory) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">History & Valuation</h3>
            <div className="space-y-4">
              {product.eventHistory && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Event History</h4>
                  <div className="text-sm">
                    {Array.isArray(product.eventHistory) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {product.eventHistory.map((event, index) => (
                          <li key={index}>
                            {event.date && formatDate(event.date)}: {event.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Event history data available</p>
                    )}
                  </div>
                </div>
              )}

              {product.valuationHistory && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2 mt-4">Valuation History</h4>
                  <div className="text-sm">
                    {Array.isArray(product.valuationHistory) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {product.valuationHistory.map((val, index) => (
                          <li key={index}>
                            {val.date && formatDate(val.date)}: {formatCurrency(val.value, product.currency)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Valuation history data available</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
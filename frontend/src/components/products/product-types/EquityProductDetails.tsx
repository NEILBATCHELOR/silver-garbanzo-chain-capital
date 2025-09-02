/**
 * Component to display equity product details
 */

import React from 'react';
import { EquityProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface EquityProductDetailsProps {
  product: EquityProduct;
}

export default function EquityProductDetails({ product }: EquityProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Company Information</h3>
            <div className="space-y-2">
              {product.companyName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company Name:</span>
                  <span className="font-medium">{product.companyName}</span>
                </div>
              )}
              {product.tickerSymbol && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticker Symbol:</span>
                  <span className="font-medium">{product.tickerSymbol}</span>
                </div>
              )}
              {product.exchange && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange:</span>
                  <span className="font-medium">{product.exchange}</span>
                </div>
              )}
              {product.sectorIndustry && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sector/Industry:</span>
                  <span className="font-medium">{product.sectorIndustry}</span>
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
              {product.marketCapitalization !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap:</span>
                  <span className="font-medium">{formatCurrency(product.marketCapitalization, product.currency)}</span>
                </div>
              )}
              {product.authorizedShares !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Authorized Shares:</span>
                  <span className="font-medium">{formatNumber(product.authorizedShares)}</span>
                </div>
              )}
              {product.sharesOutstanding !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shares Outstanding:</span>
                  <span className="font-medium">{formatNumber(product.sharesOutstanding)}</span>
                </div>
              )}
              {product.dividendYield !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dividend Yield:</span>
                  <span className="font-medium">{formatPercent(product.dividendYield)}</span>
                </div>
              )}
              {product.earningsPerShare !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPS:</span>
                  <span className="font-medium">{formatCurrency(product.earningsPerShare, product.currency)}</span>
                </div>
              )}
              {product.priceEarningsRatio !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/E Ratio:</span>
                  <span className="font-medium">{product.priceEarningsRatio.toFixed(2)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Equity Terms & Rights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.votingRights && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voting Rights:</span>
                  <span className="font-medium">{product.votingRights}</span>
                </div>
              )}
              {product.dividendPolicy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dividend Policy:</span>
                  <span className="font-medium">{product.dividendPolicy}</span>
                </div>
              )}
              {product.dilutionProtection && product.dilutionProtection.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dilution Protection:</span>
                  <span className="font-medium">{product.dilutionProtection.join(', ')}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.exitStrategy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exit Strategy:</span>
                  <span className="font-medium">{product.exitStrategy}</span>
                </div>
              )}
              {product.targetRaise !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Raise:</span>
                  <span className="font-medium">{formatCurrency(product.targetRaise)}</span>
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
            <div className="space-y-2">
              {product.ipoDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IPO Date:</span>
                  <span className="font-medium">{formatDate(product.ipoDate)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.acquisitionDisposalDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acquisition Date:</span>
                  <span className="font-medium">{formatDate(product.acquisitionDisposalDate)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.delistingDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delisting Date:</span>
                  <span className="font-medium">{formatDate(product.delistingDate)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {(product.corporateActionsHistory || (product.dividendPaymentDates && product.dividendPaymentDates.length > 0)) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Corporate Actions & Dividends</h3>
            <div className="space-y-4">
              {product.corporateActionsHistory && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Corporate Action History</h4>
                  <div className="text-sm">
                    {Array.isArray(product.corporateActionsHistory) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {product.corporateActionsHistory.map((action, index) => (
                          <li key={index}>
                            {action.date && formatDate(action.date)}: {action.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Corporate actions history available</p>
                    )}
                  </div>
                </div>
              )}

              {product.dividendPaymentDates && product.dividendPaymentDates.length > 0 && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2 mt-4">Dividend Payment Dates</h4>
                  <div className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      {product.dividendPaymentDates.map((date, index) => (
                        <li key={index}>{formatDate(date)}</li>
                      ))}
                    </ul>
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

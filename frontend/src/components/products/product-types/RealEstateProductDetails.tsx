/**
 * Enhanced component to display real estate product details with ALL database fields
 */

import React from 'react';
import { RealEstateProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface RealEstateProductDetailsProps {
  product: RealEstateProduct;
}

export default function RealEstateProductDetails({ product }: RealEstateProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Property Information</h3>
            <div className="space-y-2">
              {product.propertyName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Name:</span>
                  <span className="font-medium">{product.propertyName}</span>
                </div>
              )}
              {product.propertyId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property ID:</span>
                  <span className="font-medium">{product.propertyId}</span>
                </div>
              )}
              {product.assetNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Number:</span>
                  <span className="font-medium">{product.assetNumber}</span>
                </div>
              )}
              {product.propertyAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium">{product.propertyAddress}</span>
                </div>
              )}
              {product.propertyType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Type:</span>
                  <span className="font-medium">{product.propertyType}</span>
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
            <h3 className="text-lg font-semibold mb-4">Building & Unit Details</h3>
            <div className="space-y-2">
              {product.building && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Building:</span>
                  <span className="font-medium">{product.building}</span>
                </div>
              )}
              {product.unit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit:</span>
                  <span className="font-medium">{product.unit}</span>
                </div>
              )}
              {product.areaType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Area Type:</span>
                  <span className="font-medium">{product.areaType}</span>
                </div>
              )}
              {product.units !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units:</span>
                  <span className="font-medium">{formatNumber(product.units)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Financial Details</h3>
            <div className="space-y-2">
              {product.grossAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Amount:</span>
                  <span className="font-medium">{formatCurrency(product.grossAmount)}</span>
                </div>
              )}
              {product.taxableAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxable Amount:</span>
                  <span className="font-medium">{formatCurrency(product.taxableAmount)}</span>
                </div>
              )}
              {product.borrowingRate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Borrowing Rate:</span>
                  <span className="font-medium">{formatPercent(product.borrowingRate)}</span>
                </div>
              )}
              {product.targetRaise !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Raise:</span>
                  <span className="font-medium">{formatCurrency(product.targetRaise)}</span>
                </div>
              )}
              {product.billingFrequency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Frequency:</span>
                  <span className="font-medium">{product.billingFrequency}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Location & Development</h3>
            <div className="space-y-2">
              {product.geographicLocation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geographic Location:</span>
                  <span className="font-medium">{product.geographicLocation}</span>
                </div>
              )}
              {product.developmentStage && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Development Stage:</span>
                  <span className="font-medium">{product.developmentStage}</span>
                </div>
              )}
              {product.environmentalCertifications && product.environmentalCertifications.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Environmental Certifications:</span>
                  <div className="mt-1">
                    {Array.isArray(product.environmentalCertifications) ? (
                      <div className="flex flex-wrap gap-1">
                        {product.environmentalCertifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="font-medium">{product.environmentalCertifications}</span>
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
          <h3 className="text-lg font-semibold mb-4">Lease Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.leaseNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lease Number:</span>
                  <span className="font-medium">{product.leaseNumber}</span>
                </div>
              )}
              {product.tenant && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium">{product.tenant}</span>
                </div>
              )}
              {product.leaseManager && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lease Manager:</span>
                  <span className="font-medium">{product.leaseManager}</span>
                </div>
              )}
              {product.leaseClassification && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lease Classification:</span>
                  <span className="font-medium">{product.leaseClassification}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.leaseBeginDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lease Begin Date:</span>
                  <span className="font-medium">{formatDate(product.leaseBeginDate)}</span>
                </div>
              )}
              {product.leaseEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lease End Date:</span>
                  <span className="font-medium">{formatDate(product.leaseEndDate)}</span>
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
              <h4 className="font-medium text-muted-foreground mb-2">Property Lifecycle</h4>
              <div className="space-y-2">
                {product.acquisitionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acquisition Date:</span>
                    <span className="font-medium">{formatDate(product.acquisitionDate)}</span>
                  </div>
                )}
                {product.dispositionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disposition Date:</span>
                    <span className="font-medium">{formatDate(product.dispositionDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Billing Period</h4>
              <div className="space-y-2">
                {product.startingDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Starting Date:</span>
                    <span className="font-medium">{formatDate(product.startingDate)}</span>
                  </div>
                )}
                {product.endingDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ending Date:</span>
                    <span className="font-medium">{formatDate(product.endingDate)}</span>
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
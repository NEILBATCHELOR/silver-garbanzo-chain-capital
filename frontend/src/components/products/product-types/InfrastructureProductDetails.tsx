/**
 * Component to display infrastructure product details
 */

import React from 'react';
import { InfrastructureProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface InfrastructureProductDetailsProps {
  product: InfrastructureProduct;
}

export default function InfrastructureProductDetails({ product }: InfrastructureProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.assetId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset ID:</span>
                  <span className="font-medium">{product.assetId}</span>
                </div>
              )}
              {product.assetType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Type:</span>
                  <span className="font-medium">{product.assetType}</span>
                </div>
              )}
              {product.age !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span className="font-medium">{product.age} years</span>
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
            <h3 className="text-lg font-semibold mb-4">Condition & Performance</h3>
            <div className="space-y-2">
              {product.conditionScore !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condition Score:</span>
                  <span className="font-medium">{product.conditionScore}/5</span>
                </div>
              )}
              {product.maintenanceBacklog !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maintenance Backlog:</span>
                  <span className="font-medium">{product.maintenanceBacklog} items</span>
                </div>
              )}
              {product.meanTimeBetweenFailure !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mean Time Between Failure:</span>
                  <span className="font-medium">{product.meanTimeBetweenFailure} days</span>
                </div>
              )}
              {product.safetyIncidents !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Safety Incidents:</span>
                  <span className="font-medium">{product.safetyIncidents}</span>
                </div>
              )}
              {product.costOfReplacement !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost of Replacement:</span>
                  <span className="font-medium">{formatCurrency(product.costOfReplacement)}</span>
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
              <h4 className="font-medium text-muted-foreground mb-2">Design & Procurement</h4>
              <div className="space-y-2">
                {product.designDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Design Date:</span>
                    <span className="font-medium">{formatDate(product.designDate)}</span>
                  </div>
                )}
                {product.procurementDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Procurement Date:</span>
                    <span className="font-medium">{formatDate(product.procurementDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Maintenance & Inspection</h4>
              <div className="space-y-2">
                {product.inspectionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Inspection Date:</span>
                    <span className="font-medium">{formatDate(product.inspectionDate)}</span>
                  </div>
                )}
                {product.rehabilitationDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rehabilitation Date:</span>
                    <span className="font-medium">{formatDate(product.rehabilitationDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Future</h4>
              <div className="space-y-2">
                {product.replacementDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Planned Replacement Date:</span>
                    <span className="font-medium">{formatDate(product.replacementDate)}</span>
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
          </div>
        </CardContent>
      </Card>

      {product.performanceMetrics && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="text-sm">
                {typeof product.performanceMetrics === 'object' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.performanceMetrics).map(([key, value], index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' ? formatNumber(value) : value?.toString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Performance metrics data available</p>
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

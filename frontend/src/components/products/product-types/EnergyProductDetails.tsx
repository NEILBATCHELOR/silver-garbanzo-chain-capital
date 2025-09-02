/**
 * Component to display energy product details
 */

import React from 'react';
import { EnergyProduct } from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface EnergyProductDetailsProps {
  product: EnergyProduct;
  type?: ProjectType.ENERGY | ProjectType.SOLAR_WIND_CLIMATE;
}

export default function EnergyProductDetails({ product, type }: EnergyProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.projectName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Name:</span>
                  <span className="font-medium">{product.projectName}</span>
                </div>
              )}
              {product.projectIdentifier && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Identifier:</span>
                  <span className="font-medium">{product.projectIdentifier}</span>
                </div>
              )}
              {product.projectId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project ID:</span>
                  <span className="font-medium">{product.projectId}</span>
                </div>
              )}
              {product.projectType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Type:</span>
                  <span className="font-medium">{product.projectType}</span>
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
              {product.projectStatus && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Status:</span>
                  <Badge variant="outline">{product.projectStatus}</Badge>
                </div>
              )}
              {product.owner && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner:</span>
                  <span className="font-medium">{product.owner}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Project Specifications</h3>
            <div className="space-y-2">
              {product.capacity !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{formatNumber(product.capacity)} MW</span>
                </div>
              )}
              {product.projectCapacityMw !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Capacity:</span>
                  <span className="font-medium">{formatNumber(product.projectCapacityMw)} MW</span>
                </div>
              )}
              {product.siteLocation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Site Location:</span>
                  <span className="font-medium">{product.siteLocation}</span>
                </div>
              )}
              {product.siteId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Site ID:</span>
                  <span className="font-medium">{product.siteId}</span>
                </div>
              )}
              {product.landType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Land Type:</span>
                  <span className="font-medium">{product.landType}</span>
                </div>
              )}
              {product.electricityPurchaser && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Electricity Purchaser:</span>
                  <span className="font-medium">{product.electricityPurchaser}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Environmental & Financial</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Environmental Impact</h4>
              <div className="space-y-2">
                {product.carbonOffsetPotential && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carbon Offset Potential:</span>
                    <span className="font-medium">{product.carbonOffsetPotential}</span>
                  </div>
                )}
                {product.regulatoryCompliance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regulatory Compliance:</span>
                    <span className="font-medium">{product.regulatoryCompliance}</span>
                  </div>
                )}
                {product.regulatoryApprovals && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regulatory Approvals:</span>
                    <span className="font-medium">{product.regulatoryApprovals}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Financial & Contracts</h4>
              <div className="space-y-2">
                {product.receivableAmount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receivable Amount:</span>
                    <span className="font-medium">{formatCurrency(product.receivableAmount)}</span>
                  </div>
                )}
                {product.powerPurchaseAgreements && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PPAs:</span>
                    <span className="font-medium">{product.powerPurchaseAgreements}</span>
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

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Important Dates</h4>
              <div className="space-y-2">
                {product.expectedOnlineDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Online Date:</span>
                    <span className="font-medium">{formatDate(product.expectedOnlineDate)}</span>
                  </div>
                )}
                {product.decommissionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Decommission Date:</span>
                    <span className="font-medium">{formatDate(product.decommissionDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(product.financialData || product.performanceMetrics) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Performance & Financial Data</h3>
            <div className="space-y-4">
              {product.performanceMetrics && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Performance Metrics</h4>
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
              )}

              {product.financialData && (
                <div className="mt-4">
                  <h4 className="font-medium text-muted-foreground mb-2">Financial Data</h4>
                  <div className="text-sm">
                    {typeof product.financialData === 'object' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(product.financialData).map(([key, value], index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">
                              {typeof value === 'number' ? formatCurrency(value) : value?.toString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Financial data available</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {product.timelineData && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Project Timeline</h3>
            <div className="space-y-4">
              <div className="text-sm">
                {Array.isArray(product.timelineData) ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {product.timelineData.map((item, index) => (
                      <li key={index}>
                        {item.date && formatDate(item.date)}: {item.milestone}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Timeline data available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {product.fieldServiceLogs && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Maintenance Records</h3>
            <div className="text-sm">
              <pre className="bg-secondary p-4 rounded-md overflow-auto">
                {product.fieldServiceLogs}
              </pre>
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

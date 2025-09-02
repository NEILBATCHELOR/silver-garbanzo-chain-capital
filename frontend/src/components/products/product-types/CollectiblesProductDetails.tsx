/**
 * Component to display collectibles product details
 */

import React from 'react';
import { CollectiblesProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface CollectiblesProductDetailsProps {
  product: CollectiblesProduct;
}

export default function CollectiblesProductDetails({ product }: CollectiblesProductDetailsProps) {
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
              {product.description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium">{product.description}</span>
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
              {product.condition && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condition:</span>
                  <Badge variant="outline">{product.condition}</Badge>
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
            <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
            <div className="space-y-2">
              {product.purchasePrice !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Price:</span>
                  <span className="font-medium">{formatCurrency(product.purchasePrice)}</span>
                </div>
              )}
              {product.currentValue !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Value:</span>
                  <span className="font-medium">{formatCurrency(product.currentValue)}</span>
                </div>
              )}
              {product.insuranceDetails !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insurance Coverage:</span>
                  <span className="font-medium">{formatCurrency(product.insuranceDetails)}</span>
                </div>
              )}
              {product.salePrice !== undefined && product.salePrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sale Price:</span>
                  <span className="font-medium">{formatCurrency(product.salePrice)}</span>
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
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Important Dates & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Acquisition</h4>
              <div className="space-y-2">
                {product.acquisitionDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acquisition Date:</span>
                    <span className="font-medium">{formatDate(product.acquisitionDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Appraisal & Sale</h4>
              <div className="space-y-2">
                {product.appraisalDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Appraisal Date:</span>
                    <span className="font-medium">{formatDate(product.appraisalDate)}</span>
                  </div>
                )}
                {product.saleDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Date:</span>
                    <span className="font-medium">{formatDate(product.saleDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Storage</h4>
              <div className="space-y-2">
                {product.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage Location:</span>
                    <span className="font-medium">{product.location}</span>
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

      {/* Add a conditional section for a detailed description if needed */}
      {product.description && product.description.length > 50 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Detailed Description</h3>
            <div className="text-sm">
              <p className="whitespace-pre-wrap">{product.description}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

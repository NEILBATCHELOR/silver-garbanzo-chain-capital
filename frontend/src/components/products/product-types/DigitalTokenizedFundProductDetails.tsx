/**
 * Component to display digital tokenized fund product details
 */

import React from 'react';
import { DigitalTokenizedFundProduct } from '@/types/products';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface DigitalTokenizedFundProductDetailsProps {
  product: DigitalTokenizedFundProduct;
}

export default function DigitalTokenizedFundProductDetails({ product }: DigitalTokenizedFundProductDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-2">
              {product.assetName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Name:</span>
                  <span className="font-medium">{product.assetName}</span>
                </div>
              )}
              {product.assetSymbol && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Symbol:</span>
                  <span className="font-medium">{product.assetSymbol}</span>
                </div>
              )}
              {product.assetType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Type:</span>
                  <span className="font-medium">{product.assetType}</span>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Blockchain Details</h3>
            <div className="space-y-2">
              {product.blockchainNetwork && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blockchain Network:</span>
                  <span className="font-medium">{product.blockchainNetwork}</span>
                </div>
              )}
              {product.smartContractAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Smart Contract Address:</span>
                  <span className="font-medium truncate max-w-[250px]" title={product.smartContractAddress}>
                    {product.smartContractAddress}
                  </span>
                </div>
              )}
              {product.fractionalizationEnabled !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fractionalization:</span>
                  <Badge variant={product.fractionalizationEnabled ? 'default' : 'secondary'}>
                    {product.fractionalizationEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              )}
              {product.provenanceHistoryEnabled !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provenance History:</span>
                  <Badge variant={product.provenanceHistoryEnabled ? 'default' : 'secondary'}>
                    {product.provenanceHistoryEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Tokenomics & Supply</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Supply</h4>
              <div className="space-y-2">
                {product.totalSupply !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Supply:</span>
                    <span className="font-medium">{formatNumber(product.totalSupply)}</span>
                  </div>
                )}
                {product.circulatingSupply !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Circulating Supply:</span>
                    <span className="font-medium">{formatNumber(product.circulatingSupply)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Valuation</h4>
              <div className="space-y-2">
                {product.nav !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NAV:</span>
                    <span className="font-medium">{formatCurrency(product.nav)}</span>
                  </div>
                )}
                {product.tokenEconomics && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token Economics:</span>
                    <span className="font-medium">{product.tokenEconomics}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Offering</h4>
              <div className="space-y-2">
                {product.targetRaise !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Raise:</span>
                    <span className="font-medium">{formatCurrency(product.targetRaise)}</span>
                  </div>
                )}
                {product.issuanceDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issuance Date:</span>
                    <span className="font-medium">{formatDate(product.issuanceDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Governance & Compliance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Governance</h4>
              <div className="space-y-2">
                {product.embeddedRights && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Embedded Rights:</span>
                    <span className="font-medium">{product.embeddedRights}</span>
                  </div>
                )}
                {product.upgradeGovernance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upgrade Governance:</span>
                    <span className="font-medium">{product.upgradeGovernance}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Compliance & Custody</h4>
              <div className="space-y-2">
                {product.complianceRules && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compliance Rules:</span>
                    <span className="font-medium">{product.complianceRules}</span>
                  </div>
                )}
                {product.permissionControls && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Permission Controls:</span>
                    <span className="font-medium">{product.permissionControls}</span>
                  </div>
                )}
                {product.custodyArrangements && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custody Arrangements:</span>
                    <span className="font-medium">{product.custodyArrangements}</span>
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

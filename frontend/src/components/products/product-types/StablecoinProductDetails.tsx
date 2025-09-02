/**
 * Enhanced component to display stablecoin product details with ALL 55 database fields
 */

import React from 'react';
import { 
  StablecoinProduct, 
  FiatBackedStablecoin,
  CryptoBackedStablecoin,
  CommodityBackedStablecoin,
  AlgorithmicStablecoin,
  RebasingStablecoin
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';

interface StablecoinProductDetailsProps {
  product: StablecoinProduct;
  type: ProjectType;
}

export default function StablecoinProductDetails({ product, type }: StablecoinProductDetailsProps) {
  // Determine stablecoin subtype label based on project type
  const getStablecoinTypeLabel = () => {
    switch (type) {
      case ProjectType.FIAT_BACKED_STABLECOIN:
        return 'Fiat-Backed Stablecoin';
      case ProjectType.CRYPTO_BACKED_STABLECOIN:
        return 'Crypto-Backed Stablecoin';
      case ProjectType.COMMODITY_BACKED_STABLECOIN:
        return 'Commodity-Backed Stablecoin';
      case ProjectType.ALGORITHMIC_STABLECOIN:
        return 'Algorithmic Stablecoin';
      case ProjectType.REBASING_STABLECOIN:
        return 'Rebasing Stablecoin';
      default:
        return 'Stablecoin';
    }
  };

  const isFiatBacked = type === ProjectType.FIAT_BACKED_STABLECOIN;
  const isCryptoBacked = type === ProjectType.CRYPTO_BACKED_STABLECOIN;
  const isCommodityBacked = type === ProjectType.COMMODITY_BACKED_STABLECOIN;
  const isAlgorithmic = type === ProjectType.ALGORITHMIC_STABLECOIN;
  const isRebasing = type === ProjectType.REBASING_STABLECOIN;

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
                  <span className="text-muted-foreground">Symbol:</span>
                  <span className="font-medium">{product.assetSymbol}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{getStablecoinTypeLabel()}</Badge>
              </div>
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
              {product.targetRaise !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Raise:</span>
                  <span className="font-medium">{formatCurrency(product.targetRaise, 'USD')}</span>
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
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium">{product.blockchainNetwork}</span>
                </div>
              )}
              {product.smartContractAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Smart Contract:</span>
                  <span className="font-medium text-xs md:text-sm font-mono">
                    {product.smartContractAddress.slice(0, 10)}...{product.smartContractAddress.slice(-8)}
                  </span>
                </div>
              )}
              {product.fractionalizationEnabled !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fractionalization:</span>
                  <span className="font-medium">{product.fractionalizationEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              )}
              {product.provenanceHistoryEnabled !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provenance History:</span>
                  <span className="font-medium">{product.provenanceHistoryEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              )}
              {product.issuanceDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issuance Date:</span>
                  <span className="font-medium">{formatDate(product.issuanceDate)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Supply Information</h3>
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
              {product.pegValue !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peg Value:</span>
                  <span className="font-medium">{formatCurrency(product.pegValue, 'USD')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Collateral & Backing</h3>
            <div className="space-y-2">
              {product.collateralType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collateral Type:</span>
                  <span className="font-medium">{product.collateralType}</span>
                </div>
              )}
              {product.collateralRatio !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collateral Ratio:</span>
                  <span className="font-medium">{formatPercent(product.collateralRatio * 100)}</span>
                </div>
              )}
              {product.overcollateralizationThreshold !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overcollateralization Threshold:</span>
                  <span className="font-medium">{formatPercent(product.overcollateralizationThreshold * 100)}</span>
                </div>
              )}
              {product.reserveManagementPolicy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reserve Management:</span>
                  <span className="font-medium">{product.reserveManagementPolicy}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Stability Mechanisms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.stabilityMechanism && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stability Mechanism:</span>
                  <span className="font-medium">{product.stabilityMechanism}</span>
                </div>
              )}
              {product.redemptionMechanism && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Redemption Mechanism:</span>
                  <span className="font-medium">{product.redemptionMechanism}</span>
                </div>
              )}
              {product.liquidationTerms && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquidation Terms:</span>
                  <span className="font-medium">{product.liquidationTerms}</span>
                </div>
              )}
              {product.auditFrequency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audit Frequency:</span>
                  <span className="font-medium">{product.auditFrequency}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {product.depegRiskMitigation && product.depegRiskMitigation.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Depeg Mitigation:</span>
                  <div className="mt-1">
                    <div className="flex flex-wrap gap-1">
                      {product.depegRiskMitigation.map((mitigation, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {mitigation}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fiat-Backed Specific Fields */}
      {isFiatBacked && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Fiat-Backed Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {(product as FiatBackedStablecoin).reserveAssets && (product as FiatBackedStablecoin).reserveAssets.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Reserve Assets:</span>
                    <div className="mt-1">
                      <div className="flex flex-wrap gap-1">
                        {(product as FiatBackedStablecoin).reserveAssets.map((asset, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {asset}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {(product as FiatBackedStablecoin).reserveAuditFrequency && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reserve Audit Frequency:</span>
                    <span className="font-medium">{(product as FiatBackedStablecoin).reserveAuditFrequency}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(product as FiatBackedStablecoin).reserveCustodian && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reserve Custodian:</span>
                    <span className="font-medium">{(product as FiatBackedStablecoin).reserveCustodian}</span>
                  </div>
                )}
                {(product as FiatBackedStablecoin).reserveInsurance !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reserve Insurance:</span>
                    <span className="font-medium">{(product as FiatBackedStablecoin).reserveInsurance ? 'Yes' : 'No'}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crypto-Backed Specific Fields */}
      {isCryptoBacked && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Crypto-Backed Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {(product as CryptoBackedStablecoin).collateralAssets && (product as CryptoBackedStablecoin).collateralAssets.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Collateral Assets:</span>
                    <div className="mt-1">
                      <div className="flex flex-wrap gap-1">
                        {(product as CryptoBackedStablecoin).collateralAssets.map((asset, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {asset}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {(product as CryptoBackedStablecoin).minimumCollateralizationRatio !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Collateralization Ratio:</span>
                    <span className="font-medium">{formatPercent((product as CryptoBackedStablecoin).minimumCollateralizationRatio * 100)}</span>
                  </div>
                )}
                {(product as CryptoBackedStablecoin).liquidationPenalty !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquidation Penalty:</span>
                    <span className="font-medium">{formatPercent((product as CryptoBackedStablecoin).liquidationPenalty * 100)}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(product as CryptoBackedStablecoin).oracleProvider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Oracle Provider:</span>
                    <span className="font-medium">{(product as CryptoBackedStablecoin).oracleProvider}</span>
                  </div>
                )}
                {(product as CryptoBackedStablecoin).interestRate !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interest Rate:</span>
                    <span className="font-medium">{formatPercent((product as CryptoBackedStablecoin).interestRate)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commodity-Backed Specific Fields */}
      {isCommodityBacked && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Commodity-Backed Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {(product as CommodityBackedStablecoin).commodityType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commodity Type:</span>
                    <span className="font-medium">{(product as CommodityBackedStablecoin).commodityType}</span>
                  </div>
                )}
                {(product as CommodityBackedStablecoin).storageProvider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage Provider:</span>
                    <span className="font-medium">{(product as CommodityBackedStablecoin).storageProvider}</span>
                  </div>
                )}
                {(product as CommodityBackedStablecoin).auditProvider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audit Provider:</span>
                    <span className="font-medium">{(product as CommodityBackedStablecoin).auditProvider}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(product as CommodityBackedStablecoin).physicalRedemption !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Physical Redemption:</span>
                    <span className="font-medium">{(product as CommodityBackedStablecoin).physicalRedemption ? 'Available' : 'Not Available'}</span>
                  </div>
                )}
                {(product as CommodityBackedStablecoin).redemptionFee !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redemption Fee:</span>
                    <span className="font-medium">{formatPercent((product as CommodityBackedStablecoin).redemptionFee)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Algorithmic Specific Fields */}
      {isAlgorithmic && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Algorithmic Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {(product as AlgorithmicStablecoin).algorithmType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Algorithm Type:</span>
                    <span className="font-medium">{(product as AlgorithmicStablecoin).algorithmType}</span>
                  </div>
                )}
                {(product as AlgorithmicStablecoin).algorithmDescription && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Algorithm Description:</span>
                    <span className="font-medium">{(product as AlgorithmicStablecoin).algorithmDescription}</span>
                  </div>
                )}
                {(product as AlgorithmicStablecoin).secondaryTokenSymbol && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Secondary Token:</span>
                    <span className="font-medium">{(product as AlgorithmicStablecoin).secondaryTokenSymbol}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(product as AlgorithmicStablecoin).expansionMechanism && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expansion Mechanism:</span>
                    <span className="font-medium">{(product as AlgorithmicStablecoin).expansionMechanism}</span>
                  </div>
                )}
                {(product as AlgorithmicStablecoin).contractionMechanism && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contraction Mechanism:</span>
                    <span className="font-medium">{(product as AlgorithmicStablecoin).contractionMechanism}</span>
                  </div>
                )}
                {(product as AlgorithmicStablecoin).governanceToken && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Governance Token:</span>
                    <span className="font-medium">{(product as AlgorithmicStablecoin).governanceToken}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rebasing Specific Fields */}
      {isRebasing && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Rebasing Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {(product as RebasingStablecoin).rebaseFrequency && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rebase Frequency:</span>
                    <span className="font-medium">{(product as RebasingStablecoin).rebaseFrequency}</span>
                  </div>
                )}
                {(product as RebasingStablecoin).rebaseOracle && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rebase Oracle:</span>
                    <span className="font-medium">{(product as RebasingStablecoin).rebaseOracle}</span>
                  </div>
                )}
                {(product as RebasingStablecoin).rebaseGovernance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rebase Governance:</span>
                    <span className="font-medium">{(product as RebasingStablecoin).rebaseGovernance}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(product as RebasingStablecoin).positiveRebaseLimit !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Positive Rebase Limit:</span>
                    <span className="font-medium">{formatPercent((product as RebasingStablecoin).positiveRebaseLimit)}</span>
                  </div>
                )}
                {(product as RebasingStablecoin).negativeRebaseLimit !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Negative Rebase Limit:</span>
                    <span className="font-medium">{formatPercent((product as RebasingStablecoin).negativeRebaseLimit)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Compliance & Rights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {product.complianceRules && (
                <div>
                  <span className="text-muted-foreground">Compliance Rules:</span>
                  <p className="font-medium text-sm mt-1">{product.complianceRules}</p>
                </div>
              )}
              {product.embeddedRights && (
                <div>
                  <span className="text-muted-foreground">Embedded Rights:</span>
                  <p className="font-medium text-sm mt-1">{product.embeddedRights}</p>
                </div>
              )}
            </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
/**
 * Review & Deploy Step - Step 6 of Universal Product Wizard
 * 
 * Configuration summary, validation, and deployment
 * Shows all selections with edit navigation
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Edit,
  Download,
  Save,
  Rocket,
  FileText,
  Package,
  BarChart3,
  DollarSign
} from 'lucide-react';
import type {
  UniversalStructuredProductMetadata,
  ProductCategory,
  UnderlyingAsset,
  BarrierConfiguration,
  CouponConfiguration,
  SettlementConfiguration
} from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';
import { useState, useEffect } from 'react';

interface ReviewDeployStepProps {
  productCategory: ProductCategory;
  productSubtype: string;
  underlyings: UnderlyingAsset[];
  barriers?: BarrierConfiguration;
  coupons?: CouponConfiguration;
  settlement: SettlementConfiguration;
  onEdit: (step: number) => void;
  onDeploy: () => void;
  onSave?: () => void;
  onExport?: () => void;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  step?: number;
}

export function ReviewDeployStep({
  productCategory,
  productSubtype,
  underlyings,
  barriers,
  coupons,
  settlement,
  onEdit,
  onDeploy,
  onSave,
  onExport
}: ReviewDeployStepProps) {
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [metadataSize, setMetadataSize] = useState<number>(0);
  const [isValid, setIsValid] = useState<boolean>(true);

  // Calculate metadata size and validate
  useEffect(() => {
    const issues: ValidationIssue[] = [];
    let size = 0;

    // Basic validation
    if (underlyings.length === 0) {
      issues.push({
        type: 'error',
        title: 'Missing Underlyings',
        description: 'At least one underlying asset is required',
        step: 3
      });
    }

    if (!settlement.redemptionVault) {
      issues.push({
        type: 'error',
        title: 'Missing Redemption Vault',
        description: 'Redemption vault address is required',
        step: 5
      });
    }

    // Calculate approximate metadata size
    size += productCategory.length + productSubtype.length;
    size += underlyings.reduce((acc, u) => acc + JSON.stringify(u).length, 0);
    if (barriers) size += JSON.stringify(barriers).length;
    if (coupons) size += JSON.stringify(coupons).length;
    size += JSON.stringify(settlement).length;

    // Size validation
    if (size > 1024) {
      issues.push({
        type: 'error',
        title: 'Metadata Too Large',
        description: `Metadata size (${size} bytes) exceeds 1KB limit. Consider simplifying configuration.`
      });
    } else if (size > 900) {
      issues.push({
        type: 'warning',
        title: 'Metadata Size Warning',
        description: `Metadata size (${size} bytes) is approaching 1KB limit.`
      });
    }

    // Check for oracle addresses
    const missingOracles = underlyings.filter(u => !u.oracleAddress);
    if (missingOracles.length > 0) {
      issues.push({
        type: 'warning',
        title: 'Missing Oracle Addresses',
        description: `${missingOracles.length} underlying(s) without oracle address`,
        step: 3
      });
    }

    setValidationIssues(issues);
    setMetadataSize(size);
    setIsValid(issues.filter(i => i.type === 'error').length === 0);
  }, [productCategory, productSubtype, underlyings, barriers, coupons, settlement]);

  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuration Review</CardTitle>
              <CardDescription>Verify your product configuration before deployment</CardDescription>
            </div>
            <Badge variant={isValid ? 'default' : 'destructive'} className="text-sm">
              {isValid ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Ready to Deploy
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Issues Found
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metadata Size */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">On-Chain Metadata Size</p>
                <p className="text-sm text-muted-foreground">
                  {metadataSize} bytes of 1,024 bytes maximum
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    metadataSize > 1024
                      ? 'bg-destructive'
                      : metadataSize > 900
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((metadataSize / 1024) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium">{Math.round((metadataSize / 1024) * 100)}%</span>
            </div>
          </div>

          {/* Validation Issues */}
          {validationIssues.length > 0 && (
            <div className="space-y-2">
              {validationIssues.map((issue, idx) => (
                <Alert key={idx} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                  {issue.type === 'error' && <AlertCircle className="h-4 w-4" />}
                  {issue.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                  {issue.type === 'info' && <CheckCircle2 className="h-4 w-4" />}
                  <AlertTitle>{issue.title}</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{issue.description}</span>
                    {issue.step && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(issue.step!)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Fix
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Accordion type="multiple" defaultValue={['product', 'underlyings', 'features', 'settlement']} className="space-y-2">
        {/* Product Classification */}
        <AccordionItem value="product">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Product Classification</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatCategoryName(productCategory)} - {productSubtype}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-6 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p className="font-medium">{formatCategoryName(productCategory)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subtype</p>
                    <p className="font-medium">{productSubtype}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onEdit(1)}>
                  <Edit className="mr-1 h-3 w-3" />
                  Edit Category
                </Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Underlying Assets */}
        <AccordionItem value="underlyings">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Underlying Assets</h3>
                  <p className="text-sm text-muted-foreground">
                    {underlyings.length} asset{underlyings.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-6 pb-4 space-y-3">
                {underlyings.map((underlying, idx) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{underlying.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {underlying.identifier} • {underlying.type}
                        </p>
                        {underlying.initialPrice && (
                          <p className="text-sm mt-1">
                            Initial: {underlying.currency || 'USD'} {underlying.initialPrice}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{underlying.oracleProvider}</Badge>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => onEdit(3)}>
                  <Edit className="mr-1 h-3 w-3" />
                  Edit Underlyings
                </Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Features */}
        <AccordionItem value="features">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Product Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Barriers, coupons, and protection
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-6 pb-4 space-y-3">
                {/* Barriers */}
                {barriers && barriers.barriers.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-2">Barriers ({barriers.barriers.length})</p>
                    {barriers.barriers.map((barrier, idx) => (
                      <div key={idx} className="text-sm space-y-1">
                        <p>
                          • {barrier.barrierType}: {barrier.level}% ({barrier.direction})
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coupons */}
                {coupons && coupons.coupons.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-2">
                      Coupons ({coupons.coupons.length})
                      {coupons.memoryFeature === 'true' && (
                        <Badge variant="outline" className="ml-2">Memory</Badge>
                      )}
                    </p>
                    {coupons.coupons.map((coupon, idx) => (
                      <div key={idx} className="text-sm space-y-1">
                        <p>
                          • {coupon.rate}% {coupon.frequency}
                          {coupon.conditional === 'true' && ' (conditional)'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={() => onEdit(4)}>
                  <Edit className="mr-1 h-3 w-3" />
                  Edit Features
                </Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Settlement */}
        <AccordionItem value="settlement">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Settlement Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    {settlement.settlementType} settlement • {settlement.settlementMethod}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-6 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="font-medium">{settlement.settlementType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Method</p>
                    <p className="font-medium">{settlement.settlementMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Days</p>
                    <p className="font-medium">T+{settlement.settlementDays}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vault</p>
                    <p className="font-mono text-xs truncate">{settlement.redemptionVault || 'Not set'}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onEdit(5)}>
                  <Edit className="mr-1 h-3 w-3" />
                  Edit Settlement
                </Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {onSave && (
            <Button variant="outline" onClick={onSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          )}
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Config
            </Button>
          )}
        </div>
        <Button
          onClick={onDeploy}
          disabled={!isValid}
          size="lg"
        >
          <Rocket className="mr-2 h-4 w-4" />
          Deploy Product
        </Button>
      </div>
    </div>
  );
}

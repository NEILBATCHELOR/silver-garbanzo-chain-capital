/**
 * Universal Product Wizard - End-to-end product creation
 * Part of Universal Structured Product Framework Phase 4
 * 
 * Multi-step wizard that guides users through creating any structured product:
 * 1. Product Category Selection ✅ NEW
 * 2. Component Selection
 * 3. Underlying Assets Configuration
 * 4. Feature Configuration (barriers, coupons, etc.)
 * 5. Settlement Configuration
 * 6. Review & Deploy ✅ NEW
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCategorySelector } from './ProductCategorySelector';
import { ComponentSelector, type ComponentSelectionState } from './ComponentSelector';
import { UnderlyingBuilder } from './UnderlyingBuilder';
import { BarrierConfigurator } from './BarrierConfigurator';
import { CouponBuilder } from './CouponBuilder';
import { SettlementConfigurator } from './SettlementConfigurator';
import { ReviewDeployStep } from './ReviewDeployStep';
import type {
  UniversalStructuredProductMetadata,
  ProductCategory,
  UnderlyingAsset,
  BasketConfiguration,
  BarrierConfiguration,
  CouponConfiguration,
  SettlementConfiguration
} from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';

interface UniversalProductWizardProps {
  onComplete: (metadata: UniversalStructuredProductMetadata) => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  { number: 1, title: 'Product Category', description: 'Choose product type' },
  { number: 2, title: 'Components', description: 'Select features' },
  { number: 3, title: 'Underlyings', description: 'Add assets' },
  { number: 4, title: 'Features', description: 'Configure barriers & coupons' },
  { number: 5, title: 'Settlement', description: 'Redemption setup' },
  { number: 6, title: 'Review', description: 'Finalize & deploy' }
];

export function UniversalProductWizard({ onComplete, onCancel }: UniversalProductWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [productCategory, setProductCategory] = useState<ProductCategory>('autocallable');
  const [productSubtype, setProductSubtype] = useState<string>('barrier_autocallable');
  const [componentSelection, setComponentSelection] = useState<ComponentSelectionState>({
    barriers: true,
    coupons: true,
    callable: true,
    putable: false,
    capitalProtection: true,
    participation: true
  });
  const [underlyings, setUnderlyings] = useState<UnderlyingAsset[]>([]);
  const [basket, setBasket] = useState<BasketConfiguration | undefined>();
  const [barriers, setBarriers] = useState<BarrierConfiguration | undefined>();
  const [coupons, setCoupons] = useState<CouponConfiguration | undefined>();
  const [settlement, setSettlement] = useState<SettlementConfiguration>({
    settlementType: 'cash',
    settlementMethod: 'automatic',
    settlementDays: '2',
    redemptionVault: ''
  });

  // Check for saved draft on component mount
  useEffect(() => {
    const latestDraftKey = localStorage.getItem('universal-product-latest-draft');
    if (latestDraftKey) {
      const shouldRestore = window.confirm(
        'A saved draft was found. Would you like to restore it?'
      );
      
      if (shouldRestore) {
        try {
          const draftData = localStorage.getItem(latestDraftKey);
          if (draftData) {
            const draft = JSON.parse(draftData);
            
            // Restore all state
            setCurrentStep(draft.currentStep || 1);
            setProductCategory(draft.productCategory || 'autocallable');
            setProductSubtype(draft.productSubtype || 'barrier_autocallable');
            setComponentSelection(draft.componentSelection || {
              barriers: true,
              coupons: true,
              callable: true,
              putable: false,
              capitalProtection: true,
              participation: true
            });
            setUnderlyings(draft.underlyings || []);
            setBasket(draft.basket);
            setBarriers(draft.barriers);
            setCoupons(draft.coupons);
            setSettlement(draft.settlement || {
              settlementType: 'cash',
              settlementMethod: 'automatic',
              settlementDays: '2',
              redemptionVault: ''
            });
            
            console.log('Draft restored successfully');
          }
        } catch (error) {
          console.error('Failed to restore draft:', error);
        }
      } else {
        // User declined, clear the draft reference
        localStorage.removeItem('universal-product-latest-draft');
      }
    }
  }, []);

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleCategoryChange = (category: ProductCategory, subtype: string) => {
    setProductCategory(category);
    setProductSubtype(subtype);
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step as WizardStep);
  };

  const handleDeploy = () => {
    // Build complete metadata object
    const metadata: UniversalStructuredProductMetadata = {
      assetClass: 'structured_product',
      instrumentType: productSubtype,
      productCategory,
      productSubtype,
      underlyings,
      underlyingBasket: basket,
      payoffStructure: {
        payoffType: 'linear',
        returnCalculation: 'point_to_point'
      },
      barriers,
      coupons,
      observation: {
        observationType: 'discrete',
        valuationMethod: 'end_of_day'
      },
      settlement,
      oracles: underlyings.map(u => ({
        purpose: 'underlying_price' as const,
        provider: u.oracleProvider,
        oracleAddress: u.oracleAddress,
        updateFrequency: 'realtime' as const,
        dataType: 'price' as const
      })),
      // Base fields from UniversalMetadata
      decimals: '6',
      currency: 'USD',
      issuer: 'Chain Capital LLC',
      jurisdiction: 'US',
      issueDate: new Date().toISOString().split('T')[0],
      prospectusUri: '',
      termSheetUri: ''
    };

    onComplete(metadata);
  };

  const handleSave = () => {
    // Save draft to localStorage for recovery
    const draftKey = `universal-product-draft-${Date.now()}`;
    const draftData = {
      savedAt: new Date().toISOString(),
      currentStep,
      productCategory,
      productSubtype,
      componentSelection,
      underlyings,
      basket,
      barriers,
      coupons,
      settlement
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      localStorage.setItem('universal-product-latest-draft', draftKey);
      
      // Show success notification
      console.log('Draft saved successfully:', draftKey);
      
      // Optional: Could show a toast notification here
      // toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Optional: Could show error notification
      // toast.error('Failed to save draft');
    }
  };

  const handleExport = () => {
    // Export complete product configuration as JSON
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      productConfiguration: {
        productCategory,
        productSubtype,
        componentSelection,
        underlyings,
        basket,
        barriers,
        coupons,
        settlement
      }
    };

    try {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create descriptive filename
      const filename = `${productSubtype.replace(/_/g, '-')}-config-${Date.now()}.json`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Configuration exported:', filename);
    } catch (error) {
      console.error('Failed to export configuration:', error);
    }
  };

  const progress = (currentStep / 6) * 100;

  // Determine if current step is complete
  const isStepComplete = (step: WizardStep): boolean => {
    switch (step) {
      case 1:
        return !!productCategory && !!productSubtype;
      case 2:
        return true; // Component selection always valid
      case 3:
        return underlyings.length > 0;
      case 4:
        return true; // Features optional
      case 5:
        return !!settlement.redemptionVault;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const canProceed = isStepComplete(currentStep);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <CardTitle>Create Universal Structured Product</CardTitle>
            <Badge variant="outline">Step {currentStep} of 6</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className={`flex flex-col items-center ${
                  step.number === currentStep
                    ? 'text-primary font-medium'
                    : step.number < currentStep
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    step.number === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.number < currentStep
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted'
                  }`}
                >
                  {step.number}
                </div>
                <span className="text-xs">{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <ProductCategorySelector
            value={productCategory}
            onChange={handleCategoryChange}
          />
        )}
        
        {currentStep === 2 && (
          <ComponentSelector value={componentSelection} onChange={setComponentSelection} />
        )}
        
        {currentStep === 3 && (
          <UnderlyingBuilder
            underlyings={underlyings}
            basket={basket}
            onChange={(u, b) => {
              setUnderlyings(u);
              setBasket(b);
            }}
          />
        )}
        
        {currentStep === 4 && (
          <div className="space-y-6">
            {componentSelection.barriers && (
              <BarrierConfigurator barriers={barriers} onChange={setBarriers} />
            )}
            {componentSelection.coupons && (
              <CouponBuilder coupons={coupons} onChange={setCoupons} />
            )}
          </div>
        )}
        
        {currentStep === 5 && (
          <SettlementConfigurator settlement={settlement} onChange={setSettlement} />
        )}
        
        {currentStep === 6 && (
          <ReviewDeployStep
            productCategory={productCategory}
            productSubtype={productSubtype}
            underlyings={underlyings}
            barriers={barriers}
            coupons={coupons}
            settlement={settlement}
            onEdit={handleEdit}
            onDeploy={handleDeploy}
            onSave={handleSave}
            onExport={handleExport}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {currentStep < 6 && (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

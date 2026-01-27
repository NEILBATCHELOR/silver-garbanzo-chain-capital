/**
 * Universal Product Wizard - End-to-end product creation
 * Part of Universal Structured Product Framework Phase 4
 * 
 * Multi-step wizard that guides users through creating any structured product:
 * 1. Product Category Selection
 * 2. Component Selection
 * 3. Underlying Assets Configuration
 * 4. Feature Configuration (barriers, coupons, etc.)
 * 5. Settlement Configuration
 * 6. Review & Deploy
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Rocket } from 'lucide-react';
import { ComponentSelector, type ComponentSelectionState } from './ComponentSelector';
import { UnderlyingBuilder } from './UnderlyingBuilder';
import { BarrierConfigurator } from './BarrierConfigurator';
import { CouponBuilder } from './CouponBuilder';
import { SettlementConfigurator } from './SettlementConfigurator';
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

  const progress = (currentStep / 6) * 100;

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

      {/* Step Content - Will be implemented in next chunk */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Product Category</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Product category selection UI (to be implemented)</p>
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Review & Deploy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Review summary UI (to be implemented)</p>
            </CardContent>
          </Card>
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
          {currentStep < 6 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => console.log('Deploy')}>
              <Rocket className="mr-2 h-4 w-4" />
              Deploy Product
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

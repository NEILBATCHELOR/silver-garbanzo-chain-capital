/**
 * Asset Metadata Wizard - ENHANCED
 * 
 * Main wizard component for creating comprehensive on-chain metadata
 * Supports ALL asset classes per Chain Capital Metadata Specification v1.0.0
 * 
 * Multi-step flow:
 * 1. Asset Class Selection
 * 2. Instrument Type Selection
 * 3. Metadata Form (asset-specific)
 * 4. Preview & Validation
 * 5. Complete (returns metadata for deployment)
 * 
 * ENHANCEMENT:
 * - Routes to all 32 available forms dynamically
 * - Uses FormMapping configuration for routing
 * - Supports all asset classes, not just structured products
 */

import { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Circle, 
  Loader2 
} from 'lucide-react';
import { AssetClassSelector } from './AssetClassSelector';
import { InstrumentTypeSelector } from './InstrumentTypeSelector';
import { MetadataPreview } from './MetadataPreview';
import { 
  onChainMetadataBuilder,
  type AssetClass,
  type OnChainMetadataResult
} from '@/services/tokens/metadata';
import { 
  getInstrumentTypes, 
  getFormComponent, 
  hasMultipleTypes 
} from './FormMapping';

// ============================================================================
// DYNAMIC FORM IMPORTS
// ============================================================================

// Lazy load forms on demand for better performance
const formComponents = {
  AutocallableForm: lazy(() => import('./forms/AutocallableForm').then(m => ({ default: m.AutocallableForm }))),
  PrincipalProtectedNoteForm: lazy(() => import('./forms/PrincipalProtectedNoteForm').then(m => ({ default: m.PrincipalProtectedNoteForm }))),
  ReverseConvertibleForm: lazy(() => import('./forms/ReverseConvertibleForm').then(m => ({ default: m.ReverseConvertibleForm }))),
  CommonStockForm: lazy(() => import('./forms/CommonStockForm').then(m => ({ default: m.CommonStockForm }))),
  PrivateEquityForm: lazy(() => import('./forms/PrivateEquityForm').then(m => ({ default: m.PrivateEquityForm }))),
  CorporateBondForm: lazy(() => import('./forms/CorporateBondForm').then(m => ({ default: m.CorporateBondForm }))),
  GovernmentBondForm: lazy(() => import('./forms/GovernmentBondForm').then(m => ({ default: m.GovernmentBondForm }))),
  CommercialPaperForm: lazy(() => import('./forms/CommercialPaperForm').then(m => ({ default: m.CommercialPaperForm }))),
  CreditLinkedNoteForm: lazy(() => import('./forms/CreditLinkedNoteForm').then(m => ({ default: m.CreditLinkedNoteForm }))),
  MutualFundForm: lazy(() => import('./forms/MutualFundForm').then(m => ({ default: m.MutualFundForm }))),
  MoneyMarketFundForm: lazy(() => import('./forms/MoneyMarketFundForm').then(m => ({ default: m.MoneyMarketFundForm }))),
  ETFForm: lazy(() => import('./forms/ETFForm').then(m => ({ default: m.ETFForm }))),
  ActivelyManagedCertificateForm: lazy(() => import('./forms/ActivelyManagedCertificateForm').then(m => ({ default: m.ActivelyManagedCertificateForm }))),
  CommoditySpotForm: lazy(() => import('./forms/CommoditySpotForm').then(m => ({ default: m.CommoditySpotForm }))),
  CommodityFuturesForm: lazy(() => import('./forms/CommodityFuturesForm').then(m => ({ default: m.CommodityFuturesForm }))),
  TrackerCertificateForm: lazy(() => import('./forms/TrackerCertificateForm').then(m => ({ default: m.TrackerCertificateForm }))),
  VentureCapitalFundForm: lazy(() => import('./forms/VentureCapitalFundForm').then(m => ({ default: m.VentureCapitalFundForm }))),
  DirectLendingForm: lazy(() => import('./forms/DirectLendingForm').then(m => ({ default: m.DirectLendingForm }))),
  CommercialRealEstateForm: lazy(() => import('./forms/CommercialRealEstateForm').then(m => ({ default: m.CommercialRealEstateForm }))),
  REITForm: lazy(() => import('./forms/REITForm').then(m => ({ default: m.REITForm }))),
  InfrastructureAssetForm: lazy(() => import('./forms/InfrastructureAssetForm').then(m => ({ default: m.InfrastructureAssetForm }))),
  RenewableEnergyProjectForm: lazy(() => import('./forms/RenewableEnergyProjectForm').then(m => ({ default: m.RenewableEnergyProjectForm }))),
  OilGasAssetForm: lazy(() => import('./forms/OilGasAssetForm').then(m => ({ default: m.OilGasAssetForm }))),
  CollectibleForm: lazy(() => import('./forms/CollectibleForm').then(m => ({ default: m.CollectibleForm }))),
  FiatBackedStablecoinForm: lazy(() => import('./forms/FiatBackedStablecoinForm').then(m => ({ default: m.FiatBackedStablecoinForm }))),
  CryptoBackedStablecoinForm: lazy(() => import('./forms/CryptoBackedStablecoinForm').then(m => ({ default: m.CryptoBackedStablecoinForm }))),
  AlgorithmicStablecoinForm: lazy(() => import('./forms/AlgorithmicStablecoinForm').then(m => ({ default: m.AlgorithmicStablecoinForm }))),
  RebasingStablecoinForm: lazy(() => import('./forms/RebasingStablecoinForm').then(m => ({ default: m.RebasingStablecoinForm }))),
  CommodityBackedStablecoinForm: lazy(() => import('./forms/CommodityBackedStablecoinForm').then(m => ({ default: m.CommodityBackedStablecoinForm }))),
  CarbonCreditForm: lazy(() => import('./forms/CarbonCreditForm').then(m => ({ default: m.CarbonCreditForm }))),
  RenewableEnergyCertificateForm: lazy(() => import('./forms/RenewableEnergyCertificateForm').then(m => ({ default: m.RenewableEnergyCertificateForm }))),
  InvoiceReceivableForm: lazy(() => import('./forms/InvoiceReceivableForm').then(m => ({ default: m.InvoiceReceivableForm })))
};

type FormComponentKey = keyof typeof formComponents;

// ============================================================================
// WIZARD STATE
// ============================================================================

type WizardStep = 
  | 'assetClass'
  | 'instrumentType'
  | 'metadataForm'
  | 'preview';

interface WizardState {
  assetClass: AssetClass | null;
  instrumentType: string | null;
  formData: Record<string, any> | null;
  generatedMetadata: OnChainMetadataResult | null;
}

const steps: { id: WizardStep; label: string; description: string }[] = [
  { id: 'assetClass', label: 'Asset Class', description: 'Select category' },
  { id: 'instrumentType', label: 'Instrument Type', description: 'Select specific type' },
  { id: 'metadataForm', label: 'Details', description: 'Enter metadata' },
  { id: 'preview', label: 'Review', description: 'Validate & confirm' }
];

interface AssetMetadataWizardProps {
  onComplete?: (metadata: OnChainMetadataResult) => void;
  onCancel?: () => void;
}

export function AssetMetadataWizard({ onComplete, onCancel }: AssetMetadataWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('assetClass');
  const [state, setState] = useState<WizardState>({
    assetClass: null,
    instrumentType: null,
    formData: null,
    generatedMetadata: null
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // =========================================================================
  // STEP HANDLERS
  // =========================================================================

  const handleAssetClassSelect = (assetClass: AssetClass) => {
    setState(prev => ({
      ...prev,
      assetClass,
      instrumentType: null,
      formData: null,
      generatedMetadata: null
    }));

    // Check if this asset class has multiple instrument types
    const multipleTypes = hasMultipleTypes(assetClass);
    
    if (!multipleTypes) {
      // Only one type available - auto-select it and go to form
      const types = getInstrumentTypes(assetClass);
      if (types.length === 1) {
        setState(prev => ({ ...prev, instrumentType: types[0].value }));
        setCurrentStep('metadataForm');
      }
    } else {
      // Multiple types - go to instrument type selection
      setCurrentStep('instrumentType');
    }
  };

  const handleInstrumentTypeSelect = (instrumentType: string) => {
    setState(prev => ({ ...prev, instrumentType }));
    setCurrentStep('metadataForm');
  };

  const handleFormChange = (formData: Record<string, any>) => {
    setState(prev => ({ ...prev, formData }));
  };

  const handleGenerateMetadata = () => {
    if (!state.formData || !state.instrumentType) {
      return;
    }

    setIsGenerating(true);

    try {
      // Build metadata based on instrument type
      const metadata = onChainMetadataBuilder.build({
        type: state.instrumentType as any, // Type coercion for now
        ...state.formData
      } as any);

      setState(prev => ({ ...prev, generatedMetadata: metadata }));
      setCurrentStep('preview');
    } catch (error) {
      console.error('Failed to generate metadata:', error);
      alert('Failed to generate metadata. Please check all required fields.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    if (state.generatedMetadata && onComplete) {
      onComplete(state.generatedMetadata);
    }
  };

  // =========================================================================
  // NAVIGATION
  // =========================================================================

  const canGoNext = () => {
    switch (currentStep) {
      case 'assetClass':
        return state.assetClass !== null;
      case 'instrumentType':
        return state.instrumentType !== null;
      case 'metadataForm':
        // Basic validation - check that we have some form data
        return state.formData !== null && Object.keys(state.formData).length > 0;
      case 'preview':
        return state.generatedMetadata?.validation.valid === true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStep === 'metadataForm') {
      handleGenerateMetadata();
    } else if (currentStep === 'preview') {
      handleComplete();
    } else {
      // Navigate to next step
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].id);
      }
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      // Special case: if going back from metadataForm and asset class only has one type
      if (currentStep === 'metadataForm' && state.assetClass && !hasMultipleTypes(state.assetClass)) {
        setCurrentStep('assetClass');
      } else {
        setCurrentStep(steps[prevIndex].id);
      }
    }
  };

  // =========================================================================
  // DYNAMIC FORM RENDERING
  // =========================================================================

  const renderForm = () => {
    if (!state.assetClass || !state.instrumentType) {
      return null;
    }

    const formComponentName = getFormComponent(state.assetClass, state.instrumentType);
    if (!formComponentName) {
      return (
        <Alert>
          <AlertDescription>
            Form not found for {state.instrumentType}. Please select a different type.
          </AlertDescription>
        </Alert>
      );
    }

    const FormComponent = formComponents[formComponentName as FormComponentKey];
    if (!FormComponent) {
      return (
        <Alert>
          <AlertDescription>
            Form component '{formComponentName}' not implemented yet.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Suspense 
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <FormComponent
          value={state.formData || {}}
          onChange={handleFormChange}
        />
      </Suspense>
    );
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Metadata Wizard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create comprehensive on-chain metadata for tokenized assets
          </p>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {steps[currentStepIndex]?.label}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-6">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isActive 
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted bg-background'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <Circle className="h-4 w-4 fill-current" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 'assetClass' && (
            <AssetClassSelector
              selectedClass={state.assetClass}
              onSelect={handleAssetClassSelect}
            />
          )}

          {currentStep === 'instrumentType' && state.assetClass && (
            <InstrumentTypeSelector
              assetClass={state.assetClass}
              selectedType={state.instrumentType}
              onSelect={handleInstrumentTypeSelect}
            />
          )}

          {currentStep === 'metadataForm' && renderForm()}

          {currentStep === 'preview' && (
            <MetadataPreview metadata={state.generatedMetadata} />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStepIndex === 0 ? onCancel : goBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Button
          onClick={goNext}
          disabled={!canGoNext() || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : currentStep === 'preview' ? (
            <>
              Complete
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </>
          ) : currentStep === 'metadataForm' ? (
            <>
              Generate & Preview
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

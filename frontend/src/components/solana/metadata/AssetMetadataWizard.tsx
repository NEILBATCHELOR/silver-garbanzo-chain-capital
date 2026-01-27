/**
 * Asset Metadata Wizard
 * 
 * Main wizard component for creating comprehensive on-chain metadata
 * Supports all asset classes per Chain Capital Metadata Specification v1.0.0
 * 
 * Multi-step flow:
 * 1. Asset Class Selection
 * 2. Instrument Type Selection (if applicable)
 * 3. Metadata Form (asset-specific)
 * 4. Preview & Validation
 * 5. Complete (returns metadata for deployment)
 */

import { useState } from 'react';
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
import { AutocallableForm } from './AutocallableForm';
import { MetadataPreview } from './MetadataPreview';
import { 
  onChainMetadataBuilder,
  type AssetClass,
  type AutocallableInput,
  type OnChainMetadataResult
} from '@/services/tokens/metadata';

type WizardStep = 
  | 'assetClass'
  | 'instrumentType'
  | 'metadataForm'
  | 'preview'
  | 'complete';

interface WizardState {
  assetClass: AssetClass | null;
  instrumentType: string | null;
  formData: Partial<AutocallableInput> | null;
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

    // For now, skip instrument type and go straight to form
    // In future, add instrument type selection for asset classes with multiple types
    if (assetClass === 'structured_product') {
      setState(prev => ({ ...prev, instrumentType: 'autocallable' }));
      setCurrentStep('metadataForm');
    }
  };

  const handleFormChange = (formData: Partial<AutocallableInput>) => {
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
        type: 'autocallable',
        ...state.formData
      } as AutocallableInput);

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
        return validateForm();
      case 'preview':
        return state.generatedMetadata?.validation.valid === true;
      default:
        return false;
    }
  };

  const validateForm = () => {
    const { formData } = state;
    if (!formData) return false;

    // Check required fields for Autocallable
    const required = [
      'name', 'symbol', 'uri', 'decimals', 'issuer', 'jurisdiction',
      'issueDate', 'maturityDate', 'currency', 'productSubtype',
      'underlying', 'underlyingName', 'initialPrice', 'barrierLevel',
      'knockInBarrier', 'couponRate', 'couponType', 'memoryFeature',
      'observationFreq', 'callType', 'firstObsDate', 'finalObsDate',
      'oracleProvider', 'oracleAddress', 'valuationMethod', 'fixingTime',
      'redemptionVault', 'redemptionMethod', 'settlementDays',
      'upsideParticipation', 'downsideParticipation'
    ];

    return required.every(field => formData[field as keyof AutocallableInput] !== undefined);
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
      setCurrentStep(steps[prevIndex].id);
    }
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

          {currentStep === 'instrumentType' && (
            <Alert>
              <AlertDescription>
                Instrument type selection will be implemented for asset classes with multiple types
              </AlertDescription>
            </Alert>
          )}

          {currentStep === 'metadataForm' && state.instrumentType === 'autocallable' && (
            <AutocallableForm
              value={state.formData || {}}
              onChange={handleFormChange}
            />
          )}

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

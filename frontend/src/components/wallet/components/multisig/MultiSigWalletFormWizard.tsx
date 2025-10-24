/**
 * Multi-Sig Wallet Form Wizard
 * Step-by-step wizard wrapper for the working MultiSigWalletForm
 * Based on /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/src/components/wallet/multisig/MultiSigWalletForm.tsx
 */

import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield,
  Users,
  Wallet,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Settings,
  Zap,
} from 'lucide-react';
import { MultiSigWalletForm } from '@/components/wallet/multisig/MultiSigWalletForm';

// ============================================================================
// INTERFACES
// ============================================================================

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: 'form' | 'intro' | 'review';
}

interface MultiSigWalletFormWizardProps {
  projectId?: string;
  onSuccess?: (address: string, txHash: string) => void;
  onCancel?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MultiSigWalletFormWizard: React.FC<MultiSigWalletFormWizardProps> = ({
  projectId,
  onSuccess,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const formRef = useRef<{ submit: () => void }>(null);

  const steps: WizardStep[] = [
    {
      id: 0,
      title: 'Introduction',
      description: 'Learn about multi-signature wallets',
      icon: <Shield className="h-5 w-5" />,
      component: 'intro',
    },
    {
      id: 1,
      title: 'Configure Wallet',
      description: 'Set up your multi-sig wallet',
      icon: <Settings className="h-5 w-5" />,
      component: 'form',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSuccess = (address: string, txHash: string) => {
    setIsCreating(false);
    if (onSuccess) {
      onSuccess(address, txHash);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.component) {
      case 'intro':
        return (
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>What is a Multi-Signature Wallet?</AlertTitle>
              <AlertDescription>
                A multi-signature (multi-sig) wallet requires multiple approvals before executing transactions,
                providing enhanced security and shared control over funds.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Multiple Owners</h4>
                  <p className="text-sm text-muted-foreground">
                    Add multiple wallet addresses as owners who can propose and approve transactions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Signature Threshold</h4>
                  <p className="text-sm text-muted-foreground">
                    Define how many owner approvals are required to execute a transaction (e.g., 2 of 3).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">On-Chain Deployment</h4>
                  <p className="text-sm text-muted-foreground">
                    Your multi-sig wallet will be deployed as a smart contract with enforced security rules.
                  </p>
                </div>
              </div>
            </div>

            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Requirements</AlertTitle>
              <AlertDescription className="space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li>At least 2 owner addresses</li>
                  <li>A threshold between 1 and the total number of owners</li>
                  <li>A project wallet with funds to deploy the contract</li>
                  <li>Gas fees for deployment (~0.01-0.03 ETH)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'form':
        return (
          <div className="space-y-4">
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                Complete all fields below to configure and deploy your multi-signature wallet.
                The form will validate your inputs and estimate deployment costs.
              </AlertDescription>
            </Alert>
            
            {/* This is the WORKING MultiSigWalletForm from multisig/MultiSigWalletForm.tsx */}
            <MultiSigWalletForm
              projectId={projectId}
              onSuccess={handleFormSuccess}
              onCancel={onCancel}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Warning when no project is selected */}
      {!projectId && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project from the dropdown before creating a multi-sig wallet.
            All wallets must be associated with a project.
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Create Multi-Sig Wallet
          </CardTitle>
          <CardDescription>
            Step-by-step wizard to create a secure multi-signature wallet
            {projectId && (
              <span className="block mt-1">
                <Badge variant="outline" className="mt-2">Project Selected</Badge>
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    index < currentStep
                      ? 'bg-primary border-primary text-primary-foreground'
                      : index === currentStep
                      ? 'border-primary text-primary'
                      : 'border-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                
                {/* Step Label */}
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-full mx-4 ${
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div>
            <h3 className="text-lg font-medium mb-2">{steps[currentStep].title}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {steps[currentStep].description}
            </p>
            {renderStepContent()}
          </div>
        </CardContent>

        {/* Only show footer navigation for intro step, form handles its own submission */}
        {currentStep === 0 && (
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel} disabled={!onCancel}>
              Cancel
            </Button>

            <Button onClick={handleNext} disabled={!projectId}>
              {!projectId ? 'Select Project First' : 'Get Started'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
};

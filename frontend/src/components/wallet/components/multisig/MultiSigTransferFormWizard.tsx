/**
 * Multi-Sig Transfer Form Wizard
 * Step-by-step wizard for creating multi-sig transfer proposals
 */

import React, { useState } from 'react';
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
  Send,
  Users,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FileText,
  Wallet,
} from 'lucide-react';
import { MultiSigTransferForm } from './MultiSigTransferForm';

// ============================================================================
// INTERFACES
// ============================================================================

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: 'intro' | 'form';
}

interface MultiSigTransferFormWizardProps {
  wallets: Array<{
    id: string;
    name: string;
    address: string;
    blockchain: string;
    threshold: number;
  }>;
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MultiSigTransferFormWizard: React.FC<MultiSigTransferFormWizardProps> = ({
  wallets,
  onSuccess,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: WizardStep[] = [
    {
      id: 0,
      title: 'Introduction',
      description: 'Learn about transfer proposals',
      icon: <FileText className="h-5 w-5" />,
      component: 'intro',
    },
    {
      id: 1,
      title: 'Create Proposal',
      description: 'Configure your transfer',
      icon: <Send className="h-5 w-5" />,
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

  const handleSuccess = (proposalId: string) => {
    if (onSuccess) {
      onSuccess(proposalId);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.component) {
      case 'intro':
        return (
          <div className="space-y-6">
            <Alert>
              <Send className="h-4 w-4" />
              <AlertTitle>What is a Transfer Proposal?</AlertTitle>
              <AlertDescription>
                A transfer proposal is a request to send funds from a multi-sig wallet.
                It requires approval from the required number of signers before execution.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">1. Create Proposal</h4>
                  <p className="text-sm text-muted-foreground">
                    Specify the recipient address, amount, and token you want to transfer.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. Collect Signatures</h4>
                  <p className="text-sm text-muted-foreground">
                    Other wallet owners will review and approve your proposal.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Execute Transaction</h4>
                  <p className="text-sm text-muted-foreground">
                    Once threshold is met, any signer can execute the transaction on-chain.
                  </p>
                </div>
              </div>
            </div>

            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription className="space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Proposals are stored off-chain until execution</li>
                  <li>You can only propose transfers from wallets where you're an owner</li>
                  <li>Execution requires gas fees from the executing signer</li>
                  <li>All signers will be notified of new proposals</li>
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
                Fill in the transfer details below. The proposal will be created and awaiting approval from other signers.
              </AlertDescription>
            </Alert>

            <MultiSigTransferForm
              wallets={wallets}
              onSuccess={handleSuccess}
              onCancel={onCancel}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-6 w-6" />
          Create Transfer Proposal
        </CardTitle>
        <CardDescription>
          Step-by-step wizard to propose a multi-sig transfer
          {wallets.length > 0 && (
            <span className="block mt-1">
              <Badge variant="outline" className="mt-2">
                {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} available
              </Badge>
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
                <p
                  className={`text-sm font-medium ${
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
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

          <Button onClick={handleNext} disabled={wallets.length === 0}>
            {wallets.length === 0 ? 'No Wallets Available' : 'Continue'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

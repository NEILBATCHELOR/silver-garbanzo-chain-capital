/**
 * Pending Proposals Wizard
 * Step-by-step wizard for reviewing and approving multi-sig proposals
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
  Shield,
  UserCheck,
  Check,
  ChevronRight,
  AlertCircle,
  FileSignature,
  Send,
} from 'lucide-react';
import { PendingProposalsCard } from './PendingProposalsCard';

// ============================================================================
// INTERFACES
// ============================================================================

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: 'intro' | 'proposals';
}

interface PendingProposalsWizardProps {
  walletId: string;
  userAddressId: string;
  onProposalExecuted?: (proposalId: string, txHash: string) => void;
  refreshInterval?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PendingProposalsWizard: React.FC<PendingProposalsWizardProps> = ({
  walletId,
  userAddressId,
  onProposalExecuted,
  refreshInterval = 30000
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: WizardStep[] = [
    {
      id: 0,
      title: 'Introduction',
      description: 'Learn about proposal approval',
      icon: <FileSignature className="h-5 w-5" />,
      component: 'intro',
    },
    {
      id: 1,
      title: 'Review & Approve',
      description: 'Manage pending proposals',
      icon: <UserCheck className="h-5 w-5" />,
      component: 'proposals',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
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
              <AlertTitle>Managing Proposals</AlertTitle>
              <AlertDescription>
                Review and approve pending transfer proposals for your multi-sig wallet.
                Your signature is required to help reach the approval threshold.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileSignature className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">1. Review Proposal Details</h4>
                  <p className="text-sm text-muted-foreground">
                    Check the recipient address, amount, and token type before approving.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. Add Your Signature</h4>
                  <p className="text-sm text-muted-foreground">
                    Click "Approve" to add your cryptographic signature to the proposal.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Execute When Ready</h4>
                  <p className="text-sm text-muted-foreground">
                    Once threshold is reached, execute the transaction to submit it on-chain.
                  </p>
                </div>
              </div>
            </div>

            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Approval Process</AlertTitle>
              <AlertDescription className="space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Each approval requires signing with your wallet</li>
                  <li>You can only approve once per proposal</li>
                  <li>Proposals need the threshold number of signatures</li>
                  <li>Execution requires gas fees from the executor</li>
                  <li>Failed transactions will show error details</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Security Reminder</AlertTitle>
              <AlertDescription>
                Always verify the recipient address and amount before approving.
                Multi-sig transactions cannot be reversed once executed on-chain.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'proposals':
        return (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Below are all pending proposals for this wallet. Review carefully before approving.
              </AlertDescription>
            </Alert>

            <PendingProposalsCard
              walletId={walletId}
              userAddressId={userAddressId}
              onProposalExecuted={onProposalExecuted}
              refreshInterval={refreshInterval}
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
          <Shield className="h-6 w-6" />
          Pending Proposals
        </CardTitle>
        <CardDescription>
          Step-by-step wizard to review and approve multi-sig proposals
          <Badge variant="outline" className="ml-2">
            Auto-refreshing
          </Badge>
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

      {/* Only show footer navigation for intro step */}
      {currentStep === 0 && (
        <CardFooter className="flex justify-end">
          <Button onClick={handleNext}>
            View Proposals
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

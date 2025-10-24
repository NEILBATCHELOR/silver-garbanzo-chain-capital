/**
 * Signature Collection Wizard
 * Step-by-step wizard for monitoring all multi-sig proposals and signatures
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
  Users,
  Check,
  ChevronRight,
  AlertCircle,
  BarChart3,
  FileText,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { SignatureCollectionDashboard } from './SignatureCollectionDashboard';

// ============================================================================
// INTERFACES
// ============================================================================

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: 'intro' | 'dashboard';
}

interface SignatureCollectionWizardProps {
  // Add any props if needed in the future
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SignatureCollectionWizard: React.FC<SignatureCollectionWizardProps> = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: WizardStep[] = [
    {
      id: 0,
      title: 'Introduction',
      description: 'Learn about signature monitoring',
      icon: <FileText className="h-5 w-5" />,
      component: 'intro',
    },
    {
      id: 1,
      title: 'Overview Dashboard',
      description: 'Monitor all proposals',
      icon: <BarChart3 className="h-5 w-5" />,
      component: 'dashboard',
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
              <Users className="h-4 w-4" />
              <AlertTitle>Signature Collection Overview</AlertTitle>
              <AlertDescription>
                Monitor all multi-signature transaction proposals across your wallets.
                Track signature collection progress and execution status in real-time.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Transaction Proposals</h4>
                  <p className="text-sm text-muted-foreground">
                    View all pending, signed, and executed proposals across your multi-sig wallets.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Signature Progress</h4>
                  <p className="text-sm text-muted-foreground">
                    Track how many signatures have been collected versus what's required.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Activity Statistics</h4>
                  <p className="text-sm text-muted-foreground">
                    View metrics on proposal creation, approval rates, and execution times.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Multi-Wallet Overview</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage proposals across all your multi-signature wallets in one place.
                  </p>
                </div>
              </div>
            </div>

            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Dashboard Features</AlertTitle>
              <AlertDescription className="space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Filter proposals by status (pending, signed, executed)</li>
                  <li>Search for specific proposals by transaction hash or wallet</li>
                  <li>Sort proposals by date, signatures, or execution status</li>
                  <li>View detailed proposal information and signer addresses</li>
                  <li>Track proposals nearing expiration</li>
                  <li>Monitor proposals ready for execution</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Real-Time Updates</AlertTitle>
              <AlertDescription>
                The dashboard automatically refreshes to show the latest proposal status
                and signature collection progress. No manual refresh needed.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quick Stats Overview
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Proposals</p>
                  <p className="font-medium">View all proposal activity</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending Approvals</p>
                  <p className="font-medium">Track what needs attention</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ready to Execute</p>
                  <p className="font-medium">Fully signed proposals</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiring Soon</p>
                  <p className="font-medium">Time-sensitive items</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="space-y-4">
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                Below is your complete overview of all multi-sig transaction proposals.
                Use filters and search to find specific proposals.
              </AlertDescription>
            </Alert>

            <SignatureCollectionDashboard />
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
          <Users className="h-6 w-6" />
          Signature Collection Overview
        </CardTitle>
        <CardDescription>
          Step-by-step wizard to monitor multi-sig proposals and signatures
          <Badge variant="outline" className="ml-2">
            All Wallets
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
            View Dashboard
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

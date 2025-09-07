/**
 * DFNS Registration Wizard - Complete registration flow UI component
 * 
 * This component provides a guided registration experience including:
 * - Registration code validation
 * - Multi-factor credential setup
 * - Recovery credential configuration
 * - End-user wallet creation
 * - Social registration options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Stepper,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
  StepperContent
} from '@/components/ui/stepper';
import {
  User,
  Key,
  Fingerprint,
  Shield,
  Wallet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Mail,
  Globe
} from 'lucide-react';

import { DfnsRegistrationManager } from '@/infrastructure/dfns/registration-manager';
import { DfnsCredentialManager } from '@/infrastructure/dfns';
import { DFNS_SDK_CONFIG } from '@/infrastructure/dfns/config';
import { DfnsCredentialKind } from '@/types/dfns/core';
import type {
  RegistrationState,
  RegistrationChallenge,
  RegistrationConfig,
  RegistrationProgress,
  RegistrationStep,
  CredentialKind,
  WalletSpec,
  RegistrationResult,
  SocialProvider
} from '@/types/dfns/registration';

// ===== Types =====

export interface DfnsRegistrationWizardProps {
  onRegistrationComplete?: (result: RegistrationResult) => void;
  onRegistrationError?: (error: Error) => void;
  onRegistrationCancel?: () => void;
  orgId?: string;
  config?: Partial<RegistrationConfig>;
  enableSocialRegistration?: boolean;
  enableEndUserRegistration?: boolean;
  defaultWalletNetworks?: string[];
  showProgress?: boolean;
}

// ===== Main Component =====

export const DfnsRegistrationWizard: React.FC<DfnsRegistrationWizardProps> = ({
  onRegistrationComplete,
  onRegistrationError,
  onRegistrationCancel,
  orgId,
  config = {},
  enableSocialRegistration = true,
  enableEndUserRegistration = false,
  defaultWalletNetworks = ['Ethereum', 'Polygon'],
  showProgress = true
}) => {
  // ===== State Management =====
  const [registrationManager] = useState(() => new DfnsRegistrationManager());
  const [credentialManager] = useState(() => new DfnsCredentialManager(DFNS_SDK_CONFIG));
  
  const [registrationState, setRegistrationState] = useState<RegistrationState>({
    step: 'init',
    completedCredentials: [],
    pendingCredentials: [],
    walletSpecs: [],
    isEndUserRegistration: enableEndUserRegistration
  });
  
  const [progress, setProgress] = useState<RegistrationProgress>({
    currentStep: 'init',
    completedSteps: [],
    totalSteps: 5,
    percentComplete: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationConfig, setRegistrationConfig] = useState<RegistrationConfig>({
    allowedCredentialKinds: ['Fido2', 'Key'] as CredentialKind[],
    requiresRecoveryCredential: true,
    allowsSecondFactor: false,
    socialProviders: ['Google'] as SocialProvider[],
    defaultWalletNetworks: defaultWalletNetworks,
    autoCreateWallets: enableEndUserRegistration,
    assignDefaultPermissions: true,
    ...config
  });

  // ===== Effects =====
  useEffect(() => {
    loadRegistrationConfig();
  }, [orgId]);

  useEffect(() => {
    updateProgress();
  }, [registrationState.step]);

  // ===== Registration Flow Management =====

  const loadRegistrationConfig = async () => {
    try {
      const config = await registrationManager.getRegistrationConfig(orgId);
      setRegistrationConfig(prev => ({ 
        ...prev, 
        ...config,
        // Ensure allowedCredentialKinds is properly typed
        allowedCredentialKinds: (config.allowedCredentialKinds || []) as CredentialKind[],
        // Ensure socialProviders is properly typed
        socialProviders: (config.socialProviders || []) as SocialProvider[]
      }));
    } catch (error) {
      console.warn('Failed to load registration config, using defaults:', error);
    }
  };

  const updateProgress = () => {
    const stepOrder: RegistrationStep[] = ['init', 'first_factor', 'second_factor', 'recovery', 'wallet_config', 'complete'];
    const currentIndex = stepOrder.indexOf(registrationState.step);
    
    setProgress({
      currentStep: registrationState.step,
      completedSteps: stepOrder.slice(0, currentIndex),
      totalSteps: stepOrder.length,
      percentComplete: Math.round((currentIndex / stepOrder.length) * 100)
    });
  };

  const handleError = (error: Error, context: string) => {
    console.error(`Registration error (${context}):`, error);
    setError(error.message);
    onRegistrationError?.(error);
  };

  const clearError = () => setError(null);

  const goToNextStep = () => {
    const stepOrder = ['init', 'first_factor', 'second_factor', 'recovery', 'wallet_config', 'complete'];
    const currentIndex = stepOrder.indexOf(registrationState.step);
    if (currentIndex < stepOrder.length - 1) {
      setRegistrationState(prev => ({
        ...prev,
        step: stepOrder[currentIndex + 1] as any
      }));
    }
  };

  const goToPreviousStep = () => {
    const stepOrder = ['init', 'first_factor', 'second_factor', 'recovery', 'wallet_config', 'complete'];
    const currentIndex = stepOrder.indexOf(registrationState.step);
    if (currentIndex > 0) {
      setRegistrationState(prev => ({
        ...prev,
        step: stepOrder[currentIndex - 1] as any
      }));
    }
  };

  // ===== Registration Actions =====

  const initiateRegistration = async (username: string, registrationCode: string) => {
    setLoading(true);
    clearError();
    
    try {
      const challenge = await registrationManager.initiateRegistration({
        username,
        registrationCode,
        orgId
      });
      
      setRegistrationState(prev => ({
        ...prev,
        challenge,
        step: 'first_factor'
      }));
    } catch (error) {
      handleError(error as Error, 'initiate_registration');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!registrationState.challenge) return;
    
    setLoading(true);
    clearError();
    
    try {
      const firstFactor = registrationState.completedCredentials.find(c => c.type === 'first_factor')!;
      const secondFactor = registrationState.completedCredentials.find(c => c.type === 'second_factor');
      const recoveryCredential = registrationState.completedCredentials.find(c => c.type === 'recovery');

      const request = {
        challengeIdentifier: registrationState.challenge.challengeIdentifier,
        firstFactor: {
          credentialKind: firstFactor.kind,
          credentialName: firstFactor.name,
          credentialInfo: firstFactor.credentialInfo
        },
        secondFactor: secondFactor ? {
          credentialKind: secondFactor.kind,
          credentialName: secondFactor.name,
          credentialInfo: secondFactor.credentialInfo
        } : undefined,
        recoveryCredential: recoveryCredential ? {
          credentialKind: recoveryCredential.kind,
          credentialName: recoveryCredential.name,
          credentialInfo: recoveryCredential.credentialInfo
        } : undefined
      };

      let result: RegistrationResult;
      
      if (registrationState.isEndUserRegistration) {
        result = await registrationManager.completeEndUserRegistration({
          ...request,
          wallets: registrationState.walletSpecs
        });
      } else {
        result = await registrationManager.completeRegistration(request);
      }
      
      setRegistrationState(prev => ({ ...prev, step: 'complete' }));
      onRegistrationComplete?.(result);
    } catch (error) {
      handleError(error as Error, 'complete_registration');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegistration = async (provider: SocialProvider, idToken: string) => {
    setLoading(true);
    clearError();
    
    try {
      const result = await registrationManager.initiateSocialRegistration({
        idToken,
        providerKind: provider,
        orgId
      });
      
      setRegistrationState(prev => ({ ...prev, step: 'complete' }));
      onRegistrationComplete?.(result);
    } catch (error) {
      handleError(error as Error, 'social_registration');
    } finally {
      setLoading(false);
    }
  };

  // ===== Render Components =====

  const renderProgressBar = () => {
    if (!showProgress) return null;
    
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Registration Progress</span>
          <span className="text-sm text-gray-600">{progress.percentComplete}%</span>
        </div>
        <Progress value={progress.percentComplete} className="w-full" />
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Registration Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  };

  const renderNavigationButtons = () => {
    const canGoBack = registrationState.step !== 'init' && registrationState.step !== 'complete';
    const canGoNext = registrationState.step !== 'complete';
    
    return (
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={canGoBack ? goToPreviousStep : onRegistrationCancel}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {canGoBack ? 'Previous' : 'Cancel'}
        </Button>
        
        {canGoNext && (
          <Button
            onClick={registrationState.step === 'wallet_config' ? completeRegistration : goToNextStep}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {registrationState.step === 'wallet_config' ? 'Complete Registration' : 'Next'}
          </Button>
        )}
      </div>
    );
  };

  // ===== Step Components =====

  const renderInitStep = () => (
    <RegistrationInitStep
      onInitiate={initiateRegistration}
      onSocialRegistration={enableSocialRegistration ? handleSocialRegistration : undefined}
      socialProviders={registrationConfig.socialProviders}
      loading={loading}
    />
  );

  const renderCredentialStep = (type: 'first_factor' | 'second_factor' | 'recovery') => (
    <CredentialRegistrationStep
      type={type}
      challenge={registrationState.challenge!}
      allowedKinds={registrationConfig.allowedCredentialKinds}
      onCredentialComplete={(credential) => {
        setRegistrationState(prev => ({
          ...prev,
          completedCredentials: [...prev.completedCredentials, credential]
        }));
        goToNextStep();
      }}
      loading={loading}
    />
  );

  const renderWalletConfigStep = () => (
    <WalletConfigStep
      defaultNetworks={registrationConfig.defaultWalletNetworks}
      onWalletsConfigured={(wallets) => {
        setRegistrationState(prev => ({
          ...prev,
          walletSpecs: wallets
        }));
      }}
      loading={loading}
    />
  );

  const renderCompleteStep = () => (
    <RegistrationCompleteStep
      onClose={() => onRegistrationComplete?.(undefined as any)}
    />
  );

  // ===== Main Render =====

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {renderProgressBar()}
      {renderError()}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            DFNS Account Registration
          </CardTitle>
          <CardDescription>
            Create your secure DFNS account with multi-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registrationState.step === 'init' && renderInitStep()}
          {registrationState.step === 'first_factor' && renderCredentialStep('first_factor')}
          {registrationState.step === 'second_factor' && renderCredentialStep('second_factor')}
          {registrationState.step === 'recovery' && renderCredentialStep('recovery')}
          {registrationState.step === 'wallet_config' && renderWalletConfigStep()}
          {registrationState.step === 'complete' && renderCompleteStep()}
          
          {renderNavigationButtons()}
        </CardContent>
      </Card>
    </div>
  );
};

// ===== Step Components (Placeholder - implement separately) =====

const RegistrationInitStep: React.FC<any> = () => <div>Registration Init Component</div>;
const CredentialRegistrationStep: React.FC<any> = () => <div>Credential Registration Component</div>;
const WalletConfigStep: React.FC<any> = () => <div>Wallet Config Component</div>;
const RegistrationCompleteStep: React.FC<any> = () => <div>Registration Complete Component</div>;

export default DfnsRegistrationWizard;

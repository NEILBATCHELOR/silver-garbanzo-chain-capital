/**
 * DFNS Registration Wizard Component
 * 
 * Multi-step registration process for DFNS users with WebAuthn and wallet creation
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  UserPlus, 
  Mail, 
  Key, 
  Fingerprint, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Shield,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { authService } from '@/services/dfns/authService';
import type { 
  DfnsDelegatedRegistrationResponse,
  DfnsEndUserRegistrationRequest,
  DfnsEndUserRegistrationResponse,
  DfnsSocialRegistrationRequest,
  DfnsSocialRegistrationResponse,
  DfnsAuthTokenResponse,
  DfnsWalletCreationSpec
} from '@/types/dfns/auth';

interface DfnsRegistrationWizardProps {
  onRegistrationSuccess?: (response: DfnsAuthTokenResponse) => void;
  onRegistrationError?: (error: string) => void;
  className?: string;
  registrationType?: 'delegated' | 'standard' | 'endUser' | 'social';
}

interface RegistrationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface RegistrationState {
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  registrationChallenge: DfnsDelegatedRegistrationResponse | null;
}

interface RegistrationData {
  email: string;
  username: string;
  registrationCode: string;
  kind: 'EndUser' | 'Employee';
  wallets: DfnsWalletCreationSpec[];
  socialIdToken: string;
  orgId: string;
  createWallets: boolean;
}

const NETWORKS = [
  { value: 'Ethereum', label: 'Ethereum' },
  { value: 'Bitcoin', label: 'Bitcoin' },
  { value: 'Polygon', label: 'Polygon' },
  { value: 'Arbitrum', label: 'Arbitrum One' },
  { value: 'Optimism', label: 'Optimism' },
  { value: 'Base', label: 'Base' },
  { value: 'Solana', label: 'Solana' },
  { value: 'Avalanche', label: 'Avalanche' },
];

export function DfnsRegistrationWizard({ 
  onRegistrationSuccess, 
  onRegistrationError, 
  className,
  registrationType = 'delegated'
}: DfnsRegistrationWizardProps) {
  // Registration data
  const [data, setData] = useState<RegistrationData>({
    email: '',
    username: '',
    registrationCode: '',
    kind: 'EndUser',
    wallets: [],
    socialIdToken: '',
    orgId: '',
    createWallets: false
  });

  // Component state
  const [state, setState] = useState<RegistrationState>({
    currentStep: 0,
    isLoading: false,
    error: null,
    success: null,
    registrationChallenge: null
  });

  // Registration steps based on type
  const getSteps = (): RegistrationStep[] => {
    const baseSteps = [
      {
        id: 'account',
        title: 'Account Details',
        description: 'Enter your account information',
        completed: false
      },
      {
        id: 'credentials',
        title: 'Security Setup',
        description: 'Set up WebAuthn credentials',
        completed: false
      }
    ];

    if (registrationType === 'endUser') {
      baseSteps.push({
        id: 'wallets',
        title: 'Wallet Setup',
        description: 'Configure your initial wallets',
        completed: false
      });
    }

    baseSteps.push({
      id: 'complete',
      title: 'Complete',
      description: 'Finish registration process',
      completed: false
    });

    return baseSteps;
  };

  const [steps, setSteps] = useState<RegistrationStep[]>(getSteps());

  /**
   * Update registration data
   */
  const updateData = (updates: Partial<RegistrationData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  /**
   * Mark step as completed and advance
   */
  const completeStep = (stepIndex: number) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, completed: true } : step
    ));
    
    if (stepIndex < steps.length - 1) {
      setState(prev => ({ ...prev, currentStep: stepIndex + 1 }));
    }
  };

  /**
   * Go to previous step
   */
  const goToPreviousStep = () => {
    if (state.currentStep > 0) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1, error: null }));
    }
  };

  /**
   * Handle delegated registration
   */
  const handleDelegatedRegistration = async () => {
    if (!data.email.trim()) {
      setState(prev => ({ ...prev, error: 'Email is required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('👤 Starting delegated registration for:', data.email);

      const result = await authService.registerUser(data.email, data.kind);
      
      setState(prev => ({ 
        ...prev, 
        registrationChallenge: result.registrationChallenge,
        success: 'Registration challenge created! Please complete WebAuthn setup.',
        isLoading: false
      }));

      completeStep(0); // Complete account details step

    } catch (error) {
      console.error('❌ Delegated registration failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false 
      }));
    }
  };

  /**
   * Handle standard registration with code
   */
  const handleStandardRegistration = async () => {
    if (!data.username.trim() || !data.registrationCode.trim() || !data.orgId.trim()) {
      setState(prev => ({ ...prev, error: 'Username, registration code, and organization ID are required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('📧 Starting standard registration for:', data.username);

      const result = await authService.registerUserWithCode(
        data.username,
        data.registrationCode,
        data.orgId
      );

      setState(prev => ({ 
        ...prev, 
        registrationChallenge: result,
        success: 'Registration initiated! Please complete WebAuthn setup.',
        isLoading: false
      }));

      completeStep(0); // Complete account details step

    } catch (error) {
      console.error('❌ Standard registration failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false 
      }));
    }
  };

  /**
   * Handle social registration
   */
  const handleSocialRegistration = async () => {
    if (!data.socialIdToken.trim()) {
      setState(prev => ({ ...prev, error: 'Social ID token is required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔗 Starting social registration');

      const result = await authService.registerUserWithSocial(
        data.socialIdToken,
        'Oidc',
        data.orgId || undefined
      );

      setState(prev => ({ 
        ...prev, 
        registrationChallenge: result,
        success: 'Social registration initiated! Please complete WebAuthn setup.',
        isLoading: false
      }));

      completeStep(0); // Complete account details step

    } catch (error) {
      console.error('❌ Social registration failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Social registration failed',
        isLoading: false 
      }));
    }
  };

  /**
   * Handle end user registration with wallets
   */
  const handleEndUserRegistration = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔐 Starting end user registration with wallets');

      // This would require implementing the full WebAuthn credential creation flow
      // For now, we'll show a placeholder
      setState(prev => ({ 
        ...prev, 
        success: 'End user registration requires WebAuthn credential creation. This feature will be implemented with the credential flow.',
        isLoading: false
      }));

      completeStep(steps.length - 1); // Complete all steps

    } catch (error) {
      console.error('❌ End user registration failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'End user registration failed',
        isLoading: false 
      }));
    }
  };

  /**
   * Handle resending registration code
   */
  const handleResendCode = async () => {
    if (!data.username.trim() || !data.orgId.trim()) {
      setState(prev => ({ ...prev, error: 'Username and organization ID are required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await authService.resendRegistrationCode(data.username, data.orgId);

      setState(prev => ({ 
        ...prev, 
        success: 'Registration code resent to your email!',
        isLoading: false 
      }));

    } catch (error) {
      console.error('❌ Failed to resend registration code:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to resend code',
        isLoading: false 
      }));
    }
  };

  /**
   * Add wallet to creation list
   */
  const addWallet = (network: string) => {
    const walletName = `${network} Wallet`;
    const newWallet: DfnsWalletCreationSpec = {
      network,
      name: walletName
    };

    setData(prev => ({
      ...prev,
      wallets: [...prev.wallets, newWallet]
    }));
  };

  /**
   * Remove wallet from creation list
   */
  const removeWallet = (index: number) => {
    setData(prev => ({
      ...prev,
      wallets: prev.wallets.filter((_, i) => i !== index)
    }));
  };

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    const currentStepData = steps[state.currentStep];

    switch (currentStepData?.id) {
      case 'account':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Account Information</h3>
              <p className="text-sm text-muted-foreground">
                {registrationType === 'delegated' && 'Enter your email address for delegated registration'}
                {registrationType === 'standard' && 'Enter your credentials and registration code'}
                {registrationType === 'social' && 'Provide your social authentication token'}
                {registrationType === 'endUser' && 'Create your end user account'}
              </p>
            </div>

            {/* Delegated Registration Fields */}
            {registrationType === 'delegated' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => updateData({ email: e.target.value })}
                    placeholder="Enter your email address"
                    disabled={state.isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userKind">User Type</Label>
                  <Select 
                    value={data.kind} 
                    onValueChange={(value: 'EndUser' | 'Employee') => updateData({ kind: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EndUser">End User</SelectItem>
                      <SelectItem value="Employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleDelegatedRegistration}
                  disabled={state.isLoading || !data.email.trim()}
                  className="w-full"
                >
                  {state.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Registration...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Start Registration
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Standard Registration Fields */}
            {registrationType === 'standard' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={data.username}
                    onChange={(e) => updateData({ username: e.target.value })}
                    placeholder="Enter your username"
                    disabled={state.isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationCode">Registration Code</Label>
                  <Input
                    id="registrationCode"
                    type="text"
                    value={data.registrationCode}
                    onChange={(e) => updateData({ registrationCode: e.target.value })}
                    placeholder="Enter registration code from email"
                    disabled={state.isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgId">Organization ID</Label>
                  <Input
                    id="orgId"
                    type="text"
                    value={data.orgId}
                    onChange={(e) => updateData({ orgId: e.target.value })}
                    placeholder="Enter organization ID"
                    disabled={state.isLoading}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleStandardRegistration}
                    disabled={state.isLoading || !data.username.trim() || !data.registrationCode.trim() || !data.orgId.trim()}
                    className="flex-1"
                  >
                    {state.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleResendCode}
                    disabled={state.isLoading || !data.username.trim() || !data.orgId.trim()}
                    variant="outline"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Code
                  </Button>
                </div>
              </>
            )}

            {/* Social Registration Fields */}
            {registrationType === 'social' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="socialIdToken">Social ID Token</Label>
                  <Input
                    id="socialIdToken"
                    type="text"
                    value={data.socialIdToken}
                    onChange={(e) => updateData({ socialIdToken: e.target.value })}
                    placeholder="Paste your OAuth ID token"
                    disabled={state.isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialOrgId">Organization ID (Optional)</Label>
                  <Input
                    id="socialOrgId"
                    type="text"
                    value={data.orgId}
                    onChange={(e) => updateData({ orgId: e.target.value })}
                    placeholder="Enter organization ID (optional)"
                    disabled={state.isLoading}
                  />
                </div>

                <Button
                  onClick={handleSocialRegistration}
                  disabled={state.isLoading || !data.socialIdToken.trim()}
                  className="w-full"
                >
                  {state.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Register with Social Auth
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );

      case 'credentials':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Security Credentials</h3>
              <p className="text-sm text-muted-foreground">
                Complete WebAuthn credential setup for secure authentication
              </p>
            </div>

            {state.registrationChallenge && (
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Registration Challenge Ready</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Your registration challenge has been created. Complete the WebAuthn credential setup to finish registration.
                </AlertDescription>
              </Alert>
            )}

            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm">
                This step would integrate with the WebAuthn Setup component to complete credential creation.
                The registration challenge contains all necessary data for WebAuthn credential creation.
              </p>
            </div>

            <Button
              onClick={() => completeStep(state.currentStep)}
              disabled={!state.registrationChallenge}
              className="w-full"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Complete Credential Setup
            </Button>
          </div>
        );

      case 'wallets':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Wallet Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Select the blockchain networks for your initial wallets
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="createWallets"
                checked={data.createWallets}
                onCheckedChange={(checked) => updateData({ createWallets: !!checked })}
              />
              <Label htmlFor="createWallets">Create initial wallets during registration</Label>
            </div>

            {data.createWallets && (
              <>
                <Separator />

                <div className="space-y-3">
                  <Label>Select Networks for Wallet Creation</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {NETWORKS.map((network) => (
                      <Button
                        key={network.value}
                        variant="outline"
                        size="sm"
                        onClick={() => addWallet(network.value)}
                        disabled={data.wallets.some(w => w.network === network.value)}
                      >
                        <Wallet className="mr-2 h-3 w-3" />
                        {network.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {data.wallets.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Wallets</Label>
                    <div className="space-y-1">
                      {data.wallets.map((wallet, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{wallet.name} ({wallet.network})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWallet(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <Button
              onClick={() => completeStep(state.currentStep)}
              className="w-full"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue to Complete Registration
            </Button>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Registration Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Your DFNS account has been successfully created
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-green-50">
              <div className="text-sm space-y-2">
                <p><strong>Registration Type:</strong> {registrationType}</p>
                {data.email && <p><strong>Email:</strong> {data.email}</p>}
                {data.username && <p><strong>Username:</strong> {data.username}</p>}
                {data.wallets.length > 0 && (
                  <p><strong>Wallets:</strong> {data.wallets.length} wallet(s) created</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleEndUserRegistration}
              disabled={state.isLoading}
              className="w-full"
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Registration
                </>
              )}
            </Button>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5" />
          <span>DFNS Registration</span>
        </CardTitle>
        <CardDescription>
          Create your DFNS account with {registrationType} registration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.completed
                      ? 'bg-green-600 text-white'
                      : index === state.currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.completed ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step.completed ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Step {state.currentStep + 1} of {steps.length}: {steps[state.currentStep]?.title}
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        {state.currentStep > 0 && steps[state.currentStep]?.id !== 'complete' && (
          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={goToPreviousStep}
              variant="outline"
              disabled={state.isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous Step
            </Button>
          </div>
        )}

        {/* Status Messages */}
        {state.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state.success && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">{state.success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default DfnsRegistrationWizard;
/**
 * DFNS Complete User Recovery Component
 * 
 * This component provides a complete user recovery interface implementing all DFNS User Recovery APIs:
 * - Send Recovery Code Email
 * - Create Recovery Challenge  
 * - Complete User Recovery
 * - Recovery Credential Management
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Mail, 
  Key, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

import { DfnsUserRecoveryManager } from '@/infrastructure/dfns/user-recovery-manager';
import type { 
  RecoveryCredential,
  RecoveredUser,
  RecoveryChallenge 
} from '@/infrastructure/dfns/user-recovery-manager';
import { DEFAULT_CLIENT_CONFIG } from '@/infrastructure/dfns/config';
import type { DfnsClientConfig } from '@/types/dfns';

// ===== Component Types =====

export interface DfnsUserRecoveryProps {
  onRecoveryComplete?: (user: RecoveredUser) => void;
  onError?: (error: string) => void;
  className?: string;
  orgId: string;
}

interface RecoveryState {
  step: 'initiate' | 'verify' | 'credential' | 'complete';
  username: string;
  verificationCode: string;
  credentialId: string;
  progress: number;
  challenge?: RecoveryChallenge;
}

interface RecoveryMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

// ===== Main Component =====

const DfnsUserRecovery: React.FC<DfnsUserRecoveryProps> = ({
  onRecoveryComplete,
  onError,
  className,
  orgId
}) => {
  // ===== State Management =====
  const [recoveryManager, setRecoveryManager] = useState<DfnsUserRecoveryManager | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('email');
  const [showCredentialSetup, setShowCredentialSetup] = useState(false);
  const [recoveryCredentials, setRecoveryCredentials] = useState<RecoveryCredential[]>([]);

  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    step: 'initiate',
    username: '',
    verificationCode: '',
    credentialId: '',
    progress: 0
  });

  // ===== Recovery Methods Configuration =====
  const recoveryMethods: RecoveryMethod[] = [
    {
      id: 'email',
      name: 'Email Recovery',
      description: 'Receive recovery code via email',
      icon: <Mail className="h-5 w-5" />,
      available: true
    },
    {
      id: 'recovery_key',
      name: 'Recovery Key',
      description: 'Use existing recovery credential',
      icon: <Key className="h-5 w-5" />,
      available: true
    }
  ];

  // ===== Initialization =====
  useEffect(() => {
    const initializeRecoveryManager = async () => {
      try {
        const config: DfnsClientConfig = {
          ...DEFAULT_CLIENT_CONFIG,
          // Override with orgId for this specific use case
        };
        const manager = new DfnsUserRecoveryManager(config);
        setRecoveryManager(manager);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize recovery manager';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    initializeRecoveryManager();
  }, [onError]);

  // ===== Recovery Flow Handlers =====

  /**
   * Handle email recovery initiation
   */
  const handleEmailRecovery = async () => {
    if (!recoveryManager || !recoveryState.username) {
      setError('Username is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setRecoveryState(prev => ({ ...prev, progress: 25 }));
      
      await recoveryManager.sendRecoveryCode(recoveryState.username, orgId);
      
      setRecoveryState(prev => ({ 
        ...prev, 
        step: 'verify',
        progress: 50
      }));
      
      setSuccess('Recovery code sent to your email');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send recovery code';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle verification code processing
   */
  const handleVerificationCode = async () => {
    if (!recoveryManager || !recoveryState.verificationCode) {
      setError('Verification code is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setRecoveryState(prev => ({ ...prev, progress: 75 }));
      
      const challenge = await recoveryManager.createRecoveryChallenge(
        recoveryState.username,
        recoveryState.verificationCode,
        orgId,
        recoveryState.credentialId
      );
      
      setRecoveryState(prev => ({ 
        ...prev, 
        step: 'credential',
        challenge,
        progress: 85
      }));
      
      setSuccess('Verification successful. Please create your new credential.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle WebAuthn credential creation and recovery completion
   */
  const handleCompleteRecovery = async () => {
    if (!recoveryManager || !recoveryState.challenge) {
      setError('No active recovery challenge');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setRecoveryState(prev => ({ ...prev, progress: 95 }));
      
      const recoveredUser = await recoveryManager.completeRecoveryWithWebAuthn(
        recoveryState.username,
        recoveryState.verificationCode,
        orgId,
        recoveryState.credentialId,
        'Recovery Credential'
      );
      
      setRecoveryState(prev => ({ 
        ...prev, 
        step: 'complete',
        progress: 100
      }));
      
      setSuccess('Account recovery completed successfully!');
      onRecoveryComplete?.(recoveredUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recovery completion failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle recovery credential setup
   */
  const handleSetupRecoveryCredential = async (name: string) => {
    if (!recoveryManager) {
      setError('Recovery manager not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const credential = await recoveryManager.createRecoveryCredential(name);
      setRecoveryCredentials(prev => [...prev, credential]);
      setSuccess('Recovery credential created successfully!');
      setShowCredentialSetup(false);
      
      // Show recovery code to user
      if (credential.recoveryCode) {
        toast.success('Save your recovery code safely: ' + credential.recoveryCode);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create recovery credential';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset recovery flow
   */
  const handleResetRecovery = () => {
    setRecoveryState({
      step: 'initiate',
      username: '',
      verificationCode: '',
      credentialId: '',
      progress: 0
    });
    setError(null);
    setSuccess(null);
  };

  // ===== Render Methods =====

  const renderRecoveryMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Choose Recovery Method</h3>
        <p className="text-muted-foreground">Select how you'd like to recover your account</p>
      </div>
      
      <div className="grid gap-3">
        {recoveryMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => setSelectedMethod(method.id)}
            disabled={!method.available}
            className={`p-4 border rounded-lg text-left transition-colors ${
              selectedMethod === method.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              {method.icon}
              <div className="flex-1">
                <div className="font-medium">{method.name}</div>
                <div className="text-sm text-muted-foreground">{method.description}</div>
              </div>
              {selectedMethod === method.id && (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderInitiateStep = () => (
    <div className="space-y-4">
      {renderRecoveryMethodSelection()}
      
      <Separator />
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="username">Username / Email</Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username or email"
            value={recoveryState.username}
            onChange={(e) => setRecoveryState(prev => ({ ...prev, username: e.target.value }))}
            disabled={isLoading}
          />
        </div>
        
        {selectedMethod === 'recovery_key' && (
          <div>
            <Label htmlFor="credentialId">Recovery Credential ID</Label>
            <Input
              id="credentialId"
              type="text"
              placeholder="Enter your recovery credential ID"
              value={recoveryState.credentialId}
              onChange={(e) => setRecoveryState(prev => ({ ...prev, credentialId: e.target.value }))}
              disabled={isLoading}
            />
          </div>
        )}
        
        <Button 
          onClick={selectedMethod === 'email' ? handleEmailRecovery : handleVerificationCode}
          disabled={isLoading || !recoveryState.username}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {selectedMethod === 'email' ? <Mail className="mr-2 h-4 w-4" /> : <Key className="mr-2 h-4 w-4" />}
              {selectedMethod === 'email' ? 'Send Recovery Code' : 'Start Recovery'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Check Your Email</h3>
        <p className="text-muted-foreground">
          We've sent a verification code to your email address
        </p>
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="verificationCode">Verification Code</Label>
          <Input
            id="verificationCode"
            type="text"
            placeholder="Enter the 6-digit code"
            value={recoveryState.verificationCode}
            onChange={(e) => setRecoveryState(prev => ({ ...prev, verificationCode: e.target.value }))}
            disabled={isLoading}
            maxLength={6}
          />
        </div>
        
        <div>
          <Label htmlFor="credentialId">Recovery Credential ID</Label>
          <Input
            id="credentialId"
            type="text"
            placeholder="Enter your recovery credential ID"
            value={recoveryState.credentialId}
            onChange={(e) => setRecoveryState(prev => ({ ...prev, credentialId: e.target.value }))}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground mt-1">
            This is the ID of the credential you want to use for recovery
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleResetRecovery}
            disabled={isLoading}
            className="flex-1"
          >
            Back
          </Button>
          <Button 
            onClick={handleVerificationCode}
            disabled={isLoading || !recoveryState.verificationCode || !recoveryState.credentialId}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify Code
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCredentialStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Create New Credential</h3>
        <p className="text-muted-foreground">
          You'll need to create a new biometric credential to complete recovery
        </p>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This will create a new WebAuthn credential using your device's biometric authentication 
          (fingerprint, face recognition, etc.)
        </AlertDescription>
      </Alert>
      
      <div className="flex gap-2">
        <Button 
          variant="outline"
          onClick={handleResetRecovery}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCompleteRecovery}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Complete Recovery
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Recovery Complete!</h3>
        <p className="text-muted-foreground">
          Your account has been successfully recovered with a new credential
        </p>
      </div>
      
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Consider setting up new recovery credentials to ensure 
          you can recover your account again if needed.
        </AlertDescription>
      </Alert>
      
      <Button 
        onClick={() => setShowCredentialSetup(true)}
        variant="outline"
        className="w-full"
      >
        <Key className="mr-2 h-4 w-4" />
        Set Up New Recovery Credential
      </Button>
    </div>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Recovery
          </CardTitle>
          <CardDescription>
            Recover access to your DFNS account using verified methods
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          {recoveryState.progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Recovery Progress</span>
                <span>{recoveryState.progress}%</span>
              </div>
              <Progress value={recoveryState.progress} />
            </div>
          )}
          
          {/* Alerts */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          {/* Recovery Steps */}
          {recoveryState.step === 'initiate' && renderInitiateStep()}
          {recoveryState.step === 'verify' && renderVerifyStep()}
          {recoveryState.step === 'credential' && renderCredentialStep()}
          {recoveryState.step === 'complete' && renderCompleteStep()}
        </CardContent>
      </Card>
      
      {/* Recovery Credential Setup Dialog */}
      <Dialog open={showCredentialSetup} onOpenChange={setShowCredentialSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Up Recovery Credential</DialogTitle>
            <DialogDescription>
              Create a new recovery credential to ensure you can recover your account in the future
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="credentialName">Credential Name</Label>
              <Input
                id="credentialName"
                placeholder="e.g., My Recovery Key"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowCredentialSetup(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const input = document.getElementById('credentialName') as HTMLInputElement;
                  if (input?.value) {
                    handleSetupRecoveryCredential(input.value);
                  }
                }}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Create Credential
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DfnsUserRecovery;

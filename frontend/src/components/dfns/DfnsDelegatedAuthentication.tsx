/**
 * DFNS Delegated Authentication Component - WebAuthn credential management
 * 
 * This component provides a user interface for managing delegated signing credentials
 * including WebAuthn registration, passkey setup, and session management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Fingerprint, 
  Shield, 
  Key, 
  Smartphone, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Settings,
  Info
} from 'lucide-react';

import { 
  DfnsDelegatedSigningManager,
  DelegatedCredential,
  DelegatedSession,
  DelegatedCredentialType,
  DelegatedCredentialStatus,
  RecoveryType,
  RecoveryProcess,
  AuthenticatorDeviceType,
  AuthenticatorTransport,
  UserVerificationRequirement
} from '@/infrastructure/dfns/delegated-signing-manager';
import { DfnsCredentialInfo } from '@/infrastructure/dfns/credential-manager';
import { DfnsCredentialKind } from '@/infrastructure/dfns/auth';
import { useDfns } from '@/hooks/useDfns';

// ===== Component Types =====

export interface DfnsDelegatedAuthProps {
  onCredentialRegistered?: (credential: DelegatedCredential) => void;
  onSessionCreated?: (session: DelegatedSession) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface CredentialRegistrationForm {
  username: string;
  displayName: string;
  credentialName: string;
  credentialType: DelegatedCredentialType;
}

interface RecoveryInitiationForm {
  username: string;
  recoveryType: RecoveryType;
  verificationData?: string;
}

interface CrossDeviceForm {
  deviceName: string;
  credentialType: DfnsCredentialKind;
  password: string;
}

// ===== Main Component =====

export function DfnsDelegatedAuthentication({
  onCredentialRegistered,
  onSessionCreated,
  onError,
  className
}: DfnsDelegatedAuthProps) {
  // State management
  const [credentials, setCredentials] = useState<DelegatedCredential[]>([]);
  const [activeSessions, setActiveSessions] = useState<DelegatedSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrationForm, setRegistrationForm] = useState<CredentialRegistrationForm>({
    username: '',
    displayName: '',
    credentialName: '',
    credentialType: DelegatedCredentialType.WebAuthn
  });
  const [recoveryForm, setRecoveryForm] = useState<RecoveryInitiationForm>({
    username: '',
    recoveryType: RecoveryType.KYC,
    verificationData: ''
  });
  const [selectedCredential, setSelectedCredential] = useState<DelegatedCredential | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState(0);

  // Cross-device credential management
  const [oneTimeCode, setOneTimeCode] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [crossDeviceForm, setCrossDeviceForm] = useState<CrossDeviceForm>({
    deviceName: '',
    credentialType: DfnsCredentialKind.Fido2,
    password: ''
  });

  // Hooks
  const { client } = useDfns();
  const [delegatedManager, setDelegatedManager] = useState<DfnsDelegatedSigningManager | null>(null);

  // Initialize delegated signing manager
  useEffect(() => {
    if (client) {
      const manager = new DfnsDelegatedSigningManager(client.getConfig());
      setDelegatedManager(manager);
    }
  }, [client]);

  // Load user credentials and sessions
  const loadUserData = useCallback(async () => {
    if (!delegatedManager) return;

    setIsLoading(true);
    try {
      // In a real implementation, these would fetch from DFNS API
      // For now, we'll simulate with empty arrays
      setCredentials([]);
      setActiveSessions([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [delegatedManager, onError]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ===== Event Handlers =====

  const handleCredentialRegistration = async (type: DelegatedCredentialType) => {
    if (!delegatedManager) {
      setError('Delegated signing manager not initialized');
      return;
    }

    setIsLoading(true);
    setRegistrationProgress(0);
    setError(null);

    try {
      setRegistrationProgress(25);

      let credential: DelegatedCredential;
      
      if (type === DelegatedCredentialType.WebAuthn) {
        setRegistrationProgress(50);
        credential = await delegatedManager.registerWebAuthnCredential(
          registrationForm.username,
          registrationForm.displayName,
          registrationForm.credentialName
        );
      } else if (type === DelegatedCredentialType.Passkey) {
        setRegistrationProgress(50);
        credential = await delegatedManager.registerPasskey(
          registrationForm.username,
          registrationForm.displayName
        );
      } else {
        throw new Error(`Unsupported credential type: ${type}`);
      }

      setRegistrationProgress(100);
      setCredentials(prev => [...prev, credential]);
      setSuccess(`${type} credential registered successfully!`);
      setShowRegistration(false);
      setRegistrationForm({
        username: '',
        displayName: '',
        credentialName: '',
        credentialType: DelegatedCredentialType.WebAuthn
      });
      
      onCredentialRegistered?.(credential);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setRegistrationProgress(0);
    }
  };

  const handleAuthentication = async (credentialId?: string) => {
    if (!delegatedManager) {
      setError('Delegated signing manager not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const session = await delegatedManager.authenticateWithDelegatedCredential(credentialId);
      setActiveSessions(prev => [...prev, session]);
      setSuccess('Authentication successful!');
      onSessionCreated?.(session);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialRevocation = async (credentialId: string) => {
    if (!delegatedManager) return;

    setIsLoading(true);
    try {
      await delegatedManager.revokeDelegatedCredential(credentialId);
      setCredentials(prev => prev.filter(cred => cred.id !== credentialId));
      setSuccess('Credential revoked successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke credential';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryInitiation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Import and use the actual recovery manager
      const { DfnsUserRecoveryManager } = await import('@/infrastructure/dfns/user-recovery-manager');
      const { DfnsAuthenticationManager } = await import('@/infrastructure/dfns/auth-manager');
      
      const authManager = new DfnsAuthenticationManager();
      const recoveryManager = new DfnsUserRecoveryManager({
        baseUrl: 'https://api.dfns.co', // Replace with actual config
        appId: 'your-app-id' // Replace with actual app ID
      });

      if (recoveryForm.recoveryType === RecoveryType.KYC) {
        // Send recovery code via email
        await recoveryManager.sendRecoveryCode(
          recoveryForm.username,
          'your-org-id' // Replace with actual org ID
        );
        setSuccess('Recovery code sent to your email. Check your inbox and follow the instructions.');
      } else {
        // For RecoveryKey type, guide user to use their recovery key
        setSuccess('Please use your recovery key to restore access. Enter your recovery phrase in the recovery flow.');
      }
      
      setShowRecovery(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate recovery';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Cross-Device Credential Creation =====

  /**
   * Handle cross-device credential creation initiation
   */
  const handleCrossDeviceCredentialCreation = async () => {
    if (!delegatedManager) {
      setError('Delegated signing manager not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create one-time code (expires in 1 minute)
      const codeResponse = await delegatedManager.createCredentialCode({
        username: registrationForm.username || 'user',
        displayName: registrationForm.displayName || 'User',
        credentialName: crossDeviceForm.deviceName || 'Cross-Device Credential'
      });

      // Step 2: Display code to user for cross-device input
      setOneTimeCode(codeResponse.code);
      setShowCodeDialog(true);
      setSuccess('Cross-device code generated! Use this code on your other device within 1 minute.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cross-device credential creation failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle completing cross-device credential creation
   */
  const handleCompleteCrossDeviceCredential = async (code: string) => {
    if (!delegatedManager) {
      setError('Delegated signing manager not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create credential using cross-device code
      const result = await delegatedManager.createCredentialWithCrossDeviceCode({
        code: code,
        credentialData: {
          deviceName: crossDeviceForm.deviceName || 'Cross-Device Credential',
          credentialType: crossDeviceForm.credentialType,
          username: registrationForm.username || 'user',
          displayName: registrationForm.displayName || 'User',
          password: crossDeviceForm.password || undefined
        }
      });

      setSuccess('Cross-device credential created successfully!');
      setShowCodeDialog(false);
      setOneTimeCode(null);
      loadUserData(); // Refresh credential list
      
      // Callback for parent component
      onCredentialRegistered?.({
        id: result.id || 'generated-id',
        type: crossDeviceForm.credentialType as any,
        status: DelegatedCredentialStatus.Active,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        publicKey: result.publicKey || '',
        attestationType: 'none',
        authenticatorInfo: {
          aaguid: '',
          credentialId: result.id || 'generated-id',
          counter: 0,
          credentialBackedUp: false,
          credentialDeviceType: AuthenticatorDeviceType.CrossPlatform,
          transports: [AuthenticatorTransport.USB],
          userVerification: UserVerificationRequirement.Required
        },
        metadata: {
          name: crossDeviceForm.deviceName || 'Cross-Device Credential',
          userAgent: navigator.userAgent
        },
        deviceInfo: {
          platform: 'Cross-Device',
          browser: 'Unknown',
          userAgent: navigator.userAgent,
          fingerprint: 'cross-device',
          trusted: true,
          enrolledAt: new Date().toISOString()
        }
      } as DelegatedCredential);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cross-device credential creation failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle credential activation/deactivation toggle
   */
  const handleCredentialToggle = async (credential: DelegatedCredential) => {
    if (!delegatedManager) {
      setError('Delegated signing manager not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (credential.status === DelegatedCredentialStatus.Active) {
        await delegatedManager.deactivateCredential(credential.id);
        setSuccess(`Credential "${credential.metadata.name}" deactivated successfully!`);
      } else {
        await delegatedManager.activateCredential(credential.id);
        setSuccess(`Credential "${credential.metadata.name}" activated successfully!`);
      }
      
      // Refresh credential list
      await loadUserData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Credential toggle failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Utility Functions =====

  const getCredentialIcon = (type: DelegatedCredentialType) => {
    switch (type) {
      case DelegatedCredentialType.WebAuthn:
        return <Shield className="h-4 w-4" />;
      case DelegatedCredentialType.Passkey:
        return <Fingerprint className="h-4 w-4" />;
      case DelegatedCredentialType.BiometricKey:
        return <Fingerprint className="h-4 w-4" />;
      case DelegatedCredentialType.DeviceKey:
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  const getCredentialStatusBadge = (status: DelegatedCredentialStatus) => {
    const variants = {
      [DelegatedCredentialStatus.Active]: 'default',
      [DelegatedCredentialStatus.Inactive]: 'secondary',
      [DelegatedCredentialStatus.Revoked]: 'destructive',
      [DelegatedCredentialStatus.Expired]: 'outline',
      [DelegatedCredentialStatus.Compromised]: 'destructive'
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const isWebAuthnSupported = () => {
    return !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get);
  };

  // ===== Render =====

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delegated Authentication</h2>
          <p className="text-muted-foreground">
            Manage your biometric credentials and secure sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowRegistration(true)}
            disabled={!isWebAuthnSupported() || isLoading}
          >
            <Fingerprint className="h-4 w-4 mr-2" />
            Add Credential
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRecovery(true)}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Account Recovery
          </Button>
        </div>
      </div>

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

      {!isWebAuthnSupported() && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            WebAuthn is not supported in this browser. Please use a modern browser with biometric authentication support.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="cross-device">Cross-Device</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          {credentials.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Fingerprint className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Credentials Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add a biometric credential to enable secure, passwordless authentication
                </p>
                <Button onClick={() => setShowRegistration(true)} disabled={!isWebAuthnSupported()}>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Add Your First Credential
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {credentials.map((credential) => (
                <Card key={credential.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCredentialIcon(credential.type)}
                        <CardTitle className="text-base">{credential.metadata.name}</CardTitle>
                      </div>
                      {getCredentialStatusBadge(credential.status)}
                    </div>
                    <CardDescription>
                      {credential.type} • {credential.deviceInfo.platform}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Created {new Date(credential.createdAt).toLocaleDateString()}
                    </div>
                    {credential.lastUsedAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        Last used {new Date(credential.lastUsedAt).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAuthentication(credential.id)}
                        disabled={isLoading || credential.status !== DelegatedCredentialStatus.Active}
                      >
                        Authenticate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCredential(credential)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCredentialRevocation(credential.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Register Tab */}
        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Register New Credential
              </CardTitle>
              <CardDescription>
                Create a new authentication credential for secure access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {registrationProgress > 0 && (
                <div className="space-y-2">
                  <Label>Registration Progress</Label>
                  <Progress value={registrationProgress} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={registrationForm.username}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={registrationForm.displayName}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Enter display name"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credentialName">Credential Name</Label>
                <Input
                  id="credentialName"
                  value={registrationForm.credentialName}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, credentialName: e.target.value }))}
                  placeholder="e.g., My MacBook Pro"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCredentialRegistration(DelegatedCredentialType.WebAuthn)}
                  disabled={isLoading || !registrationForm.username || !registrationForm.displayName}
                  className="flex-1"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  WebAuthn
                </Button>
                <Button
                  onClick={() => handleCredentialRegistration(DelegatedCredentialType.Passkey)}
                  disabled={isLoading || !registrationForm.username || !registrationForm.displayName}
                  className="flex-1"
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Passkey
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross-Device Tab */}
        <TabsContent value="cross-device" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Cross-Device Credentials
              </CardTitle>
              <CardDescription>
                Create credentials that can be used across multiple devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deviceName">Device Name</Label>
                    <Input
                      id="deviceName"
                      value={crossDeviceForm.deviceName}
                      onChange={(e) => setCrossDeviceForm(prev => ({
                        ...prev,
                        deviceName: e.target.value
                      }))}
                      placeholder="e.g., iPhone, Work Laptop"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credentialType">Credential Type</Label>
                    <select
                      id="credentialType"
                      value={crossDeviceForm.credentialType}
                      onChange={(e) => setCrossDeviceForm(prev => ({
                        ...prev,
                        credentialType: e.target.value as DfnsCredentialKind
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value={DfnsCredentialKind.Fido2}>WebAuthn/Passkey</option>
                      <option value={DfnsCredentialKind.Key}>Private Key</option>
                      <option value={DfnsCredentialKind.PasswordProtectedKey}>Password Protected Key</option>
                      <option value={DfnsCredentialKind.RecoveryKey}>Recovery Key</option>
                    </select>
                  </div>
                </div>

                {crossDeviceForm.credentialType === DfnsCredentialKind.PasswordProtectedKey && (
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={crossDeviceForm.password}
                      onChange={(e) => setCrossDeviceForm(prev => ({
                        ...prev,
                        password: e.target.value
                      }))}
                      placeholder="Enter password for key protection"
                    />
                  </div>
                )}

                <Button 
                  onClick={handleCrossDeviceCredentialCreation}
                  disabled={isLoading || !crossDeviceForm.deviceName}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Code...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Generate Cross-Device Code
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Use Code Section */}
          <Card>
            <CardHeader>
              <CardTitle>Use Cross-Device Code</CardTitle>
              <CardDescription>
                Enter a code generated on another device to create a credential here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="codeInput">Cross-Device Code</Label>
                  <Input
                    id="codeInput"
                    placeholder="Enter the code from your other device"
                    className="font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const code = (e.target as HTMLInputElement).value.trim();
                        if (code) {
                          handleCompleteCrossDeviceCredential(code);
                        }
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={() => {
                    const input = document.getElementById('codeInput') as HTMLInputElement;
                    const code = input?.value.trim();
                    if (code) {
                      handleCompleteCrossDeviceCredential(code);
                    }
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Credential...
                    </>
                  ) : (
                    'Use Code to Create Credential'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {activeSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Sessions</h3>
                <p className="text-muted-foreground text-center">
                  Authenticate with a credential to create a secure session
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Active Session</span>
                      </div>
                      <Badge>Session ID: {session.id.slice(-8)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{new Date(session.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p>{new Date(session.expiresAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Activity</p>
                        <p>{new Date(session.lastActivityAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Capabilities</p>
                        <p>{session.capabilities.length} operations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Registration Dialog */}
      <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Credential</DialogTitle>
            <DialogDescription>
              Register a new biometric credential for secure authentication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {registrationProgress > 0 && (
              <div className="space-y-2">
                <Label>Registration Progress</Label>
                <Progress value={registrationProgress} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={registrationForm.username}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={registrationForm.displayName}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter display name"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credentialName">Credential Name</Label>
              <Input
                id="credentialName"
                value={registrationForm.credentialName}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, credentialName: e.target.value }))}
                placeholder="e.g., My MacBook Pro"
                disabled={isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCredentialRegistration(DelegatedCredentialType.WebAuthn)}
                disabled={isLoading || !registrationForm.username || !registrationForm.displayName}
                className="flex-1"
              >
                <Shield className="h-4 w-4 mr-2" />
                WebAuthn
              </Button>
              <Button
                onClick={() => handleCredentialRegistration(DelegatedCredentialType.Passkey)}
                disabled={isLoading || !registrationForm.username || !registrationForm.displayName}
                className="flex-1"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Passkey
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recovery Dialog */}
      <Dialog open={showRecovery} onOpenChange={setShowRecovery}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Recovery</DialogTitle>
            <DialogDescription>
              Initiate account recovery if you've lost access to your credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recoveryUsername">Username</Label>
              <Input
                id="recoveryUsername"
                value={recoveryForm.username}
                onChange={(e) => setRecoveryForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Recovery Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={recoveryForm.recoveryType === RecoveryType.KYC ? 'default' : 'outline'}
                  onClick={() => setRecoveryForm(prev => ({ ...prev, recoveryType: RecoveryType.KYC }))}
                  disabled={isLoading}
                  size="sm"
                >
                  Identity Verification
                </Button>
                <Button
                  variant={recoveryForm.recoveryType === RecoveryType.RecoveryKey ? 'default' : 'outline'}
                  onClick={() => setRecoveryForm(prev => ({ ...prev, recoveryType: RecoveryType.RecoveryKey }))}
                  disabled={isLoading}
                  size="sm"
                >
                  Recovery Key
                </Button>
              </div>
            </div>
            <Button
              onClick={handleRecoveryInitiation}
              disabled={isLoading || !recoveryForm.username}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Initiate Recovery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cross-Device Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cross-Device Code Generated</DialogTitle>
            <DialogDescription>
              Use this code on your other device to create the credential. Code expires in 1 minute.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {oneTimeCode && (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-3xl font-mono font-bold tracking-wider mb-2">
                  {oneTimeCode}
                </p>
                <p className="text-sm text-muted-foreground">
                  Enter this code on your other device
                </p>
              </div>
            )}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Instructions:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800">
                    <li>Open this application on your other device</li>
                    <li>Navigate to Cross-Device Credentials</li>
                    <li>Click "Use Code" and enter the code above</li>
                    <li>Complete the credential creation process</li>
                  </ol>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowCodeDialog(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DfnsDelegatedAuthentication;

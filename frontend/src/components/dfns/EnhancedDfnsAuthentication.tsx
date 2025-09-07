/**
 * Enhanced DFNS Authentication Component - Phase 2 Implementation
 * 
 * This component showcases the enhanced authentication capabilities from Phase 2:
 * - Proper User Action Signing with X-DFNS-USERACTION headers
 * - Enhanced WebAuthn with passkey registration
 * - Recovery mechanisms and account recovery
 * - Automatic token refresh and management
 * - Service account management with proper patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  DfnsMigrationAdapter
} from '@/infrastructure/dfns';
import { MIGRATION_CONFIG, PHASE2_CONFIG } from '@/infrastructure/dfns/config';
import { 
  Key, 
  Fingerprint, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Settings,
  Plus,
  RefreshCw,
  RotateCcw,
  Clock,
  Zap,
  KeyRound as Recovery
} from 'lucide-react';

// ===== Types =====

export interface EnhancedAuthProps {
  onAuthSuccess?: (info: any) => void;
  onAuthError?: (error: Error) => void;
  onAuthLogout?: () => void;
  showAdvancedFeatures?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authInfo: any;
  currentTab: string;
  migrationStats: any;
}

interface RecoveryState {
  credentials: any[];
  isCreating: boolean;
  isRecovering: boolean;
  recoveryStatus?: string;
}

// ===== Main Component =====

export const EnhancedDfnsAuthentication: React.FC<EnhancedAuthProps> = ({
  onAuthSuccess,
  onAuthError,
  onAuthLogout,
  showAdvancedFeatures = true
}) => {
  // ===== State Management =====
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    authInfo: null,
    currentTab: 'enhanced-webauthn',
    migrationStats: null
  });

  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    credentials: [],
    isCreating: false,
    isRecovering: false,
  });

  const [adapter] = useState(() => new DfnsMigrationAdapter(MIGRATION_CONFIG));
  const [autoRefresh, setAutoRefresh] = useState(PHASE2_CONFIG.autoTokenRefresh);

  // ===== Enhanced Authentication Methods =====

  const handleEnhancedWebAuthnAuth = useCallback(async (username: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await adapter.authenticateWithWebAuthn(username);
      
      // Get auth info safely with type guards
      let authInfo = {};
      const activeClient = adapter.getActiveClient();
      if (activeClient && 'getAuthInfo' in activeClient && typeof activeClient.getAuthInfo === 'function') {
        authInfo = activeClient.getAuthInfo();
      } else if ('getAuthInfo' in adapter && typeof adapter.getAuthInfo === 'function') {
        authInfo = (adapter as any).getAuthInfo();
      }
      
      const stats = adapter.getMigrationStats();
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        authInfo,
        migrationStats: stats
      }));
      
      onAuthSuccess?.(authInfo);
    } catch (error) {
      const errorMessage = (error as Error).message;
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      onAuthError?.(error as Error);
    }
  }, [adapter, onAuthSuccess, onAuthError]);

  const handleEnhancedServiceAccountAuth = useCallback(async (serviceAccountId: string, privateKey: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await adapter.authenticateServiceAccount(serviceAccountId, privateKey);
      
      // Get auth info safely with type guards
      let authInfo = {};
      const activeClient = adapter.getActiveClient();
      if (activeClient && 'getAuthInfo' in activeClient && typeof activeClient.getAuthInfo === 'function') {
        authInfo = activeClient.getAuthInfo();
      } else if ('getAuthInfo' in adapter && typeof adapter.getAuthInfo === 'function') {
        authInfo = (adapter as any).getAuthInfo();
      }
      
      const stats = adapter.getMigrationStats();
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        authInfo,
        migrationStats: stats
      }));
      
      onAuthSuccess?.(authInfo);
    } catch (error) {
      const errorMessage = (error as Error).message;
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      onAuthError?.(error as Error);
    }
  }, [adapter, onAuthSuccess, onAuthError]);

  const handlePasskeyRegistration = useCallback(async (
    username: string,
    displayName: string,
    credentialName: string
  ) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await adapter.registerPasskey(username, displayName, credentialName);
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Show success message or handle result
      console.log('Passkey registered successfully:', result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      onAuthError?.(error as Error);
    }
  }, [adapter, onAuthError]);

  const handleCreateRecoveryCredential = useCallback(async (name: string) => {
    setRecoveryState(prev => ({ ...prev, isCreating: true }));
    
    try {
      const credential = await adapter.createRecoveryCredential(name);
      setRecoveryState(prev => ({
        ...prev,
        isCreating: false,
        credentials: [...prev.credentials, credential]
      }));
    } catch (error) {
      setRecoveryState(prev => ({ ...prev, isCreating: false }));
      onAuthError?.(error as Error);
    }
  }, [adapter, onAuthError]);

  const handleRefreshToken = useCallback(async () => {
    try {
      await adapter.refreshToken();
      
      // Get auth info safely with type guards
      let authInfo = {};
      const activeClient = adapter.getActiveClient();
      if (activeClient && 'getAuthInfo' in activeClient && typeof activeClient.getAuthInfo === 'function') {
        authInfo = activeClient.getAuthInfo();
      } else if ('getAuthInfo' in adapter && typeof adapter.getAuthInfo === 'function') {
        authInfo = (adapter as any).getAuthInfo();
      }
      
      setAuthState(prev => ({ ...prev, authInfo }));
    } catch (error) {
      onAuthError?.(error as Error);
    }
  }, [adapter, onAuthError]);

  const handleLogout = useCallback(() => {
    // DFNS uses WebAuthn/Service Account auth, no traditional logout
    // Just clear local auth state
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      authInfo: null,
      currentTab: 'enhanced-webauthn',
      migrationStats: null
    });
    setRecoveryState({
      credentials: [],
      isCreating: false,
      isRecovering: false,
    });
    onAuthLogout?.();
  }, [adapter, onAuthLogout]);

  // ===== Effects =====

  useEffect(() => {
    // Check if already authenticated
    if (adapter.isReady()) {
      // Get auth info safely with type guards
      let authInfo = {};
      const activeClient = adapter.getActiveClient();
      if (activeClient && 'getAuthInfo' in activeClient && typeof activeClient.getAuthInfo === 'function') {
        authInfo = activeClient.getAuthInfo();
      } else if ('getAuthInfo' in adapter && typeof adapter.getAuthInfo === 'function') {
        authInfo = (adapter as any).getAuthInfo();
      }
      
      const stats = adapter.getMigrationStats();
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        authInfo,
        migrationStats: stats
      }));
    }
  }, [adapter]);

  // Auto-refresh token
  useEffect(() => {
    if (!autoRefresh || !authState.isAuthenticated) return;

    const interval = setInterval(() => {
      // Get auth info safely with type guards
      let authInfo: { tokenExpiresAt?: string } | null = null;
      const activeClient = adapter.getActiveClient();
      if (activeClient && 'getAuthInfo' in activeClient && typeof activeClient.getAuthInfo === 'function') {
        authInfo = activeClient.getAuthInfo();
      } else if ('getAuthInfo' in adapter && typeof adapter.getAuthInfo === 'function') {
        authInfo = (adapter as any).getAuthInfo();
      }
      
      if (authInfo?.tokenExpiresAt) {
        const expiresAt = new Date(authInfo.tokenExpiresAt);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        
        if (expiresAt <= fiveMinutesFromNow) {
          handleRefreshToken();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoRefresh, authState.isAuthenticated, handleRefreshToken, adapter]);

  // ===== Render Helpers =====

  const renderError = () => {
    if (!authState.error) return null;
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Authentication Error</AlertTitle>
        <AlertDescription>{authState.error}</AlertDescription>
      </Alert>
    );
  };

  const renderPhase2Status = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Phase 2: Enhanced Authentication Status
        </CardTitle>
        <CardDescription>
          Advanced DFNS authentication features and migration status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-3 border rounded-lg">
            <Shield className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium">User Action Signing</p>
            <Badge variant={PHASE2_CONFIG.enableUserActionSigning ? "default" : "secondary"}>
              {PHASE2_CONFIG.enableUserActionSigning ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex flex-col items-center p-3 border rounded-lg">
            <Fingerprint className="h-8 w-8 text-blue-500 mb-2" />
            <p className="text-sm font-medium">Passkey Registration</p>
            <Badge variant={PHASE2_CONFIG.enablePasskeyRegistration ? "default" : "secondary"}>
              {PHASE2_CONFIG.enablePasskeyRegistration ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex flex-col items-center p-3 border rounded-lg">
            <RotateCcw className="h-8 w-8 text-purple-500 mb-2" />
            <p className="text-sm font-medium">Recovery Mechanisms</p>
            <Badge variant={PHASE2_CONFIG.enableRecoveryMechanisms ? "default" : "secondary"}>
              {PHASE2_CONFIG.enableRecoveryMechanisms ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex flex-col items-center p-3 border rounded-lg">
            <Clock className="h-8 w-8 text-orange-500 mb-2" />
            <p className="text-sm font-medium">Auto Token Refresh</p>
            <Badge variant={autoRefresh ? "default" : "secondary"}>
              {autoRefresh ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        {authState.migrationStats && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">Migration Status:</p>
            <div className="flex items-center gap-4 text-sm">
              <span>SDK: {authState.migrationStats.usingSdk ? "✓" : "✗"}</span>
              <span>Fallback: {authState.migrationStats.fallbackEnabled ? "✓" : "✗"}</span>
              <span>SDK Ready: {authState.migrationStats.sdkReady ? "✓" : "✗"}</span>
              <span>Legacy Ready: {authState.migrationStats.legacyReady ? "✓" : "✗"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAuthenticatedState = () => (
    <div className="space-y-6">
      {renderPhase2Status()}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Enhanced Authentication Active
          </CardTitle>
          <CardDescription>
            You are authenticated with Phase 2 enhanced DFNS features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {authState.authInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Authentication Type</Label>
                  <div className="flex gap-2 mt-1">
                    {authState.authInfo.hasWebAuthn && (
                      <Badge variant="default">WebAuthn</Badge>
                    )}
                    {authState.authInfo.hasServiceAccount && (
                      <Badge variant="secondary">Service Account</Badge>
                    )}
                  </div>
                </div>
                
                {authState.authInfo.tokenExpiresAt && (
                  <div>
                    <Label className="text-sm font-medium">Token Expires</Label>
                    <p className="text-sm text-gray-600">
                      {new Date(authState.authInfo.tokenExpiresAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
              <Button onClick={handleRefreshToken} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Token
              </Button>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label className="text-sm">Auto Refresh</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showAdvancedFeatures && PHASE2_CONFIG.enableRecoveryMechanisms && (
        <RecoveryManagementSection
          recoveryState={recoveryState}
          onCreateRecovery={handleCreateRecoveryCredential}
        />
      )}
    </div>
  );

  // ===== Main Render =====

  if (authState.isAuthenticated) {
    return renderAuthenticatedState();
  }

  return (
    <div className="space-y-6">
      {renderError()}
      {renderPhase2Status()}
      
      <Card>
        <CardHeader>
          <CardTitle>Enhanced DFNS Authentication</CardTitle>
          <CardDescription>
            Phase 2 enhanced authentication with user action signing, passkey support, and recovery mechanisms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={authState.currentTab} 
            onValueChange={(value) => setAuthState(prev => ({ ...prev, currentTab: value }))}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="enhanced-webauthn">
                <Fingerprint className="h-4 w-4 mr-2" />
                Enhanced WebAuthn
              </TabsTrigger>
              <TabsTrigger value="enhanced-service-account">
                <Shield className="h-4 w-4 mr-2" />
                Enhanced Service Account
              </TabsTrigger>
              <TabsTrigger value="passkey-registration">
                <Plus className="h-4 w-4 mr-2" />
                Register Passkey
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enhanced-webauthn" className="space-y-4">
              <EnhancedWebAuthnForm 
                onAuth={handleEnhancedWebAuthnAuth}
                isLoading={authState.isLoading}
                features={PHASE2_CONFIG}
              />
            </TabsContent>

            <TabsContent value="enhanced-service-account" className="space-y-4">
              <EnhancedServiceAccountForm 
                onAuth={handleEnhancedServiceAccountAuth}
                isLoading={authState.isLoading}
                features={PHASE2_CONFIG}
              />
            </TabsContent>

            <TabsContent value="passkey-registration" className="space-y-4">
              <PasskeyRegistrationForm 
                onRegister={handlePasskeyRegistration}
                isLoading={authState.isLoading}
                isEnabled={PHASE2_CONFIG.enablePasskeyRegistration}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// ===== Enhanced Form Components =====

interface EnhancedFormProps {
  onAuth: (...args: any[]) => Promise<void>;
  isLoading: boolean;
  features: typeof PHASE2_CONFIG;
}

const EnhancedWebAuthnForm: React.FC<EnhancedFormProps> = ({ onAuth, isLoading, features }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onAuth(username.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Enhanced WebAuthn Features</AlertTitle>
        <AlertDescription>
          This authentication method includes proper user action signing, enhanced error handling, and automatic token management.
        </AlertDescription>
      </Alert>
      
      <div>
        <Label htmlFor="enhanced-webauthn-username">Username</Label>
        <Input
          id="enhanced-webauthn-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1">
          <CheckCircle className={`h-3 w-3 ${features.enableUserActionSigning ? 'text-green-500' : 'text-gray-300'}`} />
          <span>User Action Signing</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className={`h-3 w-3 ${features.autoTokenRefresh ? 'text-green-500' : 'text-gray-300'}`} />
          <span>Auto Token Refresh</span>
        </div>
      </div>
      
      <Button type="submit" disabled={isLoading || !username.trim()}>
        {isLoading ? 'Authenticating...' : 'Enhanced WebAuthn Login'}
      </Button>
    </form>
  );
};

const EnhancedServiceAccountForm: React.FC<EnhancedFormProps> = ({ onAuth, isLoading, features }) => {
  const [serviceAccountId, setServiceAccountId] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceAccountId.trim() && privateKey.trim()) {
      onAuth(serviceAccountId.trim(), privateKey.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Enhanced Service Account</AlertTitle>
        <AlertDescription>
          Includes automatic token refresh, proper request signing, and enhanced error handling.
        </AlertDescription>
      </Alert>
      
      <div>
        <Label htmlFor="enhanced-service-account-id">Service Account ID</Label>
        <Input
          id="enhanced-service-account-id"
          type="text"
          value={serviceAccountId}
          onChange={(e) => setServiceAccountId(e.target.value)}
          placeholder="Enter service account ID"
          required
        />
      </div>
      <div>
        <Label htmlFor="enhanced-private-key">Private Key</Label>
        <Input
          id="enhanced-private-key"
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="Enter private key"
          required
        />
      </div>
      
      <Button type="submit" disabled={isLoading || !serviceAccountId.trim() || !privateKey.trim()}>
        {isLoading ? 'Authenticating...' : 'Enhanced Service Account Login'}
      </Button>
    </form>
  );
};

interface PasskeyFormProps {
  onRegister: (username: string, displayName: string, credentialName: string) => Promise<void>;
  isLoading: boolean;
  isEnabled: boolean;
}

const PasskeyRegistrationForm: React.FC<PasskeyFormProps> = ({ onRegister, isLoading, isEnabled }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [credentialName, setCredentialName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && displayName.trim() && credentialName.trim()) {
      onRegister(username.trim(), displayName.trim(), credentialName.trim());
    }
  };

  if (!isEnabled) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Passkey Registration Disabled</AlertTitle>
        <AlertDescription>
          Passkey registration is not enabled in the current configuration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Fingerprint className="h-4 w-4" />
        <AlertTitle>Register New Passkey</AlertTitle>
        <AlertDescription>
          Create a new passkey credential for secure authentication.
        </AlertDescription>
      </Alert>
      
      <div>
        <Label htmlFor="passkey-username">Username</Label>
        <Input
          id="passkey-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          required
        />
      </div>
      <div>
        <Label htmlFor="passkey-display-name">Display Name</Label>
        <Input
          id="passkey-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter display name"
          required
        />
      </div>
      <div>
        <Label htmlFor="passkey-credential-name">Credential Name</Label>
        <Input
          id="passkey-credential-name"
          type="text"
          value={credentialName}
          onChange={(e) => setCredentialName(e.target.value)}
          placeholder="Enter credential name"
          required
        />
      </div>
      
      <Button type="submit" disabled={isLoading || !username.trim() || !displayName.trim() || !credentialName.trim()}>
        {isLoading ? 'Registering...' : 'Register Passkey'}
      </Button>
    </form>
  );
};

// ===== Recovery Management Section =====

interface RecoveryManagementProps {
  recoveryState: RecoveryState;
  onCreateRecovery: (name: string) => Promise<void>;
}

const RecoveryManagementSection: React.FC<RecoveryManagementProps> = ({
  recoveryState,
  onCreateRecovery
}) => {
  const [recoveryName, setRecoveryName] = useState('');

  const handleCreateRecovery = () => {
    if (recoveryName.trim()) {
      onCreateRecovery(recoveryName.trim());
      setRecoveryName('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Recovery className="h-5 w-5" />
          Recovery Management
        </CardTitle>
        <CardDescription>
          Manage recovery credentials for account recovery.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={recoveryName}
              onChange={(e) => setRecoveryName(e.target.value)}
              placeholder="Recovery credential name"
            />
            <Button
              onClick={handleCreateRecovery}
              disabled={recoveryState.isCreating || !recoveryName.trim()}
            >
              {recoveryState.isCreating ? 'Creating...' : 'Create Recovery'}
            </Button>
          </div>

          {recoveryState.credentials.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recovery Credentials</Label>
              {recoveryState.credentials.map((credential, index) => (
                <div
                  key={credential.id || index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{credential.name}</p>
                    <p className="text-sm text-gray-600">{credential.kind}</p>
                  </div>
                  <Badge variant={credential.status === 'Active' ? 'default' : 'secondary'}>
                    {credential.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedDfnsAuthentication;
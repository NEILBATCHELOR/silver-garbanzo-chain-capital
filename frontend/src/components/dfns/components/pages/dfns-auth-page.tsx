/**
 * DFNS Authentication Page
 * 
 * Comprehensive authentication page with login, registration, WebAuthn setup, and management
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  UserPlus, 
  LogIn, 
  Settings, 
  Users, 
  Key, 
  Fingerprint,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Import new authentication components
import { DfnsLoginForm } from '../authentication/dfns-login-form';
import { DfnsRegistrationWizard } from '../authentication/dfns-registration-wizard';
import { AuthStatusDisplay, useAuth } from '../authentication/dfns-auth-guard';

// Import existing components
import { WebAuthnSetup } from '../auth/webauthn-setup';
import { AuthStatusCard } from '../authentication/auth-status-card';
import { UserList } from '../authentication/user-list';
import { CredentialManager } from '../authentication/credential-manager';
import { ServiceAccountList } from '../authentication/service-account-list';
import { PersonalTokenList } from '../authentication/personal-token-list';

import type { WebAuthnCredential } from '@/types/dfns/webauthn';
import type { DfnsAuthTokenResponse } from '@/types/dfns/auth';

interface DfnsAuthPageProps {
  defaultTab?: 'login' | 'register' | 'webauthn' | 'management';
  className?: string;
}

export function DfnsAuthPage({ defaultTab = 'login', className }: DfnsAuthPageProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [registrationType, setRegistrationType] = useState<'delegated' | 'standard' | 'endUser' | 'social'>('delegated');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Try to use auth context if available, otherwise use local state
  let isAuthenticated = false;
  let authUser = null;
  
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
    authUser = auth.user;
  } catch (error) {
    // useAuth not available, use local state checking
    const storedToken = localStorage.getItem('dfns_auth_token');
    const storedUser = localStorage.getItem('dfns_auth_user');
    isAuthenticated = !!(storedToken && storedUser);
    if (storedUser) {
      try {
        authUser = JSON.parse(storedUser);
      } catch (e) {
        // Invalid stored user data
      }
    }
  }

  /**
   * Handle successful login
   */
  const handleLoginSuccess = (tokenResponse: DfnsAuthTokenResponse) => {
    setSuccessMessage(`Successfully logged in as ${tokenResponse.user.username}!`);
    setShowSuccess(true);
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => setShowSuccess(false), 5000);
    
    console.log('✅ Login successful:', tokenResponse);
  };

  /**
   * Handle login error
   */
  const handleLoginError = (error: string) => {
    console.error('❌ Login error:', error);
  };

  /**
   * Handle successful registration
   */
  const handleRegistrationSuccess = (response: DfnsAuthTokenResponse) => {
    setSuccessMessage(`Registration completed successfully! Welcome ${response.user.username}!`);
    setShowSuccess(true);
    
    // Switch to login tab after successful registration
    setTimeout(() => {
      setActiveTab('login');
      setShowSuccess(false);
    }, 3000);
    
    console.log('✅ Registration successful:', response);
  };

  /**
   * Handle registration error
   */
  const handleRegistrationError = (error: string) => {
    console.error('❌ Registration error:', error);
  };

  /**
   * Handle WebAuthn credential creation
   */
  const handleCredentialCreated = (credential: WebAuthnCredential) => {
    setSuccessMessage(`WebAuthn credential "${credential.device_name}" created successfully!`);
    setShowSuccess(true);
    
    setTimeout(() => setShowSuccess(false), 5000);
    
    console.log('✅ WebAuthn credential created:', credential);
  };

  /**
   * Get tab badge counts (placeholder - would normally come from data)
   */
  const getTabBadges = () => {
    return {
      users: 0, // Would come from actual data
      credentials: 0,
      serviceAccounts: 0,
      tokens: 0
    };
  };

  const badges = getTabBadges();

  return (
    <div className={`container mx-auto py-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Shield className="h-8 w-8" />
              <span>DFNS Authentication</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive DFNS authentication, registration, and credential management
            </p>
          </div>
          
          {/* Authentication Status */}
          <AuthStatusDisplay showDetails={true} />
        </div>

        {/* Success Message */}
        {showSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      {/* Authentication Tabs */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'login' | 'register' | 'webauthn' | 'management')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="login" className="flex items-center space-x-2">
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Register</span>
          </TabsTrigger>
          <TabsTrigger value="webauthn" className="flex items-center space-x-2">
            <Fingerprint className="h-4 w-4" />
            <span>WebAuthn</span>
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Management</span>
          </TabsTrigger>
        </TabsList>

        {/* Login Tab */}
        <TabsContent value="login" className="space-y-4">
          <div className="grid gap-6">
            <DfnsLoginForm
              onLoginSuccess={handleLoginSuccess}
              onLoginError={handleLoginError}
              defaultTab="standard"
            />

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>Authentication Methods</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>Standard Login:</strong> Uses delegated authentication with WebAuthn for secure access</p>
                  <p><strong>Social Login:</strong> OAuth/OIDC integration with identity providers like Google</p>
                  <p><strong>Code Login:</strong> Email verification code authentication for password-less access</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Registration Tab */}
        <TabsContent value="register" className="space-y-4">
          <div className="grid gap-6">
            {/* Registration Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Registration Type</CardTitle>
                <CardDescription>
                  Choose the type of registration that matches your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={registrationType === 'delegated' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('delegated')}
                    className="justify-start"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Delegated Registration
                  </Button>
                  <Button
                    variant={registrationType === 'standard' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('standard')}
                    className="justify-start"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Standard Registration
                  </Button>
                  <Button
                    variant={registrationType === 'endUser' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('endUser')}
                    className="justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    End User Registration
                  </Button>
                  <Button
                    variant={registrationType === 'social' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('social')}
                    className="justify-start"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Social Registration
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Registration Wizard */}
            <DfnsRegistrationWizard
              registrationType={registrationType}
              onRegistrationSuccess={handleRegistrationSuccess}
              onRegistrationError={handleRegistrationError}
            />
          </div>
        </TabsContent>

        {/* WebAuthn Tab */}
        <TabsContent value="webauthn" className="space-y-4">
          <div className="grid gap-6">
            <WebAuthnSetup 
              onCredentialCreated={handleCredentialCreated}
            />
          </div>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <div className="grid gap-6">
            {/* Authentication Status Overview */}
            <AuthStatusCard />

            {/* Management Sections */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* User Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>User Management</span>
                    {badges.users > 0 && (
                      <Badge variant="secondary">{badges.users}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Manage organization users and their access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserList />
                </CardContent>
              </Card>

              {/* Credential Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Fingerprint className="h-5 w-5" />
                    <span>Credentials</span>
                    {badges.credentials > 0 && (
                      <Badge variant="secondary">{badges.credentials}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Manage WebAuthn and other authentication credentials
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CredentialManager />
                </CardContent>
              </Card>

              {/* Service Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Service Accounts</span>
                    {badges.serviceAccounts > 0 && (
                      <Badge variant="secondary">{badges.serviceAccounts}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Manage machine users and automated access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ServiceAccountList />
                </CardContent>
              </Card>

              {/* Personal Access Tokens */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>Access Tokens</span>
                    {badges.tokens > 0 && (
                      <Badge variant="secondary">{badges.tokens}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Manage personal access tokens for API access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PersonalTokenList />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>DFNS Authentication Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">Security Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• WebAuthn-based authentication</li>
                <li>• User Action Signing for sensitive operations</li>
                <li>• Multi-factor authentication support</li>
                <li>• OAuth/OIDC social authentication</li>
                <li>• Service account management</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Management Capabilities</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• User lifecycle management</li>
                <li>• Credential rotation and recovery</li>
                <li>• Personal access token scoping</li>
                <li>• Permission-based access control</li>
                <li>• Audit trail and compliance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DfnsAuthPage;
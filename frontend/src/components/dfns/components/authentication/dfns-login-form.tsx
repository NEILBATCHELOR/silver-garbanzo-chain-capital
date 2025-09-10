/**
 * DFNS Login Form Component
 * 
 * Complete login form with WebAuthn support and social authentication
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  LogIn, 
  Mail, 
  Key, 
  Fingerprint, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Shield,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { authService } from '@/services/dfns/authService';
import type { 
  DfnsLoginChallengeResponse, 
  DfnsAuthTokenResponse,
  DfnsLoginRequest 
} from '@/types/dfns/auth';

interface DfnsLoginFormProps {
  onLoginSuccess?: (tokenResponse: DfnsAuthTokenResponse) => void;
  onLoginError?: (error: string) => void;
  className?: string;
  defaultTab?: 'standard' | 'social' | 'code';
}

interface LoginState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
  loginChallenge: DfnsLoginChallengeResponse | null;
  showPassword: boolean;
}

export function DfnsLoginForm({ 
  onLoginSuccess, 
  onLoginError, 
  className,
  defaultTab = 'standard'
}: DfnsLoginFormProps) {
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [socialIdToken, setSocialIdToken] = useState('');
  
  // Component state
  const [state, setState] = useState<LoginState>({
    isLoading: false,
    error: null,
    success: null,
    loginChallenge: null,
    showPassword: false
  });

  const [activeTab, setActiveTab] = useState(defaultTab);

  // Reset error when switching tabs
  useEffect(() => {
    setState(prev => ({ ...prev, error: null, success: null }));
  }, [activeTab]);

  /**
   * Handle standard username/password login with WebAuthn
   */
  const handleStandardLogin = async () => {
    if (!username.trim()) {
      setState(prev => ({ ...prev, error: 'Username is required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, success: null }));

    try {
      console.log('🔐 Starting DFNS login for:', username);

      // Attempt login with delegated authentication
      const result = await authService.login(username);
      
      setState(prev => ({ ...prev, success: 'Login successful!' }));
      
      // Notify parent component
      if (onLoginSuccess) {
        onLoginSuccess(result);
      }

      console.log('✅ DFNS login completed successfully');

    } catch (error) {
      console.error('❌ DFNS login failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Handle social authentication login
   */
  const handleSocialLogin = async () => {
    if (!socialIdToken.trim()) {
      setState(prev => ({ ...prev, error: 'ID Token is required for social login' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, success: null }));

    try {
      console.log('🔐 Starting DFNS social login');

      const result = await authService.loginWithSocial(socialIdToken);
      
      setState(prev => ({ ...prev, success: 'Social login successful!' }));
      
      if (onLoginSuccess) {
        onLoginSuccess(result);
      }

      console.log('✅ DFNS social login completed successfully');

    } catch (error) {
      console.error('❌ DFNS social login failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Social login failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Handle login code authentication
   */
  const handleCodeLogin = async () => {
    if (!username.trim()) {
      setState(prev => ({ ...prev, error: 'Username is required' }));
      return;
    }

    if (!loginCode.trim()) {
      setState(prev => ({ ...prev, error: 'Login code is required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, success: null }));

    try {
      console.log('🔐 Starting DFNS code login for:', username);

      // For now, use a default orgId - this should be configured based on your setup
      const orgId = process.env.VITE_DFNS_ORG_ID || 'default-org-id';

      // For code login, we'll need to implement the specific flow
      // This would typically involve sending the code first, then completing
      const codeResult = await authService.sendLoginCode(username, orgId);
      
      setState(prev => ({ 
        ...prev, 
        success: 'Login code sent! Check your email and enter the code above.' 
      }));

      console.log('📧 Login code sent successfully');

    } catch (error) {
      console.error('❌ DFNS code login failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Code login failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Send login code
   */
  const handleSendLoginCode = async () => {
    if (!username.trim()) {
      setState(prev => ({ ...prev, error: 'Username is required to send login code' }));
      return;
    }

    // For now, use a default orgId - this should be configured based on your setup
    const orgId = process.env.VITE_DFNS_ORG_ID || 'default-org-id';

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await authService.sendLoginCode(username, orgId);
      setState(prev => ({ 
        ...prev, 
        success: 'Login code sent to your email!',
        isLoading: false 
      }));
    } catch (error) {
      console.error('❌ Failed to send login code:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to send login code',
        isLoading: false 
      }));
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await authService.logout();
      setState(prev => ({ 
        ...prev, 
        success: 'Logged out successfully',
        isLoading: false 
      }));
    } catch (error) {
      console.error('❌ Logout failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false 
      }));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>DFNS Authentication</span>
        </CardTitle>
        <CardDescription>
          Login to your DFNS account using WebAuthn, social authentication, or email verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'standard' | 'social' | 'code')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="standard">Standard Login</TabsTrigger>
            <TabsTrigger value="social">Social Login</TabsTrigger>
            <TabsTrigger value="code">Code Login</TabsTrigger>
          </TabsList>

          {/* Standard Login Tab */}
          <TabsContent value="standard" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  disabled={state.isLoading}
                />
              </div>

              <Button
                onClick={handleStandardLogin}
                disabled={state.isLoading || !username.trim()}
                className="w-full"
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Login with WebAuthn
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button variant="outline" onClick={handleLogout} disabled={state.isLoading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Social Login Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="socialIdToken">ID Token</Label>
                <Input
                  id="socialIdToken"
                  type="text"
                  value={socialIdToken}
                  onChange={(e) => setSocialIdToken(e.target.value)}
                  placeholder="Paste your OAuth ID token here"
                  disabled={state.isLoading}
                />
              </div>

              <Button
                onClick={handleSocialLogin}
                disabled={state.isLoading || !socialIdToken.trim()}
                className="w-full"
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Login with Social Auth
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground">
                <p>Use OAuth/OIDC providers like Google, Microsoft, or other identity providers.</p>
              </div>
            </div>
          </TabsContent>

          {/* Code Login Tab */}
          <TabsContent value="code" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codeUsername">Username or Email</Label>
                <Input
                  id="codeUsername"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  disabled={state.isLoading}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleSendLoginCode}
                  disabled={state.isLoading || !username.trim()}
                  variant="outline"
                  className="flex-1"
                >
                  {state.isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Code
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginCode">Login Code</Label>
                <Input
                  id="loginCode"
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  placeholder="Enter the code from your email"
                  disabled={state.isLoading}
                />
              </div>

              <Button
                onClick={handleCodeLogin}
                disabled={state.isLoading || !username.trim() || !loginCode.trim()}
                className="w-full"
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Login with Code
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status Messages */}
        {state.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
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

        {/* Instructions */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Standard Login:</strong> Uses DFNS delegated authentication with WebAuthn credentials</p>
            <p><strong>Social Login:</strong> OAuth/OIDC authentication with identity providers</p>
            <p><strong>Code Login:</strong> Email verification code authentication</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DfnsLoginForm;
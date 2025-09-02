/**
 * SSO Login Form Component
 * 
 * Handles SSO authentication with SAML providers
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import { authService } from '../services/authWrapper';
import { formatAuthError } from '../utils/authUtils';

interface SSOProvider {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
}

interface SSOLoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showHeader?: boolean;
  enabledProviders?: SSOProvider[];
}

export const SSOLoginForm: React.FC<SSOLoginFormProps> = ({
  onSuccess,
  redirectTo,
  showHeader = true,
  enabledProviders = [],
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedProvider, setDetectedProvider] = useState<SSOProvider | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from router state or prop
  const from = (location.state as any)?.from || redirectTo || '/dashboard';

  // Auto-detect SSO provider based on email domain
  useEffect(() => {
    if (email && email.includes('@')) {
      const domain = email.split('@')[1]?.toLowerCase();
      const provider = enabledProviders.find(p => 
        p.domain.toLowerCase() === domain && p.enabled
      );
      setDetectedProvider(provider || null);
    } else {
      setDetectedProvider(null);
    }
  }, [email, enabledProviders]);

  const handleSSOSignIn = async (provider?: SSOProvider) => {
    const ssoProvider = provider || detectedProvider;
    
    if (!ssoProvider) {
      setError('No SSO provider found for this email domain');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const redirectURL = `${window.location.origin}/auth/callback`;
      
      const { data, error } = await authService.signInWithSSO({
        domain: ssoProvider.domain,
        options: {
          redirectTo: redirectURL,
        },
      });

      if (error) {
        setError(formatAuthError(error.message));
        return;
      }

      // SSO redirect will happen automatically
      // The callback page will handle the success case
      
    } catch (err: any) {
      setError(formatAuthError(err.message || 'SSO sign-in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!detectedProvider) {
      setError('No SSO provider configured for this email domain');
      return;
    }

    handleSSOSignIn();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      {showHeader && (
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Building2 className="h-6 w-6" />
            Enterprise Sign In
          </CardTitle>
          <CardDescription className="text-center">
            Sign in with your organization's SSO
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sso-email">Work Email</Label>
            <Input
              id="sso-email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
            
            {detectedProvider && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>SSO provider detected: {detectedProvider.name}</span>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !detectedProvider}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to SSO...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Continue with SSO
              </>
            )}
          </Button>
        </form>

        {enabledProviders.length > 0 && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or choose your organization
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {enabledProviders.filter(p => p.enabled).map((provider) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSSOSignIn(provider)}
                  disabled={loading}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {provider.name}
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              ))}
            </div>
          </>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Don't have SSO access?{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => navigate('/auth/login')}
              disabled={loading}
            >
              Sign in with email
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SSOLoginForm;

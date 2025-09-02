/**
 * OAuth Login Form Component
 * 
 * Handles OAuth authentication with various providers
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Github, Chrome, Facebook, Apple, Loader2, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import { authService } from '../services/authWrapper';
import { formatAuthError } from '../utils/authUtils';

type OAuthProvider = 'google' | 'github' | 'facebook' | 'apple' | 'microsoft' | 'twitter' | 'discord' | 'linkedin';

interface OAuthLoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showHeader?: boolean;
  enabledProviders?: OAuthProvider[];
  onBackToLogin?: () => void;
}

const defaultProviders: OAuthProvider[] = ['google', 'github', 'facebook', 'apple'];

const providerConfig = {
  google: {
    name: 'Google',
    icon: Chrome,
    color: 'bg-red-500 hover:bg-red-600 text-white',
  },
  github: {
    name: 'GitHub',
    icon: Github,
    color: 'bg-gray-900 hover:bg-gray-800 text-white',
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  apple: {
    name: 'Apple',
    icon: Apple,
    color: 'bg-black hover:bg-gray-900 text-white',
  },
  microsoft: {
    name: 'Microsoft',
    icon: Chrome,
    color: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  twitter: {
    name: 'Twitter',
    icon: Chrome,
    color: 'bg-sky-500 hover:bg-sky-600 text-white',
  },
  discord: {
    name: 'Discord',
    icon: Chrome,
    color: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Chrome,
    color: 'bg-blue-700 hover:bg-blue-800 text-white',
  },
};

export const OAuthLoginForm: React.FC<OAuthLoginFormProps> = ({
  onSuccess,
  redirectTo,
  showHeader = true,
  enabledProviders = defaultProviders,
  onBackToLogin,
}) => {
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from router state or prop
  const from = (location.state as any)?.from || redirectTo || '/dashboard';

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setLoading(provider);
    setError(null);

    try {
      const redirectURL = `${window.location.origin}/auth/callback`;
      
      const { data, error } = await authService.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: redirectURL,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setError(formatAuthError(error.message));
        return;
      }

      // OAuth redirect will happen automatically
      // The callback page will handle the success case
      
    } catch (err: any) {
      setError(formatAuthError(err.message || `Failed to sign in with ${provider}`));
    } finally {
      setLoading(null);
    }
  };

  const renderProviderButton = (provider: OAuthProvider) => {
    const config = providerConfig[provider];
    const Icon = config.icon;
    const isLoading = loading === provider;

    return (
      <Button
        key={provider}
        onClick={() => handleOAuthSignIn(provider)}
        disabled={!!loading}
        className={`w-full justify-start ${config.color}`}
        variant="outline"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icon className="mr-2 h-4 w-4" />
        )}
        Continue with {config.name}
      </Button>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      {showHeader && (
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Choose your account
          </CardTitle>
          <CardDescription className="text-center">
            Sign in with your preferred social account
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          {enabledProviders.map(renderProviderButton)}
        </div>

        {onBackToLogin && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={onBackToLogin}
              disabled={!!loading}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to email login
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OAuthLoginForm;

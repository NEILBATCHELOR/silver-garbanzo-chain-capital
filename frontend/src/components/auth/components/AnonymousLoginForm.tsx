/**
 * Anonymous Login Form Component
 * 
 * Allows users to sign in anonymously as guests
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserX, Loader2, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { authService } from '../services/authWrapper';
import { formatAuthError } from '../utils/authUtils';

interface AnonymousLoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showHeader?: boolean;
  showWarning?: boolean;
}

export const AnonymousLoginForm: React.FC<AnonymousLoginFormProps> = ({
  onSuccess,
  redirectTo,
  showHeader = true,
  showWarning = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from router state or prop
  const from = (location.state as any)?.from || redirectTo || '/dashboard';

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authService.signInAnonymously();

      if (error) {
        setError(formatAuthError(error.message));
        return;
      }

      if (data?.user) {
        onSuccess?.();
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(formatAuthError(err.message || 'Failed to sign in anonymously'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      {showHeader && (
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <UserX className="h-6 w-6" />
            Guest Access
          </CardTitle>
          <CardDescription className="text-center">
            Continue as a guest without creating an account
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {showWarning && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Guest access provides limited functionality. Your data won't be saved between sessions.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleAnonymousSignIn}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in as guest...
            </>
          ) : (
            <>
              <UserX className="mr-2 h-4 w-4" />
              Continue as Guest
            </>
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Want to save your progress?{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => navigate('/auth/signup')}
              disabled={loading}
            >
              Create an account
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnonymousLoginForm;

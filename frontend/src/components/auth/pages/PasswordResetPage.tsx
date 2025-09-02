/**
 * Password Reset Page
 * 
 * Handles both password reset request and password update
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { GuestGuard } from '@/components/auth/ProtectedRoute';
import { PasswordResetForm } from '@/components/auth/components';
import { usePasswordReset } from '@/components/auth/hooks/usePasswordReset';
import { Loader2 } from 'lucide-react';

const PasswordResetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isRecoverySession, loading } = usePasswordReset();
  
  // Check for error from email link
  const error = searchParams.get('error');
  const type = searchParams.get('type');
  const accessToken = searchParams.get('access_token');
  
  // Determine mode based on recovery session or URL parameters
  const mode = isRecoverySession || accessToken || type === 'recovery' ? 'update' : 'request';

  // Show loading while establishing recovery session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Setting up password reset...</p>
        </div>
      </div>
    );
  }

  // Handle error from email link
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Reset Link Invalid</h1>
            <p className="text-muted-foreground">
              The password reset link is invalid or has expired. Please request a new one.
            </p>
            <a 
              href="/auth/login" 
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GuestGuard>
      <Helmet>
        <title>
          {mode === 'update' ? 'Update Password' : 'Reset Password'} - Chain Capital
        </title>
        <meta 
          name="description" 
          content={
            mode === 'update' 
              ? 'Set your new password' 
              : 'Reset your Chain Capital account password'
          } 
        />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-12">
        <div className="w-full max-w-md">
          <PasswordResetForm 
            mode={mode}
            showHeader={true}
          />
        </div>
      </div>
    </GuestGuard>
  );
};

export default PasswordResetPage;

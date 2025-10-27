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
  const { isRecoverySession, loading, tokenHash } = usePasswordReset();
  
  // Check for error from email link (can be in query params or hash)
  const queryError = searchParams.get('error');
  
  // Parse hash parameters for errors (Supabase often puts errors in hash)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hashError = hashParams.get('error');
  const errorCode = hashParams.get('error_code');
  const errorDescription = hashParams.get('error_description');
  
  // Determine if there's an error
  const error = queryError || hashError;
  const errorMessage = errorDescription || error;
  
  // Check if the session expired while trying to reset
  const isSessionExpired = error === 'session_expired' || errorCode === 'otp_expired' || error === 'access_denied';
  
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
          <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-destructive">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {isSessionExpired ? 'Reset Link Expired' : 'Reset Link Invalid'}
              </h1>
              <p className="text-muted-foreground">
                {isSessionExpired 
                  ? 'This password reset link has expired. Reset links are valid for 1 hour for security reasons.'
                  : (errorMessage ? decodeURIComponent(errorMessage) : 'The password reset link is invalid or has already been used.')
                }
              </p>
            </div>
            
            <div className="space-y-3">
              <a 
                href="/auth/reset-password" 
                className="flex items-center justify-center w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Request New Reset Link
              </a>
              <a 
                href="/auth/login" 
                className="flex items-center justify-center w-full px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                Back to Login
              </a>
            </div>
            
            {isSessionExpired && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-1">Security Note:</p>
                <p>Password reset links expire after 1 hour to protect your account. Simply request a new link to continue.</p>
              </div>
            )}
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
            tokenHash={tokenHash}
          />
        </div>
      </div>
    </GuestGuard>
  );
};

export default PasswordResetPage;

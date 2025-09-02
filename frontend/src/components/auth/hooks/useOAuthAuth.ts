/**
 * OAuth Authentication Hook
 * 
 * Custom hook for OAuth authentication with various providers
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { authService } from '../services/authWrapper';
import type { SignInWithOAuthCredentials } from '../types/authTypes';
import { formatAuthError } from '../utils/authUtils';

export const useOAuthAuth = () => {
  const { clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithOAuth = useCallback(async (credentials: SignInWithOAuthCredentials) => {
    setLoading(true);
    setError(null);
    clearError();
    
    try {
      const response = await authService.signInWithOAuth(credentials);
      
      if (response.success) {
        // OAuth redirect will happen automatically
        return true;
      } else {
        const errorMessage = formatAuthError(response.error?.message || 'OAuth sign-in failed');
        setError(errorMessage);
        return false;
      }
    } catch (err: any) {
      const errorMessage = formatAuthError(err.message || 'OAuth sign-in failed');
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  const clearOAuthError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInWithOAuth,
    loading,
    error,
    clearError: clearOAuthError,
  };
};

export default useOAuthAuth;

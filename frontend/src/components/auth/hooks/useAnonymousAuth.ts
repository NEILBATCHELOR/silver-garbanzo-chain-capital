/**
 * Anonymous Authentication Hook
 * 
 * Custom hook for anonymous/guest authentication
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { authService } from '../services/authWrapper';
import { formatAuthError } from '../utils/authUtils';

export const useAnonymousAuth = () => {
  const { clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInAnonymously = useCallback(async () => {
    setLoading(true);
    setError(null);
    clearError();
    
    try {
      const response = await authService.signInAnonymously();
      
      if (response.success && response.data?.user) {
        return true;
      } else {
        const errorMessage = formatAuthError(response.error?.message || 'Anonymous sign-in failed');
        setError(errorMessage);
        return false;
      }
    } catch (err: any) {
      const errorMessage = formatAuthError(err.message || 'Anonymous sign-in failed');
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  const clearAnonymousError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInAnonymously,
    loading,
    error,
    clearError: clearAnonymousError,
  };
};

export default useAnonymousAuth;

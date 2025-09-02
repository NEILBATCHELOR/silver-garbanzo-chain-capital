/**
 * Identity Management Hook
 * 
 * Custom hook for managing user identities (linking/unlinking)
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { authService } from '../services/authWrapper';
import type { LinkIdentityCredentials, UnlinkIdentityCredentials } from '../types/authTypes';
import { formatAuthError } from '../utils/authUtils';

interface UserIdentity {
  id: string;
  provider: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  identity_data: Record<string, any>;
}

export const useIdentityManagement = () => {
  const { user, clearError } = useAuth();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIdentities = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.getUserIdentities();
      
      if (response.success && response.data) {
        setIdentities(response.data);
      } else {
        const errorMessage = formatAuthError(response.error?.message || 'Failed to load identities');
        setError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = formatAuthError(err.message || 'Failed to load identities');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const linkIdentity = useCallback(async (credentials: LinkIdentityCredentials) => {
    setError(null);
    clearError();
    
    try {
      const response = await authService.linkIdentity(credentials);
      
      if (response.success) {
        // OAuth redirect will happen automatically for linking
        return true;
      } else {
        const errorMessage = formatAuthError(response.error?.message || 'Failed to link identity');
        setError(errorMessage);
        return false;
      }
    } catch (err: any) {
      const errorMessage = formatAuthError(err.message || 'Failed to link identity');
      setError(errorMessage);
      return false;
    }
  }, [clearError]);

  const unlinkIdentity = useCallback(async (credentials: UnlinkIdentityCredentials) => {
    setError(null);
    clearError();
    
    try {
      const response = await authService.unlinkIdentity(credentials);
      
      if (response.success) {
        // Reload identities after unlinking
        await loadIdentities();
        return true;
      } else {
        const errorMessage = formatAuthError(response.error?.message || 'Failed to unlink identity');
        setError(errorMessage);
        return false;
      }
    } catch (err: any) {
      const errorMessage = formatAuthError(err.message || 'Failed to unlink identity');
      setError(errorMessage);
      return false;
    }
  }, [clearError, loadIdentities]);

  const clearIdentityError = useCallback(() => {
    setError(null);
  }, []);

  // Load identities when user changes
  useEffect(() => {
    if (user) {
      loadIdentities();
    } else {
      setIdentities([]);
    }
  }, [user, loadIdentities]);

  // Check if user can unlink a specific identity
  const canUnlinkIdentity = useCallback((identity: UserIdentity): boolean => {
    const emailIdentities = identities.filter(i => i.provider === 'email');
    const oauthIdentities = identities.filter(i => i.provider !== 'email');
    
    if (identity.provider === 'email') {
      // Can unlink email if there are OAuth providers
      return oauthIdentities.length > 0;
    } else {
      // Can unlink OAuth if there's email or other OAuth providers
      return emailIdentities.length > 0 || oauthIdentities.length > 1;
    }
  }, [identities]);

  return {
    identities,
    loading,
    error,
    loadIdentities,
    linkIdentity,
    unlinkIdentity,
    canUnlinkIdentity,
    clearError: clearIdentityError,
    hasMultipleIdentities: identities.length > 1,
    hasEmailIdentity: identities.some(i => i.provider === 'email'),
    hasOAuthIdentities: identities.some(i => i.provider !== 'email'),
  };
};

export default useIdentityManagement;

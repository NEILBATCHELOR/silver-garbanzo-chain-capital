/**
 * Session Manager Hook
 * 
 * Handles automatic session refresh and provides session utilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { authService } from '@/components/auth/services/authWrapper';
import type { Session } from '@supabase/supabase-js';

interface SessionManagerOptions {
  autoRefresh?: boolean;
  refreshBuffer?: number; // Minutes before expiry to refresh
  onRefreshSuccess?: () => void;
  onRefreshError?: (error: string) => void;
  onSessionExpired?: () => void;
}

export const useSessionManager = (options: SessionManagerOptions = {}) => {
  const {
    autoRefresh = true,
    refreshBuffer = 5, // Refresh 5 minutes before expiry
    onRefreshSuccess,
    onRefreshError,
    onSessionExpired,
  } = options;

  const { session, user, isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const refreshBufferMs = refreshBuffer * 60 * 1000;

  /**
   * Get time until session expires (in milliseconds)
   */
  const getTimeUntilExpiry = useCallback((session: Session | null): number => {
    if (!session?.expires_at) return Infinity;
    return (session.expires_at * 1000) - Date.now();
  }, []);

  /**
   * Check if session is expired
   */
  const isSessionExpired = useCallback((session: Session | null): boolean => {
    return getTimeUntilExpiry(session) <= 0;
  }, [getTimeUntilExpiry]);

  /**
   * Check if session needs refresh
   */
  const needsRefresh = useCallback((session: Session | null): boolean => {
    if (!session) return false;
    const timeUntilExpiry = getTimeUntilExpiry(session);
    return timeUntilExpiry <= refreshBufferMs && timeUntilExpiry > 0;
  }, [getTimeUntilExpiry, refreshBufferMs]);

  /**
   * Manually refresh the session
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false;

    setIsRefreshing(true);
    setRefreshError(null);
    setLastRefreshAttempt(new Date());

    try {
      const response = await authService.refreshSession();
      
      if (response.success) {
        onRefreshSuccess?.();
        return true;
      } else {
        const errorMessage = response.error?.message || 'Failed to refresh session';
        setRefreshError(errorMessage);
        onRefreshError?.(errorMessage);
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh session';
      setRefreshError(errorMessage);
      onRefreshError?.(errorMessage);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefreshSuccess, onRefreshError]);

  /**
   * Schedule automatic session refresh
   */
  const scheduleRefresh = useCallback((session: Session | null) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (!session || !autoRefresh) return;

    const timeUntilRefresh = getTimeUntilExpiry(session) - refreshBufferMs;
    
    if (timeUntilRefresh > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshSession();
      }, timeUntilRefresh);
    }
  }, [autoRefresh, getTimeUntilExpiry, refreshBufferMs, refreshSession]);

  /**
   * Handle session expiry
   */
  const handleSessionExpired = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    onSessionExpired?.();
  }, [onSessionExpired]);

  // Set up automatic refresh when session changes
  useEffect(() => {
    if (!session) return;

    if (isSessionExpired(session)) {
      handleSessionExpired();
      return;
    }

    if (needsRefresh(session)) {
      refreshSession();
    } else {
      scheduleRefresh(session);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [session, isSessionExpired, needsRefresh, refreshSession, scheduleRefresh, handleSessionExpired]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Session state
    session,
    user,
    isAuthenticated,
    
    // Refresh state
    isRefreshing,
    lastRefreshAttempt,
    refreshError,
    
    // Session utilities
    isExpired: session ? isSessionExpired(session) : false,
    needsRefresh: session ? needsRefresh(session) : false,
    timeUntilExpiry: getTimeUntilExpiry(session),
    
    // Actions
    refreshSession,
    clearRefreshError: () => setRefreshError(null),
  };
};

export default useSessionManager;

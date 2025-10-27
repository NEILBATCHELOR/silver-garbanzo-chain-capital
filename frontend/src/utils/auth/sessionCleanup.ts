/**
 * Session Cleanup Utilities
 * 
 * Utilities for managing and cleaning up authentication sessions
 */

import { supabase } from '@/infrastructure/database/client';

/**
 * Clear all session data including localStorage
 */
export const clearAllSessionData = async (): Promise<void> => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear Supabase-related localStorage items
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('supabase.auth') || 
        key.startsWith('sb-') ||
        key.includes('supabase')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ All session data cleared');
  } catch (error) {
    console.error('Error clearing session data:', error);
    // Force clear even if signOut fails
    localStorage.clear();
  }
};

/**
 * Validate if current session is valid and not expired
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      return false;
    }
    
    // Check expiry
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && expiresAt > now) {
      return true;
    }
    
    // Session expired
    console.log('Session expired, clearing...');
    await clearAllSessionData();
    return false;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
};

/**
 * Refresh session if valid, clear if expired
 */
export const refreshOrClearSession = async (): Promise<boolean> => {
  try {
    const isValid = await validateSession();
    
    if (!isValid) {
      await clearAllSessionData();
      return false;
    }
    
    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      console.error('Failed to refresh session:', error);
      await clearAllSessionData();
      return false;
    }
    
    console.log('✅ Session refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    await clearAllSessionData();
    return false;
  }
};

/**
 * Check session health and fix issues
 */
export const checkSessionHealth = async (): Promise<{
  healthy: boolean;
  issues: string[];
  fixed: boolean;
}> => {
  const issues: string[] = [];
  let healthy = true;
  let fixed = false;
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      issues.push(`Session error: ${error.message}`);
      healthy = false;
    }
    
    if (!session) {
      issues.push('No active session');
      healthy = false;
      return { healthy, issues, fixed };
    }
    
    if (!session.user) {
      issues.push('Session has no user data');
      healthy = false;
    }
    
    // Check expiry
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && expiresAt <= now) {
      issues.push('Session expired');
      healthy = false;
      await clearAllSessionData();
      fixed = true;
    }
    
    // Check if session expires soon (within 5 minutes)
    if (expiresAt && (expiresAt - now) < 300) {
      issues.push('Session expiring soon, refreshing...');
      const refreshed = await refreshOrClearSession();
      if (refreshed) {
        fixed = true;
        issues[issues.length - 1] = 'Session expiring soon, refreshed successfully';
      } else {
        healthy = false;
      }
    }
    
    return { healthy, issues, fixed };
  } catch (error) {
    issues.push(`Session health check failed: ${error}`);
    return { healthy: false, issues, fixed };
  }
};

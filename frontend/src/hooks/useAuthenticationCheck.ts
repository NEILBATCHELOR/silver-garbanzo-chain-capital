import { useEffect } from 'react';
import { supabase } from '@/infrastructure/database/client';

/**
 * Hook to check user authentication and return user ID
 * 
 * Automatically fetches current user from Supabase auth
 * and calls callback with user ID when authenticated.
 * 
 * @param onAuthenticated - Callback function called with user ID when authenticated
 * @param onError - Optional callback for authentication errors
 * 
 * @example
 * ```tsx
 * useAuthenticationCheck(
 *   (userId) => setCurrentUserId(userId),
 *   (error) => setError(error)
 * );
 * ```
 */
export const useAuthenticationCheck = (
  onAuthenticated: (userId: string) => void,
  onError?: (error: string) => void
) => {
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Authentication error:', error);
          onError?.('Unable to authenticate user. Please log in again.');
          return;
        }
        
        if (user) {
          onAuthenticated(user.id);
        } else {
          onError?.('No authenticated user found. Please log in.');
        }
      } catch (err) {
        console.error('Unexpected authentication error:', err);
        onError?.('Authentication error occurred.');
      }
    };
    
    fetchCurrentUser();
  }, [onAuthenticated, onError]);
};

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/infrastructure/database/client";
import { authService } from '@/components/auth/services/authWrapper';
import type { Session, User } from "@supabase/supabase-js";
import type { 
  SignUpCredentials, 
  SignInWithOtpCredentials,
  VerifyOtpCredentials,
  ResetPasswordCredentials,
  UpdatePasswordCredentials
} from "@/components/auth/types/authTypes";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string, profileType?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  
  // Enhanced methods using comprehensive AuthService
  signUp: (credentials: SignUpCredentials) => Promise<boolean>;
  signInWithOtp: (credentials: SignInWithOtpCredentials) => Promise<boolean>;
  verifyOtp: (credentials: VerifyOtpCredentials) => Promise<boolean>;
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<boolean>;
  updatePassword: (credentials: UpdatePasswordCredentials) => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  updateUser: (attributes: any) => Promise<boolean>;
  resend: (options: any) => Promise<boolean>;
  
  // Additional auth methods
  signInAnonymously: () => Promise<boolean>;
  signInWithOAuth: (provider: string, options?: any) => Promise<boolean>;
  getCurrentUser: () => Promise<User | null>;
  hasPermission: (permissionName: string) => Promise<boolean>;
  
  // State properties
  error: string | null;
  clearError: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signIn: async () => ({ error: new Error("Not implemented") }),
  signOut: async () => {},
  loading: true,
  
  // Enhanced methods
  signUp: async () => false,
  signInWithOtp: async () => false,
  verifyOtp: async () => false,
  resetPassword: async () => false,
  updatePassword: async () => false,
  refreshSession: async () => false,
  updateUser: async () => false,
  resend: async () => false,
  
  // Additional methods
  signInAnonymously: async () => false,
  signInWithOAuth: async () => false,
  getCurrentUser: async () => null,
  hasPermission: async () => false,
  
  // State properties
  error: null,
  clearError: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);
  const isAuthenticated = !!user;

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const response = await authService.getSession();
        
        if (response.success && response.data) {
          setSession(response.data);
          setUser(response.data.user || null);
        } else if (response.error) {
          console.error("Error getting session:", response.error);
          setError(response.error.message);
        }
      } catch (error) {
        console.error("Error getting session:", error);
        setError("Failed to get session");
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Set up auth state change listener
    const { data: authListener } = authService.onAuthStateChange(
      (event, newSession) => {
        console.log(`Auth state changed: ${event}`);
        setSession(newSession);
        setUser(newSession?.user || null);
        setLoading(false);
        
        // Clear errors on successful auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          clearError();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Enhanced sign in using AuthService
  const signIn = async (email: string, password: string, profileType?: string) => {
    try {
      clearError();
      const response = await authService.signIn(email, password, profileType);
      
      if (!response.success || response.error) {
        const errorMsg = response.error?.message || 'Sign in failed';
        setError(errorMsg);
        return { error: response.error };
      }
      
      return { error: null };
    } catch (error) {
      console.error("Error signing in:", error);
      const errorMsg = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMsg);
      return { error };
    }
  };

  // Enhanced sign out using AuthService
  const signOut = async () => {
    try {
      clearError();
      const response = await authService.signOut();
      
      if (!response.success) {
        setError(response.error?.message || 'Sign out failed');
      }
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Sign out failed");
    }
  };

  // Enhanced sign up using AuthService
  const signUp = async (credentials: SignUpCredentials) => {
    try {
      clearError();
      const response = await authService.signUp(credentials);
      
      if (!response.success) {
        setError(response.error?.message || 'Sign up failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error signing up:", error);
      setError("Sign up failed");
      return false;
    }
  };

  // Sign in anonymously
  const signInAnonymously = async () => {
    try {
      clearError();
      const response = await authService.signInAnonymously();
      
      if (!response.success) {
        setError(response.error?.message || 'Anonymous sign in failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      setError("Anonymous sign in failed");
      return false;
    }
  };

  // Sign in with OAuth
  const signInWithOAuth = async (provider: string, options?: any) => {
    try {
      clearError();
      const response = await authService.signInWithOAuth({
        provider: provider as any,
        options
      });
      
      if (!response.success) {
        setError(response.error?.message || 'OAuth sign in failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error signing in with OAuth:", error);
      setError("OAuth sign in failed");
      return false;
    }
  };

  // Enhanced OTP sign in using AuthService
  const signInWithOtp = async (credentials: SignInWithOtpCredentials) => {
    try {
      clearError();
      const response = await authService.signInWithOtp(credentials);
      
      if (!response.success) {
        setError(response.error?.message || 'OTP sign in failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error signing in with OTP:", error);
      setError("OTP sign in failed");
      return false;
    }
  };

  // Enhanced OTP verification using AuthService
  const verifyOtp = async (credentials: VerifyOtpCredentials) => {
    try {
      clearError();
      const response = await authService.verifyOtp(credentials);
      
      if (!response.success) {
        setError(response.error?.message || 'OTP verification failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError("OTP verification failed");
      return false;
    }
  };

  // Enhanced password reset using AuthService
  const resetPassword = async (credentials: ResetPasswordCredentials) => {
    try {
      clearError();
      const response = await authService.resetPassword(credentials);
      
      if (!response.success) {
        setError(response.error?.message || 'Password reset failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error resetting password:", error);
      setError("Password reset failed");
      return false;
    }
  };

  // Enhanced password update using AuthService
  const updatePassword = async (credentials: UpdatePasswordCredentials) => {
    try {
      clearError();
      const response = await authService.updatePassword(credentials);
      
      if (!response.success) {
        setError(response.error?.message || 'Password update failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error updating password:", error);
      setError("Password update failed");
      return false;
    }
  };

  // Enhanced session refresh using AuthService
  const refreshSession = async () => {
    try {
      clearError();
      const response = await authService.refreshSession();
      
      if (!response.success) {
        setError(response.error?.message || 'Session refresh failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error refreshing session:", error);
      setError("Session refresh failed");
      return false;
    }
  };

  // Enhanced user update using AuthService
  const updateUser = async (attributes: any) => {
    try {
      clearError();
      const response = await authService.updateUser(user?.id || '', attributes);
      
      if (!response.success) {
        setError(response.error?.message || 'User update failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      setError("User update failed");
      return false;
    }
  };

  // Enhanced resend using AuthService
  const resend = async (options: any) => {
    try {
      clearError();
      const response = await authService.resend(options);
      
      if (!response.success) {
        setError(response.error?.message || 'Resend failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error resending:", error);
      setError("Resend failed");
      return false;
    }
  };

  // Get current user
  const getCurrentUser = async () => {
    try {
      const response = await authService.getUser();
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  // Check user permission
  const hasPermission = async (permissionName: string) => {
    try {
      if (!user?.id) return false;
      
      return await authService.hasPermission(user.id, permissionName);
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  };

  const value = {
    session,
    user,
    signIn,
    signOut,
    loading,
    
    // Enhanced methods
    signUp,
    signInWithOtp,
    verifyOtp,
    resetPassword,
    updatePassword,
    refreshSession,
    updateUser,
    resend,
    
    // Additional methods
    signInAnonymously,
    signInWithOAuth,
    getCurrentUser,
    hasPermission,
    
    // State properties
    error,
    clearError,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

/**
 * Get the current user ID from the session
 * This is a server-side utility function
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const response = await authService.getSession();
    
    if (response.success && response.data?.user) {
      return response.data.user.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};
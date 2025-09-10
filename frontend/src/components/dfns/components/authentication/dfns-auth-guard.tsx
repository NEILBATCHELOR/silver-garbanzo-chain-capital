/**
 * DFNS Authentication Guard Component
 * 
 * Route protection and session management for authenticated DFNS users
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  User, 
  LogOut,
  RefreshCw,
  Clock
} from 'lucide-react';
import { authService } from '@/services/dfns/authService';
import type { DfnsAuthTokenResponse, DfnsAuthSession } from '@/types/dfns/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: DfnsAuthTokenResponse['user'] | null;
  token: string | null;
  session: DfnsAuthSession | null;
  login: (username: string) => Promise<DfnsAuthTokenResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a DfnsAuthProvider');
  }
  return context;
};

interface DfnsAuthProviderProps {
  children: React.ReactNode;
}

export function DfnsAuthProvider({ children }: DfnsAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<DfnsAuthTokenResponse['user'] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<DfnsAuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check current authentication status
   */
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      // Check if we have a stored token
      const storedToken = localStorage.getItem('dfns_auth_token');
      const storedUser = localStorage.getItem('dfns_auth_user');
      
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check auth status:', error);
      return false;
    }
  };

  /**
   * Handle login
   */
  const login = async (username: string): Promise<DfnsAuthTokenResponse> => {
    try {
      const result = await authService.login(username);
      
      // Store authentication data
      localStorage.setItem('dfns_auth_token', result.token);
      localStorage.setItem('dfns_auth_user', JSON.stringify(result.user));
      
      setToken(result.token);
      setUser(result.user);
      setIsAuthenticated(true);
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  /**
   * Handle logout
   */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('dfns_auth_token');
      localStorage.removeItem('dfns_auth_user');
      
      setToken(null);
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    }
  };

  /**
   * Refresh authentication token
   */
  const refreshToken = async (): Promise<void> => {
    try {
      // This would typically call a refresh token endpoint
      // For now, we'll just check current status
      await checkAuthStatus();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  // Initialize authentication status
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      await checkAuthStatus();
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    token,
    session,
    login,
    logout,
    refreshToken,
    checkAuthStatus
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Initializing DFNS authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

interface DfnsAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  className?: string;
}

export function DfnsAuthGuard({ 
  children, 
  fallback, 
  requireAuth = true, 
  className 
}: DfnsAuthGuardProps) {
  const { isAuthenticated, user, logout, refreshToken } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Handle token refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshToken();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // If authentication is not required, always render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If authenticated, render children
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default unauthenticated state
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Authentication Required</span>
          </CardTitle>
          <CardDescription>
            You need to be logged in to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Please log in to your DFNS account to continue.
            </AlertDescription>
          </Alert>

          <div className="flex space-x-2">
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              variant="outline"
              className="flex-1"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AuthStatusDisplayProps {
  showDetails?: boolean;
  className?: string;
}

export function AuthStatusDisplay({ showDetails = false, className }: AuthStatusDisplayProps) {
  const { isAuthenticated, user, token, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-700">Not Authenticated</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">DFNS Connected</span>
          <Badge variant="secondary">
            {user?.kind || 'User'}
          </Badge>
        </div>

        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          variant="outline"
          size="sm"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Logging out...
            </>
          ) : (
            <>
              <LogOut className="mr-1 h-3 w-3" />
              Logout
            </>
          )}
        </Button>
      </div>

      {showDetails && user && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3" />
            <span>{user.username}</span>
            {user.email && <span>({user.email})</span>}
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-3 w-3" />
            <span>Status: {user.status}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>ID: {user.id.slice(0, 12)}...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DfnsAuthGuard;
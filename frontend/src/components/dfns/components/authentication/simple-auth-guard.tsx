/**
 * Simple Authentication Route Guard
 * 
 * A lightweight component to protect routes without requiring the full auth provider
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  LogIn, 
  AlertCircle, 
  Loader2,
  RefreshCw 
} from 'lucide-react';

interface SimpleAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function SimpleAuthGuard({ children, fallback, className }: SimpleAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  /**
   * Check authentication status
   */
  const checkAuth = () => {
    setIsChecking(true);
    
    try {
      const token = localStorage.getItem('dfns_auth_token');
      const user = localStorage.getItem('dfns_auth_user');
      
      const isAuth = !!(token && user);
      setIsAuthenticated(isAuth);
      
      console.log('🔍 Auth check:', isAuth ? '✅ Authenticated' : '❌ Not authenticated');
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Loading state
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default unauthenticated state
  return (
    <div className={`flex items-center justify-center min-h-[400px] p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Authentication Required</span>
          </CardTitle>
          <CardDescription>
            Please log in to access this feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              You need to be logged in to your DFNS account to view this content.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={checkAuth} 
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Authentication Status
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/wallet/dfns/auth'}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Go to Login Page
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>If you're already logged in, try refreshing the page.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SimpleAuthGuard;
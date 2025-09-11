import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield,
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  authMethod: string;
  user: any;
  error: string | null;
  refreshAuth: () => Promise<void>;
}

const DfnsAuthContext = createContext<AuthContextType | null>(null);

export function useDfnsAuth() {
  const context = useContext(DfnsAuthContext);
  if (!context) {
    throw new Error('useDfnsAuth must be used within DfnsAuthProvider');
  }
  return context;
}

interface DfnsAuthProviderProps {
  children: React.ReactNode;
}

/**
 * DFNS Authentication Provider
 * Provides authentication context and guards for DFNS components
 */
export function DfnsAuthProvider({ children }: DfnsAuthProviderProps) {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
    authMethod: 'NONE',
    user: null,
    error: null as string | null
  });

  const refreshAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const dfnsService = await initializeDfnsService();
      const status = await dfnsService.getAuthenticationStatusAsync();
      
      setAuthState({
        isAuthenticated: status.isAuthenticated,
        isLoading: false,
        authMethod: status.methodDisplayName || 'None',
        user: status.user,
        error: status.error || null
      });

    } catch (error: any) {
      console.error('Auth refresh failed:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        authMethod: 'None',
        user: null,
        error: error.message
      });
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    refreshAuth
  };

  return (
    <DfnsAuthContext.Provider value={contextValue}>
      {children}
    </DfnsAuthContext.Provider>
  );
}

interface DfnsAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * DFNS Authentication Guard
 * Shows auth status and provides fallback for unauthenticated users
 */
export function DfnsAuthGuard({ children, fallback }: DfnsAuthGuardProps) {
  const { isAuthenticated, isLoading, authMethod, error, refreshAuth } = useDfnsAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium mb-2">Connecting to DFNS</h3>
          <p className="text-muted-foreground">
            Checking authentication status...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>DFNS Authentication Required</CardTitle>
            <CardDescription>
              Please authenticate with DFNS to access wallet management features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Current Status: <span className="font-medium">{authMethod}</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                To use DFNS features, you need to:
              </div>
              
              <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Configure your DFNS credentials</li>
                <li>Set up Personal Access Token or Service Account</li>
                <li>Ensure proper environment variables are set</li>
              </ol>
            </div>

            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={refreshAuth}
                className="flex-1 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <Button 
                onClick={() => window.open('https://app.dfns.io', '_blank')}
                className="flex-1 gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                DFNS Dashboard
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Need help? Check the DFNS documentation for setup instructions
                or contact your administrator.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
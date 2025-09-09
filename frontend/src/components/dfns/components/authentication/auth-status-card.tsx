import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertCircle, Clock, User } from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";

interface AuthStatus {
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    username: string;
    email?: string;
    status: string;
    kind: string;
    lastLoginAt?: string;
    mfaEnabled?: boolean;
  } | null;
  sessionExpiry?: string;
  credentialCount: number;
  activeCredentials: number;
}

/**
 * Authentication Status Card Component
 * Displays current authentication status and user information
 */
export function AuthStatusCard() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    currentUser: null,
    credentialCount: 0,
    activeCredentials: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Fetch authentication status
  useEffect(() => {
    const fetchAuthStatus = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const authService = dfnsService.getAuthService();
        const credentialService = dfnsService.getCredentialService();

        // Check if authenticated
        const isAuthenticated = dfnsService.isAuthenticated();
        
        let currentUser = null;
        let credentialCount = 0;
        let activeCredentials = 0;

        if (isAuthenticated) {
          try {
            // Get current session info
            const sessionManager = dfnsService.getSessionManager();
            const sessionInfo = sessionManager.getCurrentSession();
            
            if (sessionInfo) {
              currentUser = {
                id: sessionInfo.user_id || '',
                username: 'Current User', // Username not available in session
                email: undefined, // Email not available in session
                status: 'Active', // Assume active if session exists
                kind: 'EndUser', // Default kind
                lastLoginAt: sessionInfo.last_used_at,
                mfaEnabled: false, // MFA info not available in session
              };
            }

            // Get credential information
            const credentialsResponse = await credentialService.listCredentials();
            credentialCount = credentialsResponse.items.length;
            activeCredentials = credentialsResponse.items.filter(cred => cred.isActive).length;
          } catch (userError) {
            console.warn('Failed to fetch user details:', userError);
          }
        }

        setAuthStatus({
          isAuthenticated,
          currentUser,
          credentialCount,
          activeCredentials,
        });
      } catch (error) {
        console.error('Failed to fetch auth status:', error);
        setError('Failed to fetch authentication status');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthStatus();
  }, [dfnsService]);

  const getStatusIcon = () => {
    if (loading) return <Clock className="h-4 w-4" />;
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (authStatus.isAuthenticated) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <AlertCircle className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusText = () => {
    if (loading) return "Checking...";
    if (error) return "Error";
    if (authStatus.isAuthenticated) return "Authenticated";
    return "Not Authenticated";
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (loading) return "secondary";
    if (error) return "destructive";
    if (authStatus.isAuthenticated) return "default";
    return "outline";
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Authentication Status</CardTitle>
        <Shield className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-3">
          {getStatusIcon()}
          <Badge variant={getStatusVariant()}>{getStatusText()}</Badge>
        </div>
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {authStatus.isAuthenticated && authStatus.currentUser && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{authStatus.currentUser.username}</p>
                {authStatus.currentUser.email && (
                  <p className="text-xs text-muted-foreground">{authStatus.currentUser.email}</p>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {authStatus.currentUser.kind}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge 
                variant={authStatus.currentUser.status === 'Active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {authStatus.currentUser.status}
              </Badge>
            </div>

            {authStatus.currentUser.mfaEnabled !== undefined && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">MFA:</span>
                <Badge 
                  variant={authStatus.currentUser.mfaEnabled ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {authStatus.currentUser.mfaEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Credentials:</span>
              <span className="font-medium">
                {authStatus.activeCredentials}/{authStatus.credentialCount} active
              </span>
            </div>

            {authStatus.currentUser.lastLoginAt && (
              <div className="text-xs text-muted-foreground">
                Last login: {new Date(authStatus.currentUser.lastLoginAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {!authStatus.isAuthenticated && !loading && !error && (
          <div className="text-sm text-muted-foreground">
            <p>Please authenticate to view user details.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

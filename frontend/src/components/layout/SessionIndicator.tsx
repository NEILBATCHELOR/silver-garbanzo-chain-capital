import React, { useState, useEffect } from "react";
import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { useSessionManager } from "@/components/auth/hooks/useSessionManager";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Shield,
  CheckCircle,
  Clock,
  User,
  Wifi,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuthSessionData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  not_after: string | null;
  refreshed_at: string | null;
  user_agent: string;
  ip: string;
}

interface SessionIndicatorProps {
  compact?: boolean;
  showDebug?: boolean;
}

const SessionIndicator: React.FC<SessionIndicatorProps> = ({ 
  compact = false, 
  showDebug = false 
}) => {
  const { user } = useAuth();
  const {
    session,
    isAuthenticated,
    isRefreshing,
    lastRefreshAttempt,
    refreshError,
    isExpired,
    needsRefresh,
    timeUntilExpiry,
    refreshSession,
    clearRefreshError,
  } = useSessionManager({
    autoRefresh: true,
    refreshBuffer: 5,
    onRefreshSuccess: () => {
      console.log('Session refreshed successfully');
      fetchAuthSessionData(); // Refresh session data after successful refresh
    },
    onRefreshError: (error) => {
      console.error('Session refresh failed:', error);
    },
    onSessionExpired: () => {
      console.warn('Session expired');
    },
  });

  const [authSessionData, setAuthSessionData] = useState<AuthSessionData | null>(null);
  const [isLoadingSessionData, setIsLoadingSessionData] = useState(false);
  const [showDebugMode, setShowDebugMode] = useState(showDebug);

  // Use session data available from auth provider and session manager
  // Note: auth.sessions table is not accessible via Supabase client (restricted schema)
  const fetchAuthSessionData = async () => {
    if (!user?.id || !session) return;

    try {
      setIsLoadingSessionData(true);
      
      // Use available session and user data to construct session information
      if (session && user) {
        const sessionData: AuthSessionData = {
          id: session.access_token.split('.')[2] || 'session-id', // Use JWT payload hash as session ID
          user_id: user.id,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString(),
          not_after: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          refreshed_at: session.refresh_token ? user.last_sign_in_at || new Date().toISOString() : null,
          user_agent: navigator.userAgent || 'Unknown',
          ip: 'Client-side' // IP not available in browser context
        };
        setAuthSessionData(sessionData);
      }
    } catch (error) {
      console.warn('Could not construct session data:', error);
      // Graceful fallback - continue without detailed session data
    } finally {
      setIsLoadingSessionData(false);
    }
  };

  // Fetch session data on mount and when session changes
  useEffect(() => {
    fetchAuthSessionData();
  }, [user?.id, session]);

  // Handle session refresh
  const handleRefreshSession = async () => {
    clearRefreshError();
    await refreshSession();
  };

  // Calculate session status using both session manager and auth session data
  const getSessionStatus = () => {
    if (!session || !user || !isAuthenticated) {
      return { status: 'inactive', color: 'destructive' };
    }
    
    if (isExpired) {
      return { status: 'expired', color: 'destructive' };
    }

    // Use auth session data for more accurate status if available
    if (authSessionData) {
      const now = new Date();
      const sessionUpdated = new Date(authSessionData.updated_at);
      const sessionExpires = authSessionData.not_after ? new Date(authSessionData.not_after) : null;
      
      // Check if session is expired based on auth data
      if (sessionExpires && sessionExpires < now) {
        return { status: 'expired', color: 'destructive' };
      }
      
      // Check if session is recently active (within last 5 minutes)
      if ((now.getTime() - sessionUpdated.getTime()) < 5 * 60 * 1000) {
        return { status: 'active', color: 'default' };
      }
    }
    
    // Fallback to session manager status
    if (needsRefresh || timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
      return { status: 'expiring', color: 'warning' };
    }
    
    if (timeUntilExpiry < 30 * 60 * 1000) { // Less than 30 minutes
      return { status: 'live', color: 'secondary' };
    }
    
    return { status: 'active', color: 'default' };
  };

  const sessionStatus = getSessionStatus();

  // Format time until expiry
  const getExpiryDisplay = () => {
    // Prefer auth session data if available
    if (authSessionData?.not_after) {
      const expiryDate = new Date(authSessionData.not_after);
      const now = new Date();
      if (expiryDate < now) return 'Expired';
      return `Expires ${formatDistanceToNow(expiryDate, { addSuffix: true })}`;
    }
    
    // Fallback to session manager data
    if (!session?.expires_at) return 'Session active';
    if (isExpired) return 'Expired';
    if (timeUntilExpiry === Infinity) return 'No expiry';
    
    const expiryDate = new Date(session.expires_at * 1000);
    return `Expires ${formatDistanceToNow(expiryDate, { addSuffix: true })}`;
  };

  // Compact view for header integration
  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
            <Badge variant={sessionStatus.color as any} className="h-5 px-1 text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              {sessionStatus.status === 'active' ? 'Live' : 
               sessionStatus.status === 'live' ? 'Online' : 
               sessionStatus.status === 'expiring' ? 'Expiring' :
               sessionStatus.status === 'expired' ? 'Expired' : 'Offline'}
            </Badge>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <SessionIndicator compact={false} showDebug={showDebugMode} />
        </PopoverContent>
      </Popover>
    );
  }

  // Full detailed view
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Session Status</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugMode(!showDebugMode)}
                className="h-6 px-2"
              >
                {showDebugMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshSession}
                disabled={isRefreshing}
                className="h-6 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Session Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={sessionStatus.color as any} className="px-2 py-1">
              {sessionStatus.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
              {sessionStatus.status === 'live' && <Wifi className="h-3 w-3 mr-1" />}
              {sessionStatus.status === 'expiring' && <Clock className="h-3 w-3 mr-1" />}
              {sessionStatus.status === 'expired' && <AlertCircle className="h-3 w-3 mr-1" />}
              {sessionStatus.status === 'inactive' && <AlertCircle className="h-3 w-3 mr-1" />}
              
              {sessionStatus.status === 'active' && 'Session Active'}
              {sessionStatus.status === 'live' && 'Session Live'}
              {sessionStatus.status === 'expiring' && 'Session Expiring Soon'}
              {sessionStatus.status === 'expired' && 'Session Expired'}
              {sessionStatus.status === 'inactive' && 'No Session'}
            </Badge>
          </div>

          {/* Error Display */}
          {refreshError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {refreshError}
            </div>
          )}

          {/* User Information */}
          {user && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {user.user_metadata?.name || user.email}
                </span>
                <Badge variant="outline" className="text-xs">
                  Authenticated
                </Badge>
              </div>
              
              {showDebugMode && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>User ID: {user.id}</div>
                  <div>Email: {user.email}</div>
                  <div>Email Confirmed: {user.email_confirmed_at ? 'Yes' : 'No'}</div>
                  <div>Last Sign In: {user.last_sign_in_at ? 
                    formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}</div>
                </div>
              )}
            </div>
          )}

          {/* Session Timing Information */}
          {(session || authSessionData) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Session Timing</span>
                {isLoadingSessionData && (
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              
              <div className="text-xs space-y-1">
                {authSessionData && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDistanceToNow(new Date(authSessionData.created_at), { addSuffix: true })}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{formatDistanceToNow(new Date(authSessionData.updated_at), { addSuffix: true })}</span>
                    </div>
                    
                    {authSessionData.refreshed_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Refreshed:</span>
                        <span>{formatDistanceToNow(new Date(authSessionData.refreshed_at), { addSuffix: true })}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span>
                        {authSessionData.not_after 
                          ? formatDistanceToNow(new Date(authSessionData.not_after), { addSuffix: true })
                          : 'On inactivity'
                        }
                      </span>
                    </div>
                  </>
                )}
                
                {!authSessionData && session && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span>{getExpiryDisplay()}</span>
                    </div>
                    
                    {session.expires_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expires:</span>
                        <span>
                          {isExpired 
                            ? 'Expired' 
                            : formatDistanceToNow(new Date(session.expires_at * 1000), { addSuffix: true })
                          }
                        </span>
                      </div>
                    )}
                    
                    {timeUntilExpiry !== Infinity && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time Remaining:</span>
                        <span>
                          {isExpired 
                            ? 'Expired' 
                            : Math.floor(timeUntilExpiry / (1000 * 60)) + ' minutes'
                          }
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                {lastRefreshAttempt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manual Refresh:</span>
                    <span>{formatDistanceToNow(lastRefreshAttempt, { addSuffix: true })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug Information */}
          {showDebugMode && (
            <div className="space-y-2 border-t pt-2">
              <div className="text-xs font-medium">Debug Information</div>
              
              {authSessionData && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-blue-600">Auth Session Data:</div>
                  <div>Session ID: {authSessionData.id}</div>
                  <div>User ID: {authSessionData.user_id}</div>
                  <div>User Agent: {authSessionData.user_agent.substring(0, 50)}...</div>
                  <div>IP Address: {authSessionData.ip}</div>
                  <div>Created: {new Date(authSessionData.created_at).toLocaleString()}</div>
                  <div>Updated: {new Date(authSessionData.updated_at).toLocaleString()}</div>
                  {authSessionData.not_after && (
                    <div>Expires: {new Date(authSessionData.not_after).toLocaleString()}</div>
                  )}
                  {authSessionData.refreshed_at && (
                    <div>Refreshed: {new Date(authSessionData.refreshed_at).toLocaleString()}</div>
                  )}
                </div>
              )}
              
              {session && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-green-600">Session Manager Data:</div>
                  <div>Token Type: {session.token_type || 'bearer'}</div>
                  <div>Refresh Token: {session.refresh_token ? 'Present' : 'Missing'}</div>
                  <div>Auto Refresh: {needsRefresh ? 'Needed' : 'Not needed'}</div>
                  <div>Refreshing: {isRefreshing ? 'Yes' : 'No'}</div>
                  <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
                  <div>Expired: {isExpired ? 'Yes' : 'No'}</div>
                  {refreshError && <div>Last Error: {refreshError}</div>}
                </div>
              )}
              
              {!authSessionData && (
                <div className="text-xs text-amber-600">
                  Auth session data not available (may be restricted)
                </div>
              )}
            </div>
          )}

          {/* Session Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshSession}
              disabled={isRefreshing}
              className="flex-1"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Session
            </Button>
            
            {(isExpired || sessionStatus.status === 'expired') && (
              <Button
                variant="default"
                size="sm"
                onClick={() => window.location.href = '/auth/login'}
                className="flex-1"
              >
                Sign In Again
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionIndicator;
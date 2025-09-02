/**
 * Security Settings Page
 * 
 * Page for managing account security settings including TOTP/2FA
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Key, Smartphone, Settings, Link2, Activity, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { TOTPManagement, TOTPSetupForm, IdentityManagement, PhoneNumberManagement, ReAuthenticationModal } from '@/components/auth/components';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { useSessionManager } from '../hooks/useSessionManager';
import { jwtUtils } from '../utils/jwtUtils';

export const SecuritySettingsPage: React.FC = () => {
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { user, session } = useAuth();
  const sessionManager = useSessionManager({
    autoRefresh: true,
    refreshBuffer: 5,
  });

  // Get security status
  const isEmailVerified = !!user?.email_confirmed_at;
  const isPhoneVerified = !!user?.phone_confirmed_at;
  const hasPhoneNumber = !!user?.phone;
  const sessionExpiry = jwtUtils.getSessionExpiry(session as any);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSetupTOTP = () => {
    setShowTOTPSetup(true);
  };

  const handleTOTPSetupSuccess = () => {
    setShowTOTPSetup(false);
  };

  const handleTOTPSetupCancel = () => {
    setShowTOTPSetup(false);
  };

  const handleSensitiveAction = (action: string) => {
    setPendingAction(action);
    setShowReAuthModal(true);
  };

  const handleReAuthSuccess = () => {
    console.log('Re-authentication successful for action:', pendingAction);
    setPendingAction(null);
  };

  if (showTOTPSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={handleTOTPSetupCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Security
            </Button>
            
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Set Up Authenticator</h1>
            </div>
            
            <div className="w-32" />
          </div>

          <div className="max-w-lg mx-auto">
            <TOTPSetupForm
              onSuccess={handleTOTPSetupSuccess}
              onCancel={handleTOTPSetupCancel}
              showHeader={true}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Security Settings</h1>
          </div>
          
          <div className="w-40" /> {/* Spacer for centering */}
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Security Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Security Overview
              </CardTitle>
              <CardDescription>
                Your account security status and session information
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Session Info */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Current Session
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Valid until: {sessionExpiry.expiresAt?.toLocaleString() || 'Never'}</p>
                    <p>Time remaining: {sessionExpiry.timeUntilExpiryFormatted}</p>
                    {sessionManager.lastRefreshAttempt && (
                      <p>Last refresh: {sessionManager.lastRefreshAttempt.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* Account Status */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Account Status
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span>Email:</span>
                      <Badge variant={isEmailVerified ? "default" : "secondary"} className="text-xs">
                        {isEmailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>Phone:</span>
                      <Badge variant={isPhoneVerified ? "default" : "secondary"} className="text-xs">
                        {hasPhoneNumber ? (isPhoneVerified ? 'Verified' : 'Added') : 'Not added'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {sessionManager.refreshError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Session refresh failed: {sessionManager.refreshError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="2fa" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="2fa" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Two-Factor Auth
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Linked Accounts
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Sessions
              </TabsTrigger>
            </TabsList>

            {/* Two-Factor Authentication Tab */}
            <TabsContent value="2fa" className="space-y-6">
              <TOTPManagement onSetupNew={handleSetupTOTP} />
            </TabsContent>

            {/* Phone Management Tab */}
            <TabsContent value="phone" className="space-y-6">
              <PhoneNumberManagement showAddButton={true} />
            </TabsContent>

            {/* Linked Accounts Tab */}
            <TabsContent value="accounts" className="space-y-6">
              <IdentityManagement showAddButton={true} />
            </TabsContent>



            {/* Session Management Tab */}
            <TabsContent value="sessions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Session Management
                  </CardTitle>
                  <CardDescription>
                    Manage your active sessions and automatic refresh settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Automatic Session Refresh</h4>
                      <p className="text-sm text-muted-foreground">
                        Sessions are automatically refreshed to keep you signed in
                      </p>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={sessionManager.refreshSession}
                      disabled={sessionManager.isRefreshing}
                      variant="outline"
                      size="sm"
                    >
                      {sessionManager.isRefreshing ? 'Refreshing...' : 'Refresh Session'}
                    </Button>
                    
                    <Button 
                      onClick={() => handleSensitiveAction('view_session_details')}
                      variant="outline"
                      size="sm"
                    >
                      View Session Details
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Current Session</h4>
                        <p className="text-sm text-muted-foreground">
                          This device • Active now
                        </p>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Current
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h5 className="font-medium">Sign Out All Other Sessions</h5>
                        <p className="text-sm text-muted-foreground">
                          This will sign you out on all other devices
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSensitiveAction('signout_all_sessions')}
                      >
                        Sign Out Others
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Notifications</CardTitle>
                  <CardDescription>
                    Get notified about important security events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Login Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone signs into your account
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Re-authentication Modal */}
      <ReAuthenticationModal
        open={showReAuthModal}
        onOpenChange={setShowReAuthModal}
        onSuccess={handleReAuthSuccess}
        title="Verify your identity"
        description="This action requires re-authentication for security purposes."
        actionText="Verify"
      />
    </div>
  );
};

export default SecuritySettingsPage;

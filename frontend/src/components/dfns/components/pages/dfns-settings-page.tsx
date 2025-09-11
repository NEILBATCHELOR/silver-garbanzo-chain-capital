import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings,
  Webhook,
  Network,
  Key,
  AlertTriangle,
  Loader2,
  Save
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import { getDfnsService, initializeDfnsService } from '@/services/dfns';

/**
 * DFNS Settings Page
 * Configuration and preferences management
 */
export function DfnsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();
        
        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view settings');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings & Configuration</h2>
        <p className="text-muted-foreground">
          Manage DFNS platform settings, webhooks, and preferences
        </p>
      </div>

      {error && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              DFNS Settings
            </CardTitle>
            <CardDescription>
              Global DFNS platform configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Configuration
            </CardTitle>
            <CardDescription>
              Manage webhooks for real-time notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Webhook className="h-4 w-4 mr-2" />
              Manage Webhooks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Preferences
            </CardTitle>
            <CardDescription>
              Configure preferred networks and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Network className="h-4 w-4 mr-2" />
              Network Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Manage API keys and authentication settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Endpoint</label>
                <p className="text-sm text-muted-foreground">https://api.dfns.co</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Application ID</label>
                <p className="text-sm text-muted-foreground">Configured via environment</p>
              </div>
              <Button variant="outline" className="w-full">
                <Key className="h-4 w-4 mr-2" />
                Manage API Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Preferences</CardTitle>
            <CardDescription>
              Personal settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Network</label>
                <p className="text-sm text-muted-foreground">Ethereum</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notifications</label>
                <p className="text-sm text-muted-foreground">Email notifications enabled</p>
              </div>
              <Button variant="outline" className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            This will display advanced configuration options once implemented
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Advanced Configuration</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Advanced settings and configuration interface will be implemented here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

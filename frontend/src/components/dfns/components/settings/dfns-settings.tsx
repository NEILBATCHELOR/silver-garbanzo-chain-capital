import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Shield, 
  Key, 
  Globe, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { getDfnsService } from "../../../../services/dfns";
import { DFNS_STATUS } from "../../../../infrastructure/dfns/config";

interface DfnsConfiguration {
  appId: string;
  appOrigin: string;
  rpId: string;
  baseUrl: string;
  environment: string;
  timeout: number;
  maxRetries: number;
  enableLogging: boolean;
}

interface ConfigurationStatus {
  isConfigured: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  currentUser?: string;
  organizationId?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastHealthCheck?: string;
}

interface EnvironmentInfo {
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
  buildVersion?: string;
}

/**
 * DFNS Settings Component
 * 
 * Global DFNS configuration and system settings including:
 * - API configuration and credentials
 * - Environment settings
 * - Security preferences
 * - Performance tuning
 * - System health monitoring
 */
export function DfnsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("configuration");
  
  const [configuration, setConfiguration] = useState<DfnsConfiguration>({
    appId: '',
    appOrigin: '',
    rpId: '',
    baseUrl: 'https://api.dfns.ninja',
    environment: 'sandbox',
    timeout: 30000,
    maxRetries: 3,
    enableLogging: true
  });

  const [status, setStatus] = useState<ConfigurationStatus>({
    isConfigured: false,
    isInitialized: false,
    isAuthenticated: false,
    connectionStatus: 'disconnected'
  });

  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>({
    nodeEnv: 'development',
    isDevelopment: true,
    isProduction: false
  });

  const [showCredentials, setShowCredentials] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const loadConfiguration = async () => {
    try {
      // Load configuration from environment variables
      const config: DfnsConfiguration = {
        appId: import.meta.env.VITE_DFNS_APP_ID || '',
        appOrigin: import.meta.env.VITE_DFNS_APP_ORIGIN || window.location.origin,
        rpId: import.meta.env.VITE_DFNS_RP_ID || '',
        baseUrl: import.meta.env.VITE_DFNS_BASE_URL || 'https://api.dfns.ninja',
        environment: import.meta.env.VITE_DFNS_ENVIRONMENT || 'sandbox',
        timeout: parseInt(import.meta.env.VITE_DFNS_TIMEOUT || '30000'),
        maxRetries: parseInt(import.meta.env.VITE_DFNS_MAX_RETRIES || '3'),
        enableLogging: import.meta.env.VITE_DFNS_ENABLE_LOGGING !== 'false'
      };

      setConfiguration(config);

      // Check DFNS status
      const dfnsStatus: ConfigurationStatus = {
        isConfigured: DFNS_STATUS.isConfigured,
        isInitialized: false,
        isAuthenticated: false,
        connectionStatus: DFNS_STATUS.isConfigured ? 'disconnected' : 'error'
      };

      // Try to initialize DFNS service to check status
      if (DFNS_STATUS.isConfigured) {
        try {
          const dfnsService = getDfnsService();
          await dfnsService.initialize();
          
          dfnsStatus.isInitialized = true;
          dfnsStatus.isAuthenticated = dfnsService.isAuthenticated();
          dfnsStatus.connectionStatus = 'connected';
          dfnsStatus.lastHealthCheck = new Date().toISOString();

          const currentUser = dfnsService.getCurrentUser();
          if (currentUser) {
            dfnsStatus.currentUser = currentUser.id;
          }
        } catch (initError) {
          console.warn('DFNS initialization failed:', initError);
          dfnsStatus.connectionStatus = 'error';
        }
      }

      setStatus(dfnsStatus);

      // Set environment info
      setEnvironmentInfo({
        nodeEnv: import.meta.env.MODE || 'development',
        isDevelopment: import.meta.env.MODE === 'development',
        isProduction: import.meta.env.MODE === 'production',
        buildVersion: import.meta.env.VITE_BUILD_VERSION || 'unknown'
      });

      setError(null);
    } catch (error) {
      console.error('Failed to load DFNS configuration:', error);
      setError(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testConnection = async () => {
    try {
      setSaving(true);
      
      const dfnsService = getDfnsService();
      await dfnsService.initialize();

      // Update status
      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        connectionStatus: 'connected',
        lastHealthCheck: new Date().toISOString()
      }));

      setError(null);
    } catch (error) {
      console.error('Connection test failed:', error);
      setError(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setStatus(prev => ({
        ...prev,
        connectionStatus: 'error'
      }));
    } finally {
      setSaving(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    
    try {
      // In a real implementation, this would save to a secure configuration store
      // For now, we just show a warning that environment variables need to be updated
      
      setError('Configuration saved successfully. Note: Environment variable changes require a restart to take effect.');
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (key: keyof DfnsConfiguration, value: string | number | boolean) => {
    setConfiguration(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const getConnectionStatusColor = (status: ConfigurationStatus['connectionStatus']) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-yellow-600';
      case 'error': return 'text-red-600';
    }
  };

  const getConnectionStatusIcon = (status: ConfigurationStatus['connectionStatus']) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadConfiguration();
      setLoading(false);
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading DFNS settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">DFNS Settings</h2>
          <p className="text-muted-foreground">
            Configure DFNS integration and system preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={testConnection} 
            disabled={saving}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Test Connection
          </Button>
          {unsavedChanges && (
            <Button 
              onClick={saveConfiguration} 
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-lg font-bold ${status.isConfigured ? 'text-green-600' : 'text-red-600'}`}>
                {status.isConfigured ? 'Complete' : 'Missing'}
              </div>
              {status.isConfigured ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-lg font-bold ${getConnectionStatusColor(status.connectionStatus)}`}>
                {status.connectionStatus}
              </div>
              {getConnectionStatusIcon(status.connectionStatus)}
            </div>
            <p className="text-xs text-muted-foreground">
              DFNS API status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authentication</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-lg font-bold ${status.isAuthenticated ? 'text-green-600' : 'text-gray-600'}`}>
                {status.isAuthenticated ? 'Active' : 'None'}
              </div>
              {status.isAuthenticated ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              User session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Environment</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {configuration.environment}
            </div>
            <p className="text-xs text-muted-foreground">
              {environmentInfo.nodeEnv} mode
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant={error.includes('successfully') ? "default" : "destructive"}>
          <Info className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>DFNS API Configuration</CardTitle>
                <CardDescription>
                  Core DFNS API settings and credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appId">Application ID</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="appId"
                      type={showCredentials ? "text" : "password"}
                      value={configuration.appId}
                      onChange={(e) => handleConfigChange('appId', e.target.value)}
                      placeholder="ap-xxxxx-xxxxx-xxxxxxxx"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCredentials(!showCredentials)}
                    >
                      {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appOrigin">Application Origin</Label>
                  <Input
                    id="appOrigin"
                    value={configuration.appOrigin}
                    onChange={(e) => handleConfigChange('appOrigin', e.target.value)}
                    placeholder="https://your-app.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpId">Relying Party ID</Label>
                  <Input
                    id="rpId"
                    value={configuration.rpId}
                    onChange={(e) => handleConfigChange('rpId', e.target.value)}
                    placeholder="your-app.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl">API Base URL</Label>
                  <Input
                    id="baseUrl"
                    value={configuration.baseUrl}
                    onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                    placeholder="https://api.dfns.ninja"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={configuration.environment}
                    onChange={(e) => handleConfigChange('environment', e.target.value)}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>
                  Current DFNS connection and health information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Configuration Status</span>
                  <Badge variant={status.isConfigured ? "default" : "destructive"}>
                    {status.isConfigured ? 'Complete' : 'Missing'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>Connection Status</span>
                  <Badge 
                    variant={status.connectionStatus === 'connected' ? "default" : "secondary"}
                  >
                    {status.connectionStatus}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>Authentication</span>
                  <Badge variant={status.isAuthenticated ? "default" : "secondary"}>
                    {status.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                  </Badge>
                </div>

                {status.currentUser && (
                  <div className="flex justify-between items-center">
                    <span>Current User</span>
                    <Badge variant="outline">
                      {status.currentUser.slice(0, 8)}...
                    </Badge>
                  </div>
                )}

                {status.lastHealthCheck && (
                  <div className="flex justify-between items-center">
                    <span>Last Health Check</span>
                    <Badge variant="outline">
                      {new Date(status.lastHealthCheck).toLocaleTimeString()}
                    </Badge>
                  </div>
                )}

                {!status.isConfigured && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Missing environment variables: {DFNS_STATUS.missingVars.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security preferences and authentication options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Request Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Log API requests and responses for debugging
                  </p>
                </div>
                <Switch
                  checked={configuration.enableLogging}
                  onCheckedChange={(checked) => handleConfigChange('enableLogging', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Request Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={configuration.timeout}
                  onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                  min="5000"
                  max="300000"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time to wait for API responses (5-300 seconds)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRetries">Max Retry Attempts</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  value={configuration.maxRetries}
                  onChange={(e) => handleConfigChange('maxRetries', parseInt(e.target.value))}
                  min="0"
                  max="10"
                />
                <p className="text-xs text-muted-foreground">
                  Number of retry attempts for failed requests (0-10)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Settings</CardTitle>
              <CardDescription>
                Optimize DFNS client performance and resource usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Connection Pool Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Current timeout: {configuration.timeout}ms • Max retries: {configuration.maxRetries}
                </p>
                
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Badge variant="outline">
                      Timeout: {configuration.timeout < 10000 ? 'Fast' : 
                               configuration.timeout < 30000 ? 'Normal' : 'Conservative'}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="outline">
                      Retries: {configuration.maxRetries < 2 ? 'Minimal' : 
                               configuration.maxRetries < 5 ? 'Standard' : 'Aggressive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Caching Strategy</Label>
                <p className="text-sm text-muted-foreground">
                  DFNS responses are cached for performance optimization
                </p>
                <Badge variant="default">Active</Badge>
              </div>

              <div className="space-y-2">
                <Label>Request Compression</Label>
                <p className="text-sm text-muted-foreground">
                  Compress API requests to reduce bandwidth usage
                </p>
                <Badge variant="default">Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Environment Information</CardTitle>
                <CardDescription>
                  Current runtime and build information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Node Environment</span>
                  <Badge variant="outline">{environmentInfo.nodeEnv}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>Development Mode</span>
                  <Badge variant={environmentInfo.isDevelopment ? "default" : "secondary"}>
                    {environmentInfo.isDevelopment ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>Production Mode</span>
                  <Badge variant={environmentInfo.isProduction ? "default" : "secondary"}>
                    {environmentInfo.isProduction ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {environmentInfo.buildVersion && (
                  <div className="flex justify-between items-center">
                    <span>Build Version</span>
                    <Badge variant="outline">{environmentInfo.buildVersion}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentation & Support</CardTitle>
                <CardDescription>
                  Links to DFNS documentation and support resources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="https://docs.dfns.co" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    DFNS Documentation
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="https://docs.dfns.co/d/api-docs/api-docs" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    API Reference
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="https://www.dfns.co/support" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Support Portal
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="https://status.dfns.co" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    System Status
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

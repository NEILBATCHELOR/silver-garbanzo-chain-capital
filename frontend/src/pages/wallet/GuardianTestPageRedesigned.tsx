import { sha512 } from '@noble/hashes/sha512';
import { ed25519 } from '@noble/curves/ed25519';

// Set up crypto polyfill for Guardian authentication
if (ed25519.utils && typeof ed25519.utils === 'object') {
  (ed25519.utils as any).sha512Sync = sha512;
}

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, CheckCircle, XCircle, Wallet, Database, Clock, RefreshCw, 
  Activity, BarChart3, TrendingUp, AlertCircle, Plus, Search, 
  Eye, Layers, Timer, Target, Hash, Copy, Check
} from 'lucide-react';
import { GuardianApiClient } from '@/infrastructure/guardian/GuardianApiClient';
import { GuardianPollingService } from '@/infrastructure/guardian/GuardianPollingService';
import { GuardianSyncService } from '@/services/guardian/GuardianSyncService';
import { GuardianTestDatabaseService } from '@/services/guardian/GuardianTestDatabaseService';

interface GuardianApiWallet {
  id: string;
  externalId?: string;
  status: string;
  accounts?: Array<{
    type: string;
    address: string;
    network: string;
  }>;
  [key: string]: any;
}

interface GuardianApiOperation {
  id: string;
  status: string;
  type?: string;
  result?: any;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface ApiStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  lastRequestTime?: Date;
  requestHistory: Array<{
    endpoint: string;
    method: string;
    status: number;
    responseTime: number;
    timestamp: Date;
  }>;
}

interface EndpointMetrics {
  name: string;
  method: string;
  url: string;
  successCount: number;
  errorCount: number;
  totalRequests: number;
  avgResponseTime: number;
  lastUsed?: Date;
  lastResponse?: any;
  lastError?: string;
}

export default function GuardianTestPageRedesigned() {
  // API Data State
  const [apiWallets, setApiWallets] = useState<GuardianApiWallet[]>([]);
  const [apiOperations, setApiOperations] = useState<GuardianApiOperation[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<GuardianApiWallet | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<GuardianApiOperation | null>(null);
  
  // UI State
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletId, setWalletId] = useState('');
  const [operationId, setOperationId] = useState('');
  
  // Copy functionality state
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  
  // Wallet details modal state
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  
  // Stats and Metrics
  const [apiStats, setApiStats] = useState<ApiStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    requestHistory: []
  });
  
  const [endpointMetrics, setEndpointMetrics] = useState<EndpointMetrics[]>([
    { name: 'Create Wallet', method: 'POST', url: '/api/v1/wallets/create', successCount: 0, errorCount: 0, totalRequests: 0, avgResponseTime: 0 },
    { name: 'List Wallets', method: 'GET', url: '/api/v1/wallets', successCount: 0, errorCount: 0, totalRequests: 0, avgResponseTime: 0 },
    { name: 'Get Wallet', method: 'GET', url: '/api/v1/wallets/{id}', successCount: 0, errorCount: 0, totalRequests: 0, avgResponseTime: 0 },
    { name: 'List Operations', method: 'GET', url: '/api/v1/operations', successCount: 0, errorCount: 0, totalRequests: 0, avgResponseTime: 0 },
    { name: 'Get Operation', method: 'GET', url: '/api/v1/operations/{id}', successCount: 0, errorCount: 0, totalRequests: 0, avgResponseTime: 0 }
  ]);

  // Services
  const apiClient = new GuardianApiClient();
  const pollingService = new GuardianPollingService();
  const syncService = new GuardianSyncService();

  const updateMetrics = useCallback((endpoint: string, method: string, success: boolean, responseTime: number, response?: any, error?: string) => {
    const timestamp = new Date();
    
    // Update API stats
    setApiStats(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      successfulRequests: prev.successfulRequests + (success ? 1 : 0),
      failedRequests: prev.failedRequests + (success ? 0 : 1),
      avgResponseTime: ((prev.avgResponseTime * prev.totalRequests) + responseTime) / (prev.totalRequests + 1),
      lastRequestTime: timestamp,
      requestHistory: [...prev.requestHistory.slice(-19), {
        endpoint,
        method,
        status: success ? 200 : 400,
        responseTime,
        timestamp
      }]
    }));

    // Update endpoint metrics
    setEndpointMetrics(prev => prev.map(metric => {
      if (metric.url === endpoint && metric.method === method) {
        return {
          ...metric,
          successCount: metric.successCount + (success ? 1 : 0),
          errorCount: metric.errorCount + (success ? 0 : 1),
          totalRequests: metric.totalRequests + 1,
          avgResponseTime: ((metric.avgResponseTime * metric.totalRequests) + responseTime) / (metric.totalRequests + 1),
          lastUsed: timestamp,
          lastResponse: success ? response : undefined,
          lastError: success ? undefined : error
        };
      }
      return metric;
    }));
  }, []);

  const makeApiCall = useCallback(async (
    endpoint: string, 
    method: string, 
    apiCall: () => Promise<any>,
    onSuccess?: (response: any) => void
  ) => {
    const startTime = Date.now();
    try {
      const response = await apiCall();
      const responseTime = Date.now() - startTime;
      updateMetrics(endpoint, method, true, responseTime, response);
      setResult(response);
      setError(null);
      if (onSuccess) onSuccess(response);
      return response;
    } catch (err) {
      const responseTime = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      updateMetrics(endpoint, method, false, responseTime, undefined, errorMessage);
      setError(errorMessage);
      setResult(null);
      throw err;
    }
  }, [updateMetrics]);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading('loading_all');
    try {
      await Promise.all([
        loadWallets(),
        loadOperations()
      ]);
    } finally {
      setLoading(null);
    }
  };

  const loadWallets = async () => {
    try {
      const response = await makeApiCall('/api/v1/wallets', 'GET', () => apiClient.getWallets());
      setApiWallets(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load wallets:', error);
      setApiWallets([]);
    }
  };

  const loadOperations = async () => {
    try {
      const response = await makeApiCall('/api/v1/operations', 'GET', () => apiClient.listOperations());
      setApiOperations(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load operations:', error);
      setApiOperations([]);
    }
  };

  const createWallet = async () => {
    setLoading('create_wallet');
    try {
      const walletId = crypto.randomUUID();
      const response = await makeApiCall('/api/v1/wallets/create', 'POST', 
        () => apiClient.createWallet({ id: walletId }),
        (response) => {
          console.log('✅ Wallet creation response:', response);
          
          // Store the operation ID for tracking
          if (response.operationId) {
            setOperationId(response.operationId);
            console.log(`🔍 Tracking operation ID: ${response.operationId}`);
            
            // Start polling the specific operation until completion
            pollOperationUntilComplete(response.operationId);
          }
        }
      );
    } finally {
      setLoading(null);
    }
  };

  // New function to poll a specific operation until completion using robust polling service
  const pollOperationUntilComplete = async (opId: string) => {
    console.log(`🔄 Starting robust polling for operation ${opId} until completion...`);
    
    try {
      const result = await pollingService.pollOperationWithProgress(
        opId,
        (attempt, status, elapsed) => {
          console.log(`📊 Poll attempt ${attempt}: Status=${status}, Elapsed=${elapsed}ms`);
          // Update UI with progress if needed
        },
        {
          maxAttempts: 20,
          intervalMs: 3000,
          timeoutMs: 60000
        }
      );
      
      console.log('🎯 Polling completed:', result);
      
      if (result.status === 'processed') {
        console.log('✅ Operation completed successfully!', result.result);
        // Get the latest operation data and update UI
        const latestOperation = await apiClient.getOperation(opId);
        setSelectedOperation(latestOperation);
        
        // Refresh all data to show updated wallet
        loadWallets();
        loadOperations();
      } else {
        console.error('❌ Operation did not complete successfully:', result);
      }
      
    } catch (error) {
      console.error('❌ Error during operation polling:', error);
    }
  };

  const getWalletDetails = async () => {
    if (!walletId) return;
    setLoading('get_wallet');
    try {
      const response = await makeApiCall(`/api/v1/wallets/${walletId}`, 'GET', 
        () => apiClient.getWallet(walletId),
        (wallet) => setSelectedWallet(wallet)
      );
    } finally {
      setLoading(null);
    }
  };

  const getOperationDetails = async () => {
    if (!operationId) return;
    setLoading('get_operation');
    try {
      await makeApiCall(`/api/v1/operations/${operationId}`, 'GET', 
        () => apiClient.getOperation(operationId),
        (operation) => setSelectedOperation(operation)
      );
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'processed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'error': 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'} text-xs`}>
        {status}
      </Badge>
    );
  };

  const getSuccessRate = (metric: EndpointMetrics) => {
    if (metric.totalRequests === 0) return 0;
    return Math.round((metric.successCount / metric.totalRequests) * 100);
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatResponseTime = (ms: number) => {
    return `${ms.toFixed(0)}ms`;
  };

  // Copy functionality
  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set(prev).add(item));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Wallet details functions
  const viewWalletDetails = async (wallet: GuardianApiWallet) => {
    setSelectedWallet(wallet);
    setShowWalletDetails(true);
    
    // Optionally fetch fresh details from API
    try {
      const freshDetails = await apiClient.getWallet(wallet.id);
      setSelectedWallet({ ...wallet, ...freshDetails });
    } catch (error) {
      console.error('Failed to fetch fresh wallet details:', error);
    }
  };

  const getPrimaryAddress = (accounts?: Array<{ type: string; address: string; network: string }>) => {
    if (!accounts || accounts.length === 0) return 'No address';
    // Return first account address as primary
    return accounts[0].address;
  };

  const formatApiDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Guardian API Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive Guardian Medex API testing with real-time metrics and analytics
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{apiStats.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">
                  {apiStats.totalRequests > 0 ? Math.round((apiStats.successfulRequests / apiStats.totalRequests) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold">{formatResponseTime(apiStats.avgResponseTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Live Data</p>
                <p className="text-2xl font-bold">{apiWallets.length}/{apiOperations.length}</p>
                <p className="text-xs text-gray-500">Wallets/Ops</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Last Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Endpoints Overview */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                API Endpoints Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endpointMetrics.map((metric, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {metric.method}
                            </Badge>
                            <h3 className="font-semibold">{metric.name}</h3>
                          </div>
                          <p className="text-sm text-gray-600 font-mono">{metric.url}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold">{getSuccessRate(metric)}%</span>
                            <TrendingUp className={`h-4 w-4 ${getSuccessRate(metric) >= 80 ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                          <p className="text-xs text-gray-500">Success Rate</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Requests</p>
                          <p className="font-semibold">{metric.totalRequests}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Success</p>
                          <p className="font-semibold text-green-600">{metric.successCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Errors</p>
                          <p className="font-semibold text-red-600">{metric.errorCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Response</p>
                          <p className="font-semibold">{formatResponseTime(metric.avgResponseTime)}</p>
                        </div>
                      </div>
                      
                      {metric.totalRequests > 0 && (
                        <>
                          <Progress 
                            value={getSuccessRate(metric)} 
                            className="mt-3 h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Last used: {metric.lastUsed ? formatDate(metric.lastUsed) : 'Never'}</span>
                            {metric.lastError && (
                              <span className="text-red-600">Last error: {metric.lastError.slice(0, 50)}...</span>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Guardian Wallets</h2>
                <p className="text-gray-600">Total: {apiWallets.length} wallets</p>
              </div>
              <Button onClick={loadWallets} disabled={!!loading} variant="outline">
                {loading === 'loading_wallets' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Wallet Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Active Wallets</p>
                      <p className="text-xl font-bold">
                        {apiWallets.filter(w => w.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600">Pending Wallets</p>
                      <p className="text-xl font-bold">
                        {apiWallets.filter(w => w.status === 'pending').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Accounts</p>
                      <p className="text-xl font-bold">
                        {apiWallets.reduce((sum, w) => sum + (w.accounts?.length || 0), 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Wallets Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-80">Guardian ID</TableHead>
                      <TableHead className="w-80">External ID</TableHead>
                      <TableHead className="w-80">Primary Address</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-40">Created</TableHead>
                      <TableHead className="w-40">Updated</TableHead>
                      <TableHead className="w-32">Accounts</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiWallets.map((wallet) => {
                      const primaryAddress = getPrimaryAddress(wallet.accounts);
                      const guardianIdKey = `guardian-${wallet.id}`;
                      const externalIdKey = `external-${wallet.externalId || 'none'}`;
                      const addressKey = `address-${primaryAddress}`;
                      
                      return (
                        <TableRow key={wallet.id} className="h-16">
                          <TableCell className="max-w-80">
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-xs break-all">
                                {wallet.id}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => copyToClipboard(wallet.id, guardianIdKey)}
                              >
                                {copiedItems.has(guardianIdKey) ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-80">
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-xs break-all">
                                {wallet.externalId || 'N/A'}
                              </div>
                              {wallet.externalId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 shrink-0"
                                  onClick={() => copyToClipboard(wallet.externalId!, externalIdKey)}
                                >
                                  {copiedItems.has(externalIdKey) ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-80">
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-xs break-all">
                                {primaryAddress}
                              </div>
                              {primaryAddress !== 'No address' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 shrink-0"
                                  onClick={() => copyToClipboard(primaryAddress, addressKey)}
                                >
                                  {copiedItems.has(addressKey) ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(wallet.status)}</TableCell>
                          <TableCell className="text-xs">
                            {formatApiDate(wallet.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatApiDate(wallet.updatedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{wallet.accounts?.length || 0}</span>
                              {wallet.accounts?.map((account, idx) => (
                                <div key={idx} className="flex gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {account.type}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {account.network}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewWalletDetails(wallet)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Guardian Operations</h2>
                <p className="text-gray-600">Total: {apiOperations.length} operations</p>
              </div>
              <Button onClick={loadOperations} disabled={!!loading} variant="outline">
                {loading === 'loading_operations' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Operation Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-xl font-bold">
                        {apiOperations.filter(op => ['completed', 'processed'].includes(op.status)).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-xl font-bold">
                        {apiOperations.filter(op => ['pending', 'processing'].includes(op.status)).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-xl font-bold">
                        {apiOperations.filter(op => ['failed', 'error'].includes(op.status)).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">With Results</p>
                      <p className="text-xl font-bold">
                        {apiOperations.filter(op => op.result).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Operations Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiOperations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="font-mono text-xs">
                          {operation.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {operation.type || 'wallet_creation'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(operation.status)}</TableCell>
                        <TableCell className="text-xs">
                          {formatDate(operation.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(operation.updatedAt)}
                        </TableCell>
                        <TableCell>
                          {operation.result ? (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Has Result
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">No result</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setOperationId(operation.id);
                              setSelectedOperation(operation);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Wallet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  POST /api/v1/wallets/create
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={createWallet}
                  disabled={!!loading}
                  className="w-full"
                >
                  {loading === 'create_wallet' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  🚀 Create New Guardian Wallet
                </Button>
                {endpointMetrics[0] && (
                  <div className="text-sm text-gray-600">
                    <p>Success rate: {getSuccessRate(endpointMetrics[0])}%</p>
                    <p>Total requests: {endpointMetrics[0].totalRequests}</p>
                    <p>Avg response: {formatResponseTime(endpointMetrics[0].avgResponseTime)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Get Wallet Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  GET /api/v1/wallets/{'{id}'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Guardian Wallet ID"
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                  />
                  <Button 
                    onClick={getWalletDetails}
                    disabled={!!loading || !walletId}
                  >
                    {loading === 'get_wallet' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Get
                  </Button>
                </div>
                {endpointMetrics[2] && (
                  <div className="text-sm text-gray-600">
                    <p>Success rate: {getSuccessRate(endpointMetrics[2])}%</p>
                    <p>Total requests: {endpointMetrics[2].totalRequests}</p>
                    <p>Avg response: {formatResponseTime(endpointMetrics[2].avgResponseTime)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Get Operation Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  GET /api/v1/operations/{'{id}'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Operation ID"
                    value={operationId}
                    onChange={(e) => setOperationId(e.target.value)}
                  />
                  <Button 
                    onClick={getOperationDetails}
                    disabled={!!loading || !operationId}
                  >
                    {loading === 'get_operation' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Get
                  </Button>
                </div>
                {endpointMetrics[4] && (
                  <div className="text-sm text-gray-600">
                    <p>Success rate: {getSuccessRate(endpointMetrics[4])}%</p>
                    <p>Total requests: {endpointMetrics[4].totalRequests}</p>
                    <p>Avg response: {formatResponseTime(endpointMetrics[4].avgResponseTime)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={loadWallets}
                  disabled={!!loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading === 'loading_wallets' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  GET /api/v1/wallets
                </Button>
                
                <Button 
                  onClick={loadOperations}
                  disabled={!!loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading === 'loading_operations' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  GET /api/v1/operations
                </Button>
                
                <Button 
                  onClick={loadAllData}
                  disabled={!!loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading === 'loading_all' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Refresh All Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Request History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {apiStats.requestHistory.length > 0 ? (
                  <div className="space-y-2">
                    {apiStats.requestHistory.slice(-10).reverse().map((request, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {request.method}
                          </Badge>
                          <span className="text-sm font-mono">{request.endpoint}</span>
                          <Badge className={`text-xs ${request.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {request.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatResponseTime(request.responseTime)} • {formatDate(request.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No requests made yet</p>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {endpointMetrics.filter(m => m.totalRequests > 0).map((metric, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{metric.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min((metric.avgResponseTime / 2000) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-12">
                            {formatResponseTime(metric.avgResponseTime)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {endpointMetrics.filter(m => m.errorCount > 0).map((metric, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{metric.name}</span>
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            {metric.errorCount} errors
                          </Badge>
                        </div>
                        {metric.lastError && (
                          <p className="text-xs text-red-600 mt-1">{metric.lastError}</p>
                        )}
                      </div>
                    ))}
                    {endpointMetrics.every(m => m.errorCount === 0) && (
                      <p className="text-green-600 italic">No errors recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <div className="space-y-6">
            {/* Selected Wallet Details */}
            {selectedWallet && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Wallet Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
                    {JSON.stringify(selectedWallet, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Selected Operation Details */}
            {selectedOperation && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Operation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
                    {JSON.stringify(selectedOperation, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Last API Response */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle>Last API Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {!result && !selectedWallet && !selectedOperation && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 italic">No results yet. Use the testing tab to make API calls.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Wallet Details Modal */}
      <Dialog open={showWalletDetails} onOpenChange={setShowWalletDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedWallet && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Guardian ID</label>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-sm bg-gray-50 p-2 rounded break-all">
                        {selectedWallet.id}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(selectedWallet.id, `modal-guardian-${selectedWallet.id}`)}
                      >
                        {copiedItems.has(`modal-guardian-${selectedWallet.id}`) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">External ID</label>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-sm bg-gray-50 p-2 rounded break-all">
                        {selectedWallet.externalId || 'N/A'}
                      </div>
                      {selectedWallet.externalId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(selectedWallet.externalId!, `modal-external-${selectedWallet.externalId}`)}
                        >
                          {copiedItems.has(`modal-external-${selectedWallet.externalId}`) ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div>
                      {getStatusBadge(selectedWallet.status)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Accounts Count</label>
                    <div className="text-sm">
                      {selectedWallet.accounts?.length || 0} account(s)
                    </div>
                  </div>
                  
                  {selectedWallet.createdAt && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <div className="text-sm">
                        {formatApiDate(selectedWallet.createdAt)}
                      </div>
                    </div>
                  )}
                  
                  {selectedWallet.updatedAt && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Updated</label>
                      <div className="text-sm">
                        {formatApiDate(selectedWallet.updatedAt)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Accounts Information */}
              {selectedWallet.accounts && selectedWallet.accounts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Accounts</h3>
                  <div className="space-y-3">
                    {selectedWallet.accounts.map((account, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Account {index + 1}</Badge>
                          <Badge variant="secondary">{account.type}</Badge>
                          <Badge variant="outline">{account.network}</Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-600">Address</label>
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm bg-gray-50 p-2 rounded break-all flex-1">
                              {account.address}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(account.address, `modal-address-${index}-${account.address}`)}
                            >
                              {copiedItems.has(`modal-address-${index}-${account.address}`) ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Data */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Raw API Response</h3>
                <Textarea
                  value={JSON.stringify(selectedWallet, null, 2)}
                  readOnly
                  className="min-h-[200px] font-mono text-xs"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

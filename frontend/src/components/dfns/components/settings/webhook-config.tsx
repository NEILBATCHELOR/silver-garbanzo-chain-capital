import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  ExternalLink,
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { useState, useEffect } from "react";
import { getDfnsService } from "../../../../services/dfns";
import type { 
  DfnsCreateWebhookRequest, 
  DfnsUpdateWebhookRequest,
  DfnsWebhookEvent,
  WebhookSummary 
} from "../../../../types/dfns";

interface WebhookFormData {
  url: string;
  description: string;
  events: DfnsWebhookEvent[];
  status: 'Enabled' | 'Disabled';
}

interface WebhookTestResult {
  webhookId: string;
  status: string;
  responseTime?: number;
  error?: string;
}

/**
 * Webhook Configuration Component
 * 
 * Comprehensive webhook management including:
 * - Webhook creation and configuration
 * - Event type selection and filtering
 * - URL validation and testing
 * - Delivery status monitoring
 * - Event history tracking
 */
export function WebhookConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  
  const [webhooks, setWebhooks] = useState<WebhookSummary[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookSummary | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  
  const [formData, setFormData] = useState<WebhookFormData>({
    url: '',
    description: '',
    events: [],
    status: 'Enabled'
  });
  
  const [testResults, setTestResults] = useState<Map<string, WebhookTestResult>>(new Map());
  const [showSecrets, setShowSecrets] = useState(false);

  // Available webhook events
  const availableEvents: DfnsWebhookEvent[] = [
    'wallet.created',
    'wallet.updated',
    'wallet.signature.created',
    'wallet.signature.signed',
    'wallet.signature.broadcasted',
    'wallet.signature.confirmed',
    'wallet.signature.failed',
    'wallet.transaction.created',
    'wallet.transaction.broadcasted',
    'wallet.transaction.confirmed',
    'wallet.transaction.failed',
    'user.created',
    'user.updated',
    'user.activated',
    'user.deactivated',
    'user.archived',
    'credential.created',
    'credential.activated',
    'credential.deactivated',
    'policy.created',
    'policy.updated',
    'policy.activated',
    'policy.deactivated'
  ];

  const fetchWebhooks = async () => {
    try {
      const dfnsService = getDfnsService();
      await dfnsService.initialize();

      const webhookService = dfnsService.getWebhookService();
      const webhookSummaries = await webhookService.getWebhooksSummary();
      
      setWebhooks(webhookSummaries);
      setError(null);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      setError(`Failed to load webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const createWebhook = async () => {
    if (!formData.url || formData.events.length === 0) {
      setError('URL and at least one event are required');
      return;
    }

    try {
      setSaving(true);
      
      const dfnsService = getDfnsService();
      const webhookService = dfnsService.getWebhookService();

      const request: DfnsCreateWebhookRequest = {
        url: formData.url,
        events: formData.events,
        status: formData.status,
        description: formData.description || undefined
      };

      await webhookService.createWebhook(request, {
        syncToDatabase: true,
        testWebhook: true
      });

      // Refresh webhooks list
      await fetchWebhooks();
      
      // Reset form
      setFormData({
        url: '',
        description: '',
        events: [],
        status: 'Enabled'
      });
      setShowCreateForm(false);
      setError(null);
    } catch (error) {
      console.error('Failed to create webhook:', error);
      setError(`Failed to create webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const updateWebhook = async () => {
    if (!selectedWebhook || !formData.url) {
      setError('Invalid webhook or URL');
      return;
    }

    try {
      setSaving(true);
      
      const dfnsService = getDfnsService();
      const webhookService = dfnsService.getWebhookService();

      const request: DfnsUpdateWebhookRequest = {
        url: formData.url,
        events: formData.events,
        status: formData.status,
        description: formData.description || undefined
      };

      await webhookService.updateWebhook(selectedWebhook.webhookId, request, {
        syncToDatabase: true,
        testWebhook: true
      });

      // Refresh webhooks list
      await fetchWebhooks();
      
      setShowEditForm(false);
      setSelectedWebhook(null);
      setError(null);
    } catch (error) {
      console.error('Failed to update webhook:', error);
      setError(`Failed to update webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      
      const dfnsService = getDfnsService();
      const webhookService = dfnsService.getWebhookService();

      await webhookService.deleteWebhook(webhookId, {
        syncToDatabase: true,
        archiveEvents: true
      });

      // Refresh webhooks list
      await fetchWebhooks();
      setError(null);
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      setError(`Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const dfnsService = getDfnsService();
      const webhookService = dfnsService.getWebhookService();

      const startTime = Date.now();
      const result = await webhookService.pingWebhook(webhookId);
      const responseTime = Date.now() - startTime;

      const testResult: WebhookTestResult = {
        webhookId,
        status: result.status,
        responseTime,
        error: result.error
      };

      setTestResults(prev => new Map(prev.set(webhookId, testResult)));
    } catch (error) {
      const testResult: WebhookTestResult = {
        webhookId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setTestResults(prev => new Map(prev.set(webhookId, testResult)));
    }
  };

  const toggleWebhookStatus = async (webhookId: string, currentStatus: string) => {
    try {
      setSaving(true);
      
      const dfnsService = getDfnsService();
      const webhookService = dfnsService.getWebhookService();

      const newStatus = currentStatus === 'Enabled' ? 'Disabled' : 'Enabled';
      
      await webhookService.updateWebhook(webhookId, { status: newStatus }, {
        syncToDatabase: true
      });

      // Refresh webhooks list
      await fetchWebhooks();
      setError(null);
    } catch (error) {
      console.error('Failed to toggle webhook status:', error);
      setError(`Failed to toggle webhook status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = (webhook: WebhookSummary) => {
    setSelectedWebhook(webhook);
    setFormData({
      url: webhook.url,
      description: webhook.description || '',
      events: webhook.eventTypes,
      status: webhook.status
    });
    setShowEditForm(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
    }
  };

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enabled': return 'text-green-600';
      case 'Disabled': return 'text-gray-600';
      default: return 'text-red-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Enabled': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Disabled': return <Pause className="h-4 w-4 text-gray-500" />;
      default: return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getDeliveryStatusColor = (successful: number, failed: number) => {
    const total = successful + failed;
    if (total === 0) return 'text-gray-600';
    const successRate = (successful / total) * 100;
    if (successRate >= 95) return 'text-green-600';
    if (successRate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchWebhooks();
      setLoading(false);
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading webhook configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Webhook Configuration</h2>
          <p className="text-muted-foreground">
            Manage DFNS webhooks for real-time event notifications
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => fetchWebhooks()} 
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            disabled={showCreateForm || showEditForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhooks.length}</div>
            <p className="text-xs text-muted-foreground">
              {webhooks.filter(w => w.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhooks.reduce((sum, w) => sum + w.successfulDeliveries + w.failedDeliveries, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All time deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(() => {
                const totalSuccessful = webhooks.reduce((sum, w) => sum + w.successfulDeliveries, 0);
                const totalDeliveries = webhooks.reduce((sum, w) => sum + w.successfulDeliveries + w.failedDeliveries, 0);
                return totalDeliveries > 0 ? `${((totalSuccessful / totalDeliveries) * 100).toFixed(1)}%` : '100%';
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Delivery success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {webhooks.reduce((sum, w) => sum + w.failedDeliveries, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Webhooks</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Create Webhook Form */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Webhook</CardTitle>
                <CardDescription>
                  Configure a new webhook endpoint to receive DFNS events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    placeholder="https://your-domain.com/webhook"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookDescription">Description (Optional)</Label>
                  <Textarea
                    id="webhookDescription"
                    placeholder="Brief description of this webhook's purpose"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Types</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto border rounded p-3">
                    {availableEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`event-${event}`}
                          checked={formData.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                events: [...prev.events, event]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                events: prev.events.filter(e => e !== event)
                              }));
                            }
                          }}
                        />
                        <label htmlFor={`event-${event}`} className="text-sm">
                          {event}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Webhook</Label>
                    <p className="text-sm text-muted-foreground">
                      Start receiving events immediately after creation
                    </p>
                  </div>
                  <Switch
                    checked={formData.status === 'Enabled'}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, status: checked ? 'Enabled' : 'Disabled' }))
                    }
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={createWebhook} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create Webhook
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Webhook Form */}
          {showEditForm && selectedWebhook && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Webhook</CardTitle>
                <CardDescription>
                  Update webhook configuration and event subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editWebhookUrl">Webhook URL</Label>
                  <Input
                    id="editWebhookUrl"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editWebhookDescription">Description (Optional)</Label>
                  <Textarea
                    id="editWebhookDescription"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Types</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto border rounded p-3">
                    {availableEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-event-${event}`}
                          checked={formData.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                events: [...prev.events, event]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                events: prev.events.filter(e => e !== event)
                              }));
                            }
                          }}
                        />
                        <label htmlFor={`edit-event-${event}`} className="text-sm">
                          {event}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Webhook</Label>
                    <p className="text-sm text-muted-foreground">
                      Control webhook active status
                    </p>
                  </div>
                  <Switch
                    checked={formData.status === 'Enabled'}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, status: checked ? 'Enabled' : 'Disabled' }))
                    }
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={updateWebhook} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Update Webhook
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowEditForm(false);
                    setSelectedWebhook(null);
                  }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhooks List */}
          <Card>
            <CardHeader>
              <CardTitle>Configured Webhooks</CardTitle>
              <CardDescription>
                Manage your webhook endpoints and monitor delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No webhooks configured</p>
                  <Button 
                    onClick={() => setShowCreateForm(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Webhook
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => {
                    const testResult = testResults.get(webhook.webhookId);
                    const totalDeliveries = webhook.successfulDeliveries + webhook.failedDeliveries;
                    const successRate = totalDeliveries > 0 
                      ? (webhook.successfulDeliveries / totalDeliveries) * 100 
                      : 100;

                    return (
                      <div 
                        key={webhook.webhookId}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(webhook.status)}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium truncate">
                                  {webhook.url}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(webhook.url)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {webhook.description && (
                                <p className="text-sm text-muted-foreground mb-1">
                                  {webhook.description}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-1 mb-2">
                                {webhook.eventTypes.slice(0, 3).map((event) => (
                                  <Badge key={event} variant="secondary" className="text-xs">
                                    {event}
                                  </Badge>
                                ))}
                                {webhook.eventTypes.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{webhook.eventTypes.length - 3} more
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span>
                                  {totalDeliveries} deliveries
                                </span>
                                <span className={getDeliveryStatusColor(webhook.successfulDeliveries, webhook.failedDeliveries)}>
                                  {successRate.toFixed(1)}% success
                                </span>
                                {webhook.lastEventAt && (
                                  <span>
                                    Last: {formatTimeAgo(webhook.lastEventAt)}
                                  </span>
                                )}
                              </div>
                              
                              {testResult && (
                                <div className="mt-2">
                                  <Badge 
                                    variant={testResult.status === '200' ? "default" : "destructive"}
                                    className="text-xs"
                                  >
                                    Test: {testResult.status}
                                    {testResult.responseTime && ` (${testResult.responseTime}ms)`}
                                  </Badge>
                                  {testResult.error && (
                                    <p className="text-xs text-red-600 mt-1">
                                      {testResult.error}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testWebhook(webhook.webhookId)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWebhookStatus(webhook.webhookId, webhook.status)}
                            disabled={saving}
                          >
                            {webhook.status === 'Enabled' ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(webhook)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteWebhook(webhook.webhookId)}
                            disabled={saving}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Event Types</CardTitle>
              <CardDescription>
                DFNS webhook events you can subscribe to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Wallet Events</h4>
                  <div className="space-y-1">
                    {availableEvents
                      .filter(e => e.startsWith('wallet.'))
                      .map(event => (
                        <Badge key={event} variant="outline" className="mr-2 mb-1">
                          {event}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">User Events</h4>
                  <div className="space-y-1">
                    {availableEvents
                      .filter(e => e.startsWith('user.') || e.startsWith('credential.'))
                      .map(event => (
                        <Badge key={event} variant="outline" className="mr-2 mb-1">
                          {event}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Policy Events</h4>
                  <div className="space-y-1">
                    {availableEvents
                      .filter(e => e.startsWith('policy.'))
                      .map(event => (
                        <Badge key={event} variant="outline" className="mr-2 mb-1">
                          {event}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Statistics</CardTitle>
                <CardDescription>
                  Overview of webhook delivery performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhooks.length === 0 ? (
                    <p className="text-muted-foreground">No webhooks configured</p>
                  ) : (
                    webhooks.map((webhook) => {
                      const totalDeliveries = webhook.successfulDeliveries + webhook.failedDeliveries;
                      const successRate = totalDeliveries > 0 
                        ? (webhook.successfulDeliveries / totalDeliveries) * 100 
                        : 100;

                      return (
                        <div key={webhook.webhookId} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium truncate">
                              {new URL(webhook.url).hostname}
                            </span>
                            <Badge 
                              variant={successRate >= 95 ? "default" : successRate >= 80 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {successRate.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {webhook.successfulDeliveries} successful, {webhook.failedDeliveries} failed
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest webhook delivery attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {webhooks
                    .filter(w => w.lastEventAt)
                    .sort((a, b) => new Date(b.lastEventAt!).getTime() - new Date(a.lastEventAt!).getTime())
                    .slice(0, 5)
                    .map((webhook) => (
                      <div key={webhook.webhookId} className="flex justify-between items-center text-sm">
                        <span className="truncate">
                          {new URL(webhook.url).hostname}
                        </span>
                        <span className="text-muted-foreground">
                          {formatTimeAgo(webhook.lastEventAt)}
                        </span>
                      </div>
                    ))}
                  
                  {webhooks.filter(w => w.lastEventAt).length === 0 && (
                    <p className="text-muted-foreground text-sm">No recent webhook activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

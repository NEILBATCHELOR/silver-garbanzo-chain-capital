import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Plus, 
  FileCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Archive, 
  Edit,
  Loader2,
  AlertTriangle,
  Shield,
  BarChart3
} from 'lucide-react';
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsPolicy, 
  DfnsPolicySummary,
  DfnsActivityKind,
  DfnsPolicyRuleKind,
  DfnsPolicyActionKind 
} from "../../../../types/dfns";

/**
 * Policy Dashboard Component
 * 
 * Provides comprehensive policy management functionality including:
 * - Policy overview and statistics
 * - Policy listing and search
 * - Policy creation and editing
 * - Policy performance metrics
 */
export function PolicyDashboard() {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<DfnsPolicy[]>([]);
  const [policySummaries, setPolicySummaries] = useState<DfnsPolicySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivityKind, setSelectedActivityKind] = useState<DfnsActivityKind | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Archived' | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  // Initialize DFNS service
  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service. Please check your configuration.');
      }
    };

    initializeDfns();
  }, []);

  // Fetch policy data
  useEffect(() => {
    const fetchData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);
        
        const policyService = dfnsService.getPolicyService();
        
        // Fetch policies and summaries
        const [allPolicies, summaries] = await Promise.all([
          policyService.getAllPolicies(),
          policyService.getPoliciesSummary()
        ]);

        setPolicies(allPolicies);
        setPolicySummaries(summaries);
      } catch (error) {
        console.error('Failed to fetch policy data:', error);
        setError(`Failed to load policy data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dfnsService]);

  // Filter policies based on search and filters
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.activityKind.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActivityKind = selectedActivityKind === 'all' || policy.activityKind === selectedActivityKind;
    const matchesStatus = selectedStatus === 'all' || policy.status === selectedStatus;
    
    return matchesSearch && matchesActivityKind && matchesStatus;
  });

  // Calculate metrics
  const activePolicies = policies.filter(p => p.status === 'Active').length;
  const archivedPolicies = policies.filter(p => p.status === 'Archived').length;
  const totalTriggered = policySummaries.reduce((sum, s) => sum + s.triggeredCount, 0);
  const uniqueActivityKinds = [...new Set(policies.map(p => p.activityKind))].length;

  // Handle policy archival
  const handleArchivePolicy = async (policyId: string, policyName: string) => {
    if (!dfnsService) return;
    
    if (!confirm(`Are you sure you want to archive the policy "${policyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const policyService = dfnsService.getPolicyService();
      
      await policyService.archivePolicy(policyId, {
        syncToDatabase: true
      });

      // Refresh data
      const [allPolicies, summaries] = await Promise.all([
        policyService.getAllPolicies(),
        policyService.getPoliciesSummary()
      ]);

      setPolicies(allPolicies);
      setPolicySummaries(summaries);
    } catch (error) {
      console.error('Failed to archive policy:', error);
      setError(`Failed to archive policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Archived': return 'secondary';
      default: return 'outline';
    }
  };

  // Get activity kind badge color
  const getActivityKindColor = (activityKind: string) => {
    const colors = {
      'WalletsSign': 'bg-blue-100 text-blue-800',
      'WalletsCreate': 'bg-green-100 text-green-800', 
      'WalletsDelegate': 'bg-purple-100 text-purple-800',
      'WalletsTransfer': 'bg-orange-100 text-orange-800',
      'KeysSign': 'bg-red-100 text-red-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[activityKind as keyof typeof colors] || colors.default;
  };

  if (loading && !dfnsService) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing DFNS Policy Service...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Policy Dashboard</h2>
          <p className="text-muted-foreground">
            Manage governance policies and approval workflows
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Policy
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePolicies}</div>
            <p className="text-xs text-muted-foreground">
              {archivedPolicies} archived
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Triggered</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTriggered}</div>
            <p className="text-xs text-muted-foreground">
              Policy activations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity Types</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueActivityKinds}</div>
            <p className="text-xs text-muted-foreground">
              Different activity kinds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {activePolicies > 0 ? '100%' : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Security coverage
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">All Policies</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Policy Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Performance</CardTitle>
              <CardDescription>
                Overview of policy triggers and effectiveness
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : policySummaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Policy</th>
                        <th className="text-left py-2">Activity</th>
                        <th className="text-left py-2">Rule</th>
                        <th className="text-left py-2">Action</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-right py-2">Triggered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policySummaries.slice(0, 10).map((summary) => (
                        <tr key={summary.policyId} className="border-b">
                          <td className="py-2 font-medium">{summary.name}</td>
                          <td className="py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityKindColor(summary.activityKind)}`}>
                              {summary.activityKind}
                            </span>
                          </td>
                          <td className="py-2">{summary.ruleKind}</td>
                          <td className="py-2">{summary.actionKind}</td>
                          <td className="py-2">
                            <Badge variant={getStatusBadgeVariant(summary.status)}>
                              {summary.status}
                            </Badge>
                          </td>
                          <td className="py-2 text-right">{summary.triggeredCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No policies found</p>
                  <Button 
                    onClick={() => setShowCreateDialog(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    Create your first policy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedActivityKind}
              onChange={(e) => setSelectedActivityKind(e.target.value as DfnsActivityKind | 'all')}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">All Activities</option>
              <option value="WalletsSign">Wallet Signing</option>
              <option value="WalletsCreate">Wallet Creation</option>
              <option value="WalletsDelegate">Wallet Delegation</option>
              <option value="WalletsTransfer">Wallet Transfer</option>
              <option value="KeysSign">Key Signing</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'Active' | 'Archived' | 'all')}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Policies List */}
          <div className="space-y-4">
            {filteredPolicies.length > 0 ? (
              filteredPolicies.map((policy) => (
                <Card key={policy.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{policy.name}</h3>
                          <Badge variant={getStatusBadgeVariant(policy.status)}>
                            {policy.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityKindColor(policy.activityKind)}`}>
                            {policy.activityKind}
                          </span>
                          <span>Rule: {policy.rule.kind}</span>
                          <span>Action: {policy.action.kind}</span>
                          {policy.externalId && (
                            <span>External ID: {policy.externalId}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Created: {new Date(policy.dateCreated).toLocaleDateString()}
                          {policy.dateUpdated && (
                            <span> • Updated: {new Date(policy.dateUpdated).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {policy.status === 'Active' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleArchivePolicy(policy.id, policy.name)}
                            disabled={loading}
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'No policies match your search criteria' : 'No policies found'}
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                    Create Policy
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Policy Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and reporting (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Advanced policy analytics and reporting features coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Policy Dialog Placeholder */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Policy</h3>
            <p className="text-muted-foreground mb-4">
              Policy creation wizard will be implemented in the next phase.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateDialog(false)}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

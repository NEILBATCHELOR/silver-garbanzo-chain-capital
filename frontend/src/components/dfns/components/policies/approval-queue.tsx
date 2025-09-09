import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  Wallet,
  Key,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  Filter
} from 'lucide-react';
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsPolicyApproval, 
  DfnsApprovalSummary,
  DfnsActivityKind 
} from "../../../../types/dfns";
import { DfnsApprovalStatus } from "../../../../types/dfns";

/**
 * Approval Queue Component
 * 
 * Manages pending policy approvals requiring user decisions:
 * - View pending approval requests
 * - Approve or deny requests with reasoning
 * - Track approval history and status
 * - Filter by activity type and status
 */
export function ApprovalQueue() {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<DfnsPolicyApproval[]>([]);
  const [approvalSummaries, setApprovalSummaries] = useState<DfnsApprovalSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DfnsApprovalStatus | 'all'>(DfnsApprovalStatus.Pending);
  const [selectedActivity, setSelectedActivity] = useState<DfnsActivityKind | 'all'>('all');
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
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

  // Fetch approval data
  useEffect(() => {
    const fetchData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);
        
        const policyService = dfnsService.getPolicyService();
        
        // Fetch approvals and summaries
        const [approvalsResponse, summaries] = await Promise.all([
          policyService.listApprovals(),
          policyService.getApprovalsSummary()
        ]);

        setApprovals(approvalsResponse.items);
        setApprovalSummaries(summaries);
      } catch (error) {
        console.error('Failed to fetch approval data:', error);
        setError(`Failed to load approval data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dfnsService]);

  // Filter approvals based on search and filters
  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.activity.kind.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (approval.initiator.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         approval.initiator.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || approval.status === selectedStatus;
    const matchesActivity = selectedActivity === 'all' || approval.activity.kind === selectedActivity;
    
    return matchesSearch && matchesStatus && matchesActivity;
  });

  // Calculate metrics
  const pendingCount = approvals.filter(a => a.status === 'Pending').length;
  const approvedCount = approvals.filter(a => a.status === 'Approved').length;
  const deniedCount = approvals.filter(a => a.status === 'Denied').length;
  const expiringCount = approvals.filter(a => {
    if (a.status !== 'Pending' || !a.expirationDate) return false;
    const hoursUntilExpiry = (new Date(a.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24;
  }).length;

  // Handle approval decision
  const handleApprovalDecision = async (approvalId: string, decision: 'Approved' | 'Denied', reason?: string) => {
    if (!dfnsService) return;

    try {
      setProcessingApprovalId(approvalId);
      const policyService = dfnsService.getPolicyService();
      
      await policyService.createApprovalDecision(approvalId, {
        value: decision,
        reason
      }, {
        syncToDatabase: true
      });

      // Refresh data
      const [approvalsResponse, summaries] = await Promise.all([
        policyService.listApprovals(),
        policyService.getApprovalsSummary()
      ]);

      setApprovals(approvalsResponse.items);
      setApprovalSummaries(summaries);
    } catch (error) {
      console.error('Failed to process approval:', error);
      setError(`Failed to ${decision.toLowerCase()} request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingApprovalId(null);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Pending': return 'default';
      case 'Approved': return 'default';
      case 'Denied': return 'destructive';
      case 'Expired': return 'secondary';
      default: return 'outline';
    }
  };

  // Get activity icon
  const getActivityIcon = (activityKind: string) => {
    switch (activityKind) {
      case 'WalletsSign':
      case 'WalletsCreate':
      case 'WalletsDelegate':
      case 'WalletsTransfer':
        return <Wallet className="h-4 w-4" />;
      case 'KeysSign':
      case 'KeysCreate':
        return <Key className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Calculate time until expiry
  const getTimeUntilExpiry = (expirationDate?: string): string => {
    if (!expirationDate) return 'No expiry';
    
    const now = new Date();
    const expiry = new Date(expirationDate);
    const hoursUntilExpiry = Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursUntilExpiry <= 0) return 'Expired';
    if (hoursUntilExpiry < 1) return '< 1 hour';
    if (hoursUntilExpiry < 24) return `${Math.round(hoursUntilExpiry)} hours`;
    const days = Math.round(hoursUntilExpiry / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  };

  // Refresh data
  const refreshData = async () => {
    if (!dfnsService) return;
    
    try {
      setLoading(true);
      const policyService = dfnsService.getPolicyService();
      
      const [approvalsResponse, summaries] = await Promise.all([
        policyService.listApprovals(),
        policyService.getApprovalsSummary()
      ]);

      setApprovals(approvalsResponse.items);
      setApprovalSummaries(summaries);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError(`Failed to refresh data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-2xl font-bold">Approval Queue</h2>
          <p className="text-muted-foreground">
            Manage pending policy approval requests
          </p>
        </div>
        <Button 
          onClick={refreshData}
          variant="outline"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Require your decision
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              Recently approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{deniedCount}</div>
            <p className="text-xs text-muted-foreground">
              Recently denied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringCount}</div>
            <p className="text-xs text-muted-foreground">
              Within 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search approvals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as DfnsApprovalStatus | 'all')}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Denied">Denied</option>
          <option value="Expired">Expired</option>
        </select>
        <select
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value as DfnsActivityKind | 'all')}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All Activities</option>
          <option value="WalletsSign">Wallet Signing</option>
          <option value="WalletsCreate">Wallet Creation</option>
          <option value="WalletsDelegate">Wallet Delegation</option>
          <option value="WalletsTransfer">Wallet Transfer</option>
          <option value="KeysSign">Key Signing</option>
        </select>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredApprovals.length > 0 ? (
          filteredApprovals.map((approval) => (
            <Card key={approval.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getActivityIcon(approval.activity.kind)}
                      <h3 className="text-lg font-semibold">
                        {approval.activity.kind} Request
                      </h3>
                      <Badge variant={getStatusBadgeVariant(approval.status)}>
                        {approval.status}
                      </Badge>
                      {approval.status === 'Pending' && approval.expirationDate && (
                        <span className="text-sm text-orange-600">
                          Expires: {getTimeUntilExpiry(approval.expirationDate)}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Initiator:</span>
                        <div>{approval.initiator.name || approval.initiator.id}</div>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <div>{new Date(approval.dateCreated).toLocaleDateString()}</div>
                      </div>
                      {approval.activity.walletId && (
                        <div>
                          <span className="font-medium">Wallet:</span>
                          <div className="font-mono text-xs">{approval.activity.walletId}</div>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Decisions:</span>
                        <div>{approval.decisions.length} received</div>
                      </div>
                    </div>

                    {/* Show existing decisions */}
                    {approval.decisions.length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <h4 className="text-sm font-medium mb-2">Previous Decisions:</h4>
                        <div className="space-y-2">
                          {approval.decisions.map((decision, index) => (
                            <div key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                              <div className="flex items-center gap-2">
                                {decision.value === 'Approved' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span>
                                  {decision.value} by {decision.userId}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(decision.dateCreated).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  {approval.status === 'Pending' && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={() => handleApprovalDecision(approval.id, 'Approved')}
                        disabled={processingApprovalId === approval.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingApprovalId === approval.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => handleApprovalDecision(approval.id, 'Denied')}
                        disabled={processingApprovalId === approval.id}
                      >
                        {processingApprovalId === approval.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Deny
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedStatus !== 'all' || selectedActivity !== 'all' 
                  ? 'No approvals match your search criteria' 
                  : 'No approval requests found'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Approval requests will appear here when policies are triggered
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

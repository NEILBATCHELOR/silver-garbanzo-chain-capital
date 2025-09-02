'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  RefreshCw,
  Info
} from 'lucide-react';
import { cn } from '@/utils';
import { useRedemptionApprovals } from '../hooks';

interface ApproverDashboardProps {
  approverId: string;
  className?: string;
}

export const ApproverDashboard: React.FC<ApproverDashboardProps> = ({
  approverId,
  className
}) => {
  // Early return if no valid approverId
  if (!approverId || approverId === 'current-user' || approverId === 'undefined' || approverId === 'null') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">Invalid Approver ID</p>
          <p className="text-sm">Cannot load approvals without a valid approver identifier.</p>
        </div>
      </div>
    );
  }

  const { 
    pendingApprovals, 
    approveRedemption, 
    rejectRedemption, 
    loading,
    error,
    isProcessing,
    metrics,
    refreshApprovals,
    clearError
  } = useRedemptionApprovals({ 
    approverId,
    enableRealtime: false, // Explicitly disable real-time to prevent errors
    autoRefresh: false // Disable auto-refresh to prevent unnecessary calls
  });

  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());

  // Memoized metrics calculation to prevent re-renders
  const calculatedMetrics = useMemo(() => {
    if (metrics) {
      return metrics;
    }

    // Fallback calculation if metrics not available
    const total = pendingApprovals?.length || 0;
    const highValue = pendingApprovals?.filter(req => req.usdcAmount > 10000).length || 0;
    const urgent = pendingApprovals?.filter(req => {
      const submittedDays = Math.floor(
        (Date.now() - new Date(req.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return submittedDays > 2;
    }).length || 0;

    return {
      totalPending: total,
      totalApproved: 0,
      totalRejected: 0,
      avgApprovalTime: 0,
      pendingOlderThan24h: urgent,
      userPendingCount: total
    };
  }, [pendingApprovals, metrics]);

  const handleApprove = async (redemptionId: string) => {
    try {
      clearError();
      await approveRedemption(redemptionId, 'Approved by approver dashboard');
    } catch (error) {
      console.error('Failed to approve redemption:', error);
    }
  };

  const handleReject = async (redemptionId: string, reason?: string) => {
    try {
      clearError();
      await rejectRedemption(redemptionId, reason || 'Rejected by approver');
    } catch (error) {
      console.error('Failed to reject redemption:', error);
    }
  };

  const toggleSelection = (redemptionId: string) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(redemptionId)) {
        newSet.delete(redemptionId);
      } else {
        newSet.add(redemptionId);
      }
      return newSet;
    });
  };

  const handleBulkApprove = async () => {
    const promises = Array.from(selectedRequests).map(id => handleApprove(id));
    await Promise.all(promises);
    setSelectedRequests(new Set());
  };

  const handleRefresh = async () => {
    try {
      clearError();
      await refreshApprovals();
    } catch (error) {
      console.error('Failed to refresh approvals:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculatedMetrics.totalPending}</div>
            <p className="text-xs text-muted-foreground">
              Requests awaiting your approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingApprovals?.filter(req => req.usdcAmount > 10000).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requests over $10,000
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculatedMetrics.pendingOlderThan24h}</div>
            <p className="text-xs text-muted-foreground">
              Pending over 2 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Redemption Approvals</CardTitle>
              <CardDescription>
                Review and approve redemption requests assigned to you
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
              {selectedRequests.size > 0 && (
                <>
                  <Badge variant="secondary">
                    {selectedRequests.size} selected
                  </Badge>
                  <Button
                    size="sm"
                    onClick={handleBulkApprove}
                    disabled={loading || Array.from(selectedRequests).some(id => isProcessing(id))}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {Array.from(selectedRequests).some(id => isProcessing(id)) ? 'Processing...' : 'Approve Selected'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !pendingApprovals?.length ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg mb-2">Loading approvals...</p>
              <p className="text-sm text-muted-foreground">Please wait while we fetch your pending approvals.</p>
            </div>
          ) : !pendingApprovals || pendingApprovals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">All caught up!</p>
              <p className="text-sm">No pending redemption requests require your approval.</p>
              {!loading && (
                <div className="mt-4">
                  <Alert className="max-w-md mx-auto">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      All current redemption requests have been processed. New requests will appear here when they need your approval.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={pendingApprovals.length > 0 && selectedRequests.size === pendingApprovals.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRequests(new Set(pendingApprovals.map(req => req.id)));
                        } else {
                          setSelectedRequests(new Set());
                        }
                      }}
                      disabled={pendingApprovals.length === 0}
                    />
                  </TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>USDC Value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.map((request) => {
                  const daysPending = Math.floor(
                    (Date.now() - new Date(request.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRequests.has(request.id)}
                          onChange={() => toggleSelection(request.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{request.investorName || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.investorId || 'No ID'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="font-medium">{request.tokenAmount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{request.tokenType}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right font-medium">
                          ${request.usdcAmount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={request.redemptionType === 'standard' ? 'default' : 'secondary'}>
                          {request.redemptionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(request.submittedAt).toLocaleDateString()}
                          </span>
                          {daysPending > 2 && (
                            <Badge variant="destructive" className="ml-2">
                              {daysPending}d
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(request.id)}
                            disabled={isProcessing(request.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {isProcessing(request.id) ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                            disabled={isProcessing(request.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {isProcessing(request.id) ? 'Processing...' : 'Reject'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApproverDashboard;

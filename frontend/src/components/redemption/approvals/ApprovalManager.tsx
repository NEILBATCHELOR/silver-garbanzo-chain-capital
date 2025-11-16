/**
 * Enhanced Approval Manager Component
 * Comprehensive approval workflow management for redemption requests
 * Uses Stage 10: Multi-Party Approval Workflow infrastructure
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowUp,
  UserPlus,
  Shield,
  Users
} from 'lucide-react';
import { cn } from '@/utils';
import { 
  approvalOrchestrator,
  type ApprovalSubmission,
  type ApprovalResult
} from '@/infrastructure/redemption/approval';
import { supabase } from '@/infrastructure/supabaseClient';

interface ApprovalManagerProps {
  requestId: string;
  approverId: string;
  onApprovalComplete?: (result: ApprovalResult) => void;
  className?: string;
}

export const ApprovalManager: React.FC<ApprovalManagerProps> = ({
  requestId,
  approverId,
  onApprovalComplete,
  className
}) => {
  const [loading, setLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load approval status
  useEffect(() => {
    loadApprovalStatus();
  }, [requestId]);

  const loadApprovalStatus = async () => {
    try {
      const status = await approvalOrchestrator.getApprovalStatus(requestId);
      if (status.success) {
        setApprovalStatus(status);
        // Check if current user is a pending approver
        const isPendingApprover = status.approvals?.some(
          a => a.approverId === approverId && a.decision === 'pending'
        );
        setShowActions(isPendingApprover || false);
      }
    } catch (err) {
      console.error('Error loading approval status:', err);
      setError('Failed to load approval status');
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const submission: ApprovalSubmission = {
        requestId,
        approverId,
        decision: 'approved',
        comments: comments || undefined
      };

      const result = await approvalOrchestrator.submitApproval(submission);

      if (result.success) {
        await loadApprovalStatus();
        setComments('');
        if (onApprovalComplete) {
          onApprovalComplete(result);
        }
      } else {
        setError(result.error || 'Failed to submit approval');
      }
    } catch (err) {
      console.error('Error submitting approval:', err);
      setError('Failed to submit approval');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      setError('Comments are required for rejection');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submission: ApprovalSubmission = {
        requestId,
        approverId,
        decision: 'rejected',
        comments
      };

      const result = await approvalOrchestrator.submitApproval(submission);

      if (result.success) {
        await loadApprovalStatus();
        setComments('');
        if (onApprovalComplete) {
          onApprovalComplete(result);
        }
      } else {
        setError(result.error || 'Failed to submit rejection');
      }
    } catch (err) {
      console.error('Error submitting rejection:', err);
      setError('Failed to submit rejection');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await approvalOrchestrator.escalateApproval(
        requestId,
        approverId,
        comments || 'Escalated by approver'
      );

      if (result.success) {
        await loadApprovalStatus();
        setComments('');
      } else {
        setError(result.error || 'Failed to escalate approval');
      }
    } catch (err) {
      console.error('Error escalating approval:', err);
      setError('Failed to escalate approval');
    } finally {
      setLoading(false);
    }
  };

  if (!approvalStatus) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { process, approvals, progress } = approvalStatus;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Approval Status
            </CardTitle>
            <CardDescription>
              {progress?.current} of {progress?.required} approvals received
            </CardDescription>
          </div>
          <Badge
            variant={
              process.status === 'approved'
                ? 'default'
                : process.status === 'rejected'
                ? 'destructive'
                : process.status === 'escalated'
                ? 'secondary'
                : 'outline'
            }
          >
            {process.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{progress?.percentage}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                progress?.percentage === 100
                  ? 'bg-green-500'
                  : 'bg-primary'
              )}
              style={{ width: `${progress?.percentage}%` }}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Approver List */}
        <div>
          <Label className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Approvers
          </Label>
          <div className="space-y-2">
            {approvals?.map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {approval.decision === 'approved' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : approval.decision === 'rejected' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <div className="font-medium">{approval.approverName}</div>
                    <div className="text-sm text-muted-foreground">
                      {approval.approverRole}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      approval.decision === 'approved'
                        ? 'default'
                        : approval.decision === 'rejected'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {approval.decision}
                  </Badge>
                  {approval.timestamp && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(approval.timestamp).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Actions */}
        {showActions && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter your comments here..."
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comments are optional for approvals but required for rejections
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>

              <Button
                onClick={handleReject}
                variant="destructive"
                disabled={loading || !comments.trim()}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>

              <Button
                onClick={handleEscalate}
                variant="outline"
                disabled={loading}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Escalate
              </Button>
            </div>
          </div>
        )}

        {/* Process Info */}
        {process.deadline && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Deadline: {new Date(process.deadline).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {process.escalationLevel && process.escalationLevel > 0 && (
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This approval has been escalated (Level {process.escalationLevel})
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Delegation Management Component
 * Allows users to delegate their approval rights to other users
 * Stage 10: Multi-Party Approval Workflow - Delegation UI
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  UserPlus,
  UserMinus,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { cn } from '@/utils';
import { 
  approvalDelegationService,
  type ApprovalDelegation,
  type DelegationScope
} from '@/infrastructure/redemption/approval';
import { supabase } from '@/infrastructure/supabaseClient';

interface DelegationManagerProps {
  userId: string;
  className?: string;
}

export const DelegationManager: React.FC<DelegationManagerProps> = ({
  userId,
  className
}) => {
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [delegatedToMe, setDelegatedToMe] = useState<ApprovalDelegation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [delegateId, setDelegateId] = useState('');
  const [scope, setScope] = useState<DelegationScope>('all');
  const [durationDays, setDurationDays] = useState(30);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    loadDelegations();
    loadAvailableUsers();
  }, [userId]);

  const loadDelegations = async () => {
    try {
      const [active, delegated] = await Promise.all([
        approvalDelegationService.getActiveDelegations(userId),
        approvalDelegationService.getDelegatedToUser(userId)
      ]);

      setDelegations(active);
      setDelegatedToMe(delegated);
    } catch (err) {
      console.error('Error loading delegations:', err);
      setError('Failed to load delegations');
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // Get users with approval permissions
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          user_roles!inner (role)
        `)
        .neq('id', userId)
        .in('user_roles.role', ['admin', 'super_admin', 'operations_manager', 'approver']);

      if (error) throw error;

      setAvailableUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleCreateDelegation = async () => {
    if (!delegateId) {
      setError('Please select a delegate');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await approvalDelegationService.createDelegation(
        userId,
        delegateId,
        scope,
        durationDays
      );

      await loadDelegations();
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error creating delegation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create delegation');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDelegation = async (delegationId: string) => {
    if (!confirm('Are you sure you want to revoke this delegation?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await approvalDelegationService.revokeDelegation(
        delegationId,
        'Revoked by user'
      );

      await loadDelegations();
    } catch (err) {
      console.error('Error revoking delegation:', err);
      setError('Failed to revoke delegation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDelegateId('');
    setScope('all');
    setDurationDays(30);
  };

  const getDelegateeName = (delegation: ApprovalDelegation) => {
    const user = availableUsers.find(u => u.id === delegation.delegateId);
    return user?.name || user?.email || 'Unknown User';
  };

  const getDelegatorName = (delegation: ApprovalDelegation) => {
    const user = availableUsers.find(u => u.id === delegation.delegatorId);
    return user?.name || user?.email || 'Unknown User';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* My Delegations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Delegations</CardTitle>
              <CardDescription>
                Approval rights you have delegated to others
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Delegation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Approval Delegation</DialogTitle>
                  <DialogDescription>
                    Delegate your approval rights to another user
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label htmlFor="delegate">Delegate To</Label>
                    <Select value={delegateId} onValueChange={setDelegateId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="scope">Delegation Scope</Label>
                    <Select value={scope} onValueChange={(v) => setScope(v as DelegationScope)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Approvals</SelectItem>
                        <SelectItem value="amount_limit">Amount Limited</SelectItem>
                        <SelectItem value="token_type">Token Type</SelectItem>
                        <SelectItem value="specific_conditions">Specific Conditions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (Days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="90"
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum 90 days
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateDelegation}
                    disabled={loading || !delegateId}
                  >
                    Create Delegation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {delegations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserMinus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active delegations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delegations.map(delegation => (
                <div
                  key={delegation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {getDelegateeName(delegation)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant="outline">{delegation.scope}</Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires: {delegation.endDate ? new Date(delegation.endDate).toLocaleDateString() : 'No expiration'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevokeDelegation(delegation.id)}
                    disabled={loading}
                  >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delegated To Me */}
      <Card>
        <CardHeader>
          <CardTitle>Delegated To Me</CardTitle>
          <CardDescription>
            Approval rights delegated to you by others
          </CardDescription>
        </CardHeader>

        <CardContent>
          {delegatedToMe.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No delegations received</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delegatedToMe.map(delegation => (
                <div
                  key={delegation.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      From: {getDelegatorName(delegation)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant="secondary">{delegation.scope}</Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Valid until: {delegation.endDate ? new Date(delegation.endDate).toLocaleDateString() : 'No expiration'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

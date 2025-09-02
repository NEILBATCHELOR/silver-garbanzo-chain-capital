/**
 * Bulk Organization Assignment Component
 * UI for bulk organization assignment operations
 */

import React, { useState, useEffect } from 'react';
import { Users, Upload, Download, Copy, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Components
import OrganizationPicker from './OrganizationPicker';

// Services
import BulkOrganizationAssignmentService, { 
  type UserBulkAssignmentData, 
  type BulkAssignmentResult 
} from './bulkOrganizationAssignmentService';
import OrganizationAssignmentService from './organizationAssignmentService';

// Role utilities
import { getAllRoles, type Role } from '@/utils/auth/roleUtils';
import { getRoleDisplayName } from '@/utils/auth/roleNormalizer';

interface BulkOrganizationAssignmentProps {
  roleId?: string;
  onAssignmentChange?: (result: BulkAssignmentResult) => void;
}

const BulkOrganizationAssignment: React.FC<BulkOrganizationAssignmentProps> = ({
  roleId: defaultRoleId,
  onAssignmentChange
}) => {
  const { toast } = useToast();

  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserBulkAssignmentData[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(defaultRoleId || '');
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'all' | 'multiple' | 'single'>('multiple');
  const [changeReason, setChangeReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: '', description: '', action: () => {} });

  // Load roles and users when component mounts or role changes
  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      loadUsers();
    }
  }, [selectedRoleId]);

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const rolesData = await getAllRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userData = await BulkOrganizationAssignmentService.getUsersForBulkAssignment(selectedRoleId);
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users for bulk assignment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(user => user.userId));
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedUserIds.length === 0) {
      toast({
        title: 'Selection Required',
        description: 'Please select at least one user.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedRoleId) {
      toast({
        title: 'Role Required',
        description: 'Please select a role.',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentMode !== 'all' && selectedOrganizationIds.length === 0) {
      toast({
        title: 'Organizations Required',
        description: 'Please select at least one organization or choose "All Organizations" mode.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);

      const result = await BulkOrganizationAssignmentService.bulkAssignUsersToOrganizations({
        userIds: selectedUserIds,
        roleId: selectedRoleId,
        mode: assignmentMode,
        organizationIds: selectedOrganizationIds,
        changeReason: changeReason.trim() || undefined
      });

      // Show result
      if (result.success) {
        toast({
          title: 'Bulk Assignment Complete',
          description: `Successfully assigned ${result.summary.successfulAssignments} users to organizations.`,
        });
      } else {
        toast({
          title: 'Bulk Assignment Partial Success',
          description: `${result.summary.successfulAssignments} users assigned successfully, ${result.summary.failedAssignments} failed.`,
          variant: 'destructive',
        });
      }

      // Reset form and reload users
      setSelectedUserIds([]);
      setSelectedOrganizationIds([]);
      setChangeReason('');
      setOpen(false);
      await loadUsers();

      // Notify parent
      onAssignmentChange?.(result);
    } catch (error) {
      console.error('Failed to perform bulk assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform bulk assignment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedUserIds.length === 0) {
      toast({
        title: 'Selection Required',
        description: 'Please select at least one user.',
        variant: 'destructive',
      });
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Confirm Bulk Removal',
      description: `Are you sure you want to remove organization assignments for ${selectedUserIds.length} selected user(s)? This action cannot be undone.`,
      action: async () => {
        try {
          setProcessing(true);
          const result = await BulkOrganizationAssignmentService.bulkRemoveUsersFromOrganizations(
            selectedUserIds,
            selectedRoleId
          );

          if (result.success) {
            toast({
              title: 'Bulk Removal Complete',
              description: `Successfully removed assignments for ${result.summary.successfulAssignments} users.`,
            });
          } else {
            toast({
              title: 'Bulk Removal Partial Success',
              description: `${result.summary.successfulAssignments} users processed successfully, ${result.summary.failedAssignments} failed.`,
              variant: 'destructive',
            });
          }

          setSelectedUserIds([]);
          await loadUsers();
          onAssignmentChange?.(result);
        } catch (error) {
          console.error('Failed to perform bulk removal:', error);
          toast({
            title: 'Error',
            description: 'Failed to perform bulk removal. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setProcessing(false);
        }
      }
    });
  };

  const getUserAssignmentSummary = (user: UserBulkAssignmentData): string => {
    const roleAssignment = user.currentAssignments.find(a => a.roleId === selectedRoleId);
    if (!roleAssignment || roleAssignment.organizationIds.length === 0) {
      return 'No assignments';
    }
    return `${roleAssignment.organizationIds.length} organization${roleAssignment.organizationIds.length !== 1 ? 's' : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk Organization Assignment
        </CardTitle>
        <CardDescription>
          Assign multiple users to organizations simultaneously
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Selection */}
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={!!defaultRoleId || loadingRoles}>
            <SelectTrigger>
              <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role..."} />
            </SelectTrigger>
            <SelectContent>
              {loadingRoles ? (
                <SelectItem value="loading" disabled>Loading roles...</SelectItem>
              ) : roles.length > 0 ? (
                roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {getRoleDisplayName(role.name)}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-roles" disabled>No roles available</SelectItem>
              )}
            </SelectContent>
          </Select>
          {defaultRoleId && (
            <div className="text-sm text-muted-foreground">
              Role is pre-selected
            </div>
          )}
        </div>

        {/* User List */}
        {selectedRoleId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Users ({users.length})</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={loading || users.length === 0}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {selectedUserIds.length === users.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadUsers}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">Loading users...</div>
              </div>
            ) : users.length > 0 ? (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedUserIds.length === users.length && users.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Current Assignments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.includes(user.userId)}
                            onCheckedChange={(checked) => handleUserSelection(user.userId, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.userName}</div>
                            <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getUserAssignmentSummary(user)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">No users found for the selected role.</div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {selectedUserIds.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRemove}
                disabled={processing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Assignments
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button disabled={processing}>
                    <Users className="h-4 w-4 mr-2" />
                    Assign to Organizations
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Bulk Assign to Organizations</DialogTitle>
                    <DialogDescription>
                      Assign {selectedUserIds.length} selected user{selectedUserIds.length !== 1 ? 's' : ''} to organizations.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    {/* Assignment Mode */}
                    <div className="space-y-2">
                      <Label>Assignment Mode</Label>
                      <Select value={assignmentMode} onValueChange={(value) => setAssignmentMode(value as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Organizations</SelectItem>
                          <SelectItem value="multiple">Multiple Organizations</SelectItem>
                          <SelectItem value="single">Single Organization</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Organization Selection */}
                    {assignmentMode !== 'all' && (
                      <div className="space-y-2">
                        <Label>Organizations</Label>
                        <OrganizationPicker
                          selectedOrganizationIds={selectedOrganizationIds}
                          onSelectionChange={setSelectedOrganizationIds}
                          mode={assignmentMode}
                          placeholder="Select organizations..."
                        />
                      </div>
                    )}

                    {/* Change Reason */}
                    <div className="space-y-2">
                      <Label htmlFor="reason">Change Reason (Optional)</Label>
                      <Textarea
                        id="reason"
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="Describe the reason for this bulk assignment..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAssign} disabled={processing}>
                      {processing ? 'Processing...' : 'Assign Users'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {confirmDialog.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDialog.action}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default BulkOrganizationAssignment;

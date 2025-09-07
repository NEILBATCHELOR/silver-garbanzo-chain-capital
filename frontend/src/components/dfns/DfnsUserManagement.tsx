/**
 * DFNS User Management Component - Complete user lifecycle management interface
 * 
 * This component provides a comprehensive interface for managing DFNS users including:
 * - User listing with pagination and search
 * - User creation (CustomerEmployee)
 * - User lifecycle operations (activate/deactivate/archive)
 * - Permission assignment visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Users, 
  Search, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Archive, 
  Mail,
  Shield,
  Calendar,
  Eye,
  Loader2
} from 'lucide-react';

import { DfnsUserManager } from '@/infrastructure/dfns';
import type { 
  DfnsUser, 
  CreateUserRequest, 
  ListUsersResponse,
  DfnsUserStatus,
  DfnsUserKind,
  UserSearchCriteria
} from '@/types/dfns/user';

export interface DfnsUserManagementProps {
  userManager: DfnsUserManager;
  onUserCreated?: (user: DfnsUser) => void;
  onUserUpdated?: (user: DfnsUser) => void;
  onUserArchived?: (userId: string) => void;
  className?: string;
}

export function DfnsUserManagement({
  userManager,
  onUserCreated,
  onUserUpdated,
  onUserArchived,
  className
}: DfnsUserManagementProps) {
  // State management
  const [users, setUsers] = useState<DfnsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DfnsUserStatus | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<DfnsUser | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [pagination, setPagination] = useState<{ nextPageToken?: string }>({});

  // Create user form state
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    email: '',
    kind: 'CustomerEmployee' as DfnsUserKind.CustomerEmployee,
    externalId: ''
  });

  // Load users
  const loadUsers = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const paginationToken = reset ? undefined : pagination.nextPageToken;
      
      const response = await userManager.listUsers({
        limit: 50,
        paginationToken
      });

      if (reset) {
        setUsers(response.items);
      } else {
        setUsers(prev => [...prev, ...response.items]);
      }

      setPagination({ nextPageToken: response.nextPageToken });
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userManager, pagination.nextPageToken]);

  // Initial load
  useEffect(() => {
    loadUsers(true);
  }, [userManager]);

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'Active' && user.isActive) ||
      (statusFilter === 'Inactive' && !user.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Create user
  const handleCreateUser = async () => {
    try {
      if (!createForm.email) {
        toast.error('Email is required');
        return;
      }

      const newUser = await userManager.createUser(createForm);
      setUsers(prev => [newUser, ...prev]);
      setIsCreateDialogOpen(false);
      setCreateForm({ email: '', kind: 'CustomerEmployee' as DfnsUserKind.CustomerEmployee, externalId: '' });
      toast.success('User created successfully');
      onUserCreated?.(newUser);
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user. Please try again.');
    }
  };

  // Activate user
  const handleActivateUser = async (userId: string) => {
    try {
      const updatedUser = await userManager.activateUser(userId);
      setUsers(prev => prev.map(u => u.userId === userId ? updatedUser : u));
      toast.success('User activated successfully');
      onUserUpdated?.(updatedUser);
    } catch (error) {
      console.error('Failed to activate user:', error);
      toast.error('Failed to activate user. Please try again.');
    }
  };

  // Deactivate user
  const handleDeactivateUser = async (userId: string) => {
    try {
      const updatedUser = await userManager.deactivateUser(userId);
      setUsers(prev => prev.map(u => u.userId === userId ? updatedUser : u));
      toast.success('User deactivated successfully');
      onUserUpdated?.(updatedUser);
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      toast.error('Failed to deactivate user. Please try again.');
    }
  };

  // Archive user
  const handleArchiveUser = async (userId: string) => {
    try {
      await userManager.archiveUser(userId);
      setUsers(prev => prev.filter(u => u.userId !== userId));
      toast.success('User archived successfully');
      onUserArchived?.(userId);
    } catch (error) {
      console.error('Failed to archive user:', error);
      toast.error('Failed to archive user. Please try again.');
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (user: DfnsUser) => {
    if (!user.isActive) return 'secondary';
    if (!user.isRegistered) return 'outline';
    return 'default';
  };

  // Get status text
  const getStatusText = (user: DfnsUser) => {
    if (!user.isActive) return 'Inactive';
    if (!user.isRegistered) return 'Pending';
    return 'Active';
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage DFNS users, permissions, and lifecycle operations
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new CustomerEmployee user. They will receive an email invitation to complete registration.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="externalId">External ID (Optional)</Label>
                <Input
                  id="externalId"
                  placeholder="External system ID"
                  value={createForm.externalId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, externalId: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email, name, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Manage user accounts, permissions, and lifecycle operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name || user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.username}</div>
                        {user.externalId && (
                          <div className="text-xs text-muted-foreground">ID: {user.externalId}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user)}>
                        {getStatusText(user)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.kind}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.permissionAssignments.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(user.dateCreated).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsUserDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {user.isActive ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <UserX className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate {user.username}? 
                                  They will lose access to the platform until reactivated.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeactivateUser(user.userId)}>
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivateUser(user.userId)}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Archive className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to archive {user.username}? 
                                This action cannot be undone and will permanently remove the user.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleArchiveUser(user.userId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Load More */}
          {pagination.nextPageToken && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={() => loadUsers(false)} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>User ID</Label>
                    <div className="font-mono text-sm">{selectedUser.userId}</div>
                  </div>
                  <div>
                    <Label>Kind</Label>
                    <div>{selectedUser.kind}</div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div>{selectedUser.username}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={getStatusBadgeVariant(selectedUser)}>
                      {getStatusText(selectedUser)}
                    </Badge>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <div>{new Date(selectedUser.dateCreated).toLocaleString()}</div>
                  </div>
                  <div>
                    <Label>Last Login</Label>
                    <div>{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}</div>
                  </div>
                </div>
                
                {selectedUser.externalId && (
                  <div>
                    <Label>External ID</Label>
                    <div className="font-mono text-sm">{selectedUser.externalId}</div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="permissions" className="space-y-4">
                {selectedUser.permissionAssignments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.permissionAssignments.map((assignment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{assignment.permissionId}</div>
                          <div className="text-sm text-muted-foreground">
                            Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={assignment.status === 'Active' ? 'default' : 'secondary'}>
                          {assignment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No permissions assigned
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DfnsUserManagement;

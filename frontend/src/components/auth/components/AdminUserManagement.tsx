/**
 * Admin User Management Component
 * 
 * Provides admin-level user management functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Ban, 
  Mail, 
  Shield, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useToast } from '@/components/ui/use-toast';

import { authService } from '../services/authWrapper';
import { formatAuthError, formatLastSignIn } from '../utils/authUtils';

interface AdminUser {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  banned_until?: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}

type UserStatus = 'all' | 'active' | 'pending' | 'banned';
type SortField = 'email' | 'created_at' | 'last_sign_in_at';
type SortOrder = 'asc' | 'desc';

interface AdminUserManagementProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canBan?: boolean;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canBan = true,
}) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);

  const { toast } = useToast();
  const pageSize = 10;

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, sortField, sortOrder, searchTerm]);

  const loadUsers = async () => {
    setLoading(true);
    
    try {
      const response = await authService.listUsers({
        page,
        perPage: pageSize,
        filter: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy: `${sortField}:${sortOrder}`,
        searchTerm: searchTerm || undefined,
      });
      
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setTotalUsers(response.data.total || 0);
      } else {
        toast({
          title: "Failed to load users",
          description: response.error?.message || "Could not fetch user list",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to load users",
        description: formatAuthError(error.message),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !canDelete) return;
    
    setActionLoading('delete');
    
    try {
      const response = await authService.deleteUser(selectedUser.id);
      
      if (response.success) {
        toast({
          title: "User deleted",
          description: `User ${selectedUser.email} has been deleted.`,
        });
        await loadUsers();
      } else {
        toast({
          title: "Failed to delete user",
          description: response.error?.message || "Could not delete user",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to delete user",
        description: formatAuthError(error.message),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setShowDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !canBan) return;
    
    setActionLoading('ban');
    
    try {
      const banUntil = new Date();
      banUntil.setFullYear(banUntil.getFullYear() + 1); // Ban for 1 year
      
      const response = await authService.updateUserById(selectedUser.id, {
        banned_until: banUntil.toISOString(),
      });
      
      if (response.success) {
        toast({
          title: "User banned",
          description: `User ${selectedUser.email} has been banned.`,
        });
        await loadUsers();
      } else {
        toast({
          title: "Failed to ban user",
          description: response.error?.message || "Could not ban user",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to ban user",
        description: formatAuthError(error.message),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setShowBanDialog(false);
      setSelectedUser(null);
    }
  };

  const handleUnbanUser = async (user: AdminUser) => {
    if (!canBan) return;
    
    setActionLoading('unban');
    
    try {
      const response = await authService.updateUserById(user.id, {
        banned_until: null,
      });
      
      if (response.success) {
        toast({
          title: "User unbanned",
          description: `User ${user.email} has been unbanned.`,
        });
        await loadUsers();
      } else {
        toast({
          title: "Failed to unban user",
          description: response.error?.message || "Could not unban user",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to unban user",
        description: formatAuthError(error.message),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getUserStatus = (user: AdminUser): { status: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return { status: 'Banned', variant: 'destructive' };
    }
    if (!user.email_confirmed_at) {
      return { status: 'Pending', variant: 'secondary' };
    }
    return { status: 'Active', variant: 'default' };
  };

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">User Management</CardTitle>
                <CardDescription>
                  Manage all users in your application
                </CardDescription>
              </div>
            </div>
            
            {canCreate && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value: UserStatus) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={`${sortField}:${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split(':');
              setSortField(field as SortField);
              setSortOrder(order as SortOrder);
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at:desc">Newest First</SelectItem>
                <SelectItem value="created_at:asc">Oldest First</SelectItem>
                <SelectItem value="email:asc">Email A-Z</SelectItem>
                <SelectItem value="email:desc">Email Z-A</SelectItem>
                <SelectItem value="last_sign_in_at:desc">Recent Sign In</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userStatus = getUserStatus(user);
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{user.email}</div>
                            {user.phone && (
                              <div className="text-sm text-muted-foreground">{user.phone}</div>
                            )}
                            {user.user_metadata?.firstName && (
                              <div className="text-sm text-muted-foreground">
                                {user.user_metadata.firstName} {user.user_metadata.lastName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={userStatus.variant}>
                            {userStatus.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.last_sign_in_at ? formatLastSignIn({ last_sign_in_at: user.last_sign_in_at } as any) : 'Never'}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              
                              {canEdit && (
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {canBan && userStatus.status !== 'Banned' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowBanDialog(true);
                                  }}
                                  className="text-orange-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban User
                                </DropdownMenuItem>
                              )}
                              
                              {canBan && userStatus.status === 'Banned' && (
                                <DropdownMenuItem
                                  onClick={() => handleUnbanUser(user)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Unban User
                                </DropdownMenuItem>
                              )}
                              
                              {canDelete && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalUsers)} of {totalUsers} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban User Dialog */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ban {selectedUser?.email}? They will not be able to sign in until unbanned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className="bg-orange-600 text-white hover:bg-orange-700"
              disabled={actionLoading === 'ban'}
            >
              {actionLoading === 'ban' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Banning...
                </>
              ) : (
                'Ban User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;

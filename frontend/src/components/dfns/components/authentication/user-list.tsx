import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Archive,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsUserResponse } from "../../../../types/dfns/users";

/**
 * User List Component
 * Displays and manages organization users with CRUD operations
 */
export function UserList() {
  const [users, setUsers] = useState<DfnsUserResponse[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DfnsUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<DfnsUserResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate' | 'archive' | null;
    user: DfnsUserResponse | null;
  }>({ open: false, action: null, user: null });

  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Fetch users from DFNS
  useEffect(() => {
    const fetchUsers = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const userService = dfnsService.getUserService();
        const allUsers = await userService.getAllUsers();
        
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [dfnsService]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.kind.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.isActive ? 'active' : 'inactive').includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleUserAction = async (action: 'activate' | 'deactivate' | 'archive', user: DfnsUserResponse) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`${action}-${user.userId}`);
      const userService = dfnsService.getUserService();

      let updatedUser: DfnsUserResponse;
      
      switch (action) {
        case 'activate':
          updatedUser = await userService.activateUser(user.userId);
          break;
        case 'deactivate':
          updatedUser = await userService.deactivateUser(user.userId);
          break;
        case 'archive':
          updatedUser = await userService.archiveUser(user.userId);
          break;
        default:
          return;
      }

      // Update the users list
      setUsers(prev => prev.map(u => u.userId === user.userId ? updatedUser : u));
      setConfirmDialog({ open: false, action: null, user: null });
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      setError(`Failed to ${action} user: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirmDialog = (action: 'activate' | 'deactivate' | 'archive', user: DfnsUserResponse) => {
    setConfirmDialog({ open: true, action, user });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'deactivated': return 'secondary';
      case 'archived': return 'destructive';
      default: return 'outline';
    }
  };

  const getKindBadgeVariant = (kind: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (kind) {
      case 'CustomerEmployee': return 'default';
      case 'EndUser': return 'secondary';
      default: return 'outline';
    }
  };

  const canPerformAction = (action: 'activate' | 'deactivate' | 'archive', user: DfnsUserResponse): boolean => {
    switch (action) {
      case 'activate':
        return !user.isActive;
      case 'deactivate':
        return user.isActive;
      case 'archive':
        return user.isActive !== undefined; // Can always archive unless already archived
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Organization Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Organization Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Organization Users</span>
              </CardTitle>
              <CardDescription>
                Manage users in your DFNS organization ({filteredUsers.length} users)
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by username, email, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getKindBadgeVariant(user.kind)}>
                          {user.kind}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.isActive ? 'active' : 'inactive')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">N/A</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">N/A</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              disabled={!!actionLoading}
                            >
                              {actionLoading?.includes(user.userId) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canPerformAction('activate', user) && (
                              <DropdownMenuItem
                                onClick={() => openConfirmDialog('activate', user)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {canPerformAction('deactivate', user) && (
                              <DropdownMenuItem
                                onClick={() => openConfirmDialog('deactivate', user)}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            {canPerformAction('archive', user) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog('archive', user)}
                                  className="text-destructive"
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog({ open, action: null, user: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirmDialog.action && confirmDialog.action.charAt(0).toUpperCase() + confirmDialog.action.slice(1)} User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action} user "{confirmDialog.user?.username}"?
              {confirmDialog.action === 'archive' && (
                <span className="block mt-2 text-destructive">
                  This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null, user: null })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'archive' ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmDialog.action && confirmDialog.user) {
                  handleUserAction(confirmDialog.action, confirmDialog.user);
                }
              }}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {confirmDialog.action && confirmDialog.action.charAt(0).toUpperCase() + confirmDialog.action.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

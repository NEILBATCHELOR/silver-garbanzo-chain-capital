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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  UserCheck, 
  Search, 
  Plus, 
  MoreHorizontal, 
  UserX,
  Loader2,
  AlertCircle,
  Eye,
  User,
  Bot,
  Key
} from "lucide-react";
import { useState, useEffect } from "react";
import { DfnsService } from "@/services/dfns";
import type { 
  DfnsPermissionAssignmentResponse, 
  DfnsGetPermissionResponse,
  DfnsAssignPermissionRequest 
} from "@/types/dfns/permissions";
import type { DfnsUserResponse } from "@/types/dfns/users";
import type { DfnsGetServiceAccountResponse } from "@/types/dfns/serviceAccounts";
import type { DfnsPersonalAccessToken } from "@/types/dfns/auth";

/**
 * Permission Assignment Component
 * Displays and manages DFNS permission assignments with assignment/revocation operations
 */
export function PermissionAssignment() {
  const [assignments, setAssignments] = useState<DfnsPermissionAssignmentResponse[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<DfnsPermissionAssignmentResponse[]>([]);
  const [permissions, setPermissions] = useState<DfnsGetPermissionResponse[]>([]);
  const [users, setUsers] = useState<DfnsUserResponse[]>([]);
  const [serviceAccounts, setServiceAccounts] = useState<DfnsGetServiceAccountResponse[]>([]);
  const [personalTokens, setPersonalTokens] = useState<DfnsPersonalAccessToken[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Assignment Dialog State
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    permissionId: string;
    identityId: string;
    identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken';
  }>({ 
    open: false, 
    permissionId: '', 
    identityId: '', 
    identityKind: 'User' 
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'revoke' | null;
    assignment: DfnsPermissionAssignmentResponse | null;
  }>({ open: false, action: null, assignment: null });

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

  // Fetch data from DFNS
  useEffect(() => {
    const fetchData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch assignments, permissions, and identities in parallel
        const [
          allAssignments,
          allPermissions,
          allUsers,
          allServiceAccounts,
          allPersonalTokens
        ] = await Promise.all([
          dfnsService.getPermissionService().getAllPermissionAssignments(),
          dfnsService.getPermissionService().getAllPermissions(),
          dfnsService.getUserService().getAllUsers(),
          dfnsService.getServiceAccountService().getAllServiceAccounts(),
          dfnsService.getPersonalAccessTokenService().listPersonalAccessTokens()
        ]);
        
        setAssignments(allAssignments);
        setFilteredAssignments(allAssignments);
        setPermissions(allPermissions);
        setUsers(allUsers);
        setServiceAccounts(allServiceAccounts);
        setPersonalTokens(allPersonalTokens);
      } catch (error) {
        console.error('Failed to fetch permission assignments:', error);
        setError('Failed to load permission assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dfnsService]);

  // Filter assignments based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAssignments(assignments);
    } else {
      const filtered = assignments.filter(assignment => {
        const permission = permissions.find(p => p.id === assignment.permissionId);
        const permissionName = permission?.name || '';
        
        return (
          permissionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.identityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.identityKind.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredAssignments(filtered);
    }
  }, [searchTerm, assignments, permissions]);

  const handleAssignPermission = async () => {
    if (!dfnsService || !assignDialog.permissionId || !assignDialog.identityId) return;

    try {
      setActionLoading('assign');
      const permissionService = dfnsService.getPermissionService();

      const request: DfnsAssignPermissionRequest = {
        permissionId: assignDialog.permissionId,
        identityId: assignDialog.identityId,
        identityKind: assignDialog.identityKind
      };

      const newAssignment = await permissionService.assignPermission(request, {
        syncToDatabase: true
      });

      // Add to assignments list
      setAssignments(prev => [...prev, newAssignment]);
      setAssignDialog({ 
        open: false, 
        permissionId: '', 
        identityId: '', 
        identityKind: 'User' 
      });
    } catch (error) {
      console.error('Failed to assign permission:', error);
      setError(`Failed to assign permission: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAssignment = async (assignment: DfnsPermissionAssignmentResponse) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`revoke-${assignment.id}`);
      const permissionService = dfnsService.getPermissionService();

      const revokedAssignment = await permissionService.revokePermissionAssignment(
        assignment.id,
        { syncToDatabase: true }
      );

      // Update the assignments list
      setAssignments(prev => prev.map(a => a.id === assignment.id ? revokedAssignment : a));
      setConfirmDialog({ open: false, action: null, assignment: null });
    } catch (error) {
      console.error('Failed to revoke permission assignment:', error);
      setError(`Failed to revoke permission assignment: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirmDialog = (action: 'revoke', assignment: DfnsPermissionAssignmentResponse) => {
    setConfirmDialog({ open: true, action, assignment });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'revoked': return 'destructive';
      default: return 'outline';
    }
  };

  const getIdentityIcon = (identityKind: string) => {
    switch (identityKind) {
      case 'User': return <User className="h-4 w-4" />;
      case 'ServiceAccount': return <Bot className="h-4 w-4" />;
      case 'PersonalAccessToken': return <Key className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getIdentityName = (identityId: string, identityKind: string): string => {
    switch (identityKind) {
      case 'User':
        const user = users.find(u => u.userId === identityId);
        return user?.username || identityId;
      case 'ServiceAccount':
        const serviceAccount = serviceAccounts.find(sa => sa.userInfo?.userId === identityId);
        return serviceAccount?.userInfo?.username || identityId;
      case 'PersonalAccessToken':
        const token = personalTokens.find(t => t.tokenId === identityId);
        return token?.name || identityId;
      default:
        return identityId;
    }
  };

  const getPermissionName = (permissionId: string): string => {
    const permission = permissions.find(p => p.id === permissionId);
    return permission?.name || permissionId;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Permission Assignments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading assignments...</span>
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
            <UserCheck className="h-5 w-5" />
            <span>Permission Assignments</span>
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
                <UserCheck className="h-5 w-5" />
                <span>Permission Assignments</span>
              </CardTitle>
              <CardDescription>
                Manage permission assignments to users, service accounts, and tokens ({filteredAssignments.length} assignments)
              </CardDescription>
            </div>
            <Button onClick={() => setAssignDialog({ 
              open: true, 
              permissionId: '', 
              identityId: '', 
              identityKind: 'User' 
            })}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Permission
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments by permission, identity, or status..."
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
                  <TableHead>Permission</TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No assignments found matching your search.' : 'No permission assignments found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getPermissionName(assignment.permissionId)}</div>
                          <div className="text-sm text-muted-foreground">{assignment.permissionId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getIdentityName(assignment.identityId, assignment.identityKind)}</div>
                          <div className="text-sm text-muted-foreground">{assignment.identityId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center w-fit">
                          {getIdentityIcon(assignment.identityKind)}
                          <span className="ml-1">{assignment.identityKind}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{assignment.assignedBy}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{formatDate(assignment.dateAssigned)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              disabled={!!actionLoading}
                            >
                              {actionLoading?.includes(assignment.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {assignment.status === 'Active' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog('revoke', assignment)}
                                  className="text-destructive"
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Revoke Assignment
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

      {/* Assign Permission Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => 
        setAssignDialog({ 
          open, 
          permissionId: '', 
          identityId: '', 
          identityKind: 'User' 
        })
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Permission</DialogTitle>
            <DialogDescription>
              Assign a permission to a user, service account, or personal access token.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="permission">Permission</Label>
              <Select 
                value={assignDialog.permissionId} 
                onValueChange={(value) => 
                  setAssignDialog(prev => ({ ...prev, permissionId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a permission" />
                </SelectTrigger>
                <SelectContent>
                  {permissions.filter(p => p.status === 'Active').map((permission) => (
                    <SelectItem key={permission.id} value={permission.id}>
                      <div>
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {permission.operations.length} operations, {permission.effect}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="identityKind">Identity Type</Label>
              <Select 
                value={assignDialog.identityKind} 
                onValueChange={(value: 'User' | 'ServiceAccount' | 'PersonalAccessToken') => 
                  setAssignDialog(prev => ({ ...prev, identityKind: value, identityId: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      User
                    </div>
                  </SelectItem>
                  <SelectItem value="ServiceAccount">
                    <div className="flex items-center">
                      <Bot className="h-4 w-4 mr-2" />
                      Service Account
                    </div>
                  </SelectItem>
                  <SelectItem value="PersonalAccessToken">
                    <div className="flex items-center">
                      <Key className="h-4 w-4 mr-2" />
                      Personal Access Token
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="identity">
                {assignDialog.identityKind === 'User' ? 'User' :
                 assignDialog.identityKind === 'ServiceAccount' ? 'Service Account' :
                 'Personal Access Token'}
              </Label>
              <Select 
                value={assignDialog.identityId} 
                onValueChange={(value) => 
                  setAssignDialog(prev => ({ ...prev, identityId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${assignDialog.identityKind.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {assignDialog.identityKind === 'User' && 
                    users.filter(u => u.isActive).map((user) => (
                      <SelectItem key={user.userId} value={user.userId}>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-xs text-muted-foreground">{user.userId}</div>
                        </div>
                      </SelectItem>
                    ))
                  }
                  {assignDialog.identityKind === 'ServiceAccount' && 
                    serviceAccounts.filter(sa => sa.userInfo?.isActive).map((serviceAccount) => (
                      <SelectItem key={serviceAccount.userInfo?.userId} value={serviceAccount.userInfo?.userId || ''}>
                        <div>
                          <div className="font-medium">{serviceAccount.userInfo?.username}</div>
                          <div className="text-xs text-muted-foreground">{serviceAccount.userInfo?.userId}</div>
                        </div>
                      </SelectItem>
                    ))
                  }
                  {assignDialog.identityKind === 'PersonalAccessToken' && 
                    personalTokens.filter(t => t.isActive).map((token) => (
                      <SelectItem key={token.tokenId} value={token.tokenId}>
                        <div>
                          <div className="font-medium">{token.name}</div>
                          <div className="text-xs text-muted-foreground">{token.tokenId}</div>
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAssignDialog({ 
                open: false, 
                permissionId: '', 
                identityId: '', 
                identityKind: 'User' 
              })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignPermission}
              disabled={!assignDialog.permissionId || !assignDialog.identityId || !!actionLoading}
            >
              {actionLoading === 'assign' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Assign Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog({ open, action: null, assignment: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Revoke Permission Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this permission assignment?
              <div className="mt-2 p-2 bg-muted rounded-md">
                <div><strong>Permission:</strong> {confirmDialog.assignment && getPermissionName(confirmDialog.assignment.permissionId)}</div>
                <div><strong>Identity:</strong> {confirmDialog.assignment && getIdentityName(confirmDialog.assignment.identityId, confirmDialog.assignment.identityKind)}</div>
              </div>
              <span className="block mt-2 text-destructive">
                This action cannot be undone, but a new assignment can be created.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null, assignment: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDialog.assignment) {
                  handleRevokeAssignment(confirmDialog.assignment);
                }
              }}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Revoke Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

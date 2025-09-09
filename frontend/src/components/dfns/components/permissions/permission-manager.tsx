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
  Shield, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit,
  Archive,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsGetPermissionResponse } from "../../../../types/dfns/permissions";

/**
 * Permission Manager Component
 * Displays and manages DFNS permissions with CRUD operations
 */
export function PermissionManager() {
  const [permissions, setPermissions] = useState<DfnsGetPermissionResponse[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<DfnsGetPermissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPermission, setSelectedPermission] = useState<DfnsGetPermissionResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'archive' | null;
    permission: DfnsGetPermissionResponse | null;
  }>({ open: false, action: null, permission: null });
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    permission: DfnsGetPermissionResponse | null;
  }>({ open: false, permission: null });

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

  // Fetch permissions from DFNS
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const permissionService = dfnsService.getPermissionService();
        const allPermissions = await permissionService.getAllPermissions();
        
        setPermissions(allPermissions);
        setFilteredPermissions(allPermissions);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setError('Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [dfnsService]);

  // Filter permissions based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPermissions(permissions);
    } else {
      const filtered = permissions.filter(permission => 
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.effect.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (permission.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.operations.some(op => op.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredPermissions(filtered);
    }
  }, [searchTerm, permissions]);

  const handlePermissionAction = async (action: 'archive', permission: DfnsGetPermissionResponse) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`${action}-${permission.id}`);
      const permissionService = dfnsService.getPermissionService();

      let updatedPermission: DfnsGetPermissionResponse;
      
      switch (action) {
        case 'archive':
          const archivedResult = await permissionService.archivePermission(permission.id);
          updatedPermission = archivedResult;
          break;
        default:
          return;
      }

      // Update the permissions list
      setPermissions(prev => prev.map(p => p.id === permission.id ? updatedPermission : p));
      setConfirmDialog({ open: false, action: null, permission: null });
    } catch (error) {
      console.error(`Failed to ${action} permission:`, error);
      setError(`Failed to ${action} permission: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirmDialog = (action: 'archive', permission: DfnsGetPermissionResponse) => {
    setConfirmDialog({ open: true, action, permission });
  };

  const openDetailsDialog = (permission: DfnsGetPermissionResponse) => {
    setDetailsDialog({ open: true, permission });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      default: return 'outline';
    }
  };

  const getEffectBadgeVariant = (effect: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (effect) {
      case 'Allow': return 'default';
      case 'Deny': return 'destructive';
      default: return 'outline';
    }
  };

  const canPerformAction = (action: 'archive', permission: DfnsGetPermissionResponse): boolean => {
    switch (action) {
      case 'archive':
        return permission.status === 'Active';
      default:
        return false;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Permission Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading permissions...</span>
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
            <Shield className="h-5 w-5" />
            <span>Permission Management</span>
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
                <Shield className="h-5 w-5" />
                <span>Permission Management</span>
              </CardTitle>
              <CardDescription>
                Manage DFNS permissions and access control ({filteredPermissions.length} permissions)
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Permission
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions by name, effect, category, or operations..."
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
                  <TableHead>Effect</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Operations</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No permissions found matching your search.' : 'No permissions found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-sm text-muted-foreground">{permission.id}</div>
                          {permission.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {permission.description.length > 50 
                                ? `${permission.description.substring(0, 50)}...`
                                : permission.description
                              }
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEffectBadgeVariant(permission.effect)} className="flex items-center w-fit">
                          {permission.effect === 'Allow' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {permission.effect}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(permission.status)}>
                          {permission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {permission.operations.length} operation{permission.operations.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {permission.operations.slice(0, 2).join(', ')}
                          {permission.operations.length > 2 && ` +${permission.operations.length - 2} more`}
                        </div>
                      </TableCell>
                      <TableCell>
                        {permission.category ? (
                          <Badge variant="outline">{permission.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{formatDate(permission.dateCreated)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              disabled={!!actionLoading}
                            >
                              {actionLoading?.includes(permission.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openDetailsDialog(permission)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Permission
                            </DropdownMenuItem>
                            {canPerformAction('archive', permission) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog('archive', permission)}
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

      {/* Permission Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => 
        setDetailsDialog({ open, permission: null })
      }>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permission Details</DialogTitle>
            <DialogDescription>
              View detailed information about the permission
            </DialogDescription>
          </DialogHeader>
          {detailsDialog.permission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{detailsDialog.permission.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">ID</label>
                  <p className="text-sm text-muted-foreground font-mono">{detailsDialog.permission.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Effect</label>
                  <Badge variant={getEffectBadgeVariant(detailsDialog.permission.effect)} className="mt-1">
                    {detailsDialog.permission.effect}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={getStatusBadgeVariant(detailsDialog.permission.status)} className="mt-1">
                    {detailsDialog.permission.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">
                    {detailsDialog.permission.category || 'Uncategorized'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">{formatDate(detailsDialog.permission.dateCreated)}</p>
                </div>
              </div>
              
              {detailsDialog.permission.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground mt-1">{detailsDialog.permission.description}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Operations ({detailsDialog.permission.operations.length})</label>
                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  <div className="flex flex-wrap gap-1">
                    {detailsDialog.permission.operations.map((operation, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {operation}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {detailsDialog.permission.resources && detailsDialog.permission.resources.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Resources ({detailsDialog.permission.resources.length})</label>
                  <div className="mt-2 max-h-24 overflow-y-auto border rounded-md p-2">
                    <div className="flex flex-wrap gap-1">
                      {detailsDialog.permission.resources.map((resource, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {detailsDialog.permission.condition && (
                <div>
                  <label className="text-sm font-medium">Conditions</label>
                  <pre className="text-xs bg-muted p-2 rounded-md mt-1 overflow-x-auto">
                    {JSON.stringify(detailsDialog.permission.condition, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDetailsDialog({ open: false, permission: null })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog({ open, action: null, permission: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Archive Permission</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive permission "{confirmDialog.permission?.name}"?
              <span className="block mt-2 text-destructive">
                This will deactivate the permission and all its assignments. This action can be reversed.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null, permission: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDialog.action && confirmDialog.permission) {
                  handlePermissionAction(confirmDialog.action, confirmDialog.permission);
                }
              }}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

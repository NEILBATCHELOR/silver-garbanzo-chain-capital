import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  Users,
  Key,
  Settings,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/utils';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { DfnsPermission, DfnsPermissionAssignment } from '@/types/dfns';

interface PermissionManagerProps {
  permissions: DfnsPermission[];
  assignments: DfnsPermissionAssignment[];
  onPermissionUpdated: () => void;
  className?: string;
}

/**
 * Enhanced Permission Manager Component
 * Real DFNS permission management with comprehensive features
 */
export function PermissionManager({ 
  permissions, 
  assignments, 
  onPermissionUpdated,
  className 
}: PermissionManagerProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter permissions based on search and status
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          permission.operations?.some(op => op.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && permission.status === 'Active') ||
                         (filterStatus === 'inactive' && permission.status === 'Inactive');
    
    return matchesSearch && matchesStatus;
  });

  // Get assignment count for a permission
  const getAssignmentCount = (permissionId: string): number => {
    return assignments.filter(assignment => assignment.permissionId === permissionId).length;
  };

  // Handle permission actions
  const handlePermissionAction = async (action: string, permission: DfnsPermission) => {
    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      const permissionService = dfnsService.getPermissionsService();

      switch (action) {
        case 'activate':
          // Note: activatePermission method doesn't exist in the service yet
          toast({
            title: "Feature Not Available",
            description: `Permission activation for "${permission.name}" is not yet implemented`,
            variant: "destructive",
          });
          break;
        
        case 'deactivate':
          // Note: deactivatePermission method doesn't exist in the service yet
          toast({
            title: "Feature Not Available",
            description: `Permission deactivation for "${permission.name}" is not yet implemented`,
            variant: "destructive",
          });
          break;
        
        case 'edit':
          // TODO: Open edit dialog
          toast({
            title: "Edit Permission",
            description: `Opening edit dialog for "${permission.name}"`,
          });
          break;
        
        case 'delete':
          // TODO: Implement delete with confirmation
          if (getAssignmentCount(permission.permission_id) > 0) {
            toast({
              title: "Cannot Delete",
              description: "Permission has active assignments. Remove assignments first.",
              variant: "destructive",
            });
            return;
          }
          toast({
            title: "Delete Permission",
            description: `Delete functionality for "${permission.name}" will be implemented`,
          });
          break;
        
        case 'view-assignments':
          // TODO: Open assignments view
          toast({
            title: "View Assignments",
            description: `Showing assignments for "${permission.name}"`,
          });
          break;
        
        default:
          console.log(`Unknown action: ${action}`);
      }

      onPermissionUpdated();
    } catch (error: any) {
      console.error(`Error ${action} permission:`, error);
      setError(`Failed to ${action} permission: ${error.message}`);
      toast({
        title: "Error",
        description: `Failed to ${action} permission`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get permission status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'Inactive':
        return <Badge variant="destructive">Inactive</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Get permission effect badge
  const getEffectBadge = (effect: string) => {
    switch (effect) {
      case 'Allow':
        return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Allow
        </Badge>;
      case 'Deny':
        return <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Deny
        </Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Format operations list
  const formatOperations = (operations: string[]) => {
    if (!operations || operations.length === 0) return 'None';
    if (operations.length <= 2) return operations.join(', ');
    return `${operations.slice(0, 2).join(', ')} +${operations.length - 2} more`;
  };

  // Format resources list
  const formatResources = (resources: string[]) => {
    if (!resources || resources.length === 0) return 'All';
    if (resources.length <= 2) return resources.join(', ');
    return `${resources.slice(0, 2).join(', ')} +${resources.length - 2} more`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Permission Registry</h3>
          <p className="text-sm text-muted-foreground">
            {filteredPermissions.length} of {permissions.length} permissions
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All Permissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                Active Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>
                Inactive Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Permissions Table */}
      {filteredPermissions.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No permissions found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first permission to get started'
            }
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Permission
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead>Effect</TableHead>
                <TableHead>Operations</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.map((permission) => {
                const assignmentCount = getAssignmentCount(permission.permission_id);
                
                return (
                  <TableRow key={permission.permission_id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-md bg-blue-100">
                          <Shield className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{permission.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {permission.description || 'No description'}
                          </div>
                          {permission.category && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {permission.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getEffectBadge(permission.effect)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatOperations(permission.operations)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatResources(permission.resources)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePermissionAction('view-assignments', permission)}
                        className="gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {assignmentCount}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(permission.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={loading}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(permission.permission_id)}
                          >
                            Copy permission ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handlePermissionAction('view-assignments', permission)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View assignments ({assignmentCount})
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePermissionAction('edit', permission)}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit permission
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {permission.status === 'Active' ? (
                            <DropdownMenuItem
                              onClick={() => handlePermissionAction('deactivate', permission)}
                              className="gap-2 text-orange-600"
                            >
                              <Lock className="h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handlePermissionAction('activate', permission)}
                              className="gap-2 text-green-600"
                            >
                              <Unlock className="h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handlePermissionAction('delete', permission)}
                            className="gap-2 text-red-600"
                            disabled={assignmentCount > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
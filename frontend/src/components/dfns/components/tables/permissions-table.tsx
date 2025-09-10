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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Eye,
  Edit,
  Users,
  Archive,
  Loader2,
  AlertCircle,
  Filter,
  Lock,
  Unlock
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect, useMemo } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsPermissionResponse } from "../../../../types/dfns/permissions";

/**
 * Comprehensive Permissions Table Component
 * Advanced permission management with detailed information and assignment tracking
 */
export function PermissionsTable() {
  const [permissions, setPermissions] = useState<DfnsPermissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [effectFilter, setEffectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
        
        // Add computed isActive property for compatibility
        const permissionsWithComputed = allPermissions.map(permission => ({
          ...permission,
          isActive: permission.status === 'Active'
        }));
        
        setPermissions(permissionsWithComputed);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setError('Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [dfnsService]);

  // Filter permissions based on search and filters
  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const matchesSearch = !searchTerm.trim() || 
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.operations.some(op => op.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (permission.description?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesEffect = effectFilter === "all" || permission.effect === effectFilter;
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && permission.isActive) ||
        (statusFilter === "inactive" && !permission.isActive);

      return matchesSearch && matchesEffect && matchesStatus;
    });
  }, [permissions, searchTerm, effectFilter, statusFilter]);

  const handlePermissionAction = async (action: 'archive', permissionId: string) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`${action}-${permissionId}`);
      const permissionService = dfnsService.getPermissionService();

      if (action === 'archive') {
        await permissionService.archivePermission(permissionId);
        // Remove from list since it's archived
        setPermissions(prev => prev.filter(p => p.id !== permissionId));
      }
    } catch (error) {
      console.error(`Failed to ${action} permission:`, error);
      setError(`Failed to ${action} permission: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getEffectBadgeVariant = (effect: string): "default" | "destructive" => {
    return effect === 'Allow' ? 'default' : 'destructive';
  };

  const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
    return isActive ? 'default' : 'secondary';
  };

  const getEffectIcon = (effect: string) => {
    return effect === 'Allow' ? (
      <Unlock className="h-4 w-4 text-green-600" />
    ) : (
      <Lock className="h-4 w-4 text-red-600" />
    );
  };

  const formatPermissionId = (id: string): string => {
    if (id.length <= 16) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 6)}`;
  };

  const formatOperations = (operations: string[]): string => {
    if (operations.length <= 3) {
      return operations.join(', ');
    }
    return `${operations.slice(0, 3).join(', ')} +${operations.length - 3} more`;
  };

  const getOperationCategory = (operation: string): string => {
    const categories: Record<string, string> = {
      'Auth:': 'Authentication',
      'Wallets:': 'Wallet Management', 
      'Keys:': 'Key Management',
      'Policies:': 'Policy Management',
      'Permissions:': 'Permission Management',
      'Webhooks:': 'Webhook Management',
      'Fiat:': 'Fiat Operations',
      'Staking:': 'Staking Operations',
    };

    for (const [prefix, category] of Object.entries(categories)) {
      if (operation.startsWith(prefix)) {
        return category;
      }
    }
    return 'Other';
  };

  const getMainCategory = (operations: string[]): string => {
    if (operations.length === 0) return 'None';
    
    const categories = operations.map(getOperationCategory);
    const categoryCount: Record<string, number> = {};
    
    categories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    // Return the most common category
    return Object.entries(categoryCount).reduce((a, b) => 
      categoryCount[a[0]] > categoryCount[b[0]] ? a : b
    )[0];
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) {
        return 'Today';
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 30) {
        return `${diffInDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Permissions</span>
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
            <span>Permissions</span>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Permissions</span>
            </CardTitle>
            <CardDescription>
              Enterprise permission management ({filteredPermissions.length} of {permissions.length} permissions)
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Permission
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions by name, operations, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Effect Filter */}
          <Select value={effectFilter} onValueChange={setEffectFilter}>
            <SelectTrigger className="w-full lg:w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Effects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Effects</SelectItem>
              <SelectItem value="Allow">Allow</SelectItem>
              <SelectItem value="Deny">Deny</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead>Effect</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Operations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm || effectFilter !== "all" || statusFilter !== "all"
                      ? 'No permissions found matching your filters.'
                      : 'No permissions found. Create your first permission to get started.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredPermissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="font-medium">{permission.name}</div>
                        {permission.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {permission.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          ID: {formatPermissionId(permission.id)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getEffectIcon(permission.effect)}
                        <Badge variant={getEffectBadgeVariant(permission.effect)}>
                          {permission.effect}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {getMainCategory(permission.operations)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Primary category
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="text-sm">
                          <Badge variant="outline" className="mr-1">
                            {permission.operations.length}
                          </Badge>
                          operations
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {formatOperations(permission.operations)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(permission.isActive)}>
                        {permission.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(permission.dateCreated)}
                      </div>
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
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Permission
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="mr-2 h-4 w-4" />
                            View Assignments
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handlePermissionAction('archive', permission.id)}
                            className="text-destructive"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive Permission
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Permissions</div>
            <div className="text-2xl font-bold">{permissions.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-700">Allow Permissions</div>
            <div className="text-2xl font-bold text-green-800">
              {permissions.filter(p => p.effect === 'Allow').length}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-700">Deny Permissions</div>
            <div className="text-2xl font-bold text-red-800">
              {permissions.filter(p => p.effect === 'Deny').length}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-700">Active Permissions</div>
            <div className="text-2xl font-bold text-blue-800">
              {permissions.filter(p => p.isActive).length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
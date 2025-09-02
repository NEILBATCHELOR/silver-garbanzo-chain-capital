import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Role } from "@/utils/auth/roleUtils";
import { useRolePermissions } from "@/hooks/permissions";
import type { Database } from "@/types/core/supabase";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

interface PermissionsMatrixModalProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionsUpdated: () => void;
}

// Database types for role_permissions operations
type RolePermissionInsert = Database['public']['Tables']['role_permissions']['Insert'];

const PermissionsMatrixModal = ({
  role,
  open,
  onOpenChange,
  onPermissionsUpdated,
}: PermissionsMatrixModalProps) => {
  const [activePermissions, setActivePermissions] = useState<Set<string>>(new Set());
  const [isSystemRole, setIsSystemRole] = useState(false);
  const { toast } = useToast();
  
  // Use dynamic permissions hook
  const {
    categories,
    rolePermissions,
    isLoading,
    isUpdating,
    updateRolePermissions: updatePermissions,
    refreshRolePermissions
  } = useRolePermissions(role?.id || null);

  // Set up active permissions and system role detection when role/permissions change
  useEffect(() => {
    if (role && open) {
      // Set active permissions from dynamic hook
      setActivePermissions(new Set(rolePermissions));
      
      // Check if it's a system role
      setIsSystemRole(role.name === "Super Admin" || 
                     role.name === "Owner" || 
                     role.name === "Compliance Manager" || 
                     role.name === "Compliance Officer" || 
                     role.name === "Agent" || 
                     role.name === "Viewer");
    } else {
      setActivePermissions(new Set());
    }
  }, [role, open, rolePermissions]);

  const handleSavePermissions = async () => {
    if (!role) return;

    try {
      const permissionsArray = Array.from(activePermissions);
      await updatePermissions(permissionsArray);
      
      onOpenChange(false);
      onPermissionsUpdated();
    } catch (error: any) {
      // Error handling is done in the hook
      console.error("Error in handleSavePermissions:", error);
    }
  };

  const togglePermission = (permissionId: string) => {
    setActivePermissions(prevState => {
      const newState = new Set(prevState);
      if (newState.has(permissionId)) {
        newState.delete(permissionId);
      } else {
        newState.add(permissionId);
      }
      return newState;
    });
  };

  const handleSelectAll = (categoryName: string) => {
    const category = categories.find(cat => cat.displayName === categoryName);
    if (!category) return;
    
    const categoryPerms = category.permissions.map(p => p.id);
    const allSelected = categoryPerms.every(p => activePermissions.has(p));
    
    setActivePermissions(prevState => {
      const newState = new Set(prevState);
      
      if (allSelected) {
        // Deselect all in this category
        categoryPerms.forEach(p => newState.delete(p));
      } else {
        // Select all in this category
        categoryPerms.forEach(p => newState.add(p));
      }
      
      return newState;
    });
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions: {role.name}</DialogTitle>
          <DialogDescription>
            Configure which permissions are granted to users with the {role.name} role.
          </DialogDescription>
        </DialogHeader>

        {isSystemRole && (
          <Alert className="mb-4 border-amber-500">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              This is a system role. Modifying its permissions may affect system functionality.
            </AlertDescription>
          </Alert>
        )}

        {role.name === "Super Admin" && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Super Admin role automatically has all permissions. Any changes here are only for reference.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {categories.length === 0 ? (
              <div className="flex justify-center items-center h-40">
                <p className="text-muted-foreground">No permissions available</p>
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {category.displayName} ({category.count})
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSelectAll(category.displayName)}
                    >
                      {category.permissions.every(p => activePermissions.has(p.id)) ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Permission</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px] text-right">Allow</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.permissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">{permission.name}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{permission.id}</span>
                            {permission.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {permission.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Switch
                              checked={activePermissions.has(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                              aria-label={`Toggle ${permission.name} permission`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSavePermissions} 
            disabled={isUpdating || isLoading}
          >
            {isUpdating ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsMatrixModal;
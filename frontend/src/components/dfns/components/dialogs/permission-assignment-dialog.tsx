import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Key, 
  Shield,
  Users,
  AlertTriangle, 
  Loader2,
  Search,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface PermissionAssignmentDialogProps {
  onPermissionAssigned?: () => void;
  children?: React.ReactNode;
}

// Common permission categories
const PERMISSION_CATEGORIES = [
  'Wallets:Create',
  'Wallets:Read', 
  'Wallets:Update',
  'Wallets:Delete',
  'Auth:Login',
  'Auth:ManageUsers',
  'Transactions:Create',
  'Transactions:Sign',
  'Policies:Create',
  'Policies:Update'
];

/**
 * Permission Assignment Dialog
 * Assigns permissions to users in the DFNS organization
 */
export function PermissionAssignmentDialog({ onPermissionAssigned, children }: PermissionAssignmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    permissions: [] as string[]
  });

  // Load users when dialog opens
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen) return;

      try {
        const dfnsService = await initializeDfnsService();
        const authStatus = await dfnsService.getAuthenticationStatus();

        if (authStatus.isAuthenticated) {
          const userService = dfnsService.getUserManagementService();
          const organizationUsersResult = await userService.getAllUsers();
          if (organizationUsersResult.success && organizationUsersResult.data) {
            setUsers(organizationUsersResult.data);
          }
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadUsers();
  }, [isOpen]);

  // Handle user selection
  const handleUserChange = (userId: string) => {
    setFormData(prev => ({ ...prev, userId }));
    setError(null);
  };

  // Handle permission toggle
  const handlePermissionToggle = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
    setError(null);
  };

  // Validate form data
  const validateForm = (): boolean => {
    if (!formData.userId) {
      setError('Please select a user');
      return false;
    }

    if (formData.permissions.length === 0) {
      setError('Please select at least one permission');
      return false;
    }

    return true;
  };

  // Handle permission assignment
  const handleAssignPermissions = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();

      if (!authStatus.isAuthenticated) {
        setError('Authentication required. Please login to DFNS first.');
        return;
      }

      // Assign permissions using the permissions service
      const permissionsService = dfnsService.getPermissionAssignmentsService();
      
      for (const permission of formData.permissions) {
        await permissionsService.assignPermission(
          permission, // permissionId (string)
          {
            permissionId: permission, // Required by DfnsAssignPermissionRequest type
            identityId: formData.userId,
            identityKind: 'User'
          }, // request
          undefined, // userActionToken (will be prompted if needed)
          { syncToDatabase: true } // options
        );
      }

      const selectedUser = users.find(u => u.id === formData.userId);
      
      toast({
        title: "Success",
        description: `${formData.permissions.length} permission(s) assigned to ${selectedUser?.username || 'user'}`,
      });

      // Reset form
      setFormData({ userId: '', permissions: [] });
      setIsOpen(false);

      // Notify parent component
      if (onPermissionAssigned) {
        onPermissionAssigned();
      }

    } catch (error: any) {
      console.error('Permission assignment failed:', error);
      
      if (error.message.includes('Permission denied')) {
        setError('You do not have permission to assign permissions.');
      } else if (error.message.includes('User not found')) {
        setError('Selected user no longer exists.');
      } else {
        setError(`Failed to assign permissions: ${error.message}`);
      }

      toast({
        title: "Error",
        description: "Failed to assign permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Key className="h-4 w-4 mr-2" />
            Create Permission
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assign Permissions
          </DialogTitle>
          <DialogDescription>
            Grant specific permissions to organization users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* User selection */}
          <div>
            <Label htmlFor="user">Select User *</Label>
            <Select value={formData.userId} onValueChange={handleUserChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a user to assign permissions to" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{user.username}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {users.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Loading users...
              </p>
            )}
          </div>

          {/* Permissions selection */}
          <div>
            <Label className="text-base">Permissions *</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Select the permissions to grant to this user
            </p>
            
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
              {PERMISSION_CATEGORIES.map((permission) => {
                const isChecked = formData.permissions.includes(permission);
                return (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={isChecked}
                      onCheckedChange={(checked) => 
                        handlePermissionToggle(permission, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={permission}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {permission}
                    </Label>
                    {isChecked && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {formData.permissions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {formData.permissions.length} permission(s) selected
              </p>
            )}
          </div>

          {/* Security warning */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              These permissions will be immediately active. Users will be able to perform the selected actions.
            </AlertDescription>
          </Alert>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignPermissions} 
              disabled={loading || !formData.userId || formData.permissions.length === 0}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Assign Permissions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

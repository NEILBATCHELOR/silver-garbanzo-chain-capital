/**
 * Role Assignment Form Component
 * 
 * Allows assignment of contract roles (minter, pauser, burner, upgrader)
 * to specific addresses during token deployment
 * 
 * Includes authorization checks to ensure only authorized users can assign roles
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, Users, AlertCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { TokenRoleManagementService, ProjectUser } from '@/components/tokens/services/tokenRoleManagementService';
import { getCurrentUserId } from '@/infrastructure/auth/auth';

interface RoleAssignmentFormProps {
  projectId: string;
  contractAddress?: string; // Contract address for authorization checks
  roleAddresses: Record<string, string>;
  onRoleChange: (role: string, address: string) => void;
  availableRoles?: string[];
}

const DEFAULT_ROLES = ['minter', 'pauser', 'burner', 'upgrader'];

const ROLE_DESCRIPTIONS: Record<string, string> = {
  'minter': 'Can create new tokens',
  'pauser': 'Can pause/unpause all token transfers',
  'burner': 'Can burn (destroy) tokens',
  'upgrader': 'Can upgrade the contract implementation'
};

export function RoleAssignmentForm({
  projectId,
  contractAddress,
  roleAddresses,
  onRoleChange,
  availableRoles = DEFAULT_ROLES
}: RoleAssignmentFormProps) {
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permittedRoles, setPermittedRoles] = useState<string[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);
  const [authorizationLoading, setAuthorizationLoading] = useState(false);
  
  // Load project users and permissions on mount
  useEffect(() => {
    loadCurrentUserPermissions();
    loadProjectUsers();
  }, [projectId, contractAddress]);
  
  /**
   * Load current user's contract role permissions
   */
  const loadCurrentUserPermissions = async () => {
    try {
      setAuthorizationLoading(true);
      
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
      
      console.log('[RoleAssignmentForm] Loading permissions for user:', userId);
      
      if (!userId) {
        console.warn('[RoleAssignmentForm] No authenticated user found');
        setPermittedRoles([]);
        setAssignableRoles([]);
        return;
      }
      
      const roleService = TokenRoleManagementService.getInstance();
      
      if (contractAddress) {
        // Get roles for specific contract
        const roles = await roleService.getCurrentUserContractRoles(
          userId,
          contractAddress
        );
        console.log('[RoleAssignmentForm] User roles for contract:', { contractAddress, roles });
        setPermittedRoles(roles);
        
        // Get assignable roles (filtered based on permissions)
        const assignable = await roleService.getAssignableRoles(
          userId,
          contractAddress,
          availableRoles
        );
        console.log('[RoleAssignmentForm] Assignable roles:', { availableRoles, assignable });
        setAssignableRoles(assignable);
      } else {
        // No contract address yet - get all user's roles
        const roles = await roleService.getCurrentUserContractRoles(userId);
        console.log('[RoleAssignmentForm] User roles (global):', roles);
        setPermittedRoles(roles);
        
        // Without contract address, check if user has admin-level permissions
        const assignable = availableRoles.filter(role => 
          roles.includes('admin') || 
          roles.includes('default_admin') ||
          roles.includes('owner') ||
          roles.includes('role_manager') || 
          roles.includes(role.toLowerCase())
        );
        console.log('[RoleAssignmentForm] Assignable roles (no contract):', { availableRoles, assignable });
        setAssignableRoles(assignable);
      }
    } catch (err) {
      console.error('[RoleAssignmentForm] Failed to load user permissions:', err);
      setError('Failed to load your permissions');
      setPermittedRoles([]);
      setAssignableRoles([]);
    } finally {
      setAuthorizationLoading(false);
    }
  };
  
  const loadProjectUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const roleService = TokenRoleManagementService.getInstance();
      const users = await roleService.getProjectUsers(projectId);
      
      // Deduplicate users by userId - take first occurrence of each user
      // This handles cases where users have multiple org roles or addresses
      const uniqueUsers = users.reduce((acc: ProjectUser[], user) => {
        if (!acc.some(u => u.userId === user.userId)) {
          acc.push(user);
        }
        return acc;
      }, []);
      
      setProjectUsers(uniqueUsers);
    } catch (err) {
      console.error('Failed to load project users:', err);
      setError('Failed to load project users');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddressChange = (role: string, value: string) => {
    onRoleChange(role, value);
  };
  
  const handleUserSelect = (role: string, userId: string) => {
    // Find user's address
    const user = projectUsers.find(u => u.userId === userId);
    if (user) {
      handleAddressChange(role, user.address);
    }
  };
  
  const clearRole = (role: string) => {
    handleAddressChange(role, '');
  };
  
  /**
   * Check if a role can be assigned by current user
   */
  const canAssignRole = (role: string): boolean => {
    return assignableRoles.includes(role);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Assignments
            </CardTitle>
            <CardDescription>
              Assign contract roles to addresses or project users
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {projectUsers.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {projectUsers.length} Project User{projectUsers.length !== 1 ? 's' : ''}
              </Badge>
            )}
            
            {authorizationLoading ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900" />
                Checking permissions...
              </Badge>
            ) : assignableRoles.length > 0 ? (
              <Badge variant="success" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {assignableRoles.length} Role{assignableRoles.length !== 1 ? 's' : ''} Assignable
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                No Permission
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : error ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Show authorization notice if user has no permissions */}
            {!authorizationLoading && assignableRoles.length === 0 && (
              <Alert className="mb-4">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  You don't have permission to assign roles for this contract.
                  {permittedRoles.length > 0 ? (
                    <span className="block mt-1 text-xs">
                      Your roles: {permittedRoles.join(', ')}
                    </span>
                  ) : (
                    <span className="block mt-1 text-xs">
                      You need 'admin', 'role_manager', or specific role permissions.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {availableRoles.map((role) => {
              const isAssignable = canAssignRole(role);
              
              return (
                <div 
                  key={role} 
                  className={`space-y-3 pb-4 border-b last:border-0 ${
                    !isAssignable ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label className="capitalize flex items-center gap-2">
                        {role} Role
                        {roleAddresses[role] && (
                          <Badge variant="success" className="text-xs">
                            Assigned
                          </Badge>
                        )}
                        {!isAssignable && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            No Permission
                          </Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ROLE_DESCRIPTIONS[role] || 'Manage role permissions'}
                      </p>
                    </div>
                    
                    {roleAddresses[role] && isAssignable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearRole(role)}
                        className="h-8"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Quick Select from Project Users */}
                    {projectUsers.length > 0 && isAssignable && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Quick Select from Project Users
                        </Label>
                        <Select 
                          onValueChange={(value) => handleUserSelect(role, value)}
                          disabled={!isAssignable}
                        >
                          <SelectTrigger className="h-auto min-h-[40px]">
                            <SelectValue placeholder="Select a user..." />
                          </SelectTrigger>
                          <SelectContent className="w-[600px]">
                            {projectUsers.map((user) => (
                              <SelectItem 
                                key={user.userId} 
                                value={user.userId}
                                className="h-auto py-2"
                              >
                                <div className="flex items-center gap-2 w-full text-sm">
                                  <span className="font-medium min-w-[120px] truncate">
                                    {user.userName || 'Unnamed'}
                                  </span>
                                  <span className="text-muted-foreground min-w-[180px] truncate">
                                    {user.userEmail}
                                  </span>
                                  {user.roleName && (
                                    <Badge variant="outline" className="text-xs">
                                      {user.roleName}
                                    </Badge>
                                  )}
                                  <span className="font-mono text-xs text-muted-foreground ml-auto">
                                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Manual Address Input */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {projectUsers.length > 0 && isAssignable ? 'Or Enter Address Manually' : 'Enter Address'}
                      </Label>
                      <Input
                        placeholder={isAssignable ? "0x..." : "No permission to assign this role"}
                        value={roleAddresses[role] || ''}
                        onChange={(e) => handleAddressChange(role, e.target.value)}
                        className="font-mono text-sm"
                        disabled={!isAssignable}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        {availableRoles.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No roles available for this token standard
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

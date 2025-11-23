/**
 * Role Assignment Form Component
 * 
 * Allows assignment of contract roles (minter, pauser, burner, upgrader)
 * to specific addresses during token deployment
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { TokenRoleManagementService, ProjectUser } from '@/components/tokens/services/tokenRoleManagementService';

interface RoleAssignmentFormProps {
  projectId: string;
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
  roleAddresses,
  onRoleChange,
  availableRoles = DEFAULT_ROLES
}: RoleAssignmentFormProps) {
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load project users on mount
  useEffect(() => {
    loadProjectUsers();
  }, [projectId]);
  
  const loadProjectUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const roleService = TokenRoleManagementService.getInstance();
      const users = await roleService.getProjectUsers(projectId);
      
      setProjectUsers(users);
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
          
          {projectUsers.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {projectUsers.length} Project User{projectUsers.length !== 1 ? 's' : ''}
            </Badge>
          )}
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
            {availableRoles.map((role) => (
              <div key={role} className="space-y-3 pb-4 border-b last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <Label className="capitalize flex items-center gap-2">
                      {role} Role
                      {roleAddresses[role] && (
                        <Badge variant="success" className="text-xs">
                          Assigned
                        </Badge>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ROLE_DESCRIPTIONS[role] || 'Manage role permissions'}
                    </p>
                  </div>
                  
                  {roleAddresses[role] && (
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
                  {projectUsers.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Quick Select from Project Users
                      </Label>
                      <Select onValueChange={(value) => handleUserSelect(role, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projectUsers.map((user) => (
                            <SelectItem key={user.userId} value={user.userId}>
                              <div className="flex flex-col">
                                <span>{user.userName || user.userEmail}</span>
                                <span className="text-xs text-muted-foreground">
                                  {user.address.slice(0, 10)}...{user.address.slice(-8)}
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
                      Or Enter Address Manually
                    </Label>
                    <Input
                      placeholder="0x..."
                      value={roleAddresses[role] || ''}
                      onChange={(e) => handleAddressChange(role, e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
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

/**
 * Role Owner Management
 * Display and manage role-based owners for multi-sig wallets
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Shield, UserPlus, UserMinus, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { roleManagementService, type WalletRoleOwner } from '@/services/wallet/multiSig/RoleManagementService';
import { supabase } from '@/infrastructure/database/client';

interface RoleOwnerManagerProps {
  walletId: string;
  walletName: string;
  threshold: number;
  blockchain: string;
  autoRefresh?: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  priority: number;
}

export function RoleOwnerManager({ 
  walletId, 
  walletName, 
  threshold, 
  blockchain,
  autoRefresh = true 
}: RoleOwnerManagerProps) {
  const { toast } = useToast();
  
  const [owners, setOwners] = useState<WalletRoleOwner[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingOwnerId, setRemovingOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOwners = useCallback(async () => {
    try {
      setError(null);
      const data = await roleManagementService.getWalletRoleOwners(walletId);
      setOwners(data);
    } catch (err: any) {
      console.error('Failed to load owners:', err);
      setError(err.message || 'Failed to load owners');
    }
  }, [walletId]);

  const loadAvailableRoles = useCallback(async () => {
    try {
      // Get all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('priority', { ascending: false });

      if (rolesError) throw rolesError;

      // Filter out roles that are already owners
      const ownerRoleIds = new Set(owners.map(o => o.roleId));
      const available = (allRoles || []).filter(r => !ownerRoleIds.has(r.id));

      setAvailableRoles(available);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
    }
  }, [owners]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadOwners();
      setIsLoading(false);
    };
    
    loadData();
  }, [loadOwners]);

  useEffect(() => {
    loadAvailableRoles();
  }, [loadAvailableRoles]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadOwners();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadOwners]);

  const handleAddOwner = async () => {
    if (!selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      // Check if role has an address for this blockchain
      const { data: roleAddress } = await supabase
        .from('role_addresses')
        .select('address')
        .eq('role_id', selectedRole)
        .eq('blockchain', blockchain)
        .single();

      if (!roleAddress) {
        throw new Error(
          `Role does not have an address for ${blockchain}. Please generate an address first.`
        );
      }

      // Add role as owner
      await roleManagementService.addRoleOwner(walletId, selectedRole);

      toast({
        title: 'Success!',
        description: 'Role added as owner',
      });

      setSelectedRole('');
      await loadOwners();

    } catch (err: any) {
      console.error('Failed to add owner:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message || 'Failed to add owner',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveOwner = async (owner: WalletRoleOwner) => {
    // Check if removing would break threshold
    if (owners.length <= threshold) {
      toast({
        title: 'Cannot Remove',
        description: `Cannot remove owner - wallet requires at least ${threshold} owners`,
        variant: 'destructive',
      });
      return;
    }

    setRemovingOwnerId(owner.id);

    try {
      await roleManagementService.removeRoleOwner(walletId, owner.roleId);

      toast({
        title: 'Success!',
        description: `Removed ${owner.roleName} from owners`,
      });

      await loadOwners();

    } catch (err: any) {
      console.error('Failed to remove owner:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove owner',
        variant: 'destructive',
      });
    } finally {
      setRemovingOwnerId(null);
    }
  };

  const getPriorityBadgeVariant = (priority: number) => {
    if (priority >= 8) return 'destructive';
    if (priority >= 5) return 'default';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading owners...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Owner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Add Role as Owner
          </CardTitle>
          <CardDescription>
            Add an existing role to this multi-sig wallet's owners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Info */}
          <div className="rounded-md border p-3 space-y-2 bg-muted/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Wallet:</span>
              <span className="text-sm">{walletName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Threshold:</span>
              <Badge variant="outline">{threshold} of {owners.length} signatures</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Network:</span>
              <Badge variant="outline" className="capitalize">{blockchain}</Badge>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Role *</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No roles available (all roles are already owners or have no address)
                  </SelectItem>
                ) : (
                  availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {role.description} • Priority: {role.priority}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Add Button */}
          <Button
            onClick={handleAddOwner}
            disabled={!selectedRole || isAdding || availableRoles.length === 0}
            className="w-full"
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add as Owner
              </>
            )}
          </Button>

          {/* Threshold Warning */}
          {owners.length < threshold && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Wallet has {owners.length} owners but requires {threshold} signatures.
                Add at least {threshold - owners.length} more owner(s).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Owners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Current Owners
              </CardTitle>
              <CardDescription>
                Roles with signing authority for this wallet
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadOwners}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {owners.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">No owners assigned</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add roles as owners to enable multi-sig functionality
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {owners.map((owner) => {
                const isRemoving = removingOwnerId === owner.id;
                const canRemove = owners.length > threshold;
                
                return (
                  <div
                    key={owner.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{owner.roleName}</span>
                          <Badge 
                            variant={getPriorityBadgeVariant(owner.rolePriority)}
                            className="text-xs"
                          >
                            Priority {owner.rolePriority}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                          <div>{owner.roleDescription}</div>
                          {owner.roleAddress ? (
                            <div className="font-mono">
                              Address: {owner.roleAddress.slice(0, 10)}...{owner.roleAddress.slice(-8)}
                            </div>
                          ) : (
                            <div className="text-destructive">
                              No address for {blockchain}
                            </div>
                          )}
                          <div>
                            Added: {owner.addedAt.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOwner(owner)}
                      disabled={isRemoving || !canRemove}
                      title={!canRemove ? `Cannot remove - need at least ${threshold} owners` : 'Remove owner'}
                    >
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Threshold Status */}
          <div className="mt-4 p-3 border rounded-md bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Signing Status:</span>
              {owners.length >= threshold ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ready ({owners.length}/{threshold})
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Need {threshold - owners.length} more ({owners.length}/{threshold})
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RoleOwnerManager;

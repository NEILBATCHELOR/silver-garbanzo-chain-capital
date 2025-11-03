/**
 * Policy-Aware Role Management Operation Component
 * Manages on-chain role assignments with policy validation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, UserPlus, UserMinus, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { TokenRoleManagementService, type ProjectUser, type TokenRoleHolder } from '../services/tokenRoleManagementService';
import { ethers } from 'ethers';

interface PolicyAwareRoleManagementOperationProps {
  tokenId: string;
  projectId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

// Role definitions matching ERC20Master.sol
const TOKEN_ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')),
  PAUSER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('PAUSER_ROLE')),
  UPGRADER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('UPGRADER_ROLE'))
} as const;

type RoleKey = keyof typeof TOKEN_ROLES;

export const PolicyAwareRoleManagementOperation: React.FC<PolicyAwareRoleManagementOperationProps> = ({
  tokenId,
  projectId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  onSuccess
}) => {
  // Services
  const roleService = TokenRoleManagementService.getInstance();
  const { supabase } = useSupabase();
  
  // State
  const [selectedRole, setSelectedRole] = useState<RoleKey>('MINTER_ROLE');
  const [selectedUser, setSelectedUser] = useState<ProjectUser | null>(null);
  const [action, setAction] = useState<'grant' | 'revoke'>('grant');
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [currentRoleHolders, setCurrentRoleHolders] = useState<Record<RoleKey, string[]>>({
    DEFAULT_ADMIN_ROLE: [],
    MINTER_ROLE: [],
    PAUSER_ROLE: [],
    UPGRADER_ROLE: []
  });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // UI state
  const [showValidation, setShowValidation] = useState(false);
  const [executionStep, setExecutionStep] = useState<'input' | 'validation' | 'execution' | 'complete'>('input');
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      setExecutionStep('complete');
      onSuccess?.();
      loadCurrentRoles(); // Refresh role holders
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();

  // Load project users on mount
  useEffect(() => {
    if (projectId) {
      loadProjectUsers();
    }
  }, [projectId]);

  // Load current role holders on mount and after changes
  useEffect(() => {
    if (isDeployed && tokenAddress) {
      loadCurrentRoles();
    }
  }, [isDeployed, tokenAddress]);

  const loadProjectUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await roleService.getProjectUsers(projectId);
      setProjectUsers(users);
    } catch (error) {
      console.error('Failed to load project users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadCurrentRoles = async () => {
    setLoadingRoles(true);
    try {
      // Query on-chain for current role holders
      // This would use ethers.js to call hasRole for each user
      // For now, we'll load from database cache
      const { data: roleAssignments, error } = await supabase
        .from('user_contract_roles')
        .select('user_id, contract_roles')
        .neq('contract_roles', null);

      if (error) throw error;

      // Parse role holders
      const holders: Record<RoleKey, string[]> = {
        DEFAULT_ADMIN_ROLE: [],
        MINTER_ROLE: [],
        PAUSER_ROLE: [],
        UPGRADER_ROLE: []
      };

      roleAssignments?.forEach((assignment: any) => {
        const roles = assignment.contract_roles?.[tokenAddress] || [];
        roles.forEach((role: string) => {
          if (role in holders) {
            // Get user address
            const user = projectUsers.find(u => u.userId === assignment.user_id);
            if (user && !holders[role as RoleKey].includes(user.address)) {
              holders[role as RoleKey].push(user.address);
            }
          }
        });
      });

      setCurrentRoleHolders(holders);
    } catch (error) {
      console.error('Failed to load current roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Validate input
  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    if (!selectedUser) return false;
    if (!selectedRole) return false;
    
    // For revoke, check if user actually has the role
    if (action === 'revoke') {
      return currentRoleHolders[selectedRole]?.includes(selectedUser.address);
    }
    
    return true;
  };

  // Handle pre-transaction validation
  const handleValidate = async () => {
    if (!selectedUser) return;
    
    setExecutionStep('validation');
    
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: window.ethereum?.selectedAddress || '',
      to: tokenAddress,
      from: window.ethereum?.selectedAddress || '',
      data: '0x', // Will be built by gateway
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: action === 'grant' ? 'grantRole' : 'revokeRole',
          role: selectedRole,
          account: selectedUser.address
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
    
    setShowValidation(true);
  };

  // Handle execution
  const handleExecute = async () => {
    if (!validationResult?.valid || !selectedUser) return;

    setExecutionStep('execution');
    
    try {
      const roleHash = TOKEN_ROLES[selectedRole];
      
      if (action === 'grant') {
        // Call grantRole on contract
        await operations.grantRole(tokenAddress, roleHash, selectedUser.address, chain);
        
        // Save to database
        await roleService.saveRoleAssignment(
          selectedUser.userId,
          selectedUser.address,
          tokenAddress,
          selectedRole
        );
      } else {
        // Call revokeRole on contract
        await operations.revokeRole(tokenAddress, roleHash, selectedUser.address, chain);
        
        // Remove from database
        await roleService.removeRoleAssignment(
          selectedUser.userId,
          selectedUser.address,
          tokenAddress,
          selectedRole
        );
      }
      
      // Log operation
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: action === 'grant' ? TokenOperationType.GRANT_ROLE : TokenOperationType.REVOKE_ROLE,
        operator: window.ethereum?.selectedAddress,
        recipient: selectedUser.address,
        metadata: { role: selectedRole },
        transaction_hash: null,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Role management operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedUser(null);
    setSelectedRole('MINTER_ROLE');
    setAction('grant');
    setShowValidation(false);
    setExecutionStep('input');
  };

  const getRoleBadgeColor = (roleKey: RoleKey): string => {
    switch (roleKey) {
      case 'DEFAULT_ADMIN_ROLE': return 'bg-red-100 text-red-800';
      case 'MINTER_ROLE': return 'bg-blue-100 text-blue-800';
      case 'PAUSER_ROLE': return 'bg-yellow-100 text-yellow-800';
      case 'UPGRADER_ROLE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Role Management
          </CardTitle>
          <CardDescription>
            Manage on-chain access control roles for {tokenName} ({tokenSymbol})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={executionStep} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="validation" disabled={executionStep === 'input'}>
                Validation
              </TabsTrigger>
              <TabsTrigger value="execution" disabled={executionStep !== 'execution'}>
                Execution
              </TabsTrigger>
              <TabsTrigger value="complete" disabled={executionStep !== 'complete'}>
                Complete
              </TabsTrigger>
            </TabsList>

            {/* STEP 1: Input */}
            <TabsContent value="input" className="space-y-4 mt-4">
              {/* Action Selection */}
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={action} onValueChange={(v) => setAction(v as 'grant' | 'revoke')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grant">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Grant Role
                      </div>
                    </SelectItem>
                    <SelectItem value="revoke">
                      <div className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Revoke Role
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as RoleKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TOKEN_ROLES) as RoleKey[]).map(role => (
                      <SelectItem key={role} value={role}>
                        <Badge className={getRoleBadgeColor(role)}>
                          {role.replace('_ROLE', '').replace('_', ' ')}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Selection */}
              <div className="space-y-2">
                <Label>User</Label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading project users...
                  </div>
                ) : (
                  <Select
                    value={selectedUser?.userId}
                    onValueChange={(userId) => {
                      const user = projectUsers.find(u => u.userId === userId);
                      setSelectedUser(user || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectUsers.map(user => (
                        <SelectItem key={`${user.userId}-${user.address}`} value={user.userId}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.userName || 'Unnamed User'}</span>
                            <span className="text-xs text-muted-foreground">{user.userEmail}</span>
                            <span className="text-xs font-mono">{user.address.slice(0, 10)}...{user.address.slice(-8)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Current Role Holders */}
              <div className="space-y-2">
                <Label>Current {selectedRole.replace('_ROLE', '').replace('_', ' ')} Holders</Label>
                <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                  {loadingRoles ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading role holders...
                    </div>
                  ) : currentRoleHolders[selectedRole].length > 0 ? (
                    currentRoleHolders[selectedRole].map(address => {
                      const user = projectUsers.find(u => u.address === address);
                      return (
                        <div key={address} className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user?.userName || 'External Address'}</span>
                            <span className="text-xs font-mono">{address}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No addresses have this role</p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleValidate}
                disabled={!validateInput() || validating}
                className="w-full"
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Validate with Policy Engine
                  </>
                )}
              </Button>
            </TabsContent>

            {/* STEP 2: Validation */}
            <TabsContent value="validation" className="space-y-4 mt-4">
              {validationResult && (
                <>
                  {validationResult.valid ? (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertTitle>Validation Passed</AlertTitle>
                      <AlertDescription>
                        Role {action} operation has been validated successfully.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <X className="h-4 w-4" />
                      <AlertTitle>Validation Failed</AlertTitle>
                      <AlertDescription>
                        {validationResult.errors?.join(', ') || 'Operation cannot proceed'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.valid && (
                    <Button onClick={handleExecute} className="w-full" disabled={gatewayLoading}>
                      {gatewayLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Execute {action === 'grant' ? 'Grant' : 'Revoke'} Role
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}

              <Button onClick={handleReset} variant="outline" className="w-full">
                Reset
              </Button>
            </TabsContent>

            {/* STEP 3: Execution */}
            <TabsContent value="execution" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing role {action}...</span>
              </div>
            </TabsContent>

            {/* STEP 4: Complete */}
            <TabsContent value="complete" className="space-y-4 mt-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Role {action === 'grant' ? 'Granted' : 'Revoked'}</AlertTitle>
                <AlertDescription>
                  Successfully {action}ed {selectedRole.replace('_ROLE', '').replace('_', ' ')} 
                  {action === 'grant' ? ' to ' : ' from '} {selectedUser?.userName || 'user'}
                </AlertDescription>
              </Alert>

              <Button onClick={handleReset} className="w-full">
                Manage Another Role
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyAwareRoleManagementOperation;

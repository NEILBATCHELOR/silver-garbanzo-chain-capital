import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, ShieldX, Shield, AlertTriangle, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  roleManagementService, 
  type RoleAssignment,
  COMMON_ROLES 
} from '@/services/wallet/multiSig/RoleManagementService';
import { supabase } from '@/infrastructure/database/client';

interface RoleManagerProps {
  walletAddress: string;
  blockchain: string;
  autoRefresh?: boolean;
}

interface DeployedContract {
  id: string;
  address: string;
  contract_type: string;
  blockchain: string;
}

const AVAILABLE_ROLES = [
  { value: 'DEFAULT_ADMIN_ROLE', label: 'Admin', description: 'Full contract administration', color: 'red' },
  { value: 'MINTER_ROLE', label: 'Minter', description: 'Can mint new tokens', color: 'blue' },
  { value: 'PAUSER_ROLE', label: 'Pauser', description: 'Can pause/unpause operations', color: 'yellow' },
  { value: 'UPGRADER_ROLE', label: 'Upgrader', description: 'Can upgrade contracts', color: 'purple' },
  { value: 'POLICY_ADMIN_ROLE', label: 'Policy Admin', description: 'Manage policy engine', color: 'green' },
  { value: 'COMPLIANCE_OFFICER_ROLE', label: 'Compliance Officer', description: 'Manage compliance rules', color: 'orange' },
  { value: 'APPROVER_ROLE', label: 'Approver', description: 'Approve multi-sig operations', color: 'cyan' },
  { value: 'PROPOSER_ROLE', label: 'Proposer', description: 'Create proposals', color: 'indigo' },
  { value: 'EXECUTOR_ROLE', label: 'Executor', description: 'Execute approved proposals', color: 'pink' },
];

export function MultiSigRoleManager({ walletAddress, blockchain, autoRefresh = true }: RoleManagerProps) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleAssignment[]>([]);
  const [contracts, setContracts] = useState<DeployedContract[]>([]);
  const [selectedContract, setSelectedContract] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGranting, setIsGranting] = useState(false);
  const [revokingRoleId, setRevokingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      setError(null);
      const data = await roleManagementService.getRolesForWallet(walletAddress);
      setRoles(data);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
      setError(err.message || 'Failed to load roles');
    }
  }, [walletAddress]);

  const loadContracts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('deployed_contracts')
        .select('*')
        .eq('blockchain', blockchain)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setContracts(data || []);
    } catch (err: any) {
      console.error('Failed to load contracts:', err);
    }
  }, [blockchain]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadRoles(), loadContracts()]);
      setIsLoading(false);
    };
    
    loadData();
  }, [loadRoles, loadContracts]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadRoles();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadRoles]);

  const handleGrantRole = async () => {
    if (!selectedContract || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select both a contract and a role',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGranting(true);
      
      const txHash = await roleManagementService.grantRole(
        walletAddress,
        selectedContract,
        selectedRole,
        blockchain
      );
      
      toast({
        title: 'Success!',
        description: `Role granted successfully`,
      });
      
      // Reset form
      setSelectedContract('');
      setSelectedRole('');
      
      // Reload roles
      await loadRoles();
      
    } catch (err: any) {
      console.error('Failed to grant role:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to grant role',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeRole = async (assignment: RoleAssignment) => {
    try {
      setRevokingRoleId(assignment.id);
      
      const txHash = await roleManagementService.revokeRole(
        assignment.multiSigWalletAddress,
        assignment.contractAddress,
        assignment.role,
        assignment.blockchain
      );
      
      toast({
        title: 'Success!',
        description: `Role revoked successfully`,
      });
      
      // Reload roles
      await loadRoles();
      
    } catch (err: any) {
      console.error('Failed to revoke role:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to revoke role',
        variant: 'destructive',
      });
    } finally {
      setRevokingRoleId(null);
    }
  };

  const getRoleInfo = (roleName: string) => {
    return AVAILABLE_ROLES.find(r => r.value === roleName) || {
      value: roleName,
      label: roleName,
      description: 'Custom role',
      color: 'gray'
    };
  };

  const getContractName = (address: string) => {
    const contract = contracts.find(c => c.address === address);
    return contract ? `${contract.contract_type}` : 'Unknown Contract';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading roles...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grant Role Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Grant Role
          </CardTitle>
          <CardDescription>
            Assign a role to this multi-sig wallet on a deployed contract
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Info */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Multi-Sig Wallet:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Network:</span>
              <Badge variant="outline" className="text-xs capitalize">
                {blockchain}
              </Badge>
            </div>
          </div>

          {/* Contract Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contract *</label>
            <Select value={selectedContract} onValueChange={setSelectedContract}>
              <SelectTrigger>
                <SelectValue placeholder="Select contract" />
              </SelectTrigger>
              <SelectContent>
                {contracts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No contracts deployed on {blockchain}
                  </SelectItem>
                ) : (
                  contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.address}>
                      <div className="flex flex-col">
                        <span className="font-medium">{contract.contract_type}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Role *</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {role.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning for critical roles */}
          {(selectedRole === 'DEFAULT_ADMIN_ROLE' || selectedRole === 'UPGRADER_ROLE') && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Critical Role:</strong> This role has significant permissions. 
                Ensure the multi-sig wallet has appropriate security measures in place.
              </AlertDescription>
            </Alert>
          )}

          {/* Grant Button */}
          <Button
            onClick={handleGrantRole}
            disabled={!selectedContract || !selectedRole || isGranting || contracts.length === 0}
            className="w-full"
          >
            {isGranting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Granting...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Grant Role
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Roles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Current Roles
              </CardTitle>
              <CardDescription>
                Roles assigned to this multi-sig wallet
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRoles}
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
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {roles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">No roles assigned</p>
              <p className="text-sm text-muted-foreground mt-2">
                Grant a role to this wallet to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((assignment) => {
                const roleInfo = getRoleInfo(assignment.role);
                const isRevoking = revokingRoleId === assignment.id;
                
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{roleInfo.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {assignment.contractType}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                          <div className="font-mono">
                            Contract: {assignment.contractAddress.slice(0, 10)}...{assignment.contractAddress.slice(-8)}
                          </div>
                          <div>
                            Granted: {assignment.assignedAt.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeRole(assignment)}
                      disabled={isRevoking}
                    >
                      {isRevoking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldX className="w-4 h-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MultiSigRoleManager;

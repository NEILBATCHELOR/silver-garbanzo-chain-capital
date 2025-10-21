import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusIcon, MinusIcon, Shield, AlertTriangle, CheckCircle, User, Users, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MultiSigTransactionService } from '@/services/wallet/multiSig/MultiSigTransactionService';
import { userAddressService } from '@/services/wallet/multiSig/UserAddressService';
import { supabase } from '@/infrastructure/database/client';
import GasEstimatorEIP1559, { EIP1559FeeData } from '@/components/tokens/components/transactions/GasEstimatorEIP1559';
import { FeePriority } from '@/services/blockchain/FeeEstimator';

interface SystemUser {
  userId: string;
  email: string;
  roleId: string;  // The role_id from user_organization_roles
  roleName?: string;
  organizationId?: string;  // The project's organization
  address?: string;
  hasAddress: boolean;
}

interface ProjectWalletOption {
  id: string;
  projectId: string;
  projectName?: string;
  walletAddress: string;
  chainId: string;
  balance?: string;
}

interface MultiSigWalletFormProps {
  projectId?: string; // OPTIONAL - service provider selects which project wallet funds deployment
  onSuccess?: (address: string, txHash: string) => void;
  onCancel?: () => void;
}

export function MultiSigWalletForm({ projectId, onSuccess, onCancel }: MultiSigWalletFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(2);
  const [blockchain, setBlockchain] = useState('');
  const [availableBlockchains, setAvailableBlockchains] = useState<Array<{
    walletType: string;
    chainId: string;
    net: string;
    count: number;
  }>>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deploymentResult, setDeploymentResult] = useState<{
    address: string;
    transactionHash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User selection mode
  const [ownerMode, setOwnerMode] = useState<'users' | 'manual'>('users');
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [manualOwners, setManualOwners] = useState<string[]>(['', '', '']);
  
  // Project wallet selection (for funding)
  const [projectWallets, setProjectWallets] = useState<ProjectWalletOption[]>([]);
  const [selectedProjectWallet, setSelectedProjectWallet] = useState<string>(''); // wallet ID
  const [projectName, setProjectName] = useState<string>('');

  // Gas estimation state
  const [estimatedGasData, setEstimatedGasData] = useState<EIP1559FeeData | null>(null);
  const [showGasConfig, setShowGasConfig] = useState<boolean>(false);
  const MULTISIG_GAS_LIMIT = 1500000; // Multi-sig deployments need ~1.5M gas (based on actual transaction)

  const multiSigService = MultiSigTransactionService.getInstance();

  // Load available blockchains for this project
  useEffect(() => {
    const loadAvailableBlockchains = async () => {
      if (!projectId || projectId.trim() === '') {
        return;
      }

      try {
        // Query distinct wallet types from project_wallets
        const { data: wallets, error: walletsError } = await supabase
          .from('project_wallets')
          .select('wallet_type, chain_id, net')
          .eq('project_id', projectId);

        if (walletsError) throw walletsError;

        if (!wallets || wallets.length === 0) {
          setAvailableBlockchains([]);
          return;
        }

        // Group by net + wallet_type (to distinguish mainnet from testnets)
        const blockchainMap = new Map<string, { chainId: string; net: string; count: number }>();
        
        wallets.forEach(w => {
          // Use net as the key (e.g., "mainnet", "holesky", "testnet")
          const key = w.net || w.wallet_type;
          const existing = blockchainMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            blockchainMap.set(key, {
              chainId: w.chain_id || '',
              net: w.net || '',
              count: 1
            });
          }
        });

        // Convert to array (use net as walletType for display)
        const blockchains = Array.from(blockchainMap.entries()).map(([walletType, info]) => ({
          walletType,
          chainId: info.chainId,
          net: info.net,
          count: info.count
        }));

        setAvailableBlockchains(blockchains);

        // Auto-select first blockchain
        if (blockchains.length > 0 && !blockchain) {
          setBlockchain(blockchains[0].walletType);
        }
      } catch (err) {
        console.error('Failed to load available blockchains:', err);
      }
    };

    loadAvailableBlockchains();
  }, [projectId]); // Only reload when projectId changes

  // Load ALL system users with their addresses (service provider level)
  // AND load project wallets for funding selection
  useEffect(() => {
    const loadSystemUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Validate projectId before making database queries
        if (!projectId || projectId.trim() === '') {
          setError('Please select a project to fund the multi-sig wallet deployment');
          setIsLoading(false);
          return;
        }

        // Load project details and organization
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('name, organization_id')
          .eq('id', projectId)
          .single();
        
        if (projectError) throw projectError;
        if (!project) {
          setError('Project not found');
          return;
        }

        setProjectName(project.name);
        const organizationId = project.organization_id;

        console.log(`Loading users for organization: ${organizationId}`);

        // Load project wallets for the selected blockchain (using net for filtering)
        const { data: wallets, error: walletsError } = await supabase
          .from('project_wallets')
          .select('id, wallet_address, chain_id, wallet_type, net')
          .eq('project_id', projectId)
          .eq('net', blockchain); // Filter by net (e.g., "mainnet", "holesky")
        
        if (walletsError) {
          console.error('Failed to load project wallets:', walletsError);
          throw walletsError;
        }

        console.log(`Loaded ${wallets?.length || 0} project wallets for ${blockchain}:`, wallets);

        if (!wallets || wallets.length === 0) {
          setError(
            `No ${blockchain} wallets found for this project. Please create a ${blockchain} wallet first.`
          );
          return;
        }

        // Map to ProjectWalletOption format
        const walletOptions: ProjectWalletOption[] = wallets.map(w => ({
          id: w.id,
          projectId: projectId,
          projectName: project.name,
          walletAddress: w.wallet_address,
          chainId: w.chain_id
        }));

        console.log('Mapped wallet options:', walletOptions);

        setProjectWallets(walletOptions);
        
        // Auto-select first wallet
        if (walletOptions.length > 0) {
          setSelectedProjectWallet(walletOptions[0].id);
          console.log('Auto-selected wallet:', walletOptions[0].id);
        }

        // Get users who have rights to THIS organization
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_organization_roles')
          .select(`
            user_id,
            role_id,
            users!inner(id, email),
            roles(name)
          `)
          .eq('organization_id', organizationId); // Filter by project's organization

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setError('No users found for this organization');
          return;
        }

        console.log(`Found ${userRoles.length} users for organization ${organizationId}`);

        // Get unique users (a user may have multiple roles in same organization)
        // If user has multiple roles, use the first one found
        const uniqueUsers = new Map<string, any>();
        userRoles.forEach((ur: any) => {
          if (!uniqueUsers.has(ur.user_id)) {
            uniqueUsers.set(ur.user_id, {
              userId: ur.user_id,
              roleId: ur.role_id,  // Store role_id for multi_sig_wallet_owners
              email: ur.users.email,
              roleName: ur.roles?.name,
              organizationId: organizationId
            });
          }
        });

        const userIds = Array.from(uniqueUsers.keys());

        // Get user addresses for the selected blockchain from user_addresses table
        const usersWithAddresses = await userAddressService.getUsersWithAddresses(
          userIds,
          blockchain
        );

        console.log(`Found ${usersWithAddresses.filter(ua => ua.address).length} users with ${blockchain} addresses`);

        // Map to SystemUser format
        const users: SystemUser[] = Array.from(uniqueUsers.values()).map((user) => {
          const addressInfo = usersWithAddresses.find(ua => ua.userId === user.userId);
          return {
            ...user,
            address: addressInfo?.address || undefined,
            hasAddress: !!addressInfo?.address
          };
        });

        // Sort by email
        users.sort((a, b) => a.email.localeCompare(b.email));

        setSystemUsers(users);

        // Auto-select users who have addresses (first 3)
        const usersWithAddr = users.filter(u => u.hasAddress).map(u => u.userId);
        if (usersWithAddr.length >= 2) {
          setSelectedUserIds(usersWithAddr.slice(0, 3));
          setThreshold(Math.min(2, usersWithAddr.length));
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadSystemUsers();
  }, [blockchain, projectId]); // Reload when blockchain or projectId changes

  // Handle user selection toggle
  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const isSelected = prev.includes(userId);
      if (isSelected) {
        const newSelection = prev.filter(id => id !== userId);
        // Adjust threshold if needed
        if (threshold > newSelection.length) {
          setThreshold(Math.max(1, newSelection.length));
        }
        return newSelection;
      } else {
        return [...prev, userId];
      }
    });
  }, [threshold]);

  // Manual owner management (fallback mode)
  const addOwner = useCallback(() => {
    setManualOwners([...manualOwners, '']);
  }, [manualOwners]);

  const removeOwner = useCallback((index: number) => {
    if (manualOwners.length > 2) {
      setManualOwners(manualOwners.filter((_, i) => i !== index));
      if (threshold > manualOwners.length - 1) {
        setThreshold(manualOwners.length - 1);
      }
    }
  }, [manualOwners, threshold]);

  const updateOwner = useCallback((index: number, value: string) => {
    const newOwners = [...manualOwners];
    newOwners[index] = value;
    setManualOwners(newOwners);
  }, [manualOwners]);

  /**
   * Handle gas estimation from GasEstimatorEIP1559 component
   */
  const handleGasEstimate = useCallback((feeData: EIP1559FeeData) => {
    setEstimatedGasData(feeData);
  }, []);

  /**
   * Calculate estimated deployment cost in ETH
   */
  const calculateEstimatedCost = useCallback(() => {
    if (!estimatedGasData) return '~0.003 ETH'; // Realistic fallback based on actual transaction
    
    const gasLimit = MULTISIG_GAS_LIMIT;
    const maxFeeWei = estimatedGasData.maxFeePerGas || estimatedGasData.gasPrice || '0';
    const costWei = BigInt(gasLimit) * BigInt(maxFeeWei);
    const costEth = Number(costWei) / 1e18;
    
    return `~${costEth.toFixed(4)} ETH`;
  }, [estimatedGasData, MULTISIG_GAS_LIMIT]);

  const validateForm = useCallback(() => {
    // Validate name
    if (!name.trim()) {
      setError('Please enter a wallet name');
      return false;
    }

    // Validate blockchain selected
    if (!blockchain || blockchain.trim() === '') {
      setError('Please select a blockchain');
      return false;
    }

    // Validate project wallet selected
    if (!selectedProjectWallet) {
      setError('Please select a project wallet to fund the deployment');
      return false;
    }

    // Validate owners based on mode
    let validOwners: string[];
    if (ownerMode === 'users') {
      const selectedUsers = systemUsers.filter(u => selectedUserIds.includes(u.userId));
      validOwners = selectedUsers.map(u => u.address).filter(addr => addr) as string[];

      if (validOwners.length < 2) {
        setError('Please select at least 2 users with blockchain addresses');
        return false;
      }

      // Check if selected users have addresses
      const usersWithoutAddr = selectedUsers.filter(u => !u.hasAddress);
      if (usersWithoutAddr.length > 0) {
        setError(
          `Some selected users don't have ${blockchain} addresses: ${usersWithoutAddr.map(u => u.email).join(', ')}`
        );
        return false;
      }
    } else {
      validOwners = manualOwners.filter(o => o.trim() !== '');
      if (validOwners.length < 2) {
        setError('At least 2 owners are required');
        return false;
      }

      // Check for valid Ethereum addresses
      const addressPattern = /^0x[a-fA-F0-9]{40}$/;
      const invalidOwners = validOwners.filter(o => !addressPattern.test(o));
      if (invalidOwners.length > 0) {
        setError('All owner addresses must be valid Ethereum addresses (0x...)');
        return false;
      }

      // Check for duplicate owners
      const uniqueOwners = new Set(validOwners.map(o => o.toLowerCase()));
      if (uniqueOwners.size !== validOwners.length) {
        setError('Owner addresses must be unique');
        return false;
      }
    }

    // Validate threshold
    if (threshold < 1 || threshold > validOwners.length) {
      setError('Threshold must be between 1 and the number of owners');
      return false;
    }

    return true;
  }, [name, selectedProjectWallet, ownerMode, systemUsers, selectedUserIds, manualOwners, threshold, blockchain]);

  const handleDeploy = async () => {
    try {
      setError(null);
      setDeploymentResult(null);

      if (!validateForm()) {
        return;
      }

      setIsDeploying(true);

      // Get owner addresses and user info based on mode
      let validOwners: string[];
      let ownerUsers: Array<{ userId: string; roleId: string; address: string }> | undefined;
      
      if (ownerMode === 'users') {
        const selectedUsers = systemUsers.filter(u => selectedUserIds.includes(u.userId));
        validOwners = selectedUsers.map(u => u.address).filter(addr => addr) as string[];
        
        // Prepare user info for database insertion (multi_sig_wallet_owners)
        ownerUsers = selectedUsers
          .filter(u => u.address) // Only users with addresses
          .map(u => ({
            userId: u.userId,
            roleId: u.roleId,
            address: u.address!
          }));
      } else {
        validOwners = manualOwners.filter(o => o.trim() !== '');
        // Manual mode doesn't have user IDs, so ownerUsers stays undefined
      }

      // Deploy multi-sig wallet with owner user information
      const result = await multiSigService.deployMultiSigWallet(
        name,
        validOwners,
        threshold,
        blockchain,
        projectId, // For tracking association
        selectedProjectWallet, // Pass the specific wallet ID user selected
        ownerUsers // Pass user info for multi_sig_wallet_owners table
      );

      setDeploymentResult(result);

      toast({
        title: 'Success!',
        description: `Multi-sig wallet deployed successfully`,
      });

      // Notify parent
      if (onSuccess) {
        onSuccess(result.address, result.transactionHash);
      }

    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || 'Failed to deploy multi-sig wallet');
      toast({
        title: 'Error',
        description: err.message || 'Failed to deploy multi-sig wallet',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleReset = () => {
    setName('');
    setThreshold(2);
    setBlockchain(availableBlockchains.length > 0 ? availableBlockchains[0].walletType : '');
    setDeploymentResult(null);
    setError(null);
    setSelectedUserIds([]);
    setManualOwners(['', '', '']);
  };

  // Show success screen if deployed
  if (deploymentResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Multi-Sig Wallet Deployed
          </CardTitle>
          <CardDescription>
            Your multi-signature wallet has been successfully deployed on {blockchain}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Address */}
          <div className="space-y-2">
            <Label>Wallet Address</Label>
            <div className="flex items-center gap-2">
              <Input
                value={deploymentResult.address}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(deploymentResult.address);
                  toast({ title: 'Copied', description: 'Address copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="space-y-2">
            <Label>Transaction Hash</Label>
            <div className="flex items-center gap-2">
              <Input
                value={deploymentResult.transactionHash}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(deploymentResult.transactionHash);
                  toast({ title: 'Copied', description: 'Transaction hash copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Success Info */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your multi-sig wallet is now deployed and ready to use. You can now:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Grant roles to this wallet address</li>
                <li>Create transaction proposals</li>
                <li>Manage on-chain multi-signature operations</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleReset}>
              Create Another
            </Button>
            <Button onClick={onCancel}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Fetching system users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Create Multi-Sig Wallet
        </CardTitle>
        <CardDescription>
          Deploy a new multi-signature wallet with any system users. Select which project wallet will fund the deployment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Wallet Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Treasury Wallet"
            disabled={isDeploying}
          />
          <p className="text-xs text-muted-foreground">
            A descriptive name to identify this wallet
          </p>
        </div>

        {/* Blockchain - NOW DYNAMICALLY GENERATED FROM PROJECT WALLETS */}
        <div className="space-y-2">
          <Label htmlFor="blockchain">Blockchain *</Label>
          <Select
            value={blockchain}
            onValueChange={setBlockchain}
            disabled={isDeploying || availableBlockchains.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                availableBlockchains.length === 0 
                  ? "No wallets available for this project"
                  : "Select blockchain"
              } />
            </SelectTrigger>
            <SelectContent>
              {availableBlockchains.map(bc => {
                // Display network name with proper capitalization
                const networkName = bc.net.charAt(0).toUpperCase() + bc.net.slice(1);
                return (
                  <SelectItem key={bc.walletType} value={bc.walletType}>
                    <div className="flex items-center gap-2">
                      <span>{networkName}</span>
                      <Badge variant="outline" className="text-xs">
                        Chain ID: {bc.chainId} • {bc.count} wallet{bc.count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {availableBlockchains.length === 0
              ? 'Create a project wallet first to enable multi-sig deployment'
              : 'Network where the wallet will be deployed (showing only available project wallets)'
            }
          </p>
        </div>

        {/* Project Wallet Funding Selection */}
        <div className="space-y-2">
          <Label htmlFor="funding-wallet">Funding Source *</Label>
          <Select
            value={selectedProjectWallet}
            onValueChange={setSelectedProjectWallet}
            disabled={isDeploying || projectWallets.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project wallet to fund deployment" />
            </SelectTrigger>
            <SelectContent>
              {projectWallets.map(wallet => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {wallet.walletAddress.slice(0, 10)}...{wallet.walletAddress.slice(-8)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {projectName || 'Project'} Wallet
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select which project wallet will pay for deployment gas costs (~0.01 ETH)
          </p>
        </div>

        {/* Owner Mode Selection */}
        <div className="space-y-2">
          <Label>Owner Selection Mode</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={ownerMode === 'users' ? 'default' : 'outline'}
              onClick={() => setOwnerMode('users')}
              disabled={isDeploying}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              System Users
            </Button>
            <Button
              type="button"
              variant={ownerMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setOwnerMode('manual')}
              disabled={isDeploying}
              className="flex-1"
            >
              <User className="w-4 h-4 mr-2" />
              Manual Addresses
            </Button>
          </div>
        </div>

        {/* Project Users Mode */}
        {ownerMode === 'users' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Owners ({selectedUserIds.length}) *</Label>
              <Badge variant="outline">
                {systemUsers.filter(u => u.hasAddress).length} users with {blockchain} address
              </Badge>
            </div>
            <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
              {systemUsers.map(user => (
                <label
                  key={user.userId}
                  className={`flex items-center p-3 hover:bg-muted cursor-pointer ${
                    !user.hasAddress ? 'opacity-50' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedUserIds.includes(user.userId)}
                    onCheckedChange={() => toggleUserSelection(user.userId)}
                    disabled={isDeploying || !user.hasAddress}
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{user.email}</span>
                      {user.roleName && (
                        <Badge variant="secondary" className="text-xs">
                          {user.roleName}
                        </Badge>
                      )}
                    </div>
                    {user.hasAddress ? (
                      <span className="text-xs text-muted-foreground font-mono block mt-1">
                        {user.address?.slice(0, 10)}...{user.address?.slice(-8)}
                      </span>
                    ) : (
                      <span className="text-xs text-destructive">
                        No {blockchain} address
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select users who will be owners of this multi-sig wallet (must have blockchain addresses)
            </p>
          </div>
        )}

        {/* Manual Owners Mode */}
        {ownerMode === 'manual' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Owners ({manualOwners.filter(o => o).length}) *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOwner}
                disabled={isDeploying || manualOwners.length >= 10}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Owner
              </Button>
            </div>
            <div className="space-y-2">
              {manualOwners.map((owner, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={owner}
                    onChange={(e) => updateOwner(index, e.target.value)}
                    placeholder="0x..."
                    className="flex-1 font-mono text-sm"
                    disabled={isDeploying}
                  />
                  {manualOwners.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOwner(index)}
                      disabled={isDeploying}
                    >
                      <MinusIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Ethereum addresses that can sign transactions (minimum 2 owners)
            </p>
          </div>
        )}

        {/* Threshold */}
        <div className="space-y-2">
          <Label htmlFor="threshold">
            Required Signatures ({threshold} of{' '}
            {ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length}) *
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="threshold"
              type="number"
              min="1"
              max={ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
              className="w-24"
              disabled={isDeploying}
            />
            <div className="flex-1">
              <div className="flex gap-1">
                {Array.from(
                  {
                    length:
                      ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length,
                  },
                  (_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${i < threshold ? 'bg-primary' : 'bg-muted'}`}
                    />
                  )
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Number of signatures required to execute transactions
          </p>
        </div>

        {/* Threshold Warning */}
        {threshold ===
          (ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length) &&
          (ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length) > 2 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Requiring all owners to sign may make the wallet difficult to use if any owner becomes
                unavailable. Consider using a lower threshold (e.g.,{' '}
                {Math.ceil(
                  (ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length) *
                    0.6
                )}{' '}
                of{' '}
                {ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length}).
              </AlertDescription>
            </Alert>
          )}

        {/* Gas Configuration */}
        {blockchain && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Gas Estimation
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGasConfig(!showGasConfig)}
                >
                  {showGasConfig ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
              <CardDescription className="text-xs">
                Real-time gas estimation for {blockchain} network
              </CardDescription>
            </CardHeader>
            {showGasConfig && (
              <CardContent>
                <GasEstimatorEIP1559
                  blockchain={blockchain}
                  onSelectFeeData={handleGasEstimate}
                  defaultPriority={FeePriority.MEDIUM}
                  showAdvanced={false}
                />
              </CardContent>
            )}
          </Card>
        )}

        {/* Summary */}
        <div className="rounded-md border p-4 space-y-2">
          <h4 className="font-semibold text-sm">Deployment Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <Badge variant="outline">{blockchain}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Owners:</span>
              <span className="font-medium">
                {ownerMode === 'users' ? selectedUserIds.length : manualOwners.filter(o => o).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Signatures:</span>
              <span className="font-medium">{threshold}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Funded By:</span>
              <Badge variant="secondary">
                {projectName || 'Project'} Wallet
              </Badge>
            </div>
            {selectedProjectWallet && projectWallets.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funding Address:</span>
                <span className="text-xs font-mono">
                  {projectWallets.find(w => w.id === selectedProjectWallet)?.walletAddress.slice(0, 10)}...
                  {projectWallets.find(w => w.id === selectedProjectWallet)?.walletAddress.slice(-8)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Gas:</span>
              <span className="font-medium">{calculateEstimatedCost()}</span>
            </div>
            {estimatedGasData && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gas Limit:</span>
                <span className="text-muted-foreground">{MULTISIG_GAS_LIMIT.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isDeploying}>
              Cancel
            </Button>
          )}
          <Button type="button" onClick={handleDeploy} disabled={isDeploying}>
            {isDeploying ? 'Deploying...' : 'Deploy Multi-Sig Wallet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MultiSigWalletForm;

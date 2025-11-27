/**
 * Deployment Dialog Component
 * 
 * UI for triggering contract deployments with network selection
 * and deployment progress tracking
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Rocket,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  ExternalLink,
  Key,
  Network,
  Timer,
  Wallet
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  ContractDeploymentOrchestrator,
  DeploymentConfig,
  DeploymentStatus
} from '@/services/admin/ContractDeploymentOrchestrator';
import { supabase } from '@/infrastructure/database/client';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';

// ============================================
// Types
// ============================================

interface DeploymentDialogProps {
  onDeploymentComplete?: (network: string) => void;
}

interface ProjectWallet {
  id: string;
  wallet_address: string;
  public_key: string;
  private_key: string; // Encrypted
  chain_id: string | null;
  evm_chain_id: string | null; // For networks like Injective with EVM compatibility
  network?: string;
  project_wallet_name: string | null;
}

interface UserAddress {
  id: string;
  address: string;
  blockchain: string;
  is_active: boolean;
}

// ============================================
// Component
// ============================================

export function DeploymentDialog({ onDeploymentComplete }: DeploymentDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'mainnet' | 'testnet'>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('hoodi');
  const [projectWallets, setProjectWallets] = useState<ProjectWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [walletLoadError, setWalletLoadError] = useState<string | null>(null);
  const [walletsCache, setWalletsCache] = useState<Record<string, ProjectWallet[]>>({});
  const [waitMinutes, setWaitMinutes] = useState<number>(45);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  
  // Super Admin Address Selection
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [selectedSuperAdminAddress, setSelectedSuperAdminAddress] = useState<string>('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const hasLoadedAddressesRef = React.useRef(false); // Track if addresses have been loaded
  
  // Get API key from environment
  const explorerApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || '';

  // Get all deployable networks
  const networks = ContractDeploymentOrchestrator.getDeployableNetworks();
  const selectedNetworkInfo = networks.find(n => n.network === selectedNetwork);

  // Filter networks based on network filter
  const filteredNetworks = networks.filter(network => {
    if (networkFilter === 'all') return true;
    return network.type === networkFilter;
  });

  /**
   * Load project wallets for selected network (with caching)
   * Checks both chain_id and evm_chain_id for networks like Injective
   */
  const loadProjectWallets = useCallback(async () => {
    if (!selectedNetworkInfo) return;

    const chainId = selectedNetworkInfo.chainId.toString();
    
    // Check cache first
    if (walletsCache[chainId]) {
      setProjectWallets(walletsCache[chainId]);
      if (walletsCache[chainId].length > 0 && !selectedWalletId) {
        setSelectedWalletId(walletsCache[chainId][0].id);
      }
      return;
    }

    setIsLoadingWallets(true);
    setWalletLoadError(null);
    
    try {
      // Query project wallets for this chain
      // Check BOTH chain_id and evm_chain_id (for networks like Injective with dual compatibility)
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, wallet_address, public_key, private_key, chain_id, evm_chain_id, project_wallet_name')
        .or(`chain_id.eq.${chainId},evm_chain_id.eq.${chainId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const wallets = data || [];
      
      // Cache the results
      setWalletsCache(prev => ({ ...prev, [chainId]: wallets }));
      setProjectWallets(wallets);
      
      // Auto-select first wallet if available
      if (wallets.length > 0 && !selectedWalletId) {
        setSelectedWalletId(wallets[0].id);
      }
    } catch (error) {
      console.error('Failed to load project wallets:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load wallets';
      setWalletLoadError(errorMsg);
      toast({
        title: 'Failed to Load Wallets',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingWallets(false);
    }
  }, [selectedNetworkInfo, walletsCache, selectedWalletId, toast]);

  /**
   * Load user addresses with Super Admin role
   * Fetches addresses from user_addresses where user has Super Admin role
   */
  const loadSuperAdminAddresses = useCallback(async () => {
    // Don't reload if already loaded in this dialog session
    if (hasLoadedAddressesRef.current) {
      console.log('⏭️  Skipping load - addresses already loaded in this session');
      return;
    }
    
    setIsLoadingAddresses(true);
    
    try {
      // Get current session (user is already in the session)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get session: ' + sessionError.message);
      }
      if (!session?.user) {
        throw new Error('Not authenticated. Please log in and try again.');
      }

      const userId = session.user.id;
      console.log('📋 Loading Super Admin addresses for user:', userId);

      // Get Super Admin role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', 'Super Admin')
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (roleError) {
        console.error('Role query error:', roleError);
        throw new Error('Failed to query roles: ' + roleError.message);
      }
      
      if (!roleData) {
        throw new Error('Super Admin role not found in system. Please contact system administrator.');
      }

      console.log('✅ Super Admin role found:', roleData.id);

      // Check if user has Super Admin role
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('role_id', roleData.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (userRoleError) {
        console.error('User role query error:', userRoleError);
        throw new Error('Failed to check user roles: ' + userRoleError.message);
      }

      if (!userRoleData) {
        throw new Error('You must have Super Admin role to deploy contracts. Please contact an administrator to assign you the Super Admin role.');
      }

      console.log('✅ User has Super Admin role');

      // Get user's addresses
      const { data: addressData, error: addressError } = await supabase
        .from('user_addresses')
        .select('id, address, blockchain, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (addressError) {
        console.error('Address query error:', addressError);
        throw new Error('Failed to load addresses: ' + addressError.message);
      }

      const addresses = addressData || [];
      console.log(`✅ Found ${addresses.length} active address(es)`);
      
      setUserAddresses(addresses);
      hasLoadedAddressesRef.current = true; // Mark as loaded

      // Auto-select first address if available
      if (addresses.length > 0 && !selectedSuperAdminAddress) {
        setSelectedSuperAdminAddress(addresses[0].address);
        console.log('✅ Auto-selected first address:', addresses[0].address);
      }

      if (addresses.length === 0) {
        toast({
          title: 'No Addresses Found',
          description: 'Please add an address to your profile to deploy contracts. Go to Settings > Profile to add an address.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('❌ Failed to load super admin addresses:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load addresses';
      
      // Clear any previously loaded addresses on error
      setUserAddresses([]);
      setSelectedSuperAdminAddress('');
      
      toast({
        title: 'Failed to Load Super Admin Address',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [toast]); // Remove selectedSuperAdminAddress from dependencies to prevent infinite loop

  /**
   * Decrypt wallet private key
   */
  const decryptWalletPrivateKey = useCallback(async (walletId: string): Promise<string> => {
    const wallet = projectWallets.find(w => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check if private key is encrypted
    if (WalletEncryptionClient.isEncrypted(wallet.private_key)) {
      // Decrypt via backend
      const decrypted = await WalletEncryptionClient.decrypt(wallet.private_key);
      return decrypted;
    }

    // Already plaintext
    return wallet.private_key;
  }, [projectWallets]);

  /**
   * Load wallets immediately when dialog opens or network changes
   * Pre-fetch wallets for better UX (don't wait for tab switch)
   */
  useEffect(() => {
    if (open) {
      // Load wallets as soon as dialog opens, not waiting for tab switch
      loadProjectWallets();
      // Also load super admin addresses (only once due to ref check)
      loadSuperAdminAddresses();
    }
  }, [selectedNetwork, open, loadProjectWallets]); // Removed loadSuperAdminAddresses to prevent infinite loop

  /**
   * Cleanup wallets when dialog closes
   */
  useEffect(() => {
    if (!open) {
      setProjectWallets([]);
      setSelectedWalletId('');
      setUserAddresses([]);
      setSelectedSuperAdminAddress('');
      hasLoadedAddressesRef.current = false; // Reset loaded flag for next time
    }
  }, [open]);

  /**
   * Handle deployment execution
   * Actually executes deployment via backend API
   */
  const handleDeploy = useCallback(async () => {
    console.group('🚀 Deployment Initiated from UI');
    console.log('Selected Network:', selectedNetwork);
    console.log('Network Info:', selectedNetworkInfo);
    console.log('Selected Wallet ID:', selectedWalletId);
    console.log('Selected Super Admin Address:', selectedSuperAdminAddress);
    console.log('Wait Minutes:', waitMinutes);
    console.log('Has Explorer API Key:', !!explorerApiKey);
    
    // Validate wallet selection
    if (!selectedWalletId) {
      console.error('❌ Validation failed: No wallet selected');
      console.groupEnd();
      toast({
        title: 'Validation Error',
        description: 'Please select a project wallet',
        variant: 'destructive'
      });
      return;
    }

    // Validate super admin address selection
    if (!selectedSuperAdminAddress) {
      console.error('❌ Validation failed: No super admin address selected');
      console.groupEnd();
      toast({
        title: 'Validation Error',
        description: 'Please select a Super Admin address for contract ownership',
        variant: 'destructive'
      });
      return;
    }

    // Decrypt private key from selected wallet
    let privateKeyToUse: string;
    try {
      console.log('🔓 Decrypting wallet private key...');
      privateKeyToUse = await decryptWalletPrivateKey(selectedWalletId);
      console.log('✅ Private key decrypted successfully');
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      console.groupEnd();
      toast({
        title: 'Decryption Failed',
        description: error instanceof Error ? error.message : 'Failed to decrypt wallet private key',
        variant: 'destructive'
      });
      return;
    }

    const config: DeploymentConfig = {
      network: selectedNetwork,
      environment: selectedNetworkInfo?.type || 'testnet',
      deployerPrivateKey: privateKeyToUse,
      superAdminAddress: selectedSuperAdminAddress,
      explorerApiKey: explorerApiKey || undefined,
      waitMinutes
    };

    console.log('📋 Deployment Configuration:', {
      ...config,
      deployerPrivateKey: config.deployerPrivateKey.substring(0, 8) + '...[REDACTED]',
      superAdminAddress: config.superAdminAddress
    });

    // Validate configuration
    const validation = ContractDeploymentOrchestrator.validateDeploymentConfig(config);
    if (!validation.valid) {
      console.error('❌ Configuration validation failed:', validation.errors);
      console.groupEnd();
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive'
      });
      return;
    }

    console.log('✅ Configuration validated');
    setIsDeploying(true);

    try {
      // Import the deployment execution service
      console.log('📦 Loading DeploymentExecutionService...');
      const { DeploymentExecutionService } = await import('@/services/admin/DeploymentExecutionService');

      // Execute deployment with status updates
      console.log('🚀 Starting deployment workflow...');
      const result = await DeploymentExecutionService.executeCompleteDeploymentWorkflow(
        config,
        (status) => {
          console.log(`📊 Status Update: [${status.phase}] ${status.message} (${status.progress}%)`);
          setDeploymentStatus(status);
          
          // Show toast for phase changes
          if (status.phase === 'deploying') {
            toast({
              title: 'Deployment Started',
              description: status.message,
            });
          } else if (status.phase === 'waiting') {
            toast({
              title: 'Waiting for Indexing',
              description: status.message,
            });
          } else if (status.phase === 'verifying') {
            toast({
              title: 'Verifying Contracts',
              description: status.message,
            });
          } else if (status.phase === 'complete') {
            toast({
              title: 'Deployment Complete!',
              description: status.message,
            });
          } else if (status.phase === 'error') {
            toast({
              title: 'Deployment Failed',
              description: status.error || 'Unknown error',
              variant: 'destructive'
            });
          }
        }
      );

      if (result.success) {
        console.log('🎉 Deployment successful!', result);
        console.groupEnd();
        
        // Success! Navigate to factory config for import
        toast({
          title: 'Deployment Successful!',
          description: `Contracts deployed to ${selectedNetwork}. Ready to import.`,
        });

        // Close dialog
        setIsDeploying(false);
        setOpen(false);

        // Call completion callback
        if (onDeploymentComplete) {
          onDeploymentComplete(selectedNetwork);
        }

        // Ask if user wants to navigate to import page
        if (window.confirm('Navigate to Factory Config page to import deployment?')) {
          window.location.href = '/admin/factory-config';
        }
      }

    } catch (error) {
      console.error('💥 Deployment failed with error:', error);
      console.groupEnd();
      
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      setDeploymentStatus({
        phase: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDeploying(false);
    }
  }, [
    selectedNetwork,
    selectedNetworkInfo,
    explorerApiKey,
    waitMinutes,
    selectedWalletId,
    selectedSuperAdminAddress,
    decryptWalletPrivateKey,
    toast,
    onDeploymentComplete
  ]);

  /**
   * Reset form
   */
  const handleReset = () => {
    setNetworkFilter('all');
    setSelectedWalletId('');
    setProjectWallets([]);
    setWalletLoadError(null);
    setWalletsCache({}); // Clear cache on reset
    setWaitMinutes(45);
    setDeploymentStatus(null);
    setIsDeploying(false);
  };

  /**
   * Get phase icon
   */
  const getPhaseIcon = (phase: DeploymentStatus['phase']) => {
    switch (phase) {
      case 'deploying':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'waiting':
        return <Clock className="h-4 w-4" />;
      case 'verifying':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'importing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Rocket className="h-4 w-4 mr-2" />
          Deploy Contracts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Deploy Universal Contract Suite</DialogTitle>
          <DialogDescription>
            Deploy the complete contract suite to any EVM-compatible network.
            Deployment includes automatic verification after block explorer indexing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Network Type Filter */}
          <div className="space-y-2">
            <Label>Network Type</Label>
            <Tabs value={networkFilter} onValueChange={(v) => setNetworkFilter(v as 'all' | 'mainnet' | 'testnet')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Networks</TabsTrigger>
                <TabsTrigger value="mainnet">Mainnet</TabsTrigger>
                <TabsTrigger value="testnet">Testnet</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Network Selection */}
          <div className="space-y-2">
            <Label htmlFor="network" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network
            </Label>
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger id="network">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {filteredNetworks.map((network) => (
                  <SelectItem key={network.network} value={network.network}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{network.name}</span>
                      <Badge
                        variant={network.type === 'mainnet' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {network.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedNetworkInfo && (
              <p className="text-xs text-muted-foreground">
                Chain ID: {selectedNetworkInfo.chainId} | Explorer:{' '}
                <a
                  href={selectedNetworkInfo.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  {selectedNetworkInfo.explorer}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
          </div>

          {/* Project Wallet Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Project Wallet
            </Label>
            
            {isLoadingWallets ? (
              <div className="flex items-center gap-2 p-3 border rounded bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">Loading wallets for {selectedNetworkInfo?.name}...</span>
              </div>
            ) : walletLoadError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load Wallets</AlertTitle>
                <AlertDescription>
                  {walletLoadError}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={loadProjectWallets}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : projectWallets.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Wallets Found</AlertTitle>
                <AlertDescription>
                  No project wallets found for {selectedNetworkInfo?.name} (Chain ID: {selectedNetworkInfo?.chainId}). 
                  Create a project wallet for this network first.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectWallets.map((wallet) => {
                      // Determine which chain ID matches
                      const matchedByChainId = wallet.chain_id === selectedNetworkInfo?.chainId.toString();
                      const matchedByEvmChainId = wallet.evm_chain_id === selectedNetworkInfo?.chainId.toString();
                      const displayChainId = matchedByEvmChainId ? wallet.evm_chain_id : wallet.chain_id;
                      
                      return (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="font-mono text-xs">
                              {wallet.wallet_address.slice(0, 8)}...{wallet.wallet_address.slice(-6)}
                            </span>
                            {displayChainId && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                Chain {displayChainId}
                              </span>
                            )}
                          </div>
                          {wallet.project_wallet_name && (
                            <div className="text-xs text-muted-foreground">
                              {wallet.project_wallet_name}
                            </div>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {projectWallets.length} wallet{projectWallets.length !== 1 ? 's' : ''} available • Private key will be securely decrypted
                </p>
              </>
            )}
          </div>

          {/* Super Admin Address Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Super Admin Address
            </Label>
            
            {isLoadingAddresses ? (
              <div className="flex items-center gap-2 p-3 border rounded bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">Loading your addresses...</span>
              </div>
            ) : userAddresses.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Addresses Found</AlertTitle>
                <AlertDescription>
                  You must have an active address in your profile to deploy contracts.
                  Add an address in your profile settings.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Select value={selectedSuperAdminAddress} onValueChange={setSelectedSuperAdminAddress}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select super admin address" />
                  </SelectTrigger>
                  <SelectContent>
                    {userAddresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.address}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-mono text-xs">
                            {addr.address.slice(0, 10)}...{addr.address.slice(-8)}
                          </span>
                          {addr.blockchain && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {addr.blockchain}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  This address will receive admin ownership of deployed contracts
                </p>
              </>
            )}
          </div>

          {/* Block Explorer API Key (from environment) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Block Explorer API Key
            </Label>
            <div className="flex items-center gap-2 p-2 border rounded bg-muted/50">
              {explorerApiKey ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">
                    Loaded from environment (VITE_ETHERSCAN_API_KEY)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-muted-foreground">
                    Not configured in environment
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Required for automatic contract verification. Configure VITE_ETHERSCAN_API_KEY in .env file.
            </p>
          </div>

          {/* Wait Time */}
          <div className="space-y-2">
            <Label htmlFor="waitTime" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Wait Time Before Verification (minutes)
            </Label>
            <Input
              id="waitTime"
              type="number"
              min={0}
              max={120}
              value={waitMinutes}
              onChange={(e) => setWaitMinutes(parseInt(e.target.value) || 45)}
              disabled={isDeploying}
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 45-60 minutes for block explorer indexing. Increase for slower networks.
            </p>
          </div>

          {/* Deployment Status */}
          {deploymentStatus && (
            <Alert
              variant={deploymentStatus.phase === 'error' ? 'destructive' : 'default'}
              className="mt-4"
            >
              <div className="flex items-center gap-2">
                {getPhaseIcon(deploymentStatus.phase)}
                <AlertTitle className="capitalize">{deploymentStatus.phase}</AlertTitle>
              </div>
              <AlertDescription>
                {deploymentStatus.message}
                {deploymentStatus.progress > 0 && (
                  <Progress value={deploymentStatus.progress} className="mt-2" />
                )}
                {/* Show detailed error output */}
                {deploymentStatus.phase === 'error' && deploymentStatus.error && (
                  <div className="mt-4">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-semibold mb-2">View Error Details</summary>
                      <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded mt-2 overflow-auto max-h-64 whitespace-pre-wrap">
                        {deploymentStatus.error}
                      </pre>
                    </details>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Tip: Check the browser console (F12) for complete logs
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Ensure deployer wallet has sufficient gas funds</li>
                <li>Deployment is irreversible once confirmed</li>
                <li>Process may take 60+ minutes including verification</li>
                <li>Commands will be copied to clipboard for manual execution</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isDeploying}
          >
            Reset
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={isDeploying || !selectedWalletId}
          >
            {isDeploying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Deploy Contracts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeploymentDialog;

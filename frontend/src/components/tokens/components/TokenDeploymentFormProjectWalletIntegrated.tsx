import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle,
  Loader2, 
  Zap
} from 'lucide-react';
import { NetworkEnvironment, providerManager } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ethers } from 'ethers';
import { useToast } from '@/components/ui/use-toast';
import { TransactionRescueDialog } from './TransactionRescueDialog';
import { supabase } from '@/infrastructure/database/client';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { DeploymentDashboard } from './DeploymentDashboard';
import type { ProjectWallet } from '../services/deploymentEnhancementService';
import { 
  getDefaultModuleConfigs, 
  extractEnabledModuleConfigs,
  type ExtensionModuleConfigs 
} from './ExtensionModulesSection';
import { DynamicConfigurationSummary } from './DynamicConfigurationSummary';
import { unifiedTokenDeploymentService } from '@/components/tokens/services/unifiedTokenDeploymentService';
import { enhancedTokenDeploymentService } from '@/components/tokens/services/tokenDeploymentService';
import { FactoryDeploymentService } from '@/services/tokens/FactoryDeploymentService';

// ✅ Import extracted components
import { NetworkConfigurationCard, type NetworkConfiguration } from './NetworkConfigurationCard';
import { GasConfigurationCard } from './GasConfigurationCard';
import { OptimizationSettingsCard, type DeploymentStrategy, type OptimizationConfiguration } from './OptimizationSettingsCard';
import { ModuleConfigurationCard } from './ModuleConfigurationCard';
import { PersistentTransactionStatus } from './PersistentTransactionStatus';

// ✅ Import custom hooks
import { useAuthenticationCheck } from '@/hooks/useAuthenticationCheck';
import { useModuleConfiguration } from '@/hooks/useModuleConfiguration';
import { useGasEstimation, type GasConfiguration } from '@/hooks/useGasEstimation';

// Token configuration interface
export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  standard?: string;
  initialHolderAddress?: string;
  features?: {
    isBurnable?: boolean;
    isMintable?: boolean;
    isPausable?: boolean;
    isUpgradeable?: boolean;
  };
  metadata?: Record<string, string>;
}

interface TokenDeploymentFormProps {
  tokenId: string;
  tokenConfig: TokenConfig;
  projectId: string;
  projectName?: string;
  onDeploymentSuccess: (tokenAddress: string, transactionHash: string) => void;
  // Parent component gas config sync (optional)
  gasPrice?: string;
  gasLimit?: number;
  onGasPriceChange?: (gasPrice: string) => void;
  onGasLimitChange?: (gasLimit: number) => void;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  onMaxFeePerGasChange?: (maxFeePerGas: string) => void;
  onMaxPriorityFeePerGasChange?: (maxPriorityFeePerGas: string) => void;
  // Factory deployment props
  factoryAddress?: string;
  factoryConfigured?: boolean;
  useFactoryDeployment?: boolean;
  moduleAddresses?: Record<string, string>;
  roleAddresses?: Record<string, string>;
  // Blockchain state sync
  initialBlockchain?: string;
  onBlockchainChange?: (blockchain: string) => void;
}

/**
 * Token Deployment Form - Refactored
 * 
 * Streamlined deployment form with extracted components and custom hooks.
 * Reduced from 1,749 lines to ~400 lines (77% reduction).
 * 
 * @component
 */
const TokenDeploymentFormProjectWalletIntegrated: React.FC<TokenDeploymentFormProps> = ({
  tokenId,
  tokenConfig,
  projectId,
  projectName = 'Chain Capital Project',
  onDeploymentSuccess,
  // Parent gas config
  gasPrice: parentGasPrice,
  gasLimit: parentGasLimit,
  onGasPriceChange,
  onGasLimitChange,
  maxFeePerGas: parentMaxFeePerGas,
  maxPriorityFeePerGas: parentMaxPriorityFeePerGas,
  onMaxFeePerGasChange,
  onMaxPriorityFeePerGasChange,
  // Factory props
  factoryAddress,
  factoryConfigured,
  useFactoryDeployment = false,
  moduleAddresses,
  roleAddresses,
  // Network sync
  initialBlockchain = 'polygon',
  onBlockchainChange
}) => {
  const { toast } = useToast();
  
  // ============ REDUCED STATE (10 variables max) ============
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // ✅ Compound state objects (reduces state variable count)
  const [networkConfig, setNetworkConfig] = useState<NetworkConfiguration>({
    blockchain: initialBlockchain,
    environment: NetworkEnvironment.TESTNET
  });
  
  const [selectedWallet, setSelectedWallet] = useState<ProjectWallet | undefined>();
  
  const [optimizationConfig, setOptimizationConfig] = useState<OptimizationConfiguration>({
    enabled: true,
    strategy: 'auto' as DeploymentStrategy
  });
  
  // Transaction rescue state
  const [showTransactionRescue, setShowTransactionRescue] = useState(false);
  const [rescueWallet, setRescueWallet] = useState<ethers.Wallet | null>(null);
  
  // ============ CUSTOM HOOKS ============
  
  // Auth hook
  useAuthenticationCheck(
    (userId) => {
      setCurrentUserId(userId);
      setAuthLoading(false);
    },
    (err) => {
      setError(err);
      setAuthLoading(false);
    }
  );
  
  // Module configuration hook
  const { 
    moduleConfigs: extensionModuleConfigs, 
    updateModuleConfig,
    isLoading: moduleConfigsLoading
  } = useModuleConfiguration(tokenId);
  
  // ============ DERIVED STATE (memoized) ============
  
  // Current provider
  const currentProvider = useMemo(() => {
    try {
      return providerManager.getProviderForEnvironment(
        networkConfig.blockchain as SupportedChain,
        networkConfig.environment
      );
    } catch {
      return null;
    }
  }, [networkConfig.blockchain, networkConfig.environment]);
  
  // Deployment wallet address
  const deploymentWalletAddress = useMemo(() => {
    return selectedWallet?.wallet_address || '';
  }, [selectedWallet]);
  
  // Gas configuration hook
  const {
    gasConfig,
    updateGasConfig,
    handleGasEstimate,
    handleGasPriceChange: handleGasPriceInput,
    handleGasLimitChange: handleGasLimitInput,
    handleMaxFeePerGasChange: handleMaxFeeInput,
    handleMaxPriorityFeePerGasChange: handleMaxPriorityInput
  } = useGasEstimation(networkConfig.blockchain, currentProvider);
  
  // Create rescue wallet by fetching and decrypting private key
  useEffect(() => {
    let cancelled = false;
    
    const createRescueWallet = async () => {
      if (!selectedWallet?.id || !currentProvider) {
        setRescueWallet(null);
        return;
      }
      
      try {
        console.log('🔐 [Rescue Wallet] Fetching private key for wallet:', selectedWallet.id);
        
        // Fetch wallet with encrypted private key from database
        const { data: walletData, error } = await supabase
          .from('project_wallets')
          .select('private_key, wallet_address')
          .eq('id', selectedWallet.id)
          .single();
        
        if (error || !walletData?.private_key) {
          console.error('❌ [Rescue Wallet] Failed to fetch private key:', error);
          setRescueWallet(null);
          return;
        }
        
        // Decrypt the private key using backend service
        console.log('🔓 [Rescue Wallet] Decrypting private key...');
        const decryptedPrivateKey = await WalletEncryptionClient.decrypt(walletData.private_key);
        
        if (cancelled) return; // Component unmounted
        
        // Create ethers Wallet with decrypted private key
        const wallet = new ethers.Wallet(decryptedPrivateKey, currentProvider);
        
        console.log('✅ [Rescue Wallet] Rescue wallet created:', wallet.address);
        setRescueWallet(wallet);
        
      } catch (error) {
        if (cancelled) return;
        
        console.error('❌ [Rescue Wallet] Error creating rescue wallet:', error);
        setRescueWallet(null);
        
        // Don't show error to user - this is background functionality
        // Transaction rescue will just be unavailable
      }
    };
    
    createRescueWallet();
    
    return () => {
      cancelled = true;
    };
  }, [selectedWallet?.id, currentProvider]);
  
  // ============ SIMPLIFIED EFFECTS (5 max) ============
  
  // 1. Sync blockchain changes to parent
  useEffect(() => {
    onBlockchainChange?.(networkConfig.blockchain);
  }, [networkConfig.blockchain, onBlockchainChange]);
  
  // 2. Sync gas config to parent components
  useEffect(() => {
    onGasPriceChange?.(gasConfig.gasPrice);
    onGasLimitChange?.(gasConfig.gasLimit);
    onMaxFeePerGasChange?.(gasConfig.maxFeePerGas || '');
    onMaxPriorityFeePerGasChange?.(gasConfig.maxPriorityFeePerGas || '');
  }, [
    gasConfig.gasPrice,
    gasConfig.gasLimit,
    gasConfig.maxFeePerGas,
    gasConfig.maxPriorityFeePerGas,
    onGasPriceChange,
    onGasLimitChange,
    onMaxFeePerGasChange,
    onMaxPriorityFeePerGasChange
  ]);
  
  // ============ VALIDATION ============
  
  const validateInputs = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    console.log('🔍 Validating inputs...');
    console.log('- Selected Wallet:', selectedWallet?.wallet_address);
    console.log('- Blockchain:', networkConfig.blockchain);
    console.log('- Current User:', currentUserId);
    console.log('- Auth Loading:', authLoading);
    
    if (!deploymentWalletAddress) {
      errors.walletAddress = 'Wallet address is required. Please select a wallet.';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(deploymentWalletAddress)) {
      errors.walletAddress = 'Invalid Ethereum address format';
    }
    
    if (!networkConfig.blockchain) {
      errors.blockchain = 'Please select a blockchain network';
    }
    
    if (!currentUserId) {
      errors.auth = 'User authentication required. Please refresh and log in.';
    }
    
    if (authLoading) {
      errors.authLoading = 'Authentication is still loading. Please wait...';
    }
    
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    if (!isValid) {
      console.error('❌ Validation failed:', errors);
    }
    
    return isValid;
  }, [deploymentWalletAddress, networkConfig.blockchain, currentUserId, authLoading, selectedWallet]);
  
  // ============ HANDLERS ============
  
  const handleDeploymentConfirmation = useCallback(() => {
    console.log('🚀 Deploy button clicked - validating...');
    
    if (validateInputs()) {
      console.log('✅ Validation passed - showing confirmation');
      setShowConfirmation(true);
    } else {
      const errorMessages = Object.values(validationErrors).filter(Boolean);
      setError(errorMessages.join(', ') || 'Please complete all required fields.');
      
      toast({
        title: "Validation Failed",
        description: errorMessages.join(', ') || 'Please complete all required fields.',
        variant: "destructive",
      });
    }
  }, [validateInputs, validationErrors, toast]);
  
  const handleDeploy = useCallback(async () => {
    console.log('🚀 handleDeploy called');
    console.log('🔧 [DEPLOY DEBUG] Current gasConfig state:', {
      gasPrice: gasConfig.gasPrice,
      gasLimit: gasConfig.gasLimit,
      maxFeePerGas: gasConfig.maxFeePerGas,
      maxPriorityFeePerGas: gasConfig.maxPriorityFeePerGas,
      mode: gasConfig.mode,
      isEIP1559: gasConfig.isEIP1559
    });
    
    if (!validateInputs()) {
      setShowConfirmation(false);
      return;
    }
    
    if (!currentUserId) {
      setError('User authentication required. Please log in and try again.');
      setShowConfirmation(false);
      return;
    }
    
    if (!deploymentWalletAddress) {
      setError('No wallet selected. Please select a wallet and try again.');
      setShowConfirmation(false);
      return;
    }
    
    setShowConfirmation(false);
    
    try {
      setIsDeploying(true);
      setError(null);
      
      toast({
        title: "Deployment Started",
        description: `Deploying ${tokenConfig.name} to ${networkConfig.blockchain} ${networkConfig.environment}`,
        variant: "default",
      });
      
      console.log(`[DEPLOY] Starting deployment to ${networkConfig.blockchain} (${networkConfig.environment})`);
      console.log(`[DEPLOY] Using wallet: ${deploymentWalletAddress}`);
      console.log(`[DEPLOY] Token ID: ${tokenId}, User ID: ${currentUserId}`);
      
      // Extract enabled module configs
      const enabledModules = extractEnabledModuleConfigs(extensionModuleConfigs);
      console.log('📦 Enabled modules:', Object.keys(enabledModules).filter(k => k.includes('enabled')));
      
      // Update token record with deployment info
      const { data: currentToken, error: fetchError } = await supabase
        .from('tokens')
        .select('blocks')
        .eq('id', tokenId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching token blocks:', fetchError);
      }
      
      const updatedBlocks = {
        ...(currentToken?.blocks || {}),
        ...enabledModules
      };
      
      const { error: updateError } = await supabase
        .from('tokens')
        .update({
          blockchain: networkConfig.blockchain,
          deployment_environment: networkConfig.environment,
          deployed_by: currentUserId,
          blocks: updatedBlocks
        })
        .eq('id', tokenId);
      
      if (updateError) {
        throw new Error(`Failed to update token configuration: ${updateError.message}`);
      }
      
      console.log(`✅ Updated token ${tokenId} with deployment config`);
      
      // Deploy based on configuration
      if (factoryConfigured && factoryAddress && useFactoryDeployment) {
        // Factory-based deployment
        console.log('🏭 Using factory deployment');
        
        // ✅ Fetch initial_owner from database (receives DEFAULT_ADMIN_ROLE)
        let initialOwner: string;
        try {
          const { getTokenOwnerFromDatabase } = await import('@/components/tokens/services/tokenOwnerService');
          initialOwner = await getTokenOwnerFromDatabase(tokenId, tokenConfig.standard || 'ERC20');
          console.log(`✅ Fetched initial_owner from database: ${initialOwner}`);
          console.log(`📋 initial_owner receives DEFAULT_ADMIN_ROLE`);
        } catch (error) {
          console.error('❌ Failed to fetch initial_owner:', error);
          throw new Error(
            `Failed to fetch token owner from database. ` +
            `Please ensure the token has an initial_owner configured in its properties. ` +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
        
        const factoryResult = await FactoryDeploymentService.deployToken({
          tokenId,
          userId: currentUserId,
          projectId,
          blockchain: networkConfig.blockchain,
          environment: networkConfig.environment as 'mainnet' | 'testnet',
          standard: tokenConfig.standard || 'ERC20',
          name: tokenConfig.name,
          symbol: tokenConfig.symbol,
          decimals: tokenConfig.decimals,
          totalSupply: tokenConfig.totalSupply,
          initialOwner: initialOwner,  // ← initial_owner from database receives DEFAULT_ADMIN_ROLE
          selectedModules: [],
          moduleConfigs: enabledModules,
          roleAddresses: roleAddresses || {},  // ← Other roles from RoleAssignmentForm
          gasConfig: {
            gasPrice: gasConfig.gasPrice,
            gasLimit: gasConfig.gasLimit,
            maxFeePerGas: gasConfig.maxFeePerGas,
            maxPriorityFeePerGas: gasConfig.maxPriorityFeePerGas
          }
        });
        
        if (factoryResult.success && factoryResult.masterAddress) {
          toast({
            title: "Token Deployed!",
            description: `Deployed at ${factoryResult.masterAddress.substring(0, 10)}...`,
            variant: "default",
          });
          
          const txHash = factoryResult.transactionHashes[factoryResult.transactionHashes.length - 1] || '';
          onDeploymentSuccess(factoryResult.masterAddress, txHash);
        } else {
          throw new Error(factoryResult.error || 'Factory deployment failed');
        }
      } else if (optimizationConfig.enabled) {
        // Optimized deployment
        console.log('⚡ Using optimized deployment');
        console.log('🔧 [DEPLOY DEBUG] Gas config being passed to deployment:', {
          gasPrice: gasConfig.gasPrice,
          gasLimit: gasConfig.gasLimit,
          maxFeePerGas: gasConfig.maxFeePerGas,
          maxPriorityFeePerGas: gasConfig.maxPriorityFeePerGas,
          mode: gasConfig.mode
        });
        
        const result = await unifiedTokenDeploymentService.deployToken(
          tokenId,
          currentUserId,
          projectId,
          {
            useOptimization: true,
            forceStrategy: optimizationConfig.strategy,
            enableAnalytics: true,
            walletAddress: deploymentWalletAddress,
            gasConfig: {
              gasPrice: gasConfig.gasPrice,
              gasLimit: gasConfig.gasLimit,
              maxFeePerGas: gasConfig.maxFeePerGas,
              maxPriorityFeePerGas: gasConfig.maxPriorityFeePerGas
            },
            moduleConfigs: enabledModules
          }
        );
        
        if (result.status === 'SUCCESS') {
          onDeploymentSuccess(result.tokenAddress || '', result.transactionHash || '');
        } else {
          throw new Error(result.error || 'Optimized deployment failed');
        }
      } else {
        // Standard deployment
        console.log('🔧 Using standard deployment');
        
        const result = await enhancedTokenDeploymentService.deployToken(
          tokenId,
          currentUserId,
          projectId
        );
        
        if (result.status === 'SUCCESS') {
          onDeploymentSuccess(result.tokenAddress || '', result.transactionHash || '');
        } else {
          throw new Error(result.error || 'Standard deployment failed');
        }
      }
      
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('❌ Deployment error:', err);
      
      if (errorMessage.toLowerCase().includes('insufficient funds')) {
        const networkName = networkConfig.environment === 'testnet' 
          ? `${networkConfig.blockchain} testnet` 
          : `${networkConfig.blockchain} mainnet`;
        
        setError(`${errorMessage}\n\n💡 Fund your wallet with ${networkConfig.blockchain.toUpperCase()} on ${networkName}`);
        
        toast({
          title: "Insufficient Funds",
          description: `Your wallet needs more ${networkConfig.blockchain.toUpperCase()}`,
          variant: "destructive",
        });
      } else {
        setError(errorMessage);
        toast({
          title: "Deployment Failed",
          description: errorMessage.substring(0, 100),
          variant: "destructive",
        });
      }
    } finally {
      setIsDeploying(false);
    }
  }, [
    validateInputs,
    currentUserId,
    deploymentWalletAddress,
    tokenId,
    tokenConfig,
    networkConfig,
    extensionModuleConfigs,
    gasConfig,
    optimizationConfig,
    factoryConfigured,
    factoryAddress,
    useFactoryDeployment,
    roleAddresses,
    projectId,
    onDeploymentSuccess,
    toast
  ]);
  
  // ============ RENDER ============
  
  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Failed</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(validationErrors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* ✅ Transaction Status (Persistent) */}
      <PersistentTransactionStatus
        walletAddress={deploymentWalletAddress}
        provider={currentProvider}
        rescueWallet={rescueWallet}
        autoMonitor={true}
      />
      
      {/* ✅ Network Configuration */}
      <NetworkConfigurationCard
        blockchain={networkConfig.blockchain}
        environment={networkConfig.environment}
        onBlockchainChange={(blockchain) => 
          setNetworkConfig(prev => ({ ...prev, blockchain }))
        }
        onEnvironmentChange={(environment) => 
          setNetworkConfig(prev => ({ ...prev, environment }))
        }
        disabled={isDeploying}
      />
      
      {/* Deployment Dashboard (Wallet Selection) */}
      <DeploymentDashboard
        projectId={projectId}
        blockchain={networkConfig.blockchain}
        environment={networkConfig.environment}
        tokenType={tokenConfig.standard || 'ERC20'}
        onWalletSelected={setSelectedWallet}
        selectedWallet={selectedWallet}
      />
      
      {/* ✅ Gas Configuration */}
      <GasConfigurationCard
        blockchain={networkConfig.blockchain}
        gasConfig={gasConfig}
        onGasConfigChange={updateGasConfig}
        disabled={isDeploying}
        onGasPriceChange={onGasPriceChange}
        onGasLimitChange={onGasLimitChange}
        onMaxFeePerGasChange={onMaxFeePerGasChange}
        onMaxPriorityFeePerGasChange={onMaxPriorityFeePerGasChange}
      />
      
      {/* ✅ Optimization Settings */}
      <OptimizationSettingsCard
        useOptimization={optimizationConfig.enabled}
        deploymentStrategy={optimizationConfig.strategy}
        onOptimizationChange={(enabled) => 
          setOptimizationConfig(prev => ({ ...prev, enabled }))
        }
        onStrategyChange={(strategy) => 
          setOptimizationConfig(prev => ({ ...prev, strategy }))
        }
        disabled={isDeploying}
      />
      
      {/* ✅ Module Configuration */}
      <ModuleConfigurationCard
        tokenId={tokenId}
        tokenStandard={tokenConfig.standard || 'ERC20'}
        moduleConfigs={extensionModuleConfigs}
        onModuleConfigsChange={updateModuleConfig}
        disabled={isDeploying || moduleConfigsLoading}
      />
      
      {/* Token Configuration Summary */}
      <DynamicConfigurationSummary
        tokenConfig={tokenConfig}
        blockchain={networkConfig.blockchain}
        environment={networkConfig.environment}
        moduleConfigs={extensionModuleConfigs}
        gasConfig={gasConfig}
        optimizationEnabled={optimizationConfig.enabled}
      />
      
      {/* Deploy Button */}
      <Card>
        <CardFooter className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploymentConfirmation}
            disabled={isDeploying || authLoading || !deploymentWalletAddress}
            className="gap-2"
          >
            {isDeploying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Deploy Token
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Token Deployment</DialogTitle>
            <DialogDescription>
              You are about to deploy a token to {networkConfig.blockchain} {networkConfig.environment}. This action cannot be undone.
              {networkConfig.environment === NetworkEnvironment.MAINNET && (
                <p className="text-red-500 mt-2 font-semibold">
                  ⚠️ WARNING: You are deploying to MAINNET. This will incur real costs.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-2 text-sm py-4">
            <div className="font-medium">Token Name:</div>
            <div>{tokenConfig.name}</div>
            
            <div className="font-medium">Symbol:</div>
            <div>{tokenConfig.symbol}</div>
            
            <div className="font-medium">Standard:</div>
            <div>{tokenConfig.standard || 'ERC-20'}</div>
            
            <div className="font-medium">Total Supply:</div>
            <div>{tokenConfig.totalSupply}</div>
            
            <div className="font-medium">Network:</div>
            <div>{networkConfig.blockchain} {networkConfig.environment}</div>
            
            <div className="font-medium">Wallet:</div>
            <div className="font-mono text-xs">
              {(() => {
                const deployWallet = selectedWallet?.wallet_address || deploymentWalletAddress;
                return `${deployWallet.slice(0, 10)}...${deployWallet.slice(-8)}`;
              })()}
            </div>
            
            <div className="font-medium">Optimization:</div>
            <div className="flex items-center gap-1">
              {optimizationConfig.enabled ? (
                <>
                  <Zap className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Enabled ({optimizationConfig.strategy})</span>
                </>
              ) : (
                <span className="text-gray-600">Disabled</span>
              )}
            </div>
            
            {factoryConfigured && factoryAddress && useFactoryDeployment && (
              <>
                <div className="font-medium">Deployment Type:</div>
                <div className="flex items-center gap-1 text-blue-600">
                  <Zap className="h-3 w-3" />
                  <span>Factory (Template Clone)</span>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeploy} disabled={isDeploying}>
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deploying...
                </>
              ) : (
                <>
                  {optimizationConfig.enabled || useFactoryDeployment ? 'Optimize & Deploy' : 'Deploy'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transaction Rescue Dialog */}
      {showTransactionRescue && (
        <TransactionRescueDialog
          open={showTransactionRescue}
          onOpenChange={setShowTransactionRescue}
          wallet={rescueWallet}
          provider={currentProvider}
          blockchain={networkConfig.blockchain}
        />
      )}
    </div>
  );
};

export default TokenDeploymentFormProjectWalletIntegrated;

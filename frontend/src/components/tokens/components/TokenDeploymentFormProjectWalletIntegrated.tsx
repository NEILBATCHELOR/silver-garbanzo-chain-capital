import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  AlertCircle, 
  ArrowRight, 
  CheckCircle, 
  ExternalLink, 
  Info, 
  Loader2, 
  ShieldAlert, 
  Zap, 
  Wallet, 
  Plus, 
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Wand2
} from 'lucide-react';
import BlockchainSelector from '@/components/tokens/components/BlockchainSelector';
import { NetworkEnvironment, providerManager } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain, NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BlockchainFactory } from '@/infrastructure/web3/factories/BlockchainFactory';
import { enhancedTokenDeploymentService } from '@/components/tokens/services/tokenDeploymentService';
import { unifiedTokenDeploymentService } from '@/components/tokens/services/unifiedTokenDeploymentService';
import { tokenProjectWalletIntegrationService, TokenWalletIntegrationResult } from '@/services/token/tokenProjectWalletIntegrationService';
import { FactoryDeploymentService } from '@/services/tokens/FactoryDeploymentService'; // ✅ ADD: Factory deployment service
import { useToast } from '@/components/ui/use-toast';
import GasEstimatorEIP1559, { EIP1559FeeData } from '@/components/tokens/components/transactions/GasEstimatorEIP1559';
import { FeePriority } from '@/services/blockchain/FeeEstimator';
import { supabase } from '@/infrastructure/database/client'; // ✅ ADD: Import Supabase client
import { RoleAssignmentForm } from '@/components/tokens/forms-comprehensive/RoleAssignmentForm';
import { DeploymentDashboard } from './DeploymentDashboard';
import type { ProjectWallet } from '../services/deploymentEnhancementService';
import { 
  ExtensionModulesSection, 
  getDefaultModuleConfigs, 
  extractEnabledModuleConfigs,
  type ExtensionModuleConfigs 
} from './ExtensionModulesSection';
import { DynamicConfigurationSummary } from './DynamicConfigurationSummary';

// Utility function for conditional class names
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Define better types for token configuration
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

interface TokenDeploymentFormProjectWalletIntegratedProps {
  tokenId: string; // ✅ ADD: Token ID from URL params
  tokenConfig: TokenConfig;
  projectId: string;
  projectName?: string;
  onDeploymentSuccess: (tokenAddress: string, transactionHash: string) => void;
  // Gas configuration props (Legacy)
  gasPrice?: string;
  gasLimit?: number;
  onGasPriceChange?: (gasPrice: string) => void;
  onGasLimitChange?: (gasLimit: number) => void;
  // EIP-1559 props
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  onMaxFeePerGasChange?: (maxFeePerGas: string) => void;
  onMaxPriorityFeePerGasChange?: (maxPriorityFeePerGas: string) => void;
  // ✅ Factory deployment props
  factoryAddress?: string;
  factoryConfigured?: boolean;
  useFactoryDeployment?: boolean;
  // ✅ Module and role props
  moduleAddresses?: Record<string, string>;
  roleAddresses?: Record<string, string>;
  // ✅ Blockchain state synchronization
  initialBlockchain?: string;
  onBlockchainChange?: (blockchain: string) => void;
}
const TokenDeploymentFormProjectWalletIntegrated: React.FC<TokenDeploymentFormProjectWalletIntegratedProps> = ({
  tokenId, // ✅ ADD: Extract tokenId prop
  tokenConfig,
  projectId,
  projectName = 'Chain Capital Project',
  onDeploymentSuccess,
  gasPrice: parentGasPrice,
  gasLimit: parentGasLimit,
  onGasPriceChange,
  onGasLimitChange,
  maxFeePerGas: parentMaxFeePerGas,
  maxPriorityFeePerGas: parentMaxPriorityFeePerGas,
  onMaxFeePerGasChange,
  onMaxPriorityFeePerGasChange,
  // ✅ ADD: Factory deployment props
  factoryAddress,
  factoryConfigured,
  useFactoryDeployment = false,
  // ✅ ADD: Module and role props
  moduleAddresses,
  roleAddresses,
  // ✅ ADD: Blockchain state synchronization
  initialBlockchain = 'polygon',
  onBlockchainChange
}) => {
  const { toast } = useToast();
  
  // Form state - Initialize blockchain from parent or default to 'polygon'
  const [blockchain, setBlockchain] = useState<string>(initialBlockchain || 'polygon');
  const [environment, setEnvironment] = useState<NetworkEnvironment>(NetworkEnvironment.TESTNET);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [networkDetails, setNetworkDetails] = useState<any>(null);
  const [isProviderAvailable, setIsProviderAvailable] = useState<boolean>(true);
  
  // Optimization options
  const [useOptimization, setUseOptimization] = useState<boolean>(true);
  const [deploymentStrategy, setDeploymentStrategy] = useState<'auto' | 'direct' | 'chunked' | 'batched'>('auto');
  
  // Wallet integration state
  const [walletIntegrationMode, setWalletIntegrationMode] = useState<'auto' | 'manual'>('auto');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletPrivateKey, setWalletPrivateKey] = useState<string>('');
  const [walletResult, setWalletResult] = useState<TokenWalletIntegrationResult | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState<boolean>(false);
  const [selectedWallet, setSelectedWallet] = useState<ProjectWallet | undefined>();
  
  // ✅ ADD: Auth state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true); // ✅ FIX #1: Add auth loading state
  
  // Gas configuration state
  const [gasConfigMode, setGasConfigMode] = useState<'estimator' | 'manual'>('estimator');
  const [gasPrice, setGasPrice] = useState<string>(parentGasPrice || '20'); // Default 20 Gwei or use parent value
  const [gasLimit, setGasLimit] = useState<number>(parentGasLimit || 3000000); // Default 3M gas or use parent value
  const [showGasConfig, setShowGasConfig] = useState<boolean>(false);
  const [estimatedGasData, setEstimatedGasData] = useState<EIP1559FeeData | null>(null);
  
  // EIP-1559 specific state
  const [maxFeePerGas, setMaxFeePerGas] = useState<string>(parentMaxFeePerGas || '');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState<string>(parentMaxPriorityFeePerGas || '');
  const [isEIP1559Network, setIsEIP1559Network] = useState<boolean>(false);
  
  // ✅ ADD: Module selection state
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, any>>({});
  
  // ✅ ADD: Extension module configs state (using typed interface)
  const [extensionModuleConfigs, setExtensionModuleConfigs] = useState<ExtensionModuleConfigs>(
    getDefaultModuleConfigs()
  );
  
  // Handler for updating individual module configs
  const handleModuleConfigChange = <K extends keyof ExtensionModuleConfigs>(
    moduleKey: K,
    config: ExtensionModuleConfigs[K]
  ) => {
    setExtensionModuleConfigs(prev => ({
      ...prev,
      [moduleKey]: config
    }));
  };
  
  // ✅ FIX #1: Fetch current user on component mount with loading state
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setAuthLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching current user:', error);
          setError('Unable to authenticate user. Please log in again.');
          return;
        }
        if (user) {
          setCurrentUserId(user.id);
        } else {
          setError('No authenticated user found. Please log in.');
        }
      } catch (err) {
        console.error('Error in fetchCurrentUser:', err);
        setError('Authentication error occurred.');
      } finally {
        setAuthLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, []); // Run once on mount
  
  // ✅ NEW: Load existing extension module configurations from database
  useEffect(() => {
    const loadModuleConfigurations = async () => {
      if (!tokenId) {
        console.warn('[MODULE CONFIG] No tokenId provided, skipping module config load');
        return;
      }
      
      try {
        console.log('[MODULE CONFIG] Loading module configurations for token:', tokenId);
        
        // First, get the token to determine its standard
        const { data: token, error: tokenError } = await supabase
          .from('tokens')
          .select('standard')
          .eq('id', tokenId)
          .single();
        
        if (tokenError) {
          console.error('[MODULE CONFIG] Error fetching token:', tokenError);
          return;
        }
        
        if (!token) {
          console.warn('[MODULE CONFIG] Token not found:', tokenId);
          return;
        }
        
        const standard = token.standard;
        console.log('[MODULE CONFIG] Token standard:', standard);
        
        // Determine the properties table based on standard
        // Convert 'ERC-20' to 'erc20', 'ERC-721' to 'erc721', etc.
        const standardCode = standard.toLowerCase().replace('-', '');
        const propertiesTable = `token_${standardCode}_properties`;
        console.log('[MODULE CONFIG] Loading from table:', propertiesTable);
        
        // Load properties based on standard
        const { data: properties, error: propsError } = await supabase
          .from(propertiesTable)
          .select('*')
          .eq('token_id', tokenId)
          .single();
        
        if (propsError) {
          console.error(`[MODULE CONFIG] Error fetching ${propertiesTable}:`, propsError);
          return;
        }
        
        if (!properties) {
          console.log('[MODULE CONFIG] No properties found, using defaults');
          return;
        }
        
        console.log('[MODULE CONFIG] Loaded properties:', properties);
        
        // ✅ Map database fields to ExtensionModuleConfigs interface
        const loadedConfigs: ExtensionModuleConfigs = {
          // Universal modules
          compliance: properties.compliance_config 
            ? { ...properties.compliance_config, enabled: !!properties.compliance_config.enabled } 
            : getDefaultModuleConfigs().compliance,
          
          vesting: properties.vesting_config 
            ? { ...properties.vesting_config, enabled: properties.vesting_enabled || !!properties.vesting_config.enabled } 
            : getDefaultModuleConfigs().vesting,
          
          document: properties.document_config 
            ? { ...properties.document_config, enabled: !!properties.document_config.enabled } 
            : getDefaultModuleConfigs().document,
          
          policyEngine: properties.policy_engine_config 
            ? { ...properties.policy_engine_config, enabled: !!properties.policy_engine_config.enabled } 
            : getDefaultModuleConfigs().policyEngine,
          
          // ERC20 modules (only for ERC20 tokens)
          fees: properties.fees_config 
            ? { ...properties.fees_config, enabled: !!properties.fees_config.enabled } 
            : properties.fee_on_transfer 
            ? { ...properties.fee_on_transfer, enabled: !!properties.fee_on_transfer.enabled }
            : getDefaultModuleConfigs().fees,
          
          flashMint: properties.flash_mint_config 
            ? { ...properties.flash_mint_config } 
            : { enabled: !!properties.flash_mint },
          
          permit: properties.permit_config 
            ? { ...properties.permit_config } 
            : { enabled: !!properties.permit },
          
          snapshot: properties.snapshot_config 
            ? { ...properties.snapshot_config } 
            : { enabled: !!properties.snapshot, automaticSnapshots: false, snapshotInterval: 0 },
          
          timelock: properties.timelock_config 
            ? { ...properties.timelock_config } 
            : getDefaultModuleConfigs().timelock,
          
          votes: properties.votes_config 
            ? { ...properties.votes_config } 
            : { enabled: properties.governance_enabled || false },
          
          payableToken: properties.payable_token_config 
            ? { ...properties.payable_token_config } 
            : { enabled: false },
          
          temporaryApproval: properties.temporary_approval_config 
            ? { ...properties.temporary_approval_config } 
            : getDefaultModuleConfigs().temporaryApproval,
        };
        
        console.log('[MODULE CONFIG] Loaded module configurations:', loadedConfigs);
        console.log('[MODULE CONFIG] Enabled modules:', 
          Object.entries(loadedConfigs)
            .filter(([_, config]) => (config as any)?.enabled)
            .map(([key]) => key)
        );
        
        // Update state with loaded configurations
        setExtensionModuleConfigs(loadedConfigs);
        
        toast({
          title: "Module Configurations Loaded",
          description: `Loaded existing configurations for ${Object.values(loadedConfigs).filter((c: any) => c?.enabled).length} enabled modules`,
          variant: "default",
        });
        
      } catch (err) {
        console.error('[MODULE CONFIG] Unexpected error loading module configurations:', err);
      }
    };
    
    loadModuleConfigurations();
  }, [tokenId]); // Load when tokenId changes
  
  // Get network details when blockchain or environment changes
  useEffect(() => {
    try {
      const chainId = BlockchainFactory.getChainId(blockchain as SupportedChain, environment as NetworkType);
      const explorerUrl = BlockchainFactory.getExplorerUrl(blockchain as SupportedChain, environment as NetworkType);
      const networkConfig = {
        name: `${blockchain} ${environment}`,
        chainId,
        explorerUrl
      };
      setNetworkDetails(networkConfig);
    } catch (err) {
      console.error("Error getting network details:", err);
      setNetworkDetails(null);
    }
  }, [blockchain, environment]);
  
  // Check if provider is available for the selected blockchain
  useEffect(() => {
    try {
      const provider = providerManager.getProviderForEnvironment(blockchain as SupportedChain, environment);
      setIsProviderAvailable(!!provider);
    } catch (err) {
      console.error(`Error checking provider for ${blockchain}:`, err);
      setIsProviderAvailable(false);
    }
  }, [blockchain, environment]);
  
  // ✅ FIX: Auto-load wallet ONLY if no wallet selected from DeploymentDashboard
  useEffect(() => {
    console.log('🔄 [AUTO-LOAD CHECK] walletIntegrationMode:', walletIntegrationMode);
    console.log('🔄 [AUTO-LOAD CHECK] selectedWallet:', selectedWallet);
    
    if (walletIntegrationMode === 'auto' && !selectedWallet) {
      console.log('⚡ [AUTO-LOAD] Loading wallet for network (no selectedWallet)');
      loadWalletForNetwork();
    } else if (selectedWallet) {
      console.log('✅ [AUTO-LOAD] Skipping auto-load, using selectedWallet from DeploymentDashboard');
    }
  }, [blockchain, walletIntegrationMode, selectedWallet]);
  
  // ✅ FIX: Sync selectedWallet from DeploymentDashboard with walletAddress state
  // This takes priority over auto-load
  useEffect(() => {
    console.log('🔄 [WALLET SYNC] Selected wallet changed:', selectedWallet);
    console.log('🔄 [WALLET SYNC] Current walletAddress state:', walletAddress);
    console.log('🔄 [WALLET SYNC] walletIntegrationMode:', walletIntegrationMode);
    
    if (selectedWallet && selectedWallet.wallet_address) {
      console.log('✅ [WALLET SYNC] Setting wallet address from DeploymentDashboard:', selectedWallet.wallet_address);
      console.log('🔄 [WALLET SYNC] Previous wallet address:', walletAddress);
      
      // Force update the wallet address
      setWalletAddress(selectedWallet.wallet_address);
      
      console.log('✅ [WALLET SYNC] Wallet address updated to:', selectedWallet.wallet_address);
      
      // Note: Private keys are not exposed through ProjectWallet interface
      // They are securely stored and accessed through encryption services
      
      // Clear any previous errors
      setError(null);
      setValidationErrors({});
    } else if (selectedWallet === undefined && walletIntegrationMode === 'auto') {
      // If wallet was cleared and we're in auto mode, reload
      console.log('⚠️ [WALLET SYNC] Wallet was cleared, reloading...');
      loadWalletForNetwork();
    } else {
      console.log('⚠️ [WALLET SYNC] No valid wallet to sync. selectedWallet:', selectedWallet);
    }
  }, [selectedWallet]);
  
  /**
   * Load wallet for selected network
   * ⚠️ WARNING: This should NOT be called if selectedWallet exists from DeploymentDashboard
   */
  const loadWalletForNetwork = async () => {
    console.log('⚡ [LOAD-WALLET] loadWalletForNetwork called');
    console.log('⚡ [LOAD-WALLET] Current selectedWallet:', selectedWallet);
    console.log('⚡ [LOAD-WALLET] Current walletAddress:', walletAddress);
    
    setIsLoadingWallet(true);
    setError(null);
    
    try {
      const result = await tokenProjectWalletIntegrationService.getOrCreateWalletForDeployment({
        projectId,
        projectName,
        projectType: 'tokenization',
        network: blockchain,
        forceNew: false,
        includePrivateKey: true,
        includeMnemonic: true
      });
      
      console.log('⚡ [LOAD-WALLET] Service returned:', result.walletAddress);
      setWalletResult(result);
      
      if (result.success) {
        console.log('⚡ [LOAD-WALLET] Setting walletAddress to:', result.walletAddress);
        setWalletAddress(result.walletAddress);
        setWalletPrivateKey(result.privateKey || '');
        
        if (result.isNewWallet) {
          toast({
            title: "New Wallet Created",
            description: `Created new ${blockchain} wallet for deployment`,
            variant: "default",
          });
        } else {
          toast({
            title: "Existing Wallet Found",
            description: `Using existing ${blockchain} wallet for deployment`,
            variant: "default",
          });
        }
      } else {
        setError(result.error || 'Failed to load wallet');
        setWalletAddress('');
        setWalletPrivateKey('');
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to load wallet');
      setWalletAddress('');
      setWalletPrivateKey('');
    } finally {
      setIsLoadingWallet(false);
    }
  };
  
  /**
   * Generate new wallet for network
   */
  const generateNewWallet = async () => {
    setIsLoadingWallet(true);
    setError(null);
    
    try {
      const result = await tokenProjectWalletIntegrationService.getOrCreateWalletForDeployment({
        projectId,
        projectName,
        projectType: 'tokenization',
        network: blockchain,
        forceNew: true, // Force new wallet generation
        includePrivateKey: true,
        includeMnemonic: true
      });
      
      setWalletResult(result);
      
      if (result.success) {
        setWalletAddress(result.walletAddress);
        setWalletPrivateKey(result.privateKey || '');
        
        toast({
          title: "New Wallet Generated",
          description: `Generated fresh ${blockchain} wallet for deployment`,
          variant: "default",
        });
      } else {
        setError(result.error || 'Failed to generate wallet');
      }
    } catch (error) {
      console.error('Error generating wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate wallet');
    } finally {
      setIsLoadingWallet(false);
    }
  };
  
  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text: string, type: 'address' | 'privateKey') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedPrivateKey(true);
        setTimeout(() => setCopiedPrivateKey(false), 2000);
      }
      
      toast({
        title: "Copied to clipboard",
        description: `${type === 'address' ? 'Wallet address' : 'Private key'} copied`,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  /**
   * Handle gas estimation from GasEstimatorEIP1559 component
   */
  const handleGasEstimate = (feeData: EIP1559FeeData) => {
    setEstimatedGasData(feeData);
    
    // Determine if network supports EIP-1559
    const supportsEIP1559 = !!(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas);
    setIsEIP1559Network(supportsEIP1559);
    
    if (supportsEIP1559) {
      // EIP-1559 network - use maxFeePerGas and maxPriorityFeePerGas
      const maxFeeGwei = (Number(feeData.maxFeePerGas) / 1e9).toFixed(2);
      const priorityFeeGwei = (Number(feeData.maxPriorityFeePerGas) / 1e9).toFixed(2);
      
      setMaxFeePerGas(maxFeeGwei);
      setMaxPriorityFeePerGas(priorityFeeGwei);
      
      onMaxFeePerGasChange?.(maxFeeGwei);
      onMaxPriorityFeePerGasChange?.(priorityFeeGwei);
      
      // Also set legacy gasPrice for compatibility
      setGasPrice(maxFeeGwei);
      onGasPriceChange?.(maxFeeGwei);
    } else {
      // Legacy network - use gasPrice
      let newGasPrice = gasPrice;
      if (feeData.gasPrice) {
        const gasPriceGwei = (Number(feeData.gasPrice) / 1e9).toFixed(2);
        newGasPrice = gasPriceGwei;
        setGasPrice(gasPriceGwei);
        onGasPriceChange?.(gasPriceGwei);
      }
    }
    
    // Set default gas limit if not already set
    if (!gasLimit || gasLimit === 3000000) {
      const newGasLimit = 3000000; // Keep default for deployment
      setGasLimit(newGasLimit);
      onGasLimitChange?.(newGasLimit);
    }
  };
  
  /**
   * Get network-specific gas recommendations
   */
  const getGasRecommendation = () => {
    const recommendations: Record<string, { price: string; limit: number; note: string }> = {
      ethereum: { price: '20-50', limit: 3000000, note: 'Mainnet: 20-50 Gwei typical' },
      polygon: { price: '30-100', limit: 3000000, note: 'Polygon: 30-100 Gwei typical' },
      base: { price: '0.001-0.01', limit: 3000000, note: 'Base: 0.001-0.01 Gwei typical' },
      arbitrum: { price: '0.1-1', limit: 3000000, note: 'Arbitrum: 0.1-1 Gwei typical' },
      optimism: { price: '0.001-0.1', limit: 3000000, note: 'Optimism: 0.001-0.1 Gwei typical' },
      avalanche: { price: '25-50', limit: 3000000, note: 'Avalanche: 25-50 Gwei typical' },
      bsc: { price: '3-5', limit: 3000000, note: 'BSC: 3-5 Gwei typical' }
    };
    
    return recommendations[blockchain] || { price: '20', limit: 3000000, note: 'Default: 20 Gwei' };
  };
  
  /**
   * Handle manual gas price change
   */
  const handleGasPriceChange = (value: string) => {
    setGasPrice(value);
    onGasPriceChange?.(value);
  };
  
  /**
   * Handle manual gas limit change
   */
  const handleGasLimitChange = (value: number) => {
    setGasLimit(value);
    onGasLimitChange?.(value);
  };
  
  const handleBlockchainChange = (value: string) => {
    console.log('[TokenDeploymentForm] Blockchain changed to:', value);
    setBlockchain(value);
    setValidationErrors({});
    // Reset wallet state when changing blockchain
    setWalletResult(null);
    setSelectedWallet(undefined); // Reset selected wallet to force reload
    if (walletIntegrationMode === 'manual') {
      setWalletAddress('');
      setWalletPrivateKey('');
    }
    
    // ✅ Notify parent component of blockchain change
    if (onBlockchainChange) {
      onBlockchainChange(value);
    }
  };
  
  const handleEnvironmentChange = (value: string) => {
    setEnvironment(value as NetworkEnvironment);
    setValidationErrors({});
  };
  
  // ✅ REMOVED: validateWalletExists function - wallet is already validated when selected
  
  const validateInputs = (): boolean => {
    const errors: Record<string, string> = {};
    
    // ✅ FIX: Check selectedWallet first, then fall back to walletAddress state
    const currentWalletAddress = selectedWallet?.wallet_address || walletAddress;
    
    console.log('🔍 Validating inputs...');
    console.log('- Selected Wallet:', selectedWallet?.wallet_address);
    console.log('- Wallet Address State:', walletAddress);
    console.log('- Current Wallet Address (for validation):', currentWalletAddress);
    console.log('- Blockchain:', blockchain);
    console.log('- Current User:', currentUserId);
    console.log('- Wallet Integration Mode:', walletIntegrationMode);
    console.log('- Auth Loading:', authLoading);
    console.log('- Is Loading Wallet:', isLoadingWallet);
    
    // Check wallet address
    if (!currentWalletAddress) {
      errors.walletAddress = 'Wallet address is required. Please load or enter a wallet address.';
      console.error('❌ Wallet address is empty');
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(currentWalletAddress)) {
      errors.walletAddress = 'Invalid Ethereum address format';
      console.error('❌ Wallet address format is invalid:', currentWalletAddress);
    } else {
      console.log('✅ Wallet address is valid:', currentWalletAddress);
    }
    
    // Check blockchain selection
    if (!blockchain) {
      errors.blockchain = 'Please select a blockchain network';
      console.error('❌ Blockchain not selected');
    } else {
      console.log('✅ Blockchain selected:', blockchain);
    }
    
    // Check user authentication
    if (!currentUserId) {
      errors.auth = 'User authentication required. Please refresh the page and log in.';
      console.error('❌ No current user ID');
    } else {
      console.log('✅ User authenticated:', currentUserId);
    }
    
    // Check if wallet is still loading
    if (isLoadingWallet) {
      errors.walletLoading = 'Wallet is still loading. Please wait...';
      console.error('❌ Wallet is still loading');
    }
    
    // Check if auth is still loading
    if (authLoading) {
      errors.authLoading = 'Authentication is still loading. Please wait...';
      console.error('❌ Auth is still loading');
    }
    
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    if (isValid) {
      console.log('✅ All validations passed');
    } else {
      console.error('❌ Validation failed with errors:', errors);
    }
    
    return isValid;
  };
  
  const handleDeploymentConfirmation = () => {
    console.log('🚀 Deploy button clicked - validating inputs...');
    console.log('📊 [STATE CHECK] selectedWallet:', selectedWallet);
    console.log('📊 [STATE CHECK] walletAddress state:', walletAddress);
    console.log('Blockchain:', blockchain);
    console.log('Current User ID:', currentUserId);
    console.log('Auth Loading:', authLoading);
    
    if (validateInputs()) {
      console.log('✅ Validation passed - showing confirmation dialog');
      setShowConfirmation(true);
    } else {
      console.error('❌ Validation failed');
      console.log('Validation Errors:', validationErrors);
      
      // Show visible error message
      const errorMessages = Object.values(validationErrors).filter(Boolean);
      if (errorMessages.length > 0) {
        setError(`Validation failed: ${errorMessages.join(', ')}`);
      } else {
        setError('Please complete all required fields before deploying.');
      }
      
      toast({
        title: "Validation Failed",
        description: errorMessages.length > 0 
          ? errorMessages.join(', ') 
          : 'Please complete all required fields.',
        variant: "destructive",
      });
    }
  };
  
  const handleDeploy = async () => {
    console.log('🚀 handleDeploy called!');
    console.log('Current state:', {
      tokenId,
      blockchain,
      environment,
      walletAddress,
      currentUserId,
      useOptimization,
      factoryConfigured,
      factoryAddress,
      useFactoryDeployment
    });
    
    // Validate inputs
    if (!validateInputs()) {
      console.error('❌ Validation failed in handleDeploy');
      setShowConfirmation(false); // Close dialog so user can see errors
      return;
    }
    console.log('✅ Inputs validated');
    
    // Validate user authentication
    if (!currentUserId) {
      console.error('❌ No current user ID');
      setError('User authentication required. Please log in and try again.');
      setShowConfirmation(false);
      toast({
        title: "Authentication Required",
        description: "Please log in and try again.",
        variant: "destructive",
      });
      return;
    }
    console.log('✅ User authenticated:', currentUserId);
    
    // ✅ FIX: Determine the correct wallet address to use
    // Priority: selectedWallet (from UI) > walletAddress state (from auto-load)
    const deploymentWalletAddress = selectedWallet?.wallet_address || walletAddress;
    
    if (!deploymentWalletAddress) {
      console.error('❌ No wallet address available for deployment');
      setError('No wallet selected. Please select a wallet and try again.');
      setShowConfirmation(false);
      return;
    }
    
    console.log('✅ Using deployment wallet address:', deploymentWalletAddress);
    console.log('📊 Source: selectedWallet =', selectedWallet?.wallet_address, ', walletAddress state =', walletAddress);
    
    setShowConfirmation(false);
    
    try {
      setIsDeploying(true);
      setError(null);
      
      // Show deployment started toast
      toast({
        title: "Deployment Started",
        description: `Deploying ${tokenConfig.name} token to ${blockchain} ${environment}`,
        variant: "default",
      });
      
      console.log(`[DEPLOY] Starting deployment to ${blockchain} (${environment}) with optimization: ${useOptimization}`);
      console.log(`[DEPLOY] Using wallet: ${deploymentWalletAddress}`);
      console.log(`[DEPLOY] Token ID: ${tokenId}, User ID: ${currentUserId}`);
      
      // ✅ FIX #9: Extract enabled module configs BEFORE database update
      const enabledModules = extractEnabledModuleConfigs(extensionModuleConfigs);
      console.log('📦 Enabled Extension Module Configs for deployment:', enabledModules);
      
      // ✅ FIX #3: Update token record with form values BEFORE deployment
      // ✅ FIX #4: Include deployed_by to ensure user tracking
      // ✅ FIX #9: Merge module configs into blocks for InstanceConfigurationService
      const { data: currentToken, error: fetchError } = await supabase
        .from('tokens')
        .select('blocks')
        .eq('id', tokenId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current token blocks:', fetchError);
      }
      
      // Merge module configs directly into blocks (flat format matches extractModuleSelection fallback)
      const updatedBlocks = {
        ...(currentToken?.blocks || {}),
        ...enabledModules // ✅ FIX #9: Merge flat module configs directly into blocks
      };
      
      const { error: updateError } = await supabase
        .from('tokens')
        .update({
          blockchain: blockchain,
          deployment_environment: environment,
          deployed_by: currentUserId, // ✅ FIX #4: Capture deploying user
          blocks: updatedBlocks // ✅ FIX #9: Save module configs for InstanceConfigurationService
        })
        .eq('id', tokenId);
      
      if (updateError) {
        console.error('Error updating token blockchain:', updateError);
        throw new Error(`Failed to update token configuration: ${updateError.message}`);
      }
      
      console.log(`✅ FIX #3, #4 & #9: Updated token ${tokenId} with blockchain: ${blockchain}, environment: ${environment}, deployed_by: ${currentUserId}, modules:`, Object.keys(enabledModules).filter(k => k.includes('enabled')));
      
      // ✅ NEW: Check if factory deployment is available and configured
      if (factoryConfigured && factoryAddress && useFactoryDeployment) {
        console.log('🏭 Using factory-based deployment (template cloning)');
        console.log(`Factory Address: ${factoryAddress}`);
        console.log(`Selected Modules:`, selectedModules);
        console.log(`Role Addresses:`, roleAddresses);
        
        // ✅ Extract enabled module configs for backend
        const enabledModules = extractEnabledModuleConfigs(extensionModuleConfigs);
        console.log('📦 Enabled Extension Module Configs:', enabledModules);
        
        // ✅ NEW: Deploy via FactoryDeploymentService
        const factoryResult = await FactoryDeploymentService.deployToken({
          tokenId,
          userId: currentUserId,
          projectId,
          blockchain,
          environment: environment as 'mainnet' | 'testnet',
          standard: tokenConfig.standard || 'ERC20',
          name: tokenConfig.name,
          symbol: tokenConfig.symbol,
          decimals: tokenConfig.decimals,
          totalSupply: tokenConfig.totalSupply,
          selectedModules: selectedModules,
          moduleConfigs: { ...moduleConfigs, ...enabledModules }, // ✅ Merge extension module configs
          roleAddresses: roleAddresses || {},
          gasConfig: {
            gasPrice,
            gasLimit,
            maxFeePerGas: maxFeePerGas || undefined,
            maxPriorityFeePerGas: maxPriorityFeePerGas || undefined
          }
        });
        
        if (factoryResult.success && factoryResult.masterAddress) {
          console.log('✅ Factory deployment successful:', factoryResult);
          
          toast({
            title: "Token Deployed via Factory!",
            description: `Token cloned from template and deployed at ${factoryResult.masterAddress.substring(0, 10)}...`,
            variant: "default",
          });
          
          // Use the last transaction hash from the deployment
          const txHash = factoryResult.transactionHashes[factoryResult.transactionHashes.length - 1] || '';
          onDeploymentSuccess(factoryResult.masterAddress, txHash);
        } else {
          throw new Error(factoryResult.error || 'Factory deployment failed');
        }
      } else if (useOptimization) {
        console.log('⚡ Using optimized deployment service (not factory)');
        
        // ✅ Extract enabled module configs for backend
        const enabledModules = extractEnabledModuleConfigs(extensionModuleConfigs);
        console.log('📦 Enabled Extension Module Configs:', enabledModules);
        
        // ✅ Use unified deployment service with optimization
        // ✅ FIX #5: Pass gas configuration from form
        // ✅ FIX #6: Pass selected wallet address to bypass database query
        // ✅ FIX #7: Use deploymentWalletAddress to ensure correct wallet is used
        // ✅ FIX #8: Pass extension module configs
        const result = await unifiedTokenDeploymentService.deployToken(
          tokenId,
          currentUserId,
          projectId,
          {
            useOptimization: true,
            forceStrategy: deploymentStrategy,
            enableAnalytics: true,
            walletAddress: deploymentWalletAddress, // ✅ FIX #7: Use deploymentWalletAddress instead of walletAddress state
            gasConfig: {
              gasPrice: gasPrice,
              gasLimit: gasLimit,
              maxFeePerGas: maxFeePerGas || undefined,
              maxPriorityFeePerGas: maxPriorityFeePerGas || undefined
            },
            moduleConfigs: enabledModules // ✅ FIX #8: Pass extension module configs
          }
        );
        
        console.log(`✅ FIX #5: Passed gas configuration - Price: ${gasPrice} Gwei, Limit: ${gasLimit}, MaxFee: ${maxFeePerGas || 'auto'}, PriorityFee: ${maxPriorityFeePerGas || 'auto'}`);
        console.log(`✅ FIX #7: Passed deployment wallet address - ${deploymentWalletAddress}`);
        
        if (result.status === 'SUCCESS') {
          console.log(`Optimized deployment successful:`, result);
          onDeploymentSuccess(result.tokenAddress || '', result.transactionHash || '');
        } else {
          throw new Error(result.error || 'Optimized deployment failed');
        }
      } else {
        console.log('🔧 Using standard deployment service (not factory, not optimized)');
        
        // ✅ Use enhanced deployment service without optimization
        // Note: enhancedTokenDeploymentService doesn't support gas config yet
        // This is acceptable as it uses default gas estimation
        const result = await enhancedTokenDeploymentService.deployToken(
          tokenId,
          currentUserId,
          projectId
        );
        
        console.log(`Standard deployment using default gas estimation (gas config not supported in legacy service)`);
        
        if (result.status === 'SUCCESS') {
          console.log(`Standard deployment successful:`, result);
          onDeploymentSuccess(result.tokenAddress || '', result.transactionHash || '');
        } else {
          throw new Error(result.error || 'Standard deployment failed');
        }
      }
      
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error(`❌ Error deploying token:`, err);
      console.error(`Blockchain: ${blockchain}, Environment: ${environment}`);
      
      // Enhanced error message for insufficient funds
      if (errorMessage.toLowerCase().includes('insufficient funds')) {
        const networkName = environment === 'testnet' ? `${blockchain} testnet` : `${blockchain} mainnet`;
        const helpfulMessage = `${errorMessage}

💡 To resolve this issue:
1. Fund your project wallet with ${blockchain === 'ethereum' ? 'ETH' : blockchain.toUpperCase()} on ${networkName}
2. For testnet, you can get free test tokens from a faucet
3. Check your wallet balance before deploying

Need help? Visit our documentation or contact support.`;
        setError(helpfulMessage);
        
        toast({
          title: "Insufficient Funds",
          description: `Your wallet needs more ${blockchain === 'ethereum' ? 'ETH' : blockchain.toUpperCase()} for deployment.`,
          variant: "destructive",
        });
      } else {
        setError(errorMessage);
        
        toast({
          title: "Deployment Failed",
          description: errorMessage.substring(0, 100) + (errorMessage.length > 100 ? '...' : ''),
          variant: "destructive",
        });
      }
    } finally {
      setIsDeploying(false);
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Validation Errors Display */}
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
        
        {!isProviderAvailable && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Provider Not Available</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              No provider is available for the selected blockchain ({blockchain}). 
              The deployment service will attempt to use a fallback provider.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Network Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Network Configuration
            </CardTitle>
            <CardDescription>
              Select the blockchain network and environment for deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="environment">Network Environment</Label>
                <Select 
                  value={environment} 
                  onValueChange={handleEnvironmentChange}
                  disabled={isDeploying}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NetworkEnvironment.TESTNET}>Testnet</SelectItem>
                    <SelectItem value={NetworkEnvironment.MAINNET}>Mainnet</SelectItem>
                  </SelectContent>
                </Select>
                
                {environment === NetworkEnvironment.MAINNET && (
                  <Alert variant="destructive" className="mt-2">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      You are deploying to MAINNET. This will incur real costs.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="blockchain">Blockchain Network</Label>
                <BlockchainSelector
                  value={blockchain}
                  onChange={handleBlockchainChange}
                  disabled={isDeploying}
                />
                
                {networkDetails && (
                  <div className="mt-2 text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {networkDetails.name}
                    </Badge>
                    {networkDetails.chainId && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center text-muted-foreground">
                              <Info className="h-3 w-3 mr-1" />
                              Chain ID: {networkDetails.chainId}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Network Chain ID</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Deployment Dashboard - Wallet Selection, Balance, Gas Estimation, Faucets */}
        {/* ✅ FIX: Remove key prop to prevent unnecessary remounting and wallet selection reset */}
        <DeploymentDashboard
          projectId={projectId}
          blockchain={blockchain}
          environment={environment}
          tokenType={tokenConfig.standard || 'ERC20'}
          onWalletSelected={setSelectedWallet}
          selectedWallet={selectedWallet}
        />
        
        {/* Gas Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Gas Configuration
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGasConfig(!showGasConfig)}
              >
                {showGasConfig ? (
                  <>Hide Details</>
                ) : (
                  <>Show Details</>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Configure gas price and limit for the deployment transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gas Configuration Mode Selector */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-base">Automatic Gas Estimation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically estimate optimal gas fees based on network conditions
                </p>
              </div>
              <Switch
                checked={gasConfigMode === 'estimator'}
                onCheckedChange={(checked) => {
                  setGasConfigMode(checked ? 'estimator' : 'manual');
                }}
                disabled={isDeploying}
              />
            </div>
            
            {gasConfigMode === 'estimator' ? (
              // Automatic Gas Estimation with GasEstimatorEIP1559 component
              <div className="space-y-4">
                <GasEstimatorEIP1559
                  blockchain={blockchain}
                  onSelectFeeData={handleGasEstimate}
                  defaultPriority={FeePriority.MEDIUM}
                  showAdvanced={true}
                />
                
                {estimatedGasData && showGasConfig && (
                  <div className="pt-4 space-y-2">
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {isEIP1559Network ? (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Max Fee Per Gas</Label>
                            <div className="text-sm font-medium">{maxFeePerGas} Gwei</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Max Priority Fee</Label>
                            <div className="text-sm font-medium">{maxPriorityFeePerGas} Gwei</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Estimated Gas Price</Label>
                            <div className="text-sm font-medium">{gasPrice} Gwei</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Gas Limit</Label>
                            <div className="text-sm font-medium">{gasLimit.toLocaleString()}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Manual Gas Configuration
              <div className="space-y-4">
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-800 dark:text-amber-300">Manual Configuration</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    {getGasRecommendation().note}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="gasPrice">Gas Price (Gwei)</Label>
                  <Input
                    id="gasPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={gasPrice}
                    onChange={(e) => handleGasPriceChange(e.target.value)}
                    disabled={isDeploying}
                    placeholder="20"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: {getGasRecommendation().price} Gwei for {blockchain}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gasLimit">Gas Limit</Label>
                  <Input
                    id="gasLimit"
                    type="number"
                    step="100000"
                    min="21000"
                    value={gasLimit}
                    onChange={(e) => handleGasLimitChange(parseInt(e.target.value) || 3000000)}
                    disabled={isDeploying}
                    placeholder="3000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: {getGasRecommendation().limit.toLocaleString()} for token deployment
                  </p>
                </div>
                
                {showGasConfig && (
                  <div className="pt-2">
                    <Separator className="mb-4" />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estimated Cost:</span>
                        <span className="font-medium">
                          {((parseFloat(gasPrice) * gasLimit) / 1e9).toFixed(6)} {blockchain.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        * Actual cost may vary based on network conditions and transaction execution
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Optimization Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Deployment Optimization
            </CardTitle>
            <CardDescription>
              Configure deployment optimization and gas saving strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-base">Enable Optimization</Label>
                <p className="text-sm text-muted-foreground">
                  Use advanced optimization for gas savings and reliability
                </p>
              </div>
              <Switch
                checked={useOptimization}
                onCheckedChange={setUseOptimization}
                disabled={isDeploying}
              />
            </div>
            
            {useOptimization && (
              <div className="space-y-2">
                <Label htmlFor="strategy">Deployment Strategy</Label>
                <Select 
                  value={deploymentStrategy} 
                  onValueChange={(value: any) => setDeploymentStrategy(value)}
                  disabled={isDeploying}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                    <SelectItem value="direct">Direct Deployment</SelectItem>
                    <SelectItem value="batched">Batched Deployment</SelectItem>
                    <SelectItem value="chunked">Chunked Deployment</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto-detect analyzes your token configuration and chooses the optimal strategy
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Token Configuration Summary */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Token Configuration Summary</AlertTitle>
          <AlertDescription>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>Name:</div>
              <div className="font-medium">{tokenConfig.name}</div>
              
              <div>Symbol:</div>
              <div className="font-medium">{tokenConfig.symbol}</div>
              
              <div>Standard:</div>
              <div className="font-medium">{tokenConfig.standard || 'ERC-20'}</div>
              
              <div>Decimals:</div>
              <div className="font-medium">{tokenConfig.decimals}</div>
              
              <div>Total Supply:</div>
              <div className="font-medium">{tokenConfig.totalSupply}</div>
              
              {tokenConfig.features && (
                <>
                  <div>Features:</div>
                  <div className="font-medium flex flex-wrap gap-1">
                    {tokenConfig.features.isBurnable && <Badge variant="secondary">Burnable</Badge>}
                    {tokenConfig.features.isMintable && <Badge variant="secondary">Mintable</Badge>}
                    {tokenConfig.features.isPausable && <Badge variant="secondary">Pausable</Badge>}
                    {tokenConfig.features.isUpgradeable && <Badge variant="secondary">Upgradeable</Badge>}
                  </div>
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        {/* ✅ NEW: Extension Modules Section */}
        <ExtensionModulesSection
          tokenStandard={tokenConfig.standard || 'ERC-20'}
          configs={extensionModuleConfigs}
          onConfigChange={handleModuleConfigChange}
          disabled={isDeploying}
        />
        
        {/* ✅ NEW: Dynamic Configuration Summary */}
        <DynamicConfigurationSummary
          tokenConfig={tokenConfig}
          moduleConfigs={extensionModuleConfigs}
        />
        
        {/* Deploy Button - removed debug status box per user request */}
        
        <Button 
          onClick={() => {
            console.log('Deploy button clicked');
            console.log('Button state:', {
              isDeploying,
              blockchain,
              walletAddress,
              isLoadingWallet,
              authLoading,
              currentUserId,
              disabled: isDeploying || !blockchain || !walletAddress || isLoadingWallet || authLoading || !currentUserId
            });
            handleDeploymentConfirmation();
          }} 
          disabled={isDeploying || !blockchain || !walletAddress || isLoadingWallet || authLoading || !currentUserId}
          className="w-full"
          size="lg"
        >
          {authLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : isDeploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {useOptimization ? 'Optimizing and Deploying Token...' : 'Deploying Token...'}
            </>
          ) : (
            <>
              {useOptimization ? (
                <Zap className="mr-2 h-4 w-4" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {useOptimization ? 'Deploy with Optimization' : 'Deploy Token'}
            </>
          )}
        </Button>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Token Deployment</DialogTitle>
            <DialogDescription>
              You are about to deploy a token to {networkDetails?.name || blockchain}. This action cannot be undone.
              {environment === NetworkEnvironment.MAINNET && (
                <p className="text-red-500 mt-2">
                  Warning: You are deploying to MAINNET. This will incur real costs.
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
            <div>{networkDetails?.name || blockchain}</div>
            
            <div className="font-medium">Wallet:</div>
            <div className="font-mono text-xs">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</div>
            
            <div className="font-medium">Wallet Mode:</div>
            <div className="flex items-center">
              {walletIntegrationMode === 'auto' ? (
                <>
                  <Wallet className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">Auto ({walletResult?.isNewWallet ? 'New' : 'Existing'})</span>
                </>
              ) : (
                <span className="text-gray-600">Manual</span>
              )}
            </div>
            
            <div className="font-medium">Optimization:</div>
            <div className="flex items-center">
              {useOptimization ? (
                <>
                  <Zap className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">Enabled ({deploymentStrategy})</span>
                </>
              ) : (
                <span className="text-gray-600">Disabled</span>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                console.log('🔥 Optimize & Deploy button clicked in confirmation dialog!');
                handleDeploy();
              }}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  {useOptimization ? 'Optimize & Deploy' : 'Deploy'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TokenDeploymentFormProjectWalletIntegrated;
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/services/wallet/UnifiedWalletContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  QrCode, 
  ArrowUpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Building2,
  User as UserIcon,
  Shield,
  Wallet,
  Clock,
  TrendingUp,
  Settings2,
  Info,
  Zap,
  BatteryMedium,
  BatteryLow,
  Rocket
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import services
import { 
  internalWalletService, 
  type ProjectWallet,
  type UserWallet,
  type MultiSigWallet,
  type AllWallets
} from "@/services/wallet/InternalWalletService";
import { 
  transferService, 
  type TransferParams, 
  type GasEstimate 
} from "@/services/wallet/TransferService";
import { useUser } from "@/hooks/auth/user/useUser";
import { getPrimaryOrFirstProject } from "@/services/project/primaryProjectService";
import { addressSelectionTracker } from "@/services/wallet/AddressSelectionTracker";

// Import modern gas estimation infrastructure
import GasEstimatorEIP1559, { type EIP1559FeeData } from "@/components/tokens/components/transactions/GasEstimatorEIP1559";
import { FeePriority, NetworkCongestion } from "@/services/blockchain/RealTimeFeeEstimator";
import { type GasEstimationResult } from "@/services/blockchain/EnhancedGasEstimationService";
import { ethers } from "ethers";
import { rpcManager } from "@/infrastructure/web3/rpc/RPCConnectionManager";
import { 
  getChainName, 
  getChainId, 
  isEIP1559Supported as checkEIP1559Support,
  getChainInfo
} from "@/infrastructure/web3/utils/chainIds";
import { 
  getEligibleAssets, 
  getAllAssets, 
  type AssetInfo 
} from "@/infrastructure/web3/utils/eligibleAssets";

// Import components
import { TransferConfirmation } from "@/components/wallet/components/transfer/TransferConfirmation";
import { QrCodeScanner } from "@/components/wallet/components/transfer/QrCodeScanner";
import { RecentAddresses } from "@/components/wallet/components/transfer/RecentAddresses";
import { TransactionConfirmation } from "@/components/wallet/components/TransactionConfirmation";
import { ErrorDisplay } from "@/components/wallet/components/ErrorDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Wallet type for unified handling
type WalletOption = {
  id: string;
  address: string;
  name: string;
  type: 'project' | 'user' | 'multisig';
  balance?: string;
  blockchain?: string;
  network?: string;
  chainId?: number;
};

// Schema for the transfer form - NO priority field (GasEstimatorEIP1559 handles that internally)
const transferSchema = z.object({
  fromWallet: z.string().min(1, "Please select a wallet"),
  toAddress: z.string().min(42, "Invalid wallet address").max(44, "Invalid wallet address"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  asset: z.string().min(1, "Please select an asset"),
});

type TransferFormValues = z.infer<typeof transferSchema>;

// Transfer states
type TransferState = "input" | "confirmation" | "processing" | "success" | "error";

// Helper function to convert FeePriority to gasOption format expected by TransferConfirmation
const convertPriorityToGasOption = (priority: FeePriority): "slow" | "standard" | "fast" => {
  switch (priority) {
    case FeePriority.LOW:
      return "slow";
    case FeePriority.MEDIUM:
      return "standard";
    case FeePriority.HIGH:
    case FeePriority.URGENT:
      return "fast";
    default:
      return "standard";
  }
};

export const TransferTab: React.FC = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const { wallets: contextWallets, selectedWallet } = useWallet();
  
  // State
  const [transferState, setTransferState] = useState<TransferState>("input");
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStartTime, setTransactionStartTime] = useState<Date | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  
  // Wallet data
  const [allWallets, setAllWallets] = useState<AllWallets>({
    projectWallets: [],
    userWallets: [],
    multiSigWallets: []
  });
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Gas estimation - using modern infrastructure (EXACT match with TokenDeploymentForm)
  const [gasConfigMode, setGasConfigMode] = useState<'estimator' | 'manual'>('estimator');
  const [gasPrice, setGasPrice] = useState<string>('20'); // Default 20 Gwei
  const [gasLimit, setGasLimit] = useState<number>(21000); // Default 21k gas for transfers (NOT 3M like deployment!)
  const [showGasConfig, setShowGasConfig] = useState<boolean>(true); // SHOW EXPANDED BY DEFAULT for better visibility
  const [estimatedGasData, setEstimatedGasData] = useState<EIP1559FeeData | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<FeePriority>(FeePriority.MEDIUM); // Track priority from GasEstimatorEIP1559
  
  // EIP-1559 specific state
  const [maxFeePerGas, setMaxFeePerGas] = useState<string>('');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState<string>('');
  const [isEIP1559Network, setIsEIP1559Network] = useState<boolean>(false);
  
  // Legacy compatibility
  const [selectedFeeData, setSelectedFeeData] = useState<EIP1559FeeData | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [gasEstimationResult, setGasEstimationResult] = useState<GasEstimationResult | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('sepolia');
  
  // Available assets for the selected chain
  const [availableAssets, setAvailableAssets] = useState<AssetInfo[]>([]);
  
  // To address mode: 'custom' for manual input, 'wallet' for wallet selection
  const [toAddressMode, setToAddressMode] = useState<'custom' | 'wallet'>('custom');
  
  // Form
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWallet: "",
      toAddress: "",
      amount: "",
      asset: "ETH",
    },
  });

  // Watch form values for real-time gas estimation
  const watchedAmount = form.watch("amount");
  const watchedAsset = form.watch("asset");
  const watchedToAddress = form.watch("toAddress");
  const watchedFromWallet = form.watch("fromWallet");

  // Load wallets and project on mount
  useEffect(() => {
    initializeData();
  }, []);
  
  /**
   * Check if a chain supports EIP-1559
   * Uses centralized chain metadata from chainIds.ts
   */
  const isChainEIP1559Compatible = (chainId: number): boolean => {
    // Use centralized EIP-1559 detection from chain metadata
    return checkEIP1559Support(chainId);
  };
  
  /**
   * Update EIP-1559 detection when blockchain/wallet changes
   */
  useEffect(() => {
    const wallet = walletOptions.find(w => w.id === form.watch("fromWallet"));
    if (wallet && wallet.chainId) {
      const isEIP1559 = isChainEIP1559Compatible(wallet.chainId);
      setIsEIP1559Network(isEIP1559);
      
      console.log(`🔗 Network ${wallet.blockchain} (${wallet.chainId}): EIP-1559 ${isEIP1559 ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
      
      // Set default values for EIP-1559 networks
      if (isEIP1559 && !maxFeePerGas && !maxPriorityFeePerGas) {
        setMaxFeePerGas('20');
        setMaxPriorityFeePerGas('1.5');
      }
    }
  }, [form.watch("fromWallet"), walletOptions]);

  // Real-time gas estimation when form values change
  useEffect(() => {
    if (transferState !== "input") return;
    
    const estimateGas = async () => {
      try {
        // Validate all required fields are filled
        if (!watchedFromWallet || !watchedToAddress || !watchedAmount || !watchedAsset) {
          setGasEstimationResult(null);
          return;
        }

        // Validate amount is a valid number
        const amount = parseFloat(watchedAmount);
        if (isNaN(amount) || amount <= 0) {
          setGasEstimationResult(null);
          return;
        }

        // Get wallet to determine blockchain
        const wallet = walletOptions.find(w => w.id === watchedFromWallet);
        if (!wallet || !wallet.blockchain) {
          setGasEstimationResult(null);
          return;
        }

        setIsEstimating(true);

        // Get provider for the blockchain
        const rpcConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'testnet');
        if (!rpcConfig) {
          console.error('RPC configuration not found for blockchain:', wallet.blockchain);
          setIsEstimating(false);
          return;
        }

        const provider = new ethers.JsonRpcProvider(rpcConfig.url);

        // Get asset info to determine if it's a token transfer
        const asset = availableAssets.find(a => a.symbol === watchedAsset);
        const isNativeTransfer = asset?.type === 'native' || watchedAsset === 'ETH';

        // Estimate gas for the transaction
        let estimatedGas: bigint;
        let transactionData: string = '0x';

        if (!isNativeTransfer && asset?.contractAddress) {
          // Token transfer - encode ERC20 transfer function
          const erc20Interface = new ethers.Interface([
            'function transfer(address to, uint256 amount) returns (bool)'
          ]);
          
          // Convert amount to token decimals (assuming 18 decimals, should be fetched from token contract)
          const tokenAmount = ethers.parseUnits(watchedAmount, asset.decimals || 18);
          transactionData = erc20Interface.encodeFunctionData('transfer', [watchedToAddress, tokenAmount]);
          
          // Estimate gas for token transfer
          estimatedGas = await provider.estimateGas({
            from: wallet.address,
            to: asset.contractAddress,
            data: transactionData,
            value: 0n
          });
        } else {
          // Native token transfer
          const valueInWei = ethers.parseEther(watchedAmount);
          estimatedGas = await provider.estimateGas({
            from: wallet.address,
            to: watchedToAddress,
            value: valueInWei
          });
        }

        // Add 10% safety buffer
        const gasLimit = (estimatedGas * 110n) / 100n;

        // Use the selected fee data from GasEstimatorEIP1559
        if (selectedFeeData) {
          // Calculate estimated cost
          const maxFeePerGas = selectedFeeData.maxFeePerGas ? BigInt(selectedFeeData.maxFeePerGas) : 0n;
          const estimatedCostWei = gasLimit * maxFeePerGas;
          const estimatedCostEth = ethers.formatEther(estimatedCostWei);

          const result: GasEstimationResult = {
            estimatedGasLimit: estimatedGas,
            recommendedGasLimit: gasLimit,
            gasPrice: selectedFeeData.gasPrice ? BigInt(selectedFeeData.gasPrice) : undefined,
            maxFeePerGas: selectedFeeData.maxFeePerGas ? BigInt(selectedFeeData.maxFeePerGas) : undefined,
            maxPriorityFeePerGas: selectedFeeData.maxPriorityFeePerGas ? BigInt(selectedFeeData.maxPriorityFeePerGas) : undefined,
            isEIP1559: !!selectedFeeData.maxFeePerGas,
            estimatedCostWei: estimatedCostWei,
            estimatedCostNative: estimatedCostEth,
            estimatedCostUSD: undefined,
            estimatedTimeSeconds: selectedFeeData.estimatedTimeSeconds,
            networkCongestion: selectedFeeData.networkCongestion,
            gasPriceSource: 'etherscan',
            breakdown: {
              gasLimit: gasLimit.toString(),
              gasPrice: selectedFeeData.gasPrice || selectedFeeData.maxFeePerGas || '0',
              maxFeePerGas: selectedFeeData.maxFeePerGas,
              maxPriorityFeePerGas: selectedFeeData.maxPriorityFeePerGas,
              totalCost: estimatedCostEth,
              nativeCurrency: 'ETH',
              source: 'realtime-estimation'
            },
            warnings: []
          };

          setGasEstimationResult(result);

          // Update the gasEstimate for backward compatibility with TransferService
          setGasEstimate({
            gasLimit: result.recommendedGasLimit.toString(),
            gasPrice: result.gasPrice?.toString() || '',
            maxFeePerGas: result.maxFeePerGas?.toString() || '',
            maxPriorityFeePerGas: result.maxPriorityFeePerGas?.toString() || '',
            baseFeePerGas: selectedFeeData.baseFeePerGas, // CRITICAL: Include base fee
            estimatedCost: result.estimatedCostNative
          });
        }

      } catch (error) {
        console.error('Gas estimation error:', error);
        setGasEstimationResult(null);
        setGasEstimate(null);
        
        // Only show toast if user has filled all fields
        if (watchedFromWallet && watchedToAddress && watchedAmount && watchedAsset) {
          toast({
            variant: "destructive",
            title: "Gas Estimation Failed",
            description: error instanceof Error ? error.message : "Could not estimate gas for this transaction",
          });
        }
      } finally {
        setIsEstimating(false);
      }
    };

    // Debounce gas estimation to avoid excessive API calls
    const timeoutId = setTimeout(estimateGas, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedAmount, watchedAsset, watchedToAddress, watchedFromWallet, selectedFeeData, walletOptions, availableAssets, transferState, toast]);

  // Monitor transaction status when processing
  useEffect(() => {
    if (transferState !== "processing" || !transactionHash) return;
    
    const POLL_INTERVAL = 5000; // 5 seconds
    const MAX_POLLS = 120; // 10 minutes total (increased for slow testnets)
    
    const checkTransactionStatus = async () => {
      try {
        const formValues = form.getValues();
        const wallet = walletOptions.find(w => w.id === formValues.fromWallet);
        
        if (!wallet || !wallet.blockchain) {
          console.error('Wallet blockchain not found for transaction monitoring');
          return;
        }
        
        const isTestnet = wallet.network?.includes('test') || 
                         wallet.network?.includes('sepolia') || 
                         wallet.network?.includes('holesky') ||
                         wallet.network?.includes('hoodi');
        
        const rpcConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'testnet');
        if (!rpcConfig) {
          const mainnetConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'mainnet');
          if (!mainnetConfig) {
            console.error('RPC configuration not found for blockchain:', wallet.blockchain);
            return;
          }
        }
        
        const provider = new ethers.JsonRpcProvider(rpcConfig?.url || '');
        const receipt = await provider.getTransactionReceipt(transactionHash);
        
        if (receipt) {
          if (receipt.status === 1) {
            setTransferState("success");
            toast({
              title: "Transaction Confirmed",
              description: `Your transfer has been successfully confirmed on the blockchain.`,
            });
          } else {
            setTransferState("error");
            setErrorMessage("Transaction reverted on blockchain");
            toast({
              variant: "destructive",
              title: "Transaction Failed",
              description: "The transaction was confirmed but reverted on the blockchain.",
            });
          }
        } else {
          setPollingCount(prev => prev + 1);
          
          // Show progress toast for testnets every minute
          if (isTestnet && pollingCount > 0 && pollingCount % 12 === 0) { // Every minute (12 * 5s)
            const minutesElapsed = Math.floor(pollingCount * POLL_INTERVAL / 60000);
            toast({
              title: "Still Processing",
              description: `Transaction pending for ${minutesElapsed} minute(s). Testnets can be slow - please be patient.`,
            });
          }
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
    };
    
    checkTransactionStatus();
    
    const interval = setInterval(() => {
      if (pollingCount >= MAX_POLLS) {
        clearInterval(interval);
        // CRITICAL FIX: Never auto-mark as "success" - keep as "processing" with timeout note
        const formValues = form.getValues();
        const wallet = walletOptions.find(w => w.id === formValues.fromWallet);
        const isTestnet = wallet?.network?.includes('test') || 
                         wallet?.network?.includes('sepolia') || 
                         wallet?.network?.includes('holesky') ||
                         wallet?.network?.includes('hoodi');
        
        if (isTestnet) {
          // Keep in processing state but show warning
          toast({
            title: "Still Processing",
            description: `Transaction is taking longer than expected on ${wallet?.network}. Testnets can take 10+ minutes. Check the explorer to verify status. The page will continue monitoring.`,
            variant: "default"
          });
          // Continue polling at slower rate
          setPollingCount(0); // Reset to continue polling
        } else {
          setTransferState("error");
          setErrorMessage("Transaction confirmation timeout. The transaction may still be pending - check the blockchain explorer.");
          toast({
            variant: "destructive",
            title: "Confirmation Timeout",
            description: "Transaction took too long to confirm. Please check the blockchain explorer.",
          });
        }
      } else {
        checkTransactionStatus();
      }
    }, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [transferState, transactionHash, pollingCount, walletOptions, form, toast]);

  /**
   * Handle gas estimation from GasEstimatorEIP1559 component
   * EXACT match with TokenDeploymentFormProjectWalletIntegrated.handleGasEstimate
   * BUT adjusted for transfer gas limits (21k-100k, not 3M)
   */
  const handleFeeDataSelect = (feeData: EIP1559FeeData) => {
    setEstimatedGasData(feeData);
    setSelectedFeeData(feeData); // Keep for legacy compatibility
    
    // Track priority from GasEstimatorEIP1559
    if (feeData.priority) {
      setSelectedPriority(feeData.priority as FeePriority);
    }
    
    // Determine if network supports EIP-1559
    // CRITICAL: Check chain metadata FIRST, then fall back to runtime detection
    const wallet = walletOptions.find(w => w.id === form.watch("fromWallet"));
    const chainId = wallet?.chainId;
    
    let supportsEIP1559 = false;
    if (chainId) {
      // Check chain metadata for explicit EIP-1559 support
      supportsEIP1559 = isChainEIP1559Compatible(chainId);
      console.log(`🔗 Chain ${chainId} metadata check: EIP-1559 ${supportsEIP1559 ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
    } else {
      // Fall back to runtime detection only if chain metadata unavailable
      supportsEIP1559 = !!(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas);
      console.log(`⚠️ No chain metadata, using runtime detection: EIP-1559 ${supportsEIP1559 ? 'DETECTED' : 'NOT DETECTED'}`);
    }
    
    setIsEIP1559Network(supportsEIP1559);
    
    if (supportsEIP1559) {
      // EIP-1559 network - use maxFeePerGas and maxPriorityFeePerGas
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // Use proper EIP-1559 data
        const maxFeeGwei = (Number(feeData.maxFeePerGas) / 1e9).toFixed(2);
        const priorityFeeGwei = (Number(feeData.maxPriorityFeePerGas) / 1e9).toFixed(2);
        
        setMaxFeePerGas(maxFeeGwei);
        setMaxPriorityFeePerGas(priorityFeeGwei);
        
        // Also set legacy gasPrice for compatibility
        setGasPrice(maxFeeGwei);
      } else if (feeData.gasPrice) {
        // FALLBACK: Estimator returned legacy data for EIP-1559 chain
        // Convert gasPrice to EIP-1559 format
        console.warn(`⚠️ Chain ${chainId} is EIP-1559 but estimator returned legacy gasPrice - converting...`);
        const gasPriceGwei = (Number(feeData.gasPrice) / 1e9).toFixed(2);
        
        // Use gasPrice as maxFeePerGas
        setMaxFeePerGas(gasPriceGwei);
        // Set reasonable priority fee (1-2 gwei typical)
        setMaxPriorityFeePerGas('1.5');
        // Also set for compatibility
        setGasPrice(gasPriceGwei);
      } else {
        // No fee data at all - use defaults
        console.warn(`⚠️ No fee data available for EIP-1559 chain ${chainId} - using defaults`);
        setMaxFeePerGas('20');
        setMaxPriorityFeePerGas('1.5');
        setGasPrice('20');
      }
    } else {
      // Legacy network - use gasPrice
      let newGasPrice = gasPrice;
      if (feeData.gasPrice) {
        const gasPriceGwei = (Number(feeData.gasPrice) / 1e9).toFixed(2);
        newGasPrice = gasPriceGwei;
        setGasPrice(gasPriceGwei);
      }
    }
    
    // Set default gas limit if not already set - USE TRANSFER LIMITS (21k), not deployment (3M)!
    if (!gasLimit || gasLimit === 21000) {
      const newGasLimit = 21000; // Simple transfer default
      setGasLimit(newGasLimit);
    }
    
    // If we have form values, trigger a new gas estimation
    const amount = form.getValues("amount");
    const asset = form.getValues("asset");
    const toAddress = form.getValues("toAddress");
    const fromWallet = form.getValues("fromWallet");
    
    if (amount && asset && toAddress && fromWallet) {
      // The useEffect will handle the estimation
    }
  };

  const initializeData = async () => {
    try {
      setLoadingWallets(true);
      
      const project = await getPrimaryOrFirstProject();
      if (!project) {
        toast({
          variant: "destructive",
          title: "No Project Found",
          description: "Please create a project first to use transfers",
        });
        return;
      }
      
      setProjectId(project.id);
      
      const wallets = await internalWalletService.refreshAllBalances(project.id);
      setAllWallets(wallets);

      const options: WalletOption[] = [
        ...wallets.projectWallets.map(w => {
          const chainIdNum = w.chainId ? parseInt(w.chainId, 10) : undefined;
          let blockchain = w.network;
          if (!blockchain && chainIdNum && !isNaN(chainIdNum)) {
            blockchain = getChainName(chainIdNum);
          }
          blockchain = blockchain || 'ethereum';
          
          return {
            id: w.id,
            address: w.address,
            name: `${w.walletType} (Project)`,
            type: 'project' as const,
            balance: w.balance?.nativeBalance || '0',
            blockchain: blockchain,
            network: blockchain,
            chainId: chainIdNum && !isNaN(chainIdNum) ? chainIdNum : getChainId(blockchain)
          };
        }),
        ...wallets.userWallets.map(w => {
          const chainIdNum = getChainId(w.blockchain || 'ethereum');
          
          return {
            id: w.id,
            address: w.address,
            name: `${w.userName || 'User'} Wallet`,
            type: 'user' as const,
            balance: w.balance?.nativeBalance || '0',
            blockchain: w.blockchain || 'ethereum',
            network: w.blockchain || 'ethereum',
            chainId: chainIdNum
          };
        }),
        ...wallets.multiSigWallets.map(w => {
          const chainIdNum = getChainId(w.blockchain || 'ethereum');
          
          return {
            id: w.id,
            address: w.address,
            name: `${w.name} (Multi-Sig)`,
            type: 'multisig' as const,
            balance: w.balance?.nativeBalance || '0',
            blockchain: w.blockchain || 'ethereum',
            network: w.blockchain || 'ethereum',
            chainId: chainIdNum
          };
        })
      ];

      setWalletOptions(options);

      if (options.length > 0) {
        const firstWallet = options[0];
        form.setValue("fromWallet", firstWallet.id);
        
        if (firstWallet.blockchain) {
          setSelectedBlockchain(firstWallet.blockchain);
          
          const chainId = getChainId(firstWallet.blockchain);
          if (chainId) {
            const assets = getAllAssets(chainId);
            setAvailableAssets(assets);
            
            if (assets.length > 0) {
              form.setValue("asset", assets[0].symbol);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load wallets",
      });
    } finally {
      setLoadingWallets(false);
    }
  };

  /**
   * Get network-specific gas recommendations
   * EXACT match with TokenDeploymentFormProjectWalletIntegrated
   * BUT with transfer-appropriate gas limits (21k-100k, not 3M)
   */
  const getGasRecommendation = () => {
    const recommendations: Record<string, { price: string; limit: number; note: string }> = {
      ethereum: { price: '20-50', limit: 21000, note: 'Mainnet: 20-50 Gwei typical' },
      polygon: { price: '30-100', limit: 21000, note: 'Polygon: 30-100 Gwei typical' },
      base: { price: '0.001-0.01', limit: 21000, note: 'Base: 0.001-0.01 Gwei typical' },
      arbitrum: { price: '0.1-1', limit: 21000, note: 'Arbitrum: 0.1-1 Gwei typical' },
      optimism: { price: '0.001-0.1', limit: 21000, note: 'Optimism: 0.001-0.1 Gwei typical' },
      avalanche: { price: '25-50', limit: 21000, note: 'Avalanche: 25-50 Gwei typical' },
      bsc: { price: '3-5', limit: 21000, note: 'BSC: 3-5 Gwei typical' },
      sepolia: { price: '1-5', limit: 21000, note: 'Sepolia Testnet: 1-5 Gwei typical' },
      holesky: { price: '1-5', limit: 21000, note: 'Holesky Testnet: 1-5 Gwei typical' }
    };
    
    return recommendations[selectedBlockchain] || { price: '20', limit: 21000, note: 'Default: 20 Gwei' };
  };
  
  /**
   * Handle manual gas price change
   * EXACT match with TokenDeploymentFormProjectWalletIntegrated
   */
  const handleGasPriceChange = (value: string) => {
    setGasPrice(value);
    
    // Update gas estimate if in manual mode
    if (gasConfigMode === 'manual') {
      updateManualGasEstimate();
    }
  };
  
  /**
   * Handle manual gas limit change
   * EXACT match with TokenDeploymentFormProjectWalletIntegrated
   */
  const handleGasLimitChange = (value: number) => {
    setGasLimit(value);
    
    // Update gas estimate if in manual mode
    if (gasConfigMode === 'manual') {
      updateManualGasEstimate();
    }
  };
  
  /**
   * Handle manual Max Fee Per Gas change (EIP-1559)
   */
  const handleMaxFeePerGasChange = (value: string) => {
    setMaxFeePerGas(value);
    
    // Update gas estimate if in manual mode
    if (gasConfigMode === 'manual') {
      updateManualGasEstimate();
    }
  };
  
  /**
   * Handle manual Max Priority Fee change (EIP-1559)
   */
  const handleMaxPriorityFeePerGasChange = (value: string) => {
    setMaxPriorityFeePerGas(value);
    
    // Update gas estimate if in manual mode
    if (gasConfigMode === 'manual') {
      updateManualGasEstimate();
    }
  };
  
  /**
   * Create gas estimate from manual input values
   */
  const updateManualGasEstimate = () => {
    try {
      if (gasConfigMode === 'manual') {
        // Create gas estimate from manual values
        const manualEstimate: GasEstimate = {
          gasLimit: gasLimit.toString(),
          gasPrice: isEIP1559Network ? undefined : ethers.parseUnits(gasPrice || '0', 'gwei').toString(),
          maxFeePerGas: isEIP1559Network ? ethers.parseUnits(maxFeePerGas || '0', 'gwei').toString() : undefined,
          maxPriorityFeePerGas: isEIP1559Network ? ethers.parseUnits(maxPriorityFeePerGas || '0', 'gwei').toString() : undefined,
          baseFeePerGas: estimatedGasData?.baseFeePerGas, // Include base fee from estimator
          estimatedCost: isEIP1559Network
            ? ((parseFloat(maxFeePerGas || '0') * gasLimit) / 1e9).toFixed(6)
            : ((parseFloat(gasPrice || '0') * gasLimit) / 1e9).toFixed(6)
        };
        
        setGasEstimate(manualEstimate);
        
        console.log('📝 Updated manual gas estimate:', {
          gasLimit: manualEstimate.gasLimit,
          maxFeePerGas: manualEstimate.maxFeePerGas ? `${ethers.formatUnits(manualEstimate.maxFeePerGas, 'gwei')} Gwei` : undefined,
          maxPriorityFeePerGas: manualEstimate.maxPriorityFeePerGas ? `${ethers.formatUnits(manualEstimate.maxPriorityFeePerGas, 'gwei')} Gwei` : undefined,
          baseFeePerGas: manualEstimate.baseFeePerGas ? `${ethers.formatUnits(manualEstimate.baseFeePerGas, 'gwei')} Gwei` : undefined,
          gasPrice: manualEstimate.gasPrice ? `${ethers.formatUnits(manualEstimate.gasPrice, 'gwei')} Gwei` : undefined,
          estimatedCost: manualEstimate.estimatedCost
        });
      }
    } catch (error) {
      console.error('Error updating manual gas estimate:', error);
    }
  };
  
  /**
   * Update manual gas estimate when manual values change
   */
  React.useEffect(() => {
    if (gasConfigMode === 'manual') {
      updateManualGasEstimate();
    }
  }, [gasConfigMode, gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, isEIP1559Network]);

  const onSubmit = async (values: TransferFormValues) => {
    const wallet = walletOptions.find(w => w.id === values.fromWallet);
    if (!wallet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected wallet not found",
      });
      return;
    }

    if (!wallet.chainId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Wallet ${wallet.name} has no chain ID configured`,
      });
      return;
    }

    // Create gas estimate from manual mode if applicable, otherwise ensure automatic estimate exists
    let finalGasEstimate = gasEstimate;
    
    if (gasConfigMode === 'manual') {
      // Validate manual inputs
      if (isEIP1559Network) {
        if (!maxFeePerGas || parseFloat(maxFeePerGas) <= 0) {
          toast({
            variant: "destructive",
            title: "Invalid Gas Configuration",
            description: "Max Fee Per Gas must be greater than 0",
          });
          return;
        }
        if (!maxPriorityFeePerGas || parseFloat(maxPriorityFeePerGas) < 0) {
          toast({
            variant: "destructive",
            title: "Invalid Gas Configuration",
            description: "Max Priority Fee must be 0 or greater",
          });
          return;
        }
        
        // Validate Max Fee >= Base Fee + Priority Fee
        if (estimatedGasData?.baseFeePerGas) {
          const baseFeeGwei = Number(estimatedGasData.baseFeePerGas) / 1e9;
          const minMaxFee = baseFeeGwei + parseFloat(maxPriorityFeePerGas);
          if (parseFloat(maxFeePerGas) < minMaxFee) {
            toast({
              variant: "destructive",
              title: "Invalid Gas Configuration",
              description: `Max Fee (${maxFeePerGas} Gwei) must be at least ${minMaxFee.toFixed(2)} Gwei (Base ${baseFeeGwei.toFixed(2)} + Priority ${maxPriorityFeePerGas})`,
            });
            return;
          }
        }
      } else {
        if (!gasPrice || parseFloat(gasPrice) <= 0) {
          toast({
            variant: "destructive",
            title: "Invalid Gas Configuration",
            description: "Gas Price must be greater than 0",
          });
          return;
        }
      }
      
      if (!gasLimit || gasLimit < 21000) {
        toast({
          variant: "destructive",
          title: "Invalid Gas Configuration",
          description: "Gas Limit must be at least 21,000",
        });
        return;
      }
      
      // Create gas estimate from manual values
      finalGasEstimate = {
        gasLimit: gasLimit.toString(),
        gasPrice: isEIP1559Network ? undefined : ethers.parseUnits(gasPrice, 'gwei').toString(),
        maxFeePerGas: isEIP1559Network ? ethers.parseUnits(maxFeePerGas, 'gwei').toString() : undefined,
        maxPriorityFeePerGas: isEIP1559Network ? ethers.parseUnits(maxPriorityFeePerGas, 'gwei').toString() : undefined,
        baseFeePerGas: estimatedGasData?.baseFeePerGas, // Include base fee from estimator
        estimatedCost: isEIP1559Network
          ? ((parseFloat(maxFeePerGas) * gasLimit) / 1e9).toFixed(6)
          : ((parseFloat(gasPrice) * gasLimit) / 1e9).toFixed(6)
      };
      
      console.log('✅ Using manual gas configuration:', finalGasEstimate);
    } else if (!finalGasEstimate) {
      toast({
        variant: "destructive",
        title: "Gas Estimation Required",
        description: "Please wait for gas estimation to complete or switch to manual mode",
      });
      return;
    }

    const transferParams: TransferParams = {
      from: wallet.address,
      to: values.toAddress,
      amount: values.amount,
      chainId: wallet.chainId,
      walletId: wallet.id,
      walletType: wallet.type === 'multisig' ? 'project' : wallet.type,
      gasLimit: finalGasEstimate.gasLimit,
      maxFeePerGas: finalGasEstimate.maxFeePerGas,
      maxPriorityFeePerGas: finalGasEstimate.maxPriorityFeePerGas
    };

    const validation = await transferService.validateTransfer(transferParams);
    
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: validation.errors.join(', '),
      });
      return;
    }

    if (validation.warnings.length > 0) {
      toast({
        title: "Warning",
        description: validation.warnings.join(', '),
      });
    }

    // Track address selection when user proceeds to confirmation
    if (user?.id && values.toAddress) {
      await addressSelectionTracker.trackSelection(
        user.id,
        values.toAddress,
        projectId,
        'transfer_tab'
      );
    }

    setTransferState("confirmation");
  };

  const handleConfirmTransfer = async (updatedGasEstimate?: GasEstimate) => {
    if (isSubmitting) {
      console.log('Transfer already in progress, ignoring duplicate click');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setTransferState("processing");
      setTransactionStartTime(new Date());
      setPollingCount(0);
      
      const values = form.getValues();
      const wallet = walletOptions.find(w => w.id === values.fromWallet);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.chainId) {
        throw new Error(`Wallet ${wallet.name} has no chain ID configured`);
      }

      // Use updated gas estimate if provided (from user edits), otherwise use original
      const finalGasEstimate = updatedGasEstimate || gasEstimate;
      
      if (!finalGasEstimate) {
        throw new Error('Gas estimation not available');
      }

      const transferParams: TransferParams = {
        from: wallet.address,
        to: values.toAddress,
        amount: values.amount,
        chainId: wallet.chainId,
        walletId: wallet.id,
        walletType: wallet.type === 'multisig' ? 'project' : wallet.type,
        gasLimit: finalGasEstimate.gasLimit,
        maxFeePerGas: finalGasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: finalGasEstimate.maxPriorityFeePerGas
      };

      const result = await transferService.executeTransfer(transferParams);

      if (result.success) {
        setTransactionHash(result.transactionHash || null);
        
        toast({
          title: "Transfer Submitted",
          description: `Transaction submitted to blockchain. Monitoring for confirmation...`,
        });
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setErrorMessage(error instanceof Error ? error.message : "An error occurred");
      setTransferState("error");
      
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to submit transaction",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle fee bump for stuck transactions
   * Creates a replacement transaction with higher fees using the same nonce
   */
  const handleFeeBump = async (newMaxFeePerGas: string, newMaxPriorityFeePerGas: string): Promise<void> => {
    try {
      if (!transactionHash) {
        throw new Error('No transaction hash available');
      }

      const values = form.getValues();
      const wallet = walletOptions.find(w => w.id === values.fromWallet);
      
      if (!wallet || !wallet.chainId) {
        throw new Error('Wallet not found or has no chain ID');
      }

      // Get provider
      const rpcConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'testnet');
      if (!rpcConfig) {
        throw new Error(`No RPC configuration for ${wallet.blockchain}`);
      }

      const provider = new ethers.JsonRpcProvider(rpcConfig.url);

      // Get the original transaction to extract nonce
      const originalTx = await provider.getTransaction(transactionHash);
      if (!originalTx) {
        throw new Error('Could not fetch original transaction');
      }

      console.log('🔄 Creating fee bump transaction with nonce:', originalTx.nonce);

      // Create replacement transaction with higher fees and same nonce
      const replacementParams: TransferParams = {
        from: wallet.address,
        to: values.toAddress,
        amount: values.amount,
        chainId: wallet.chainId,
        walletId: wallet.id,
        walletType: wallet.type === 'multisig' ? 'project' : wallet.type,
        gasLimit: gasEstimate?.gasLimit || '21000',
        maxFeePerGas: newMaxFeePerGas,
        maxPriorityFeePerGas: newMaxPriorityFeePerGas,
        nonce: originalTx.nonce // CRITICAL: Use same nonce to replace transaction
      };

      // Execute the replacement transaction
      const result = await transferService.executeTransfer(replacementParams);

      if (result.success && result.transactionHash) {
        // Update to new transaction hash
        setTransactionHash(result.transactionHash);
        
        // Update gas estimate for future bumps
        setGasEstimate({
          gasLimit: gasEstimate?.gasLimit || '21000',
          gasPrice: gasEstimate?.gasPrice || '0', // Required for type compatibility
          maxFeePerGas: newMaxFeePerGas,
          maxPriorityFeePerGas: newMaxPriorityFeePerGas,
          baseFeePerGas: gasEstimate?.baseFeePerGas,
          estimatedCost: gasEstimate?.estimatedCost || '0'
        });

        toast({
          title: "Fee Bump Successful",
          description: "Transaction replaced with higher fees. Monitoring new transaction...",
        });

        console.log('✅ Fee bump successful, new hash:', result.transactionHash);
      } else {
        throw new Error(result.error || 'Fee bump failed');
      }
    } catch (error) {
      console.error('Fee bump error:', error);
      toast({
        variant: "destructive",
        title: "Fee Bump Failed",
        description: error instanceof Error ? error.message : "Failed to bump transaction fees",
      });
      throw error;
    }
  };

  const handleQrScan = (address: string) => {
    form.setValue("toAddress", address);
    setShowQrScanner(false);
  };

  const handleBack = () => {
    if (transferState === "confirmation") {
      setTransferState("input");
    } else if (transferState === "success" || transferState === "error") {
      form.reset();
      setTransferState("input");
      setTransactionHash(null);
      setErrorMessage(null);
      setTransactionStartTime(null);
      setPollingCount(0);
      setGasEstimationResult(null);
      setGasEstimate(null);
    }
  };

  const handleWalletChange = (walletId: string) => {
    const wallet = walletOptions.find(w => w.id === walletId);
    if (wallet && wallet.blockchain) {
      setSelectedBlockchain(wallet.blockchain);
      
      const chainId = getChainId(wallet.blockchain);
      if (chainId) {
        const assets = getAllAssets(chainId);
        setAvailableAssets(assets);
        
        if (assets.length > 0) {
          form.setValue("asset", assets[0].symbol);
        }
      }
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Building2 className="h-4 w-4" />;
      case 'user':
        return <UserIcon className="h-4 w-4" />;
      case 'multisig':
        return <Shield className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const formatBalance = (balance: string, network?: string): string => {
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) return '0.0000';
    
    const symbol = network?.toUpperCase() || 'ETH';
    return `${numBalance.toFixed(4)} ${symbol}`;
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const renderTransferContent = () => {
    switch (transferState) {
      case "input":
        return (
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fromWallet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Wallet</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleWalletChange(value);
                        }}
                        value={field.value}
                        disabled={loadingWallets}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select a wallet"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {walletOptions.length > 0 ? (
                            walletOptions.map((wallet) => (
                              <SelectItem key={wallet.id} value={wallet.id}>
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center gap-2">
                                    {getWalletIcon(wallet.type)}
                                    <span className="font-medium">{wallet.name}</span>
                                    <Badge variant="outline" className="ml-auto">
                                      {getChainInfo(wallet.chainId)?.name || wallet.blockchain || wallet.network || 'Unknown'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono">{formatAddress(wallet.address)}</span>
                                    <span>•</span>
                                    <span>{formatBalance(wallet.balance || '0', wallet.network)}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-wallets" disabled>
                              {loadingWallets ? "Loading..." : "No wallets available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the wallet to send from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>To Address</Label>
                  <Tabs value={toAddressMode} onValueChange={(v) => setToAddressMode(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="custom">Custom Address</TabsTrigger>
                      <TabsTrigger value="wallet">Select Wallet</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="custom" className="mt-2">
                      <FormField
                        control={form.control}
                        name="toAddress"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="0x..." {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setShowQrScanner(true)}
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormDescription>
                              Enter the recipient's wallet address
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="wallet" className="mt-2">
                      <Select
                        onValueChange={(value) => form.setValue("toAddress", value)}
                        value={form.watch("toAddress")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          {walletOptions.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.address}>
                              <div className="flex items-center gap-2">
                                {getWalletIcon(wallet.type)}
                                <span>{wallet.name}</span>
                                <span className="text-xs text-muted-foreground font-mono ml-auto">
                                  {formatAddress(wallet.address)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="asset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableAssets.length > 0 ? (
                              availableAssets.map((asset) => (
                                <SelectItem key={asset.symbol} value={asset.symbol}>
                                  <div className="flex items-center gap-2">
                                    <span>{asset.symbol}</span>
                                    {asset.type === 'native' && (
                                      <Badge variant="outline" className="text-xs">Native</Badge>
                                    )}
                                    {asset.type === 'stablecoin' && (
                                      <Badge variant="secondary" className="text-xs">Stablecoin</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-assets" disabled>
                                No assets available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Available assets for this chain
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Gas Fee Visibility Alert - Show if gas estimate available */}
                {gasEstimationResult && !showGasConfig && (
                  <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-300">
                      Network Fee: {parseFloat(gasEstimationResult.estimatedCostNative).toFixed(6)} {watchedAsset}
                    </AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
                      Expand "Gas Configuration" below to review and edit network fees before continuing.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Gas Configuration Section - EXACT match with TokenDeploymentFormProjectWalletIntegrated */}
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
                      Configure gas price and limit for the transfer transaction
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
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    {gasConfigMode === 'estimator' ? (
                      // Automatic Gas Estimation with GasEstimatorEIP1559 component
                      <div className="space-y-4">
                        <GasEstimatorEIP1559
                          blockchain={selectedBlockchain}
                          onSelectFeeData={handleFeeDataSelect}
                          defaultPriority={FeePriority.MEDIUM}
                          showAdvanced={true}
                        />
                        
                        {estimatedGasData && showGasConfig && (
                          <div className="pt-4 space-y-2">
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              {isEIP1559Network ? (
                                <>
                                  {/* Base Fee - Read Only */}
                                  {estimatedGasData.baseFeePerGas && (
                                    <div className="col-span-2">
                                      <Label className="text-xs text-muted-foreground">Base Fee (Current Block)</Label>
                                      <div className="text-sm font-medium">{(Number(estimatedGasData.baseFeePerGas) / 1e9).toFixed(4)} Gwei</div>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Determined by network demand, burned by protocol
                                      </p>
                                    </div>
                                  )}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Max Priority Fee (Tip)</Label>
                                    <div className="text-sm font-medium">{maxPriorityFeePerGas} Gwei</div>
                                    <p className="text-xs text-muted-foreground mt-0.5">Paid to validators</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Max Fee Per Gas</Label>
                                    <div className="text-sm font-medium">{maxFeePerGas} Gwei</div>
                                    <p className="text-xs text-muted-foreground mt-0.5">Maximum willing to pay</p>
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
                      // Manual Gas Configuration - FULL EIP-1559 EDITING
                      <div className="space-y-4">
                        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <AlertTitle className="text-amber-800 dark:text-amber-300">Manual Configuration</AlertTitle>
                          <AlertDescription className="text-amber-700 dark:text-amber-400">
                            {getGasRecommendation().note}
                            {isEIP1559Network && <div className="mt-1">This is an EIP-1559 network. Set Max Fee Per Gas and Max Priority Fee.</div>}
                          </AlertDescription>
                        </Alert>
                        
                        {/* Gas Limit - Always shown */}
                        <div className="space-y-2">
                          <Label htmlFor="gasLimit">
                            Gas Limit
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="inline h-3 w-3 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Maximum gas units this transaction can use. 21,000 for simple transfers.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            id="gasLimit"
                            type="number"
                            step="1000"
                            min="21000"
                            value={gasLimit}
                            onChange={(e) => handleGasLimitChange(parseInt(e.target.value) || 21000)}
                            disabled={isSubmitting}
                            placeholder="21000"
                          />
                          <p className="text-xs text-muted-foreground">
                            Recommended: {getGasRecommendation().limit.toLocaleString()} (21k simple, 50-100k tokens)
                          </p>
                        </div>
                        
                        {isEIP1559Network ? (
                          // EIP-1559 Network - Show Base Fee (read-only), Max Fee, Priority Fee
                          <>
                            {/* Base Fee - Read Only */}
                            {estimatedGasData?.baseFeePerGas && (
                              <div className="space-y-2">
                                <Label htmlFor="baseFee">
                                  Base Fee (Current Block)
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="inline h-3 w-3 ml-1 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Current network base fee. This is determined by the protocol and cannot be changed.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </Label>
                                <Input
                                  id="baseFee"
                                  type="text"
                                  value={`${(Number(estimatedGasData.baseFeePerGas) / 1e9).toFixed(4)} Gwei`}
                                  disabled
                                  className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Base fee is burned and adjusts dynamically based on network demand
                                </p>
                              </div>
                            )}
                            
                            {/* Max Priority Fee Per Gas - EDITABLE */}
                            <div className="space-y-2">
                              <Label htmlFor="maxPriorityFeePerGas">
                                Max Priority Fee (Tip to Validators)
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="inline h-3 w-3 ml-1 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Tip paid to validators to prioritize your transaction. Higher = faster confirmation.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id="maxPriorityFeePerGas"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={maxPriorityFeePerGas}
                                  onChange={(e) => handleMaxPriorityFeePerGasChange(e.target.value)}
                                  disabled={isSubmitting}
                                  placeholder="1.5"
                                />
                                <span className="flex items-center text-sm text-muted-foreground">Gwei</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Recommended: 1-2 Gwei for normal, 3-5 Gwei for fast confirmation
                              </p>
                            </div>
                            
                            {/* Max Fee Per Gas - EDITABLE */}
                            <div className="space-y-2">
                              <Label htmlFor="maxFeePerGas">
                                Max Fee Per Gas (Maximum Willing to Pay)
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="inline h-3 w-3 ml-1 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Maximum total fee (base + priority). Must be ≥ Base Fee + Priority Fee.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id="maxFeePerGas"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={maxFeePerGas}
                                  onChange={(e) => handleMaxFeePerGasChange(e.target.value)}
                                  disabled={isSubmitting}
                                  placeholder="20"
                                />
                                <span className="flex items-center text-sm text-muted-foreground">Gwei</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Must be at least: {estimatedGasData?.baseFeePerGas 
                                  ? `${((Number(estimatedGasData.baseFeePerGas) / 1e9) + parseFloat(maxPriorityFeePerGas || '0')).toFixed(2)} Gwei`
                                  : 'Base Fee + Priority Fee'
                                }
                              </p>
                              {maxFeePerGas && maxPriorityFeePerGas && estimatedGasData?.baseFeePerGas && 
                               parseFloat(maxFeePerGas) < ((Number(estimatedGasData.baseFeePerGas) / 1e9) + parseFloat(maxPriorityFeePerGas)) && (
                                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Max Fee must be ≥ Base Fee ({(Number(estimatedGasData.baseFeePerGas) / 1e9).toFixed(2)}) + Priority Fee ({maxPriorityFeePerGas})
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          // Legacy Network - Show Gas Price only
                          <div className="space-y-2">
                            <Label htmlFor="gasPrice">
                              Gas Price
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="inline h-3 w-3 ml-1 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Price per gas unit. Higher = faster confirmation.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="gasPrice"
                                type="number"
                                step="0.01"
                                min="0"
                                value={gasPrice}
                                onChange={(e) => handleGasPriceChange(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="20"
                              />
                              <span className="flex items-center text-sm text-muted-foreground">Gwei</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Recommended: {getGasRecommendation().price} Gwei for {selectedBlockchain}
                            </p>
                          </div>
                        )}
                        
                        {/* Estimated Cost Summary */}
                        {showGasConfig && (
                          <div className="pt-2">
                            <Separator className="mb-4" />
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Estimated Gas Cost:</span>
                                <span className="font-medium">
                                  {isEIP1559Network 
                                    ? `${((parseFloat(maxFeePerGas || '0') * gasLimit) / 1e9).toFixed(6)} ${watchedAsset || 'ETH'}`
                                    : `${((parseFloat(gasPrice) * gasLimit) / 1e9).toFixed(6)} ${watchedAsset || 'ETH'}`
                                  }
                                </span>
                              </div>
                              {isEIP1559Network && (
                                <>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Breakdown:</span>
                                    <span>Gas Limit ({gasLimit.toLocaleString()}) × Max Fee ({maxFeePerGas} Gwei)</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Actual cost:</span>
                                    <span>Will be (Base Fee + Priority Fee) × Gas Used ≤ Estimated</span>
                                  </div>
                                </>
                              )}
                              <p className="text-xs text-muted-foreground">
                                * Unused gas is refunded. Actual cost may be lower than estimated.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loadingWallets || isEstimating}
                  >
                    {isEstimating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Estimating Gas...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        );
      
      case "confirmation":
        const formValues = form.getValues();
        const selectedWalletData = walletOptions.find(w => w.id === formValues.fromWallet);
        
        return (
          <TransferConfirmation 
            formData={{
              fromWallet: selectedWalletData?.name || formValues.fromWallet,
              toAddress: formValues.toAddress,
              amount: formValues.amount,
              asset: formValues.asset,
              gasOption: convertPriorityToGasOption(selectedPriority) // Use tracked priority from GasEstimatorEIP1559
            }}
            gasEstimate={gasEstimate} // CRITICAL: Pass actual gas estimate
            onConfirm={(updatedGasEstimate) => handleConfirmTransfer(updatedGasEstimate)} 
            onBack={() => setTransferState("input")} 
            isProcessing={isSubmitting}
          />
        );
      
      case "processing":
        const processingWallet = walletOptions.find(w => w.id === form.getValues("fromWallet"));
        const processingBlockchain = processingWallet?.blockchain || 'ethereum';
        
        return (
          <TransactionConfirmation
            txHash={transactionHash || undefined}
            status="pending"
            title="Transfer Processing"
            description="Your transfer is being processed on the blockchain"
            blockchain={processingBlockchain}
            gasEstimate={gasEstimate ? {
              maxFeePerGas: gasEstimate.maxFeePerGas,
              maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
              gasPrice: gasEstimate.gasPrice
            } : undefined}
            onFeeBump={handleFeeBump}
            details={{
              from: processingWallet?.address || form.getValues("fromWallet"),
              to: form.getValues("toAddress"),
              amount: form.getValues("amount"),
              asset: form.getValues("asset"),
              timestamp: transactionStartTime?.toISOString() || new Date().toISOString(),
            }}
            onBack={handleBack}
          />
        );
      
      case "success":
        const successWallet = walletOptions.find(w => w.id === form.getValues("fromWallet"));
        const successBlockchain = successWallet?.blockchain || 'ethereum';
        
        return (
          <TransactionConfirmation
            txHash={transactionHash || undefined}
            status="confirmed"
            title="Transfer Successful"
            description="Your transfer has been successfully completed"
            blockchain={successBlockchain}
            details={{
              from: successWallet?.address || form.getValues("fromWallet"),
              to: form.getValues("toAddress"),
              amount: form.getValues("amount"),
              asset: form.getValues("asset"),
              timestamp: transactionStartTime?.toISOString() || new Date().toISOString(),
            }}
            onBack={handleBack}
          />
        );
      
      case "error":
        return (
          <ErrorDisplay
            errorCode={errorMessage?.includes("insufficient funds") ? "INSUFFICIENT_FUNDS" : 
                      errorMessage?.includes("user rejected") ? "REJECTED_BY_USER" : 
                      errorMessage?.includes("network") ? "NETWORK_ERROR" : "UNKNOWN"}
            error={errorMessage || "An error occurred during the transfer."}
            onRetry={() => {
              setTransferState("confirmation");
              setErrorMessage(null);
            }}
            onBack={handleBack}
          />
        );
      
      default:
        return null;
    }
  };

  if (!walletOptions.length && !loadingWallets && transferState === "input") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">No wallets found</p>
            <p className="text-sm text-muted-foreground mb-4">
              You need to create a wallet before you can transfer assets
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {transferState === "input" && "Transfer Details"}
              {transferState === "confirmation" && "Confirm Transfer"}
              {transferState === "processing" && "Processing Transaction"}
              {transferState === "success" && "Transaction Successful"}
              {transferState === "error" && "Transaction Failed"}
            </CardTitle>
            <CardDescription>
              {transferState === "input" && "Send assets between wallets"}
              {transferState === "confirmation" && "Verify the transfer details"}
              {transferState === "processing" && "Your transaction is being processed"}
              {transferState === "success" && "Your transfer has been completed"}
              {transferState === "error" && "There was an error processing your transaction"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderTransferContent()}
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        {/* Recent Addresses - Gas configuration now in main form */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Addresses</CardTitle>
            <CardDescription>Previously used addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentAddresses 
              onSelectAddress={async (address) => {
                form.setValue("toAddress", address);
                setToAddressMode('custom');
                // Track address selection when user clicks a recent address
                if (user?.id) {
                  await addressSelectionTracker.trackSelection(
                    user.id,
                    address,
                    projectId,
                    'recent_addresses_click'
                  );
                }
              }}
              currentWalletId={form.watch("fromWallet")}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* QR Code Scanner Dialog */}
      {showQrScanner && (
        <QrCodeScanner 
          onClose={() => setShowQrScanner(false)} 
          onScan={handleQrScan} 
        />
      )}
    </div>
  );
};
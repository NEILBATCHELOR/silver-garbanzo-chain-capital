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

// Import gas estimation - using GasEstimatorEIP1559 like TokenDeployPageEnhanced
import GasEstimatorEIP1559, { type EIP1559FeeData } from "@/components/tokens/components/transactions/GasEstimatorEIP1559";
import { FeePriority, NetworkCongestion } from "@/services/blockchain/FeeEstimator";
import { ethers } from "ethers";
import { rpcManager } from "@/infrastructure/web3/rpc/RPCConnectionManager";
import { getChainName, getChainId } from "@/infrastructure/web3/utils/chainIds";
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
  chainId?: number; // ADDED: Chain ID from wallet data
};

// Schema for the transfer form - updated to use FeePriority enum
const transferSchema = z.object({
  fromWallet: z.string().min(1, "Please select a wallet"),
  toAddress: z.string().min(42, "Invalid wallet address").max(44, "Invalid wallet address"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  asset: z.string().min(1, "Please select an asset"),
  priority: z.nativeEnum(FeePriority), // Changed from gasSpeed to priority
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
  const [isSubmitting, setIsSubmitting] = useState(false);  // Track if transaction is being submitted
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

  // Gas estimation - using GasEstimatorEIP1559 component
  const [selectedFeeData, setSelectedFeeData] = useState<EIP1559FeeData | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
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
      asset: "ETH", // Default to ETH - will be overridden by getTokenSymbol() for specific chain
      priority: FeePriority.MEDIUM, // Changed from gasSpeed: "standard"
    },
  });

  // Load wallets and project on mount
  useEffect(() => {
    initializeData();
  }, []);

  // Monitor transaction status when processing
  useEffect(() => {
    if (transferState !== "processing" || !transactionHash) return;
    
    const POLL_INTERVAL = 5000; // 5 seconds
    const MAX_POLLS = 60; // 5 minutes total (60 * 5s = 300s)
    
    const checkTransactionStatus = async () => {
      try {
        // Get wallet to determine blockchain
        const formValues = form.getValues();
        const wallet = walletOptions.find(w => w.id === formValues.fromWallet);
        
        if (!wallet || !wallet.blockchain) {
          console.error('Wallet blockchain not found for transaction monitoring');
          return;
        }
        
        // Get provider for the blockchain
        const rpcConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'testnet');
        if (!rpcConfig) {
          // Try mainnet if testnet not available
          const mainnetConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'mainnet');
          if (!mainnetConfig) {
            console.error('RPC configuration not found for blockchain:', wallet.blockchain);
            return;
          }
        }
        
        const provider = new ethers.JsonRpcProvider(rpcConfig?.url || '');
        const receipt = await provider.getTransactionReceipt(transactionHash);
        
        if (receipt) {
          // Transaction is mined
          if (receipt.status === 1) {
            // Success
            setTransferState("success");
            toast({
              title: "Transaction Confirmed",
              description: `Your transfer has been successfully confirmed on the blockchain.`,
            });
          } else {
            // Failed
            setTransferState("error");
            setErrorMessage("Transaction reverted on blockchain");
            toast({
              variant: "destructive",
              title: "Transaction Failed",
              description: "The transaction was confirmed but reverted on the blockchain.",
            });
          }
        } else {
          // Still pending, increment poll count
          setPollingCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
        // Don't fail on polling errors, just keep trying
      }
    };
    
    // Initial check
    checkTransactionStatus();
    
    // Set up polling
    const interval = setInterval(() => {
      if (pollingCount >= MAX_POLLS) {
        // Timeout
        clearInterval(interval);
        setTransferState("error");
        setErrorMessage("Transaction confirmation timeout after 5 minutes. The transaction may still be pending. Please check the blockchain explorer.");
        toast({
          variant: "destructive",
          title: "Confirmation Timeout",
          description: "Transaction took too long to confirm. Please check the blockchain explorer.",
        });
      } else {
        checkTransactionStatus();
      }
    }, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [transferState, transactionHash, pollingCount, walletOptions, form, toast]);

  /**
   * Handle fee data selection from GasEstimatorEIP1559
   * Converts EIP1559FeeData to GasEstimate format for TransferService
   */
  const handleFeeDataSelect = (feeData: EIP1559FeeData) => {
    setSelectedFeeData(feeData);
    
    // Convert to GasEstimate format for backward compatibility with TransferService
    const estimatedGasLimit = '21000'; // Standard ETH transfer gas limit
    const estimatedCost = feeData.maxFeePerGas 
      ? ethers.formatEther(BigInt(estimatedGasLimit) * BigInt(feeData.maxFeePerGas))
      : '0';
    
    setGasEstimate({
      gasLimit: estimatedGasLimit,
      gasPrice: feeData.gasPrice || '',
      maxFeePerGas: feeData.maxFeePerGas || '',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || '',
      estimatedCost
    });
  };

  const initializeData = async () => {
    try {
      setLoadingWallets(true);
      
      // Get primary project
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
      
      // Fetch all wallet types with balances
      const wallets = await internalWalletService.refreshAllBalances(project.id);

      setAllWallets(wallets);

      // Convert to unified wallet options with proper balance formatting
      const options: WalletOption[] = [
        ...wallets.projectWallets.map(w => {
          // Get numeric chain ID from wallet data
          const chainIdNum = w.chainId ? parseInt(w.chainId, 10) : undefined;
          
          // Properly map chainId to blockchain name
          let blockchain = w.network;
          if (!blockchain && chainIdNum && !isNaN(chainIdNum)) {
            blockchain = getChainName(chainIdNum);
          }
          // Fallback to 'ethereum' if no valid blockchain found
          blockchain = blockchain || 'ethereum';
          
          return {
            id: w.id,
            address: w.address,
            name: `${w.walletType} (Project)`,
            type: 'project' as const,
            balance: w.balance?.nativeBalance || '0',
            blockchain: blockchain,
            network: blockchain,
            chainId: chainIdNum && !isNaN(chainIdNum) ? chainIdNum : getChainId(blockchain) // ADDED: Store chain ID
          };
        }),
        ...wallets.userWallets.map(w => {
          // Get chain ID from blockchain name
          const chainIdNum = getChainId(w.blockchain || 'ethereum');
          
          return {
            id: w.id,
            address: w.address,
            name: `${w.userName || 'User'} Wallet`,
            type: 'user' as const,
            balance: w.balance?.nativeBalance || '0',
            blockchain: w.blockchain || 'ethereum',
            network: w.blockchain || 'ethereum',
            chainId: chainIdNum // ADDED: Store chain ID
          };
        }),
        ...wallets.multiSigWallets.map(w => {
          // Get chain ID from blockchain name
          const chainIdNum = getChainId(w.blockchain || 'ethereum');
          
          return {
            id: w.id,
            address: w.address,
            name: `${w.name} (Multi-Sig)`,
            type: 'multisig' as const,
            balance: w.balance?.nativeBalance || '0',
            blockchain: w.blockchain || 'ethereum',
            network: w.blockchain || 'ethereum',
            chainId: chainIdNum // ADDED: Store chain ID
          };
        })
      ];

      setWalletOptions(options);

      // Set first wallet as default and determine blockchain
      if (options.length > 0) {
        const firstWallet = options[0];
        form.setValue("fromWallet", firstWallet.id);
        
        // Set blockchain for gas estimation
        if (firstWallet.blockchain) {
          setSelectedBlockchain(firstWallet.blockchain);
          
          // Get chain ID and set available assets
          const chainId = getChainId(firstWallet.blockchain);
          if (chainId) {
            const assets = getAllAssets(chainId);
            setAvailableAssets(assets);
            
            // Auto-default asset to native token
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

  // Handle form submission
  const onSubmit = async (values: TransferFormValues) => {
    // Validate first
    const wallet = walletOptions.find(w => w.id === values.fromWallet);
    if (!wallet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected wallet not found",
      });
      return;
    }

    // Validate wallet has chain ID
    if (!wallet.chainId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Wallet ${wallet.name} has no chain ID configured`,
      });
      return;
    }

    // Build transfer params - using chainId as source of truth
    const transferParams: TransferParams = {
      from: wallet.address,
      to: values.toAddress,
      amount: values.amount,
      chainId: wallet.chainId, // Use chain ID from wallet data
      walletId: wallet.id,
      walletType: wallet.type === 'multisig' ? 'project' : wallet.type,
      ...(gasEstimate && {
        gasLimit: gasEstimate.gasLimit,
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
      })
    };

    // Validate transfer
    const validation = await transferService.validateTransfer(transferParams);
    
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: validation.errors.join(', '),
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      toast({
        title: "Warning",
        description: validation.warnings.join(', '),
      });
    }

    // Move to confirmation
    setTransferState("confirmation");
  };

  // Handle transfer confirmation and execution
  const handleConfirmTransfer = async () => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('Transfer already in progress, ignoring duplicate click');
      return;
    }
    
    try {
      setIsSubmitting(true);  // Lock the button
      setTransferState("processing");
      setTransactionStartTime(new Date()); // Track when transaction started
      setPollingCount(0); // Reset poll counter
      
      const values = form.getValues();
      const wallet = walletOptions.find(w => w.id === values.fromWallet);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Validate wallet has chain ID
      if (!wallet.chainId) {
        throw new Error(`Wallet ${wallet.name} has no chain ID configured`);
      }

      // Create transfer params - using chainId as source of truth
      const transferParams: TransferParams = {
        from: wallet.address,
        to: values.toAddress,
        amount: values.amount,
        chainId: wallet.chainId, // Use chain ID from wallet data
        walletId: wallet.id,
        walletType: wallet.type === 'multisig' ? 'project' : wallet.type,
        ...(gasEstimate && {
          gasLimit: gasEstimate.gasLimit,
          maxFeePerGas: gasEstimate.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
        })
      };

      // Execute transfer
      const result = await transferService.executeTransfer(transferParams);

      if (result.success) {
        setTransactionHash(result.transactionHash || null);
        // Don't immediately set to success - let polling handle status updates
        
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
      setIsSubmitting(false);  // Always reset the submission lock
    }
  };

  // Handle QR code scanning
  const handleQrScan = (address: string) => {
    form.setValue("toAddress", address);
    setShowQrScanner(false);
  };

  // Handle back button
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
    }
  };

  // Handle wallet selection change
  const handleWalletChange = (walletId: string) => {
    const wallet = walletOptions.find(w => w.id === walletId);
    if (wallet && wallet.blockchain) {
      setSelectedBlockchain(wallet.blockchain);
      
      // Update available assets based on chain
      const chainId = getChainId(wallet.blockchain);
      if (chainId) {
        const assets = getAllAssets(chainId);
        setAvailableAssets(assets);
        
        // Reset to native token when chain changes
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
    
    // Get network symbol
    const symbol = network?.toUpperCase() || 'ETH';
    return `${numBalance.toFixed(4)} ${symbol}`;
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Render transfer content based on state
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
                                      {wallet.blockchain || wallet.network || 'Unknown'}
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
                        Select the wallet to send from (project, user, or multi-sig)
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

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={FeePriority.LOW}>
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2">
                                <BatteryLow className="h-4 w-4" />
                                <span>Low</span>
                              </div>
                              <Badge variant="outline" className="ml-2">Low Cost</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value={FeePriority.MEDIUM}>
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2">
                                <BatteryMedium className="h-4 w-4" />
                                <span>Medium</span>
                              </div>
                              <Badge variant="outline" className="ml-2">Recommended</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value={FeePriority.HIGH}>
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                <span>High</span>
                              </div>
                              <Badge variant="outline" className="ml-2">Fast</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value={FeePriority.URGENT}>
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2">
                                <Rocket className="h-4 w-4" />
                                <span>Urgent</span>
                              </div>
                              <Badge variant="outline" className="ml-2">Highest Priority</Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Higher priority = Higher gas fees
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  {!gasEstimate && !isEstimating && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Fill in all fields to see gas estimate
                    </p>
                  )}
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
              gasOption: convertPriorityToGasOption(formValues.priority)
            }}
            onConfirm={handleConfirmTransfer} 
            onBack={() => setTransferState("input")} 
            isProcessing={isSubmitting}  // Pass the submission state
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
            details={{
              from: processingWallet?.address || form.getValues("fromWallet"),
              to: form.getValues("toAddress"),
              amount: form.getValues("amount"),
              asset: form.getValues("asset"), // Use the actual selected asset
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
              asset: form.getValues("asset"), // Use the actual selected asset
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
        {/* Gas Fee Estimator - Matching TokenDeployPageEnhanced design */}
        {/* Gas Fee Estimator - Using GasEstimatorEIP1559 like TokenDeployPageEnhanced */}
        <GasEstimatorEIP1559
          blockchain={selectedBlockchain}
          onSelectFeeData={handleFeeDataSelect}
          defaultPriority={form.watch("priority") || FeePriority.MEDIUM}
          showAdvanced={true}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Addresses</CardTitle>
            <CardDescription>Previously used addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentAddresses 
              onSelectAddress={(address) => {
                form.setValue("toAddress", address);
                setToAddressMode('custom');
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
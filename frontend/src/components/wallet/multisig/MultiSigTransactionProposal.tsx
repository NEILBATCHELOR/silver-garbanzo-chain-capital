import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FileText, AlertTriangle, CheckCircle, Loader2, Zap, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { multiSigProposalService } from '@/services/wallet/multiSig';
import { blockchainToChainType } from '@/services/wallet/AddressUtils';
import { supabase } from '@/infrastructure/database/client';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import GasEstimatorEIP1559, { type EIP1559FeeData } from '@/components/tokens/components/transactions/GasEstimatorEIP1559';
import { FeePriority } from '@/services/blockchain/FeeEstimator';
import { getChainInfo, getChainName, isEIP1559Supported as checkEIP1559Support } from '@/infrastructure/web3/utils/chainIds';
import { type GasEstimationResult } from '@/services/blockchain/EnhancedGasEstimationService';
import { type GasEstimate } from '@/services/wallet/TransferService';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { ethers } from 'ethers';

interface TransactionProposalProps {
  walletId: string;
  walletAddress: string;
  blockchain?: string;
  chainId?: number;
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
}

export function MultiSigTransactionProposal({ 
  walletId, 
  walletAddress,
  blockchain = 'ethereum',
  chainId,
  onSuccess,
  onCancel 
}: TransactionProposalProps) {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [addressInputMode, setAddressInputMode] = useState<'select' | 'manual'>('manual');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [availableAddresses, setAvailableAddresses] = useState<Array<{
    address: string;
    name: string;
    id: string;
  }>>([]);
  const [value, setValue] = useState('0');
  const [data, setData] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [isCreating, setIsCreating] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  
  // Gas estimation state - EXACT match with TransferTab.tsx
  const [gasConfigMode, setGasConfigMode] = useState<'estimator' | 'manual'>('estimator');
  const [gasPrice, setGasPrice] = useState<string>('20'); // Default 20 Gwei
  const [gasLimit, setGasLimit] = useState<number>(21000); // Default 21k gas for transfers
  const [showGasConfig, setShowGasConfig] = useState<boolean>(true); // SHOW EXPANDED BY DEFAULT
  const [estimatedGasData, setEstimatedGasData] = useState<EIP1559FeeData | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<FeePriority>(FeePriority.MEDIUM);
  
  // EIP-1559 specific state
  const [maxFeePerGas, setMaxFeePerGas] = useState<string>('');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState<string>('');
  const [isEIP1559Network, setIsEIP1559Network] = useState<boolean>(false);
  
  // Legacy compatibility
  const [selectedFeeData, setSelectedFeeData] = useState<EIP1559FeeData | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [gasEstimationResult, setGasEstimationResult] = useState<GasEstimationResult | null>(null);
  
  const [proposalResult, setProposalResult] = useState<{
    proposalId: string;
    onChainTxId: number | null;
    transactionHash: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detect EIP-1559 support for the current blockchain
  useEffect(() => {
    if (chainId) {
      const isEIP1559 = checkEIP1559Support(chainId);
      setIsEIP1559Network(isEIP1559);
      
      const chainInfo = getChainInfo(chainId);
      console.log(`🔗 Network ${chainInfo?.name || blockchain} (${chainId}): EIP-1559 ${isEIP1559 ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
      
      // Set default values for EIP-1559 networks
      if (isEIP1559 && !maxFeePerGas && !maxPriorityFeePerGas) {
        setMaxFeePerGas('20');
        setMaxPriorityFeePerGas('1.5');
      }
    }
  }, [chainId, blockchain, maxFeePerGas, maxPriorityFeePerGas]);

  // Load available multi-sig wallet addresses (excluding current wallet)
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const { data, error } = await supabase
          .from('multi_sig_wallets')
          .select('id, name, address')
          .neq('address', walletAddress)
          .order('name');

        if (error) throw error;

        setAvailableAddresses(data || []);
      } catch (err) {
        console.error('Error loading addresses:', err);
      }
    };

    loadAddresses();
  }, [walletAddress]);

  /**
   * Check if a chain supports EIP-1559
   * Uses centralized chain metadata from chainIds.ts
   */
  const isChainEIP1559Compatible = (chainId: number): boolean => {
    return checkEIP1559Support(chainId);
  };

  /**
   * Handle gas estimation from GasEstimatorEIP1559 component
   * EXACT match with TransferTab.tsx
   */
  const handleFeeDataSelect = useCallback((feeData: EIP1559FeeData) => {
    setEstimatedGasData(feeData);
    setSelectedFeeData(feeData); // Keep for legacy compatibility
    
    // Track priority from GasEstimatorEIP1559
    if (feeData.priority) {
      setSelectedPriority(feeData.priority as FeePriority);
    }
    
    // Determine if network supports EIP-1559
    // CRITICAL: Check chain metadata FIRST, then fall back to runtime detection
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
      if (feeData.gasPrice) {
        const gasPriceGwei = (Number(feeData.gasPrice) / 1e9).toFixed(2);
        setGasPrice(gasPriceGwei);
      }
    }
    
    // Set default gas limit if not already set
    if (!gasLimit || gasLimit === 21000) {
      setGasLimit(21000); // Simple transfer default
    }
    
    console.log('📊 Gas estimate received:', {
      maxFeePerGas: feeData.maxFeePerGas ? `${ethers.formatUnits(feeData.maxFeePerGas, 'gwei')} Gwei` : undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? `${ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')} Gwei` : undefined,
      baseFeePerGas: feeData.baseFeePerGas ? `${ethers.formatUnits(feeData.baseFeePerGas, 'gwei')} Gwei` : undefined,
      gasPrice: feeData.gasPrice ? `${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei` : undefined,
      priority: feeData.priority,
      networkCongestion: feeData.networkCongestion
    });
  }, [chainId, gasLimit]);

  // Real-time gas estimation when form values change - EXACT match with TransferTab.tsx
  useEffect(() => {
    const estimateGas = async () => {
      try {
        // Validate all required fields are filled
        if (!walletAddress || !to || !value) {
          setGasEstimationResult(null);
          return;
        }

        // Validate amount is a valid number
        const amount = parseFloat(value);
        if (isNaN(amount) || amount < 0) {
          setGasEstimationResult(null);
          return;
        }

        if (!blockchain || !chainId) {
          setGasEstimationResult(null);
          return;
        }

        setIsEstimating(true);

        // Get provider for the blockchain
        const rpcConfig = rpcManager.getProviderConfig(blockchain as any, 'testnet');
        if (!rpcConfig) {
          console.error('RPC configuration not found for blockchain:', blockchain);
          setIsEstimating(false);
          return;
        }

        const provider = new ethers.JsonRpcProvider(rpcConfig.url);

        // Determine if it's a contract call based on data field
        const isContractCall = data && data !== '0x' && data.trim().length > 2;

        // Estimate gas for the transaction
        let estimatedGas: bigint;
        let transactionData: string = data || '0x';

        if (isContractCall) {
          // Contract call - use provided data
          estimatedGas = await provider.estimateGas({
            from: walletAddress,
            to: to,
            data: transactionData,
            value: ethers.parseEther(value || '0')
          });
        } else {
          // Native token transfer
          const valueInWei = ethers.parseEther(value || '0');
          estimatedGas = await provider.estimateGas({
            from: walletAddress,
            to: to,
            value: valueInWei
          });
        }

        // Add 10% safety buffer
        const recommendedGasLimit = (estimatedGas * 110n) / 100n;

        // Use the selected fee data from GasEstimatorEIP1559
        if (selectedFeeData) {
          // Calculate estimated cost
          const maxFeePerGas = selectedFeeData.maxFeePerGas ? BigInt(selectedFeeData.maxFeePerGas) : 0n;
          const estimatedCostWei = recommendedGasLimit * maxFeePerGas;
          const estimatedCostEth = ethers.formatEther(estimatedCostWei);

          const result: GasEstimationResult = {
            estimatedGasLimit: estimatedGas,
            recommendedGasLimit: recommendedGasLimit,
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
              gasLimit: recommendedGasLimit.toString(),
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
          setGasLimit(Number(recommendedGasLimit));

          // Update the gasEstimate for backward compatibility
          setGasEstimate({
            gasLimit: result.recommendedGasLimit.toString(),
            gasPrice: result.gasPrice?.toString() || '',
            maxFeePerGas: result.maxFeePerGas?.toString() || '',
            maxPriorityFeePerGas: result.maxPriorityFeePerGas?.toString() || '',
            baseFeePerGas: selectedFeeData.baseFeePerGas,
            estimatedCost: result.estimatedCostNative
          });
        }

      } catch (error) {
        console.error('Gas estimation error:', error);
        setGasEstimationResult(null);
        setGasEstimate(null);
        
        // Only show toast if user has filled all fields
        if (walletAddress && to && value) {
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
  }, [value, to, data, walletAddress, selectedFeeData, blockchain, chainId, toast]);

  /**
   * Get network-specific gas recommendations
   * EXACT match with TransferTab.tsx
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
    
    return recommendations[blockchain] || { price: '20', limit: 21000, note: 'Default: 20 Gwei' };
  };
  
  /**
   * Handle manual gas price change
   * EXACT match with TransferTab.tsx
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
   * EXACT match with TransferTab.tsx
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
          baseFeePerGas: estimatedGasData?.baseFeePerGas,
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
  useEffect(() => {
    if (gasConfigMode === 'manual') {
      updateManualGasEstimate();
    }
  }, [gasConfigMode, gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, isEIP1559Network]);

  /**
   * Calculate estimated transaction cost using REAL estimation data
   * EXACT match with TransferTab.tsx approach
   */
  const calculateEstimatedCost = useCallback(() => {
    if (!gasEstimationResult) {
      return '~0.001 ETH'; // Realistic fallback
    }
    
    // Get currency symbol based on blockchain
    const currencySymbol = blockchain.toUpperCase().includes('ETH') || blockchain === 'ethereum' 
      ? 'ETH' 
      : blockchain.toUpperCase();
    
    return `~${parseFloat(gasEstimationResult.estimatedCostNative).toFixed(6)} ${currencySymbol}`;
  }, [gasEstimationResult, blockchain]);

  const validateForm = useCallback(() => {
    // Validate destination address
    if (!to.trim()) {
      setError('Please enter a destination address');
      return false;
    }

    const addressPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!addressPattern.test(to)) {
      setError('Invalid destination address format (must be 0x...)');
      return false;
    }

    // Validate value
    const valueNum = parseFloat(value);
    if (isNaN(valueNum) || valueNum < 0) {
      setError('Value must be a positive number or zero');
      return false;
    }

    // Validate data (if provided)
    if (data && !data.startsWith('0x')) {
      setError('Data must start with 0x (or leave empty)');
      return false;
    }

    // Validate expiry
    if (expiryHours < 1 || expiryHours > 168) {
      setError('Expiry must be between 1 and 168 hours (7 days)');
      return false;
    }

    // Validate gas configuration for manual mode
    if (gasConfigMode === 'manual') {
      if (isEIP1559Network) {
        if (!maxFeePerGas || parseFloat(maxFeePerGas) <= 0) {
          setError('Max Fee Per Gas must be greater than 0');
          return false;
        }
        if (!maxPriorityFeePerGas || parseFloat(maxPriorityFeePerGas) < 0) {
          setError('Max Priority Fee must be 0 or greater');
          return false;
        }
        
        // Validate Max Fee >= Base Fee + Priority Fee
        if (estimatedGasData?.baseFeePerGas) {
          const baseFeeGwei = Number(estimatedGasData.baseFeePerGas) / 1e9;
          const minMaxFee = baseFeeGwei + parseFloat(maxPriorityFeePerGas);
          if (parseFloat(maxFeePerGas) < minMaxFee) {
            setError(`Max Fee (${maxFeePerGas} Gwei) must be at least ${minMaxFee.toFixed(2)} Gwei (Base ${baseFeeGwei.toFixed(2)} + Priority ${maxPriorityFeePerGas})`);
            return false;
          }
        }
      } else {
        if (!gasPrice || parseFloat(gasPrice) <= 0) {
          setError('Gas Price must be greater than 0');
          return false;
        }
      }
      
      if (!gasLimit || gasLimit < 21000) {
        setError('Gas Limit must be at least 21,000');
        return false;
      }
    }

    return true;
  }, [to, value, data, expiryHours, gasConfigMode, isEIP1559Network, maxFeePerGas, maxPriorityFeePerGas, gasPrice, gasLimit, estimatedGasData]);

  const handleCreate = async () => {
    try {
      setError(null);
      setProposalResult(null);

      if (!validateForm()) {
        return;
      }

      // Create gas estimate from manual mode if applicable, otherwise ensure automatic estimate exists
      let finalGasEstimate = gasEstimate;
      
      if (gasConfigMode === 'manual') {
        // Create gas estimate from manual values
        finalGasEstimate = {
          gasLimit: gasLimit.toString(),
          gasPrice: isEIP1559Network ? undefined : ethers.parseUnits(gasPrice, 'gwei').toString(),
          maxFeePerGas: isEIP1559Network ? ethers.parseUnits(maxFeePerGas, 'gwei').toString() : undefined,
          maxPriorityFeePerGas: isEIP1559Network ? ethers.parseUnits(maxPriorityFeePerGas, 'gwei').toString() : undefined,
          baseFeePerGas: estimatedGasData?.baseFeePerGas,
          estimatedCost: isEIP1559Network
            ? ((parseFloat(maxFeePerGas) * gasLimit) / 1e9).toFixed(6)
            : ((parseFloat(gasPrice) * gasLimit) / 1e9).toFixed(6)
        };
        
        console.log('✅ Using manual gas configuration:', finalGasEstimate);
      } else if (!finalGasEstimate) {
        setError('Gas estimation required. Please wait for estimation to complete or switch to manual mode.');
        return;
      }

      setIsCreating(true);

      // Map blockchain name to ChainType for address validation
      const chainType = blockchainToChainType(blockchain);

      // Validate and convert value to wei (base units with 18 decimals for native currency)
      let valueInWei = '0';
      if (value && value !== '0') {
        // Validate that value is a valid decimal number
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Invalid amount: Please enter a valid positive number');
        }
        try {
          valueInWei = ethers.parseUnits(value, 18).toString();
        } catch (err: any) {
          throw new Error(`Invalid amount format: ${err.message}`);
        }
      }

      // Step 1: Create proposal in database
      const proposal = await multiSigProposalService.createProposal(
        walletId,
        {
          to,
          value: valueInWei,
          data: data || '0x'
        },
        chainType,
        expiryHours
      );

      // NOTE: Do NOT submit to contract immediately - must collect signatures first
      // Submission will happen later via SignatureCollectionDashboard or PendingProposalsCard
      // when threshold is met

      setProposalResult({
        proposalId: proposal.id,
        onChainTxId: null,
        transactionHash: null
      });

      toast({
        title: 'Proposal Created!',
        description: `Transaction proposal created successfully. Collect required signatures to execute.`,
      });

      // Notify parent
      if (onSuccess) {
        onSuccess(proposal.id);
      }

    } catch (err: any) {
      console.error('Proposal creation error:', err);
      setError(err.message || 'Failed to create proposal');
      toast({
        title: 'Error',
        description: err.message || 'Failed to create proposal',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setTo('');
    setValue('0');
    setData('');
    setExpiryHours(24);
    setProposalResult(null);
    setError(null);
    setGasEstimationResult(null);
    setGasEstimate(null);
  };

  // Show success screen if proposal created
  if (proposalResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Transaction Proposal Created
          </CardTitle>
          <CardDescription>
            Your transaction has been submitted to the multi-sig wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Proposal ID */}
          <div className="space-y-2">
            <Label>Proposal ID</Label>
            <div className="flex items-center gap-2">
              <Input
                value={proposalResult.proposalId}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(proposalResult.proposalId);
                  toast({ title: 'Copied', description: 'Proposal ID copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* On-Chain TX ID */}
          <div className="space-y-2">
            <Label>On-Chain Transaction ID</Label>
            <Badge variant="outline" className="font-mono text-sm">
              #{proposalResult.onChainTxId}
            </Badge>
          </div>

          {/* Transaction Hash */}
          <div className="space-y-2">
            <Label>Submission Transaction Hash</Label>
            <div className="flex items-center gap-2">
              <Input
                value={proposalResult.transactionHash}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(proposalResult.transactionHash);
                  toast({ title: 'Copied', description: 'Transaction hash copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Success Info */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Your transaction proposal has been created and submitted to the blockchain. 
              Other wallet owners can now sign this transaction. Once the required threshold 
              is met, the transaction will be automatically executed.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleReset}
            >
              Create Another
            </Button>
            <Button
              onClick={onCancel}
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Create Transaction Proposal
        </CardTitle>
        <CardDescription>
          Propose a new transaction for multi-sig approval
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
              {(() => {
                if (chainId) {
                  const chainInfo = getChainInfo(chainId);
                  return chainInfo?.name || blockchain;
                }
                return blockchain;
              })()}
            </Badge>
          </div>
        </div>

        {/* To Address */}
        <div className="space-y-2">
          <Label htmlFor="to">To Address *</Label>
          
          {/* Mode Selector */}
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              variant={addressInputMode === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setAddressInputMode('select');
                setTo(''); // Clear manual input
              }}
              disabled={isCreating}
            >
              Select Wallet
            </Button>
            <Button
              type="button"
              variant={addressInputMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setAddressInputMode('manual');
                setSelectedWalletId(''); // Clear selection
                setTo(''); // Clear manual input
              }}
              disabled={isCreating}
            >
              Bespoke Address
            </Button>
          </div>

          {addressInputMode === 'select' ? (
            <Select
              value={selectedWalletId}
              onValueChange={(value) => {
                setSelectedWalletId(value);
                const wallet = availableAddresses.find(w => w.id === value);
                if (wallet) {
                  setTo(wallet.address);
                }
              }}
              disabled={isCreating || availableAddresses.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a multi-sig wallet" />
              </SelectTrigger>
              <SelectContent>
                {availableAddresses.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.address.slice(0, 10)}...{wallet.address.slice(-8)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x..."
              className="font-mono"
              disabled={isCreating}
            />
          )}
          
          <p className="text-xs text-muted-foreground">
            {addressInputMode === 'select' 
              ? 'Select another multi-sig wallet from your organization'
              : 'Enter any destination address for the transaction'
            }
          </p>
        </div>

        {/* Value */}
        <div className="space-y-2">
          <Label htmlFor="value">Value (ETH) *</Label>
          <Input
            id="value"
            type="number"
            step="0.000001"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Amount of ETH to send (e.g., 0.99, 1.1, 5). Value is automatically converted to wei. Use 0 for contract calls.
          </p>
        </div>

        {/* Data */}
        <div className="space-y-2">
          <Label htmlFor="data">Data (Optional)</Label>
          <Textarea
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder="0x..."
            rows={4}
            className="font-mono text-sm"
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Encoded function call data for smart contract interaction (leave empty for simple transfers)
          </p>
        </div>

        {/* Gas Fee Visibility Alert - Show if gas estimate available */}
        {gasEstimationResult && !showGasConfig && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">
              Network Fee: {parseFloat(gasEstimationResult.estimatedCostNative).toFixed(6)} ETH
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
              Expand "Gas Configuration" below to review and edit network fees before continuing.
            </AlertDescription>
          </Alert>
        )}

        {/* Gas Configuration Section - EXACT match with TransferTab.tsx */}
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
              Configure gas price and limit for the transaction
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
                disabled={isCreating}
              />
            </div>
            
            {gasConfigMode === 'estimator' ? (
              // Automatic Gas Estimation with GasEstimatorEIP1559 component
              <div className="space-y-4">
                <GasEstimatorEIP1559
                  blockchain={blockchain}
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
                    disabled={isCreating}
                    placeholder="21000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: {getGasRecommendation().limit.toLocaleString()} (21k simple, 50-100k tokens, 150k+ contracts)
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
                          disabled={isCreating}
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
                          disabled={isCreating}
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
                        disabled={isCreating}
                        placeholder="20"
                      />
                      <span className="flex items-center text-sm text-muted-foreground">Gwei</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended: {getGasRecommendation().price} Gwei for {blockchain}
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
                            ? `${((parseFloat(maxFeePerGas || '0') * gasLimit) / 1e9).toFixed(6)} ETH`
                            : `${((parseFloat(gasPrice) * gasLimit) / 1e9).toFixed(6)} ETH`
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

        {/* Transaction Summary */}
        <div className="rounded-md border p-4 space-y-2">
          <h4 className="font-semibold text-sm">Transaction Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction Type:</span>
              <Badge variant="outline">
                {data && data !== '0x' && data.trim().length > 2 ? 'Contract Call' : 'Simple Transfer'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Gas:</span>
              <span className="font-medium">{calculateEstimatedCost()}</span>
            </div>
            {gasEstimationResult && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Gas Limit:</span>
                  <span className="text-muted-foreground">
                    {gasEstimationResult.recommendedGasLimit.toLocaleString()}
                  </span>
                </div>
                {isEIP1559Network && estimatedGasData?.maxFeePerGas && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Max Fee Per Gas:</span>
                    <span className="text-muted-foreground">
                      {(Number(estimatedGasData.maxFeePerGas) / 1e9).toFixed(2)} Gwei
                    </span>
                  </div>
                )}
                {!isEIP1559Network && estimatedGasData?.gasPrice && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Gas Price:</span>
                    <span className="text-muted-foreground">
                      {(Number(estimatedGasData.gasPrice) / 1e9).toFixed(2)} Gwei
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Expiry */}
        <div className="space-y-2">
          <Label htmlFor="expiry">Expiry (Hours) *</Label>
          <Input
            id="expiry"
            type="number"
            min="1"
            max="168"
            value={expiryHours}
            onChange={(e) => setExpiryHours(parseInt(e.target.value) || 24)}
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Time window for collecting signatures (1-168 hours, default: 24)
          </p>
        </div>

        {/* Warning for high-value transactions */}
        {parseFloat(value) > 1 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are proposing to send {value} ETH. Please verify the destination address carefully.
            </AlertDescription>
          </Alert>
        )}

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
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating || isEstimating}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || isEstimating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : isEstimating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Estimating Gas...
              </>
            ) : (
              'Create Proposal'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MultiSigTransactionProposal;

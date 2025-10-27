/**
 * Multi-Sig Transfer Form Component
 * Allows users to create transfer proposals for multi-sig wallets
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { multiSigApprovalService } from '@/services/wallet/multiSig/MultiSigApprovalService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Building2, User as UserIcon, Shield, Wallet as WalletIcon, QrCode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  internalWalletService, 
  type AllWallets 
} from '@/services/wallet/InternalWalletService';
import { useUser } from '@/hooks/auth/user/useUser';
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService';
import { getChainInfo, getChainId } from '@/infrastructure/web3/utils/chainIds';

// ============================================================================
// INTERFACES
// ============================================================================

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

interface MultiSigTransferFormProps {
  wallets: Array<{
    id: string;
    name: string;
    address: string;
    blockchain: string;
    threshold: number;
  }>;
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  walletId: string;
  title: string;
  description: string;
  toAddress: string;
  amount: string;
  tokenAddress: string;
  tokenSymbol: string;
}

interface FormErrors {
  walletId?: string;
  title?: string;
  toAddress?: string;
  amount?: string;
  tokenAddress?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MultiSigTransferForm: React.FC<MultiSigTransferFormProps> = ({
  wallets,
  onSuccess,
  onCancel
}) => {
  const { user } = useUser();
  
  // State
  const [formData, setFormData] = useState<FormData>({
    walletId: '',
    title: '',
    description: '',
    toAddress: '',
    amount: '',
    tokenAddress: '',
    tokenSymbol: 'ETH'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // To address mode: 'custom' for manual input, 'wallet' for wallet selection
  const [toAddressMode, setToAddressMode] = useState<'custom' | 'wallet'>('custom');
  
  // All available wallets for destination selection
  const [allWallets, setAllWallets] = useState<AllWallets>({
    projectWallets: [],
    userWallets: [],
    multiSigWallets: []
  });
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Selected wallet details
  const selectedWallet = wallets.find(w => w.id === formData.walletId);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    initializeWalletData();
  }, []);

  const initializeWalletData = async () => {
    try {
      setLoadingWallets(true);
      
      const project = await getPrimaryOrFirstProject();
      if (!project) {
        console.warn('No project found for wallet loading');
        setLoadingWallets(false);
        return;
      }
      
      setProjectId(project.id);
      
      const wallets = await internalWalletService.refreshAllBalances(project.id);
      setAllWallets(wallets);

      const options: WalletOption[] = [
        ...wallets.projectWallets.map(w => {
          const chainIdNum = w.chainId ? parseInt(w.chainId, 10) : undefined;
          const chainInfo = chainIdNum ? getChainInfo(chainIdNum) : null;
          const walletName = w.projectWalletName || chainInfo?.name || 'Project Wallet';
          
          return {
            id: w.id,
            address: w.address,
            name: `${walletName} (Project)`,
            type: 'project' as const,
            balance: w.balance?.nativeBalance || '0',
            blockchain: chainInfo?.name || 'Unknown',
            network: chainInfo?.name || 'Unknown',
            chainId: chainIdNum
          };
        }),
        ...wallets.userWallets.map(w => {
          // UserWallet has blockchain property as string name, convert to chain ID
          const chainIdNum = getChainId(w.blockchain || 'ethereum');
          const chainInfo = chainIdNum ? getChainInfo(chainIdNum) : null;
          
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
          // MultiSigWallet has blockchain property as string name, convert to chain ID
          const chainIdNum = getChainId(w.blockchain || 'ethereum');
          const chainInfo = chainIdNum ? getChainInfo(chainIdNum) : null;
          
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
    } catch (error) {
      console.error('Failed to initialize wallet data:', error);
    } finally {
      setLoadingWallets(false);
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Building2 className="h-4 w-4" />;
      case 'user':
        return <UserIcon className="h-4 w-4" />;
      case 'multisig':
        return <Shield className="h-4 w-4" />;
      default:
        return <WalletIcon className="h-4 w-4" />;
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

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.walletId) {
      newErrors.walletId = 'Please select a wallet';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.toAddress.trim()) {
      newErrors.toAddress = 'Destination address is required';
    } else if (!ethers.isAddress(formData.toAddress)) {
      newErrors.toAddress = 'Invalid Ethereum address';
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      try {
        const value = parseFloat(formData.amount);
        if (isNaN(value) || value <= 0) {
          newErrors.amount = 'Amount must be greater than 0';
        }
      } catch {
        newErrors.amount = 'Invalid amount';
      }
    }

    if (formData.tokenAddress && !ethers.isAddress(formData.tokenAddress)) {
      newErrors.tokenAddress = 'Invalid token address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous states
    setSubmitError(null);
    setSubmitSuccess(null);

    // Validate
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create proposal
      const proposal = await multiSigApprovalService.createTransferProposal({
        walletId: formData.walletId,
        title: formData.title,
        description: formData.description,
        toAddress: formData.toAddress,
        amount: formData.amount,
        tokenAddress: formData.tokenAddress || undefined,
        tokenSymbol: formData.tokenSymbol
      });

      setSubmitSuccess(
        `Proposal created successfully! ID: ${proposal.id}`
      );

      // Reset form
      setFormData({
        walletId: '',
        title: '',
        description: '',
        toAddress: '',
        amount: '',
        tokenAddress: '',
        tokenSymbol: 'ETH'
      });

      // Notify parent
      if (onSuccess) {
        onSuccess(proposal.id);
      }
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      setSubmitError(error.message || 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      walletId: '',
      title: '',
      description: '',
      toAddress: '',
      amount: '',
      tokenAddress: '',
      tokenSymbol: 'ETH'
    });
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Transfer Proposal</CardTitle>
        <CardDescription>
          Initiate a transfer from a multi-sig wallet. This will create a proposal
          that requires approval from {selectedWallet?.threshold || 'the required number of'} owner(s).
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wallet Selection - Enhanced with Details */}
          <div className="space-y-2">
            <Label htmlFor="wallet">Multi-Sig Wallet *</Label>
            <Select
              value={formData.walletId}
              onValueChange={(value) => handleInputChange('walletId', value)}
            >
              <SelectTrigger id="wallet" className={errors.walletId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select multi-sig wallet..." />
              </SelectTrigger>
              <SelectContent>
                {wallets.length > 0 ? (
                  wallets.map((wallet) => {
                    // Find matching wallet from walletOptions for additional details
                    const walletDetails = walletOptions.find(w => w.id === wallet.id);
                    const chainInfo = walletDetails?.chainId ? getChainInfo(walletDetails.chainId) : null;
                    
                    return (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">{wallet.name}</span>
                            <Badge variant="outline" className="ml-auto">
                              {chainInfo?.name || wallet.blockchain || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{formatAddress(wallet.address)}</span>
                            <span>•</span>
                            <span>Threshold: {wallet.threshold}</span>
                            {walletDetails?.balance && (
                              <>
                                <span>•</span>
                                <span>{formatBalance(walletDetails.balance, walletDetails.network)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="no-wallets" disabled>
                    No multi-sig wallets available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.walletId && (
              <p className="text-sm text-red-500">{errors.walletId}</p>
            )}
          </div>

          {/* Wallet Info Display */}
          {selectedWallet && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Blockchain:</span>
                  <span className="ml-2 font-medium">{selectedWallet.blockchain}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Signatures Required:</span>
                  <span className="ml-2 font-medium">{selectedWallet.threshold}</span>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Proposal Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Monthly Payment to Vendor"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide additional context for this transfer..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Destination Address - Enhanced with Wallet Selection */}
          <div className="space-y-2">
            <Label>Destination Address *</Label>
            <Tabs value={toAddressMode} onValueChange={(v) => setToAddressMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="custom">Custom Address</TabsTrigger>
                <TabsTrigger value="wallet">Select Wallet</TabsTrigger>
              </TabsList>
              
              <TabsContent value="custom" className="mt-2">
                <div className="space-y-2">
                  <Input
                    id="toAddress"
                    placeholder="0x..."
                    value={formData.toAddress}
                    onChange={(e) => handleInputChange('toAddress', e.target.value)}
                    className={errors.toAddress ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.toAddress && (
                    <p className="text-sm text-red-500">{errors.toAddress}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the recipient's wallet address
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="wallet" className="mt-2">
                <div className="space-y-2">
                  {loadingWallets ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading wallets...</span>
                    </div>
                  ) : (
                    <Select
                      onValueChange={(value) => {
                        handleInputChange('toAddress', value);
                        // Clear error when selecting from dropdown
                        if (errors.toAddress) {
                          setErrors(prev => ({ ...prev, toAddress: undefined }));
                        }
                      }}
                      value={formData.toAddress}
                    >
                      <SelectTrigger className={errors.toAddress ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select destination wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {walletOptions.length > 0 ? (
                          walletOptions.map((wallet) => {
                            const chainInfo = wallet.chainId ? getChainInfo(wallet.chainId) : null;
                            
                            return (
                              <SelectItem key={wallet.id} value={wallet.address}>
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center gap-2">
                                    {getWalletIcon(wallet.type)}
                                    <span className="font-medium">{wallet.name}</span>
                                    <Badge variant="outline" className="ml-auto">
                                      {chainInfo?.name || wallet.blockchain || 'Unknown'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono">{formatAddress(wallet.address)}</span>
                                    {wallet.balance && (
                                      <>
                                        <span>•</span>
                                        <span>{formatBalance(wallet.balance, wallet.network)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value="no-wallets" disabled>
                            No wallets available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.toAddress && (
                    <p className="text-sm text-red-500">{errors.toAddress}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select from your existing wallets
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="0.0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={errors.amount ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              <Input
                placeholder="Symbol"
                value={formData.tokenSymbol}
                onChange={(e) => handleInputChange('tokenSymbol', e.target.value)}
                className="w-24"
                disabled={isSubmitting}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Token Address (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="tokenAddress">Token Address (Optional)</Label>
            <Input
              id="tokenAddress"
              placeholder="0x... (leave empty for native token)"
              value={formData.tokenAddress}
              onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
              className={errors.tokenAddress ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.tokenAddress && (
              <p className="text-sm text-red-500">{errors.tokenAddress}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to transfer native tokens (ETH, MATIC, etc.)
            </p>
          </div>

          {/* Error Alert */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {submitSuccess && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                {submitSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || handleReset}
              disabled={isSubmitting}
            >
              {onCancel ? 'Cancel' : 'Reset'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.walletId}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Proposal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

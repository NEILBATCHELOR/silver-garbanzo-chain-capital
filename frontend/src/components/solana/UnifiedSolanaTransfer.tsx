/**
 * Unified Solana Transfer Component
 * 
 * Handles transfers for:
 * - Native SOL
 * - SPL tokens
 * - Token-2022 tokens
 * 
 * Features:
 * - Source wallet from dashboard header context
 * - Dropdown destination wallet selector
 * - Manual address entry
 * - Single and batch transfers
 * - Automatic ATA creation for tokens
 * - Fee estimation
 * - Transaction confirmation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/database/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Wallet,
  Plus,
  X
} from 'lucide-react';
import { modernSolanaTokenTransferService } from '@/services/wallet/solana/ModernSolanaTokenTransferService';
import { modernSolanaNativeTransferService } from '@/services/wallet/solana/ModernSolanaNativeTransferService';
import { solanaExplorer } from '@/infrastructure/web3/solana';
import { address, type Address } from '@solana/kit';
import { logActivity } from '@/infrastructure/activityLogger';
import { useSolanaWallet } from './contexts/SolanaWalletContext';
import type { ProjectWalletData } from '@/services/project/project-wallet-service';

// ============================================================================
// TYPES
// ============================================================================

interface TokenInfo {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  deployment: {
    contract_address: string;
    network: string;
  };
}

interface UnifiedTransferProps {
  projectId: string;
  tokenId?: string; // If provided, transfer this token; otherwise transfer SOL
  onTransferComplete?: () => void;
  embedded?: boolean; // If true, skip header/back button (for use in tabs)
}

interface BatchRecipient {
  address: string;
  amount: string;
  status?: 'pending' | 'success' | 'failed';
  signature?: string;
  error?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UnifiedSolanaTransfer({ 
  projectId, 
  tokenId,
  onTransferComplete,
  embedded = true // Default to true since we're primarily using in tabs
}: UnifiedTransferProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get wallet from context (already selected in dashboard header)
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Transfer mode: single or batch
  const [transferMode, setTransferMode] = useState<'single' | 'batch'>('single');

  // Single transfer state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [destinationWalletId, setDestinationWalletId] = useState<string>('manual');

  // Batch transfer state
  const [batchRecipients, setBatchRecipients] = useState<BatchRecipient[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);

  // Available wallets for dropdown
  const [availableWallets, setAvailableWallets] = useState<ProjectWalletData[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  // Validation state
  const [recipientError, setRecipientError] = useState('');
  const [amountError, setAmountError] = useState('');

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchRecipient[]>([]);

  // Load token on mount if tokenId provided
  useEffect(() => {
    if (tokenId) {
      loadToken();
    }
  }, [tokenId]);
  
  // Load destination wallets
  useEffect(() => {
    if (projectId && selectedWallet) {
      loadDestinationWallets();
    }
  }, [projectId, selectedWallet]);

  /**
   * Load token from database
   */
  const loadToken = async () => {
    try {
      setIsLoading(true);

      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('id, name, symbol, decimals')
        .eq('id', tokenId)
        .eq('project_id', projectId)
        .single();

      if (tokenError) throw tokenError;
      if (!tokenData) throw new Error('Token not found');

      const { data: deployment } = await supabase
        .from('token_deployments')
        .select('contract_address, network')
        .eq('token_id', tokenId)
        .in('status', ['success', 'deployed', 'SUCCESS', 'DEPLOYED'])
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();

      if (!deployment) {
        throw new Error('Token not deployed');
      }

      setToken({
        ...tokenData,
        deployment
      });
    } catch (error: any) {
      console.error('Error loading token:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load token',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load destination wallets from project_wallets
   * Excludes the currently selected funding wallet
   */
  const loadDestinationWallets = async () => {
    if (!selectedWallet) return;
    
    try {
      setIsLoadingWallets(true);

      const { data: wallets, error } = await supabase
        .from('project_wallets')
        .select('*')
        .eq('project_id', projectId)
        .eq('non_evm_network', 'solana')
        .neq('id', selectedWallet.id) // Exclude funding wallet
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAvailableWallets(wallets || []);
    } catch (error: any) {
      console.error('Error loading destination wallets:', error);
      toast({
        title: 'Warning',
        description: 'Could not load project wallets',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingWallets(false);
    }
  };

  /**
   * Handle destination wallet selection
   */
  const handleDestinationWalletChange = (value: string) => {
    setDestinationWalletId(value);
    
    if (value === 'manual') {
      // Clear recipient for manual entry
      setRecipient('');
    } else {
      // Set recipient to selected wallet address
      const wallet = availableWallets.find(w => w.id === value);
      if (wallet) {
        setRecipient(wallet.wallet_address);
        setRecipientError(''); // Clear any existing error
      }
    }
  };

  /**
   * Validate recipient address
   */
  const validateRecipient = (addr: string): boolean => {
    if (!addr) {
      setRecipientError('Recipient address is required');
      return false;
    }

    try {
      address(addr);
      setRecipientError('');
      return true;
    } catch {
      setRecipientError('Invalid Solana address');
      return false;
    }
  };

  /**
   * Validate amount
   */
  const validateAmount = (amt: string): boolean => {
    if (!amt) {
      setAmountError('Amount is required');
      return false;
    }

    const numAmount = parseFloat(amt);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      return false;
    }

    setAmountError('');
    return true;
  };

  /**
   * Handle single transfer (SOL or Token)
   */
  const handleSingleTransfer = async () => {
    // Validate inputs
    const isRecipientValid = validateRecipient(recipient);
    const isAmountValid = validateAmount(amount);

    if (!isRecipientValid || !isAmountValid) {
      return;
    }

    if (!selectedWallet || !selectedWallet.decryptedPrivateKey) {
      toast({
        title: 'Wallet Required',
        description: 'Please select a wallet in the dashboard header',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsTransferring(true);

      if (tokenId && token) {
        // Token transfer
        const decimals = token.decimals;
        const amountInSmallestUnit = BigInt(
          Math.floor(parseFloat(amount) * Math.pow(10, decimals))
        );

        const result = await modernSolanaTokenTransferService.transferTokens(
          {
            mint: address(token.deployment.contract_address),
            from: address(selectedWallet.wallet_address),
            to: address(recipient),
            amount: amountInSmallestUnit,
            decimals: decimals
          },
          {
            network: token.deployment.network as any,
            signerPrivateKey: selectedWallet.decryptedPrivateKey,
            createDestinationATA: true
          }
        );

        if (!result.success) {
          throw new Error(result.errors?.join(', ') || 'Transfer failed');
        }

        setTransactionHash(result.signature || '');
        
        toast({
          title: 'Transfer Successful',
          description: `Successfully transferred ${amount} ${token.symbol}`,
        });
      } else {
        // SOL transfer
        const amountInLamports = modernSolanaNativeTransferService.solToLamports(
          parseFloat(amount)
        );

        const result = await modernSolanaNativeTransferService.transferSol(
          {
            from: address(selectedWallet.wallet_address),
            to: address(recipient),
            amount: amountInLamports
          },
          {
            network: network as any,
            signerPrivateKey: selectedWallet.decryptedPrivateKey
          }
        );

        if (!result.success) {
          throw new Error(result.errors?.join(', ') || 'Transfer failed');
        }

        setTransactionHash(result.signature || '');
        
        toast({
          title: 'Transfer Successful',
          description: `Successfully transferred ${amount} SOL`,
        });
      }

      setTransferSuccess(true);
      onTransferComplete?.();

    } catch (error: any) {
      console.error('Transfer error:', error);
      
      toast({
        title: 'Transfer Failed',
        description: error.message || 'Failed to transfer',
        variant: 'destructive'
      });
    } finally {
      setIsTransferring(false);
    }
  };

  /**
   * Handle batch transfer (SOL or Token)
   */
  const handleBatchTransfer = async () => {
    if (batchRecipients.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please add at least one recipient',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedWallet || !selectedWallet.decryptedPrivateKey) {
      toast({
        title: 'Wallet Required',
        description: 'Please select a wallet in the dashboard header',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsTransferring(true);
      setBatchProgress(0);

      const results: BatchRecipient[] = [];

      for (let i = 0; i < batchRecipients.length; i++) {
        const recipient = batchRecipients[i];
        
        try {
          if (tokenId && token) {
            // Token transfer
            const decimals = token.decimals;
            const amountInSmallestUnit = BigInt(
              Math.floor(parseFloat(recipient.amount) * Math.pow(10, decimals))
            );

            const result = await modernSolanaTokenTransferService.transferTokens(
              {
                mint: address(token.deployment.contract_address),
                from: address(selectedWallet.wallet_address),
                to: address(recipient.address),
                amount: amountInSmallestUnit,
                decimals: decimals
              },
              {
                network: token.deployment.network as any,
                signerPrivateKey: selectedWallet.decryptedPrivateKey,
                createDestinationATA: true
              }
            );

            if (result.success) {
              results.push({
                ...recipient,
                status: 'success',
                signature: result.signature
              });
            } else {
              results.push({
                ...recipient,
                status: 'failed',
                error: result.errors?.join(', ') || 'Unknown error'
              });
            }
          } else {
            // SOL transfer
            const amountInLamports = modernSolanaNativeTransferService.solToLamports(
              parseFloat(recipient.amount)
            );

            const result = await modernSolanaNativeTransferService.transferSol(
              {
                from: address(selectedWallet.wallet_address),
                to: address(recipient.address),
                amount: amountInLamports
              },
              {
                network: network as any,
                signerPrivateKey: selectedWallet.decryptedPrivateKey
              }
            );

            if (result.success) {
              results.push({
                ...recipient,
                status: 'success',
                signature: result.signature
              });
            } else {
              results.push({
                ...recipient,
                status: 'failed',
                error: result.errors?.join(', ') || 'Unknown error'
              });
            }
          }
        } catch (error: any) {
          results.push({
            ...recipient,
            status: 'failed',
            error: error.message || 'Unknown error'
          });
        }

        setBatchProgress(((i + 1) / batchRecipients.length) * 100);
      }

      setBatchResults(results);
      setTransferSuccess(true);

      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;

      toast({
        title: 'Batch Transfer Complete',
        description: `${successful} successful, ${failed} failed`
      });

      onTransferComplete?.();

    } catch (error: any) {
      console.error('Batch transfer error:', error);
      
      toast({
        title: 'Batch Transfer Failed',
        description: error.message || 'Failed to complete batch transfer',
        variant: 'destructive'
      });
    } finally {
      setIsTransferring(false);
    }
  };

  /**
   * Add recipient to batch list
   */
  const addBatchRecipient = () => {
    setBatchRecipients([
      ...batchRecipients,
      { address: '', amount: '', status: 'pending' }
    ]);
  };

  /**
   * Remove recipient from batch list
   */
  const removeBatchRecipient = (index: number) => {
    setBatchRecipients(batchRecipients.filter((_, i) => i !== index));
  };

  /**
   * Update batch recipient
   */
  const updateBatchRecipient = (index: number, field: keyof BatchRecipient, value: string) => {
    const updated = [...batchRecipients];
    updated[index] = { ...updated[index], [field]: value };
    setBatchRecipients(updated);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assetSymbol = token ? token.symbol : 'SOL';
  const assetName = token ? token.name : 'Solana';

  // Success state
  if (transferSuccess && (transactionHash || batchResults.length > 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Transfer Complete
          </CardTitle>
          <CardDescription>
            Your {assetSymbol} transfer(s) completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single transfer result */}
          {transactionHash && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Transaction Confirmed</AlertTitle>
                <AlertDescription>
                  Transferred {amount} {assetSymbol} to {recipient.slice(0, 8)}...{recipient.slice(-8)}
                </AlertDescription>
              </Alert>

              <div>
                <Label>Transaction Hash</Label>
                <code className="block mt-2 bg-muted px-3 py-2 rounded text-sm break-all">
                  {transactionHash}
                </code>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(
                    solanaExplorer.tx(transactionHash, network as any),
                    '_blank'
                  )}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
              </div>
            </>
          )}

          {/* Batch transfer results */}
          {batchResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Batch Results</h3>
                <Badge variant="outline">
                  {batchResults.filter(r => r.status === 'success').length} / {batchResults.length} successful
                </Badge>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {batchResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono">
                        {result.address.slice(0, 8)}...{result.address.slice(-8)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{result.amount} {assetSymbol}</span>
                        {result.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {result.status === 'success' && result.signature && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => window.open(
                          solanaExplorer.tx(result.signature!, network as any),
                          '_blank'
                        )}
                      >
                        View Transaction
                      </Button>
                    )}
                    {result.status === 'failed' && result.error && (
                      <p className="text-xs text-red-500 mt-1">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => {
              setTransferSuccess(false);
              setTransactionHash('');
              setRecipient('');
              setAmount('');
              setBatchResults([]);
              setBatchRecipients([]);
              setDestinationWalletId('manual');
            }}
          >
            Transfer More {assetSymbol}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Transfer form
  return (
    <div className="space-y-6">
      {/* Header - Only show if not embedded */}
      {!embedded && (
        <>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Transfer {assetSymbol}</h2>
              <p className="text-muted-foreground">Send {assetName} to other wallets</p>
            </div>
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Double-check recipient addresses before sending. Transactions on Solana are
              irreversible.
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Warning for embedded mode */}
      {embedded && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Double-check recipient addresses before sending. Transactions on Solana are
            irreversible.
          </AlertDescription>
        </Alert>
      )}

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>
            Send {assetSymbol} to one or multiple recipients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Funding Wallet (Read-only, from Dashboard Header) */}
          <div className="space-y-2">
            <Label>Funding Wallet</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {selectedWallet?.project_wallet_name || 'Wallet'}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedWallet?.wallet_address ? 
                    `${selectedWallet.wallet_address.slice(0, 8)}...${selectedWallet.wallet_address.slice(-8)}` : 
                    'No wallet selected'}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {network}
              </Badge>
            </div>
            {!selectedWallet && (
              <p className="text-sm text-destructive">
                Please select a wallet in the dashboard header
              </p>
            )}
          </div>

          {/* Transfer Mode Tabs */}
          <Tabs value={transferMode} onValueChange={(v) => setTransferMode(v as 'single' | 'batch')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Transfer</TabsTrigger>
              <TabsTrigger value="batch">Batch Transfer</TabsTrigger>
            </TabsList>

            {/* Single Transfer Tab */}
            <TabsContent value="single" className="space-y-4 mt-4">
              {/* Destination Wallet Selector */}
              <div className="space-y-2">
                <Label htmlFor="destination-wallet">Destination</Label>
                <Select
                  value={destinationWalletId}
                  onValueChange={handleDestinationWalletChange}
                >
                  <SelectTrigger id="destination-wallet">
                    <SelectValue placeholder="Select destination or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Address Entry</SelectItem>
                    {isLoadingWallets ? (
                      <SelectItem value="loading" disabled>
                        Loading wallets...
                      </SelectItem>
                    ) : availableWallets.length === 0 ? (
                      <SelectItem value="no-wallets" disabled>
                        No other project wallets available
                      </SelectItem>
                    ) : (
                      availableWallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {wallet.project_wallet_name || `${wallet.wallet_address.slice(0, 8)}...${wallet.wallet_address.slice(-4)}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Recipient Address */}
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  placeholder="Enter Solana address..."
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (recipientError) validateRecipient(e.target.value);
                  }}
                  onBlur={() => validateRecipient(recipient)}
                  className={recipientError ? 'border-red-500' : ''}
                  disabled={destinationWalletId !== 'manual'}
                />
                {recipientError && (
                  <p className="text-sm text-red-500">{recipientError}</p>
                )}
                {destinationWalletId !== 'manual' && (
                  <p className="text-xs text-muted-foreground">
                    Using address from selected project wallet
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount ({assetSymbol})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (amountError) validateAmount(e.target.value);
                  }}
                  onBlur={() => validateAmount(amount)}
                  className={amountError ? 'border-red-500' : ''}
                />
                {amountError && (
                  <p className="text-sm text-red-500">{amountError}</p>
                )}
                {token && (
                  <p className="text-sm text-muted-foreground">
                    Token has {token.decimals} decimals
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                className="w-full"
                onClick={handleSingleTransfer}
                disabled={isTransferring || !recipient || !amount || !selectedWallet}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Transfer {assetSymbol}
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Batch Transfer Tab */}
            <TabsContent value="batch" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>Recipients ({batchRecipients.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBatchRecipient}
                  disabled={isTransferring}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {batchRecipients.map((recipient, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 border rounded-lg"
                  >
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Recipient address"
                        value={recipient.address}
                        onChange={(e) =>
                          updateBatchRecipient(index, 'address', e.target.value)
                        }
                        disabled={isTransferring}
                      />
                      <Input
                        type="number"
                        placeholder={`Amount (${assetSymbol})`}
                        value={recipient.amount}
                        onChange={(e) =>
                          updateBatchRecipient(index, 'amount', e.target.value)
                        }
                        disabled={isTransferring}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBatchRecipient(index)}
                      disabled={isTransferring}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {batchRecipients.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No recipients added yet. Click "Add Recipient" to start.
                  </p>
                )}
              </div>

              {/* Batch Progress */}
              {isTransferring && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Processing transfers... {Math.round(batchProgress)}%
                  </p>
                </div>
              )}

              {/* Submit Batch */}
              <Button
                className="w-full"
                onClick={handleBatchTransfer}
                disabled={isTransferring || batchRecipients.length === 0 || !selectedWallet}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {batchRecipients.length} Recipient(s)
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default UnifiedSolanaTransfer;

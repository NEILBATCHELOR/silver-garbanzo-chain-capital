/**
 * Solana Token Transfer Form
 * Interface for transferring SPL and Token-2022 tokens
 * 
 * Features:
 * - Transfer to any Solana address
 * - Automatic ATA creation
 * - Balance checks
 * - Fee estimation
 * - Transaction confirmation
 * - Explorer links
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { modernSolanaTokenTransferService } from '@/services/wallet/solana/ModernSolanaTokenTransferService';
import { solanaTokenTransactionService } from '@/services/tokens/SolanaTokenTransactionService';
import { solanaExplorer } from '@/infrastructure/web3/solana';
import { address, type Address } from '@solana/kit';
import { logActivity } from '@/infrastructure/activityLogger';
import { SolanaWalletSelector, type SelectedSolanaWallet } from './SolanaWalletSelector';
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

interface TransferTokenFormProps {
  projectId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TransferTokenForm({ projectId }: TransferTokenFormProps) {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);

  // Transfer progress tracking
  type TransferStage = 'idle' | 'validating' | 'preparing' | 'sending' | 'confirming' | 'complete';
  const [transferStage, setTransferStage] = useState<TransferStage>('idle');

  const stageMessages: Record<TransferStage, string> = {
    idle: '',
    validating: 'Validating transaction...',
    preparing: 'Preparing transfer...',
    sending: 'Sending transaction...',
    confirming: 'Waiting for confirmation...',
    complete: 'Transfer complete!'
  };

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<SelectedSolanaWallet | null>(null);

  // Validation state
  const [recipientError, setRecipientError] = useState('');
  const [amountError, setAmountError] = useState('');

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Load token on mount
  useEffect(() => {
    if (tokenId) {
      loadToken();
    }
  }, [tokenId]);

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
        .eq('status', 'deployed')
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
      navigate(-1);
    } finally {
      setIsLoading(false);
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
   * Handle transfer
   */
  const handleTransfer = async () => {
    if (!token) return;

    // Validate inputs
    const isRecipientValid = validateRecipient(recipient);
    const isAmountValid = validateAmount(amount);

    if (!isRecipientValid || !isAmountValid) {
      return;
    }

    if (!selectedWallet) {
      toast({
        title: 'Wallet Required',
        description: 'Please select a wallet to transfer from',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsTransferring(true);
      setTransferStage('validating');

      // Convert amount to smallest unit
      const decimals = token.decimals;
      const amountInSmallestUnit = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, decimals))
      );

      setTransferStage('preparing');

      setTransferStage('sending');

      // Execute transfer
      const result = await modernSolanaTokenTransferService.transferTokens(
        {
          mint: address(token.deployment.contract_address),
          from: address(selectedWallet.address),
          to: address(recipient),
          amount: amountInSmallestUnit,
          decimals: decimals
        },
        {
          network: token.deployment.network as any,
          signerPrivateKey: selectedWallet.privateKey,
          createDestinationATA: true
        }
      );

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Transfer failed');
      }

      setTransferStage('confirming');

      // Log to database
      await solanaTokenTransactionService.logTransfer({
        token_id: token.id,
        token_address: token.deployment.contract_address,
        token_symbol: token.symbol,
        from_address: selectedWallet.address,
        to_address: recipient,
        amount: amountInSmallestUnit.toString(),
        decimals: decimals,
        transaction_hash: result.signature || '',
        network: token.deployment.network,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        project_id: projectId
      });

      // Log activity
      await logActivity({
        action: 'solana_token_transfer',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          token_id: token.id,
          token_symbol: token.symbol,
          recipient,
          amount,
          transaction_hash: result.signature,
          network: token.deployment.network
        }
      });

      setTransactionHash(result.signature || '');
      setTransferSuccess(true);
      setTransferStage('complete');

      toast({
        title: 'Transfer Successful',
        description: `Successfully transferred ${amount} ${token.symbol}`,
      });
    } catch (error: any) {
      console.error('Transfer error:', error);
      
      // Display user-friendly error message
      const errorMessage = error.message || 'Failed to transfer tokens';
      const errorLines = errorMessage.split('\n');
      
      toast({
        title: 'Transfer Failed',
        description: (
          <div className="space-y-1">
            <p>{errorLines[0]}</p>
            {errorLines[1] && (
              <p className="text-xs text-muted-foreground mt-1">{errorLines[1]}</p>
            )}
          </div>
        ),
        variant: 'destructive'
      });
    } finally {
      setIsTransferring(false);
      if (!transferSuccess) {
        setTransferStage('idle');
      }
    }
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

  if (!token) {
    return null;
  }

  // Success state
  if (transferSuccess && transactionHash) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Transfer Successful
          </CardTitle>
          <CardDescription>
            Your tokens have been transferred successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Transaction Confirmed</AlertTitle>
            <AlertDescription>
              Transferred {amount} {token.symbol} to {recipient}
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
                solanaExplorer.tx(transactionHash, token.deployment.network as any),
                '_blank'
              )}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Solana Explorer
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(
                solanaExplorer.txSolscan(transactionHash, token.deployment.network as any),
                '_blank'
              )}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Solscan
            </Button>
          </div>

          <Button
            className="w-full"
            onClick={() => navigate(`../${tokenId}/details`)}
          >
            View Token Details
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setTransferSuccess(false);
              setTransactionHash('');
              setRecipient('');
              setAmount('');
              setSelectedWallet(null);
            }}
          >
            Transfer More Tokens
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Transfer form
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Transfer {token.symbol}</h2>
          <p className="text-muted-foreground">Send tokens to another wallet</p>
        </div>
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Double-check the recipient address before sending. Transactions on Solana are
          irreversible.
        </AlertDescription>
      </Alert>

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>
            Enter the recipient address and amount to transfer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient */}
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
            />
            {recipientError && (
              <p className="text-sm text-red-500">{recipientError}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount ({token.symbol})
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
            <p className="text-sm text-muted-foreground">
              Token has {token.decimals} decimals
            </p>
          </div>

          {/* Wallet Selector */}
          <SolanaWalletSelector
            projectId={projectId}
            network={token.deployment.network as any}
            onWalletSelected={(wallet) => setSelectedWallet(wallet)}
            onError={(error) => toast({
              title: 'Wallet Error',
              description: error,
              variant: 'destructive'
            })}
            label="Source Wallet"
            description="Select the wallet to transfer from"
            required
            autoSelectFirst
          />

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleTransfer}
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
                Transfer {token.symbol}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default TransferTokenForm;

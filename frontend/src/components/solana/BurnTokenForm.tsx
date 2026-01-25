/**
 * Solana Token Burn Form
 * Interface for burning SPL and Token-2022 tokens
 * 
 * Features:
 * - Burn tokens from wallet
 * - Balance validation
 * - Burn confirmation dialog
 * - Transaction tracking
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Flame,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Wallet
} from 'lucide-react';
import { modernSolanaTokenBurnService } from '@/services/wallet/solana/ModernSolanaTokenBurnService';
import { solanaExplorer } from '@/infrastructure/web3/solana';
import { address, type Address } from '@solana/kit';
import { logActivity } from '@/infrastructure/activityLogger';
import { useSolanaWallet } from './contexts/SolanaWalletContext';

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

interface BurnTokenFormProps {
  projectId: string;
  tokenId?: string; // Optional for backward compatibility with routing
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BurnTokenForm({ projectId, tokenId: tokenIdProp }: BurnTokenFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam; // Prefer prop over param
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get wallet from context (already selected in dashboard header)
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBurning, setIsBurning] = useState(false);

  // Burn progress tracking
  type BurnStage = 'idle' | 'validating' | 'preparing' | 'burning' | 'confirming' | 'complete';
  const [burnStage, setBurnStage] = useState<BurnStage>('idle');

  const stageMessages: Record<BurnStage, string> = {
    idle: '',
    validating: 'Validating burn operation...',
    preparing: 'Preparing to burn tokens...',
    burning: 'Burning tokens...',
    confirming: 'Waiting for confirmation...',
    complete: 'Tokens burned successfully!'
  };

  // Form state
  const [amount, setAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState<bigint | null>(null);

  // Validation state
  const [amountError, setAmountError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [burnSuccess, setBurnSuccess] = useState(false);

  // ============================================================================
  // LOAD TOKEN DATA
  // ============================================================================

  useEffect(() => {
    if (!tokenId) return;
    loadTokenData();
  }, [tokenId]);

  async function loadTokenData() {
    try {
      setIsLoading(true);

      const { data: tokenData, error } = await supabase
        .from('tokens')
        .select(`
          id,
          name,
          symbol,
          decimals,
          deployment:token_deployments!inner(
            contract_address,
            network
          )
        `)
        .eq('id', tokenId)
        .single();

      if (error) throw error;

      if (!tokenData || !tokenData.deployment) {
        throw new Error('Token deployment not found');
      }

      setToken({
        id: tokenData.id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        deployment: Array.isArray(tokenData.deployment) 
          ? tokenData.deployment[0] 
          : tokenData.deployment
      });

    } catch (error) {
      console.error('Error loading token:', error);
      toast({
        title: 'Error',
        description: 'Failed to load token information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // LOAD BALANCE
  // ============================================================================

  useEffect(() => {
    if (token && selectedWallet) {
      loadBalance();
    }
  }, [token, selectedWallet]);

  async function loadBalance() {
    if (!token || !selectedWallet) return;

    try {
      const balance = await modernSolanaTokenBurnService.getTokenBalance(
        address(token.deployment.contract_address),
        address(selectedWallet.wallet_address),
        token.deployment.network as 'devnet' | 'testnet' | 'mainnet-beta'
      );

      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  function validateAmount(value: string): boolean {
    setAmountError('');

    if (!value || value === '0') {
      setAmountError('Amount is required');
      return false;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setAmountError('Amount must be greater than 0');
      return false;
    }

    // Check balance
    if (currentBalance !== null && token) {
      const amountInSmallestUnit = BigInt(Math.floor(numValue * Math.pow(10, token.decimals)));
      if (amountInSmallestUnit > currentBalance) {
        setAmountError(`Insufficient balance. You have ${Number(currentBalance) / Math.pow(10, token.decimals)} ${token.symbol}`);
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // BURN HANDLER
  // ============================================================================
  async function handleBurn() {
    if (!token || !selectedWallet || !validateAmount(amount)) {
      return;
    }

    // Close confirmation dialog
    setShowConfirmation(false);

    try {
      setIsBurning(true);
      setBurnStage('validating');

      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, token.decimals)));

      // Validate burn
      setBurnStage('preparing');
      const validation = await modernSolanaTokenBurnService.validateBurn(
        {
          mint: address(token.deployment.contract_address),
          owner: address(selectedWallet.wallet_address),
          amount: amountInSmallestUnit,
          decimals: token.decimals
        },
        {
          network: token.deployment.network as 'devnet' | 'testnet' | 'mainnet-beta',
          signerPrivateKey: selectedWallet.decryptedPrivateKey!
        }
      );

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Execute burn
      setBurnStage('burning');
      const result = await modernSolanaTokenBurnService.burnTokens(
        {
          mint: address(token.deployment.contract_address),
          owner: address(selectedWallet.wallet_address),
          amount: amountInSmallestUnit,
          decimals: token.decimals
        },
        {
          network: token.deployment.network as 'devnet' | 'testnet' | 'mainnet-beta',
          signerPrivateKey: selectedWallet.decryptedPrivateKey!,
          checkBalance: true
        }
      );

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Burn failed');
      }

      setBurnStage('confirming');

      // Wait a moment for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      setBurnStage('complete');
      setTransactionHash(result.signature || '');
      setBurnSuccess(true);

      toast({
        title: 'Tokens Burned!',
        description: `Successfully burned ${amount} ${token.symbol}`,
      });

      // Reload balance
      await loadBalance();

    } catch (error: any) {
      console.error('Burn error:', error);
      setBurnStage('idle');
      toast({
        title: 'Burn Failed',
        description: error.message || 'Failed to burn tokens',
        variant: 'destructive'
      });
    } finally {
      setIsBurning(false);
    }
  }

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
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Token not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/solana/list`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Token List
        </Button>
      </div>

      {/* Burn Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Burn Tokens
          </CardTitle>
          <CardDescription>
            Permanently remove {token.symbol} tokens from circulation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning: Irreversible Action</AlertTitle>
            <AlertDescription>
              Burning tokens is permanent and cannot be undone. The tokens will be removed from circulation forever.
            </AlertDescription>
          </Alert>

          {/* Funding Wallet (Read-only) */}
          <div className="space-y-2">
            <Label>Burn From Wallet</Label>
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

          {/* Current Balance */}
          {selectedWallet && currentBalance !== null && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Current balance: <strong>{Number(currentBalance) / Math.pow(10, token.decimals)} {token.symbol}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount to Burn
              {token && <span className="text-muted-foreground ml-2">({token.symbol})</span>}
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (e.target.value) {
                  validateAmount(e.target.value);
                } else {
                  setAmountError('');
                }
              }}
              disabled={!selectedWallet}
              className={amountError ? 'border-destructive' : ''}
            />
            {amountError && (
              <p className="text-sm text-destructive">{amountError}</p>
            )}
          </div>

          {/* Burn Button */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (validateAmount(amount)) {
                  setShowConfirmation(true);
                }
              }}
              disabled={!selectedWallet || !amount || isBurning}
              className="flex-1"
              variant="destructive"
            >
              {isBurning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[burnStage]}
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4 mr-2" />
                  Burn Tokens
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Token Burn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                You are about to permanently burn <strong>{amount} {token.symbol}</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Remove {amount} {token.symbol} from your wallet</li>
                <li>Reduce the total token supply</li>
                <li>Cannot be reversed or undone</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBurn}
                className="flex-1"
              >
                <Flame className="h-4 w-4 mr-2" />
                Confirm Burn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {burnSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Tokens Burned Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully burned <strong>{amount} {token.symbol}</strong>
              </AlertDescription>
            </Alert>

            {/* Transaction Hash */}
            <div className="space-y-2">
              <Label>Transaction Hash</Label>
              <div className="flex gap-2">
                <Input
                  value={transactionHash}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    // Normalize network name (remove 'solana-' prefix if present)
                    const normalizedNetwork = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';
                    const explorerUrl = solanaExplorer.tx(
                      transactionHash,
                      normalizedNetwork
                    );
                    window.open(explorerUrl, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setBurnSuccess(false);
                  setAmount('');
                  setTransactionHash('');
                  setBurnStage('idle');
                }}
                className="flex-1"
              >
                Burn More Tokens
              </Button>
              <Button
                onClick={() => navigate(`/projects/${projectId}/solana/list`)}
                className="flex-1"
              >
                Back to Token List
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

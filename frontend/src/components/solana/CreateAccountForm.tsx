/**
 * Solana Token Account Creation Form
 * Interface for creating Associated Token Accounts (ATAs)
 * 
 * Features:
 * - Create ATA for any wallet
 * - Idempotent creation (won't fail if exists)
 * - Transaction tracking
 * - Explorer links
 * - Account address display
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
  Wallet,
  Loader2,
  CheckCircle,
  ExternalLink,
  Info,
  Copy
} from 'lucide-react';
import { modernSolanaTokenAccountService } from '@/services/wallet/solana/ModernSolanaTokenAccountService';
import { solanaExplorer } from '@/infrastructure/web3/solana';
import { address, type Address } from '@solana/kit';
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

interface CreateAccountFormProps {
  projectId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateAccountForm({ projectId }: CreateAccountFormProps) {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Creation progress tracking
  type CreationStage = 'idle' | 'validating' | 'creating' | 'confirming' | 'complete';
  const [creationStage, setCreationStage] = useState<CreationStage>('idle');

  const stageMessages: Record<CreationStage, string> = {
    idle: '',
    validating: 'Validating account creation...',
    creating: 'Creating token account...',
    confirming: 'Waiting for confirmation...',
    complete: 'Account created successfully!'
  };

  // Form state
  const [selectedWallet, setSelectedWallet] = useState<SelectedSolanaWallet | null>(null);
  const [predictedATAAddress, setPredictedATAAddress] = useState<string>('');

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [accountAddress, setAccountAddress] = useState('');
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [accountExisted, setAccountExisted] = useState(false);

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
  // PREDICT ATA ADDRESS
  // ============================================================================

  useEffect(() => {
    if (token && selectedWallet) {
      predictATAAddress();
    } else {
      setPredictedATAAddress('');
    }
  }, [token, selectedWallet]);

  async function predictATAAddress() {
    if (!token || !selectedWallet) return;

    try {
      const ataAddress = await modernSolanaTokenAccountService.findATAAddress(
        address(token.deployment.contract_address),
        address(selectedWallet.address)
      );
      setPredictedATAAddress(ataAddress);
    } catch (error) {
      console.error('Error predicting ATA address:', error);
    }
  }

  // ============================================================================
  // CREATE ACCOUNT HANDLER
  // ============================================================================

  async function handleCreateAccount() {
    if (!token || !selectedWallet) {
      return;
    }

    try {
      setIsCreating(true);
      setCreationStage('validating');

      // Create ATA (idempotent - won't fail if exists)
      setCreationStage('creating');
      const result = await modernSolanaTokenAccountService.createATAIdempotent(
        {
          mint: address(token.deployment.contract_address),
          owner: address(selectedWallet.address)
        },
        {
          network: token.deployment.network as 'devnet' | 'testnet' | 'mainnet-beta',
          payerPrivateKey: selectedWallet.privateKey
        }
      );

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Account creation failed');
      }

      setCreationStage('confirming');

      // Wait a moment for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      setCreationStage('complete');
      setTransactionHash(result.signature || '');
      setAccountAddress(result.accountAddress || '');
      setAccountExisted(result.accountExists || false);
      setCreationSuccess(true);

      toast({
        title: accountExisted ? 'Account Already Exists' : 'Account Created!',
        description: accountExisted 
          ? 'The token account already existed for this wallet'
          : `Successfully created token account for ${token.symbol}`,
      });

    } catch (error: any) {
      console.error('Account creation error:', error);
      setCreationStage('idle');
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create token account',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  }

  // ============================================================================
  // COPY TO CLIPBOARD
  // ============================================================================

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
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
    return (
      <Alert variant="destructive">
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
          onClick={() => navigate(`/projects/${projectId}/tokens/${tokenId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Token
        </Button>
      </div>

      {/* Create Account Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create Token Account
          </CardTitle>
          <CardDescription>
            Create an Associated Token Account (ATA) for {token.symbol}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What is an Associated Token Account?</AlertTitle>
            <AlertDescription className="text-sm mt-2 space-y-2">
              <p>
                An Associated Token Account (ATA) is required to hold SPL tokens. Each wallet needs a separate
                ATA for each token type they want to hold.
              </p>
              <p className="text-muted-foreground">
                This operation is safe and idempotent - if the account already exists, it won't fail.
              </p>
            </AlertDescription>
          </Alert>

          {/* Wallet Selector */}
          <div className="space-y-2">
            <Label>Select Wallet</Label>
            <SolanaWalletSelector
              projectId={projectId}
              network={token.deployment.network as 'devnet' | 'testnet' | 'mainnet-beta'}
              onWalletSelected={setSelectedWallet}
            />
          </div>

          {/* Predicted ATA Address */}
          {selectedWallet && predictedATAAddress && (
            <div className="space-y-2">
              <Label>Token Account Address (ATA)</Label>
              <div className="flex gap-2">
                <Input
                  value={predictedATAAddress}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(predictedATAAddress, 'ATA Address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is the deterministic address where {token.symbol} tokens will be held
              </p>
            </div>
          )}

          {/* Create Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleCreateAccount}
              disabled={!selectedWallet || isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[creationStage]}
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Create Token Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success State */}
      {creationSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {accountExisted ? 'Account Already Exists' : 'Account Created Successfully!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                {accountExisted 
                  ? `The token account for ${token.symbol} already exists for this wallet`
                  : `Successfully created token account for ${token.symbol}`
                }
              </AlertDescription>
            </Alert>

            {/* Account Address */}
            <div className="space-y-2">
              <Label>Token Account Address</Label>
              <div className="flex gap-2">
                <Input
                  value={accountAddress}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(accountAddress, 'Account Address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const explorerUrl = solanaExplorer.address(
                      accountAddress,
                      token.deployment.network as 'devnet' | 'testnet' | 'mainnet-beta'
                    );
                    window.open(explorerUrl, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

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
                    const explorerUrl = solanaExplorer.tx(
                      transactionHash,
                      token.deployment.network as 'devnet' | 'testnet' | 'mainnet-beta'
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
                  setCreationSuccess(false);
                  setTransactionHash('');
                  setAccountAddress('');
                  setCreationStage('idle');
                  setAccountExisted(false);
                }}
                className="flex-1"
              >
                Create Another Account
              </Button>
              <Button
                onClick={() => navigate(`/projects/${projectId}/tokens/${tokenId}`)}
                className="flex-1"
              >
                Back to Token
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
/**
 * Solana Close Account Form
 * Interface for closing token accounts and reclaiming rent
 * 
 * Features:
 * - Close empty token accounts
 * - Reclaim rent-exempt SOL
 * - Owner validation
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
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Wallet
} from 'lucide-react';
import { address } from '@solana/kit';
import { modernSolanaAccountCloseService } from '@/services/wallet/solana';
import { solanaExplorer } from '@/infrastructure/web3/solana';
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

interface CloseAccountFormProps {
  projectId: string;
  tokenId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CloseAccountForm({ projectId, tokenId: tokenIdProp }: CloseAccountFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  type CloseStage = 'idle' | 'validating' | 'closing' | 'confirming' | 'complete';
  const [closeStage, setCloseStage] = useState<CloseStage>('idle');

  const stageMessages: Record<CloseStage, string> = {
    idle: '',
    validating: 'Validating close account operation...',
    closing: 'Closing token account...',
    confirming: 'Waiting for confirmation...',
    complete: 'Account closed successfully!'
  };

  const [tokenAccount, setTokenAccount] = useState('');
  const [destination, setDestination] = useState('');

  const [accountError, setAccountError] = useState('');
  const [destinationError, setDestinationError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [transactionHash, setTransactionHash] = useState('');
  const [closeSuccess, setCloseSuccess] = useState(false);

  // ============================================================================
  // LOAD TOKEN DATA
  // ============================================================================

  useEffect(() => {
    if (!tokenId) return;
    loadTokenData();
  }, [tokenId]);

  useEffect(() => {
    if (selectedWallet?.wallet_address) {
      setDestination(selectedWallet.wallet_address);
    }
  }, [selectedWallet?.wallet_address]);

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
  // VALIDATION
  // ============================================================================

  function validateAccount(value: string): boolean {
    setAccountError('');

    if (!value || value.trim() === '') {
      setAccountError('Token account address is required');
      return false;
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      setAccountError('Invalid Solana address format');
      return false;
    }

    return true;
  }

  function validateDestination(value: string): boolean {
    setDestinationError('');

    if (!value || value.trim() === '') {
      setDestinationError('Destination address is required');
      return false;
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      setDestinationError('Invalid Solana address format');
      return false;
    }

    return true;
  }

  // ============================================================================
  // CLOSE HANDLER
  // ============================================================================

  async function handleClose() {
    if (!token || !selectedWallet || !selectedWallet.decryptedPrivateKey || 
        !validateAccount(tokenAccount) || !validateDestination(destination)) {
      if (!selectedWallet || !selectedWallet.decryptedPrivateKey) {
        toast({
          title: 'Wallet Required',
          description: 'Please select a wallet in the dashboard header',
          variant: 'destructive'
        });
      }
      return;
    }

    setShowConfirmation(false);

    try {
      setIsClosing(true);
      setCloseStage('validating');

      const networkName = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';

      setCloseStage('closing');

      // Convert strings to Address types
      const mintAddress = address(token.deployment.contract_address);
      const ownerAddress = address(selectedWallet.wallet_address);
      const destinationAddress = address(destination);

      const result = await modernSolanaAccountCloseService.closeTokenAccount(
        {
          mint: mintAddress,
          owner: ownerAddress,
          destination: destinationAddress
        },
        {
          network: networkName,
          signerPrivateKey: selectedWallet.decryptedPrivateKey
        }
      );

      if (!result.success || !result.signature) {
        throw new Error(result.errors?.join(', ') || 'Close account operation failed');
      }

      setCloseStage('confirming');

      await logActivity({
        action: 'token_account_closed',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          tokenAccount,
          destination,
          signature: result.signature,
          network: networkName
        }
      });

      setCloseStage('complete');
      setTransactionHash(result.signature);
      setCloseSuccess(true);

      toast({
        title: 'Account Closed!',
        description: `Successfully closed token account`,
      });

    } catch (error: any) {
      console.error('Close error:', error);
      setCloseStage('idle');
      toast({
        title: 'Close Failed',
        description: error.message || 'Failed to close account',
        variant: 'destructive'
      });
    } finally {
      setIsClosing(false);
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

      {/* Close Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Close Token Account
          </CardTitle>
          <CardDescription>
            Close an empty {token.symbol} token account and reclaim rent-exempt SOL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              The token account must have a balance of zero before it can be closed. All rent-exempt SOL will be sent to the destination address.
            </AlertDescription>
          </Alert>

          {/* Owner Wallet */}
          <div className="space-y-2">
            <Label>Account Owner Wallet</Label>
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

          {/* Token Account */}
          <div className="space-y-2">
            <Label htmlFor="account">Token Account Address</Label>
            <Input
              id="account"
              type="text"
              placeholder="Enter token account address to close"
              value={tokenAccount}
              onChange={(e) => {
                setTokenAccount(e.target.value);
                if (e.target.value) {
                  validateAccount(e.target.value);
                } else {
                  setAccountError('');
                }
              }}
              disabled={!selectedWallet}
              className={accountError ? 'border-destructive' : ''}
            />
            {accountError && (
              <p className="text-sm text-destructive">{accountError}</p>
            )}
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Address (for reclaimed SOL)</Label>
            <Input
              id="destination"
              type="text"
              placeholder="Enter destination wallet address"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                if (e.target.value) {
                  validateDestination(e.target.value);
                } else {
                  setDestinationError('');
                }
              }}
              disabled={!selectedWallet}
              className={destinationError ? 'border-destructive' : ''}
            />
            {destinationError && (
              <p className="text-sm text-destructive">{destinationError}</p>
            )}
          </div>

          {/* Close Button */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (validateAccount(tokenAccount) && validateDestination(destination)) {
                  setShowConfirmation(true);
                }
              }}
              disabled={!selectedWallet || !tokenAccount || !destination || isClosing}
              className="flex-1"
              variant="destructive"
            >
              {isClosing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[closeStage]}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Close Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Account Closure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                You are about to close token account {tokenAccount.slice(0, 8)}...{tokenAccount.slice(-8)} and send reclaimed SOL to {destination.slice(0, 8)}...{destination.slice(-8)}
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Permanently close the token account</li>
                <li>Return rent-exempt SOL to the destination</li>
                <li>Cannot be undone</li>
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
                onClick={handleClose}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Confirm Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {closeSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Account Closed Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully closed token account {tokenAccount.slice(0, 8)}...{tokenAccount.slice(-8)}
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
                  setCloseSuccess(false);
                  setTokenAccount('');
                  setDestination(selectedWallet?.wallet_address || '');
                  setTransactionHash('');
                  setCloseStage('idle');
                }}
                className="flex-1"
              >
                Close Another Account
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
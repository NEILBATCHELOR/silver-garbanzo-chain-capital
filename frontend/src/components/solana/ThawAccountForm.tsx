/**
 * Solana Thaw Account Form
 * Interface for thawing frozen token accounts
 * 
 * Features:
 * - Thaw frozen token accounts
 * - Requires freeze authority
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
import { address } from '@solana/kit';
import { modernSolanaFreezeService } from '@/services/wallet/solana';
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

interface ThawAccountFormProps {
  projectId: string;
  tokenId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ThawAccountForm({ projectId, tokenId: tokenIdProp }: ThawAccountFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThawing, setIsThawing] = useState(false);

  type ThawStage = 'idle' | 'validating' | 'thawing' | 'confirming' | 'complete';
  const [thawStage, setThawStage] = useState<ThawStage>('idle');

  const stageMessages: Record<ThawStage, string> = {
    idle: '',
    validating: 'Validating thaw operation...',
    thawing: 'Thawing token account...',
    confirming: 'Waiting for confirmation...',
    complete: 'Account thawed successfully!'
  };

  const [tokenAccount, setTokenAccount] = useState('');

  const [accountError, setAccountError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [transactionHash, setTransactionHash] = useState('');
  const [thawSuccess, setThawSuccess] = useState(false);

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

  // ============================================================================
  // THAW HANDLER
  // ============================================================================

  async function handleThaw() {
    if (!token || !selectedWallet || !selectedWallet.decryptedPrivateKey || !validateAccount(tokenAccount)) {
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
      setIsThawing(true);
      setThawStage('validating');

      const networkName = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';

      setThawStage('thawing');

      const result = await modernSolanaFreezeService.thawAccount(
        {
          owner: address(tokenAccount),
          mint: address(token.deployment.contract_address)
        },
        {
          network: networkName,
          freezeAuthorityPrivateKey: selectedWallet.decryptedPrivateKey
        }
      );

      if (!result.success || !result.signature) {
        throw new Error(result.errors?.join(', ') || 'Thaw operation failed');
      }

      setThawStage('confirming');

      await logActivity({
        action: 'token_account_thawed',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          tokenAccount,
          signature: result.signature,
          network: networkName
        }
      });

      setThawStage('complete');
      setTransactionHash(result.signature);
      setThawSuccess(true);

      toast({
        title: 'Account Thawed!',
        description: `Successfully thawed token account`,
      });

    } catch (error: any) {
      console.error('Thaw error:', error);
      setThawStage('idle');
      toast({
        title: 'Thaw Failed',
        description: error.message || 'Failed to thaw account',
        variant: 'destructive'
      });
    } finally {
      setIsThawing(false);
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

      {/* Thaw Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Thaw Token Account
          </CardTitle>
          <CardDescription>
            Thaw a frozen {token.symbol} token account to allow transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Freeze Authority Required</AlertTitle>
            <AlertDescription>
              You must have freeze authority for this token to thaw frozen accounts. Select the wallet that was designated as freeze authority during token creation.
            </AlertDescription>
          </Alert>

          {/* Freeze Authority Wallet */}
          <div className="space-y-2">
            <Label>Freeze Authority Wallet</Label>
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
            <Label htmlFor="account">Frozen Token Account Address</Label>
            <Input
              id="account"
              type="text"
              placeholder="Enter frozen token account address to thaw"
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
            <p className="text-xs text-muted-foreground">
              💡 Once thawed, this account will be able to transfer tokens normally
            </p>
          </div>

          {/* Thaw Button */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (validateAccount(tokenAccount)) {
                  setShowConfirmation(true);
                }
              }}
              disabled={!selectedWallet || !tokenAccount || isThawing}
              className="flex-1"
            >
              {isThawing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[thawStage]}
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4 mr-2" />
                  Thaw Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-500" />
              Confirm Account Thaw
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                You are about to thaw token account {tokenAccount.slice(0, 8)}...{tokenAccount.slice(-8)}
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Allow transfers from this account</li>
                <li>Remove the frozen state</li>
                <li>Can be reversed using freeze operation</li>
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
                onClick={handleThaw}
                className="flex-1"
              >
                <Flame className="h-4 w-4 mr-2" />
                Confirm Thaw
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {thawSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Account Thawed Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully thawed token account {tokenAccount.slice(0, 8)}...{tokenAccount.slice(-8)}
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
                  setThawSuccess(false);
                  setTokenAccount('');
                  setTransactionHash('');
                  setThawStage('idle');
                }}
                className="flex-1"
              >
                Thaw Another Account
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
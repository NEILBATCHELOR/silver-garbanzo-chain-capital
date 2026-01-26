/**
 * Solana Freeze Account Form
 * Interface for freezing token accounts
 * 
 * Features:
 * - Freeze token accounts
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
  Snowflake,
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

interface FreezeAccountFormProps {
  projectId: string;
  tokenId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FreezeAccountForm({ projectId, tokenId: tokenIdProp }: FreezeAccountFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFreezing, setIsFreezing] = useState(false);

  type FreezeStage = 'idle' | 'validating' | 'freezing' | 'confirming' | 'complete';
  const [freezeStage, setFreezeStage] = useState<FreezeStage>('idle');

  const stageMessages: Record<FreezeStage, string> = {
    idle: '',
    validating: 'Validating freeze operation...',
    freezing: 'Freezing token account...',
    confirming: 'Waiting for confirmation...',
    complete: 'Account frozen successfully!'
  };

  const [tokenAccount, setTokenAccount] = useState('');

  const [accountError, setAccountError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [transactionHash, setTransactionHash] = useState('');
  const [freezeSuccess, setFreezeSuccess] = useState(false);

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
  // FREEZE HANDLER
  // ============================================================================

  async function handleFreeze() {
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
      setIsFreezing(true);
      setFreezeStage('validating');

      const networkName = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';

      setFreezeStage('freezing');

      const result = await modernSolanaFreezeService.freezeAccount(
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
        throw new Error(result.errors?.join(', ') || 'Freeze operation failed');
      }

      setFreezeStage('confirming');

      await logActivity({
        action: 'token_account_frozen',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          tokenAccount,
          signature: result.signature,
          network: networkName
        }
      });

      setFreezeStage('complete');
      setTransactionHash(result.signature);
      setFreezeSuccess(true);

      toast({
        title: 'Account Frozen!',
        description: `Successfully frozen token account`,
      });

    } catch (error: any) {
      console.error('Freeze error:', error);
      setFreezeStage('idle');
      toast({
        title: 'Freeze Failed',
        description: error.message || 'Failed to freeze account',
        variant: 'destructive'
      });
    } finally {
      setIsFreezing(false);
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

      {/* Freeze Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-500" />
            Freeze Token Account
          </CardTitle>
          <CardDescription>
            Freeze a {token.symbol} token account to prevent transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Freeze Authority Required</AlertTitle>
            <AlertDescription>
              You must have freeze authority for this token to freeze accounts. Select the wallet that was designated as freeze authority during token creation.
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
            <Label htmlFor="account">Token Account Address</Label>
            <Input
              id="account"
              type="text"
              placeholder="Enter token account address to freeze"
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
              💡 Once frozen, this account cannot transfer tokens until it's thawed
            </p>
          </div>

          {/* Freeze Button */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (validateAccount(tokenAccount)) {
                  setShowConfirmation(true);
                }
              }}
              disabled={!selectedWallet || !tokenAccount || isFreezing}
              className="flex-1"
            >
              {isFreezing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[freezeStage]}
                </>
              ) : (
                <>
                  <Snowflake className="h-4 w-4 mr-2" />
                  Freeze Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Confirm Account Freeze
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                You are about to freeze token account {tokenAccount.slice(0, 8)}...{tokenAccount.slice(-8)}
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Prevent all transfers from this account</li>
                <li>Require freeze authority to thaw</li>
                <li>Can be reversed using thaw operation</li>
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
                onClick={handleFreeze}
                className="flex-1"
              >
                <Snowflake className="h-4 w-4 mr-2" />
                Confirm Freeze
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {freezeSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Account Frozen Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully frozen token account {tokenAccount.slice(0, 8)}...{tokenAccount.slice(-8)}
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
                  setFreezeSuccess(false);
                  setTokenAccount('');
                  setTransactionHash('');
                  setFreezeStage('idle');
                }}
                className="flex-1"
              >
                Freeze Another Account
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
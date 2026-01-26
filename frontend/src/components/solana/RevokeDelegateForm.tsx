/**
 * Solana Revoke Delegate Form
 * Interface for revoking delegate permissions for SPL and Token-2022 tokens
 * 
 * Features:
 * - Revoke all delegate permissions
 * - Authority validation
 * - Revoke confirmation dialog
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
  UserX,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Wallet
} from 'lucide-react';
import { modernSolanaDelegateService } from '@/services/wallet/solana';
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

interface RevokeDelegateFormProps {
  projectId: string;
  tokenId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RevokeDelegateForm({ projectId, tokenId: tokenIdProp }: RevokeDelegateFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);

  // Revoke progress tracking
  type RevokeStage = 'idle' | 'validating' | 'preparing' | 'revoking' | 'confirming' | 'complete';
  const [revokeStage, setRevokeStage] = useState<RevokeStage>('idle');

  const stageMessages: Record<RevokeStage, string> = {
    idle: '',
    validating: 'Validating revoke operation...',
    preparing: 'Preparing to revoke...',
    revoking: 'Revoking delegate...',
    confirming: 'Waiting for confirmation...',
    complete: 'Delegate revoked successfully!'
  };

  // Form state
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [revokeSuccess, setRevokeSuccess] = useState(false);

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
  // REVOKE HANDLER
  // ============================================================================

  async function handleRevoke() {
    if (!token || !selectedWallet || !selectedWallet.decryptedPrivateKey) {
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
      setIsRevoking(true);
      setRevokeStage('validating');

      setRevokeStage('preparing');

      setRevokeStage('revoking');
      
      const networkName = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';
      
      const result = await modernSolanaDelegateService.revokeDelegate(
        {
          mintAddress: token.deployment.contract_address,
          ownerAddress: selectedWallet.wallet_address
        },
        {
          network: networkName,
          ownerPrivateKey: selectedWallet.decryptedPrivateKey
        }
      );

      if (!result.success || !result.signature) {
        throw new Error(result.errors?.join(', ') || 'Revoke operation failed');
      }

      setRevokeStage('confirming');

      await logActivity({
        action: 'delegate_revoked',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          signature: result.signature,
          network: networkName
        }
      });

      setRevokeStage('complete');
      setTransactionHash(result.signature);
      setRevokeSuccess(true);

      toast({
        title: 'Delegate Revoked!',
        description: `Successfully revoked all delegate permissions for ${token.symbol}`,
      });

    } catch (error: any) {
      console.error('Revoke error:', error);
      setRevokeStage('idle');
      toast({
        title: 'Revoke Failed',
        description: error.message || 'Failed to revoke delegate',
        variant: 'destructive'
      });
    } finally {
      setIsRevoking(false);
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

      {/* Revoke Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Revoke Delegate
          </CardTitle>
          <CardDescription>
            Remove all delegate permissions from your {token.symbol} token account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>This Action Cannot Be Undone</AlertTitle>
            <AlertDescription>
              Revoking delegate permissions will immediately prevent the delegate from transferring tokens on your behalf. You will need to approve them again if you want to restore these permissions.
            </AlertDescription>
          </Alert>

          {/* Owner Wallet */}
          <div className="space-y-2">
            <Label>Token Owner Wallet</Label>
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

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What This Does</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Removes ALL delegate permissions</li>
                <li>Prevents the delegate from transferring your tokens</li>
                <li>Takes effect immediately after confirmation</li>
                <li>Can be re-approved later if needed</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Revoke Button */}
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => setShowConfirmation(true)}
              disabled={!selectedWallet || isRevoking}
              className="flex-1"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[revokeStage]}
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Revoke Delegate
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
              Confirm Delegate Revocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                You are about to <strong>revoke ALL delegate permissions</strong> for your {token.symbol} token account
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">After this action:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>No delegate will be able to transfer your tokens</li>
                <li>Any existing spending limits will be removed</li>
                <li>You'll need to approve delegates again to restore permissions</li>
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
                onClick={handleRevoke}
                className="flex-1"
              >
                <UserX className="h-4 w-4 mr-2" />
                Confirm Revoke
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {revokeSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Delegate Revoked Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                All delegate permissions have been revoked for your {token.symbol} token account
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
                  setRevokeSuccess(false);
                  setTransactionHash('');
                  setRevokeStage('idle');
                }}
                className="flex-1"
              >
                Revoke Another Token
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

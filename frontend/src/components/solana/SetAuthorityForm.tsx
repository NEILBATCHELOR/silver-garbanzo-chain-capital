/**
 * Solana Set Authority Form
 * Interface for changing or revoking mint/freeze authorities
 * 
 * Features:
 * - Change mint authority
 * - Change freeze authority
 * - Revoke authorities permanently
 * - Authority validation
 * - Confirmation dialog
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
  Key,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Wallet
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { modernSolanaAuthorityService, type SolanaAuthorityType } from '@/services/wallet/solana';
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

interface SetAuthorityFormProps {
  projectId: string;
  tokenId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SetAuthorityForm({ projectId, tokenId: tokenIdProp }: SetAuthorityFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingAuthority, setIsSettingAuthority] = useState(false);

  // Set authority progress tracking
  type AuthorityStage = 'idle' | 'validating' | 'preparing' | 'setting' | 'confirming' | 'complete';
  const [authorityStage, setAuthorityStage] = useState<AuthorityStage>('idle');

  const stageMessages: Record<AuthorityStage, string> = {
    idle: '',
    validating: 'Validating authority change...',
    preparing: 'Preparing to change authority...',
    setting: 'Setting new authority...',
    confirming: 'Waiting for confirmation...',
    complete: 'Authority changed successfully!'
  };

  // Form state
  const [authorityType, setAuthorityType] = useState<SolanaAuthorityType>('MintTokens');
  const [revokeAuthority, setRevokeAuthority] = useState(false);
  const [newAuthority, setNewAuthority] = useState('');

  // Validation state
  const [authorityError, setAuthorityError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [authoritySuccess, setAuthoritySuccess] = useState(false);

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

  function validateAuthority(value: string): boolean {
    setAuthorityError('');

    if (revokeAuthority) {
      return true; // No validation needed when revoking
    }

    if (!value || value.trim() === '') {
      setAuthorityError('New authority address is required');
      return false;
    }

    // Basic Solana address validation
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      setAuthorityError('Invalid Solana address format');
      return false;
    }

    return true;
  }

  // ============================================================================
  // SET AUTHORITY HANDLER
  // ============================================================================

  async function handleSetAuthority() {
    if (!token || !selectedWallet || !selectedWallet.decryptedPrivateKey) {
      if (!selectedWallet || !selectedWallet.decryptedPrivateKey) {
        toast({
          title: 'Wallet Required',
          description: 'Please select a wallet with current authority',
          variant: 'destructive'
        });
      }
      return;
    }

    if (!revokeAuthority && !validateAuthority(newAuthority)) {
      return;
    }

    setShowConfirmation(false);

    try {
      setIsSettingAuthority(true);
      setAuthorityStage('validating');

      setAuthorityStage('preparing');

      setAuthorityStage('setting');
      
      const networkName = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';
      
      const result = await modernSolanaAuthorityService.setAuthority(
        {
          mintAddress: token.deployment.contract_address,
          authorityType,
          newAuthority: revokeAuthority ? null : newAuthority
        },
        {
          network: networkName,
          currentAuthorityPrivateKey: selectedWallet.decryptedPrivateKey
        }
      );

      if (!result.success || !result.signature) {
        throw new Error(result.errors?.join(', ') || 'Set authority operation failed');
      }

      setAuthorityStage('confirming');

      await logActivity({
        action: 'authority_changed',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          authorityType,
          newAuthority: revokeAuthority ? 'REVOKED' : newAuthority,
          signature: result.signature,
          network: networkName
        }
      });

      setAuthorityStage('complete');
      setTransactionHash(result.signature);
      setAuthoritySuccess(true);

      const action = revokeAuthority ? 'revoked' : 'changed';
      toast({
        title: `Authority ${action.charAt(0).toUpperCase() + action.slice(1)}!`,
        description: `Successfully ${action} ${getAuthorityTypeLabel(authorityType)}`,
      });

    } catch (error: any) {
      console.error('Set authority error:', error);
      setAuthorityStage('idle');
      toast({
        title: 'Authority Change Failed',
        description: error.message || 'Failed to change authority',
        variant: 'destructive'
      });
    } finally {
      setIsSettingAuthority(false);
    }
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function getAuthorityTypeLabel(type: SolanaAuthorityType): string {
    const labels: Record<SolanaAuthorityType, string> = {
      'MintTokens': 'Mint Authority',
      'FreezeAccount': 'Freeze Authority',
      'AccountOwner': 'Account Owner',
      'CloseAccount': 'Close Account Authority'
    };
    return labels[type];
  }

  function getAuthorityTypeDescription(type: SolanaAuthorityType): string {
    const descriptions: Record<SolanaAuthorityType, string> = {
      'MintTokens': 'Authority to create new tokens (increase supply)',
      'FreezeAccount': 'Authority to freeze and thaw token accounts',
      'AccountOwner': 'Authority over token account ownership',
      'CloseAccount': 'Authority to close token accounts'
    };
    return descriptions[type];
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

      {/* Set Authority Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            Change Token Authority
          </CardTitle>
          <CardDescription>
            Transfer or revoke authorities for {token.symbol} token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Operation</AlertTitle>
            <AlertDescription>
              Changing or revoking authorities is permanent and cannot be undone. Make sure you understand the implications before proceeding.
            </AlertDescription>
          </Alert>

          {/* Current Authority Wallet */}
          <div className="space-y-2">
            <Label>Current Authority Wallet</Label>
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
                Please select the wallet with current authority
              </p>
            )}
          </div>

          {/* Authority Type */}
          <div className="space-y-2">
            <Label htmlFor="authorityType">Authority Type</Label>
            <Select
              value={authorityType}
              onValueChange={(value) => setAuthorityType(value as SolanaAuthorityType)}
              disabled={!selectedWallet}
            >
              <SelectTrigger id="authorityType">
                <SelectValue placeholder="Select authority type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MintTokens">
                  <div className="flex flex-col items-start">
                    <span>Mint Authority</span>
                    <span className="text-xs text-muted-foreground">
                      Can create new tokens
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="FreezeAccount">
                  <div className="flex flex-col items-start">
                    <span>Freeze Authority</span>
                    <span className="text-xs text-muted-foreground">
                      Can freeze/thaw accounts
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getAuthorityTypeDescription(authorityType)}
            </p>
          </div>

          {/* Revoke Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="revoke">Revoke Authority Permanently</Label>
              <p className="text-xs text-muted-foreground">
                Set authority to null (cannot be changed back)
              </p>
            </div>
            <Switch
              id="revoke"
              checked={revokeAuthority}
              onCheckedChange={setRevokeAuthority}
              disabled={!selectedWallet}
            />
          </div>

          {/* New Authority Address */}
          {!revokeAuthority && (
            <div className="space-y-2">
              <Label htmlFor="newAuthority">New Authority Address</Label>
              <Input
                id="newAuthority"
                type="text"
                placeholder="Enter new authority address (e.g., 5YZb2nQ4B...)"
                value={newAuthority}
                onChange={(e) => {
                  setNewAuthority(e.target.value);
                  if (e.target.value) {
                    validateAuthority(e.target.value);
                  } else {
                    setAuthorityError('');
                  }
                }}
                disabled={!selectedWallet}
                className={authorityError ? 'border-destructive' : ''}
              />
              {authorityError && (
                <p className="text-sm text-destructive">{authorityError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                💡 This address will become the new {getAuthorityTypeLabel(authorityType).toLowerCase()}
              </p>
            </div>
          )}

          {/* Set Authority Button */}
          <div className="flex gap-3">
            <Button
              variant={revokeAuthority ? 'destructive' : 'default'}
              onClick={() => {
                if (revokeAuthority || validateAuthority(newAuthority)) {
                  setShowConfirmation(true);
                }
              }}
              disabled={!selectedWallet || (!revokeAuthority && !newAuthority) || isSettingAuthority}
              className="flex-1"
            >
              {isSettingAuthority ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[authorityStage]}
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  {revokeAuthority ? 'Revoke Authority' : 'Change Authority'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Card className={revokeAuthority ? 'border-destructive' : 'border-blue-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${revokeAuthority ? 'text-destructive' : 'text-blue-500'}`} />
              Confirm Authority Change
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={revokeAuthority ? 'destructive' : 'default'}>
              <AlertDescription>
                {revokeAuthority ? (
                  <>
                    You are about to <strong>permanently revoke</strong> {getAuthorityTypeLabel(authorityType)} for {token.symbol}. This action cannot be undone.
                  </>
                ) : (
                  <>
                    You are about to change {getAuthorityTypeLabel(authorityType)} for {token.symbol} to <strong>{newAuthority.slice(0, 8)}...{newAuthority.slice(-8)}</strong>
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">After this action:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {revokeAuthority ? (
                  <>
                    <li>No one will be able to exercise this authority</li>
                    <li>This change is permanent and irreversible</li>
                    <li>Carefully consider the implications</li>
                  </>
                ) : (
                  <>
                    <li>The new address will control this authority</li>
                    <li>Your current wallet will lose this authority</li>
                    <li>Only the new authority can change it again</li>
                  </>
                )}
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
                variant={revokeAuthority ? 'destructive' : 'default'}
                onClick={handleSetAuthority}
                className="flex-1"
              >
                <Key className="h-4 w-4 mr-2" />
                Confirm Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {authoritySuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Authority Changed Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully {revokeAuthority ? 'revoked' : 'changed'} {getAuthorityTypeLabel(authorityType)} for {token.symbol}
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
                  setAuthoritySuccess(false);
                  setNewAuthority('');
                  setTransactionHash('');
                  setAuthorityStage('idle');
                  setRevokeAuthority(false);
                }}
                className="flex-1"
              >
                Change Another Authority
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

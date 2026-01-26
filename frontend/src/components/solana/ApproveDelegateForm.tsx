/**
 * Solana Approve Delegate Form
 * Interface for approving delegates for SPL and Token-2022 tokens
 * 
 * Features:
 * - Approve delegate with spending limit
 * - Authority validation
 * - Delegate confirmation dialog
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
  UserCheck,
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

interface ApproveDelegateFormProps {
  projectId: string;
  tokenId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ApproveDelegateForm({ projectId, tokenId: tokenIdProp }: ApproveDelegateFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  // Approval progress tracking
  type ApprovalStage = 'idle' | 'validating' | 'preparing' | 'approving' | 'confirming' | 'complete';
  const [approvalStage, setApprovalStage] = useState<ApprovalStage>('idle');

  const stageMessages: Record<ApprovalStage, string> = {
    idle: '',
    validating: 'Validating delegate approval...',
    preparing: 'Preparing approval...',
    approving: 'Approving delegate...',
    confirming: 'Waiting for confirmation...',
    complete: 'Delegate approved successfully!'
  };

  // Form state
  const [delegateAddress, setDelegateAddress] = useState('');
  const [amount, setAmount] = useState('');

  // Validation state
  const [delegateError, setDelegateError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [approvalSuccess, setApprovalSuccess] = useState(false);

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

  function validateDelegate(value: string): boolean {
    setDelegateError('');

    if (!value || value.trim() === '') {
      setDelegateError('Delegate address is required');
      return false;
    }

    // Basic Solana address validation
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      setDelegateError('Invalid Solana address format');
      return false;
    }

    return true;
  }

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

    return true;
  }

  // ============================================================================
  // APPROVE HANDLER
  // ============================================================================

  async function handleApprove() {
    if (!token || !selectedWallet || !selectedWallet.decryptedPrivateKey || 
        !validateDelegate(delegateAddress) || !validateAmount(amount)) {
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
      setIsApproving(true);
      setApprovalStage('validating');

      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, token.decimals)));

      setApprovalStage('preparing');

      setApprovalStage('approving');
      
      const networkName = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';
      
      const result = await modernSolanaDelegateService.approveDelegate(
        {
          mintAddress: token.deployment.contract_address,
          ownerAddress: selectedWallet.wallet_address,
          delegateAddress,
          amount: amountInSmallestUnit,
          decimals: token.decimals
        },
        {
          network: networkName,
          ownerPrivateKey: selectedWallet.decryptedPrivateKey
        }
      );

      if (!result.success || !result.signature) {
        throw new Error(result.errors?.join(', ') || 'Approve operation failed');
      }

      setApprovalStage('confirming');

      await logActivity({
        action: 'delegate_approved',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          amount: amountInSmallestUnit.toString(),
          delegateAddress,
          signature: result.signature,
          network: networkName
        }
      });

      setApprovalStage('complete');
      setTransactionHash(result.signature);
      setApprovalSuccess(true);

      toast({
        title: 'Delegate Approved!',
        description: `Successfully approved ${delegateAddress.slice(0, 8)}... to spend ${amount} ${token.symbol}`,
      });

    } catch (error: any) {
      console.error('Approve error:', error);
      setApprovalStage('idle');
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve delegate',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
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

      {/* Approve Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-500" />
            Approve Delegate
          </CardTitle>
          <CardDescription>
            Allow another address to transfer {token.symbol} tokens on your behalf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What is a Delegate?</AlertTitle>
            <AlertDescription>
              A delegate can transfer tokens from your account up to the approved amount. This is commonly used for staking, lending protocols, and marketplaces.
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

          {/* Delegate Address */}
          <div className="space-y-2">
            <Label htmlFor="delegate">
              Delegate Address
            </Label>
            <Input
              id="delegate"
              type="text"
              placeholder="Enter delegate address (e.g., 5YZb2nQ4B...)"
              value={delegateAddress}
              onChange={(e) => {
                setDelegateAddress(e.target.value);
                if (e.target.value) {
                  validateDelegate(e.target.value);
                } else {
                  setDelegateError('');
                }
              }}
              disabled={!selectedWallet}
              className={delegateError ? 'border-destructive' : ''}
            />
            {delegateError && (
              <p className="text-sm text-destructive">{delegateError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              💡 This address will be able to transfer tokens from your account
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Spending Limit
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
            <p className="text-xs text-muted-foreground">
              Maximum amount the delegate can transfer
            </p>
          </div>

          {/* Approve Button */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (validateDelegate(delegateAddress) && validateAmount(amount)) {
                  setShowConfirmation(true);
                }
              }}
              disabled={!selectedWallet || !delegateAddress || !amount || isApproving}
              className="flex-1"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[approvalStage]}
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve Delegate
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
              Confirm Delegate Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                You are about to approve <strong>{delegateAddress.slice(0, 8)}...{delegateAddress.slice(-8)}</strong> to transfer up to <strong>{amount} {token.symbol}</strong> from your account
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Allow the delegate to transfer tokens on your behalf</li>
                <li>Set a spending limit of {amount} {token.symbol}</li>
                <li>Remain active until you revoke it</li>
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
                onClick={handleApprove}
                className="flex-1"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Confirm Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {approvalSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Delegate Approved Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully approved delegate with spending limit of <strong>{amount} {token.symbol}</strong>
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
                  setApprovalSuccess(false);
                  setAmount('');
                  setDelegateAddress('');
                  setTransactionHash('');
                  setApprovalStage('idle');
                }}
                className="flex-1"
              >
                Approve Another Delegate
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

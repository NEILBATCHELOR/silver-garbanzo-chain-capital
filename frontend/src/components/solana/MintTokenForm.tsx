/**
 * Solana Mint Tokens Form
 * Interface for minting additional SPL and Token-2022 tokens
 * 
 * Features:
 * - Mint tokens to any address
 * - Authority validation
 * - Mint confirmation dialog
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
  Coins,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Wallet
} from 'lucide-react';
import { modernSolanaMintService } from '@/services/wallet/solana';
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

interface MintTokenFormProps {
  projectId: string;
  tokenId?: string; // Optional for backward compatibility with routing
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MintTokenForm({ projectId, tokenId: tokenIdProp }: MintTokenFormProps) {
  const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
  const tokenId = tokenIdProp || tokenIdParam; // Prefer prop over param
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get wallet from context (already selected in dashboard header)
  const { selectedWallet, network } = useSolanaWallet();

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);

  // Mint progress tracking
  type MintStage = 'idle' | 'validating' | 'preparing' | 'minting' | 'confirming' | 'complete';
  const [mintStage, setMintStage] = useState<MintStage>('idle');

  const stageMessages: Record<MintStage, string> = {
    idle: '',
    validating: 'Validating mint operation...',
    preparing: 'Preparing to mint tokens...',
    minting: 'Minting tokens...',
    confirming: 'Waiting for confirmation...',
    complete: 'Tokens minted successfully!'
  };

  // Form state
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  
  // User's own ATA for this token
  const [myTokenAccount, setMyTokenAccount] = useState<string>('');

  // Validation state
  const [destinationError, setDestinationError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Transaction state
  const [transactionHash, setTransactionHash] = useState('');
  const [mintSuccess, setMintSuccess] = useState(false);

  // ============================================================================
  // LOAD TOKEN DATA
  // ============================================================================

  useEffect(() => {
    if (!tokenId) return;
    loadTokenData();
  }, [tokenId]);

  // Load user's token account when wallet and token are available
  useEffect(() => {
    if (selectedWallet?.wallet_address && token?.deployment?.contract_address) {
      loadMyTokenAccount();
    }
  }, [selectedWallet?.wallet_address, token?.deployment?.contract_address]);

  async function loadMyTokenAccount() {
    if (!selectedWallet?.wallet_address || !token?.deployment?.contract_address) return;
    
    try {
      const ata = await modernSolanaMintService.getTokenAccountAddress(
        selectedWallet.wallet_address,
        token.deployment.contract_address
      );
      setMyTokenAccount(ata);
    } catch (error) {
      console.error('Error loading token account:', error);
    }
  }

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

  function validateDestination(value: string): boolean {
    setDestinationError('');

    if (!value || value.trim() === '') {
      setDestinationError('Destination address is required');
      return false;
    }

    // Basic Solana address validation (base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      setDestinationError('Invalid Solana address format');
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
  // MINT HANDLER
  // ============================================================================
  async function handleMint() {
    if (!token || !selectedWallet || !selectedWallet.decryptedPrivateKey || !validateDestination(destinationAddress) || !validateAmount(amount)) {
      if (!selectedWallet || !selectedWallet.decryptedPrivateKey) {
        toast({
          title: 'Wallet Required',
          description: 'Please select a wallet in the dashboard header',
          variant: 'destructive'
        });
      }
      return;
    }

    // Close confirmation dialog
    setShowConfirmation(false);

    try {
      setIsMinting(true);
      setMintStage('validating');

      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, token.decimals)));

      setMintStage('preparing');

      // Call the mint service
      setMintStage('minting');
      
      // Normalize network name (remove 'solana-' prefix if present)
      const networkName = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';
      
      const result = await modernSolanaMintService.mintTokens(
        {
          mintAddress: token.deployment.contract_address,
          destinationAddress: destinationAddress,
          amount: amountInSmallestUnit,
          decimals: token.decimals
        },
        {
          network: networkName,
          mintAuthorityPrivateKey: selectedWallet.decryptedPrivateKey,
          createATAIfNeeded: true // Auto-create recipient's token account
        }
      );

      if (!result.success || !result.signature) {
        throw new Error(result.errors?.join(', ') || 'Mint operation failed');
      }

      setMintStage('confirming');

      // Log activity
      await logActivity({
        action: 'token_minted',
        entity_type: 'token',
        entity_id: token.id,
        details: {
          amount: amountInSmallestUnit.toString(),
          destinationAddress,
          destinationATA: result.destinationATA,
          signature: result.signature,
          network: networkName // Use normalized network name
        }
      });

      setMintStage('complete');
      setTransactionHash(result.signature);
      setMintSuccess(true);

      toast({
        title: 'Tokens Minted!',
        description: `Successfully minted ${amount} ${token.symbol} to ${destinationAddress.slice(0, 8)}...`,
      });

    } catch (error: any) {
      console.error('Mint error:', error);
      setMintStage('idle');
      toast({
        title: 'Mint Failed',
        description: error.message || 'Failed to mint tokens',
        variant: 'destructive'
      });
    } finally {
      setIsMinting(false);
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

      {/* Mint Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-500" />
            Mint Additional Tokens
          </CardTitle>
          <CardDescription>
            Create new {token.symbol} tokens and send them to a destination address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Mint Authority Required</AlertTitle>
            <AlertDescription>
              You must have mint authority for this token to mint additional tokens. Select the wallet that was designated as mint authority during token creation.
            </AlertDescription>
          </Alert>

          {/* Your Token Account Info */}
          {myTokenAccount && (
            <Alert className="border-blue-500 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Your Token Account</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-blue-800">
                  This is YOUR account for holding {token.symbol} tokens:
                </p>
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
                  <code className="text-xs font-mono text-blue-900 flex-1 break-all">
                    {myTokenAccount}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(myTokenAccount);
                      toast({
                        title: 'Copied!',
                        description: 'Token account address copied to clipboard'
                      });
                    }}
                    className="text-blue-600 hover:text-blue-700 h-8"
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-blue-700">
                  💡 This account was created automatically during token deployment
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Funding Wallet (Mint Authority) */}
          <div className="space-y-2">
            <Label>Mint Authority Wallet</Label>
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

          {/* Destination Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="destination">
                Destination Wallet Address
              </Label>
              {selectedWallet && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDestinationAddress(selectedWallet.wallet_address);
                    validateDestination(selectedWallet.wallet_address);
                  }}
                  className="h-7 text-xs"
                >
                  <Wallet className="h-3 w-3 mr-1" />
                  Mint to Myself
                </Button>
              )}
            </div>
            <Input
              id="destination"
              type="text"
              placeholder="Enter recipient's wallet address (e.g., 5YZb2nQ4B...)"
              value={destinationAddress}
              onChange={(e) => {
                setDestinationAddress(e.target.value);
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
            <p className="text-xs text-muted-foreground">
              💡 Enter a <strong>wallet address</strong>, not a token account. The token account will be created automatically if needed.
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount to Mint
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

          {/* Mint Button */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (validateDestination(destinationAddress) && validateAmount(amount)) {
                  setShowConfirmation(true);
                }
              }}
              disabled={!selectedWallet || !destinationAddress || !amount || isMinting}
              className="flex-1"
            >
              {isMinting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stageMessages[mintStage]}
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Mint Tokens
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
              Confirm Token Mint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                You are about to mint <strong>{amount} {token.symbol}</strong> to {destinationAddress.slice(0, 8)}...{destinationAddress.slice(-8)}
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Create {amount} new {token.symbol} tokens</li>
                <li>Increase the total token supply</li>
                <li>Send tokens to the destination address</li>
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
                onClick={handleMint}
                className="flex-1"
              >
                <Coins className="h-4 w-4 mr-2" />
                Confirm Mint
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {mintSuccess && transactionHash && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Tokens Minted Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully minted <strong>{amount} {token.symbol}</strong> to {destinationAddress.slice(0, 8)}...{destinationAddress.slice(-8)}
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
                  setMintSuccess(false);
                  setAmount('');
                  setDestinationAddress('');
                  setTransactionHash('');
                  setMintStage('idle');
                }}
                className="flex-1"
              >
                Mint More Tokens
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

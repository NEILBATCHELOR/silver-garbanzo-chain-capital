/**
 * Single Mint Form Component
 * Allows minting ERC-20 tokens to a single address
 * Pattern: Exact match with TransferTab's single transfer logic
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Info,
} from 'lucide-react';

// Import services (CRITICAL: TokenMintingService)
import { tokenMintingService, type MintParams } from '@/services/wallet/TokenMintingService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';

// Mint states
type MintState = 'input' | 'confirmation' | 'processing' | 'success' | 'error';

interface SingleMintFormProps {
  tokenContractAddress: string; // ERC-20 token contract
  tokenDecimals?: number; // Token decimals (default: 18)
  tokenSymbol?: string; // Token symbol for display
  wallets: Array<{
    // Available wallets that can mint
    id: string;
    address: string;
    name: string;
    type: 'project' | 'user';
    chainId?: number;
    blockchain?: string;
  }>;
  onSuccess?: (transactionHash: string) => void;
  onCancel?: () => void;
}

export const SingleMintForm: React.FC<SingleMintFormProps> = ({
  tokenContractAddress,
  tokenDecimals = 18,
  tokenSymbol = 'TOKEN',
  wallets,
  onSuccess,
  onCancel,
}) => {
  const { toast } = useToast();

  // Form state
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  // Execution state
  const [mintState, setMintState] = useState<MintState>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState<number | undefined>(undefined);

  // Get selected wallet
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  /**
   * Validate form inputs
   */
  const validateInputs = (): { valid: boolean; error?: string } => {
    if (!selectedWalletId) {
      return { valid: false, error: 'Please select a minter wallet' };
    }

    if (!selectedWallet?.chainId) {
      return { valid: false, error: 'Selected wallet has no chain ID' };
    }

    if (!ethers.isAddress(recipientAddress)) {
      return { valid: false, error: 'Invalid recipient address' };
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    return { valid: true };
  };

  /**
   * Handle mint submission
   */
  const handleMint = async () => {
    const validation = validateInputs();
    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validation.error,
      });
      return;
    }

    setMintState('confirmation');
  };

  /**
   * Execute mint transaction
   */
  const executeMint = async () => {
    if (!selectedWallet) return;

    try {
      setIsSubmitting(true);
      setMintState('processing');
      setTransactionHash(null);
      setErrorMessage(null);

      console.log(`🪙 Minting ${amount} ${tokenSymbol} to ${recipientAddress}`);

      // Execute mint with automatic nonce management
      const result = await tokenMintingService.executeMint({
        contractAddress: tokenContractAddress,
        toAddress: recipientAddress,
        amount,
        decimals: tokenDecimals,
        chainId: selectedWallet.chainId!,
        walletId: selectedWallet.id,
        walletType: selectedWallet.type,
      });

      if (result.success && result.transactionHash) {
        setTransactionHash(result.transactionHash);
        setNonce(result.diagnostics?.nonce);
        setMintState('success');

        toast({
          title: 'Mint Successful',
          description: `Minted ${amount} ${tokenSymbol} to ${recipientAddress.slice(
            0,
            6
          )}...${recipientAddress.slice(-4)}`,
        });

        onSuccess?.(result.transactionHash);
      } else {
        throw new Error(result.error || 'Mint failed');
      }
    } catch (error) {
      console.error('❌ Mint failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setMintState('error');

      toast({
        variant: 'destructive',
        title: 'Mint Failed',
        description: error instanceof Error ? error.message : 'Failed to mint tokens',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (mintState === 'confirmation') {
      setMintState('input');
    } else if (mintState === 'success' || mintState === 'error') {
      // Reset form
      setMintState('input');
      setRecipientAddress('');
      setAmount('');
      setTransactionHash(null);
      setErrorMessage(null);
      setNonce(undefined);
    }
  };

  /**
   * Render input form
   */
  const renderInputForm = () => (
    <div className="space-y-4">
      {/* Wallet Selection */}
      <div className="space-y-2">
        <Label>Minter Wallet</Label>
        <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
          <SelectTrigger>
            <SelectValue placeholder="Select wallet..." />
          </SelectTrigger>
          <SelectContent>
            {wallets.map((wallet) => (
              <SelectItem key={wallet.id} value={wallet.id}>
                {wallet.name} ({wallet.address.slice(0, 6)}...{wallet.address.slice(-4)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recipient Address */}
      <div className="space-y-2">
        <Label>Recipient Address</Label>
        <Input
          placeholder="0x..."
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          className="font-mono"
        />
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label>Amount ({tokenSymbol})</Label>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="1"
        />
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This will mint <strong>{amount || '0'} {tokenSymbol}</strong> to the recipient address.
          Gas fees will be paid by the selected minter wallet.
        </AlertDescription>
      </Alert>
    </div>
  );

  /**
   * Render confirmation screen
   */
  const renderConfirmation = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Review carefully before confirming:</strong>
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Token Contract:</span>
          <span className="font-mono text-sm">
            {tokenContractAddress.slice(0, 6)}...{tokenContractAddress.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Minter Wallet:</span>
          <span className="font-mono text-sm">
            {selectedWallet?.address.slice(0, 6)}...{selectedWallet?.address.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Recipient:</span>
          <span className="font-mono text-sm">
            {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount:</span>
          <span className="font-semibold">
            {amount} {tokenSymbol}
          </span>
        </div>
      </div>
    </div>
  );

  /**
   * Render processing screen
   */
  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h3 className="text-lg font-semibold">Minting Tokens...</h3>
      <p className="text-sm text-muted-foreground text-center">
        Please wait while your mint transaction is being processed
      </p>
    </div>
  );

  /**
   * Render success screen
   */
  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <CheckCircle2 className="h-12 w-12 text-green-500" />
      <h3 className="text-lg font-semibold">Mint Successful!</h3>
      <div className="w-full space-y-2">
        {transactionHash && (
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground mb-1">Transaction Hash:</p>
            <a
              href={`https://etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-mono text-blue-500 hover:underline break-all"
            >
              {transactionHash}
            </a>
          </div>
        )}
        {nonce !== undefined && (
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground mb-1">Nonce:</p>
            <p className="text-sm font-mono">{nonce}</p>
          </div>
        )}
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-sm">
            Successfully minted <strong>{amount} {tokenSymbol}</strong> to{' '}
            <span className="font-mono">
              {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  /**
   * Render error screen
   */
  const renderError = () => (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h3 className="text-lg font-semibold">Mint Failed</h3>
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  /**
   * Render content based on state
   */
  const renderContent = () => {
    switch (mintState) {
      case 'input':
        return renderInputForm();
      case 'confirmation':
        return renderConfirmation();
      case 'processing':
        return renderProcessing();
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      default:
        return null;
    }
  };

  /**
   * Render footer buttons based on state
   */
  const renderFooter = () => {
    if (mintState === 'processing') {
      return null; // No buttons while processing
    }

    if (mintState === 'success' || mintState === 'error') {
      return (
        <div className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
          <Button onClick={handleBack}>Mint Another</Button>
        </div>
      );
    }

    if (mintState === 'confirmation') {
      return (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button onClick={executeMint} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Confirm Mint
              </>
            )}
          </Button>
        </div>
      );
    }

    // Input state
    return (
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleMint} disabled={!validateInputs().valid}>
          <ArrowRight className="mr-2 h-4 w-4" />
          Continue
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mintState === 'input' && 'Mint Tokens'}
          {mintState === 'confirmation' && 'Confirm Mint'}
          {mintState === 'processing' && 'Processing'}
          {mintState === 'success' && 'Mint Successful'}
          {mintState === 'error' && 'Mint Failed'}
        </CardTitle>
        <CardDescription>
          {mintState === 'input' && `Mint ${tokenSymbol} tokens to a recipient address`}
          {mintState === 'confirmation' && 'Review and confirm your mint transaction'}
          {mintState === 'processing' && 'Your transaction is being processed'}
          {mintState === 'success' && 'Your mint has been completed'}
          {mintState === 'error' && 'There was an error processing your mint'}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
      <CardFooter>{renderFooter()}</CardFooter>
    </Card>
  );
};

export default SingleMintForm;

/**
 * Solana MemoTransfer Extension Form
 * Interface for enabling/disabling MemoTransfer requirement on token accounts
 * 
 * Features:
 * - Enable memo transfer requirement
 * - Disable memo transfer requirement
 * - Account validation
 * - Transaction tracking
 * - Explorer links
 * 
 * MemoTransfer Extension:
 * When enabled, all transfers TO this account must include a memo instruction
 * Use cases: Compliance, payment tracking, regulatory requirements
 */

import React, { useState } from 'react';
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
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Mail,
  MailX
} from 'lucide-react';
import { modernSolanaAccountExtensionsService } from '@/services/wallet/solana/ModernSolanaAccountExtensionsService';
import { address, type Address } from '@solana/kit';
import { logActivity } from '@/infrastructure/activityLogger';
import { useSolanaWallet } from './contexts/SolanaWalletContext';

// ============================================================================
// TYPES
// ============================================================================

interface MemoTransferFormProps {
  projectId: string;
  tokenId: string;
}

type OperationType = 'enable' | 'disable';
type OperationStage = 'idle' | 'validating' | 'processing' | 'confirming' | 'complete';

// ============================================================================
// COMPONENT
// ============================================================================

export function MemoTransferForm({ projectId, tokenId }: MemoTransferFormProps) {
  const { toast } = useToast();
  
  // Get wallet from context
  const { selectedWallet, network } = useSolanaWallet();

  const [isProcessing, setIsProcessing] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>('enable');
  const [operationStage, setOperationStage] = useState<OperationStage>('idle');

  const stageMessages: Record<OperationStage, string> = {
    idle: '',
    validating: 'Validating token account...',
    processing: `${operationType === 'enable' ? 'Enabling' : 'Disabling'} memo transfer...`,
    confirming: 'Waiting for confirmation...',
    complete: `Memo transfer ${operationType === 'enable' ? 'enabled' : 'disabled'} successfully!`
  };

  // Form state
  const [tokenAccountAddress, setTokenAccountAddress] = useState('');
  const [ownerPrivateKey, setOwnerPrivateKey] = useState('');
  
  // Success state
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle enable/disable memo transfer
   */
  const handleMemoTransferOperation = async (operation: OperationType) => {
    if (!selectedWallet) {
      toast({
        title: 'No Wallet Selected',
        description: 'Please select a wallet in the header',
        variant: 'destructive'
      });
      return;
    }

    if (!tokenAccountAddress || !ownerPrivateKey) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both token account address and owner private key',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsProcessing(true);
      setOperationType(operation);
      setOperationStage('validating');

      await logActivity({
        action: `solana_memo_transfer_${operation}_initiated`,
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          projectId,
          tokenId,
          network
        }
      });

      // Validate address format
      setOperationStage('processing');
      const accountAddr = address(tokenAccountAddress);

      // Call appropriate service method
      // Convert network to lowercase for service compatibility
      const networkLowercase = network.toLowerCase() as 'mainnet-beta' | 'devnet' | 'testnet';
      
      const result = operation === 'enable'
        ? await modernSolanaAccountExtensionsService.enableMemoTransfer(
            { tokenAccount: accountAddr },
            {
              network: networkLowercase,
              ownerPrivateKey
            }
          )
        : await modernSolanaAccountExtensionsService.disableMemoTransfer(
            { tokenAccount: accountAddr },
            {
              network: networkLowercase,
              ownerPrivateKey
            }
          );

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || `Failed to ${operation} memo transfer`);
      }

      setOperationStage('confirming');

      // Wait a bit for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setOperationStage('complete');

      // Store success data
      setTransactionSignature(result.signature || null);
      setExplorerUrl(result.explorerUrl || null);

      toast({
        title: `Memo Transfer ${operation === 'enable' ? 'Enabled' : 'Disabled'}`,
        description: (
          <div className="flex flex-col gap-2">
            <p>Transaction confirmed on {network}</p>
            {result.explorerUrl && (
              <a 
                href={result.explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )
      });

      await logActivity({
        action: `solana_memo_transfer_${operation}_completed`,
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          projectId,
          tokenId,
          network,
          signature: result.signature
        }
      });

    } catch (error) {
      console.error(`Memo transfer ${operation} error:`, error);

      const errorMessage = error instanceof Error ? error.message : `Failed to ${operation} memo transfer`;
      
      toast({
        title: `Failed to ${operation.charAt(0).toUpperCase() + operation.slice(1)} Memo Transfer`,
        description: errorMessage,
        variant: 'destructive'
      });

      await logActivity({
        action: `solana_memo_transfer_${operation}_failed`,
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          projectId,
          tokenId,
          network,
          error: errorMessage
        }
      });

      setOperationStage('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setTokenAccountAddress('');
    setOwnerPrivateKey('');
    setTransactionSignature(null);
    setExplorerUrl(null);
    setOperationStage('idle');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Memo Transfer Extension
          </CardTitle>
          <CardDescription>
            Require or remove memo requirement for incoming transfers to a token account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What is MemoTransfer?</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>
                When enabled on a token account, ALL transfers TO that account must include a memo instruction.
              </p>
              <div className="mt-2">
                <p className="font-semibold mb-1">Use Cases:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Compliance and regulatory requirements</li>
                  <li>Payment tracking and reconciliation</li>
                  <li>Transaction notes and references</li>
                  <li>Anti-money laundering (AML) controls</li>
                </ul>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Token-2022 Extension
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Success Message */}
          {operationStage === 'complete' && transactionSignature && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700 space-y-2">
                <p>Memo transfer {operationType === 'enable' ? 'enabled' : 'disabled'} successfully</p>
                {explorerUrl && (
                  <a 
                    href={explorerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    View Transaction <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={resetForm}>
                    Perform Another Operation
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          {operationStage !== 'complete' && (
            <div className="space-y-4">
              {/* Token Account Address */}
              <div className="space-y-2">
                <Label htmlFor="tokenAccount">Token Account Address</Label>
                <Input
                  id="tokenAccount"
                  placeholder="Enter token account address"
                  value={tokenAccountAddress}
                  onChange={(e) => setTokenAccountAddress(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  The token account to enable/disable memo transfers for
                </p>
              </div>

              {/* Owner Private Key */}
              <div className="space-y-2">
                <Label htmlFor="ownerKey">Account Owner Private Key</Label>
                <Input
                  id="ownerKey"
                  type="password"
                  placeholder="Enter account owner's private key (base58)"
                  value={ownerPrivateKey}
                  onChange={(e) => setOwnerPrivateKey(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Private key of the account owner (required to sign transaction)
                </p>
              </div>

              {/* Network Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{network}</Badge>
                <Badge variant={selectedWallet ? 'default' : 'secondary'}>
                  {selectedWallet ? `Wallet: ${selectedWallet.wallet_address.slice(0, 8)}...` : 'No wallet selected'}
                </Badge>
              </div>

              {/* Processing Status */}
              {isProcessing && operationStage !== 'idle' && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>Processing...</AlertTitle>
                  <AlertDescription>{stageMessages[operationStage]}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleMemoTransferOperation('enable')}
                  disabled={isProcessing || !tokenAccountAddress || !ownerPrivateKey}
                  className="flex-1"
                >
                  {isProcessing && operationType === 'enable' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enable Memo Transfer
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleMemoTransferOperation('disable')}
                  disabled={isProcessing || !tokenAccountAddress || !ownerPrivateKey}
                  variant="outline"
                  className="flex-1"
                >
                  {isProcessing && operationType === 'disable' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    <>
                      <MailX className="h-4 w-4 mr-2" />
                      Disable Memo Transfer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert variant="default" className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Important Notes</AlertTitle>
        <AlertDescription className="text-yellow-700 text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Only the account owner can enable/disable memo transfers</li>
            <li>When enabled, senders must include memo instruction in transfers</li>
            <li>Transfers without memo will fail when this extension is enabled</li>
            <li>This is a Token-2022 account-level extension</li>
            <li>Can be toggled on/off at any time by the account owner</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

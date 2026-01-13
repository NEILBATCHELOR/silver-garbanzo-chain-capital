/**
 * Policy-Aware Transfer Operation Component
 * Integrates with Policy Engine for pre-transaction validation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { transferService, nonceManager } from '@/services/wallet';
import { useOperationRouting } from '@/services/routing';
import { ExecutionModeSelector } from '@/components/routing';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PolicyAwareTransferOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  balance?: string;
  wallets?: Array<{
    id: string;
    address: string;
    name: string;
    type: 'project' | 'user';
    chainId?: number;
    blockchain?: string;
  }>;
  onSuccess?: () => void;
}

export const PolicyAwareTransferOperation: React.FC<PolicyAwareTransferOperationProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  balance,
  wallets = [],
  onSuccess
}) => {
  // Form state
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenIdToTransfer, setTokenIdToTransfer] = useState('');
  const [tokenTypeId, setTokenTypeId] = useState('');
  const [partition, setPartition] = useState('');
  const [memo, setMemo] = useState('');
  const [nonceGapWarning, setNonceGapWarning] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  // UI state
  const [showValidation, setShowValidation] = useState(false);
  const [executionStep, setExecutionStep] = useState<'input' | 'validation' | 'execution' | 'complete'>('input');
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      setExecutionStep('complete');
      onSuccess?.();
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();
  const { supabase } = useSupabase();

  // 🆕 Routing hook - Intelligent execution mode selection
  const { decision, executionMode, setExecutionMode, useGateway } = useOperationRouting({
    operation: 'transfer',
    requiresPolicy: true,
    requiresCompliance: true,
    requiresAudit: true,
    isBatch: false
  });

  // Validate input before submission
  const validateInput = (): boolean => {
    if (!isDeployed) {
      return false;
    }

    // Require wallet selection if wallets are available
    if (wallets.length > 0 && !selectedWallet) {
      return false;
    }
    
    if (!recipient) {
      return false;
    }
    
    // Validate recipient address format
    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      return false;
    }
    
    if (tokenStandard === 'ERC-20' || tokenStandard === 'ERC-1400' || tokenStandard === 'ERC-4626') {
      if (!amount || Number(amount) <= 0) {
        return false;
      }
      // Check if amount doesn't exceed balance
      if (balance && Number(amount) > Number(balance)) {
        return false;
      }
    }
    
    if (tokenStandard === 'ERC-721') {
      return !!tokenIdToTransfer;
    }
    
    if (tokenStandard === 'ERC-1155') {
      return !!tokenTypeId && !!amount && Number(amount) > 0;
    }
    
    if (tokenStandard === 'ERC-1400' && !partition) {
      return false;
    }
    
    return true;
  };

  // Handle pre-transaction validation
  const handleValidate = async () => {
    setExecutionStep('validation');
    setNonceGapWarning(null);

    // Get selected wallet
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) {
      console.error('No wallet selected');
      return;
    }

    // Check for nonce gaps (CRITICAL for transaction success)
    try {
      const rpcConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'testnet');
      if (rpcConfig) {
        const provider = new ethers.JsonRpcProvider(rpcConfig.url);
        const nonceStatus = await nonceManager.getNonceStatus(wallet.address, provider);

        if (nonceStatus.hasGap) {
          const warning = `⚠️ NONCE GAP DETECTED: ${nonceStatus.gapSize} pending transaction(s) may cause failures. Consider fixing gaps before proceeding.`;
          setNonceGapWarning(warning);
        }
      }
    } catch (error) {
      console.error('Nonce gap check failed:', error);
    }
    
    // Build transaction for validation
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: wallet.address,
      to: tokenAddress,
      from: wallet.address,
      data: '0x', // Will be built by gateway
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: 'transfer' as const,
          amount: amount || '0',
          recipient,
          tokenId: tokenIdToTransfer || tokenTypeId,
          partition,
          memo
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
    
    setShowValidation(true);
  };

  // Handle execution after validation
  const handleExecute = async () => {
    if (!validationResult?.valid) {
      return;
    }

    // Get selected wallet
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) {
      console.error('No wallet selected');
      return;
    }

    setExecutionStep('execution');
    
    try {
      // 🆕 Route based on intelligent decision
      if (useGateway) {
        // Route through Gateway (enhanced/foundry/basic mode)
        console.log(`Using Gateway (${executionMode} mode):`, decision?.reason);
        
        await operations.transfer(
          tokenAddress,
          recipient,
          amount || '0', // Keep as string - Gateway expects string | bigint
          chain
        );
        
        setExecutionStep('complete');
        onSuccess?.();
      } else {
        // Route directly to service (direct mode)
        console.log('Using direct service:', decision?.reason);
        
        const result = await transferService.executeTransfer({
          from: wallet.address,
          to: recipient,
          amount: amount || '0',
          chainId: wallet.chainId || 0,
          walletId: wallet.id,
          walletType: wallet.type
        });

        if (!result.success) {
          throw new Error(result.error || 'Transfer failed');
        }

        // Store transaction hash and nonce for diagnostics
        setTransactionHash(result.transactionHash || null);
        
        // Manual logging (since bypassing Gateway)
        await supabase.from('token_operations').insert({
          token_id: tokenId,
          operation_type: TokenOperationType.TRANSFER,
          operator: wallet.address,
          sender: wallet.address,
          recipient,
          amount: amount || null,
          transaction_hash: result.transactionHash,
          status: 'success',
          timestamp: new Date().toISOString(),
          metadata: {
            nonce: result.diagnostics?.nonce, // CRITICAL: Store nonce for tracking
            memo,
            routing: 'direct-service'
          }
        });

        setExecutionStep('complete');
        onSuccess?.();
      }
      
    } catch (error) {
      console.error('Transfer operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setRecipient('');
    setAmount('');
    setTokenIdToTransfer('');
    setTokenTypeId('');
    setPartition('');
    setMemo('');
    setShowValidation(false);
    setExecutionStep('input');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-green-500" />
              Policy-Protected Transfer Operation
              <Badge variant="outline" className="ml-2">Nonce-Aware</Badge>
            </CardTitle>
            <CardDescription>
              Transfer {tokenSymbol} tokens with automated policy validation and nonce management
            </CardDescription>
          </div>
          <Badge variant={isDeployed ? 'default' : 'secondary'}>
            {isDeployed ? 'Deployed' : 'Not Deployed'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* 🆕 Execution Mode Selector (Collapsible) */}
        <Collapsible className="mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between">
              <span>Execution Mode: {executionMode}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ExecutionModeSelector
              value={executionMode}
              onChange={setExecutionMode}
              decision={decision}
              showDecisionInfo={true}
            />
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={executionStep} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="input" disabled={executionStep !== 'input'}>
              Input
            </TabsTrigger>
            <TabsTrigger value="validation" disabled={executionStep === 'input'}>
              Validation
            </TabsTrigger>
            <TabsTrigger value="execution" disabled={executionStep !== 'execution'}>
              Execution
            </TabsTrigger>
            <TabsTrigger value="complete" disabled={executionStep !== 'complete'}>
              Complete
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            {/* Wallet Selection */}
            {wallets.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="wallet">Transfer From Wallet *</Label>
                <Select
                  value={selectedWallet}
                  onValueChange={setSelectedWallet}
                  disabled={!isDeployed}
                >
                  <SelectTrigger id="wallet">
                    <SelectValue placeholder="Select wallet to transfer from" />
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
            )}

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address *</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={!isDeployed}
              />
            </div>

            {(tokenStandard === 'ERC-20' || tokenStandard === 'ERC-1400' || tokenStandard === 'ERC-4626') && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!isDeployed}
                />
                {balance && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {balance} {tokenSymbol}
                  </p>
                )}
              </div>
            )}

            {tokenStandard === 'ERC-721' && (
              <div className="space-y-2">
                <Label htmlFor="tokenIdToTransfer">Token ID *</Label>
                <Input
                  id="tokenIdToTransfer"
                  placeholder="Enter token ID"
                  value={tokenIdToTransfer}
                  onChange={(e) => setTokenIdToTransfer(e.target.value)}
                  disabled={!isDeployed}
                />
              </div>
            )}

            {tokenStandard === 'ERC-1155' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tokenTypeId">Token Type ID *</Label>
                  <Input
                    id="tokenTypeId"
                    placeholder="1"
                    value={tokenTypeId}
                    onChange={(e) => setTokenTypeId(e.target.value)}
                    disabled={!isDeployed}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!isDeployed}
                  />
                </div>
              </>
            )}

            {tokenStandard === 'ERC-1400' && (
              <div className="space-y-2">
                <Label htmlFor="partition">Partition *</Label>
                <Input
                  id="partition"
                  placeholder="default"
                  value={partition}
                  onChange={(e) => setPartition(e.target.value)}
                  disabled={!isDeployed}
                />
                <p className="text-xs text-muted-foreground">
                  Transfer from specific partition (e.g., locked, vested, available)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="memo">Memo (Optional)</Label>
              <Input
                id="memo"
                placeholder="Transfer memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={!isDeployed}
              />
            </div>

            {/* Balance warning */}
            {amount && balance && Number(amount) > Number(balance) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Insufficient Balance</AlertTitle>
                <AlertDescription>
                  Amount exceeds available balance of {balance} {tokenSymbol}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Validating transfer against policies...</span>
              </div>
            )}

            {validationResult && !validating && (
              <div className="space-y-4">
                {/* Nonce Gap Warning */}
                {nonceGapWarning && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nonce Gap Detected</AlertTitle>
                    <AlertDescription>{nonceGapWarning}</AlertDescription>
                  </Alert>
                )}

                {/* Overall Status */}
                <Alert variant={validationResult.valid ? 'default' : 'destructive'}>
                  <AlertTitle className="flex items-center gap-2">
                    {validationResult.valid ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    {validationResult.valid ? 'Transfer Approved' : 'Transfer Blocked'}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid 
                      ? 'All policies and rules have been satisfied.'
                      : 'One or more policies prevent this transfer.'}
                  </AlertDescription>
                </Alert>

                {/* Policy Checks */}
                {validationResult.policies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Policy Checks</h4>
                    {validationResult.policies.map((policy) => (
                      <div key={policy.policyId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{policy.policyName}</span>
                        <Badge variant={policy.status === 'passed' ? 'success' : 'destructive'}>
                          {policy.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rule Evaluations */}
                {validationResult.rules.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Rule Evaluations</h4>
                    {validationResult.rules.map((rule) => (
                      <div key={rule.ruleId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="text-sm">{rule.ruleName}</span>
                          <span className="text-xs text-muted-foreground ml-2">({rule.category})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.impact === 'critical' ? 'destructive' : 'secondary'}>
                            {rule.impact}
                          </Badge>
                          <Badge variant={rule.status === 'passed' ? 'success' : 'destructive'}>
                            {rule.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transfer Details */}
                <Alert>
                  <AlertTitle>Transfer Summary</AlertTitle>
                  <AlertDescription>
                    From: {window.ethereum?.selectedAddress?.slice(0, 6)}...{window.ethereum?.selectedAddress?.slice(-4)}<br />
                    To: {recipient.slice(0, 6)}...{recipient.slice(-4)}<br />
                    Amount: {amount || 'N/A'} {tokenSymbol}<br />
                    {tokenIdToTransfer && `Token ID: ${tokenIdToTransfer}`}
                    {memo && `Memo: ${memo}`}
                  </AlertDescription>
                </Alert>

                {/* Gas Estimate */}
                {validationResult.gasEstimate && (
                  <Alert>
                    <AlertTitle>Gas Estimate</AlertTitle>
                    <AlertDescription>
                      Estimated gas: {validationResult.gasEstimate.limit?.toString()} units<br />
                      Gas price: {validationResult.gasEstimate.price?.toString()} wei<br />
                      Estimated cost: {validationResult.gasEstimate.estimatedCost}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Errors */}
                {validationResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validationResult.errors.map((error, i) => (
                          <li key={i}>{error.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="execution" className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Executing transfer...</span>
            </div>
            {gatewayError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Execution Error</AlertTitle>
                <AlertDescription>{gatewayError.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="complete" className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Transfer Complete!</AlertTitle>
              <AlertDescription>
                Successfully transferred {amount} {tokenSymbol} to {recipient.slice(0, 6)}...{recipient.slice(-4)}
                {transactionHash && (
                  <>
                    <br />
                    <a 
                      href={`https://explorer.hoodi.network/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline text-xs"
                    >
                      View on Explorer →
                    </a>
                  </>
                )}
              </AlertDescription>
            </Alert>
            <Button onClick={handleReset} className="w-full">
              New Transfer
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        {executionStep === 'input' && (
          <Button 
            onClick={handleValidate} 
            disabled={!validateInput() || validating}
            className="w-full"
            variant="default"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Validate Transfer with Policies
          </Button>
        )}

        {executionStep === 'validation' && validationResult && (
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => setExecutionStep('input')}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleExecute} 
              disabled={!validationResult.valid || gatewayLoading}
              className="flex-1"
              variant="default"
            >
              {gatewayLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Execute Transfer
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

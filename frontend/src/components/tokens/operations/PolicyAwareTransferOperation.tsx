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
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';

interface PolicyAwareTransferOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  balance?: string;
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
  onSuccess
}) => {
  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenIdToTransfer, setTokenIdToTransfer] = useState('');
  const [tokenTypeId, setTokenTypeId] = useState('');
  const [partition, setPartition] = useState('');
  const [memo, setMemo] = useState('');
  
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

  // Validate input before submission
  const validateInput = (): boolean => {
    if (!isDeployed) {
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
    
    // Build transaction for validation
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: window.ethereum?.selectedAddress || '',
      to: tokenAddress,
      from: window.ethereum?.selectedAddress || '',
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

    setExecutionStep('execution');
    
    try {
      await operations.transfer(
        tokenAddress,
        recipient,
        amount || '0',
        chain
      );
      
      // Log operation to database
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.TRANSFER,
        operator: window.ethereum?.selectedAddress,
        sender: window.ethereum?.selectedAddress,
        recipient,
        amount: amount || null,
        transaction_hash: null, // Will be updated by gateway
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
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
            </CardTitle>
            <CardDescription>
              Transfer {tokenSymbol} tokens with automated policy validation
            </CardDescription>
          </div>
          <Badge variant={isDeployed ? 'default' : 'secondary'}>
            {isDeployed ? 'Deployed' : 'Not Deployed'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
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

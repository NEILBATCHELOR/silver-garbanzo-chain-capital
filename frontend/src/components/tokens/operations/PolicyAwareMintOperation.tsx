/**
 * Policy-Aware Mint Operation Component
 * Integrates with Policy Engine for pre-transaction validation
 * Now includes bulk minting functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
// Note: BulkMintForm import removed - use standalone component for bulk minting

interface PolicyAwareMintOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

export const PolicyAwareMintOperation: React.FC<PolicyAwareMintOperationProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  onSuccess
}) => {
  // Tabs state
  const [mintMode, setMintMode] = useState<'single' | 'bulk'>('single');
  
  // Single mint form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenTypeId, setTokenTypeId] = useState('');
  const [slotId, setSlotId] = useState('');
  
  // Note: Bulk mint - use standalone BulkMintForm component for new implementations
  // Keeping minimal state for backward compatibility with existing bulk mint tab
  const [bulkMintEntries, setBulkMintEntries] = useState<Array<{
    id: string;
    toAddress: string;
    amount: string;
    status: 'pending' | 'validating' | 'processing' | 'success' | 'error';
    transactionHash?: string;
    error?: string;
  }>>([]);
  
  // UI state
  const [showValidation, setShowValidation] = useState(false);
  const [executionStep, setExecutionStep] = useState<'input' | 'validation' | 'execution' | 'complete'>('input');
  
  // Hooks - Fixed: properly destructure operations.mint
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
    if (tokenStandard === 'ERC-20' || tokenStandard === 'ERC-1400') {
      return !!amount && Number(amount) > 0;
    }
    if (tokenStandard === 'ERC-1155') {
      return !!tokenTypeId && !!amount && Number(amount) > 0;
    }
    if (tokenStandard === 'ERC-3525') {
      return !!slotId && !!amount;
    }
    return true;
  };

  // Handle pre-transaction validation - Fixed: proper Transaction type
  const handleValidate = async () => {
    setExecutionStep('validation');
    
    // Build transaction for validation matching centralModels.ts Transaction type
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
          type: 'mint' as const,
          amount: amount || '0',
          recipient,
          tokenId: tokenTypeId,
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
    
    setShowValidation(true);
  };

  // Handle execution after validation - Fixed: use operations.mint
  const handleExecute = async () => {
    if (!validationResult?.valid) {
      return;
    }

    setExecutionStep('execution');
    
    try {
      await operations.mint(tokenAddress, recipient, amount || '0', chain);
      
      // Log operation to database
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.MINT,
        operator: window.ethereum?.selectedAddress,
        recipient,
        amount: amount || null,
        transaction_hash: null, // Will be updated by gateway
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Mint operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setRecipient('');
    setAmount('');
    setTokenTypeId('');
    setSlotId('');
    setShowValidation(false);
    setExecutionStep('input');
  };

  // Bulk mint - simplified for backward compatibility
  // NOTE: Use standalone BulkMintForm component for production bulk minting
  const handleBulkMint = async () => {
    console.warn('Bulk mint execution disabled in this component. Use standalone BulkMintForm component.');
    // For production bulk minting with nonce management, use:
    // import { BulkMintForm } from '@/components/tokens/operations';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Policy-Protected Mint Operation
            </CardTitle>
            <CardDescription>
              Mint new {tokenSymbol} tokens with automated policy validation
            </CardDescription>
          </div>
          <Badge variant={isDeployed ? 'default' : 'secondary'}>
            {isDeployed ? 'Deployed' : 'Not Deployed'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Outer tabs for single vs bulk */}
        <Tabs value={mintMode} onValueChange={(v) => setMintMode(v as 'single' | 'bulk')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="single">Single Mint</TabsTrigger>
            <TabsTrigger value="bulk">
              <Users className="h-4 w-4 mr-2" />
              Bulk Mint
            </TabsTrigger>
          </TabsList>

          {/* Single Mint Tab Content */}
          <TabsContent value="single">
            <Tabs value={executionStep} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
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

            {tokenStandard === 'ERC-3525' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="slotId">Slot ID *</Label>
                  <Input
                    id="slotId"
                    placeholder="1"
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    disabled={!isDeployed}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Value *</Label>
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
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Validating transaction against policies...</span>
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
                    {validationResult.valid ? 'Transaction Approved' : 'Transaction Blocked'}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid 
                      ? 'All policies and rules have been satisfied.'
                      : 'One or more policies prevent this operation.'}
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

                {/* Gas Estimate */}
                {validationResult.gasEstimate && (
                  <Alert>
                    <AlertTitle>Gas Estimate</AlertTitle>
                    <AlertDescription>
                      Estimated gas: {validationResult.gasEstimate.limit?.toString()} units
                      <br />
                      Gas price: {validationResult.gasEstimate.price?.toString()} wei
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
              <span className="ml-2">Executing mint operation...</span>
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
              <AlertTitle>Operation Complete!</AlertTitle>
              <AlertDescription>
                Successfully minted {amount} {tokenSymbol} to {recipient.slice(0, 6)}...{recipient.slice(-4)}
              </AlertDescription>
            </Alert>
            <Button onClick={handleReset} className="w-full">
              New Operation
            </Button>
          </TabsContent>
            </Tabs>
          </TabsContent>
          
          {/* Bulk Mint Tab Content */}
          <TabsContent value="bulk">
            {/* 
              MIGRATION NOTE: The standalone BulkMintForm component now handles execution.
              For production bulk minting, use:
              
              import { BulkMintForm } from '@/components/tokens/operations';
              
              <BulkMintForm
                tokenContractAddress={tokenAddress}
                tokenDecimals={18}
                tokenSymbol={tokenSymbol}
                wallets={availableWallets}
                onComplete={(results) => { ... }}
              />
              
              The new component includes:
              - Automatic nonce management
              - Sequential processing with delays
              - Nonce gap detection
              - Real-time progress tracking
              - Error recovery
            */}
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Bulk Minting Available</AlertTitle>
              <AlertDescription>
                For production bulk minting with automatic nonce management and sequential processing,
                use the standalone <strong>BulkMintForm</strong> component. It provides wallet selection,
                nonce gap detection, and comprehensive error handling.
              </AlertDescription>
            </Alert>
            
            {/* Minimal UI for backward compatibility - no execution */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                The enhanced BulkMintForm component is available as a standalone component.
                Contact your administrator for integration assistance.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        {executionStep === 'input' && (
          <Button 
            onClick={handleValidate} 
            disabled={!validateInput() || validating}
            className="w-full"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Validate with Policies
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
            >
              {gatewayLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              Execute Mint
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
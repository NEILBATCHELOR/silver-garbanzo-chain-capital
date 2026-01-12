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
import BulkMintForm, { type BulkMintEntry } from './BulkMintForm';

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
  
  // Bulk mint state
  const [bulkMintEntries, setBulkMintEntries] = useState<BulkMintEntry[]>([]);
  
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

  // Handle bulk mint execution
  const handleBulkMint = async () => {
    const pendingEntries = bulkMintEntries.filter(e => e.status === 'pending');
    
    if (pendingEntries.length === 0) {
      return;
    }

    // Update all pending entries to validating status
    const updatedEntries = bulkMintEntries.map(entry => 
      entry.status === 'pending' ? { ...entry, status: 'validating' as const } : entry
    );
    setBulkMintEntries(updatedEntries);

    // Process each entry sequentially
    for (const entry of pendingEntries) {
      try {
        // Update to processing status
        setBulkMintEntries(prev => prev.map(e => 
          e.toAddress === entry.toAddress && e.amount === entry.amount
            ? { ...e, status: 'processing' as const }
            : e
        ));

        // Build transaction for validation
        const transaction = {
          id: `bulk-mint-${Date.now()}-${entry.toAddress}`,
          walletId: window.ethereum?.selectedAddress || '',
          to: tokenAddress,
          from: window.ethereum?.selectedAddress || '',
          data: '0x',
          value: '0',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          metadata: {
            operation: {
              type: 'mint' as const,
              amount: entry.amount,
              recipient: entry.toAddress,
              tokenId: tokenTypeId || undefined,
            }
          }
        };

        // Validate transaction
        const validation = await validateTransaction(transaction, {
          urgency: 'standard',
          simulate: true
        });

        if (!validation?.valid) {
          throw new Error('Validation failed');
        }

        // Execute mint operation
        await operations.mint(tokenAddress, entry.toAddress, entry.amount, chain);
        
        // Log operation to database
        await supabase.from('token_operations').insert({
          token_id: tokenId,
          operation_type: TokenOperationType.MINT,
          operator: window.ethereum?.selectedAddress,
          recipient: entry.toAddress,
          amount: entry.amount,
          transaction_hash: null,
          status: 'pending',
          timestamp: new Date().toISOString()
        });

        // Update to success status
        setBulkMintEntries(prev => prev.map(e => 
          e.toAddress === entry.toAddress && e.amount === entry.amount
            ? { ...e, status: 'success' as const }
            : e
        ));

      } catch (error) {
        console.error(`Bulk mint failed for ${entry.toAddress}:`, error);
        
        // Update to error status
        setBulkMintEntries(prev => prev.map(e => 
          e.toAddress === entry.toAddress && e.amount === entry.amount
            ? { ...e, status: 'error' as const, error: error instanceof Error ? error.message : 'Unknown error' }
            : e
        ));
      }
    }

    // Show success toast if any succeeded
    const successCount = bulkMintEntries.filter(e => e.status === 'success').length;
    if (successCount > 0) {
      onSuccess?.();
    }
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
            <BulkMintForm 
              onEntriesUpdate={(entries) => setBulkMintEntries(entries)} 
              onClear={() => setBulkMintEntries([])}
            />
            {bulkMintEntries.length > 0 && (
              <div className="mt-4">
                <Button 
                  onClick={handleBulkMint}
                  disabled={bulkMintEntries.filter(e => e.status === 'pending').length === 0}
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Validate and Mint All ({bulkMintEntries.filter(e => e.status === 'pending').length} entries)
                </Button>
              </div>
            )}
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
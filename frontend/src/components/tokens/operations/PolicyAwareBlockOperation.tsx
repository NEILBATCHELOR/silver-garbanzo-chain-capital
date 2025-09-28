/**
 * Policy-Aware Block Operation Component
 * Integrates with Policy Engine for pre-transaction validation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, Ban } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';

interface PolicyAwareBlockOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

export const PolicyAwareBlockOperation: React.FC<PolicyAwareBlockOperationProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  onSuccess
}) => {
  // Form state
  const [addressToBlock, setAddressToBlock] = useState('');
  const [reason, setReason] = useState('');
  
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
    
    if (!addressToBlock) {
      return false;
    }
    
    // Validate address format
    if (!addressToBlock.startsWith('0x') || addressToBlock.length !== 42) {
      return false;
    }
    
    if (!reason || reason.trim().length < 10) {
      return false;
    }
    
    // Don't allow blocking your own address
    if (addressToBlock.toLowerCase() === window.ethereum?.selectedAddress?.toLowerCase()) {
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
          type: 'block' as const,
          address: addressToBlock,
          reason
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'immediate', // Blocking operations should be immediate
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
      await operations.block(
        tokenAddress,
        addressToBlock,
        reason,
        chain
      );
      
      // Log operation to database
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.BLOCK,
        operator: window.ethereum?.selectedAddress,
        blocked_address: addressToBlock,
        block_reason: reason,
        transaction_hash: null, // Will be updated by gateway
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Block operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setAddressToBlock('');
    setReason('');
    setShowValidation(false);
    setExecutionStep('input');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Policy-Protected Block Operation
            </CardTitle>
            <CardDescription>
              Block an address from {tokenSymbol} operations with policy validation
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
              <Label htmlFor="addressToBlock">Address to Block *</Label>
              <Input
                id="addressToBlock"
                placeholder="0x..."
                value={addressToBlock}
                onChange={(e) => setAddressToBlock(e.target.value)}
                disabled={!isDeployed}
              />
              {addressToBlock && addressToBlock.toLowerCase() === window.ethereum?.selectedAddress?.toLowerCase() && (
                <p className="text-xs text-destructive">
                  You cannot block your own address
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Block Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Provide a detailed reason for blocking this address (minimum 10 characters)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!isDeployed}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be permanently recorded on the blockchain
              </p>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning: Serious Action</AlertTitle>
              <AlertDescription>
                Blocking an address is a serious compliance action that will:
                <ul className="list-disc list-inside mt-2">
                  <li>Prevent the address from transferring tokens</li>
                  <li>Prevent the address from receiving tokens</li>
                  <li>Freeze any tokens currently held by the address</li>
                  <li>Require compliance review to unblock</li>
                </ul>
                Ensure you have proper authorization before proceeding.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Validating block operation against policies...</span>
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
                    {validationResult.valid ? 'Block Operation Approved' : 'Block Operation Denied'}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid 
                      ? 'You have the necessary permissions to block this address.'
                      : 'You do not have permission to block addresses.'}
                  </AlertDescription>
                </Alert>

                {/* Policy Checks */}
                {validationResult.policies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Compliance Policy Checks</h4>
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
                    <h4 className="text-sm font-semibold">Compliance Rules</h4>
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

                {/* Block Details */}
                <Alert>
                  <AlertTitle>Block Operation Summary</AlertTitle>
                  <AlertDescription>
                    Address to block: {addressToBlock.slice(0, 6)}...{addressToBlock.slice(-4)}<br />
                    Initiated by: {window.ethereum?.selectedAddress?.slice(0, 6)}...{window.ethereum?.selectedAddress?.slice(-4)}<br />
                    Reason: {reason}
                  </AlertDescription>
                </Alert>

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
              <span className="ml-2">Executing block operation...</span>
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
              <AlertTitle>Address Blocked!</AlertTitle>
              <AlertDescription>
                Successfully blocked address {addressToBlock.slice(0, 6)}...{addressToBlock.slice(-4)}<br />
                Reason: {reason}
              </AlertDescription>
            </Alert>
            <Button onClick={handleReset} className="w-full">
              New Operation
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
            variant="destructive"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Validate Block with Policies
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
              variant="destructive"
              className="flex-1"
            >
              {gatewayLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Execute Block
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

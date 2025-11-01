/**
 * Policy-Aware Pause Operation Component
 * Integrates with Policy Engine for pre-transaction validation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, PauseCircle, PlayCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';

interface PolicyAwarePauseOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  isPaused: boolean;
  onSuccess?: () => void;
  hasPauseFeature: boolean;
}

export const PolicyAwarePauseOperation: React.FC<PolicyAwarePauseOperationProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  isPaused,
  onSuccess,
  hasPauseFeature
}) => {
  // Form state
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

  // Determine operation action
  const action = isPaused ? 'unpause' : 'pause';
  const actionLabel = isPaused ? 'Unpause' : 'Pause';

  // Validate input before submission
  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    if (!hasPauseFeature) return false;
    return true; // Reason is optional
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
          type: isPaused ? 'unpause' : 'pause',
          reason: reason || `Manual ${action} operation`
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
      // Execute pause or unpause via gateway
      if (isPaused) {
        await operations.unpause(tokenAddress, chain, reason || undefined);
      } else {
        await operations.pause(tokenAddress, chain, reason || undefined);
      }
      
      // Log operation to database
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: isPaused ? TokenOperationType.UNPAUSE : TokenOperationType.PAUSE,
        operator: window.ethereum?.selectedAddress,
        transaction_hash: null, // Will be updated by gateway
        status: 'pending',
        timestamp: new Date().toISOString(),
        metadata: {
          reason: reason || `Manual ${action} operation`
        }
      });
      
    } catch (error) {
      console.error(`${actionLabel} operation failed:`, error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
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
              {isPaused ? (
                <PlayCircle className="h-5 w-5 text-green-500" />
              ) : (
                <PauseCircle className="h-5 w-5 text-amber-500" />
              )}
              <Shield className="h-5 w-5" />
              Policy-Protected {actionLabel} Operation
            </CardTitle>
            <CardDescription>
              {isPaused 
                ? `Resume ${tokenSymbol} token operations with automated policy validation`
                : `Temporarily halt ${tokenSymbol} token operations with automated policy validation`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isDeployed ? 'default' : 'secondary'}>
              {isDeployed ? 'Deployed' : 'Not Deployed'}
            </Badge>
            <Badge variant={isPaused ? 'destructive' : 'success'}>
              {isPaused ? 'Paused' : 'Active'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!isDeployed && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Deployed</AlertTitle>
            <AlertDescription>
              This token must be deployed to a blockchain before pausing/unpausing
            </AlertDescription>
          </Alert>
        )}
        
        {!hasPauseFeature && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Feature Not Enabled</AlertTitle>
            <AlertDescription>
              This token does not have the pausable feature enabled
            </AlertDescription>
          </Alert>
        )}

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
            <div className="py-2">
              {isPaused ? (
                <div className="p-4 bg-amber-50 rounded-md border border-amber-200">
                  <h4 className="text-amber-800 font-medium mb-1">Token is Currently Paused</h4>
                  <p className="text-amber-700 text-sm">
                    All transfers and operations are temporarily disabled. Unpausing will allow normal operations to resume.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                  <h4 className="text-blue-800 font-medium mb-1">Token is Currently Active</h4>
                  <p className="text-blue-700 text-sm">
                    Pausing will temporarily halt all transfers and most operations until explicitly unpaused.
                    This is useful for emergency situations or maintenance.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder={`Enter reason for ${action} operation (e.g., "Emergency maintenance", "Security audit")`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!isDeployed || !hasPauseFeature}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Providing a reason helps with audit trails and transparency.
              </p>
            </div>
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
              <span className="ml-2">Executing {action} operation...</span>
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
                Successfully {isPaused ? 'unpaused' : 'paused'} {tokenName} ({tokenSymbol})
                {reason && (
                  <>
                    <br />
                    <span className="text-xs text-muted-foreground mt-1">Reason: {reason}</span>
                  </>
                )}
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
            variant={isPaused ? 'default' : 'outline'}
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
              variant={isPaused ? 'default' : 'outline'}
            >
              {gatewayLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              Execute {actionLabel}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
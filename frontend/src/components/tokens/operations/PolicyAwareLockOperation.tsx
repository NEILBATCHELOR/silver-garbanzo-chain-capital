/**
 * Policy-Aware Lock Operation Component
 * Integrates with Policy Engine for pre-transaction validation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';

interface PolicyAwareLockOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

const LOCK_DURATIONS = [
  { value: '3600', label: '1 Hour' },
  { value: '86400', label: '1 Day' },
  { value: '604800', label: '1 Week' },
  { value: '2592000', label: '30 Days' },
  { value: '7776000', label: '90 Days' },
  { value: '15552000', label: '180 Days' },
  { value: '31536000', label: '1 Year' },
];

export const PolicyAwareLockOperation: React.FC<PolicyAwareLockOperationProps> = ({
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
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [reason, setReason] = useState('');
  const [tokenIdToLock, setTokenIdToLock] = useState('');
  
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
    
    const effectiveDuration = duration === 'custom' ? customDuration : duration;
    if (!effectiveDuration || Number(effectiveDuration) <= 0) {
      return false;
    }
    
    if (!reason || reason.trim().length < 10) {
      return false;
    }
    
    if (tokenStandard === 'ERC-20' || tokenStandard === 'ERC-1400') {
      return !!amount && Number(amount) > 0;
    }
    
    if (tokenStandard === 'ERC-721') {
      return !!tokenIdToLock;
    }
    
    return true;
  };

  // Calculate unlock time
  const calculateUnlockTime = () => {
    const effectiveDuration = duration === 'custom' ? customDuration : duration;
    const seconds = Number(effectiveDuration);
    const unlockDate = new Date(Date.now() + seconds * 1000);
    return unlockDate.toLocaleString();
  };

  // Handle pre-transaction validation
  const handleValidate = async () => {
    setExecutionStep('validation');
    
    const effectiveDuration = duration === 'custom' ? customDuration : duration;
    
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
          type: 'lock' as const,
          amount: amount || '0',
          duration: Number(effectiveDuration),
          reason,
          tokenId: tokenIdToLock
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
    
    const effectiveDuration = duration === 'custom' ? customDuration : duration;
    
    try {
      await operations.lock(
        tokenAddress,
        amount || '0',
        Number(effectiveDuration),
        reason,
        chain
      );
      
      // Calculate unlock time
      const unlockTime = new Date(Date.now() + Number(effectiveDuration) * 1000);
      
      // Log operation to database
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.LOCK,
        operator: window.ethereum?.selectedAddress,
        amount: amount || null,
        lock_duration: Number(effectiveDuration),
        lock_reason: reason,
        unlock_time: unlockTime.toISOString(),
        transaction_hash: null, // Will be updated by gateway
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Lock operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setAmount('');
    setDuration('');
    setCustomDuration('');
    setReason('');
    setTokenIdToLock('');
    setShowValidation(false);
    setExecutionStep('input');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-500" />
              Policy-Protected Lock Operation
            </CardTitle>
            <CardDescription>
              Lock {tokenSymbol} tokens for a specified duration with policy validation
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
            {(tokenStandard === 'ERC-20' || tokenStandard === 'ERC-1400') && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Lock *</Label>
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

            {tokenStandard === 'ERC-721' && (
              <div className="space-y-2">
                <Label htmlFor="tokenIdToLock">Token ID to Lock *</Label>
                <Input
                  id="tokenIdToLock"
                  placeholder="Enter token ID"
                  value={tokenIdToLock}
                  onChange={(e) => setTokenIdToLock(e.target.value)}
                  disabled={!isDeployed}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="duration">Lock Duration *</Label>
              <Select value={duration} onValueChange={setDuration} disabled={!isDeployed}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {LOCK_DURATIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {duration === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customDuration">Custom Duration (seconds) *</Label>
                <Input
                  id="customDuration"
                  type="number"
                  placeholder="Enter duration in seconds"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  disabled={!isDeployed}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Lock Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for locking (minimum 10 characters)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!isDeployed}
                rows={3}
              />
            </div>

            {(duration || customDuration) && (
              <Alert>
                <AlertTitle>Unlock Time</AlertTitle>
                <AlertDescription>
                  Tokens will be unlocked on: {calculateUnlockTime()}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Locked tokens cannot be transferred, burned, or used until the lock period expires.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Validating lock operation against policies...</span>
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
                    {validationResult.valid ? 'Lock Approved' : 'Lock Blocked'}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid 
                      ? 'All policies and rules have been satisfied for locking.'
                      : 'One or more policies prevent this lock operation.'}
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

                {/* Lock Details */}
                <Alert>
                  <AlertTitle>Lock Details</AlertTitle>
                  <AlertDescription>
                    Amount: {amount} {tokenSymbol}<br />
                    Duration: {duration === 'custom' ? customDuration : LOCK_DURATIONS.find(d => d.value === duration)?.label}<br />
                    Unlock Time: {calculateUnlockTime()}<br />
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
              <span className="ml-2">Executing lock operation...</span>
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
              <AlertTitle>Lock Complete!</AlertTitle>
              <AlertDescription>
                Successfully locked {amount} {tokenSymbol} until {calculateUnlockTime()}
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
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Validate Lock with Policies
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
                <Lock className="h-4 w-4 mr-2" />
              )}
              Execute Lock
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

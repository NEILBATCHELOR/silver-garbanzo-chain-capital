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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { tokenLockingService, nonceManager } from '@/services/wallet';
import { useOperationRouting } from '@/services/routing';
import { ExecutionModeSelector } from '@/components/routing';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';

interface PolicyAwareLockOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
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
  wallets = [],
  onSuccess
}) => {
  // Form state
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [reason, setReason] = useState('');
  const [tokenIdToLock, setTokenIdToLock] = useState('');
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

  // State for applicable policies
  const [applicablePolicies, setApplicablePolicies] = useState<any[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // 🆕 Routing hook - Intelligent execution mode selection
  const { decision, executionMode, setExecutionMode, useGateway } = useOperationRouting({
    operation: 'lock',
    requiresPolicy: true,
    requiresCompliance: true,
    requiresAudit: true,
    isBatch: false
  });

  // Load applicable policies
  React.useEffect(() => {
    if (tokenAddress && chain) {
      loadApplicablePolicies();
    }
  }, [tokenAddress, chain]);

  // Load applicable policies for lock operations
  const loadApplicablePolicies = async () => {
    setPoliciesLoading(true);
    try {
      const chainIdNum = getChainId(chain);
      
      const { data, error } = await supabase
        .from('policy_operation_mappings')
        .select(`
          *,
          policy:rules!policy_operation_mappings_policy_id_fkey(*)
        `)
        .eq('operation_type', 'lock')
        .or(`chain_id.eq.${chainIdNum},chain_id.is.null`);
      
      if (error) {
        console.error('Failed to load policies:', error);
        return;
      }

      // Filter to active policies only
      const policies = (data || [])
        .filter(m => m.policy && m.policy.status === 'active')
        .map(m => ({
          ...m.policy,
          conditions: m.conditions
        }));
      
      setApplicablePolicies(policies);
      
    } catch (error) {
      console.error('Exception loading policies:', error);
    } finally {
      setPoliciesLoading(false);
    }
  };

  // Validate input before submission
  const validateInput = (): boolean => {
    if (!isDeployed) {
      return false;
    }

    // Require wallet selection if wallets are available
    if (wallets.length > 0 && !selectedWallet) {
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
    
    const effectiveDuration = duration === 'custom' ? customDuration : duration;
    
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

    // Get selected wallet
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) {
      console.error('No wallet selected');
      return;
    }

    setExecutionStep('execution');
    
    const effectiveDuration = duration === 'custom' ? customDuration : duration;
    
    try {
      // 🆕 Route based on intelligent decision
      if (useGateway) {
        // Route through Gateway (enhanced/foundry/basic mode)
        console.log(`Using Gateway (${executionMode} mode):`, decision?.reason);
        
        await operations.lock(
          tokenAddress,
          amount || '0', // Keep as string - Gateway expects string | bigint
          Number(effectiveDuration),
          reason || 'Token lock', // Add reason parameter
          chain
        );
        
        setExecutionStep('complete');
        onSuccess?.();
      } else {
        // Route directly to service (direct mode)
        console.log('Using direct service:', decision?.reason);
        
        const result = await tokenLockingService.executeLock({
          contractAddress: tokenAddress,
          amount: amount || '0',
          duration: Number(effectiveDuration),
          chainId: wallet.chainId || 0,
          walletId: wallet.id,
          walletType: wallet.type,
          reason
        });

        if (!result.success) {
          throw new Error(result.error || 'Lock operation failed');
        }

        // Store transaction hash and nonce for diagnostics
        setTransactionHash(result.transactionHash || null);
        
        // Calculate unlock time
        const unlockTime = new Date(Date.now() + Number(effectiveDuration) * 1000);
        
        // Manual logging (since bypassing Gateway)
        await supabase.from('token_operations').insert({
          token_id: tokenId,
          operation_type: TokenOperationType.LOCK,
          operator: wallet.address,
          amount: amount || null,
          lock_duration: Number(effectiveDuration),
          lock_reason: reason,
          unlock_time: unlockTime.toISOString(),
          transaction_hash: result.transactionHash,
          status: 'success',
          timestamp: new Date().toISOString(),
          metadata: {
            nonce: result.diagnostics?.nonce, // CRITICAL: Store nonce for tracking
            lockId: result.diagnostics?.lockId, // Store lock ID for future unlock
            routing: 'direct-service'
          }
        });

        setExecutionStep('complete');
        onSuccess?.();
      }
      
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
              <Badge variant="outline" className="ml-2">Nonce-Aware</Badge>
            </CardTitle>
            <CardDescription>
              Lock {tokenSymbol} tokens for a specified duration with policy validation and nonce management
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
            {/* Policy Indicator */}
            {applicablePolicies.length > 0 && (
              <Alert className="mb-4 border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900 font-semibold">
                  {applicablePolicies.length} Policy(ies) Active
                </AlertTitle>
                <AlertDescription className="text-blue-800">
                  <ul className="mt-2 space-y-1 text-sm">
                    {applicablePolicies.map((policy: any) => (
                      <li key={policy.rule_id} className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <div>
                          <span className="font-medium">{policy.rule_name}</span>
                          {policy.conditions && Object.keys(policy.conditions).length > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              {policy.conditions.maxAmount && (
                                <span>Max: {policy.conditions.maxAmount} </span>
                              )}
                              {policy.conditions.minAmount && (
                                <span>Min: {policy.conditions.minAmount} </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {executionMode === 'enhanced' && (
                    <p className="text-xs mt-2 text-blue-700">
                      ✓ These policies will be enforced in enhanced mode
                    </p>
                  )}
                  {executionMode === 'direct' && (
                    <p className="text-xs mt-2 text-orange-600">
                      ⚠️ Policy checks bypassed in direct mode
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {policiesLoading && (
              <Alert className="mb-4 border-gray-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Loading applicable policies...
                </AlertDescription>
              </Alert>
            )}

            {/* Wallet Selection */}
            {wallets.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="wallet">Operator Wallet *</Label>
                <Select
                  value={selectedWallet}
                  onValueChange={setSelectedWallet}
                  disabled={!isDeployed}
                >
                  <SelectTrigger id="wallet">
                    <SelectValue placeholder="Select wallet to lock tokens from" />
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

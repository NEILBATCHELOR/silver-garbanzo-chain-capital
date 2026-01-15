/**
 * Policy-Aware Unlock Operation Component
 * Integrates with Policy Engine for pre-transaction validation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, Unlock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { tokenUnlockingService, nonceManager } from '@/services/wallet';
import { useOperationRouting } from '@/services/routing';
import { ExecutionModeSelector } from '@/components/routing';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';

interface LockedToken {
  lockId: string;
  amount: string;
  unlockTime: string;
  reason: string;
  operator: string;
  isUnlockable: boolean;
}

interface PolicyAwareUnlockOperationProps {
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

export const PolicyAwareUnlockOperation: React.FC<PolicyAwareUnlockOperationProps> = ({
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
  // State
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [lockedTokens, setLockedTokens] = useState<LockedToken[]>([]);
  const [selectedLock, setSelectedLock] = useState<LockedToken | null>(null);
  const [loadingLocks, setLoadingLocks] = useState(false);
  const [executionStep, setExecutionStep] = useState<'selection' | 'validation' | 'execution' | 'complete'>('selection');
  const [nonceGapWarning, setNonceGapWarning] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
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
    operation: 'unlock',
    requiresPolicy: true,
    requiresCompliance: true,
    requiresAudit: true,
    isBatch: false
  });

  // Load applicable policies
  useEffect(() => {
    if (tokenAddress && chain) {
      loadApplicablePolicies();
    }
  }, [tokenAddress, chain]);

  // Load applicable policies for unlock operations
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
        .eq('operation_type', 'unlock')
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

  // Load locked tokens
  useEffect(() => {
    if (isDeployed) {
      loadLockedTokens();
    }
  }, [isDeployed]);

  const loadLockedTokens = async () => {
    setLoadingLocks(true);
    try {
      const { data, error } = await supabase
        .from('token_operations')
        .select('*')
        .eq('token_id', tokenId)
        .eq('operation_type', TokenOperationType.LOCK)
        .eq('status', 'completed')
        .order('timestamp', { ascending: false });
        
      if (error) throw error;
      
      // Filter for locks that haven't been unlocked yet
      const locks = data?.map(lock => ({
        lockId: lock.id,
        amount: lock.amount,
        unlockTime: lock.unlock_time,
        reason: lock.lock_reason || 'No reason provided',
        operator: lock.operator,
        isUnlockable: new Date(lock.unlock_time) <= new Date()
      })) || [];
      
      setLockedTokens(locks);
    } catch (error) {
      console.error('Failed to load locked tokens:', error);
    } finally {
      setLoadingLocks(false);
    }
  };

  // Handle unlock validation
  const handleValidate = async () => {
    if (!selectedLock) return;
    
    setExecutionStep('validation');
    setNonceGapWarning(null);

    // Get selected wallet
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) {
      console.error('No wallet selected');
      return;
    }

    // Check for nonce gaps
    try {
      const rpcConfig = rpcManager.getProviderConfig(wallet.blockchain as any, 'testnet');
      if (rpcConfig) {
        const provider = new ethers.JsonRpcProvider(rpcConfig.url);
        const nonceStatus = await nonceManager.getNonceStatus(wallet.address, provider);

        if (nonceStatus.hasGap) {
          const warning = `⚠️ NONCE GAP DETECTED: ${nonceStatus.gapSize} pending transaction(s) may cause failures.`;
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
      data: '0x',
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: 'unlock' as const,
          lockId: selectedLock.lockId,
          amount: selectedLock.amount
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
  };

  // Handle execution after validation
  const handleExecute = async () => {
    if (!validationResult?.valid || !selectedLock) {
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
        
        await operations.unlock(
          tokenAddress,
          selectedLock.lockId,
          selectedLock.amount, // Add amount parameter
          chain
        );
        
        setExecutionStep('complete');
        onSuccess?.();
      } else {
        // Route directly to service (direct mode)
        console.log('Using direct service:', decision?.reason);
        
        const result = await tokenUnlockingService.executeUnlock({
          contractAddress: tokenAddress,
          lockId: selectedLock.lockId,
          chainId: wallet.chainId || 0,
          walletId: wallet.id,
          walletType: wallet.type
        });

        if (!result.success) {
          throw new Error(result.error || 'Unlock operation failed');
        }

        // Store transaction hash
        setTransactionHash(result.transactionHash || null);
        
        // Manual logging (since bypassing Gateway)
        await supabase.from('token_operations').insert({
          token_id: tokenId,
          operation_type: TokenOperationType.UNLOCK,
          operator: wallet.address,
          amount: selectedLock.amount,
          lock_duration: 0, // Duration is complete
          lock_reason: `Unlocking: ${selectedLock.reason}`,
          transaction_hash: result.transactionHash,
          status: 'success',
          timestamp: new Date().toISOString(),
          metadata: {
            nonce: result.diagnostics?.nonce, // CRITICAL: Store nonce
            lockId: selectedLock.lockId,
            routing: 'direct-service'
          }
        });

        setExecutionStep('complete');
        onSuccess?.();
      }
      
    } catch (error) {
      console.error('Unlock operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedLock(null);
    setExecutionStep('selection');
    loadLockedTokens();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-green-500" />
              Policy-Protected Unlock Operation
              <Badge variant="outline" className="ml-2">Nonce-Aware</Badge>
            </CardTitle>
            <CardDescription>
              Unlock previously locked {tokenSymbol} tokens with nonce management
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
            <TabsTrigger value="selection" disabled={executionStep !== 'selection'}>
              Select Lock
            </TabsTrigger>
            <TabsTrigger value="validation" disabled={executionStep === 'selection'}>
              Validation
            </TabsTrigger>
            <TabsTrigger value="execution" disabled={executionStep !== 'execution'}>
              Execution
            </TabsTrigger>
            <TabsTrigger value="complete" disabled={executionStep !== 'complete'}>
              Complete
            </TabsTrigger>
          </TabsList>

          <TabsContent value="selection" className="space-y-4">
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
                    <SelectValue placeholder="Select wallet to unlock tokens" />
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

            {loadingLocks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading locked tokens...</span>
              </div>
            ) : lockedTokens.length > 0 ? (
              <div className="space-y-2">
                {lockedTokens.map((lock) => (
                  <div
                    key={lock.lockId}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLock?.lockId === lock.lockId
                        ? 'border-primary bg-secondary'
                        : 'hover:bg-secondary/50'
                    } ${!lock.isUnlockable ? 'opacity-50' : ''}`}
                    onClick={() => lock.isUnlockable && setSelectedLock(lock)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lock.amount} {tokenSymbol}</p>
                        <p className="text-sm text-muted-foreground">{lock.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Unlock time: {new Date(lock.unlockTime).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={lock.isUnlockable ? 'success' : 'secondary'}>
                        {lock.isUnlockable ? 'Unlockable' : 'Locked'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Locked Tokens</AlertTitle>
                <AlertDescription>
                  There are no locked tokens available to unlock.
                </AlertDescription>
              </Alert>
            )}

            {selectedLock && (
              <Alert>
                <AlertTitle>Selected Lock</AlertTitle>
                <AlertDescription>
                  Amount: {selectedLock.amount} {tokenSymbol}<br />
                  Reason: {selectedLock.reason}<br />
                  Ready to unlock
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Validating unlock operation against policies...</span>
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
                    {validationResult.valid ? 'Unlock Approved' : 'Unlock Blocked'}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid 
                      ? 'All policies and rules have been satisfied for unlocking.'
                      : 'One or more policies prevent this unlock operation.'}
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
              <span className="ml-2">Executing unlock operation...</span>
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
              <AlertTitle>Unlock Complete!</AlertTitle>
              <AlertDescription>
                Successfully unlocked {selectedLock?.amount} {tokenSymbol}
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
              Unlock Another Token
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        {executionStep === 'selection' && (
          <Button 
            onClick={handleValidate} 
            disabled={!selectedLock || !selectedLock.isUnlockable || validating}
            className="w-full"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Validate Unlock with Policies
          </Button>
        )}

        {executionStep === 'validation' && validationResult && (
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => setExecutionStep('selection')}
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
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Execute Unlock
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

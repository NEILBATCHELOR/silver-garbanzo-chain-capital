/**
 * Policy-Aware Burn Operation Component
 * 🆕 ENHANCED: Now uses TokenBurningService with automatic nonce management
 * Integrates with Policy Engine for pre-transaction validation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, Flame } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
// 🆕 Import TokenBurningService for nonce-aware execution
import { tokenBurningService } from '@/services/wallet/TokenBurningService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
// 🆕 Import routing system
import { useOperationRouting } from '@/services/routing';
import { ExecutionModeSelector } from '@/components/routing';
import { ethers } from 'ethers';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';

interface PolicyAwareBurnOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

export const PolicyAwareBurnOperation: React.FC<PolicyAwareBurnOperationProps> = ({
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
  const [tokenTypeId, setTokenTypeId] = useState('');
  const [tokenIdToBurn, setTokenIdToBurn] = useState('');
  
  // 🆕 Wallet selection state
  const [selectedWallet, setSelectedWallet] = useState('');
  const [availableWallets, setAvailableWallets] = useState<Array<{
    id: string;
    address: string;
    name: string;
    type: 'project' | 'user';
  }>>([]);
  
  // UI state
  const [showValidation, setShowValidation] = useState(false);
  const [executionStep, setExecutionStep] = useState<'input' | 'validation' | 'execution' | 'complete'>('input');
  const [burnError, setBurnError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  // 🆕 Nonce management state
  const [nonceGapWarning, setNonceGapWarning] = useState<{
    hasGap: boolean;
    gapSize: number;
  } | null>(null);
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      // Note: Now using TokenBurningService directly
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();
  
  // 🆕 Intelligent routing hook
  const { decision, executionMode, setExecutionMode, useGateway } = useOperationRouting({
    operation: 'burn',
    requiresPolicy: true,
    requiresCompliance: true,
    requiresAudit: true,
    isBatch: false
  });
  
  const { supabase } = useSupabase();

  // State for applicable policies
  const [applicablePolicies, setApplicablePolicies] = useState<any[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // Load available burner wallets
  useEffect(() => {
    loadBurnerWallets();
  }, [tokenId]);

  // Load applicable policies
  useEffect(() => {
    if (tokenAddress && chain) {
      loadApplicablePolicies();
    }
  }, [tokenAddress, chain]);

  const loadBurnerWallets = async () => {
    try {
      const { data: wallets } = await supabase
        .from('project_wallets')
        .select('id, address, name, type')
        .eq('project_id', tokenId);
      
      if (wallets) {
        setAvailableWallets(wallets.map(w => ({
          id: w.id,
          address: w.address || '',
          name: w.name || 'Unnamed Wallet',
          type: w.type || 'project'
        })));
        
        if (wallets.length > 0) {
          setSelectedWallet(wallets[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load burner wallets:', error);
    }
  };

  // Load applicable policies for burn operations
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
        .eq('operation_type', 'burn')
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

  // 🆕 Check for nonce gaps before execution
  const checkNonceGaps = async (): Promise<boolean> => {
    if (!selectedWallet) return true;
    
    const wallet = availableWallets.find(w => w.id === selectedWallet);
    if (!wallet) return true;
    
    try {
      const chainIdNum = getChainId(chain);
      const rpcConfig = rpcManager.getProviderConfig(chain, 'testnet');
      
      if (!rpcConfig) {
        console.warn('No RPC config for nonce check');
        return true;
      }
      
      const provider = new ethers.JsonRpcProvider(rpcConfig.url);
      const nonceStatus = await nonceManager.getNonceStatus(wallet.address, provider);
      
      if (nonceStatus.hasGap) {
        setNonceGapWarning({
          hasGap: true,
          gapSize: nonceStatus.gapSize
        });
        
        const shouldContinue = window.confirm(
          `⚠️ NONCE GAP DETECTED!\n\n` +
          `There are ${nonceStatus.gapSize} pending transaction(s) blocking the queue.\n` +
          `Starting burn now may cause failures.\n\n` +
          `Recommended: Cancel stuck transactions first.\n\n` +
          `Do you want to continue anyway?`
        );
        
        return shouldContinue;
      }
      
      return true;
    } catch (error) {
      console.error('Nonce check failed:', error);
      return true;
    }
  };

  // Validate input before submission
  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    if (!selectedWallet) return false;
    
    if (tokenStandard === 'ERC-20' || tokenStandard === 'ERC-1400' || tokenStandard === 'ERC-4626') {
      return !!amount && Number(amount) > 0;
    }
    
    if (tokenStandard === 'ERC-721') {
      return !!tokenIdToBurn;
    }
    
    if (tokenStandard === 'ERC-1155') {
      return !!tokenTypeId && !!amount && Number(amount) > 0;
    }
    
    if (tokenStandard === 'ERC-3525') {
      return !!tokenIdToBurn && !!amount;
    }
    
    return true;
  };

  // Handle pre-transaction validation
  const handleValidate = async () => {
    setExecutionStep('validation');
    setBurnError(null);
    
    const canProceed = await checkNonceGaps();
    if (!canProceed) {
      setExecutionStep('input');
      return;
    }
    
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: selectedWallet,
      to: tokenAddress,
      from: availableWallets.find(w => w.id === selectedWallet)?.address || '',
      data: '0x',
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: 'burn' as const,
          amount: amount || '0',
          tokenId: tokenIdToBurn || tokenTypeId
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
    
    setShowValidation(true);
  };

  // 🆕 Handle execution with intelligent routing
  const handleExecute = async () => {
    if (!validationResult?.valid) {
      setBurnError('Transaction failed validation');
      return;
    }

    setExecutionStep('execution');
    setBurnError(null);
    
    try {
      const wallet = availableWallets.find(w => w.id === selectedWallet);
      if (!wallet) {
        throw new Error('No wallet selected');
      }
      
      const chainIdNum = getChainId(chain);
      
      // 🆕 Route based on decision
      if (useGateway) {
        // Route through Gateway (enhanced/foundry/basic mode)
        console.log(`Using Gateway (${executionMode} mode):`, decision?.reason);
        
        await operations.burn(
          tokenAddress,
          amount, // Keep as string - Gateway expects string | bigint
          chain
        );
        
        // Gateway handles transaction hash and database logging
        setExecutionStep('complete');
        onSuccess?.();
      } else {
        // Route directly to service (direct mode)
        console.log('Using direct service:', decision?.reason);
        
        const result = await tokenBurningService.executeBurn({
          contractAddress: tokenAddress,
          amount,
          decimals: 18,
          tokenId: tokenIdToBurn || tokenTypeId,
          chainId: chainIdNum,
          walletId: wallet.id,
          walletType: wallet.type
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Burn failed');
        }
        
        setTransactionHash(result.transactionHash || null);
        
        // Manual logging (since bypassing Gateway)
        await supabase.from('token_operations').insert({
          token_id: tokenId,
          operation_type: TokenOperationType.BURN,
          operator: wallet.address,
          amount: amount || null,
          transaction_hash: result.transactionHash,
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          metadata: {
            nonce: result.diagnostics?.nonce,
            gasUsed: result.diagnostics?.gasEstimate?.estimatedCost,
            routing: 'direct-service'
          }
        });
        
        setExecutionStep('complete');
        onSuccess?.();
      }
      
    } catch (error) {
      console.error('Burn operation failed:', error);
      setBurnError(error instanceof Error ? error.message : 'Burn failed');
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setAmount('');
    setTokenTypeId('');
    setTokenIdToBurn('');
    setShowValidation(false);
    setExecutionStep('input');
    setBurnError(null);
    setTransactionHash(null);
    setNonceGapWarning(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Policy-Protected Burn Operation
              <Badge variant="outline" className="ml-2">
                Nonce-Aware
              </Badge>
            </CardTitle>
            <CardDescription>
              Burn {tokenSymbol} tokens with automated policy validation and nonce management
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
        
        {/* 🆕 Nonce Gap Warning */}
        {nonceGapWarning?.hasGap && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nonce Gap Detected</AlertTitle>
            <AlertDescription>
              {nonceGapWarning.gapSize} pending transaction(s) are blocking the queue.
              Consider resolving these before burning.
            </AlertDescription>
          </Alert>
        )}
        
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

            {/* 🆕 Wallet Selection */}
            <div className="space-y-2">
              <Label htmlFor="wallet">Burner Wallet *</Label>
              <select
                id="wallet"
                className="w-full p-2 border rounded"
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                disabled={!isDeployed}
              >
                <option value="">Select Wallet</option>
                {availableWallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.address.slice(0, 6)}...{wallet.address.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            {(tokenStandard === 'ERC-20' || tokenStandard === 'ERC-1400' || tokenStandard === 'ERC-4626') && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Burn *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!isDeployed}
                />
                <p className="text-xs text-muted-foreground">
                  This will permanently destroy these tokens
                </p>
              </div>
            )}

            {tokenStandard === 'ERC-721' && (
              <div className="space-y-2">
                <Label htmlFor="tokenIdToBurn">Token ID to Burn *</Label>
                <Input
                  id="tokenIdToBurn"
                  placeholder="Enter token ID"
                  value={tokenIdToBurn}
                  onChange={(e) => setTokenIdToBurn(e.target.value)}
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
                  <Label htmlFor="amount">Amount to Burn *</Label>
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
                  <Label htmlFor="tokenIdToBurn">Token ID *</Label>
                  <Input
                    id="tokenIdToBurn"
                    placeholder="Enter token ID"
                    value={tokenIdToBurn}
                    onChange={(e) => setTokenIdToBurn(e.target.value)}
                    disabled={!isDeployed}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Value to Burn *</Label>
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

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Burning tokens is irreversible. The tokens will be permanently destroyed and cannot be recovered.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Validating burn operation against policies...</span>
              </div>
            )}

            {validationResult && !validating && (
              <div className="space-y-4">
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
                      ? 'All policies and rules have been satisfied. Ready to burn with automatic nonce management.'
                      : 'One or more policies prevent this operation.'}
                  </AlertDescription>
                </Alert>

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
              <span className="ml-2">Executing burn operation with nonce management...</span>
            </div>
            {burnError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Execution Error</AlertTitle>
                <AlertDescription>{burnError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="complete" className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Operation Complete!</AlertTitle>
              <AlertDescription>
                Successfully burned {amount} {tokenSymbol}
                {transactionHash && (
                  <div className="mt-2">
                    <a
                      href={`https://etherscan.io/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View on Explorer
                    </a>
                  </div>
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
              disabled={!validationResult.valid}
              className="flex-1"
            >
              <ChevronRight className="h-4 w-4 mr-2" />
              Execute Burn
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

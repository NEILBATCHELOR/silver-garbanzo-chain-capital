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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { tokenPauseService, nonceManager } from '@/services/wallet';
import { useOperationRouting } from '@/services/routing';
import { ExecutionModeSelector } from '@/components/routing';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PolicyAwarePauseOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  isPaused: boolean;
  hasPauseFeature: boolean;
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

export const PolicyAwarePauseOperation: React.FC<PolicyAwarePauseOperationProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  isPaused,
  hasPauseFeature,
  wallets = [],
  onSuccess
}) => {
  // Form state
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [reason, setReason] = useState('');
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
    operation: 'pause',
    requiresPolicy: true,
    requiresCompliance: true,
    requiresAudit: true,
    isBatch: false
  });

  // Determine operation action
  const action = isPaused ? 'unpause' : 'pause';
  const actionLabel = isPaused ? 'Unpause' : 'Pause';

  // Validate input before submission
  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    if (!hasPauseFeature) return false;
    // Require wallet selection if wallets are available
    if (wallets.length > 0 && !selectedWallet) return false;
    return true; // Reason is optional
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
        
        // Conditionally call pause or unpause based on current state
        if (!isPaused) {
          await operations.pause(tokenAddress, chain, reason || undefined);
        } else {
          await operations.unpause(tokenAddress, chain, reason || undefined);
        }
        
        setExecutionStep('complete');
        onSuccess?.();
      } else {
        // Route directly to service (direct mode)
        console.log('Using direct service:', decision?.reason);
        
        const result = await tokenPauseService.executePause({
          contractAddress: tokenAddress,
          pause: !isPaused, // true to pause, false to unpause
          chainId: wallet.chainId || 0,
          walletId: wallet.id,
          walletType: wallet.type,
          reason: reason || undefined
        });

        if (!result.success) {
          throw new Error(result.error || 'Pause/unpause operation failed');
        }

        // Store transaction hash
        setTransactionHash(result.transactionHash || null);
        
        // Manual logging (since bypassing Gateway)
        await supabase.from('token_operations').insert({
          token_id: tokenId,
          operation_type: isPaused ? TokenOperationType.UNPAUSE : TokenOperationType.PAUSE,
          operator: wallet.address,
          transaction_hash: result.transactionHash,
          status: 'success',
          timestamp: new Date().toISOString(),
          metadata: {
            nonce: result.diagnostics?.nonce, // CRITICAL: Store nonce
            reason: reason || `Manual ${action} operation`,
            routing: 'direct-service'
          }
        });

        setExecutionStep('complete');
        onSuccess?.();
      }
      
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
              <Badge variant="outline" className="ml-2">Nonce-Aware</Badge>
            </CardTitle>
            <CardDescription>
              {isPaused 
                ? `Resume ${tokenSymbol} token operations with automated policy validation and nonce management`
                : `Temporarily halt ${tokenSymbol} token operations with automated policy validation and nonce management`}
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
            {/* Wallet Selection */}
            {wallets.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="wallet">Operator Wallet *</Label>
                <Select
                  value={selectedWallet}
                  onValueChange={setSelectedWallet}
                  disabled={!isDeployed || !hasPauseFeature}
                >
                  <SelectTrigger id="wallet">
                    <SelectValue placeholder="Select wallet to execute operation" />
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
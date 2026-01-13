/**
 * Policy-Aware Mint Operation Component
 * 🆕 ENHANCED: Now uses TokenMintingService with automatic nonce management
 * Integrates with Policy Engine for pre-transaction validation
 * Includes bulk minting functionality with nonce gap detection
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
// 🆕 Import TokenMintingService for nonce-aware execution
import { tokenMintingService } from '@/services/wallet/TokenMintingService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { ethers } from 'ethers';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';

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
  const [mintError, setMintError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  // 🆕 Nonce management state
  const [nonceGapWarning, setNonceGapWarning] = useState<{
    hasGap: boolean;
    gapSize: number;
  } | null>(null);
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      // Note: Now using TokenMintingService directly, but keeping gateway for policy validation
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();
  const { supabase } = useSupabase();

  // Load available minter wallets
  useEffect(() => {
    loadMinterWallets();
  }, [tokenId]);

  const loadMinterWallets = async () => {
    try {
      // Load project wallets that can mint
      const { data: wallets } = await supabase
        .from('project_wallets')
        .select('id, address, name, type')
        .eq('project_id', tokenId); // Assuming tokenId links to project
      
      if (wallets) {
        setAvailableWallets(wallets.map(w => ({
          id: w.id,
          address: w.address || '',
          name: w.name || 'Unnamed Wallet',
          type: w.type || 'project'
        })));
        
        // Auto-select first wallet
        if (wallets.length > 0) {
          setSelectedWallet(wallets[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load minter wallets:', error);
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
        
        // Ask user to confirm
        const shouldContinue = window.confirm(
          `⚠️ NONCE GAP DETECTED!\n\n` +
          `There are ${nonceStatus.gapSize} pending transaction(s) blocking the queue.\n` +
          `Starting mint now may cause failures.\n\n` +
          `Recommended: Cancel stuck transactions first.\n\n` +
          `Do you want to continue anyway?`
        );
        
        return shouldContinue;
      }
      
      return true;
    } catch (error) {
      console.error('Nonce check failed:', error);
      return true; // Continue on error
    }
  };

  // Validate input before submission
  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    if (!recipient) return false;
    if (!selectedWallet) return false;
    
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

  // Handle pre-transaction validation
  const handleValidate = async () => {
    setExecutionStep('validation');
    setMintError(null);
    
    // Check nonce gaps before proceeding
    const canProceed = await checkNonceGaps();
    if (!canProceed) {
      setExecutionStep('input');
      return;
    }
    
    // Build transaction for validation matching centralModels.ts Transaction type
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: selectedWallet,
      to: tokenAddress,
      from: availableWallets.find(w => w.id === selectedWallet)?.address || '',
      data: '0x', // Will be built by service
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

  // 🆕 Handle execution with TokenMintingService
  const handleExecute = async () => {
    if (!validationResult?.valid) {
      setMintError('Transaction failed validation');
      return;
    }

    setExecutionStep('execution');
    setMintError(null);
    
    try {
      const wallet = availableWallets.find(w => w.id === selectedWallet);
      if (!wallet) {
        throw new Error('No wallet selected');
      }
      
      const chainIdNum = getChainId(chain);
      
      // 🆕 Execute mint with TokenMintingService (nonce-aware)
      const result = await tokenMintingService.executeMint({
        contractAddress: tokenAddress,
        toAddress: recipient,
        amount,
        decimals: 18, // TODO: Get from token metadata
        chainId: chainIdNum,
        walletId: wallet.id,
        walletType: wallet.type
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Mint failed');
      }
      
      setTransactionHash(result.transactionHash || null);
      
      // Log operation to database
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.MINT,
        operator: wallet.address,
        recipient,
        amount: amount || null,
        transaction_hash: result.transactionHash,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        metadata: {
          nonce: result.diagnostics?.nonce, // 🆕 Store nonce for diagnostics
          gasUsed: result.diagnostics?.gasEstimate?.estimatedCost
        }
      });
      
      setExecutionStep('complete');
      onSuccess?.();
      
    } catch (error) {
      console.error('Mint operation failed:', error);
      setMintError(error instanceof Error ? error.message : 'Mint failed');
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
    setMintError(null);
    setTransactionHash(null);
    setNonceGapWarning(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Policy-Protected Mint Operation
              {/* 🆕 Badge indicating nonce management */}
              <Badge variant="outline" className="ml-2">
                Nonce-Aware
              </Badge>
            </CardTitle>
            <CardDescription>
              Mint new {tokenSymbol} tokens with automated policy validation and nonce management
            </CardDescription>
          </div>
          <Badge variant={isDeployed ? 'default' : 'secondary'}>
            {isDeployed ? 'Deployed' : 'Not Deployed'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* 🆕 Nonce Gap Warning */}
        {nonceGapWarning?.hasGap && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nonce Gap Detected</AlertTitle>
            <AlertDescription>
              {nonceGapWarning.gapSize} pending transaction(s) are blocking the queue.
              Consider resolving these before minting.
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
            {/* 🆕 Wallet Selection */}
            <div className="space-y-2">
              <Label htmlFor="wallet">Minter Wallet *</Label>
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
                      ? 'All policies and rules have been satisfied. Ready to mint with automatic nonce management.'
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
              <span className="ml-2">Executing mint operation with nonce management...</span>
            </div>
            {mintError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Execution Error</AlertTitle>
                <AlertDescription>{mintError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="complete" className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Operation Complete!</AlertTitle>
              <AlertDescription>
                Successfully minted {amount} {tokenSymbol} to {recipient.slice(0, 6)}...{recipient.slice(-4)}
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
              Execute Mint
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

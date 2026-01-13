/**
 * Update Max Supply Operation Component
 * 🆕 ENHANCED: Now uses TokenMaxSupplyService with automatic nonce management
 * Allows increasing or removing the token supply cap with nonce-aware execution
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, TrendingUp, Infinity } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { ethers } from 'ethers';
// 🆕 Import TokenMaxSupplyService for nonce-aware execution
import { tokenMaxSupplyService, nonceManager } from '@/services/wallet';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';

interface UpdateMaxSupplyOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  currentMaxSupply: string;
  currentTotalSupply: string;
  decimals: number;
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

export const UpdateMaxSupplyOperation: React.FC<UpdateMaxSupplyOperationProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  currentMaxSupply,
  currentTotalSupply,
  decimals,
  wallets = [],
  onSuccess
}) => {
  // Form state
  const [newMaxSupply, setNewMaxSupply] = useState('');
  const [unlimitedSupply, setUnlimitedSupply] = useState(false);
  
  // 🆕 Wallet selection state
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  
  // UI state
  const [showValidation, setShowValidation] = useState(false);
  const [executionStep, setExecutionStep] = useState<'input' | 'validation' | 'execution' | 'complete'>('input');
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // 🆕 Nonce management state
  const [nonceGapWarning, setNonceGapWarning] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      // Note: Now using TokenMaxSupplyService directly, but keeping gateway for policy validation
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();
  const { supabase } = useSupabase();

  // Parse supply values for comparison
  const currentMaxSupplyBigInt = currentMaxSupply ? BigInt(currentMaxSupply) : 0n;
  const currentTotalSupplyBigInt = currentTotalSupply ? BigInt(currentTotalSupply) : 0n;
  const newMaxSupplyBigInt = newMaxSupply && !unlimitedSupply ? ethers.parseUnits(newMaxSupply, decimals) : 0n;

  // Format supply values for display
  const formatSupply = (supply: string | bigint): string => {
    try {
      const supplyBigInt = typeof supply === 'string' ? BigInt(supply) : supply;
      if (supplyBigInt === 0n) return 'Unlimited';
      return ethers.formatUnits(supplyBigInt, decimals);
    } catch {
      return '0';
    }
  };

  // Validate input
  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    
    // Require wallet selection if wallets are available
    if (wallets.length > 0 && !selectedWallet) {
      return false;
    }
    
    if (unlimitedSupply) {
      return true; // Setting to unlimited (0) is always valid
    }
    
    if (!newMaxSupply || Number(newMaxSupply) <= 0) {
      return false;
    }
    
    // New max supply must be >= current total supply
    if (newMaxSupplyBigInt < currentTotalSupplyBigInt) {
      return false;
    }
    
    // Must be different from current max supply
    if (newMaxSupplyBigInt === currentMaxSupplyBigInt) {
      return false;
    }
    
    return true;
  };

  // Get validation error message
  const getValidationError = (): string | null => {
    if (!newMaxSupply && !unlimitedSupply) return null;
    
    if (!unlimitedSupply) {
      if (Number(newMaxSupply) <= 0) {
        return 'Max supply must be greater than zero';
      }
      
      if (newMaxSupplyBigInt < currentTotalSupplyBigInt) {
        return `New max supply (${formatSupply(newMaxSupplyBigInt)}) cannot be less than current total supply (${formatSupply(currentTotalSupplyBigInt)})`;
      }
      
      if (newMaxSupplyBigInt === currentMaxSupplyBigInt) {
        return 'New max supply must be different from current max supply';
      }
    }
    
    return null;
  };

  // 🆕 Handle pre-transaction validation with nonce gap detection
  const handleValidate = async () => {
    setExecutionStep('validation');
    setNonceGapWarning(null);

    // Get selected wallet
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet && wallets.length > 0) {
      console.error('No wallet selected');
      return;
    }

    // 🆕 Check for nonce gaps if wallet is available
    if (wallet) {
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
    }
    
    const supplyValue = unlimitedSupply ? '0' : newMaxSupplyBigInt.toString();
    
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: wallet?.address || window.ethereum?.selectedAddress || '',
      to: tokenAddress,
      from: wallet?.address || window.ethereum?.selectedAddress || '',
      data: '0x', // Will be built by service
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: 'updateMaxSupply',
          newMaxSupply: supplyValue,
          currentMaxSupply: currentMaxSupply,
          currentTotalSupply: currentTotalSupply
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
    
    setShowValidation(true);
  };

  // 🆕 Handle execution with TokenMaxSupplyService
  const handleExecute = async () => {
    if (!validationResult?.valid) {
      setUpdateError('Transaction failed validation');
      return;
    }

    setExecutionStep('execution');
    setUpdateError(null);
    
    try {
      const wallet = wallets.find(w => w.id === selectedWallet);
      if (!wallet) {
        throw new Error('No wallet selected');
      }
      
      const chainIdNum = getChainId(chain);
      const supplyValue = unlimitedSupply ? '0' : newMaxSupplyBigInt.toString();
      
      // 🆕 Execute update with TokenMaxSupplyService (nonce-aware)
      const result = await tokenMaxSupplyService.executeUpdateMaxSupply({
        contractAddress: tokenAddress,
        newMaxSupply: supplyValue,
        chainId: chainIdNum,
        walletId: wallet.id,
        walletType: wallet.type
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Max supply update failed');
      }
      
      setTransactionHash(result.transactionHash || null);
      
      // Update database - properties table
      const propertiesTable = `token_${tokenStandard.toLowerCase().replace('-', '')}_properties`;
      
      await supabase
        .from(propertiesTable)
        .update({
          cap: supplyValue,
          updated_at: new Date().toISOString()
        })
        .eq('token_id', tokenId);

      // 🆕 Log operation with nonce tracking
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.UPDATE_MAX_SUPPLY,
        operator: wallet.address,
        amount: supplyValue,
        transaction_hash: result.transactionHash,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        metadata: {
          nonce: result.diagnostics?.nonce, // 🆕 Store nonce for diagnostics
          previousMaxSupply: currentMaxSupply,
          newMaxSupply: supplyValue,
          gasUsed: result.diagnostics?.gasUsed
        }
      });
      
      setExecutionStep('complete');
      onSuccess?.();
      
    } catch (error) {
      console.error('Max supply update failed:', error);
      setUpdateError(error instanceof Error ? error.message : 'Update failed');
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setNewMaxSupply('');
    setUnlimitedSupply(false);
    setShowValidation(false);
    setExecutionStep('input');
    setUpdateError(null);
    setTransactionHash(null);
    setNonceGapWarning(null);
  };

  const validationError = getValidationError();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Update Maximum Supply
                {/* 🆕 Badge indicating nonce management */}
                <Badge variant="outline" className="ml-2">
                  Nonce-Aware
                </Badge>
              </CardTitle>
              <CardDescription>
                Adjust the supply cap for {tokenName} ({tokenSymbol}) with automated nonce management
              </CardDescription>
            </div>
            <Badge variant={isDeployed ? 'default' : 'secondary'}>
              {isDeployed ? 'Deployed' : 'Not Deployed'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* 🆕 Nonce Gap Warning */}
          {nonceGapWarning && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nonce Gap Detected</AlertTitle>
              <AlertDescription>
                {nonceGapWarning}
                <br />
                <span className="text-xs">
                  Recommended: Cancel stuck transactions before proceeding to avoid failures.
                </span>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={executionStep} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="input">Input</TabsTrigger>
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

            {/* STEP 1: Input */}
            <TabsContent value="input" className="space-y-4 mt-4">
              {/* 🆕 Wallet Selection */}
              {wallets.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="wallet">Operator Wallet *</Label>
                  <Select
                    value={selectedWallet}
                    onValueChange={setSelectedWallet}
                    disabled={!isDeployed}
                  >
                    <SelectTrigger id="wallet">
                      <SelectValue placeholder="Select operator wallet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{wallet.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              ({wallet.address.slice(0, 6)}...{wallet.address.slice(-4)})
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {wallet.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This wallet will execute the max supply update transaction
                  </p>
                </div>
              )}

              {/* Current Supply Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current Max Supply</Label>
                  <div className="flex items-center gap-2">
                    {currentMaxSupplyBigInt === 0n ? (
                      <>
                        <Infinity className="h-4 w-4" />
                        <span className="font-medium">Unlimited</span>
                      </>
                    ) : (
                      <span className="font-medium font-mono">
                        {formatSupply(currentMaxSupply)} {tokenSymbol}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current Total Supply</Label>
                  <span className="font-medium font-mono">
                    {formatSupply(currentTotalSupply)} {tokenSymbol}
                  </span>
                </div>
              </div>

              {/* Unlimited Supply Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Unlimited Supply</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove the supply cap (set to 0)
                  </p>
                </div>
                <Switch
                  checked={unlimitedSupply}
                  onCheckedChange={setUnlimitedSupply}
                />
              </div>

              {/* New Max Supply Input */}
              {!unlimitedSupply && (
                <div className="space-y-2">
                  <Label htmlFor="newMaxSupply">
                    New Maximum Supply
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="newMaxSupply"
                    type="number"
                    step="any"
                    value={newMaxSupply}
                    onChange={(e) => setNewMaxSupply(e.target.value)}
                    placeholder={`Enter amount in ${tokenSymbol}`}
                    className={validationError ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least {formatSupply(currentTotalSupply)} {tokenSymbol} (current total supply)
                  </p>
                  
                  {validationError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {validationError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Change Summary */}
              {(unlimitedSupply || newMaxSupply) && !validationError && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950 space-y-2">
                  <Label className="text-sm font-medium">Change Summary</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">From:</span>
                    {currentMaxSupplyBigInt === 0n ? (
                      <>
                        <Infinity className="h-3 w-3" />
                        <span>Unlimited</span>
                      </>
                    ) : (
                      <span className="font-mono">{formatSupply(currentMaxSupply)} {tokenSymbol}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">To:</span>
                    {unlimitedSupply ? (
                      <>
                        <Infinity className="h-3 w-3" />
                        <span>Unlimited</span>
                      </>
                    ) : (
                      <span className="font-mono">{newMaxSupply} {tokenSymbol}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Important Notes */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription className="text-sm space-y-1">
                  <p>• You can only increase the max supply, not decrease it</p>
                  <p>• New max supply must be at least equal to current total supply</p>
                  <p>• Setting to unlimited removes all supply restrictions</p>
                  <p>• This action requires ADMIN_ROLE permissions</p>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleValidate}
                disabled={!validateInput() || validating}
                className="w-full"
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Validate with Policy Engine
                  </>
                )}
              </Button>
            </TabsContent>

            {/* STEP 2: Validation */}
            <TabsContent value="validation" className="space-y-4 mt-4">
              {validationResult && (
                <>
                  {validationResult.valid ? (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertTitle>Validation Passed</AlertTitle>
                      <AlertDescription>
                        Max supply update has been validated successfully.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <X className="h-4 w-4" />
                      <AlertTitle>Validation Failed</AlertTitle>
                      <AlertDescription>
                        {validationResult.errors?.join(', ') || 'Operation cannot proceed'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.valid && (
                    <Button onClick={handleExecute} className="w-full" disabled={gatewayLoading}>
                      {gatewayLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Execute Update Max Supply
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}

              {/* Show update error if any */}
              {updateError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Update Error</AlertTitle>
                  <AlertDescription>{updateError}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleReset} variant="outline" className="w-full">
                Reset
              </Button>
            </TabsContent>

            {/* STEP 3: Execution */}
            <TabsContent value="execution" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating maximum supply...</span>
              </div>
              {gatewayError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Execution Error</AlertTitle>
                  <AlertDescription>{gatewayError.message}</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* STEP 4: Complete */}
            <TabsContent value="complete" className="space-y-4 mt-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Max Supply Updated!</AlertTitle>
                <AlertDescription>
                  Successfully updated maximum supply to{' '}
                  {unlimitedSupply ? (
                    'unlimited'
                  ) : (
                    `${newMaxSupply} ${tokenSymbol}`
                  )}
                </AlertDescription>
              </Alert>

              {/* 🆕 Transaction Hash */}
              {transactionHash && (
                <Alert>
                  <AlertTitle>Transaction Details</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <div>
                      <span className="font-medium">Transaction Hash:</span>
                      <br />
                      <code className="text-xs break-all">{transactionHash}</code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const explorerUrl = `https://explorer.hoodi.io/tx/${transactionHash}`;
                        window.open(explorerUrl, '_blank');
                      }}
                      className="w-full mt-2"
                    >
                      View on Hoodi Explorer →
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleReset} className="w-full">
                Update Again
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateMaxSupplyOperation;

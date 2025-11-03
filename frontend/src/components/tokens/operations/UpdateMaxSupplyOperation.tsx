/**
 * Update Max Supply Operation Component
 * Allows increasing or removing the token supply cap
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  onSuccess
}) => {
  // Form state
  const [newMaxSupply, setNewMaxSupply] = useState('');
  const [unlimitedSupply, setUnlimitedSupply] = useState(false);
  
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

  // Handle pre-transaction validation
  const handleValidate = async () => {
    setExecutionStep('validation');
    
    const supplyValue = unlimitedSupply ? '0' : newMaxSupplyBigInt.toString();
    
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

  // Handle execution
  const handleExecute = async () => {
    if (!validationResult?.valid) return;

    setExecutionStep('execution');
    
    try {
      const supplyValue = unlimitedSupply ? '0' : newMaxSupplyBigInt.toString();
      
      // Call updateMaxSupply on contract
      await operations.updateMaxSupply(tokenAddress, supplyValue, chain);
      
      // Update database
      const propertiesTable = `token_${tokenStandard.toLowerCase().replace('-', '')}_properties`;
      
      await supabase
        .from(propertiesTable)
        .update({
          cap: supplyValue,
          updated_at: new Date().toISOString()
        })
        .eq('token_id', tokenId);

      // Log operation
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.UPDATE_MAX_SUPPLY,
        operator: window.ethereum?.selectedAddress,
        amount: supplyValue,
        metadata: {
          previousMaxSupply: currentMaxSupply,
          newMaxSupply: supplyValue
        },
        transaction_hash: null,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Update max supply operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setNewMaxSupply('');
    setUnlimitedSupply(false);
    setShowValidation(false);
    setExecutionStep('input');
  };

  const validationError = getValidationError();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Update Maximum Supply
          </CardTitle>
          <CardDescription>
            Adjust the supply cap for {tokenName} ({tokenSymbol})
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            </TabsContent>

            {/* STEP 4: Complete */}
            <TabsContent value="complete" className="space-y-4 mt-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Max Supply Updated</AlertTitle>
                <AlertDescription>
                  Successfully updated maximum supply to{' '}
                  {unlimitedSupply ? (
                    'unlimited'
                  ) : (
                    `${newMaxSupply} ${tokenSymbol}`
                  )}
                </AlertDescription>
              </Alert>

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

/**
 * Policy-Aware Unblock Operation Component
 * Integrates with Policy Engine for pre-transaction validation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, UserCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import { TokenOperationType } from '@/components/tokens/types';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';

interface BlockedAddress {
  address: string;
  blockReason: string;
  blockedBy: string;
  blockedAt: string;
  operationId: string;
}

interface PolicyAwareUnblockOperationProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  tokenName: string;
  tokenSymbol: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

export const PolicyAwareUnblockOperation: React.FC<PolicyAwareUnblockOperationProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  tokenName,
  tokenSymbol,
  chain,
  isDeployed,
  onSuccess
}) => {
  // State
  const [blockedAddresses, setBlockedAddresses] = useState<BlockedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<BlockedAddress | null>(null);
  const [unblockReason, setUnblockReason] = useState('');
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [executionStep, setExecutionStep] = useState<'selection' | 'validation' | 'execution' | 'complete'>('selection');
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      setExecutionStep('complete');
      onSuccess?.();
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();
  const { supabase } = useSupabase();

  // Load blocked addresses
  useEffect(() => {
    if (isDeployed) {
      loadBlockedAddresses();
    }
  }, [isDeployed]);

  const loadBlockedAddresses = async () => {
    setLoadingBlocked(true);
    try {
      const { data, error } = await supabase
        .from('token_operations')
        .select('*')
        .eq('token_id', tokenId)
        .eq('operation_type', TokenOperationType.BLOCK)
        .eq('status', 'completed')
        .order('timestamp', { ascending: false });
        
      if (error) throw error;
      
      // Filter for addresses that haven't been unblocked
      const blocked = data?.map(block => ({
        address: block.blocked_address,
        blockReason: block.block_reason || 'No reason provided',
        blockedBy: block.operator,
        blockedAt: block.timestamp,
        operationId: block.id
      })) || [];
      
      setBlockedAddresses(blocked);
    } catch (error) {
      console.error('Failed to load blocked addresses:', error);
    } finally {
      setLoadingBlocked(false);
    }
  };

  // Validate input
  const validateInput = (): boolean => {
    if (!selectedAddress) {
      return false;
    }
    
    if (!unblockReason || unblockReason.trim().length < 10) {
      return false;
    }
    
    return true;
  };

  // Handle validation
  const handleValidate = async () => {
    if (!selectedAddress) return;
    
    setExecutionStep('validation');
    
    // Build transaction for validation
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: window.ethereum?.selectedAddress || '',
      to: tokenAddress,
      from: window.ethereum?.selectedAddress || '',
      data: '0x',
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: 'unblock' as const,
          address: selectedAddress.address,
          reason: unblockReason,
          originalBlockReason: selectedAddress.blockReason
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'immediate',
      simulate: true
    });
  };

  // Handle execution
  const handleExecute = async () => {
    if (!validationResult?.valid || !selectedAddress) {
      return;
    }

    setExecutionStep('execution');
    
    try {
      await operations.unblock(
        tokenAddress,
        selectedAddress.address,
        unblockReason,
        chain
      );
      
      // Log operation to database
      await supabase.from('token_operations').insert({
        token_id: tokenId,
        operation_type: TokenOperationType.UNBLOCK,
        operator: window.ethereum?.selectedAddress,
        unblocked_address: selectedAddress.address,
        unblock_reason: unblockReason,
        transaction_hash: null,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Unblock operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedAddress(null);
    setUnblockReason('');
    setExecutionStep('selection');
    loadBlockedAddresses();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              Policy-Protected Unblock Operation
            </CardTitle>
            <CardDescription>
              Remove address blocks for {tokenSymbol} with compliance validation
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
            <TabsTrigger value="selection" disabled={executionStep !== 'selection'}>
              Select Address
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
            {loadingBlocked ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading blocked addresses...</span>
              </div>
            ) : blockedAddresses.length > 0 ? (
              <div className="space-y-2">
                {blockedAddresses.map((blocked) => (
                  <div
                    key={blocked.operationId}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAddress?.operationId === blocked.operationId
                        ? 'border-primary bg-secondary'
                        : 'hover:bg-secondary/50'
                    }`}
                    onClick={() => setSelectedAddress(blocked)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium font-mono">
                          {blocked.address.slice(0, 6)}...{blocked.address.slice(-4)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reason: {blocked.blockReason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Blocked on: {new Date(blocked.blockedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="destructive">Blocked</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Blocked Addresses</AlertTitle>
                <AlertDescription>
                  There are no blocked addresses to unblock.
                </AlertDescription>
              </Alert>
            )}

            {selectedAddress && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="unblockReason">Unblock Reason *</Label>
                  <Textarea
                    id="unblockReason"
                    placeholder="Provide a detailed reason for unblocking this address (minimum 10 characters)"
                    value={unblockReason}
                    onChange={(e) => setUnblockReason(e.target.value)}
                    disabled={!isDeployed}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be recorded for compliance purposes
                  </p>
                </div>

                <Alert>
                  <AlertTitle>Selected Address</AlertTitle>
                  <AlertDescription>
                    Address: {selectedAddress.address}<br />
                    Original block reason: {selectedAddress.blockReason}<br />
                    Blocked by: {selectedAddress.blockedBy.slice(0, 6)}...{selectedAddress.blockedBy.slice(-4)}
                  </AlertDescription>
                </Alert>
              </>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Validating unblock operation against compliance policies...</span>
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
                    {validationResult.valid ? 'Unblock Approved' : 'Unblock Denied'}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid 
                      ? 'You have the necessary compliance permissions to unblock this address.'
                      : 'You do not have permission to unblock addresses.'}
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

                {/* Unblock Details */}
                <Alert>
                  <AlertTitle>Unblock Operation Summary</AlertTitle>
                  <AlertDescription>
                    Address to unblock: {selectedAddress?.address.slice(0, 6)}...{selectedAddress?.address.slice(-4)}<br />
                    Compliance officer: {window.ethereum?.selectedAddress?.slice(0, 6)}...{window.ethereum?.selectedAddress?.slice(-4)}<br />
                    Unblock reason: {unblockReason}
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
              <span className="ml-2">Executing unblock operation...</span>
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
              <AlertTitle>Address Unblocked!</AlertTitle>
              <AlertDescription>
                Successfully unblocked address {selectedAddress?.address.slice(0, 6)}...{selectedAddress?.address.slice(-4)}<br />
                The address can now perform token operations again.
              </AlertDescription>
            </Alert>
            <Button onClick={handleReset} className="w-full">
              Unblock Another Address
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        {executionStep === 'selection' && (
          <Button 
            onClick={handleValidate} 
            disabled={!validateInput() || validating}
            className="w-full"
            variant="default"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Validate Unblock with Policies
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
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Execute Unblock
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

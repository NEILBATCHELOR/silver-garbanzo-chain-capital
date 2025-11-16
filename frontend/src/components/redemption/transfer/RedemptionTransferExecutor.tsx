/**
 * Redemption Transfer Executor
 * UI component for manually executing approved redemption transfers
 */

import React, { useState } from 'react';
import { CheckCircle, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/shared/use-toast';
import { approvalToTransferBridge } from '@/infrastructure/redemption/ApprovalToTransferBridge';
import { RedemptionTransferStatus } from '@/components/redemption/transfer/RedemptionTransferStatus';

interface RedemptionTransferExecutorProps {
  redemptionId: string;
  tokenAmount: string | number;
  usdcAmount: string | number;
  investorWallet: string;
  blockchain?: string;
  autoExecuteEnabled?: boolean;
  onExecutionComplete?: () => void;
}

export const RedemptionTransferExecutor: React.FC<RedemptionTransferExecutorProps> = ({
  redemptionId,
  tokenAmount,
  usdcAmount,
  investorWallet,
  blockchain,
  autoExecuteEnabled = true,
  onExecutionComplete
}) => {
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExecuteTransfer = async () => {
    try {
      setExecuting(true);
      setError(null);

      // Get current user ID (you might need to get this from auth context)
      const { data: { user } } = await (await import('@/infrastructure/supabaseClient')).supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await approvalToTransferBridge.manualTriggerTransfer(
        redemptionId,
        user.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Transfer execution failed');
      }

      setExecuted(true);
      
      toast({
        title: 'Transfer Initiated',
        description: 'Token transfer and settlement process started successfully'
      });

      onExecutionComplete?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute transfer';
      setError(errorMessage);
      
      toast({
        title: 'Transfer Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setExecuting(false);
    }
  };

  if (executed) {
    return (
      <div className="mt-6">
        <RedemptionTransferStatus
          redemptionId={redemptionId}
          blockchain={blockchain}
          onComplete={() => {
            toast({ title: 'Transfer Complete!' });
            onExecutionComplete?.();
          }}
        />
      </div>
    );
  }

  return (
    <Card className="mt-6 border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Ready for Transfer Execution
        </CardTitle>
        <CardDescription>
          This redemption has been approved and is ready to execute
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!autoExecuteEnabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Auto-execution is disabled. Click below to manually execute the transfer.
            </AlertDescription>
          </Alert>
        )}

        {autoExecuteEnabled && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription>
              Auto-execution is enabled. Transfer will execute automatically, or click below to execute manually now.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tokens to collect:</span>
            <span className="font-medium">{tokenAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">USDC to send:</span>
            <span className="font-medium">${usdcAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Investor wallet:</span>
            <span className="font-mono text-xs">{investorWallet.slice(0, 10)}...{investorWallet.slice(-8)}</span>
          </div>
        </div>

        <Button 
          onClick={handleExecuteTransfer}
          disabled={executing}
          className="w-full"
          size="lg"
        >
          {executing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Executing Transfer...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Execute Transfer & Settlement
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This will collect {tokenAmount} tokens from the investor and send ${usdcAmount} USDC to their wallet
        </p>
      </CardContent>
    </Card>
  );
};

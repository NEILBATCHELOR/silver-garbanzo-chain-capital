/**
 * Pending Transfer Executions Panel
 * Shows approved redemptions that are waiting for transfer execution
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/shared/use-toast';
import { approvalToTransferBridge } from '@/infrastructure/redemption/ApprovalToTransferBridge';
import { supabase } from '@/infrastructure/supabaseClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface PendingRedemption {
  id: string;
  token_amount: number;
  usdc_amount: number;
  source_wallet_address: string;
  updated_at: string;
  investor_name?: string;
  distributions?: {
    token_symbol?: string;
    blockchain?: string;
  };
}

export const PendingTransferExecutions: React.FC = () => {
  const [pending, setPending] = useState<PendingRedemption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();

  const loadPendingExecutions = async () => {
    try {
      setLoading(true);
      const redemptions = await approvalToTransferBridge.getPendingTransferExecutions();
      setPending(redemptions);
    } catch (error) {
      console.error('Error loading pending executions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending transfer executions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingExecutions();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPendingExecutions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(pending.map(r => r.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selected);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelected(newSelected);
  };

  const handleBatchExecute = async () => {
    if (selected.size === 0) return;

    try {
      setExecuting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Execute batch
      const result = await approvalToTransferBridge.batchTriggerTransfers(
        Array.from(selected),
        user.id
      );

      // Show results
      toast({
        title: 'Batch Execution Complete',
        description: `Successfully executed ${result.summary.succeeded} of ${result.summary.total} transfers`
      });

      // Clear selection and reload
      setSelected(new Set());
      await loadPendingExecutions();
    } catch (error) {
      toast({
        title: 'Batch Execution Failed',
        description: error instanceof Error ? error.message : 'Failed to execute batch',
        variant: 'destructive'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleExecuteSingle = async (redemptionId: string) => {
    try {
      setExecuting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await approvalToTransferBridge.manualTriggerTransfer(
        redemptionId,
        user.id
      );

      if (result.success) {
        toast({
          title: 'Transfer Initiated',
          description: 'Transfer execution started successfully'
        });
        await loadPendingExecutions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Failed to execute transfer',
        variant: 'destructive'
      });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Transfer Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Transfer Executions
            </CardTitle>
            <CardDescription>
              Approved redemptions waiting for transfer execution
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPendingExecutions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {selected.size > 0 && (
              <Button
                onClick={handleBatchExecute}
                disabled={executing}
                size="sm"
              >
                {executing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Execute {selected.size} Transfer{selected.size > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No pending transfer executions. All approved redemptions have been processed.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {pending.length} redemption{pending.length > 1 ? 's' : ''} waiting for transfer execution
              </AlertDescription>
            </Alert>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selected.size === pending.length && pending.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Token Amount</TableHead>
                  <TableHead>USDC Amount</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Blockchain</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((redemption) => (
                  <TableRow key={redemption.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(redemption.id)}
                        onCheckedChange={(checked) => handleSelectOne(redemption.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{redemption.investor_name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {redemption.source_wallet_address.slice(0, 10)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{redemption.token_amount.toLocaleString()}</div>
                        {redemption.distributions?.token_symbol && (
                          <div className="text-xs text-muted-foreground">
                            {redemption.distributions.token_symbol}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">${redemption.usdc_amount.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {new Date(redemption.updated_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {redemption.distributions?.blockchain || 'ethereum'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExecuteSingle(redemption.id)}
                        disabled={executing}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Execute
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

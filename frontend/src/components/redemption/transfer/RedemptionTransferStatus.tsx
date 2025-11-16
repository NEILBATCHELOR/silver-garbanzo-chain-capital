/**
 * Redemption Transfer Status Component
 * Displays real-time status of token transfer and settlement
 * Based on TransactionConfirmation.tsx patterns
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ExplorerService } from '@/services/blockchain/ExplorerService';
import { TransferOrchestrator } from '@/infrastructure/redemption/transfer';
import { formatDistanceToNow } from 'date-fns';

interface RedemptionTransferStatusProps {
  redemptionId: string;
  blockchain?: string;
  onComplete?: () => void;
}

const REQUIRED_CONFIRMATIONS = 12;
const POLL_INTERVAL = 10000; // 10 seconds

export function RedemptionTransferStatus({
  redemptionId,
  blockchain,
  onComplete
}: RedemptionTransferStatusProps) {
  const { toast } = useToast();
  const [transfer, setTransfer] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch transfer and settlement status
  const fetchStatus = async () => {
    try {
      const orchestrator = new TransferOrchestrator();
      const status = await orchestrator.getOrchestrationStatus(redemptionId);
      
      setTransfer(status.tokenTransfer);
      setSettlement(status.settlement);
      setLoading(false);

      // Check if both completed
      if (
        status.tokenTransfer?.status === 'confirmed' &&
        (!status.settlement || status.settlement?.status === 'confirmed')
      ) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Error fetching transfer status:', error);
      setLoading(false);
    }
  };

  // Poll for updates
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [redemptionId]);

  // Update current time for relative timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Transaction hash copied'
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'simulating':
      case 'broadcasting':
      case 'confirming':
        return (
          <Badge className="bg-amber-500">
            <Clock className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" /> Confirmed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500">
            <AlertCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redemption Transfer Status</CardTitle>
        <CardDescription>
          Track your token collection and settlement payment
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Token Transfer Status */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Token Collection</h4>
            {transfer && getStatusBadge(transfer.status)}
          </div>

          {transfer ? (
            <div className="space-y-3">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-mono">
                    {transfer.from_wallet?.slice(0, 10)}...{transfer.from_wallet?.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-mono">
                    {transfer.to_wallet?.slice(0, 10)}...{transfer.to_wallet?.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{transfer.amount} tokens</span>
                </div>
              </div>

              {transfer.transaction_hash && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Transaction Hash</div>
                  <div className="p-2 bg-muted rounded flex items-center justify-between">
                    <span className="font-mono text-xs truncate">
                      {transfer.transaction_hash}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(transfer.transaction_hash)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(
                            ExplorerService.getTransactionUrl(
                              transfer.transaction_hash,
                              blockchain
                            ),
                            '_blank'
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {transfer.status === 'confirming' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Confirmations</span>
                    <span>
                      {transfer.confirmations}/{REQUIRED_CONFIRMATIONS}
                    </span>
                  </div>
                  <Progress
                    value={(transfer.confirmations / REQUIRED_CONFIRMATIONS) * 100}
                  />
                </div>
              )}

              {transfer.created_at && (
                <div className="text-sm text-muted-foreground">
                  Started {formatDistanceToNow(new Date(transfer.created_at), { addSuffix: true })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Waiting for token collection to start...
            </div>
          )}
        </div>

        <Separator />

        {/* Settlement Status */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">USDC/USDT Settlement</h4>
            {settlement && getStatusBadge(settlement.status)}
          </div>

          {settlement ? (
            <div className="space-y-3">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{settlement.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {settlement.amount} {settlement.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-mono">
                    {settlement.to_wallet?.slice(0, 10)}...{settlement.to_wallet?.slice(-8)}
                  </span>
                </div>
              </div>

              {settlement.transaction_hash && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Transaction Hash</div>
                  <div className="p-2 bg-muted rounded flex items-center justify-between">
                    <span className="font-mono text-xs truncate">
                      {settlement.transaction_hash}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(settlement.transaction_hash)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(
                            ExplorerService.getTransactionUrl(
                              settlement.transaction_hash,
                              blockchain
                            ),
                            '_blank'
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {settlement.settled_at && (
                <div className="text-sm text-muted-foreground">
                  Settled {formatDistanceToNow(new Date(settlement.settled_at), { addSuffix: true })}
                </div>
              )}
            </div>
          ) : transfer?.status === 'confirmed' ? (
            <div className="text-sm text-muted-foreground">
              Settlement will begin shortly...
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Waiting for token collection to confirm...
            </div>
          )}
        </div>

        {/* Overall Progress */}
        {transfer && settlement && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold">Overall Progress</h4>
              <div className="space-y-3">
                <TransferStep
                  name="Request Approved"
                  status="completed"
                  icon={<CheckCircle className="h-4 w-4" />}
                />
                <TransferStep
                  name="Tokens Collected"
                  status={transfer.status === 'confirmed' ? 'completed' : 'pending'}
                  icon={
                    transfer.status === 'confirmed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )
                  }
                />
                <TransferStep
                  name="Settlement Sent"
                  status={settlement.status === 'confirmed' ? 'completed' : 'pending'}
                  icon={
                    settlement.status === 'confirmed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )
                  }
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Transfer step component
function TransferStep({
  name,
  status,
  icon
}: {
  name: string;
  status: 'completed' | 'pending';
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full ${
          status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className={status === 'completed' ? 'font-medium' : 'text-muted-foreground'}>
          {name}
        </div>
      </div>
    </div>
  );
}

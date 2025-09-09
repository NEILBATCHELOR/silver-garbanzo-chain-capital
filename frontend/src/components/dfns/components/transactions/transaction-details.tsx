import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowRightLeft, 
  ExternalLink, 
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Wallet,
  Hash,
  Calendar,
  DollarSign,
  Zap
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState } from "react";
import type { 
  DfnsTransactionRequestResponse,
  DfnsTransactionStatus,
  DfnsNetwork 
} from "../../../../types/dfns/transactions";

interface TransactionDetailsProps {
  transaction: DfnsTransactionRequestResponse;
  trigger?: React.ReactNode;
}

/**
 * Transaction Details Component
 * Displays detailed information about a specific DFNS transaction
 */
export function TransactionDetails({ transaction, trigger }: TransactionDetailsProps) {
  const [open, setOpen] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
    }
  };

  const openBlockExplorer = (txHash: string, network: DfnsNetwork) => {
    // Simple block explorer URL mapping
    const explorers: Record<string, string> = {
      'Ethereum': `https://etherscan.io/tx/${txHash}`,
      'Bitcoin': `https://blockstream.info/tx/${txHash}`,
      'Polygon': `https://polygonscan.com/tx/${txHash}`,
      'Arbitrum': `https://arbiscan.io/tx/${txHash}`,
      'Optimism': `https://optimistic.etherscan.io/tx/${txHash}`,
      'Base': `https://basescan.org/tx/${txHash}`,
      'Avalanche': `https://snowtrace.io/tx/${txHash}`,
      'Binance': `https://bscscan.com/tx/${txHash}`,
      'Solana': `https://solscan.io/tx/${txHash}`,
    };

    const url = explorers[network] || `https://etherscan.io/tx/${txHash}`;
    window.open(url, '_blank');
  };

  const getStatusBadgeVariant = (status: DfnsTransactionStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Confirmed': 
        return 'default';
      case 'Pending':
      case 'Broadcasted':
        return 'secondary';
      case 'Failed':
        return 'destructive';
      default: 
        return 'outline';
    }
  };

  const getStatusIcon = (status: DfnsTransactionStatus) => {
    switch (status) {
      case 'Confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Pending':
      case 'Broadcasted':
        return <Clock className="h-4 w-4" />;
      case 'Failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startDate: string, endDate?: string) => {
    if (!endDate) return '-';
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const durationMs = end - start;
    
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
    if (durationMs < 3600000) return `${Math.round(durationMs / 60000)}m`;
    return `${Math.round(durationMs / 3600000)}h`;
  };

  const getTransactionTypeDetails = () => {
    const { requestBody } = transaction;
    
    switch (requestBody.kind) {
      case 'Evm':
        const evmTx = requestBody as any;
        return {
          title: 'EVM Transaction',
          description: 'Smart contract interaction or native transfer',
          details: [
            { label: 'To Address', value: evmTx.to },
            { label: 'Value', value: evmTx.value ? `${evmTx.value} wei` : '0' },
            { label: 'Data', value: evmTx.data ? `${evmTx.data.slice(0, 10)}...` : 'None' },
          ]
        };
      case 'Eip1559':
        const eip1559Tx = requestBody as any;
        return {
          title: 'EIP-1559 Transaction',
          description: 'Type 2 transaction with custom gas parameters',
          details: [
            { label: 'To Address', value: eip1559Tx.to },
            { label: 'Value', value: eip1559Tx.value ? `${eip1559Tx.value} wei` : '0' },
            { label: 'Gas Limit', value: eip1559Tx.gasLimit },
            { label: 'Max Fee Per Gas', value: eip1559Tx.maxFeePerGas },
            { label: 'Priority Fee', value: eip1559Tx.maxPriorityFeePerGas },
          ]
        };
      case 'Transaction':
        return {
          title: 'Raw Transaction',
          description: 'Pre-signed transaction hex',
          details: [
            { label: 'Transaction Hex', value: `${(requestBody as any).transaction?.slice(0, 20)}...` },
          ]
        };
      case 'Psbt':
        return {
          title: 'Bitcoin PSBT',
          description: 'Partially Signed Bitcoin Transaction',
          details: [
            { label: 'PSBT Hex', value: `${(requestBody as any).psbt?.slice(0, 20)}...` },
          ]
        };
      default:
        return {
          title: requestBody.kind,
          description: 'Transaction',
          details: []
        };
    }
  };

  const typeDetails = getTransactionTypeDetails();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Info className="h-4 w-4 mr-2" />
            Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5" />
            <span>Transaction Details</span>
          </DialogTitle>
          <DialogDescription>
            Detailed information for transaction {transaction.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status & Information</CardTitle>
                <Badge variant={getStatusBadgeVariant(transaction.status)} className="flex items-center space-x-1">
                  {getStatusIcon(transaction.status)}
                  <span>{transaction.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Transaction ID</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">{transaction.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Wallet ID</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">{transaction.walletId}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.walletId)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Network</span>
                  </div>
                  <Badge variant="outline" className="justify-start">
                    {transaction.network}
                  </Badge>
                </div>

                {transaction.fee && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Fee</span>
                    </div>
                    <span className="text-sm font-mono">{transaction.fee}</span>
                  </div>
                )}
              </div>

              {transaction.txHash && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Transaction Hash</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">{transaction.txHash}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.txHash!)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openBlockExplorer(transaction.txHash!, transaction.network)}
                      className="h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Type Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{typeDetails.title}</CardTitle>
              <CardDescription>{typeDetails.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {typeDetails.details.map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{label}:</span>
                    <code className="text-sm">{value}</code>
                  </div>
                ))}
                {transaction.requestBody.externalId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">External ID:</span>
                    <code className="text-sm">{transaction.requestBody.externalId}</code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Requested</span>
                  </div>
                  <span className="text-sm">{formatDate(transaction.dateRequested)}</span>
                </div>

                {transaction.dateBroadcasted && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Broadcasted</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatDate(transaction.dateBroadcasted)}</div>
                      <div className="text-xs text-muted-foreground">
                        +{formatDuration(transaction.dateRequested, transaction.dateBroadcasted)}
                      </div>
                    </div>
                  </div>
                )}

                {transaction.dateConfirmed && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Confirmed</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatDate(transaction.dateConfirmed)}</div>
                      <div className="text-xs text-muted-foreground">
                        +{formatDuration(transaction.dateRequested, transaction.dateConfirmed)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Message (if any) */}
          {transaction.errorMessage && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Error Details</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-sm text-destructive">{transaction.errorMessage}</code>
              </CardContent>
            </Card>
          )}

          {/* Requester Information */}
          {transaction.requester && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Requester Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transaction.requester.userId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">User ID:</span>
                      <code className="text-sm">{transaction.requester.userId}</code>
                    </div>
                  )}
                  {transaction.requester.tokenId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Token ID:</span>
                      <code className="text-sm">{transaction.requester.tokenId}</code>
                    </div>
                  )}
                  {transaction.requester.appId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">App ID:</span>
                      <code className="text-sm">{transaction.requester.appId}</code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

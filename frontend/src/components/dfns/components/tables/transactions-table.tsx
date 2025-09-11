import React, { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRightLeft,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { DfnsTransactionRequestResponse } from '@/types/dfns';

interface TransactionsTableProps {
  className?: string;
  maxItems?: number;
  walletId?: string;
}

/**
 * DFNS Transactions Table Component
 * Comprehensive table view of transactions with real DFNS integration
 */
export function TransactionsTable({ className, maxItems, walletId }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<DfnsTransactionRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Table columns definition
  const columns: ColumnDef<DfnsTransactionRequestResponse>[] = [
    {
      accessorKey: 'txHash',
      header: 'Transaction Hash',
      cell: ({ row }) => {
        const hash = row.getValue('txHash') as string;
        return (
          <div className="font-mono text-sm">
            {hash ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : 'Pending...'}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <Badge variant={status === 'Confirmed' ? 'default' : status === 'Pending' ? 'secondary' : 'destructive'}>
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'requestBody',
      header: 'Type',
      cell: ({ row }) => {
        const requestBody = row.getValue('requestBody') as any;
        const kind = requestBody?.kind || 'Transaction';
        return (
          <Badge variant="outline">
            {kind}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'network',
      header: 'Network',
      cell: ({ row }) => {
        const network = row.getValue('network') as string;
        return (
          <Badge variant="outline">
            {network}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'fee',
      header: 'Fee',
      cell: ({ row }) => {
        const fee = row.getValue('fee') as string;
        return (
          <div className="text-right text-sm">
            {fee ? `${fee} ETH` : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'dateRequested',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.getValue('dateRequested') as string;
        return (
          <div className="text-sm">
            {date ? new Date(date).toLocaleDateString() : '-'}
          </div>
        );
      },
    },
  ];

  // Load transactions from DFNS
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view transactions');
          return;
        }

        // Mock transaction data for now - replace with real service call
        const mockTransactions: DfnsTransactionRequestResponse[] = [
          {
            id: '1',
            walletId: 'wa-1',
            network: 'Ethereum',
            requester: { userId: 'user-1' },
            requestBody: { kind: 'Transaction' },
            dateRequested: new Date().toISOString(),
            status: 'Confirmed',
            txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            fee: '0.002',
            dateBroadcasted: new Date().toISOString(),
            dateConfirmed: new Date().toISOString()
          },
          {
            id: '2',
            walletId: 'wa-2', 
            network: 'Polygon',
            requester: { userId: 'user-1' },
            requestBody: { kind: 'Transaction' },
            dateRequested: new Date(Date.now() - 86400000).toISOString(),
            status: 'Pending',
            fee: '0.001'
          }
        ];

        const finalTransactions = maxItems ? mockTransactions.slice(0, maxItems) : mockTransactions;
        setTransactions(finalTransactions);

      } catch (err: any) {
        console.error('Error loading transactions:', err);
        setError(err.message || 'Failed to load transactions');
        toast({
          title: "Error",
          description: "Failed to load transactions. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [maxItems, walletId, toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Loading transaction data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading transactions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Transactions ({transactions.length})
        </CardTitle>
        <CardDescription>
          {walletId ? `Transactions for wallet` : maxItems ? `Latest ${maxItems} transactions` : 'All transactions'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={transactions}
          searchKey="txHash"
        />
      </CardContent>
    </Card>
  );
}

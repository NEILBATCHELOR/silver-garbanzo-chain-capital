/**
 * Solana Token Transaction History Component
 * Displays transaction history for a specific token
 * 
 * Features:
 * - Paginated transaction list
 * - Status badges
 * - Explorer links
 * - Formatted amounts
 * - Time display
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/infrastructure/database/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from 'lucide-react';
import { 
  solanaTokenTransactionService,
  type SolanaTransferRecord 
} from '@/services/tokens/SolanaTokenTransactionService';
import { solanaExplorer } from '@/infrastructure/web3/solana';

// ============================================================================
// TYPES
// ============================================================================

// Re-export for clarity (using the service's type)
type Transaction = SolanaTransferRecord;
interface TokenTransactionHistoryProps {
  tokenId: string;
  tokenSymbol: string;
  tokenAddress: string;
  decimals: number;
  network: string;
  currentUserAddress?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenTransactionHistory({
  tokenId,
  tokenSymbol,
  tokenAddress,
  decimals,
  network,
  currentUserAddress
}: TokenTransactionHistoryProps) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadTransactions();
  }, [tokenId, page]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);

      const data = await solanaTokenTransactionService.getTransactionHistory({
        token_id: tokenId,
        limit: PAGE_SIZE,
      });

      setTransactions(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transaction history',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    loadTransactions();
  };

  const formatAmount = (amount: string, decimals: number): string => {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals > 4 ? 4 : decimals
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      confirmed: { variant: 'default', label: 'Confirmed' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' }
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDirectionIcon = (tx: Transaction) => {
    if (currentUserAddress) {
      if (tx.from_address === currentUserAddress) {
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      }
      if (tx.to_address === currentUserAddress) {
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      }
    }
    return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
  };

  const shortenAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isLoading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Loading transactions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
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
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Recent transfers and operations for {tokenSymbol}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{getDirectionIcon(tx)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {shortenAddress(tx.from_address)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {shortenAddress(tx.to_address)}
                      </code>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(tx.amount, tx.decimals)} {tx.token_symbol}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tx.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(
                            solanaExplorer.tx(tx.transaction_hash, tx.network as any),
                            '_blank'
                          )
                        }
                        title="View on Solana Explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TokenTransactionHistory;

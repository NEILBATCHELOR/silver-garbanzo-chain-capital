/**
 * Blockchain Token Transaction History Component
 * Fetches transaction history DIRECTLY from Solana blockchain
 * NO DATABASE DEPENDENCY - 100% on-chain data
 * 
 * This component queries the blockchain for all transactions
 * related to a specific token mint address.
 */

import React, { useState, useEffect } from 'react';
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
  Clock,
  Coins,
  AlertCircle
} from 'lucide-react';
import { createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { address, type Address } from '@solana/kit';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { solanaExplorer } from '@/infrastructure/web3/solana';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface BlockchainTransaction {
  signature: string;
  blockTime: number | null;
  slot: number;
  err: any;
  memo: string | null;
}

interface ParsedTransaction {
  signature: string;
  timestamp: Date | null;
  slot: number;
  status: 'success' | 'failed';
  type: string;
  description: string;
}

interface BlockchainTokenTransactionHistoryProps {
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
  network: SolanaNetwork;
  currentUserAddress?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BlockchainTokenTransactionHistory({
  tokenAddress,
  tokenSymbol,
  decimals,
  network,
  currentUserAddress
}: BlockchainTokenTransactionHistoryProps) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [before, setBefore] = useState<string | undefined>(undefined);
  const [loadCount, setLoadCount] = useState(0);

  useEffect(() => {
    loadTransactions(true);
  }, [tokenAddress, network]);

  const loadTransactions = async (reset: boolean = false) => {
    try {
      setIsLoading(true);

      const rpc = createModernRpc(network);
      const mintAddr = address(tokenAddress);

      // Get signatures for this mint address
      const signatures = await rpc.getRpc().getSignaturesForAddress(
        mintAddr,
        {
          limit: 20,
          before: reset ? undefined : (before as any) // Cast to any to bypass type check
        }
      ).send();

      if (signatures.length === 0) {
        setHasMore(false);
        if (reset) {
          setTransactions([]);
        }
        return;
      }

      // Parse transactions
      const parsed: ParsedTransaction[] = signatures.map(sig => ({
        signature: sig.signature,
        timestamp: sig.blockTime ? new Date(Number(sig.blockTime) * 1000) : null,
        slot: Number(sig.slot),
        status: sig.err ? 'failed' : 'success',
        type: determineTransactionType(sig.memo),
        description: sig.memo || 'Token operation'
      }));

      if (reset) {
        setTransactions(parsed);
      } else {
        setTransactions(prev => [...prev, ...parsed]);
      }

      // Set pagination
      if (signatures.length > 0) {
        setBefore(signatures[signatures.length - 1].signature as string);
        setHasMore(signatures.length === 20);
      } else {
        setHasMore(false);
      }

      setLoadCount(prev => prev + 1);

      toast({
        title: 'Transactions Loaded',
        description: `Found ${signatures.length} transactions from blockchain`
      });
    } catch (error) {
      console.error('Error loading blockchain transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions from blockchain',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setBefore(undefined);
    setLoadCount(0);
    loadTransactions(true);
  };

  const handleLoadMore = () => {
    loadTransactions(false);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Unknown';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge variant="default">Success</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('mint') || type.includes('Mint')) {
      return <Coins className="h-4 w-4 text-green-500" />;
    }
    if (type.includes('transfer') || type.includes('Transfer')) {
      return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
    }
    return <Coins className="h-4 w-4 text-muted-foreground" />;
  };

  const shortenSignature = (signature: string): string => {
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  };

  if (isLoading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Blockchain Transaction History
          </CardTitle>
          <CardDescription>Loading transactions from Solana blockchain...</CardDescription>
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Blockchain Transaction History
            </CardTitle>
            <CardDescription>
              All on-chain transactions for {tokenSymbol}
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
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Showing real-time data from Solana blockchain. This includes all token operations
            (mints, transfers, burns, etc.) for mint address {tokenAddress.slice(0, 8)}...
          </AlertDescription>
        </Alert>

        {transactions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No transactions found</p>
            <p className="text-sm mt-1">This token hasn't been used yet</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.signature}>
                    <TableCell>{getTypeIcon(tx.type)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {shortenSignature(tx.signature)}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{tx.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tx.timestamp)}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(
                            solanaExplorer.tx(tx.signature, network),
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

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${transactions.length} loaded)`
                  )}
                </Button>
              </div>
            )}

            {/* Data Source */}
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>✅ Live data from Solana blockchain</span>
              <span>Loaded {loadCount} time(s)</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function determineTransactionType(memo: string | null): string {
  if (!memo) {
    // Default categorization based on common patterns
    return 'Token Operation';
  }
  
  const lower = memo.toLowerCase();
  
  if (lower.includes('mint')) return 'Mint';
  if (lower.includes('transfer')) return 'Transfer';
  if (lower.includes('burn')) return 'Burn';
  if (lower.includes('freeze')) return 'Freeze';
  if (lower.includes('thaw')) return 'Thaw';
  if (lower.includes('approve')) return 'Approve';
  if (lower.includes('revoke')) return 'Revoke';
  
  return 'Token Operation';
}

export default BlockchainTokenTransactionHistory;

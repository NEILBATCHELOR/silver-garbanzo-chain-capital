import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowUpDown, 
  Search, 
  MoreHorizontal, 
  Copy,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  Filter,
  Activity
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect, useMemo } from "react";
import { DfnsService } from "../../../../services/dfns";

// Define transaction interface based on database schema
interface TransactionHistoryItem {
  id: string;
  walletId: string | null;
  txHash: string;
  direction: 'Incoming' | 'Outgoing';
  status: 'Pending' | 'Confirmed' | 'Failed' | 'Cancelled';
  assetSymbol: string;
  assetName: string | null;
  contractAddress: string | null;
  amount: string;
  fee: string | null;
  toAddress: string | null;
  fromAddress: string | null;
  blockNumber: bigint | null;
  blockHash: string | null;
  timestamp: Date;
  metadata: Record<string, any> | null;
}

/**
 * Comprehensive Transactions Table Component
 * Advanced transaction history with filtering, search, and detailed view
 */
export function TransactionsTable() {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assetFilter, setAssetFilter] = useState<string>("all");

  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Fetch transaction history from database
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        // Get all wallets first, then get transaction history for each
        const walletService = dfnsService.getWalletService();
        const wallets = await walletService.getAllWallets();
        
        // Collect all transaction histories
        const allTransactions: TransactionHistoryItem[] = [];
        
        for (const wallet of wallets) {
          try {
            const history = await walletService.getWalletHistory(wallet.id);
            const formattedHistory = history.history.map((tx): TransactionHistoryItem => ({
              id: tx.txHash + wallet.id, // Create unique ID
              walletId: wallet.id,
              txHash: tx.txHash,
              direction: tx.direction as 'Incoming' | 'Outgoing',
              status: tx.status as 'Pending' | 'Confirmed' | 'Failed' | 'Cancelled',
              assetSymbol: tx.asset?.symbol || 'Unknown',
              assetName: tx.asset?.symbol || null,
              contractAddress: (tx.asset as any)?.contract || null,
              amount: tx.amount,
              fee: tx.fee || null,
              toAddress: tx.toAddress || null,
              fromAddress: tx.fromAddress || null,
              blockNumber: tx.blockNumber ? BigInt(tx.blockNumber) : null,
              blockHash: null, // Not available in current DFNS API
              timestamp: new Date(tx.timestamp),
              metadata: tx.metadata || null,
            }));
            
            allTransactions.push(...formattedHistory);
          } catch (walletError) {
            console.warn(`Failed to fetch history for wallet ${wallet.id}:`, walletError);
          }
        }
        
        // Sort by timestamp (newest first)
        allTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setTransactions(allTransactions);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        setError('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [dfnsService]);

  // Get unique asset symbols for filter
  const availableAssets = useMemo(() => {
    const assets = Array.from(new Set(transactions.map(tx => tx.assetSymbol)));
    return assets.sort();
  }, [transactions]);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = !searchTerm.trim() || 
        tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.assetSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.toAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.fromAddress?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDirection = directionFilter === "all" || tx.direction === directionFilter;
      const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
      const matchesAsset = assetFilter === "all" || tx.assetSymbol === assetFilter;

      return matchesSearch && matchesDirection && matchesStatus && matchesAsset;
    });
  }, [transactions, searchTerm, directionFilter, statusFilter, assetFilter]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error(`Failed to copy ${type}:`, error);
    }
  };

  const getExplorerUrl = (assetSymbol: string, txHash: string): string | null => {
    const explorers: Record<string, string> = {
      'ETH': `https://etherscan.io/tx/${txHash}`,
      'BTC': `https://blockstream.info/tx/${txHash}`,
      'MATIC': `https://polygonscan.com/tx/${txHash}`,
      'AVAX': `https://snowtrace.io/tx/${txHash}`,
      'BNB': `https://bscscan.com/tx/${txHash}`,
      'SOL': `https://explorer.solana.com/tx/${txHash}`,
    };

    return explorers[assetSymbol] || null;
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'Incoming' ? (
      <ArrowDown className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUp className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const formatAmount = (amount: string, symbol: string): string => {
    try {
      const numAmount = parseFloat(amount);
      if (numAmount === 0) return `0 ${symbol}`;
      
      if (numAmount >= 1000000) {
        return `${(numAmount / 1000000).toFixed(2)}M ${symbol}`;
      } else if (numAmount >= 1000) {
        return `${(numAmount / 1000).toFixed(2)}K ${symbol}`;
      } else if (numAmount < 0.01) {
        return `${numAmount.toFixed(8)} ${symbol}`;
      } else {
        return `${numAmount.toFixed(6)} ${symbol}`;
      }
    } catch {
      return `${amount} ${symbol}`;
    }
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatHash = (hash: string): string => {
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Transaction History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading transactions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Transaction History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Transaction History</span>
        </CardTitle>
        <CardDescription>
          Complete transaction history across all wallets ({filteredTransactions.length} of {transactions.length} transactions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by hash, address, or asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Direction Filter */}
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-full lg:w-[140px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value="Incoming">Incoming</SelectItem>
              <SelectItem value="Outgoing">Outgoing</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[130px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Asset Filter */}
          <Select value={assetFilter} onValueChange={setAssetFilter}>
            <SelectTrigger className="w-full lg:w-[130px]">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              {availableAssets.map((asset) => (
                <SelectItem key={asset} value={asset}>{asset}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm || directionFilter !== "all" || statusFilter !== "all" || assetFilter !== "all"
                      ? 'No transactions found matching your filters.'
                      : 'No transactions found.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {formatHash(tx.txHash)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(tx.txHash, 'transaction hash')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tx.direction === 'Incoming' ? 'From' : 'To'}: {' '}
                          {tx.direction === 'Incoming' 
                            ? (tx.fromAddress ? formatAddress(tx.fromAddress) : 'Unknown')
                            : (tx.toAddress ? formatAddress(tx.toAddress) : 'Unknown')
                          }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getDirectionIcon(tx.direction)}
                        <span className={cn(
                          "font-medium",
                          tx.direction === 'Incoming' ? "text-green-600" : "text-red-600"
                        )}>
                          {tx.direction}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.assetSymbol}</span>
                        {tx.assetName && (
                          <span className="text-xs text-muted-foreground">{tx.assetName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {formatAmount(tx.amount, tx.assetSymbol)}
                      </div>
                      {tx.fee && (
                        <div className="text-xs text-muted-foreground">
                          Fee: {formatAmount(tx.fee, tx.assetSymbol)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tx.status)}>
                        {tx.status}
                      </Badge>
                      {tx.blockNumber && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Block: {tx.blockNumber.toString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(tx.timestamp)}</div>
                      <div className="text-xs text-muted-foreground">
                        {tx.timestamp.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyToClipboard(tx.txHash, 'transaction hash')}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Hash
                          </DropdownMenuItem>
                          {getExplorerUrl(tx.assetSymbol, tx.txHash) && (
                            <DropdownMenuItem
                              onClick={() => window.open(getExplorerUrl(tx.assetSymbol, tx.txHash)!, '_blank')}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View on Explorer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-700">Incoming</div>
            <div className="text-2xl font-bold text-green-800">
              {transactions.filter(tx => tx.direction === 'Incoming').length}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-700">Outgoing</div>
            <div className="text-2xl font-bold text-red-800">
              {transactions.filter(tx => tx.direction === 'Outgoing').length}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-700">Pending</div>
            <div className="text-2xl font-bold text-yellow-800">
              {transactions.filter(tx => tx.status === 'Pending').length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
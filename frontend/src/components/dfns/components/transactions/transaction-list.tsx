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
  DropdownMenuSeparator,
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
  ArrowRightLeft, 
  Search, 
  Plus, 
  MoreHorizontal, 
  ExternalLink, 
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Filter
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "@/services/dfns";
import type { 
  DfnsTransactionRequestResponse,
  DfnsTransactionStatus,
  DfnsNetwork 
} from "@/types/dfns/transactions";

/**
 * Transaction List Component
 * Displays transaction history and management for DFNS wallets
 */
export function TransactionList({ walletId }: { walletId?: string }) {
  const [transactions, setTransactions] = useState<DfnsTransactionRequestResponse[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<DfnsTransactionRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<DfnsTransactionRequestResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // Fetch transactions from DFNS
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const transactionService = dfnsService.getTransactionService();
        
        let allTransactions: DfnsTransactionRequestResponse[] = [];
        
        if (walletId) {
          // Get transactions for specific wallet
          allTransactions = await transactionService.getAllTransactionRequests(walletId);
        } else {
          // Get transactions for all wallets
          const walletService = dfnsService.getWalletService();
          const wallets = await walletService.getAllWallets();
          
          for (const wallet of wallets) {
            try {
              const walletTransactions = await transactionService.getAllTransactionRequests(wallet.id);
              allTransactions.push(...walletTransactions);
            } catch (error) {
              console.warn(`Failed to fetch transactions for wallet ${wallet.id}:`, error);
            }
          }
        }
        
        // Sort by date (newest first)
        allTransactions.sort((a, b) => 
          new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()
        );
        
        setTransactions(allTransactions);
        setFilteredTransactions(allTransactions);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [dfnsService, walletId]);

  // Filter transactions based on search, status, and network
  useEffect(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(tx => 
        tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.walletId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.txHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.requestBody.kind.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Network filter
    if (networkFilter !== 'all') {
      filtered = filtered.filter(tx => tx.network === networkFilter);
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, statusFilter, networkFilter, transactions]);

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
        return <CheckCircle className="h-3 w-3" />;
      case 'Pending':
      case 'Broadcasted':
        return <Clock className="h-3 w-3" />;
      case 'Failed':
        return <XCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateHash = (hash: string, startChars = 6, endChars = 4) => {
    if (hash.length <= startChars + endChars) return hash;
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
  };

  // Get unique networks and statuses for filters
  const uniqueNetworks = [...new Set(transactions.map(tx => tx.network))];
  const uniqueStatuses = [...new Set(transactions.map(tx => tx.status))];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5" />
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
            <ArrowRightLeft className="h-5 w-5" />
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <ArrowRightLeft className="h-5 w-5" />
              <span>Transaction History</span>
            </CardTitle>
            <CardDescription>
              {walletId ? `Transactions for wallet ${walletId}` : 'All wallet transactions'} ({filteredTransactions.length} transactions)
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Broadcast Transaction
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction ID, wallet ID, hash, or network..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status.toLowerCase()}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              {uniqueNetworks.map(network => (
                <SelectItem key={network} value={network}>
                  {network}
                </SelectItem>
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
                <TableHead>Network</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || networkFilter !== 'all' 
                      ? 'No transactions found matching your filters.' 
                      : 'No transactions found.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{truncateHash(tx.id)}</div>
                        <div className="text-sm text-muted-foreground">
                          Wallet: {truncateHash(tx.walletId)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tx.requestBody.kind}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{tx.network}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tx.status)} className="flex items-center space-x-1 w-fit">
                        {getStatusIcon(tx.status)}
                        <span>{tx.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.txHash ? (
                        <div className="flex items-center space-x-2">
                          <code className="text-sm">{truncateHash(tx.txHash)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(tx.txHash!)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(tx.dateRequested)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            disabled={!!actionLoading}
                          >
                            {actionLoading?.includes(tx.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyToClipboard(tx.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy ID
                          </DropdownMenuItem>
                          {tx.txHash && (
                            <>
                              <DropdownMenuItem
                                onClick={() => copyToClipboard(tx.txHash!)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Hash
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openBlockExplorer(tx.txHash!, tx.network)}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Block Explorer
                              </DropdownMenuItem>
                            </>
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
      </CardContent>
    </Card>
  );
}

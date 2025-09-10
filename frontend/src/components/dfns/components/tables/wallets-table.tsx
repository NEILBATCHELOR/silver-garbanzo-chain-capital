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
  Wallet, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Send,
  Eye,
  Settings,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  Filter
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect, useMemo } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsWalletSummary } from "../../../../types/dfns/wallets";

/**
 * Comprehensive Wallets Table Component
 * Advanced wallet listing with filtering, search, and management actions
 */
export function WalletsTable() {
  const [wallets, setWallets] = useState<DfnsWalletSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Fetch wallets from DFNS
  useEffect(() => {
    const fetchWallets = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const walletService = dfnsService.getWalletService();
        const walletSummaries = await walletService.getWalletsSummary();
        
        setWallets(walletSummaries);
      } catch (error) {
        console.error('Failed to fetch wallets:', error);
        setError('Failed to load wallets');
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, [dfnsService]);

  // Get unique networks for filter
  const availableNetworks = useMemo(() => {
    const networks = Array.from(new Set(wallets.map(wallet => wallet.network)));
    return networks.sort();
  }, [wallets]);

  // Filter wallets based on search and filters
  const filteredWallets = useMemo(() => {
    return wallets.filter(wallet => {
      const matchesSearch = !searchTerm.trim() || 
        wallet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.walletId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.address?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesNetwork = networkFilter === "all" || wallet.network === networkFilter;
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && wallet.isActive) ||
        (statusFilter === "inactive" && !wallet.isActive);

      return matchesSearch && matchesNetwork && matchesStatus;
    });
  }, [wallets, searchTerm, networkFilter, statusFilter]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error(`Failed to copy ${type}:`, error);
    }
  };

  const getExplorerUrl = (network: string, address: string): string | null => {
    const explorers: Record<string, string> = {
      'Ethereum': `https://etherscan.io/address/${address}`,
      'Bitcoin': `https://blockstream.info/address/${address}`,
      'Polygon': `https://polygonscan.com/address/${address}`,
      'Arbitrum': `https://arbiscan.io/address/${address}`,
      'Optimism': `https://optimistic.etherscan.io/address/${address}`,
      'Avalanche': `https://snowtrace.io/address/${address}`,
      'Binance': `https://bscscan.com/address/${address}`,
      'Solana': `https://explorer.solana.com/address/${address}`,
    };

    return explorers[network] || null;
  };

  const getNetworkIcon = (network: string): string => {
    const icons: Record<string, string> = {
      'Ethereum': '⟠',
      'Bitcoin': '₿',
      'Polygon': '⬠',
      'Arbitrum': '▲',
      'Optimism': '🔴',
      'Avalanche': '❄️',
      'Binance': '🟡',
      'Solana': '◎',
    };

    return icons[network] || '🌐';
  };

  const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
    return isActive ? 'default' : 'secondary';
  };

  const formatBalance = (balance: string | number | null): string => {
    if (!balance || balance === '0') return '$0.00';
    
    try {
      const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
      if (numBalance >= 1000000) {
        return `$${(numBalance / 1000000).toFixed(2)}M`;
      } else if (numBalance >= 1000) {
        return `$${(numBalance / 1000).toFixed(2)}K`;
      } else {
        return `$${numBalance.toFixed(2)}`;
      }
    } catch {
      return '$0.00';
    }
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Wallets</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading wallets...</span>
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
            <Wallet className="h-5 w-5" />
            <span>Wallets</span>
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
              <Wallet className="h-5 w-5" />
              <span>Wallets</span>
            </CardTitle>
            <CardDescription>
              Comprehensive wallet management ({filteredWallets.length} of {wallets.length} wallets)
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Wallet
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search wallets by name, address, network..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Network Filter */}
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Networks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              {availableNetworks.map((network) => (
                <SelectItem key={network} value={network}>
                  <span className="flex items-center">
                    <span className="mr-2">{getNetworkIcon(network)}</span>
                    {network}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Balance (USD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm || networkFilter !== "all" || statusFilter !== "all" 
                      ? 'No wallets found matching your filters.' 
                      : 'No wallets found. Create your first wallet to get started.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredWallets.map((wallet) => (
                  <TableRow key={wallet.walletId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">
                          {wallet.name || 'Unnamed Wallet'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {wallet.walletId.substring(0, 12)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getNetworkIcon(wallet.network)}</span>
                        <span className="font-medium">{wallet.network}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {wallet.address ? (
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {formatAddress(wallet.address)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(wallet.address!, 'address')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {getExplorerUrl(wallet.network, wallet.address) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getExplorerUrl(wallet.network, wallet.address!)!, '_blank')}
                              className="h-6 w-6 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{wallet.assetCount || 0}</div>
                        <div className="text-xs text-muted-foreground">
                          {wallet.nftCount ? `+ ${wallet.nftCount} NFTs` : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatBalance(wallet.totalValueUsd)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(wallet.isActive)}>
                        {wallet.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            disabled={!!actionLoading}
                          >
                            {actionLoading?.includes(wallet.walletId) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Transfer Assets
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
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
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Wallets</div>
            <div className="text-2xl font-bold">{wallets.length}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Active Wallets</div>
            <div className="text-2xl font-bold">
              {wallets.filter(w => w.isActive).length}
            </div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Networks</div>
            <div className="text-2xl font-bold">{availableNetworks.length}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-2xl font-bold">
              {formatBalance(
                wallets.reduce((sum, wallet) => 
                  sum + (parseFloat(wallet.totalValueUsd?.toString() || '0') || 0), 0
                )
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
/**
 * DFNS Wallet List Component
 * 
 * Displays a comprehensive list of DFNS wallets across multiple networks
 * Includes real-time balance data, search, filtering, and management actions
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Wallet, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  ExternalLink,
  Copy,
  Settings,
  Trash2,
  DollarSign,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { DfnsService } from '@/services/dfns';
import type { 
  DfnsWallet, 
  DfnsNetwork
} from '@/types/dfns';
import type { WalletSummary } from '@/services/dfns/walletService';

interface WalletListProps {
  className?: string;
  showCreateButton?: boolean;
  onWalletSelect?: (wallet: DfnsWallet) => void;
  onCreateWallet?: () => void;
  maxHeight?: string;
}

// Network options for filtering
const NETWORK_OPTIONS: { value: DfnsNetwork | 'all'; label: string }[] = [
  { value: 'all', label: 'All Networks' },
  { value: 'Ethereum', label: 'Ethereum' },
  { value: 'Bitcoin', label: 'Bitcoin' },
  { value: 'Polygon', label: 'Polygon' },
  { value: 'Arbitrum', label: 'Arbitrum' },
  { value: 'Optimism', label: 'Optimism' },
  { value: 'Solana', label: 'Solana' },
  { value: 'Avalanche', label: 'Avalanche' },
  { value: 'Binance', label: 'Binance Smart Chain' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'network', label: 'Network' },
  { value: 'balance', label: 'Balance' },
  { value: 'created', label: 'Date Created' },
];

/**
 * Format network name for display
 */
const getNetworkDisplayName = (network: DfnsNetwork): string => {
  const networkMap: Record<string, string> = {
    'Binance': 'BSC',
    'Ethereum': 'ETH',
    'Bitcoin': 'BTC',
    'Polygon': 'MATIC',
    'Arbitrum': 'ARB',
    'Optimism': 'OP',
    'Solana': 'SOL',
    'Avalanche': 'AVAX'
  };
  return networkMap[network] || network;
};

/**
 * Get network color for badges
 */
const getNetworkColor = (network: DfnsNetwork): string => {
  const colorMap: Record<string, string> = {
    'Ethereum': 'bg-blue-100 text-blue-800',
    'Bitcoin': 'bg-orange-100 text-orange-800',
    'Polygon': 'bg-purple-100 text-purple-800',
    'Arbitrum': 'bg-cyan-100 text-cyan-800',
    'Optimism': 'bg-red-100 text-red-800',
    'Solana': 'bg-green-100 text-green-800',
    'Avalanche': 'bg-red-100 text-red-800',
    'Binance': 'bg-yellow-100 text-yellow-800'
  };
  return colorMap[network] || 'bg-gray-100 text-gray-800';
};

/**
 * Copy text to clipboard
 */
const copyToClipboard = async (text: string, toast: any) => {
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  } catch (error) {
    toast({
      title: "Failed to copy",
      description: "Could not copy to clipboard",
      variant: "destructive",
    });
  }
};

export function WalletList({
  className,
  showCreateButton = true,
  onWalletSelect,
  onCreateWallet,
  maxHeight = "600px"
}: WalletListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [wallets, setWallets] = useState<DfnsWallet[]>([]);
  const [walletSummaries, setWalletSummaries] = useState<WalletSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<DfnsNetwork | 'all'>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // DFNS Service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  // Initialize DFNS service
  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Load wallets
  const loadWallets = async (refresh = false) => {
    if (!dfnsService) return;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Get wallets and summaries
      const [walletsData, summariesData] = await Promise.all([
        dfnsService.getWalletService().getAllWallets(),
        dfnsService.getWalletService().getWalletsSummary()
      ]);

      setWallets(walletsData);
      setWalletSummaries(summariesData);

      if (refresh) {
        toast({
          title: "Wallets refreshed",
          description: `Loaded ${walletsData.length} wallets successfully`,
        });
      }
    } catch (error: any) {
      console.error('Failed to load wallets:', error);
      setError(error.message || 'Failed to load wallets');
      toast({
        title: "Error loading wallets",
        description: error.message || 'Failed to load wallets',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load wallets on service initialization
  useEffect(() => {
    if (dfnsService) {
      loadWallets();
    }
  }, [dfnsService]);

  // Filter and sort wallets
  const filteredAndSortedWallets = useMemo(() => {
    let filtered = wallets;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(wallet => 
        wallet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.network.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply network filter
    if (selectedNetwork !== 'all') {
      filtered = filtered.filter(wallet => wallet.network === selectedNetwork);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name || a.id;
          bValue = b.name || b.id;
          break;
        case 'network':
          aValue = a.network;
          bValue = b.network;
          break;
        case 'balance':
          const aSummary = walletSummaries.find(s => s.walletId === a.id);
          const bSummary = walletSummaries.find(s => s.walletId === b.id);
          aValue = parseFloat(aSummary?.totalValueUsd || '0');
          bValue = parseFloat(bSummary?.totalValueUsd || '0');
          break;
        case 'created':
          aValue = new Date(a.dateCreated);
          bValue = new Date(b.dateCreated);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [wallets, walletSummaries, searchTerm, selectedNetwork, sortBy, sortOrder]);

  // Handle wallet actions
  const handleWalletClick = (wallet: DfnsWallet) => {
    if (onWalletSelect) {
      onWalletSelect(wallet);
    } else {
      navigate(`/wallet/dfns/wallets/${wallet.id}`);
    }
  };

  const handleCreateWallet = () => {
    if (onCreateWallet) {
      onCreateWallet();
    } else {
      navigate('/wallet/dfns/wallets/create');
    }
  };

  const handleDeleteWallet = async (wallet: DfnsWallet) => {
    if (!dfnsService) return;

    try {
      await dfnsService.getWalletService().deleteWallet(wallet.id);
      toast({
        title: "Wallet deleted",
        description: `${wallet.name || wallet.id} has been archived`,
      });
      loadWallets(true);
    } catch (error: any) {
      toast({
        title: "Error deleting wallet",
        description: error.message || 'Failed to delete wallet',
        variant: "destructive",
      });
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Wallets</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => loadWallets()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <span>DFNS Wallets</span>
              <Badge variant="secondary">
                {filteredAndSortedWallets.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage your multi-chain wallets across 30+ blockchain networks
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWallets(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            
            {showCreateButton && (
              <Button onClick={handleCreateWallet} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wallets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedNetwork} onValueChange={(value) => setSelectedNetwork(value as DfnsNetwork | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by network" />
            </SelectTrigger>
            <SelectContent>
              {NETWORK_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div 
          className="space-y-3 overflow-y-auto"
          style={{ maxHeight }}
        >
          {filteredAndSortedWallets.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No wallets found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedNetwork !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first wallet to get started'
                }
              </p>
              {showCreateButton && !searchTerm && selectedNetwork === 'all' && (
                <Button onClick={handleCreateWallet}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Wallet
                </Button>
              )}
            </div>
          ) : (
            filteredAndSortedWallets.map((wallet) => {
              const summary = walletSummaries.find(s => s.walletId === wallet.id);
              
              return (
                <div
                  key={wallet.id}
                  className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleWalletClick(wallet)}
                >
                  {/* Wallet Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  {/* Wallet Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium truncate">
                        {wallet.name || 'Unnamed Wallet'}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getNetworkColor(wallet.network))}
                      >
                        {getNetworkDisplayName(wallet.network)}
                      </Badge>
                      {wallet.status === 'Archived' && (
                        <Badge variant="destructive" className="text-xs">
                          Archived
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="font-mono">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </span>
                      
                      {summary && (
                        <>
                          {summary.totalValueUsd && (
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {parseFloat(summary.totalValueUsd).toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              })}
                            </span>
                          )}
                          
                          <span>{summary.assetCount} assets</span>
                          
                          {summary.nftCount > 0 && (
                            <span>{summary.nftCount} NFTs</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(wallet.address, toast);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleWalletClick(wallet)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(wallet.address, toast)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Address
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/wallet/dfns/wallets/${wallet.id}/settings`)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        {wallet.status === 'Active' && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteWallet(wallet)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Archive Wallet
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WalletList;
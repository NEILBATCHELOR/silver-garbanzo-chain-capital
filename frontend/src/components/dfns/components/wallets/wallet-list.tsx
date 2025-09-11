import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  ExternalLink,
  ArrowRightLeft,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/utils';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { WalletData, DfnsWalletAsset } from '@/types/dfns';

// Enhanced wallet with computed properties
interface EnhancedWallet extends WalletData {
  totalValue?: number;
  assetCount?: number;
  assets?: DfnsWalletAsset[];
}

interface WalletListProps {
  showCreateButton?: boolean;
  showFilters?: boolean;
  maxHeight?: string;
  className?: string;
  onWalletSelected?: (wallet: WalletData) => void;
  onWalletUpdated?: () => void;
}

/**
 * DFNS Wallet List Component
 * Displays multi-network wallets with real DFNS integration
 * Following climateReceivables table pattern
 */
export function WalletList({
  showCreateButton = true,
  showFilters = true,
  maxHeight = "600px",
  className,
  onWalletSelected,
  onWalletUpdated
}: WalletListProps) {
  const [wallets, setWallets] = useState<EnhancedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const { toast } = useToast();

  // Load wallets from DFNS
  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();

      if (!authStatus.isAuthenticated) {
        setError('Authentication required to view wallets');
        return;
      }

      // Get real wallet data
      const walletsData = await dfnsService.getWalletService().getAllWallets();
      
      // Enhance with asset data
      const enhancedWallets = await Promise.allSettled(
        walletsData.map(async (wallet) => {
          try {
            const assetsResponse = await dfnsService.getWalletAssetsService().getWalletAssets(wallet.id, true);
            const assets = assetsResponse.assets || [];
            const totalValue = assetsResponse.totalValueUsd ? parseFloat(assetsResponse.totalValueUsd) : 0;
            
            return {
              ...wallet,
              totalValue,
              assetCount: assets.length,
              assets
            };
          } catch (error) {
            console.warn(`Failed to load assets for wallet ${wallet.id}:`, error);
            return {
              ...wallet,
              totalValue: 0,
              assetCount: 0,
              assets: []
            };
          }
        })
      );

      const validWallets = enhancedWallets
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      setWallets(validWallets);

      if (validWallets.length === 0) {
        setError('No wallets found. Create your first wallet to get started.');
      }

    } catch (error: any) {
      console.error('Error loading wallets:', error);
      setError(`Failed to load wallets: ${error.message}`);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  // Filter wallets based on search and network
  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          wallet.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          wallet.network.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNetwork = filterNetwork === 'all' || wallet.network === filterNetwork;
    return matchesSearch && matchesNetwork;
  });

  // Get unique networks for filter
  const networks = Array.from(new Set(wallets.map(w => w.network)));

  // Handle wallet actions
  const handleWalletAction = async (action: string, wallet: WalletData) => {
    switch (action) {
      case 'view':
        if (onWalletSelected) {
          onWalletSelected(wallet);
        }
        break;
      case 'transfer':
        // Open transfer dialog
        toast({
          title: "Transfer",
          description: `Opening transfer dialog for ${wallet.name || wallet.address}`,
        });
        break;
      case 'details':
        // View wallet details
        window.open(`/wallet/dfns/wallets/${wallet.id}`, '_blank');
        break;
      case 'explorer':
        // Open in blockchain explorer
        const explorerUrl = getExplorerUrl(wallet.network, wallet.address);
        if (explorerUrl) {
          window.open(explorerUrl, '_blank');
        }
        break;
    }
  };

  // Get blockchain explorer URL
  const getExplorerUrl = (network: string, address: string): string | null => {
    const explorers: Record<string, string> = {
      'Ethereum': `https://etherscan.io/address/${address}`,
      'Polygon': `https://polygonscan.com/address/${address}`,
      'Bitcoin': `https://blockstream.info/address/${address}`,
      'Arbitrum': `https://arbiscan.io/address/${address}`,
      'Base': `https://basescan.org/address/${address}`,
      'Optimism': `https://optimistic.etherscan.io/address/${address}`,
    };
    return explorers[network] || null;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get network badge color
  const getNetworkBadgeColor = (network: string): string => {
    const colors: Record<string, string> = {
      'Ethereum': 'bg-blue-100 text-blue-800',
      'Bitcoin': 'bg-orange-100 text-orange-800',
      'Polygon': 'bg-purple-100 text-purple-800',
      'Arbitrum': 'bg-blue-100 text-blue-800',
      'Base': 'bg-blue-100 text-blue-800',
      'Optimism': 'bg-red-100 text-red-800',
      'Solana': 'bg-green-100 text-green-800',
    };
    return colors[network] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card className={cn("border-none shadow-sm", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading wallets...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-none shadow-sm", className)}>
      {/* Header with search and filters */}
      {showFilters && (
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallets ({filteredWallets.length})
              </CardTitle>
              <CardDescription>
                Multi-network digital asset custody
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search wallets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterNetwork('all')}>
                    All Networks
                  </DropdownMenuItem>
                  {networks.map(network => (
                    <DropdownMenuItem key={network} onClick={() => setFilterNetwork(network)}>
                      {network}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {showCreateButton && (
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {error && (
          <div className="p-6">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {filteredWallets.length === 0 && !error && !loading ? (
          <div className="text-center py-12 px-6">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No wallets found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterNetwork !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first wallet to get started with DFNS'
              }
            </p>
            {showCreateButton && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Wallet
              </Button>
            )}
          </div>
        ) : (
          <div className={cn("overflow-auto", maxHeight && `max-h-[${maxHeight}]`)}>
            <div className="space-y-0">
              {filteredWallets.map((wallet, index) => (
                <div
                  key={wallet.id}
                  className={cn(
                    "flex items-center justify-between p-4 hover:bg-gray-50 border-b last:border-b-0",
                    "cursor-pointer transition-colors"
                  )}
                  onClick={() => handleWalletAction('view', wallet)}
                >
                  {/* Wallet Info */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {wallet.name || `Wallet ${index + 1}`}
                        </h4>
                        <Badge className={cn("text-xs", getNetworkBadgeColor(wallet.network))}>
                          {wallet.network}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {wallet.address}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {wallet.totalValue !== undefined && (
                          <span>Value: {formatCurrency(wallet.totalValue)}</span>
                        )}
                        {wallet.assetCount !== undefined && (
                          <span>Assets: {wallet.assetCount}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWalletAction('transfer', wallet);
                      }}
                      className="gap-1"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      Transfer
                    </Button>
                    
                    {getExplorerUrl(wallet.network, wallet.address) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWalletAction('explorer', wallet);
                        }}
                        className="gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Explorer
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleWalletAction('details', wallet)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleWalletAction('transfer', wallet)}>
                          Transfer Assets
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleWalletAction('explorer', wallet)}>
                          View on Explorer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
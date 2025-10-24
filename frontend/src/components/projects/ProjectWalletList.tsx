import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Wallet,
  Network,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Shield,
  Search,
  Filter,
  X,
  SortAsc,
  SortDesc,
  Loader2,
  Edit,
  Check
} from "lucide-react";
import { ProjectWalletData, projectWalletService } from "@/services/project/project-wallet-service";
import { BalanceFormatter, balanceService } from "@/services/wallet/balances";
import type { WalletBalance } from "@/services/wallet/balances";
import { getChainEnvironment, getExplorerUrl } from "@/config/chains";
import { WalletEncryptionClient } from "@/services/security/walletEncryptionService";
import { getChainInfo, getChainName, isTestnet } from '@/infrastructure/web3/utils/chainIds';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProjectWalletListProps {
  projectId: string;
  onRefresh?: () => void;
}

interface WalletWithBalance extends ProjectWalletData {
  balance?: WalletBalance;
  isLoadingBalance?: boolean;
  balanceError?: string;
}

type SortOption = 'network_asc' | 'network_desc' | 'balance_desc' | 'balance_asc';

export const ProjectWalletList: React.FC<ProjectWalletListProps> = ({ projectId, onRefresh }) => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<Record<string, boolean>>({});
  const [showMnemonic, setShowMnemonic] = useState<Record<string, boolean>>({});
  const [decryptedPrivateKeys, setDecryptedPrivateKeys] = useState<Record<string, string>>({});
  const [decryptedMnemonics, setDecryptedMnemonics] = useState<Record<string, string>>({});
  const [decryptingPrivateKey, setDecryptingPrivateKey] = useState<Record<string, boolean>>({});
  const [decryptingMnemonic, setDecryptingMnemonic] = useState<Record<string, boolean>>({});
  const [fetchingBalances, setFetchingBalances] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('network_asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  // Wallet name editing state
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletName, setEditingWalletName] = useState('');
  const [savingWalletName, setSavingWalletName] = useState(false);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch wallets and auto-load balances
  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const walletData = await projectWalletService.getProjectWallets(projectId);
      
      const initializedWallets = walletData.map(wallet => ({
        ...wallet,
        isLoadingBalance: false,
        balance: undefined
      }));
      
      setWallets(initializedWallets);
      
      // Auto-load balances after wallets are fetched
      if (initializedWallets.length > 0) {
        setTimeout(() => {
          fetchBalances(false);
        }, 100);
      }
      
    } catch (err) {
      console.error('Error fetching project wallets:', err);
      setError('Failed to load project wallets');
      toast({
        title: "Error",
        description: "Failed to load project wallets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  // Fetch balances for all wallets - checks BOTH mainnet AND testnets
  const fetchBalances = useCallback(async (forceRefresh: boolean = false) => {
    if (fetchingBalances || wallets.length === 0) return;

    setFetchingBalances(true);
    
    console.log(`🔄 Fetching balances for ${wallets.length} wallet addresses (project-specific networks)${forceRefresh ? ' (force refresh)' : ''}`);

    try {
      // Prepare wallets with their specific chain types and network identifiers
      const walletsToFetch = wallets.map(w => {
        // Start with the wallet type as base
        let networkKey = w.wallet_type.toLowerCase();
        
        // Use chain_id to determine the specific network
        // This maps chain IDs to the correct balance service keys
        const chainIdToNetwork: Record<string, string> = {
          // Ethereum networks
          '1': 'ethereum',
          '11155111': 'sepolia',
          '17000': 'holesky',
          '560048': 'hoodi',
          
          // Polygon networks
          '137': 'polygon',
          '80002': 'amoy',
          
          // Arbitrum networks
          '42161': 'arbitrum',
          '421614': 'arbitrum-sepolia',
          
          // Avalanche networks
          '43114': 'avalanche',
          '43113': 'avalanche-testnet', // Fuji
          
          // Optimism networks
          '10': 'optimism',
          '11155420': 'optimism-sepolia',
          
          // Base networks
          '8453': 'base',
          '84532': 'base-sepolia',
          
          // BSC networks
          '56': 'bsc',
          '97': 'bsc-testnet',
          
          // zkSync networks
          '324': 'zksync',
          '300': 'zksync-sepolia',
          
          // Injective networks
          '888': 'injective',
          '1776': 'injective-testnet', // injective-888 testnet
          
          // Add more chain IDs as needed
        };
        
        // Use chain_id if available
        if (w.chain_id) {
          const chainIdStr = String(w.chain_id);
          if (chainIdToNetwork[chainIdStr]) {
            networkKey = chainIdToNetwork[chainIdStr];
            console.log(`🔗 Mapped chain ID ${chainIdStr} to network: ${networkKey}`);
          } else {
            console.log(`⚠️ Unknown chain ID ${chainIdStr}, using wallet_type: ${networkKey}`);
          }
        }
        // If we have a net field, use it to get more specific network info
        else if (w.net) {
          // Map net values to balance service keys
          const netToServiceKey: Record<string, string> = {
            'sepolia': 'sepolia',
            'holesky': 'holesky',
            'amoy': 'amoy',
            'optimism-sepolia': 'optimism-sepolia',
            'arbitrum-sepolia': 'arbitrum-sepolia',
            'base-sepolia': 'base-sepolia',
            'fuji': 'avalanche-testnet',
            'zksync-sepolia': 'zksync-sepolia',
            'injective-888': 'injective-testnet',
            'testnet': `${networkKey}-testnet`,
            'devnet': `${networkKey}-devnet`,
            'signet': `${networkKey}-signet`,
            'mainnet': networkKey, // Keep as-is for mainnet
          };
          
          if (netToServiceKey[w.net]) {
            networkKey = netToServiceKey[w.net];
            console.log(`🌐 Mapped net ${w.net} to network: ${networkKey}`);
          }
        }
        
        return {
          address: w.wallet_address.toLowerCase(),
          walletType: networkKey
        };
      });
      
      console.log(`📋 Fetching balances for ${walletsToFetch.length} wallet(s) with specific chain types`);
      console.log('🔍 Wallet mappings:', walletsToFetch);
      
      // Fetch all balances using the new method that respects wallet-specific chains
      const allBalances = await balanceService.fetchBalancesForWallets(walletsToFetch);
      
      // Create a map to store balances by address
      const addressBalancesMap = new Map<string, WalletBalance[]>();
      
      allBalances.forEach(balance => {
        const existing = addressBalancesMap.get(balance.address) || [];
        addressBalancesMap.set(balance.address, [...existing, balance]);
      });
      
      console.log(`✅ Found ${allBalances.length} total balance(s) across ${addressBalancesMap.size} address(es)`);

      // Update wallet data with found balances
      setWallets(prev => prev.map(wallet => {
        const addressBalances = addressBalancesMap.get(wallet.wallet_address.toLowerCase());
        
        if (addressBalances && addressBalances.length > 0) {
          // Find the most relevant balance for this wallet:
          // Try to match by network name or use the first available balance
          const balance = addressBalances[0];
          
          return {
            ...wallet,
            balance,
            isLoadingBalance: false,
            balanceError: undefined
          };
        }
        
        // No balance found - return wallet with zero balance
        return {
          ...wallet,
          isLoadingBalance: false,
          balance: undefined,
          balanceError: 'No balance data available'
        };
      }));

      setLastFetchTime(new Date());
      
      const totalBalances = Array.from(addressBalancesMap.values()).reduce((sum, arr) => sum + arr.length, 0);
      if (forceRefresh) {
        toast({
          title: "Balances Refreshed",
          description: `Found ${totalBalances} balance(s) across all networks`,
        });
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Rate limited')) {
        toast({
          title: "Rate Limited",
          description: "Too many requests. Please wait a moment.",
          variant: "destructive"
        });
      } else {
        console.error('❌ Balance fetch error:', error);
        toast({
          title: "Balance Error",
          description: "Failed to load some wallet balances",
          variant: "destructive"
        });
      }
    } finally {
      setFetchingBalances(false);
    }
  }, [wallets, fetchingBalances, toast]);

  // Initial load
  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing balances...');
      fetchBalances(false);
    }, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // Sort and filter wallets
  const sortedAndFilteredWallets = useMemo(() => {
    let filtered = wallets.filter(wallet => {
      // Search filter only
      const matchesSearch = debouncedSearch === '' ||
        wallet.wallet_address.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        wallet.wallet_type.toLowerCase().includes(debouncedSearch.toLowerCase());

      return matchesSearch;
    });

    // Sort wallets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'network_asc':
          return (a.wallet_type || '').localeCompare(b.wallet_type || '');
        case 'network_desc':
          return (b.wallet_type || '').localeCompare(a.wallet_type || '');
        case 'balance_desc':
          return (b.balance?.totalValueUsd || 0) - (a.balance?.totalValueUsd || 0);
        case 'balance_asc':
          return (a.balance?.totalValueUsd || 0) - (b.balance?.totalValueUsd || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [wallets, debouncedSearch, sortBy]);

  // Sort options
  const sortOptions = [
    { value: 'network_asc', label: 'Network A-Z', icon: SortAsc },
    { value: 'network_desc', label: 'Network Z-A', icon: SortDesc },
    { value: 'balance_desc', label: 'Highest Balance', icon: SortDesc },
    { value: 'balance_asc', label: 'Lowest Balance', icon: SortAsc },
  ];

  const handleRefresh = async () => {
    await fetchWallets();
    onRefresh?.();
  };

  const handleDeleteWallet = async () => {
    if (!walletToDelete) return;
    
    try {
      await projectWalletService.deleteProjectWallet(walletToDelete);
      setWallets(wallets.filter(wallet => wallet.id !== walletToDelete));
      toast({
        title: "Success",
        description: "Wallet deleted successfully",
      });
    } catch (err) {
      console.error('Error deleting wallet:', err);
      toast({
        title: "Error",
        description: "Failed to delete wallet",
        variant: "destructive"
      });
    } finally {
      setWalletToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const confirmDelete = (walletId: string) => {
    setWalletToDelete(walletId);
    setShowDeleteDialog(true);
  };

  const toggleShowPrivateKey = async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet || !wallet.private_key) return;

    // If already showing, just hide it
    if (showPrivateKey[walletId]) {
      setShowPrivateKey(prev => ({
        ...prev,
        [walletId]: false
      }));
      return;
    }

    // Check if encrypted
    const isEncrypted = WalletEncryptionClient.isEncrypted(wallet.private_key);
    
    if (isEncrypted) {
      // Need to decrypt first
      if (decryptedPrivateKeys[walletId]) {
        // Already decrypted, just show it
        setShowPrivateKey(prev => ({
          ...prev,
          [walletId]: true
        }));
      } else {
        // Decrypt it
        setDecryptingPrivateKey(prev => ({ ...prev, [walletId]: true }));
        try {
          const decrypted = await WalletEncryptionClient.decrypt(wallet.private_key);
          setDecryptedPrivateKeys(prev => ({
            ...prev,
            [walletId]: decrypted
          }));
          setShowPrivateKey(prev => ({
            ...prev,
            [walletId]: true
          }));
        } catch (error) {
          console.error('Failed to decrypt private key:', error);
          toast({
            title: "Decryption Failed",
            description: "Could not decrypt private key. Please check backend connection.",
            variant: "destructive"
          });
        } finally {
          setDecryptingPrivateKey(prev => ({ ...prev, [walletId]: false }));
        }
      }
    } else {
      // Not encrypted, just show it
      setShowPrivateKey(prev => ({
        ...prev,
        [walletId]: true
      }));
    }
  };

  const toggleShowMnemonic = async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet || !wallet.mnemonic) return;

    // If already showing, just hide it
    if (showMnemonic[walletId]) {
      setShowMnemonic(prev => ({
        ...prev,
        [walletId]: false
      }));
      return;
    }

    // Check if encrypted
    const isEncrypted = WalletEncryptionClient.isEncrypted(wallet.mnemonic);
    
    if (isEncrypted) {
      // Need to decrypt first
      if (decryptedMnemonics[walletId]) {
        // Already decrypted, just show it
        setShowMnemonic(prev => ({
          ...prev,
          [walletId]: true
        }));
      } else {
        // Decrypt it
        setDecryptingMnemonic(prev => ({ ...prev, [walletId]: true }));
        try {
          const decrypted = await WalletEncryptionClient.decrypt(wallet.mnemonic);
          setDecryptedMnemonics(prev => ({
            ...prev,
            [walletId]: decrypted
          }));
          setShowMnemonic(prev => ({
            ...prev,
            [walletId]: true
          }));
        } catch (error) {
          console.error('Failed to decrypt mnemonic:', error);
          toast({
            title: "Decryption Failed",
            description: "Could not decrypt mnemonic. Please check backend connection.",
            variant: "destructive"
          });
        } finally {
          setDecryptingMnemonic(prev => ({ ...prev, [walletId]: false }));
        }
      }
    } else {
      // Not encrypted, just show it
      setShowMnemonic(prev => ({
        ...prev,
        [walletId]: true
      }));
    }
  };

  const copyToClipboard = async (text: string, label: string, walletId?: string, isPrivateKey?: boolean, isMnemonic?: boolean) => {
    try {
      let textToCopy = text;
      
      // If it's encrypted and we have a decrypted version, use that
      if (walletId) {
        if (isPrivateKey && decryptedPrivateKeys[walletId]) {
          textToCopy = decryptedPrivateKeys[walletId];
        } else if (isMnemonic && decryptedMnemonics[walletId]) {
          textToCopy = decryptedMnemonics[walletId];
        } else if (WalletEncryptionClient.isEncrypted(text)) {
          // Need to decrypt first
          toast({
            title: "Decrypting",
            description: "Decrypting data before copying...",
          });
          textToCopy = await WalletEncryptionClient.decrypt(text);
        }
      }
      
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Handle editing wallet name
  const startEditingWalletName = (walletId: string, currentName: string | null) => {
    setEditingWalletId(walletId);
    setEditingWalletName(currentName || '');
  };

  const cancelEditingWalletName = () => {
    setEditingWalletId(null);
    setEditingWalletName('');
  };

  const saveWalletName = async (walletId: string) => {
    if (!editingWalletName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Wallet name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setSavingWalletName(true);
    try {
      await projectWalletService.updateProjectWallet(walletId, { 
        project_wallet_name: editingWalletName.trim() 
      });
      
      // Update local state
      setWallets(prev => prev.map(w => 
        w.id === walletId ? { ...w, project_wallet_name: editingWalletName.trim() } : w
      ));
      
      setEditingWalletId(null);
      setEditingWalletName('');
      
      toast({
        title: "Success",
        description: "Wallet name updated successfully",
      });
    } catch (error) {
      console.error('Failed to update wallet name:', error);
      toast({
        title: "Error",
        description: "Failed to update wallet name",
        variant: "destructive"
      });
    } finally {
      setSavingWalletName(false);
    }
  };

  const renderBalanceCell = (wallet: WalletWithBalance) => {
    if (wallet.isLoadingBalance) {
      return (
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-3 w-3 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      );
    }

    if (wallet.balanceError) {
      return (
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">Failed</span>
        </div>
      );
    }

    if (!wallet.balance) {
      return (
        <div className="text-xs text-muted-foreground">
          Refresh to retrieve
        </div>
      );
    }

    const { balance } = wallet;
    const hasTokens = balance.tokens.length > 0;
    const isTestnet = balance.isTestnet;
    
    return (
      <div className="space-y-1">
        {/* Native Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {BalanceFormatter.formatBalance(
              balance.nativeBalance, 
              balance.network.toUpperCase(),
              { showFullPrecision: true, useAbbreviation: false }
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {isTestnet ? (
              <Badge variant="outline" className="text-xs">Test</Badge>
            ) : (
              BalanceFormatter.formatUsdValue(balance.nativeValueUsd)
            )}
          </span>
        </div>
        
        {/* Token Details - Show actual amounts and symbols */}
        {hasTokens && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {balance.tokens.slice(0, 3).map((token, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span>
                  {BalanceFormatter.formatBalance(
                    token.balance,
                    token.symbol,
                    { showFullPrecision: false, useAbbreviation: true, maxDecimals: 2 }
                  )}
                </span>
                {!isTestnet && token.valueUsd > 0 && (
                  <span className="ml-2 text-muted-foreground/70">
                    {BalanceFormatter.formatUsdValue(token.valueUsd)}
                  </span>
                )}
              </div>
            ))}
            {balance.tokens.length > 3 && (
              <div className="text-muted-foreground/60 italic">
                +{balance.tokens.length - 3} more token{balance.tokens.length - 3 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
        
        {/* Total Value (mainnet only) */}
        {!isTestnet && balance.totalValueUsd > 0 && (
          <div className="text-sm font-semibold text-green-600 pt-1 border-t border-muted">
            {BalanceFormatter.formatUsdValue(balance.totalValueUsd)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Project Wallets
            </CardTitle>
            <CardDescription>
              Manage blockchain wallets for this project
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh wallets"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls - Matching ProjectsList Style */}
        <div className="mt-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address or network..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const selectedOption = sortOptions.find(opt => opt.value === sortBy);
                      const IconComponent = selectedOption?.icon || SortAsc;
                      return <IconComponent className="h-4 w-4" />;
                    })()}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                }}
                className="text-muted-foreground"
              >
                Clear Search
              </Button>
            )}

            {/* Force Refresh Button */}
            <Button 
              variant="outline"
              onClick={() => fetchBalances(true)} 
              disabled={fetchingBalances || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${fetchingBalances ? 'animate-spin' : ''}`} />
              {fetchingBalances ? 'Refresh to retrieve' : 'Refresh Balances'}
            </Button>
          </div>

          {/* Status Info */}
          {lastFetchTime && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {sortedAndFilteredWallets.length} of {wallets.length} wallets
              </span>
              <span>
                Last updated: {lastFetchTime.toLocaleTimeString()} • Auto-refresh: ✓ Enabled (15 min)
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="bg-destructive/10 p-4 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sortedAndFilteredWallets.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {wallets.length === 0 ? 'No wallets yet' : 'No wallets match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {wallets.length === 0 
                ? 'Use the wallet generator above to create blockchain wallets for this project.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Private Key</TableHead>
                  <TableHead>Mnemonic</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredWallets.map(wallet => {
                  // Get chain info from chain_id
                  const chainId = wallet.chain_id ? parseInt(wallet.chain_id, 10) : null;
                  const chainInfo = chainId ? getChainInfo(chainId) : null;
                  const chainName = chainInfo?.name || wallet.wallet_type;
                  const isTestnetChain = chainId ? isTestnet(chainId) : false;
                  
                  return (
                    <TableRow key={wallet.id}>
                      {/* Wallet Name Cell with Edit Functionality */}
                      <TableCell>
                        {editingWalletId === wallet.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editingWalletName}
                              onChange={(e) => setEditingWalletName(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Enter wallet name"
                              disabled={savingWalletName}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveWalletName(wallet.id || '');
                                } else if (e.key === 'Escape') {
                                  cancelEditingWalletName();
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => saveWalletName(wallet.id || '')}
                              disabled={savingWalletName}
                            >
                              {savingWalletName ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={cancelEditingWalletName}
                              disabled={savingWalletName}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {wallet.project_wallet_name || chainName}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => startEditingWalletName(wallet.id || '', wallet.project_wallet_name)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      
                      {/* Network Cell with Chain ID Mapping */}
                      <TableCell>
                        <Badge variant="outline" className="font-normal flex items-center space-x-1">
                          <span>{BalanceFormatter.getNetworkIcon(wallet.balance?.network || chainName)}</span>
                          <span className="capitalize">{chainName}</span>
                        </Badge>
                        {isTestnetChain && (
                          <Badge variant="outline" className="ml-1 text-xs bg-amber-50 text-amber-600 mt-1">
                            Testnet
                          </Badge>
                        )}
                        {chainId && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Chain ID: {chainId}
                          </div>
                        )}
                      </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[150px]">
                          {BalanceFormatter.formatAddress(wallet.wallet_address, 8)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(wallet.wallet_address, 'Wallet address')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      {renderBalanceCell(wallet)}
                    </TableCell>
                    <TableCell>
                      {wallet.private_key ? (
                        <div className="flex items-center space-x-2">
                          {decryptingPrivateKey[wallet.id || ''] ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <span className="text-xs text-muted-foreground">Decrypting...</span>
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-xs truncate max-w-[150px]">
                                {showPrivateKey[wallet.id || ''] 
                                  ? (decryptedPrivateKeys[wallet.id || ''] || wallet.private_key)
                                  : '••••••••••••••••••••'}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => toggleShowPrivateKey(wallet.id || '')}
                                disabled={decryptingPrivateKey[wallet.id || '']}
                              >
                                {showPrivateKey[wallet.id || ''] 
                                  ? <EyeOff className="h-3 w-3" /> 
                                  : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(
                                  wallet.private_key || '', 
                                  'Private key',
                                  wallet.id,
                                  true,
                                  false
                                )}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Secured
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {wallet.mnemonic ? (
                        <div className="flex items-center space-x-2">
                          {decryptingMnemonic[wallet.id || ''] ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <span className="text-xs text-muted-foreground">Decrypting...</span>
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-xs truncate max-w-[150px]">
                                {showMnemonic[wallet.id || ''] 
                                  ? (decryptedMnemonics[wallet.id || ''] || wallet.mnemonic)
                                  : '•••••• •••••• ••••••'}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => toggleShowMnemonic(wallet.id || '')}
                                disabled={decryptingMnemonic[wallet.id || '']}
                              >
                                {showMnemonic[wallet.id || ''] 
                                  ? <EyeOff className="h-3 w-3" /> 
                                  : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(
                                  wallet.mnemonic || '', 
                                  'Mnemonic',
                                  wallet.id,
                                  false,
                                  true
                                )}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not available</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(wallet.id || '')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this wallet? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWallet} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ProjectWalletList;

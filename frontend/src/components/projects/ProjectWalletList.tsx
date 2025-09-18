import React, { useState, useEffect } from 'react';
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
  DollarSign,
  TrendingUp
} from "lucide-react";
import { ProjectWalletData, projectWalletService } from "@/services/project/project-wallet-service";
import { multiChainBalanceService, ChainBalanceData } from "@/services/wallet/MultiChainBalanceService";
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

interface ProjectWalletListProps {
  projectId: string;
  onRefresh?: () => void;
}

// Enhanced wallet with balance data
interface WalletWithBalance extends ProjectWalletData {
  balanceData?: ChainBalanceData;
  isLoadingBalance?: boolean;
  balanceError?: string;
}

export const ProjectWalletList: React.FC<ProjectWalletListProps> = ({ projectId, onRefresh }) => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<Record<string, boolean>>({});
  const [showMnemonic, setShowMnemonic] = useState<Record<string, boolean>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  
  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const walletData = await projectWalletService.getProjectWallets(projectId);
      const walletsWithBalance: WalletWithBalance[] = walletData.map(wallet => ({
        ...wallet,
        isLoadingBalance: true
      }));
      
      setWallets(walletsWithBalance);
      
      // Fetch balances for all wallets
      await fetchAllBalances(walletsWithBalance);
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
  };

  /**
   * Fetch live blockchain balances for all wallets
   */
  const fetchAllBalances = async (wallets: WalletWithBalance[]) => {
    setLoadingBalances(true);
    
    const balancePromises = wallets.map(async (wallet) => {
      if (!wallet.wallet_address) return wallet;

      try {
        // Map wallet type to chain ID
        const chainId = mapWalletTypeToChainId(wallet.wallet_type);
        if (!chainId) {
          return {
            ...wallet,
            isLoadingBalance: false,
            balanceError: `Unsupported network: ${wallet.wallet_type}`
          };
        }

        // Fetch balance data for this chain
        const balanceData = await multiChainBalanceService.getChainBalance(
          wallet.wallet_address,
          chainId
        );

        return {
          ...wallet,
          balanceData,
          isLoadingBalance: false,
          balanceError: balanceData ? undefined : 'Failed to fetch balance'
        };
      } catch (error) {
        console.error(`Error fetching balance for wallet ${wallet.wallet_address}:`, error);
        return {
          ...wallet,
          isLoadingBalance: false,
          balanceError: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    try {
      const walletsWithBalances = await Promise.all(balancePromises);
      setWallets(walletsWithBalances);
      
      toast({
        title: "Balances Updated",
        description: "Live blockchain balances have been fetched",
      });
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      toast({
        title: "Error",
        description: "Some balance fetches failed",
        variant: "destructive"
      });
    } finally {
      setLoadingBalances(false);
    }
  };

  /**
   * Map wallet type to blockchain chain ID
   */
  const mapWalletTypeToChainId = (walletType: string): number | null => {
    const typeMap: Record<string, number> = {
      'ethereum': 1,
      'polygon': 137,
      'arbitrum': 42161,
      'optimism': 10,
      'base': 8453,
      'avalanche': 43114,
      'bsc': 56,
      'fantom': 250,
      'gnosis': 100
    };

    return typeMap[walletType.toLowerCase()] || null;
  };

  useEffect(() => {
    fetchWallets();
  }, [projectId]);

  const handleRefresh = () => {
    fetchWallets();
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

  const toggleShowPrivateKey = (walletId: string) => {
    setShowPrivateKey(prev => ({
      ...prev,
      [walletId]: !prev[walletId]
    }));
  };

  const toggleShowMnemonic = (walletId: string) => {
    setShowMnemonic(prev => ({
      ...prev,
      [walletId]: !prev[walletId]
    }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const getNetworkIcon = (network: string) => {
    // Map network names to their icons/symbols
    const networkMap: Record<string, string> = {
      ethereum: '⟠',
      polygon: '⬟',
      solana: '◎',
      bitcoin: '₿',
      avalanche: '🔺',
      optimism: '🔴',
      arbitrum: '🔵',
      base: '🔷',
      sui: '🌊',
      aptos: '🅰️',
      near: '◇',
      stellar: '✶',
      ripple: 'Ⓡ',
      xrp: 'Ⓡ',
    };
    
    return networkMap[network.toLowerCase()] || '🔗';
  };

  return (
    <div className="space-y-4">
      {/* Portfolio Summary Card */}
      {wallets.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {multiChainBalanceService.formatUsdValue(
                    wallets.reduce((total, wallet) => 
                      total + (wallet.balanceData?.totalUsdValue || 0), 0
                    )
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {wallets.length}
                </div>
                <p className="text-sm text-muted-foreground">Total Wallets</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {new Set(wallets.map(w => w.wallet_type)).size}
                </div>
                <p className="text-sm text-muted-foreground">Networks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Wallet Table */}
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Project Wallets
              {loadingBalances && (
                <RefreshCw className="ml-2 h-4 w-4 animate-spin text-blue-500" />
              )}
            </CardTitle>
            <CardDescription>
              Manage blockchain wallets for this project with live balance data
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchAllBalances(wallets)} 
              disabled={loading || loadingBalances}
            >
              <DollarSign className={`h-4 w-4 mr-2 ${loadingBalances ? 'animate-pulse' : ''}`} />
              {loadingBalances ? 'Fetching...' : 'Refresh Balances'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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
        ) : wallets.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No wallets yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Use the wallet generator above to create blockchain wallets for this project.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Network</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>USD Value</TableHead>
                  <TableHead>Private Key</TableHead>
                  <TableHead>Mnemonic</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map(wallet => (
                  <TableRow key={wallet.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-normal flex items-center space-x-1">
                        <span>{getNetworkIcon(wallet.wallet_type)}</span>
                        <span className="capitalize">{wallet.wallet_type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[150px]">
                          {wallet.wallet_address}
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
                    <TableCell>
                      {wallet.isLoadingBalance ? (
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span className="text-xs text-muted-foreground">Loading...</span>
                        </div>
                      ) : wallet.balanceError ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      ) : wallet.balanceData ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-sm">
                              {multiChainBalanceService.formatBalance(wallet.balanceData.nativeBalance)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {wallet.balanceData.symbol}
                            </span>
                          </div>
                          {wallet.balanceData.erc20Tokens.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              +{wallet.balanceData.erc20Tokens.length} tokens
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No data</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {wallet.isLoadingBalance ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : wallet.balanceError ? (
                        <span className="text-xs text-muted-foreground">--</span>
                      ) : wallet.balanceData ? (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-green-600">
                            {multiChainBalanceService.formatUsdValue(wallet.balanceData.totalUsdValue)}
                          </span>
                          {wallet.balanceData.totalUsdValue > 0 && (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {wallet.private_key ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs truncate max-w-[150px]">
                            {showPrivateKey[wallet.id || ''] 
                              ? wallet.private_key 
                              : '••••••••••••••••••••'}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => toggleShowPrivateKey(wallet.id || '')}
                          >
                            {showPrivateKey[wallet.id || ''] 
                              ? <EyeOff className="h-3 w-3" /> 
                              : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(wallet.private_key || '', 'Private key')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
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
                          <span className="font-mono text-xs truncate max-w-[150px]">
                            {showMnemonic[wallet.id || ''] 
                              ? wallet.mnemonic 
                              : '•••••• •••••• ••••••'}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => toggleShowMnemonic(wallet.id || '')}
                          >
                            {showMnemonic[wallet.id || ''] 
                              ? <EyeOff className="h-3 w-3" /> 
                              : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(wallet.mnemonic || '', 'Mnemonic')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
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
                ))}
              </TableBody>
            </Table>
            
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex items-center text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                <p>
                  <strong>Security Notice:</strong> Keep private keys and mnemonics secure. These credentials provide complete control over the associated wallets.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this wallet? This action cannot be undone.
              The wallet and its credentials will be permanently removed from this project.
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
    </div>
  );
};

export default ProjectWalletList;
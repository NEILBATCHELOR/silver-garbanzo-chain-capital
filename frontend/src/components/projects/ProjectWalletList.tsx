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
import { BalanceService, ChainBalance } from "@/services/wallet/balances/index";
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
  balanceData?: ChainBalance;
  multiChainBalance?: { address: string; totalUsdValue: number; chains: ChainBalance[]; lastUpdated: Date };
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
   * OPTIMIZED: Fetch live blockchain balances with much better performance
   * PERFORMANCE IMPROVEMENTS: Parallel processing, intelligent batching, faster rates
   */
  const fetchAllBalances = async (wallets: WalletWithBalance[]) => {
    setLoadingBalances(true);
    console.log(`🚀 PERFORMANCE OPTIMIZED: Fetching balances for ${wallets.length} wallets using enhanced MultiChainBalanceService`);
    
    // Debug: Show RPC configuration
    BalanceService.debugConfiguration();
    
    // MAJOR OPTIMIZATION: Process more wallets concurrently with shorter delays
    const BATCH_SIZE = 6; // Increased from 3 to 6 - process more wallets at once  
    const BATCH_DELAY = 200; // Reduced from 1000ms to 200ms - much faster between batches
    const REQUEST_DELAY = 50; // Reduced from 300ms to 50ms - faster within batch
    
    const updatedWallets: WalletWithBalance[] = [...wallets];
    
    // Process wallets in optimized batches
    for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
      const batch = wallets.slice(i, i + BATCH_SIZE);
      console.log(`📦 FAST Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(wallets.length/BATCH_SIZE)}: ${batch.length} wallets`);
      
      const batchPromises = batch.map(async (wallet, batchIndex) => {
        const walletIndex = i + batchIndex;
        
        if (!wallet.wallet_address) {
          console.warn(`❌ Wallet ${walletIndex + 1}: No wallet address provided`);
          return {
            walletIndex,
            result: {
              ...wallet,
              isLoadingBalance: false,
              balanceError: 'No wallet address'
            }
          };
        }

        try {
          console.log(`📊 Wallet ${walletIndex + 1}: Checking ${wallet.wallet_type} balance for ${wallet.wallet_address.slice(0, 10)}...`);

          // OPTIMIZATION: Minimal delay between requests (50ms instead of 300ms)
          if (batchIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * batchIndex));
          }

          // OPTIMIZATION: Reduced timeout and better error handling
          const startTime = Date.now();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Balance fetch timeout (8s) - RPC may be slow')), 8000)
          );
          
          const multiChainBalance = await Promise.race([
            BalanceService.fetchMultiChainBalance(wallet.wallet_address),
            timeoutPromise
          ]) as any;
          
          const fetchTime = Date.now() - startTime;

          // Find the best balance data from the multi-chain result
          let bestChainData = null;
          let totalValue = 0;
          
          if (multiChainBalance && multiChainBalance.chains.length > 0) {
            // Find chain with highest balance or first online chain
            bestChainData = multiChainBalance.chains.find(chain => chain.totalUsdValue > 0) || 
                           multiChainBalance.chains.find(chain => chain.isOnline) ||
                           multiChainBalance.chains[0];
            totalValue = multiChainBalance.totalUsdValue;
            
            console.log(`✅ Wallet ${walletIndex + 1} (${fetchTime}ms): Multi-chain = ${BalanceService.formatUsdValue(totalValue)}`);
            
            // Log chain details for successful high-value wallets
            if (totalValue > 0.01) { // Only log wallets with more than 1 cent
              console.group(`💰 Wallet ${walletIndex + 1} Multi-Chain Details`);
              multiChainBalance.chains.forEach(chain => {
                if (chain.isOnline && chain.totalUsdValue > 0) {
                  console.log(`${chain.icon} ${chain.chainName}: ${chain.nativeBalance.slice(0, 8)} ${chain.symbol} = ${BalanceService.formatUsdValue(chain.totalUsdValue)}`);
                }
              });
              console.groupEnd();
            }
          } else {
            console.warn(`⚠️  Wallet ${walletIndex + 1}: No compatible chains found for address`);
          }

          return {
            walletIndex,
            result: {
              ...wallet,
              balanceData: bestChainData,
              multiChainBalance: multiChainBalance,
              isLoadingBalance: false,
              balanceError: bestChainData ? undefined : 'No compatible chains found - check address format'
            }
          };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Wallet ${walletIndex + 1}: Error fetching balance for ${wallet.wallet_type} ${wallet.wallet_address.slice(0, 10)}:`, errorMessage);
          
          // IMPROVEMENT: Provide more specific error messages
          let userFriendlyError = errorMessage;
          if (errorMessage.includes('timeout')) {
            userFriendlyError = 'Request timeout - check RPC connection';
          } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            userFriendlyError = 'Network connection error - retrying in next refresh';
          } else if (errorMessage.includes('invalid') || errorMessage.includes('address')) {
            userFriendlyError = 'Invalid address format';
          } else if (errorMessage.includes('RPC') || errorMessage.includes('provider')) {
            userFriendlyError = 'RPC provider unavailable';
          } else if (errorMessage.includes('rate limit')) {
            userFriendlyError = 'Rate limited - please wait';
          }

          return {
            walletIndex,
            result: {
              ...wallet,
              isLoadingBalance: false,
              balanceError: userFriendlyError
            }
          };
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        
        // Update wallets with batch results
        batchResults.forEach(({ walletIndex, result }) => {
          updatedWallets[walletIndex] = result;
        });
        
        // Update state with current progress
        setWallets([...updatedWallets]);
        
        console.log(`✅ FAST Batch ${Math.floor(i/BATCH_SIZE) + 1} completed successfully`);
        
        // OPTIMIZATION: Much shorter delay between batches (200ms instead of 1000ms)
        if (i + BATCH_SIZE < wallets.length) {
          console.log(`⏳ Brief wait ${BATCH_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
        
      } catch (error) {
        console.error(`❌ Error in fast batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
      }
    }

    // Calculate final summary statistics
    const successful = updatedWallets.filter(w => w.balanceData && !w.balanceError).length;
    const failed = updatedWallets.filter(w => w.balanceError).length;
    const totalValue = updatedWallets.reduce((sum, w) => sum + (w.multiChainBalance?.totalUsdValue || w.balanceData?.totalUsdValue || 0), 0);
    
    console.log(`🚀 OPTIMIZED Balance Summary: ${successful} successful, ${failed} failed, Total Value: ${BalanceService.formatUsdValue(totalValue)}`);
    
    setLoadingBalances(false);
    
    toast({
      title: "Balances Updated",
      description: `Fetched ${successful}/${wallets.length} wallet balances successfully`,
      duration: 3000,
    });
  };

  // REMOVED: Old chain ID mapping - now handled by fixed service

  // REMOVED: Old address validation - now handled by AddressValidator in fixed service

  /**
   * Debug RPC configuration - FIXED: Now always available
   */
  const debugRPCConfiguration = () => {
    console.group('🔧 ProjectWalletList RPC Debug - FIXED VERSION');
    console.log('MultiChainBalanceServiceFixed instance:', BalanceService);
    
    // Debug RPC configuration through the FIXED service
    BalanceService.debugConfiguration();
    
    console.groupEnd();
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
    // Enhanced network icon mapping with comprehensive chain support
    const networkMap: Record<string, string> = {
      // Ethereum
      ethereum: '⟠',
      eth: '⟠',
      sepolia: '⟠',
      holesky: '⟠',
      
      // Polygon
      polygon: '⬢',
      matic: '⬢',
      amoy: '⬢',
      
      // Bitcoin
      bitcoin: '₿',
      btc: '₿',
      
      // Arbitrum
      arbitrum: '🔷',
      arb: '🔷',
      
      // Optimism
      optimism: '🔴',
      op: '🔴',
      
      // Base
      base: '🔵',
      
      // Avalanche
      avalanche: '🏔️',
      avax: '🏔️',
      fuji: '🏔️',
      
      // BSC
      bsc: '🟡',
      binance: '🟡',
      bnb: '🟡',
      
      // Fantom
      fantom: '👻',
      ftm: '👻',
      
      // Gnosis
      gnosis: '🟢',
      xdai: '🟢',
      
      // Injective
      injective: '🔸',
      inj: '🔸',
      
      // Other chains
      solana: '◎',
      sui: '🌊',
      aptos: '🅰️',
      near: '◇',
      stellar: '✶',
      ripple: 'Ⓡ',
      xrp: 'Ⓡ',
    };
    
    const icon = networkMap[network.toLowerCase()];
    if (!icon) {
      console.debug(`🔗 No icon found for network: ${network}, using default`);
    }
    
    return icon || '🔗';
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
                  {BalanceService.formatUsdValue(
                    wallets.reduce((total, wallet) => 
                      total + (wallet.multiChainBalance?.totalUsdValue || wallet.balanceData?.totalUsdValue || 0), 0
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
            <Button variant="ghost" size="sm" onClick={debugRPCConfiguration} className="bg-blue-50 hover:bg-blue-100 text-blue-700">
              🔧 Debug RPC
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
                          {BalanceService.formatBalance(wallet.balanceData.nativeBalance)}
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
                            {BalanceService.formatUsdValue(wallet.multiChainBalance?.totalUsdValue || wallet.balanceData.totalUsdValue)}
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
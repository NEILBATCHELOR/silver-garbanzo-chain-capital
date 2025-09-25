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
  Coins,
  TestTube,
  Globe
} from "lucide-react";
import { ProjectWalletData, projectWalletService } from "@/services/project/project-wallet-service";
import { balanceService, BalanceService } from "@/services/wallet/balances/BalanceService";
import { priceFeedService } from "@/services/wallet/PriceFeedService";
import type { WalletBalance, TokenBalance } from "@/services/wallet/balances/BalanceService";
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

interface WalletWithBalance extends ProjectWalletData {
  balance?: WalletBalance;
  testnetBalances?: WalletBalance[];
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
  const [fetchingBalances, setFetchingBalances] = useState(false);
  const [scanningTestnets, setScanningTestnets] = useState(false);
  const [showTestnetBalances, setShowTestnetBalances] = useState(false);
  
  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const walletData = await projectWalletService.getProjectWallets(projectId);
      setWallets(walletData.map(wallet => ({ ...wallet, isLoadingBalance: false })));
      
      // Automatically fetch balances after loading wallets
      if (walletData.length > 0) {
        await fetchAllBalances(walletData);
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
  };

  const fetchAllBalances = async (walletsToFetch?: ProjectWalletData[]) => {
    const targetWallets = walletsToFetch || wallets;
    if (targetWallets.length === 0) return;

    setFetchingBalances(true);
    console.log(`🔄 Fetching mainnet balances for ${targetWallets.length} project wallets`);

    // Set loading states for all wallets
    setWallets(prev => prev.map(wallet => ({
      ...wallet,
      isLoadingBalance: true,
      balanceError: undefined
    })));

    const balancePromises = targetWallets.map(async (wallet) => {
      try {
        console.log(`🔍 Fetching mainnet balance for ${wallet.wallet_address} on ${wallet.wallet_type}`);
        const balance = await balanceService.fetchWalletBalance(wallet.wallet_address, wallet.wallet_type);
        
        return {
          walletId: wallet.id,
          balance,
          error: null
        };
      } catch (error) {
        console.error(`❌ Failed to fetch balance for ${wallet.wallet_address}:`, error);
        return {
          walletId: wallet.id,
          balance: null,
          error: error instanceof Error ? error.message : 'Failed to fetch balance'
        };
      }
    });

    try {
      const results = await Promise.all(balancePromises);
      
      // Update wallet balances
      setWallets(prev => prev.map(wallet => {
        const result = results.find(r => r.walletId === wallet.id);
        if (!result) return { ...wallet, isLoadingBalance: false };

        return {
          ...wallet,
          balance: result.balance || undefined,
          balanceError: result.error || undefined,
          isLoadingBalance: false
        };
      }));

      const successCount = results.filter(r => r.balance).length;
      console.log(`✅ Successfully fetched ${successCount}/${results.length} mainnet wallet balances`);
      
      if (successCount > 0) {
        toast({
          title: "Balances Updated",
          description: `Successfully loaded mainnet balances for ${successCount} wallet${successCount !== 1 ? 's' : ''}`,
        });
      }
    } catch (error) {
      console.error('❌ Error in batch balance fetching:', error);
      toast({
        title: "Balance Error",
        description: "Failed to load some wallet balances",
        variant: "destructive"
      });
    } finally {
      setFetchingBalances(false);
    }
  };

  const scanTestnetBalances = async () => {
    const targetWallets = wallets;
    if (targetWallets.length === 0) return;

    setScanningTestnets(true);
    console.log(`🧪 Scanning testnet balances for ${targetWallets.length} project wallets`);

    toast({
      title: "Scanning Testnets",
      description: "This may take a moment as we check multiple testnets...",
    });

    const testnetPromises = targetWallets.map(async (wallet) => {
      try {
        // Get testnets for the wallet's mainnet
        const testnets = balanceService.getTestnetsForMainnet(wallet.wallet_type);
        
        if (testnets.length === 0) {
          console.log(`ℹ️ No testnets found for ${wallet.wallet_type}`);
          return {
            walletId: wallet.id,
            testnetBalances: []
          };
        }

        console.log(`🔍 Scanning ${testnets.length} testnets for ${wallet.wallet_address}`);
        
        const testnetBalancePromises = testnets.map(async (testnet) => {
          try {
            const balance = await balanceService.fetchWalletBalance(wallet.wallet_address, testnet);
            // Only return if there's actual balance
            if (parseFloat(balance.nativeBalance) > 0 || balance.tokens.length > 0) {
              return balance;
            }
            return null;
          } catch (error) {
            console.warn(`⚠️ Failed to fetch ${testnet} balance:`, error);
            return null;
          }
        });

        const testnetResults = await Promise.all(testnetBalancePromises);
        const validTestnetBalances = testnetResults.filter(b => b !== null) as WalletBalance[];

        return {
          walletId: wallet.id,
          testnetBalances: validTestnetBalances
        };
      } catch (error) {
        console.error(`❌ Failed to scan testnets for ${wallet.wallet_address}:`, error);
        return {
          walletId: wallet.id,
          testnetBalances: []
        };
      }
    });

    try {
      const results = await Promise.all(testnetPromises);
      
      // Update wallet testnet balances
      setWallets(prev => prev.map(wallet => {
        const result = results.find(r => r.walletId === wallet.id);
        if (!result) return wallet;

        return {
          ...wallet,
          testnetBalances: result.testnetBalances
        };
      }));

      const totalTestnetBalances = results.reduce((sum, r) => sum + r.testnetBalances.length, 0);
      console.log(`✅ Found ${totalTestnetBalances} testnet balances across all wallets`);
      
      toast({
        title: "Testnet Scan Complete",
        description: totalTestnetBalances > 0 
          ? `Found ${totalTestnetBalances} testnet balance${totalTestnetBalances !== 1 ? 's' : ''}`
          : "No testnet balances found",
      });

      if (totalTestnetBalances > 0) {
        setShowTestnetBalances(true);
      }
    } catch (error) {
      console.error('❌ Error scanning testnets:', error);
      toast({
        title: "Testnet Scan Error",
        description: "Failed to scan testnet balances",
        variant: "destructive"
      });
    } finally {
      setScanningTestnets(false);
    }
  };

  const scanAllNetworks = async () => {
    const targetWallets = wallets;
    if (targetWallets.length === 0) return;

    setFetchingBalances(true);
    setScanningTestnets(true);
    console.log(`🌐 Scanning ALL networks (mainnet + testnet) for ${targetWallets.length} wallets`);

    toast({
      title: "Scanning All Networks",
      description: "Checking both mainnet and testnet balances...",
    });

    const allNetworkPromises = targetWallets.map(async (wallet) => {
      try {
        console.log(`🔍 Scanning all networks for ${wallet.wallet_address}`);
        
        // Use the comprehensive scan method
        const allBalances = await balanceService.fetchAllBalancesIncludingTestnets(wallet.wallet_address);
        
        // Separate mainnet and testnet balances
        const mainnetBalances = allBalances.filter(b => !b.isTestnet);
        const testnetBalances = allBalances.filter(b => b.isTestnet);
        
        // Find the mainnet balance for the wallet's primary network
        const primaryBalance = mainnetBalances.find(b => 
          b.network.toLowerCase() === wallet.wallet_type.toLowerCase()
        );

        return {
          walletId: wallet.id,
          balance: primaryBalance || null,
          testnetBalances: testnetBalances,
          additionalMainnets: mainnetBalances.filter(b => 
            b.network.toLowerCase() !== wallet.wallet_type.toLowerCase()
          )
        };
      } catch (error) {
        console.error(`❌ Failed to scan all networks for ${wallet.wallet_address}:`, error);
        return {
          walletId: wallet.id,
          balance: null,
          testnetBalances: [],
          additionalMainnets: []
        };
      }
    });

    try {
      const results = await Promise.all(allNetworkPromises);
      
      // Update wallet balances
      setWallets(prev => prev.map(wallet => {
        const result = results.find(r => r.walletId === wallet.id);
        if (!result) return { ...wallet, isLoadingBalance: false };

        return {
          ...wallet,
          balance: result.balance || undefined,
          testnetBalances: result.testnetBalances,
          isLoadingBalance: false
        };
      }));

      const totalMainnet = results.filter(r => r.balance).length;
      const totalTestnet = results.reduce((sum, r) => sum + r.testnetBalances.length, 0);
      const totalAdditional = results.reduce((sum, r) => sum + r.additionalMainnets.length, 0);

      console.log(`✅ Scan complete: ${totalMainnet} mainnet, ${totalTestnet} testnet, ${totalAdditional} additional networks`);
      
      toast({
        title: "Network Scan Complete",
        description: `Found balances on ${totalMainnet + totalTestnet + totalAdditional} networks`,
      });

      if (totalTestnet > 0) {
        setShowTestnetBalances(true);
      }
    } catch (error) {
      console.error('❌ Error scanning all networks:', error);
      toast({
        title: "Network Scan Error",
        description: "Failed to scan all networks",
        variant: "destructive"
      });
    } finally {
      setFetchingBalances(false);
      setScanningTestnets(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [projectId]);

  const handleRefresh = async () => {
    await fetchWallets();
    onRefresh?.();
  };

  const handleRefreshBalances = async () => {
    await fetchAllBalances();
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
      injective: '⚛️',
      sepolia: '⟠ᵀ',
      holesky: '⟠ᴴ',
      amoy: '⬟ᵀ',
      'optimism-sepolia': '🔴ᵀ',
      'arbitrum-sepolia': '🔵ᵀ',
      'base-sepolia': '🔷ᵀ',
      fuji: '🔺ᵀ',
    };
    
    return networkMap[network.toLowerCase()] || '🔗';
  };

  const formatBalance = (balance: string, symbol: string): string => {
    const num = parseFloat(balance);
    if (num === 0) return `0 ${symbol}`;
    if (num < 0.000001) return `<0.000001 ${symbol}`;
    if (num < 0.01) return `${num.toFixed(6)} ${symbol}`;
    if (num < 1) return `${num.toFixed(4)} ${symbol}`;
    if (num < 1000) return `${num.toFixed(3)} ${symbol}`;
    if (num < 1000000) return `${(num / 1000).toFixed(2)}K ${symbol}`;
    return `${(num / 1000000).toFixed(2)}M ${symbol}`;
  };

  const formatUsdValue = (value: number): string => {
    if (value < 0.01) return '$0.00';
    if (value < 1) return `$${value.toFixed(3)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${(value / 1000000).toFixed(2)}M`;
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
      return <span className="text-xs text-muted-foreground">No data</span>;
    }

    const { balance } = wallet;
    const hasTokens = balance.tokens.length > 0;
    const hasTestnetBalances = wallet.testnetBalances && wallet.testnetBalances.length > 0;

    return (
      <div className="space-y-1">
        {/* Mainnet Badge */}
        {!balance.isTestnet && (
          <Badge variant="outline" className="text-xs bg-green-50">
            <Globe className="h-3 w-3 mr-1" />
            Mainnet
          </Badge>
        )}
        
        {/* Native Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {formatBalance(balance.nativeBalance, balance.network.toUpperCase())}
          </span>
          <span className="text-xs text-muted-foreground">
            {balance.isTestnet ? 'Testnet' : formatUsdValue(balance.nativeValueUsd)}
          </span>
        </div>
        
        {/* Top Tokens (show up to 3) */}
        {hasTokens && (
          <div className="space-y-0.5">
            {balance.tokens.slice(0, 3).map((token, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[80px]">
                  {formatBalance(token.balance, token.symbol)}
                </span>
                <span className="text-muted-foreground">
                  {balance.isTestnet ? 'Test' : formatUsdValue(token.valueUsd)}
                </span>
              </div>
            ))}
            {balance.tokens.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{balance.tokens.length - 3} more tokens
              </div>
            )}
          </div>
        )}
        
        {/* Testnet Balances Summary */}
        {hasTestnetBalances && showTestnetBalances && (
          <div className="pt-1 border-t">
            <Badge variant="outline" className="text-xs bg-blue-50">
              <TestTube className="h-3 w-3 mr-1" />
              {wallet.testnetBalances.length} Testnet{wallet.testnetBalances.length > 1 ? 's' : ''}
            </Badge>
            <div className="mt-1 space-y-0.5">
              {wallet.testnetBalances.slice(0, 2).map((testnet, idx) => (
                <div key={idx} className="text-xs text-muted-foreground">
                  {getNetworkIcon(testnet.network)} {testnet.network}: {formatBalance(testnet.nativeBalance, 'ETH')}
                </div>
              ))}
              {wallet.testnetBalances.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{wallet.testnetBalances.length - 2} more testnets
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Total Value (mainnet only) */}
        {!balance.isTestnet && (
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-sm font-semibold flex items-center">
              <DollarSign className="h-3 w-3 mr-1" />
              Total
            </span>
            <span className="text-sm font-semibold text-green-600">
              {formatUsdValue(balance.totalValueUsd)}
            </span>
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
              Manage blockchain wallets with live balance tracking for this project
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scanAllNetworks} 
              disabled={fetchingBalances || scanningTestnets || loading}
            >
              <Globe className={`h-4 w-4 mr-2 ${(fetchingBalances && scanningTestnets) ? 'animate-spin' : ''}`} />
              All Networks
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scanTestnetBalances} 
              disabled={scanningTestnets || loading}
            >
              <TestTube className={`h-4 w-4 mr-2 ${scanningTestnets ? 'animate-spin' : ''}`} />
              Testnets
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshBalances} 
              disabled={fetchingBalances || loading}
            >
              <Coins className={`h-4 w-4 mr-2 ${fetchingBalances ? 'animate-spin' : ''}`} />
              Mainnet
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
              Balances and token holdings will be automatically tracked across all supported networks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {showTestnetBalances && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                <div className="flex items-center text-sm">
                  <TestTube className="h-4 w-4 text-blue-600 mr-2" />
                  <span>Showing testnet balances</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTestnetBalances(!showTestnetBalances)}
                >
                  {showTestnetBalances ? 'Hide' : 'Show'} Testnets
                </Button>
              </div>
            )}
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Network</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Balance & Tokens</TableHead>
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
                    <TableCell className="min-w-[200px]">
                      {renderBalanceCell(wallet)}
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
            
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                  <span><strong>Total Portfolio Value:</strong></span>
                </div>
                <span className="text-lg font-semibold text-green-600">
                  {formatUsdValue(
                    wallets.reduce((total, wallet) => 
                      total + (wallet.balance?.totalValueUsd || 0), 0
                    )
                  )}
                </span>
              </div>
              {scanningTestnets && (
                <div className="flex items-center text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500 mr-2" />
                  <span>Scanning testnet networks...</span>
                </div>
              )}
              <div className="flex items-center text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                <p>
                  <strong>Security Notice:</strong> Keep private keys and mnemonics secure. 
                  Balances are fetched live from blockchain networks. Testnet tokens have no real value.
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
  );
};

export default ProjectWalletList;

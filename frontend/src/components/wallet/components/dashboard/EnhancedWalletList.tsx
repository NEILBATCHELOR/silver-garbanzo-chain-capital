import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet as WalletType } from "@/services/wallet/UnifiedWalletContext";
import { ChevronRight, UserPlus, Copy, Info, Wallet, Users, Shield, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSigWalletsList } from "./MultiSigWalletsList";
import { MultiSigWalletService } from "@/services/wallet/multiSig/MultiSigWalletService";
import { 
  internalWalletService, 
  type ProjectWallet, 
  type UserWallet 
} from '@/services/wallet/InternalWalletService';
import type { WalletBalance } from '@/services/wallet/balances';
import { getChainInfo, getChainName, isTestnet } from '@/infrastructure/web3/utils/chainIds';

interface EnhancedWalletListProps {
  wallets: WalletType[];
  selectedWalletId: string | undefined;
  onSelectWallet: (walletId: string) => void;
  loading?: boolean;
  userId: string;
  projectId?: string; // Add projectId prop
}

export const EnhancedWalletList: React.FC<EnhancedWalletListProps> = ({
  wallets,
  selectedWalletId,
  onSelectWallet,
  loading = false,
  userId,
  projectId // Add projectId to destructured props
}) => {
  const { toast } = useToast();
  const [multiSigWallets, setMultiSigWallets] = useState<any[]>([]);
  const [multiSigLoading, setMultiSigLoading] = useState(true);
  const [multiSigError, setMultiSigError] = useState<string | null>(null);
  const [totalWalletCount, setTotalWalletCount] = useState(0);
  
  // Internal wallets state (project + user EOA wallets)
  const [projectWallets, setProjectWallets] = useState<ProjectWallet[]>([]);
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);

  // Load Internal wallets (Project + User EOA)
  const loadInternalWallets = async () => {
    try {
      setInternalLoading(true);
      
      // Fetch ALL user wallets (across all users) with balances
      const allUserWallets = await internalWalletService.refreshAllUserWalletBalances(true);
      setUserWallets(allUserWallets);
      
      // Fetch project wallets if projectId is available
      if (projectId) {
        const allWallets = await internalWalletService.refreshAllBalances(projectId);
        setProjectWallets(allWallets.projectWallets);
      } else {
        setProjectWallets([]);
      }
      
    } catch (err) {
      console.error('Failed to load internal wallets:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  // Load Multi-sig wallets
  const loadMultiSigWallets = async () => {
    try {
      setMultiSigLoading(true);
      setMultiSigError(null);
      
      // Validate userId before querying
      if (!userId || userId.trim() === '') {
        console.warn('EnhancedWalletList: userId is empty, skipping multi-sig wallet load');
        setMultiSigWallets([]);
        return;
      }
      
      const userWallets = await MultiSigWalletService.getMultiSigWalletsForUser(userId);
      setMultiSigWallets(userWallets);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load multi-sig wallets';
      setMultiSigError(message);
      console.error('Failed to load multi-sig wallets:', err);
    } finally {
      setMultiSigLoading(false);
    }
  };

  // Load internal wallets on mount and when projectId changes
  useEffect(() => {
    loadInternalWallets();
  }, [projectId]);

  useEffect(() => {
    loadMultiSigWallets();
  }, [userId]);

  // Update total wallet count including all wallet types
  useEffect(() => {
    const standardCount = wallets.length + projectWallets.length + userWallets.length;
    setTotalWalletCount(standardCount + multiSigWallets.length);
  }, [wallets.length, projectWallets.length, userWallets.length, multiSigWallets.length]);

  // Function to copy wallet address to clipboard
  const copyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    });
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format balance with commas and currency symbol
  const formatBalance = (balance: string | undefined) => {
    if (!balance) return "$0";
    
    const numericBalance = parseFloat(balance);
    return numericBalance.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Format balance from WalletBalance object
  const formatWalletBalance = (balance: WalletBalance | undefined) => {
    if (!balance) return "$0";
    
    // For testnets, show native balance with network symbol
    if (balance.isTestnet) {
      const nativeSymbol = balance.network.toUpperCase();
      return `${parseFloat(balance.nativeBalance).toFixed(4)} ${nativeSymbol}`;
    }
    
    // For mainnets, show USD value
    return balance.totalValueUsd.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Render regular wallets
  const renderRegularWallets = () => {
    const isLoadingAny = loading || internalLoading;
    
    if (isLoadingAny) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-[100px] mb-2" />
                <Skeleton className="h-4 w-[70px]" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    const hasAnyWallets = wallets.length > 0 || projectWallets.length > 0 || userWallets.length > 0;
    
    if (!hasAnyWallets) {
      return (
        <div className="text-center py-6">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No Standard Wallets</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You haven't created any standard wallets yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Context Wallets (from UnifiedWalletContext) */}
        {wallets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Connected Wallets ({wallets.length})
            </div>
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                  wallet.id === selectedWalletId ? "bg-muted/50 border-primary" : ""
                }`}
                onClick={() => onSelectWallet(wallet.id)}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{wallet.name}</h3>
                    {wallet.type === "multisig" && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 hover:bg-blue-50">
                        <Users className="h-3 w-3 mr-1" />
                        MultiSig
                      </Badge>
                    )}
                    {wallet.type === "eoa" && (
                      <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                        <Shield className="h-3 w-3 mr-1" />
                        EOA
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <p className="mr-2">{formatAddress(wallet.address)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => copyAddress(wallet.address, e)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {wallet.network}
                  </p>
                </div>
                <div className="mt-4 md:mt-0 flex justify-between items-end md:flex-col md:items-end">
                  <div className="text-xl font-bold">
                    {formatBalance(wallet.balance)}
                  </div>
                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Project Wallets */}
        {projectWallets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Project Wallets ({projectWallets.length})
            </div>
            {projectWallets.map((wallet) => {
              // Get chain info from chain_id if available
              const chainId = wallet.chainId ? parseInt(wallet.chainId, 10) : null;
              const chainInfo = chainId ? getChainInfo(chainId) : null;
              const chainName = chainInfo?.name || 'Unknown Chain';
              const isTestnetChain = chainId ? isTestnet(chainId) : false;
              
              // Use projectWalletName if available, otherwise use chain name
              const displayName = wallet.projectWalletName || chainName;
              
              return (
                <div
                  key={wallet.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{displayName}</h3>
                      <Badge variant="outline" className="bg-purple-50 text-purple-600">
                        Project
                      </Badge>
                      {chainInfo && (
                        <Badge variant="outline" className="text-xs">
                          {chainName}
                        </Badge>
                      )}
                      {isTestnetChain && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600">
                          Testnet
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <p className="mr-2">{formatAddress(wallet.address)}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => copyAddress(wallet.address, e)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {wallet.hasVaultKey ? 'Vault' : wallet.hasDirectKey ? '🔑 Direct' : '⚠️ No key'}
                      {chainId && <span className="ml-2">• Chain ID: {chainId}</span>}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0 text-right">
                    <div className="text-xl font-bold">
                      {formatWalletBalance(wallet.balance)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* User EOA Wallets */}
        {userWallets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              User EOA Wallets ({userWallets.length})
            </div>
            {userWallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{wallet.userName || 'Unknown User'}</h3>
                    {wallet.userRole && (
                      <Badge variant="outline" className="text-xs">
                        {wallet.userRole}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-green-50 text-green-600">
                      User EOA
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {wallet.blockchain}
                    </Badge>
                    {wallet.isActive && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <p className="mr-2">{formatAddress(wallet.address)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => copyAddress(wallet.address, e)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {wallet.userEmail || formatAddress(wallet.userId)} • {wallet.hasVaultKey ? 'Vault' : wallet.hasDirectKey ? '🔑 Direct' : '⚠️ No key'}
                  </p>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <div className="text-xl font-bold">
                    {formatWalletBalance(wallet.balance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Multi-sig wallets
  const renderMultiSigWallets = () => {
    return (
      <MultiSigWalletsList 
        userId={userId}
        selectedWalletId={selectedWalletId}
        onSelectWallet={onSelectWallet}
      />
    );
  };

  // Show empty state if no wallets at all
  if (!loading && !multiSigLoading && !internalLoading && 
      wallets.length === 0 && multiSigWallets.length === 0 && 
      projectWallets.length === 0 && userWallets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No wallets found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't created any wallets yet. Create your first wallet to get started.
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Standard Wallet
              </Button>
              <Button variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                Create Multi-Sig Wallet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const standardWalletCount = wallets.length + projectWallets.length + userWallets.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              Your Wallets
              <Badge variant="outline" className="text-xs">
                {totalWalletCount} Total
              </Badge>
            </CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-muted-foreground">
              {standardWalletCount} Standard • {multiSigWallets.length} Multi-Sig
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                loadInternalWallets();
                loadMultiSigWallets();
              }}
              disabled={loading || internalLoading || multiSigLoading}
            >
              <RefreshCw className={`h-4 w-4 ${(loading || internalLoading || multiSigLoading) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Manage your EOA, project, and multi-signature wallets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Standard Wallets ({standardWalletCount})
            </TabsTrigger>
            <TabsTrigger value="multisig" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Multi-Sig Wallets ({multiSigWallets.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard" className="mt-6">
            {renderRegularWallets()}
          </TabsContent>
          
          <TabsContent value="multisig" className="mt-6">
            {renderMultiSigWallets()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// For backward compatibility, also export the original component
export const WalletList: React.FC<{
  wallets: WalletType[];
  selectedWalletId: string | undefined;
  onSelectWallet: (walletId: string) => void;
  loading?: boolean;
}> = ({ wallets, selectedWalletId, onSelectWallet, loading = false }) => {
  const { toast } = useToast();

  // Function to copy wallet address to clipboard
  const copyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    });
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format balance with commas and currency symbol
  const formatBalance = (balance: string | undefined) => {
    if (!balance) return "$0";
    
    const numericBalance = parseFloat(balance);
    return numericBalance.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Render loading skeletons when data is loading
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-[100px] mb-2" />
                  <Skeleton className="h-4 w-[70px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no wallets
  if (wallets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No wallets found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't created any wallets yet. Create your first wallet to get started.
            </p>
            <Button className="mt-4">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Wallets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                wallet.id === selectedWalletId ? "bg-muted/50 border-primary" : ""
              }`}
              onClick={() => onSelectWallet(wallet.id)}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">{wallet.name}</h3>
                  {wallet.type === "multisig" && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 hover:bg-blue-50">
                      <Users className="h-3 w-3 mr-1" />
                      MultiSig
                    </Badge>
                  )}
                  {wallet.type === "eoa" && (
                    <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                      <Shield className="h-3 w-3 mr-1" />
                      EOA
                    </Badge>
                  )}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <p className="mr-2">{formatAddress(wallet.address)}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => copyAddress(wallet.address, e)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {wallet.network}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex justify-between items-end md:flex-col md:items-end">
                <div className="text-xl font-bold">
                  {formatBalance(wallet.balance)}
                </div>
                <div className="flex items-center">
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Info className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
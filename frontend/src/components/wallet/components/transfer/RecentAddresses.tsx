import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Copy, User, Users, Building2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/infrastructure/database/client";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentAddress {
  address: string;
  lastUsed: Date;
  count: number; // Number of times used
  label?: string; // Optional label (wallet name if known)
  type?: 'project' | 'user' | 'multisig' | 'external';
}

interface RecentAddressesProps {
  onSelectAddress: (address: string) => void;
  currentWalletId?: string; // Optional: exclude current wallet's address
}

export const RecentAddresses: React.FC<RecentAddressesProps> = ({ 
  onSelectAddress,
  currentWalletId 
}) => {
  const { toast } = useToast();
  const [recentAddresses, setRecentAddresses] = useState<RecentAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentAddresses();
  }, [currentWalletId]);

  const loadRecentAddresses = async () => {
    try {
      setLoading(true);

      // Query wallet_transactions for recent recipient addresses
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('to_address, created_at')
        .not('to_address', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100); // Get last 100 transactions

      if (error) throw error;

      // Aggregate addresses by frequency and recency
      const addressMap = new Map<string, RecentAddress>();
      
      transactions?.forEach((tx) => {
        const address = tx.to_address!.toLowerCase();
        
        // Skip if this is the current wallet's address
        if (currentWalletId && address === currentWalletId.toLowerCase()) {
          return;
        }

        if (addressMap.has(address)) {
          const existing = addressMap.get(address)!;
          existing.count++;
          // Keep the most recent date
          if (new Date(tx.created_at) > existing.lastUsed) {
            existing.lastUsed = new Date(tx.created_at);
          }
        } else {
          addressMap.set(address, {
            address: tx.to_address!,
            lastUsed: new Date(tx.created_at),
            count: 1
          });
        }
      });

      // Convert to array and sort by most recent first
      let addresses = Array.from(addressMap.values())
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
        .slice(0, 8); // Top 8 most recent

      // Try to enrich with wallet names from our database
      addresses = await enrichWithWalletNames(addresses);

      setRecentAddresses(addresses);
    } catch (error) {
      console.error('Failed to load recent addresses:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load recent addresses",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enrich addresses with wallet names if they're known wallets
  const enrichWithWalletNames = async (addresses: RecentAddress[]): Promise<RecentAddress[]> => {
    try {
      const addressList = addresses.map(a => a.address.toLowerCase());

      // Check project wallets
      const { data: projectWallets } = await supabase
        .from('project_wallets')
        .select('wallet_address, wallet_type')
        .in('wallet_address', addressList);

      // Check user addresses
      const { data: userAddresses } = await supabase
        .from('user_addresses')
        .select('address, user_id')
        .in('address', addressList);

      // Check multi-sig wallets
      const { data: multiSigWallets } = await supabase
        .from('multi_sig_wallets')
        .select('address, name')
        .in('address', addressList);

      // Map the enriched data
      return addresses.map(addr => {
        const lowerAddr = addr.address.toLowerCase();
        
        // Check if it's a project wallet
        const projectWallet = projectWallets?.find(
          pw => pw.wallet_address.toLowerCase() === lowerAddr
        );
        if (projectWallet) {
          return {
            ...addr,
            label: projectWallet.wallet_type || 'Project Wallet',
            type: 'project' as const
          };
        }

        // Check if it's a user wallet
        const userWallet = userAddresses?.find(
          ua => ua.address.toLowerCase() === lowerAddr
        );
        if (userWallet) {
          return {
            ...addr,
            label: 'User Wallet',
            type: 'user' as const
          };
        }

        // Check if it's a multi-sig wallet
        const multiSig = multiSigWallets?.find(
          ms => ms.address.toLowerCase() === lowerAddr
        );
        if (multiSig) {
          return {
            ...addr,
            label: multiSig.name || 'Multi-Sig Wallet',
            type: 'multisig' as const
          };
        }

        // External address
        return {
          ...addr,
          label: 'External Address',
          type: 'external' as const
        };
      });
    } catch (error) {
      console.error('Failed to enrich addresses:', error);
      return addresses;
    }
  };

  const copyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Address copied to clipboard",
    });
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'project':
        return <Building2 className="h-4 w-4 text-muted-foreground" />;
      case 'user':
        return <User className="h-4 w-4 text-muted-foreground" />;
      case 'multisig':
        return <Shield className="h-4 w-4 text-muted-foreground" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (recentAddresses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent addresses</p>
        <p className="text-xs mt-1">Your sent transactions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentAddresses.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onSelectAddress(item.address)}
        >
          <div className="flex items-center flex-1">
            <div className="bg-muted w-8 h-8 rounded-full flex items-center justify-center mr-3">
              {getIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{item.label || 'Address'}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="font-mono truncate">
                  {item.address.substring(0, 6)}...{item.address.substring(item.address.length - 4)}
                </span>
                <span>•</span>
                <span>{formatTimeAgo(item.lastUsed)}</span>
                {item.count > 1 && (
                  <>
                    <span>•</span>
                    <span>{item.count}x</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => copyAddress(item.address, e)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

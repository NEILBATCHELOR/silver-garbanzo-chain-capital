import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Users, Copy, Info, ChevronRight, Shield, Wallet } from 'lucide-react';
import { MultiSigWalletService, MultiSigWalletWithOwners } from '@/services/wallet/multiSig/MultiSigWalletService';

interface MultiSigWalletsListProps {
  userId: string;
  onSelectWallet?: (walletId: string) => void;
  selectedWalletId?: string;
}

export const MultiSigWalletsList: React.FC<MultiSigWalletsListProps> = ({
  userId,
  onSelectWallet,
  selectedWalletId
}) => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<MultiSigWalletWithOwners[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
  }, [userId]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MultiSigWalletService.getMultiSigWalletsForUser(userId);
      setWallets(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load multi-sig wallets';
      setError(message);
      console.error('Failed to load multi-sig wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Multi-sig wallet address copied to clipboard",
    });
  };

  const handleSelectWallet = (walletId: string) => {
    if (onSelectWallet) {
      onSelectWallet(walletId);
    }
  };

  if (loading) {
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

  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        <p>{error}</p>
        <Button onClick={loadWallets} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="text-center py-6">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No Multi-Sig Wallets</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have any multi-signature wallets yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {wallets.map((wallet) => (
        <div
          key={wallet.id}
          className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
            wallet.id === selectedWalletId ? "bg-muted/50 border-primary" : ""
          }`}
          onClick={() => handleSelectWallet(wallet.id)}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium">{wallet.name}</h3>
              <Badge variant="outline" className="bg-purple-50 text-purple-600 hover:bg-purple-50">
                <Users className="h-3 w-3 mr-1" />
                Multi-Sig
              </Badge>
              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                {wallet.threshold}/{wallet.owner_count} Required
              </Badge>
              {wallet.status && (
                <Badge variant={wallet.status === 'active' ? 'default' : 'outline'} className="text-xs">
                  {wallet.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <p className="mr-2">{MultiSigWalletService.formatAddress(wallet.address)}</p>
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
              {MultiSigWalletService.getBlockchainName(wallet.blockchain)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {wallet.owner_count} Owners
              </Badge>
              {wallet.contract_type && (
                <Badge variant="outline" className="text-xs">
                  {wallet.contract_type}
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex justify-between items-end md:flex-col md:items-end">
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
  );
};

export default MultiSigWalletsList;

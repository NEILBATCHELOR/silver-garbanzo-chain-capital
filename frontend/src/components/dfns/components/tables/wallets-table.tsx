import React, { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet,
  ExternalLink,
  ArrowRightLeft,
  MoreHorizontal,
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

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { WalletData, DfnsWalletAsset, DfnsGetWalletAssetsResponse } from '@/types/dfns';

// Enhanced wallet with computed properties
interface EnhancedWallet extends WalletData {
  totalValue?: number;
  assetCount?: number;
  assets?: DfnsWalletAsset[];
  assetsResponse?: DfnsGetWalletAssetsResponse;
}

interface WalletsTableProps {
  className?: string;
  onWalletSelected?: (wallet: WalletData) => void;
  maxItems?: number;
}

/**
 * DFNS Wallets Table Component
 * Comprehensive table view of all wallets with real DFNS integration
 */
export function WalletsTable({ className, onWalletSelected, maxItems }: WalletsTableProps) {
  const [wallets, setWallets] = useState<EnhancedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Table columns definition
  const columns: ColumnDef<EnhancedWallet>[] = [
    {
      accessorKey: 'name',
      header: 'Wallet Name',
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{wallet.name}</div>
              <div className="text-sm text-muted-foreground">{wallet.network}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'network',
      header: 'Network',
      cell: ({ row }) => {
        const network = row.getValue('network') as string;
        return (
          <Badge variant="outline">
            {network}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const address = row.getValue('address') as string;
        return (
          <div className="font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        );
      },
    },
    {
      accessorKey: 'totalValue',
      header: 'Portfolio Value',
      cell: ({ row }) => {
        const value = row.getValue('totalValue') as number;
        return (
          <div className="text-right">
            {value ? `$${value.toLocaleString()}` : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'assetCount',
      header: 'Assets',
      cell: ({ row }) => {
        const count = row.getValue('assetCount') as number;
        return (
          <div className="text-center">
            {count || 0}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={status === 'Active' ? 'default' : 'secondary'}>
            {status || 'Active'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onWalletSelected?.(wallet)}>
                <Wallet className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer Assets
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Explorer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Load wallets from DFNS
  useEffect(() => {
    const loadWallets = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view wallets');
          return;
        }

        const walletService = dfnsService.getWalletService();
        const walletAssetService = dfnsService.getWalletAssetsService();
        
        const walletsData = await walletService.getAllWallets();
        
        // Enhance wallets with asset data
        const enhancedWallets: EnhancedWallet[] = await Promise.all(
          walletsData.map(async (wallet) => {
            try {
              const assetsResponse = await walletAssetService.getWalletAssets(wallet.id);
              const assets = assetsResponse.assets || [];
              const totalValue = assets.reduce((sum, asset) => sum + (parseFloat(asset.valueInUsd || '0') || 0), 0);
              
              return {
                ...wallet,
                assetsResponse,
                assets,
                assetCount: assets.length,
                totalValue
              };
            } catch (err) {
              // If asset loading fails, return wallet without asset data
              return {
                ...wallet,
                assets: [],
                assetCount: 0,
                totalValue: 0
              };
            }
          })
        );

        // Apply maxItems limit if specified
        const finalWallets = maxItems ? enhancedWallets.slice(0, maxItems) : enhancedWallets;
        setWallets(finalWallets);

      } catch (err: any) {
        console.error('Error loading wallets:', err);
        setError(err.message || 'Failed to load wallets');
        toast({
          title: "Error",
          description: "Failed to load wallets. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadWallets();
  }, [maxItems, toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Wallets</CardTitle>
          <CardDescription>Loading wallet data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading wallets...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallets ({wallets.length})
        </CardTitle>
        <CardDescription>
          {maxItems ? `Showing latest ${maxItems} wallets` : 'All wallets across networks'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={wallets}
          searchKey="name"
        />
      </CardContent>
    </Card>
  );
}

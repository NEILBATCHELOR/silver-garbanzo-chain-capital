/**
 * DFNS Wallet Details Component
 * 
 * Comprehensive view of a DFNS wallet including assets, NFTs, transaction history,
 * and management actions. Real-time data integration with DFNS services.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft,
  Wallet,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Settings,
  DollarSign,
  Image,
  History,
  Eye,
  EyeOff,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { DfnsService } from '@/services/dfns';
import { WalletAssetCard } from './wallet-asset-card';
import type { 
  DfnsWallet, 
  DfnsWalletAsset,
  DfnsWalletNft,
  DfnsWalletHistoryEntry
} from '@/types/dfns';

interface WalletDetailsProps {
  walletId?: string;
  onBack?: () => void;
  className?: string;
}

/**
 * Format address for display
 */
const formatAddress = (address: string): string => {
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
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

/**
 * Get blockchain explorer URL
 */
const getExplorerUrl = (network: string, address: string): string => {
  const explorers: Record<string, string> = {
    'Ethereum': 'https://etherscan.io/address/',
    'Bitcoin': 'https://blockstream.info/address/',
    'Polygon': 'https://polygonscan.com/address/',
    'Arbitrum': 'https://arbiscan.io/address/',
    'Optimism': 'https://optimistic.etherscan.io/address/',
    'Solana': 'https://explorer.solana.com/address/',
    'Avalanche': 'https://snowtrace.io/address/',
    'Binance': 'https://bscscan.com/address/',
  };
  return explorers[network] ? `${explorers[network]}${address}` : '';
};

/**
 * NFT Card Component
 */
const NFTCard = ({ nft }: { nft: DfnsWalletNft }) => (
  <Card className="overflow-hidden">
    <div className="aspect-square bg-gray-100 flex items-center justify-center">
      <Image className="h-12 w-12 text-gray-400" />
    </div>
    <CardContent className="p-3">
      <div className="space-y-1">
        <h4 className="font-medium text-sm truncate">
          {nft.symbol || 'Unknown NFT'}
        </h4>
        <p className="text-xs text-muted-foreground">
          {'tokenId' in nft ? `#${nft.tokenId}` : 'NFT'}
        </p>
        <div className="text-xs text-muted-foreground font-mono">
          {'contract' in nft && (
            <span>{nft.contract.slice(0, 6)}...{nft.contract.slice(-4)}</span>
          )}
          {'assetId' in nft && (
            <span>Asset ID: {nft.assetId}</span>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Transaction History Item
 */
const HistoryItem = ({ entry }: { entry: DfnsWalletHistoryEntry }) => (
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <div className="flex items-center space-x-3">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
        entry.direction === 'Incoming' 
          ? "bg-green-100 text-green-800" 
          : "bg-red-100 text-red-800"
      )}>
        {entry.direction === 'Incoming' ? '↓' : '↑'}
      </div>
      
      <div>
        <div className="flex items-center space-x-2">
          <span className="font-medium">
            {entry.direction} {entry.asset.symbol}
          </span>
          <Badge 
            variant={entry.status === 'Confirmed' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {entry.status}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {new Date(entry.timestamp).toLocaleDateString()} • 
          {entry.direction === 'Incoming' ? ' From: ' : ' To: '}
          <span className="font-mono">
            {entry.direction === 'Incoming' 
              ? formatAddress(entry.fromAddress || '') 
              : formatAddress(entry.toAddress || '')
            }
          </span>
        </div>
      </div>
    </div>
    
    <div className="text-right">
      <div className="font-medium">
        {parseFloat(entry.amount) / Math.pow(10, entry.asset.decimals)} {entry.asset.symbol}
      </div>
      {entry.fee && (
        <div className="text-xs text-muted-foreground">
          Fee: {entry.fee}
        </div>
      )}
    </div>
  </div>
);

export function WalletDetails({
  walletId: propWalletId,
  onBack,
  className
}: WalletDetailsProps) {
  const { walletId: paramWalletId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const walletId = propWalletId || paramWalletId;
  
  // State
  const [wallet, setWallet] = useState<DfnsWallet | null>(null);
  const [assets, setAssets] = useState<DfnsWalletAsset[]>([]);
  const [nfts, setNfts] = useState<DfnsWalletNft[]>([]);
  const [history, setHistory] = useState<DfnsWalletHistoryEntry[]>([]);
  const [totalValueUsd, setTotalValueUsd] = useState<string | undefined>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(true);
  
  // DFNS Service
  const [dfnsService] = useState(() => new DfnsService());

  // Load wallet data
  const loadWalletData = async (refresh = false) => {
    if (!walletId) return;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Load wallet info and assets in parallel
      const [walletData, assetsData, nftsData, historyData] = await Promise.all([
        dfnsService.getWalletService().getWallet(walletId),
        dfnsService.getWalletService().getWalletAssets(walletId, true),
        dfnsService.getWalletService().getWalletNfts(walletId),
        dfnsService.getWalletService().getWalletHistory(walletId)
      ]);

      setWallet(walletData);
      setAssets(assetsData.assets);
      setNfts(nftsData.nfts);
      setHistory(historyData.history);
      setTotalValueUsd(assetsData.totalValueUsd);

      if (refresh) {
        toast({
          title: "Wallet refreshed",
          description: "Latest data loaded successfully",
        });
      }
    } catch (error: any) {
      console.error('Failed to load wallet data:', error);
      setError(error.message || 'Failed to load wallet data');
      toast({
        title: "Error loading wallet",
        description: error.message || 'Failed to load wallet data',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (walletId) {
      loadWalletData();
    }
  }, [walletId]);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/wallet/dfns/wallets');
    }
  };

  // Handle transfer
  const handleTransfer = (asset?: DfnsWalletAsset) => {
    // TODO: Open transfer dialog
    console.log('Transfer asset:', asset);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !wallet) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Wallet Not Found</h1>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Failed to Load Wallet</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={handleBack} variant="outline">
                  Go Back
                </Button>
                <Button onClick={() => loadWalletData()}>
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const explorerUrl = getExplorerUrl(wallet.network, wallet.address);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <Wallet className="h-6 w-6" />
              <span>{wallet.name || 'Unnamed Wallet'}</span>
            </h1>
            <p className="text-muted-foreground">
              {wallet.network} • {formatAddress(wallet.address)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowValues(!showValues)}
          >
            {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadWalletData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          
          <Button size="sm" onClick={() => handleTransfer()}>
            <Send className="h-4 w-4 mr-2" />
            Transfer
          </Button>
        </div>
      </div>

      {/* Wallet Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Wallet Overview</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{wallet.network}</Badge>
              <Badge variant={wallet.status === 'Active' ? 'default' : 'destructive'}>
                {wallet.status}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Value */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Value</div>
              <div className="text-2xl font-bold">
                {totalValueUsd && showValues ? (
                  `$${parseFloat(totalValueUsd).toLocaleString()}`
                ) : showValues ? (
                  '$0.00'
                ) : (
                  '••••••'
                )}
              </div>
            </div>

            {/* Asset Count */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Assets</div>
              <div className="text-2xl font-bold">{assets.length}</div>
            </div>

            {/* NFT Count */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">NFTs</div>
              <div className="text-2xl font-bold">{nfts.length}</div>
            </div>
          </div>

          {/* Wallet Info */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address:</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">{formatAddress(wallet.address)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(wallet.address, toast)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {explorerUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(explorerUrl, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created:</span>
              <span className="text-sm">{new Date(wallet.dateCreated).toLocaleDateString()}</span>
            </div>

            {wallet.tags && wallet.tags.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tags:</span>
                <div className="flex flex-wrap gap-1">
                  {wallet.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Assets ({assets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="nfts" className="flex items-center space-x-2">
            <Image className="h-4 w-4" />
            <span>NFTs ({nfts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>History ({history.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          {assets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Assets</h3>
                  <p className="text-muted-foreground">
                    This wallet doesn't have any assets yet
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset, index) => (
                <WalletAssetCard
                  key={index}
                  asset={asset}
                  network={wallet.network}
                  showValue={showValues}
                  onTransfer={handleTransfer}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* NFTs Tab */}
        <TabsContent value="nfts" className="space-y-4">
          {nfts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No NFTs</h3>
                  <p className="text-muted-foreground">
                    This wallet doesn't have any NFTs yet
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {nfts.map((nft, index) => (
                <NFTCard key={index} nft={nft} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Transaction History</h3>
                  <p className="text-muted-foreground">
                    No transactions found for this wallet
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <HistoryItem key={index} entry={entry} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WalletDetails;
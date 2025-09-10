/**
 * DFNS Wallet Asset Card Component
 * 
 * Displays individual asset balance and information for a wallet
 * Supports native assets, ERC-20 tokens, and NFTs with USD valuation
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Coins, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/utils/utils';
import type { DfnsWalletAsset, DfnsNetwork } from '@/types/dfns';

interface WalletAssetCardProps {
  asset: DfnsWalletAsset;
  network: DfnsNetwork;
  isLoading?: boolean;
  showValue?: boolean;
  onTransfer?: (asset: DfnsWalletAsset) => void;
  className?: string;
}

/**
 * Get appropriate icon for asset type
 */
const getAssetIcon = (asset: DfnsWalletAsset) => {
  switch (asset.kind) {
    case 'Native':
      return <Coins className="h-4 w-4" />;
    case 'Erc20':
      return <DollarSign className="h-4 w-4" />;
    case 'Asa':
      return <DollarSign className="h-4 w-4" />;
    case 'Aip21':
      return <DollarSign className="h-4 w-4" />;
    case 'Spl':
    case 'Spl2022':
      return <DollarSign className="h-4 w-4" />;
    default:
      return <Coins className="h-4 w-4" />;
  }
};

/**
 * Format balance for display
 */
const formatBalance = (balance: string, decimals: number, symbol: string): string => {
  try {
    const balanceNumber = parseFloat(balance) / Math.pow(10, decimals);
    
    // Format based on size
    if (balanceNumber === 0) return '0';
    if (balanceNumber < 0.001) return `< 0.001 ${symbol}`;
    if (balanceNumber < 1) return `${balanceNumber.toFixed(6)} ${symbol}`;
    if (balanceNumber < 1000) return `${balanceNumber.toFixed(4)} ${symbol}`;
    
    // For larger amounts, use toLocaleString
    return `${balanceNumber.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    })} ${symbol}`;
  } catch (error) {
    console.warn('Failed to format balance:', error);
    return `${balance} ${symbol}`;
  }
};

/**
 * Format USD value for display
 */
const formatUsdValue = (valueInUsd?: string): string => {
  if (!valueInUsd) return '';
  
  try {
    const value = parseFloat(valueInUsd);
    if (value === 0) return '$0.00';
    if (value < 0.01) return '< $0.01';
    
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.warn('Failed to format USD value:', error);
    return valueInUsd;
  }
};

/**
 * Get asset type label
 */
const getAssetTypeLabel = (asset: DfnsWalletAsset): string => {
  switch (asset.kind) {
    case 'Native':
      return 'Native';
    case 'Erc20':
      return 'ERC-20';
    case 'Asa':
      return 'ASA';
    case 'Aip21':
      return 'AIP-21';
    case 'Spl':
    case 'Spl2022':
      return 'SPL';
    default:
      return 'Unknown';
  }
};

/**
 * Get contract address for display
 */
const getContractAddress = (asset: DfnsWalletAsset): string | undefined => {
  if ('contract' in asset) return asset.contract;
  if ('mint' in asset) return asset.mint;
  if ('assetId' in asset) return asset.assetId;
  if ('metadata' in asset) return asset.metadata;
  return undefined;
};

export function WalletAssetCard({
  asset,
  network,
  isLoading = false,
  showValue = true,
  onTransfer,
  className
}: WalletAssetCardProps) {
  const [isValueVisible, setIsValueVisible] = useState(showValue);

  const contractAddress = getContractAddress(asset);
  const formattedBalance = formatBalance(asset.balance, asset.decimals, asset.symbol);
  const formattedUsdValue = asset.valueInUsd ? formatUsdValue(asset.valueInUsd) : undefined;

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-4 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {getAssetIcon(asset)}
          <CardTitle className="text-sm font-medium">
            {asset.symbol}
          </CardTitle>
          {asset.verified && (
            <Badge variant="secondary" className="text-xs">
              Verified
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {getAssetTypeLabel(asset)}
          </Badge>
          
          {formattedUsdValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsValueVisible(!isValueVisible)}
              className="h-6 w-6 p-0"
            >
              {isValueVisible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {/* Balance */}
          <div>
            <div className="text-2xl font-bold">
              {formattedBalance}
            </div>
            
            {formattedUsdValue && (
              <p className="text-xs text-muted-foreground">
                {isValueVisible ? formattedUsdValue : '••••••'}
              </p>
            )}
          </div>

          {/* Contract Info */}
          {contractAddress && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Contract:</span>{' '}
              <span className="font-mono">
                {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
              </span>
            </div>
          )}

          {/* Network Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {network}
            </Badge>
            
            {onTransfer && parseFloat(asset.balance) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransfer(asset)}
                className="h-6 px-2 text-xs"
              >
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Transfer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WalletAssetCard;
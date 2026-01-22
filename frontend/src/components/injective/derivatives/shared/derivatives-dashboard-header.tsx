import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DerivativesDashboardHeaderProps {
  projectId: string;
  projectName?: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  onNetworkChange: (network: 'mainnet' | 'testnet' | 'devnet') => void;
  walletAddress?: string;
  onRefresh?: () => void;
  onLaunchMarket?: () => void;
  onOpenPosition?: () => void;
  refreshing?: boolean;
}

export const DerivativesDashboardHeader: React.FC<
  DerivativesDashboardHeaderProps
> = ({
  projectName,
  network,
  onNetworkChange,
  walletAddress,
  onRefresh,
  onLaunchMarket,
  onOpenPosition,
  refreshing = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Derivatives Trading</h1>
          {projectName && (
            <p className="text-muted-foreground">{projectName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Network Selector */}
          <Select value={network} onValueChange={onNetworkChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mainnet">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Mainnet
                </div>
              </SelectItem>
              <SelectItem value="testnet">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  Testnet
                </div>
              </SelectItem>
              <SelectItem value="devnet">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Devnet
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Wallet Status */}
          {walletAddress ? (
            <Badge variant="default" className="bg-green-600">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            </Badge>
          ) : (
            <Badge variant="destructive">No Wallet</Badge>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          )}

          {/* Settings Button */}
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onLaunchMarket && (
          <Button onClick={onLaunchMarket} disabled={!walletAddress}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Launch Market
          </Button>
        )}
        {onOpenPosition && (
          <Button
            onClick={onOpenPosition}
            variant="outline"
            disabled={!walletAddress}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Open Position
          </Button>
        )}
      </div>

      {/* Warnings */}
      {!walletAddress && (
        <Alert variant="destructive">
          <AlertDescription>
            Please connect your Injective wallet to trade derivatives
          </AlertDescription>
        </Alert>
      )}

      {network !== 'mainnet' && (
        <Alert>
          <AlertDescription>
            You are connected to <strong>{network}</strong>. Use testnet tokens
            for testing.
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-50">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Real-time Data
          </div>
        </Badge>
        <span className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default DerivativesDashboardHeader;

/**
 * Solana Token Holder Analytics
 * Displays holder distribution and statistics
 * 
 * Features:
 * - Total holders count
 * - Top holders list
 * - Distribution chart
 * - Concentration metrics
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/infrastructure/database/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  RefreshCw, 
  Users, 
  TrendingUp, 
  PieChart,
  ExternalLink
} from 'lucide-react';
import { createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { address } from '@solana/kit';
import { HolderAnalyticsLoadingSkeleton } from './LoadingStates';
import { solanaExplorer } from '@/infrastructure/web3/solana';

// ============================================================================
// TYPES
// ============================================================================

interface TokenHolder {
  address: string;
  balance: string;
  percentage: number;
  rank: number;
}

interface HolderAnalytics {
  totalHolders: number;
  totalSupply: string;
  topHolders: TokenHolder[];
  concentration: {
    top10: number;
    top50: number;
    top100: number;
  };
}

interface TokenHolderAnalyticsProps {
  tokenAddress: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  decimals: number;
  tokenSymbol: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenHolderAnalytics({
  tokenAddress,
  network,
  decimals,
  tokenSymbol
}: TokenHolderAnalyticsProps) {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<HolderAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCount, setShowCount] = useState(10);

  useEffect(() => {
    loadHolderAnalytics();
  }, [tokenAddress, network]);

  const loadHolderAnalytics = async () => {
    try {
      setIsLoading(true);

      const rpc = createModernRpc(network);
      const mintAddress = address(tokenAddress);

      // Get program accounts for this token
      // TODO: Implement actual holder fetching using getProgramAccounts
      // For now, return mock data
      const mockAnalytics: HolderAnalytics = {
        totalHolders: 1523,
        totalSupply: '1000000000000000',
        topHolders: [
          {
            address: '7xKXt...9uYz2',
            balance: '150000000000000',
            percentage: 15,
            rank: 1
          },
          {
            address: '8yLZt...3vXw1',
            balance: '120000000000000',
            percentage: 12,
            rank: 2
          },
          {
            address: '9zMAt...7wQp4',
            balance: '100000000000000',
            percentage: 10,
            rank: 3
          },
          {
            address: '4aNBt...5rTy8',
            balance: '85000000000000',
            percentage: 8.5,
            rank: 4
          },
          {
            address: '5bOCt...6sUz9',
            balance: '75000000000000',
            percentage: 7.5,
            rank: 5
          }
        ],
        concentration: {
          top10: 45.5,
          top50: 72.3,
          top100: 85.7
        }
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading holder analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load holder analytics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance: string): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  const shortenAddress = (addr: string): string => {
    if (addr.length < 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  if (isLoading) {
    return <HolderAnalyticsLoadingSkeleton />;
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No holder data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Holder Analytics
            </CardTitle>
            <CardDescription>
              Token distribution and statistics
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadHolderAnalytics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Holders"
            value={analytics.totalHolders.toLocaleString()}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Total Supply"
            value={formatBalance(analytics.totalSupply)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="Avg Holder"
            value={formatBalance(
              (Number(analytics.totalSupply) / analytics.totalHolders).toString()
            )}
            icon={<PieChart className="h-4 w-4" />}
          />
        </div>

        {/* Concentration Metrics */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Concentration</h3>
          <ConcentrationBar
            label="Top 10 Holders"
            percentage={analytics.concentration.top10}
          />
          <ConcentrationBar
            label="Top 50 Holders"
            percentage={analytics.concentration.top50}
          />
          <ConcentrationBar
            label="Top 100 Holders"
            percentage={analytics.concentration.top100}
          />
        </div>

        {/* Top Holders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Top Holders</h3>
            <Badge variant="secondary">{analytics.topHolders.length}</Badge>
          </div>
          
          <div className="space-y-2">
            {analytics.topHolders.slice(0, showCount).map((holder) => (
              <HolderRow
                key={holder.address}
                holder={holder}
                tokenSymbol={tokenSymbol}
                decimals={decimals}
                network={network}
              />
            ))}
          </div>

          {analytics.topHolders.length > showCount && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCount(showCount + 10)}
            >
              Show More
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-3 border rounded-lg space-y-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function ConcentrationBar({
  label,
  percentage
}: {
  label: string;
  percentage: number;
}) {
  const getColor = (pct: number) => {
    if (pct > 75) return 'bg-red-500';
    if (pct > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(percentage)} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function HolderRow({
  holder,
  tokenSymbol,
  decimals,
  network
}: {
  holder: TokenHolder;
  tokenSymbol: string;
  decimals: number;
  network: string;
}) {
  const formatBalance = (balance: string): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  const shortenAddress = (addr: string): string => {
    if (addr.length < 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="w-10 justify-center">
          #{holder.rank}
        </Badge>
        <div>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {shortenAddress(holder.address)}
          </code>
          <p className="text-xs text-muted-foreground mt-1">
            {holder.percentage}% of supply
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-medium">
          {formatBalance(holder.balance)}
        </p>
        <p className="text-xs text-muted-foreground">{tokenSymbol}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          window.open(
            solanaExplorer.address(holder.address, network as any),
            '_blank'
          )
        }
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default TokenHolderAnalytics;

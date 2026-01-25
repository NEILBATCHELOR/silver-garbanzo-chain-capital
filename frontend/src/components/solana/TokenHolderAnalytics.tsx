/**
 * Solana Token Holder Analytics - BLOCKCHAIN VERSION
 * 
 * CRITICAL: Fetches REAL holder data from blockchain
 * NO MOCK DATA - 100% on-chain queries
 * 
 * Features:
 * - Real holder discovery via getProgramAccounts
 * - Actual balance calculations
 * - Live concentration metrics
 * - Top holders ranking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  RefreshCw, 
  Users, 
  TrendingUp, 
  PieChart,
  ExternalLink
} from 'lucide-react';
import { modernSolanaBlockchainQueryService } from '@/services/wallet/solana/ModernSolanaBlockchainQueryService';
import type { TokenHolder } from '@/services/wallet/solana/ModernSolanaBlockchainQueryService';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { HolderAnalyticsLoadingSkeleton } from './LoadingStates';
import { solanaExplorer } from '@/infrastructure/web3/solana';

// ============================================================================
// TYPES
// ============================================================================

interface HolderAnalytics {
  totalHolders: number;
  totalSupply: bigint;
  holders: TokenHolder[];
  concentration: {
    top10: number;
    top50: number;
    top100: number;
  };
}

interface TokenHolderAnalyticsProps {
  tokenAddress: string;
  network: SolanaNetwork;
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
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadHolderAnalytics();
  }, [tokenAddress, network]);

  const loadHolderAnalytics = async () => {
    try {
      setIsLoading(true);

      // Fetch REAL holder data from blockchain
      const holders = await modernSolanaBlockchainQueryService.getTokenHolders(
        tokenAddress,
        network
      );

      // Calculate total supply
      const totalSupply = holders.reduce((sum, h) => sum + h.balance, BigInt(0));

      // Calculate concentration
      const top10 = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
      const top50 = holders.slice(0, 50).reduce((sum, h) => sum + h.percentage, 0);
      const top100 = holders.slice(0, 100).reduce((sum, h) => sum + h.percentage, 0);

      setAnalytics({
        totalHolders: holders.length,
        totalSupply,
        holders,
        concentration: {
          top10: Math.round(top10 * 10) / 10,
          top50: Math.round(top50 * 10) / 10,
          top100: Math.round(top100 * 10) / 10
        }
      });

      setLastUpdated(new Date());

      toast({
        title: 'Holders Updated',
        description: `Found ${holders.length} token holders on blockchain`
      });
    } catch (error) {
      console.error('Error loading holder analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load holder data from blockchain',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance: bigint): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  const formatSupply = (supply: bigint): string => {
    const value = Number(supply) / Math.pow(10, decimals);
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

  if (!analytics || analytics.holders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Holder Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No holders found for this token
          </p>
        </CardContent>
      </Card>
    );
  }

  const avgHolderBalance = analytics.totalSupply / BigInt(analytics.totalHolders);

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
            value={formatSupply(analytics.totalSupply)}
            icon={<TrendingUp className="h-4 w-4" />}
            sublabel={tokenSymbol}
          />
          <StatCard
            label="Avg Holder"
            value={formatBalance(avgHolderBalance)}
            icon={<PieChart className="h-4 w-4" />}
            sublabel={tokenSymbol}
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
            <Badge variant="secondary">{analytics.holders.length}</Badge>
          </div>
          
          <div className="space-y-2">
            {analytics.holders.slice(0, showCount).map((holder, idx) => (
              <HolderRow
                key={holder.address}
                holder={holder}
                rank={idx + 1}
                tokenSymbol={tokenSymbol}
                decimals={decimals}
                network={network}
              />
            ))}
          </div>

          {analytics.holders.length > showCount && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCount(Math.min(showCount + 10, analytics.holders.length))}
            >
              Show More ({analytics.holders.length - showCount} remaining)
            </Button>
          )}
        </div>

        {/* Data Source */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span>✅ Live data from Solana blockchain</span>
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
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
  icon,
  sublabel
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="p-3 border rounded-lg space-y-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
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
        <span className="font-medium">{percentage.toFixed(1)}%</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(percentage)} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function HolderRow({
  holder,
  rank,
  tokenSymbol,
  decimals,
  network
}: {
  holder: TokenHolder;
  rank: number;
  tokenSymbol: string;
  decimals: number;
  network: SolanaNetwork;
}) {
  const formatBalance = (balance: bigint): string => {
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
          #{rank}
        </Badge>
        <div>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {shortenAddress(holder.address)}
          </code>
          <p className="text-xs text-muted-foreground mt-1">
            {holder.percentage.toFixed(2)}% of supply
          </p>
        </div>
      </div>
      <div className="text-right flex items-center gap-2">
        <div>
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
              solanaExplorer.address(holder.address, network),
              '_blank'
            )
          }
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default TokenHolderAnalytics;

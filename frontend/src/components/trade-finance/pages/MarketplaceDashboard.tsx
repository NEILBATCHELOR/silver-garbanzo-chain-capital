/**
 * Trade Finance Marketplace Dashboard
 * 
 * Main landing page showing:
 * - Protocol overview (TVL, total supplied, total borrowed)
 * - Top commodities by APY
 * - User portfolio summary (if connected)
 * - Quick actions (supply/borrow)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WalletConnectButton } from '@/components/trade-finance/shared/wallet-connect-button';
import { TradeFinanceDashboardHeader } from '@/components/trade-finance/shared/trade-finance-dashboard-header';
import { useTradeFinance } from '@/providers/trade-finance';
import { createMarketplaceService } from '@/services/trade-finance/MarketplaceService';
import type { MarketOverview, CommodityMarket, UserPosition } from '@/types/trade-finance/marketplace';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Activity,
  Users,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils/utils';

export function MarketplaceDashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { projectId, setProjectId, isLoading: projectLoading } = useTradeFinance();
  
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [topMarkets, setTopMarkets] = useState<CommodityMarket[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const marketplaceService = createMarketplaceService(projectId);

  // Load market data
  useEffect(() => {
    if (projectId && !projectLoading) {
      loadMarketData();
    }
  }, [projectId, projectLoading]);

  // Load user position when connected
  useEffect(() => {
    if (isConnected && address) {
      loadUserPosition(address);
    } else {
      setUserPosition(null);
    }
  }, [isConnected, address]);

  const loadMarketData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [overviewData, marketsData] = await Promise.all([
        marketplaceService.getMarketOverview(),
        marketplaceService.getMarkets({ sortBy: 'supplyAPY', sortOrder: 'desc' }),
      ]);

      setOverview(overviewData);
      setTopMarkets(marketsData.slice(0, 5)); // Top 5 markets
    } catch (err) {
      console.error('Error loading market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosition = async (walletAddress: string) => {
    try {
      const position = await marketplaceService.getUserPosition(walletAddress);
      setUserPosition(position);
    } catch (err) {
      console.error('Error loading user position:', err);
      // Don't set error state for user position - just log it
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadMarketData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Project Selector */}
      <TradeFinanceDashboardHeader
        projectId={projectId}
        title="Commodities Lending Market"
        subtitle="Supply commodities to earn yield or borrow against your collateral"
        onRefresh={loadMarketData}
        onProjectChange={setProjectId}
        isLoading={loading}
        showSupply={true}
        showBorrow={true}
        onSupply={() => navigate('/trade-finance/supply')}
        onBorrow={() => navigate('/trade-finance/borrow')}
        healthFactor={userPosition?.healthFactor}
        showHealthFactor={isConnected && !!userPosition}
      />

      <div className="container mx-auto p-6 space-y-6">

      {/* Protocol Overview */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totalValueLocked)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Supplied</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totalSupplied)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
              <TrendingDown className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totalBorrowed)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.activeUsers.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Portfolio Summary (if connected) */}
      {isConnected && userPosition && (
        <Card>
          <CardHeader>
            <CardTitle>Your Portfolio</CardTitle>
            <CardDescription>Overview of your positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Net Worth</div>
                <div className="text-2xl font-bold">{formatCurrency(userPosition.netWorth)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Supplied</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(userPosition.totalCollateralUSD)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Borrowed</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(userPosition.totalDebtUSD)}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Button onClick={() => navigate('/marketplace/portfolio')}>
                View Portfolio
              </Button>
              <Button variant="outline" onClick={() => navigate('/marketplace/supply')}>
                Supply
              </Button>
              <Button variant="outline" onClick={() => navigate('/marketplace/borrow')}>
                Borrow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Markets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Markets</CardTitle>
            <CardDescription>Highest yields and most active</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => navigate('/marketplace/markets')}>
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topMarkets.map((market) => (
              <div
                key={market.commodityType}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/marketplace/markets/${market.commodityType}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{market.commodityName}</span>
                    <Badge variant="outline">{market.symbol}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(market.totalSupplyUSD)} supplied
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Supply APY</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatPercent(market.supplyAPY)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Borrow APY</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatPercent(market.borrowAPY)}
                    </div>
                  </div>
                  <Button size="sm">Trade</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Connect your wallet to start earning or borrowing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <WalletConnectButton size="lg" />
              <Button variant="outline" onClick={() => navigate('/marketplace/markets')}>
                Explore Markets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MarketplaceDashboard;

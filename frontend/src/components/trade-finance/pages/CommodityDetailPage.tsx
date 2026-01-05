/**
 * Trade Finance Commodity Detail Page
 * 
 * Deep-dive into a specific commodity market
 * Features:
 * - Price history chart
 * - Supply/Borrow APY trends
 * - Market statistics
 * - Risk parameters
 * - Quick supply/borrow actions
 * - Recent activity for this commodity
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Info,
  ArrowLeft,
  Activity,
  BarChart3
} from 'lucide-react';
import { WalletConnectButton } from '@/components/trade-finance/shared/wallet-connect-button';
import { useTradeFinance } from '@/providers/trade-finance';
import { SupplyModal } from '@/components/trade-finance/supply';
import { BorrowModal } from '@/components/trade-finance/borrow';
import { createMarketplaceService } from '@/services/trade-finance/MarketplaceService';
import type { CommodityMarket, UserPosition } from '@/types/trade-finance/marketplace';

interface CommodityDetail extends CommodityMarket {
  priceHistory: Array<{
    price: number;
    timestamp: string;
  }>;
}

interface HistoricalData {
  priceHistory: Array<{
    timestamp: string;
    data: {
      price: number;
      volume: number;
      high: number;
      low: number;
    };
  }>;
  marketHistory: Array<{
    timestamp: string;
    data: {
      supplyAPY: number;
      borrowAPY: number;
      utilizationRate: number;
      totalSupplyUSD: number;
      totalBorrowUSD: number;
    };
  }>;
}

export function CommodityDetailPage() {
  const { commodityType } = useParams<{ commodityType: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { projectId } = useTradeFinance();
  
  const [market, setMarket] = useState<CommodityDetail | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

  const marketplaceService = createMarketplaceService(projectId);

  useEffect(() => {
    if (projectId && commodityType) {
      fetchData();
    }
  }, [projectId, commodityType, isConnected, address]);

  const fetchData = async () => {
    if (!commodityType) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch market details
      const marketData = await marketplaceService.getMarket(commodityType);
      setMarket(marketData as CommodityDetail);

      // Fetch historical data
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/trade-finance/analytics/commodity/${commodityType}/history?project_id=${projectId}&interval=day`
      );
      
      if (response.ok) {
        const result = await response.json();
        setHistoricalData(result.data);
      }

      // Fetch user position if connected
      if (isConnected && address) {
        const position = await marketplaceService.getUserPosition(address);
        setUserPosition(position);
      }

      // Fetch recent activity for this commodity
      const activity = await marketplaceService.getRecentActivity(10);
      const commodityActivity = activity.filter(a => {
        const activityCommodity = a.commodityType || a.commodity;
        return activityCommodity?.toLowerCase() === commodityType.toLowerCase();
      });
      setRecentActivity(commodityActivity);
      
    } catch (err) {
      console.error('Failed to fetch commodity details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load commodity details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getUserSupply = () => {
    if (!userPosition || !commodityType) return null;
    return userPosition.collateral.find(c => c.commodityType === commodityType.toLowerCase());
  };

  const getUserBorrow = () => {
    if (!userPosition || !commodityType) return null;
    return userPosition.debt.find(d => d.assetAddress === commodityType.toLowerCase());
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="h-12 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Commodity not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/trade-finance/markets')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Button>
      </div>
    );
  }

  const userSupply = getUserSupply();
  const userBorrow = getUserBorrow();

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/trade-finance/markets')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{market.commodityName}</h1>
              <Badge variant="secondary" className="text-lg">{market.symbol}</Badge>
              {market.isActive ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Detailed market information and analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <WalletConnectButton />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${market.currentPrice?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Supply APY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {market.supplyAPY.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Borrow APY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {market.borrowAPY.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {market.utilizationRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Position (if connected) */}
      {isConnected && (userSupply || userBorrow) && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle>Your Position</CardTitle>
            <CardDescription>Your activity in this market</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userSupply && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">Supplied</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {userSupply.amount} {market.symbol}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${userSupply.valueUSD.toLocaleString()}
                  </p>
                </div>
              )}
              {userBorrow && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">Borrowed</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {userBorrow.amount} {market.symbol}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${userBorrow.valueUSD.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="risk">Risk Parameters</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply</span>
                  <span className="font-semibold">
                    ${market.totalSupplyUSD.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Borrowed</span>
                  <span className="font-semibold">
                    ${market.totalBorrowUSD.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Liquidity</span>
                  <span className="font-semibold">
                    ${market.availableLiquidity.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization Rate</span>
                  <span className="font-semibold">
                    {market.utilizationRate.toFixed(2)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => setIsSupplyModalOpen(true)}
                  disabled={!isConnected}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Supply {market.symbol}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setIsBorrowModalOpen(true)}
                  disabled={!isConnected || !userPosition || userPosition.availableToBorrow <= 0}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Borrow {market.symbol}
                </Button>
                {!isConnected && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Connect wallet to supply or borrow
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          {historicalData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Price History (30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {historicalData.priceHistory.length > 0 ? (
                      historicalData.priceHistory.slice(-10).map((point, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatTimestamp(point.timestamp)}
                          </span>
                          <span className="font-semibold">
                            ${point.data.price.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            H: ${point.data.high.toFixed(2)} L: ${point.data.low.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No price history available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>APY Trends (30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {historicalData.marketHistory.length > 0 ? (
                      historicalData.marketHistory.slice(-10).map((point, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatTimestamp(point.timestamp)}
                          </span>
                          <span className="text-green-600 font-semibold">
                            Supply: {point.data.supplyAPY.toFixed(2)}%
                          </span>
                          <span className="text-blue-600 font-semibold">
                            Borrow: {point.data.borrowAPY.toFixed(2)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No APY history available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">
                  Loading historical data...
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Recent transactions for {market.commodityName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <Badge className="mb-1">
                          {activity.type.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {activity.walletAddress?.slice(0, 6)}...{activity.walletAddress?.slice(-4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {activity.amount} {market.symbol}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${activity.valueUSD?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Parameters Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Parameters</CardTitle>
              <CardDescription>
                Collateral and liquidation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Loan-to-Value (LTV)
                  </p>
                  <p className="text-2xl font-bold">{market.ltv}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Liquidation Threshold
                  </p>
                  <p className="text-2xl font-bold">{market.liquidationThreshold}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Liquidation Bonus
                  </p>
                  <p className="text-2xl font-bold">{market.liquidationBonus}%</p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1">What does this mean?</p>
                  <ul className="text-sm space-y-1">
                    <li><strong>LTV:</strong> Maximum you can borrow against this collateral</li>
                    <li><strong>Liquidation Threshold:</strong> When your position becomes liquidatable</li>
                    <li><strong>Liquidation Bonus:</strong> Discount liquidators receive</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {commodityType && (
        <>
          <SupplyModal
            open={isSupplyModalOpen}
            onClose={() => setIsSupplyModalOpen(false)}
            onSuccess={fetchData}
            userAddress={address}
            projectId={projectId}
          />
          {userPosition && (
            <BorrowModal
              open={isBorrowModalOpen}
              onClose={() => setIsBorrowModalOpen(false)}
              onSuccess={fetchData}
              userAddress={address}
              projectId={projectId}
              currentHealthFactor={userPosition.healthFactor}
              availableToBorrow={userPosition.availableToBorrow.toString()}
            />
          )}
        </>
      )}
    </div>
  );
}

export default CommodityDetailPage;

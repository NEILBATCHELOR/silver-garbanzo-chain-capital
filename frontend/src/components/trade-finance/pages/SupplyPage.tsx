/**
 * Trade Finance Supply Page
 * 
 * Complete user flow for supplying commodity collateral
 * Features:
 * - Select commodity to supply
 * - View current APY and projected earnings
 * - Approve token → Supply confirmation
 * - Transaction status tracking
 * - Real-time price updates via WebSocket
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Wallet, 
  Info, 
  ArrowUpCircle,
  RefreshCw
} from 'lucide-react';
import { WalletConnectButton } from '@/components/trade-finance/shared/wallet-connect-button';
import { useTradeFinance } from '@/providers/trade-finance';
import { SupplyModal } from '@/components/trade-finance/supply';
import { createMarketplaceService } from '@/services/trade-finance/MarketplaceService';
import type { CommodityMarket, UserPosition } from '@/types/trade-finance/marketplace';

interface ProjectedEarnings {
  daily: number;
  monthly: number;
  yearly: number;
}

export function SupplyPage() {
  const { address, isConnected } = useAccount();
  const { projectId } = useTradeFinance();
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);
  const [markets, setMarkets] = useState<CommodityMarket[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectedEarnings, setProjectedEarnings] = useState<ProjectedEarnings | null>(null);

  const marketplaceService = createMarketplaceService(projectId);

  // Fetch markets and user position
  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, isConnected, address]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch markets
      const marketsData = await marketplaceService.getMarkets({
        sortBy: 'supplyAPY',
        sortOrder: 'desc'
      });
      setMarkets(marketsData);

      // Fetch user position if connected
      if (isConnected && address) {
        const position = await marketplaceService.getUserPosition(address);
        setUserPosition(position);

        // Calculate projected earnings
        if (position && position.totalCollateralUSD > 0) {
          // Get user's supplied assets with their APYs
          const userSuppliedAssets = marketsData.filter(market => {
            return position.collateral.some(c => c.commodityType === market.commodityType);
          });

          const totalYearlyEarnings = userSuppliedAssets.reduce((sum, market) => {
            const userCollateral = position.collateral.find(c => c.commodityType === market.commodityType);
            if (userCollateral) {
              return sum + (userCollateral.valueUSD * (market.supplyAPY / 100));
            }
            return sum;
          }, 0);

          setProjectedEarnings({
            daily: totalYearlyEarnings / 365,
            monthly: totalYearlyEarnings / 12,
            yearly: totalYearlyEarnings
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch supply data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supply markets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSupplyClick = (commodityType: string) => {
    setSelectedCommodity(commodityType);
    setIsSupplyModalOpen(true);
  };

  const handleSupplySuccess = () => {
    // Refresh data after successful supply
    fetchData();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Get user's supply for a specific market
  const getUserSupplyForMarket = (commodityType: string) => {
    if (!userPosition || !userPosition.collateral) return null;
    return userPosition.collateral.find(c => c.commodityType === commodityType);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-muted animate-pulse rounded" />
            <div className="h-5 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supply Commodities</h1>
          <p className="text-muted-foreground mt-1">
            Supply commodities as collateral and earn interest
          </p>
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

      {/* Portfolio Overview - Only show when connected */}
      {isConnected && userPosition && userPosition.totalCollateralUSD > 0 && projectedEarnings && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Your Supply Portfolio
            </CardTitle>
            <CardDescription>
              Overview of your supplied assets and projected earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Supplied</p>
                <p className="text-2xl font-bold">
                  ${userPosition.totalCollateralUSD.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Monthly Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  +${projectedEarnings.monthly.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Yearly Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  +${projectedEarnings.yearly.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Connected Alert */}
      {!isConnected && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Connect your wallet to view your portfolio and supply commodities
          </AlertDescription>
        </Alert>
      )}

      {/* Markets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Available Markets
          </CardTitle>
          <CardDescription>
            Select a commodity to supply and start earning interest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Markets</TabsTrigger>
              <TabsTrigger value="your-supply" disabled={!isConnected || !userPosition}>
                Your Supply
              </TabsTrigger>
              <TabsTrigger value="highest-apy">Highest APY</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {markets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No markets available
                </div>
              ) : (
                markets.map((market) => {
                  const userSupply = getUserSupplyForMarket(market.commodityType);
                  return (
                    <Card key={market.commodityType} className="hover:border-primary/50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{market.commodityName}</h3>
                              <Badge variant="secondary">{market.symbol}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Supply APY</p>
                                <p className="font-semibold text-green-600 flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {market.supplyAPY.toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Supplied</p>
                                <p className="font-semibold">${market.totalSupplyUSD.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Liquidity</p>
                                <p className="font-semibold">${market.availableLiquidity.toLocaleString()}</p>
                              </div>
                              {userSupply && (
                                <div>
                                  <p className="text-muted-foreground">Your Supply</p>
                                  <p className="font-semibold">{userSupply.amount} {market.symbol}</p>
                                  <p className="text-xs text-muted-foreground">
                                    ${userSupply.valueUSD.toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              onClick={() => handleSupplyClick(market.commodityType)}
                              disabled={!isConnected}
                            >
                              <ArrowUpCircle className="h-4 w-4 mr-2" />
                              Supply
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="your-supply" className="space-y-4 mt-4">
              {!userPosition || !userPosition.collateral || userPosition.collateral.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  You haven't supplied any assets yet
                </div>
              ) : (
                userPosition.collateral.map((collateral) => {
                  const market = markets.find(m => m.commodityType === collateral.commodityType);
                  if (!market) return null;

                  const monthlyEarnings = (collateral.valueUSD * (market.supplyAPY / 100)) / 12;

                  return (
                    <Card key={collateral.commodityType} className="hover:border-primary/50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{market.commodityName}</h3>
                              <Badge variant="secondary">{market.symbol}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Your Supply</p>
                                <p className="font-semibold">{collateral.amount} {market.symbol}</p>
                                <p className="text-xs text-muted-foreground">
                                  ${collateral.valueUSD.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Supply APY</p>
                                <p className="font-semibold text-green-600">{market.supplyAPY.toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Est. Monthly Earnings</p>
                                <p className="font-semibold text-green-600">
                                  +${monthlyEarnings.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button onClick={() => handleSupplyClick(market.commodityType)}>
                              <ArrowUpCircle className="h-4 w-4 mr-2" />
                              Supply More
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="highest-apy" className="space-y-4 mt-4">
              {[...markets]
                .sort((a, b) => b.supplyAPY - a.supplyAPY)
                .slice(0, 5)
                .map((market) => (
                  <Card key={market.commodityType} className="hover:border-primary/50 transition-colors border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{market.commodityName}</h3>
                            <Badge variant="secondary">{market.symbol}</Badge>
                            <Badge className="bg-green-500">Top APY</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Supply APY</p>
                              <p className="font-semibold text-green-600 text-xl">
                                <TrendingUp className="h-4 w-4 inline mr-1" />
                                {market.supplyAPY.toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Supplied</p>
                              <p className="font-semibold">${market.totalSupplyUSD.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Liquidity</p>
                              <p className="font-semibold">${market.availableLiquidity.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleSupplyClick(market.commodityType)}
                            disabled={!isConnected}
                          >
                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                            Supply
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Supply Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  1
                </div>
                <h4 className="font-semibold">Select Commodity</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose which commodity you want to supply as collateral from the available markets
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  2
                </div>
                <h4 className="font-semibold">Supply & Earn</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Supply your commodity tokens and start earning interest immediately
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  3
                </div>
                <h4 className="font-semibold">Withdraw Anytime</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Withdraw your supplied commodities plus earned interest anytime
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supply Modal */}
      {selectedCommodity && (
        <SupplyModal
          open={isSupplyModalOpen}
          onClose={() => setIsSupplyModalOpen(false)}
          onSuccess={handleSupplySuccess}
          userAddress={address}
          projectId={projectId}
        />
      )}
    </div>
  );
}

export default SupplyPage;

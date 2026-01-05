/**
 * Trade Finance Borrow Page
 * 
 * Complete user flow for borrowing stablecoins against commodity collateral
 * Features:
 * - Select collateral commodity
 * - View collateralization requirements
 * - Select asset to borrow
 * - Real-time health factor impact preview
 * - Approve → Borrow confirmation
 * - Transaction status tracking
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingDown,
  Wallet,
  Info,
  Shield,
  ArrowDownCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { WalletConnectButton } from '@/components/trade-finance/shared/wallet-connect-button';
import { useTradeFinance } from '@/providers/trade-finance';
import { BorrowModal } from '@/components/trade-finance/borrow';
import { HealthFactorDisplay } from '@/components/trade-finance/borrow';
import { createMarketplaceService } from '@/services/trade-finance/MarketplaceService';
import type { CommodityMarket, UserPosition } from '@/types/trade-finance/marketplace';

interface BorrowableAsset extends CommodityMarket {
  yourBorrow?: {
    amount: number;
    valueUSD: number;
  };
}

export function TradeFinanceBorrowPage() {
  const { address, isConnected } = useAccount();
  const { projectId } = useTradeFinance();
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [markets, setMarkets] = useState<BorrowableAsset[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marketplaceService = createMarketplaceService(projectId);

  // Fetch borrowable assets and user position
  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, isConnected, address]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all markets (stablecoins are borrowable)
      const marketsData = await marketplaceService.getMarkets({
        sortBy: 'borrowAPY',
        sortOrder: 'asc'
      });

      // Fetch user position if connected
      if (isConnected && address) {
        const position = await marketplaceService.getUserPosition(address);
        setUserPosition(position);

        // Add user's borrow info to markets
        const marketsWithUserData: BorrowableAsset[] = marketsData.map(market => {
          const userDebt = position.debt.find(d => d.assetAddress.toLowerCase() === market.commodityType.toLowerCase());
          return {
            ...market,
            yourBorrow: userDebt ? {
              amount: userDebt.amount,
              valueUSD: userDebt.valueUSD
            } : undefined
          };
        });

        setMarkets(marketsWithUserData);
      } else {
        setMarkets(marketsData);
        setUserPosition(null);
      }
    } catch (err) {
      console.error('Failed to fetch borrow data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load borrow markets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleBorrowClick = (commodityType: string) => {
    setSelectedAsset(commodityType);
    setIsBorrowModalOpen(true);
  };

  const handleBorrowSuccess = () => {
    // Refresh data after successful borrow
    fetchData();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Calculate utilization percentage
  const getUtilization = () => {
    if (!userPosition) return 0;
    if (userPosition.totalCollateralUSD === 0) return 0;
    return (userPosition.totalDebtUSD / userPosition.totalCollateralUSD) * 100;
  };

  // Get health factor color
  const getHealthFactorColor = (hf: number) => {
    if (hf >= 2) return 'text-green-600';
    if (hf >= 1.5) return 'text-yellow-600';
    if (hf >= 1.2) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get health factor status
  const getHealthFactorStatus = (hf: number) => {
    if (hf >= 2) return 'Safe';
    if (hf >= 1.5) return 'Moderate';
    if (hf >= 1.2) return 'At Risk';
    return 'Critical';
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
          <h1 className="text-3xl font-bold">Borrow Assets</h1>
          <p className="text-muted-foreground mt-1">
            Borrow stablecoins against your commodity collateral
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

      {/* Borrow Position Overview - Only show when connected and has collateral */}
      {isConnected && userPosition && userPosition.totalCollateralUSD > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Your Borrow Position
            </CardTitle>
            <CardDescription>
              Overview of your collateral and borrowed assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Collateral</p>
                <p className="text-2xl font-bold">
                  ${userPosition.totalCollateralUSD.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Borrowed</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${userPosition.totalDebtUSD.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Available to Borrow</p>
                <p className="text-2xl font-bold text-green-600">
                  ${userPosition.availableToBorrow.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Health Factor</p>
                <p className={`text-2xl font-bold ${getHealthFactorColor(userPosition.healthFactor)}`}>
                  {userPosition.healthFactor === Infinity ? '∞' : userPosition.healthFactor.toFixed(2)}
                </p>
                <Badge variant={userPosition.healthFactor >= 1.5 ? 'secondary' : 'destructive'}>
                  {getHealthFactorStatus(userPosition.healthFactor)}
                </Badge>
              </div>
            </div>

            {/* Borrow Capacity Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Borrow Capacity</span>
                <span className="font-medium">{getUtilization().toFixed(1)}% Used</span>
              </div>
              <Progress 
                value={Math.min(getUtilization(), 100)} 
                className="h-2"
              />
            </div>

            {/* Collateral Breakdown */}
            {userPosition.collateral.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-semibold">Your Collateral</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {userPosition.collateral.map((col) => {
                    const market = markets.find(m => m.commodityType === col.commodityType);
                    return (
                      <Card key={col.commodityType} className="bg-secondary/20">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">
                              {market?.commodityName || col.commodityType}
                            </span>
                            <Badge variant="outline">{market?.symbol || col.commodityType.toUpperCase()}</Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Amount:</span>
                              <span className="font-medium">{col.amount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Value:</span>
                              <span className="font-medium">${col.valueUSD.toLocaleString()}</span>
                            </div>
                            {market && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">LTV:</span>
                                <span className="font-medium">{market.ltv}%</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Risk Warning */}
            {userPosition.healthFactor < 1.5 && userPosition.healthFactor !== Infinity && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your health factor is below 1.5. Consider adding more collateral or repaying debt to avoid liquidation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Health Factor Monitor - Detailed View */}
      {isConnected && address && userPosition && userPosition.totalCollateralUSD > 0 && (
        <HealthFactorDisplay 
          userAddress={address}
          projectId={projectId}
          className="mt-6"
          showDetails={true}
          autoRefresh={true}
        />
      )}

      {/* Not Connected Alert */}
      {!isConnected && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Connect your wallet to view your position and borrow against your collateral
          </AlertDescription>
        </Alert>
      )}

      {/* No Collateral Alert */}
      {isConnected && userPosition && userPosition.totalCollateralUSD === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You need to supply collateral before you can borrow. Visit the{' '}
            <a href="/trade-finance/supply" className="underline font-medium">Supply page</a>{' '}
            to get started.
          </AlertDescription>
        </Alert>
      )}

      {/* Borrowable Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Available to Borrow
          </CardTitle>
          <CardDescription>
            Select an asset to borrow against your collateral
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Assets</TabsTrigger>
              <TabsTrigger value="your-borrows" disabled={!isConnected || !userPosition}>
                Your Borrows
              </TabsTrigger>
              <TabsTrigger value="lowest-apy">Lowest APY</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {markets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No borrowable assets available
                </div>
              ) : (
                markets.map((market) => (
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
                              <p className="text-muted-foreground">Borrow APY</p>
                              <p className="font-semibold text-orange-600 flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" />
                                {market.borrowAPY.toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Borrowed</p>
                              <p className="font-semibold">${market.totalBorrowUSD.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Available</p>
                              <p className="font-semibold">${market.availableLiquidity.toLocaleString()}</p>
                            </div>
                            {market.yourBorrow && (
                              <div>
                                <p className="text-muted-foreground">Your Borrow</p>
                                <p className="font-semibold">{market.yourBorrow.amount} {market.symbol}</p>
                                <p className="text-xs text-muted-foreground">
                                  ${market.yourBorrow.valueUSD.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleBorrowClick(market.commodityType)}
                            disabled={!isConnected || !userPosition || userPosition.availableToBorrow <= 0}
                            variant="default"
                          >
                            <ArrowDownCircle className="h-4 w-4 mr-2" />
                            Borrow
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="your-borrows" className="space-y-4 mt-4">
              {!userPosition || markets.filter(m => m.yourBorrow).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  You haven't borrowed any assets yet
                </div>
              ) : (
                markets
                  .filter(m => m.yourBorrow)
                  .map((market) => {
                    const monthlyInterest = market.yourBorrow 
                      ? (market.yourBorrow.valueUSD * (market.borrowAPY / 100)) / 12
                      : 0;
                    
                    return (
                      <Card key={market.commodityType} className="hover:border-primary/50 transition-colors">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold">{market.commodityName}</h3>
                                <Badge variant="secondary">{market.symbol}</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Your Borrow</p>
                                  <p className="font-semibold">{market.yourBorrow!.amount} {market.symbol}</p>
                                  <p className="text-xs text-muted-foreground">
                                    ${market.yourBorrow!.valueUSD.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Borrow APY</p>
                                  <p className="font-semibold text-orange-600">{market.borrowAPY.toFixed(2)}%</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Est. Monthly Cost</p>
                                  <p className="font-semibold text-orange-600">
                                    ${monthlyInterest.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                onClick={() => handleBorrowClick(market.commodityType)}
                                disabled={!userPosition || userPosition.availableToBorrow <= 0}
                              >
                                <ArrowDownCircle className="h-4 w-4 mr-2" />
                                Borrow More
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </TabsContent>

            <TabsContent value="lowest-apy" className="space-y-4 mt-4">
              {[...markets]
                .sort((a, b) => a.borrowAPY - b.borrowAPY)
                .slice(0, 3)
                .map((market) => (
                  <Card key={market.commodityType} className="hover:border-primary/50 transition-colors border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{market.commodityName}</h3>
                            <Badge variant="secondary">{market.symbol}</Badge>
                            <Badge className="bg-green-500">Best Rate</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Borrow APY</p>
                              <p className="font-semibold text-orange-600 text-xl">
                                {market.borrowAPY.toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Borrowed</p>
                              <p className="font-semibold">${market.totalBorrowUSD.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Available</p>
                              <p className="font-semibold">${market.availableLiquidity.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleBorrowClick(market.commodityType)}
                            disabled={!isConnected || !userPosition || userPosition.availableToBorrow <= 0}
                          >
                            <ArrowDownCircle className="h-4 w-4 mr-2" />
                            Borrow
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
          <CardTitle>How Borrow Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  1
                </div>
                <h4 className="font-semibold">Supply Collateral</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                First, supply commodity tokens as collateral on the{' '}
                <a href="/trade-finance/supply" className="underline">Supply page</a>
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  2
                </div>
                <h4 className="font-semibold">Borrow Against Collateral</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Borrow up to 80% of your collateral value. Monitor your health factor to avoid liquidation
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  3
                </div>
                <h4 className="font-semibold">Repay or Manage</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Repay anytime to reduce debt and improve health factor. Add collateral if health factor drops
              </p>
            </div>
          </div>

          {/* Risk Information */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">Important Risk Information:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Keep health factor above 1.5 for safety margin</li>
                <li>Health factor below 1.0 triggers liquidation</li>
                <li>Monitor commodity prices and borrow rates</li>
                <li>Add collateral or repay debt if health factor drops</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Borrow Modal */}
      {selectedAsset && userPosition && (
        <BorrowModal
          open={isBorrowModalOpen}
          onClose={() => setIsBorrowModalOpen(false)}
          onSuccess={handleBorrowSuccess}
          userAddress={address}
          projectId={projectId}
          currentHealthFactor={userPosition.healthFactor}
          availableToBorrow={userPosition.availableToBorrow.toString()}
        />
      )}
    </div>
  );
}

export default TradeFinanceBorrowPage;

/**
 * Trade Finance Portfolio Page
 * 
 * User's complete position overview
 * Features:
 * - Supplied assets with APY earned
 * - Borrowed assets with APY paid
 * - Health factor meter with real-time monitoring
 * - Available to borrow calculation
 * - Withdraw/repay quick actions
 * - Position history
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { WalletConnectButton } from '@/components/trade-finance/shared/wallet-connect-button';
import { useTradeFinance } from '@/providers/trade-finance';
import { HealthFactorDisplay } from '@/components/trade-finance/borrow';
import { createMarketplaceService } from '@/services/trade-finance/MarketplaceService';
import type { CommodityMarket, UserPosition } from '@/types/trade-finance/marketplace';

interface HistoryItem {
  id: string;
  type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  commodityType: string;
  amount: number;
  valueUSD: number;
  timestamp: Date;
  txHash?: string;
}

export function TradeFinancePortfolioPage() {
  const { address, isConnected } = useAccount();
  const { projectId } = useTradeFinance();
  const [markets, setMarkets] = useState<CommodityMarket[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marketplaceService = createMarketplaceService(projectId);

  // Fetch portfolio data
  const fetchPortfolioData = async () => {
    if (!address || !projectId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);

      // Fetch markets for APY info
      const marketsData = await marketplaceService.getMarkets();
      setMarkets(marketsData);

      // Fetch user position
      const position = await marketplaceService.getUserPosition(address);
      setUserPosition(position);

      // Fetch activity history
      const activity = await marketplaceService.getRecentActivity(20);
      
      // Filter for user's activity and map to history format
      const userActivity = activity
        .filter(a => {
          const activityAddress = a.walletAddress || a.user;
          return activityAddress?.toLowerCase() === address.toLowerCase();
        })
        .map(a => ({
          id: a.id || `${a.timestamp}-${a.type}`,
          type: a.type as 'supply' | 'withdraw' | 'borrow' | 'repay',
          commodityType: a.commodityType || a.commodity || 'unknown',
          amount: typeof a.amount === 'string' ? parseFloat(a.amount) : (a.amount || 0),
          valueUSD: a.valueUSD || a.amountUSD || 0,
          timestamp: new Date(a.timestamp),
          txHash: a.txHash
        }));

      setHistory(userActivity);
    } catch (err) {
      console.error('Failed to fetch portfolio data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isConnected && address && projectId) {
      fetchPortfolioData();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, address, projectId]);

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return timestamp.toLocaleDateString();
  };

  const getActionIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'supply':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'withdraw':
        return <ArrowDownCircle className="h-4 w-4 text-orange-600" />;
      case 'borrow':
        return <TrendingDown className="h-4 w-4 text-blue-600" />;
      case 'repay':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
    }
  };

  const getActionColor = (type: HistoryItem['type']) => {
    switch (type) {
      case 'supply':
        return 'bg-green-100 text-green-800';
      case 'withdraw':
        return 'bg-orange-100 text-orange-800';
      case 'borrow':
        return 'bg-blue-100 text-blue-800';
      case 'repay':
        return 'bg-purple-100 text-purple-800';
    }
  };

  // Get market info for a commodity type
  const getMarketInfo = (commodityType: string) => {
    return markets.find(m => m.commodityType === commodityType);
  };

  // Calculate net APY
  const calculateNetAPY = () => {
    if (!userPosition || !markets) return 0;

    let earnedAPY = 0;
    let paidAPY = 0;

    // Calculate earned from supply
    userPosition.collateral.forEach(col => {
      const market = markets.find(m => m.commodityType === col.commodityType);
      if (market) {
        earnedAPY += (col.valueUSD * market.supplyAPY) / 100;
      }
    });

    // Calculate paid on borrow
    userPosition.debt.forEach(debt => {
      const market = markets.find(m => m.commodityType === debt.assetAddress);
      if (market) {
        paidAPY += (debt.valueUSD * market.borrowAPY) / 100;
      }
    });

    const totalValue = userPosition.totalCollateralUSD + userPosition.totalDebtUSD;
    return totalValue > 0 ? ((earnedAPY - paidAPY) / totalValue) * 100 : 0;
  };

  // Calculate estimated earnings (30 days)
  const calculateEarnings = () => {
    if (!userPosition || !markets) return { earned: 0, paid: 0 };

    let earned = 0;
    let paid = 0;

    userPosition.collateral.forEach(col => {
      const market = markets.find(m => m.commodityType === col.commodityType);
      if (market) {
        earned += (col.valueUSD * (market.supplyAPY / 100)) / 12; // Monthly
      }
    });

    userPosition.debt.forEach(debt => {
      const market = markets.find(m => m.commodityType === debt.assetAddress);
      if (market) {
        paid += (debt.valueUSD * (market.borrowAPY / 100)) / 12; // Monthly
      }
    });

    return { earned, paid };
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Wallet className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-muted-foreground mb-6">
                  Connect your wallet to view your portfolio and positions
                </p>
                <WalletConnectButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading portfolio...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchPortfolioData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const netAPY = calculateNetAPY();
  const { earned: earned30d, paid: paid30d } = calculateEarnings();
  const borrowingPowerUsed = userPosition && userPosition.totalCollateralUSD > 0
    ? (userPosition.totalDebtUSD / (userPosition.totalCollateralUSD * 0.8)) * 100
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Your Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your supplied and borrowed positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchPortfolioData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <WalletConnectButton />
        </div>
      </div>

      {/* Portfolio Summary */}
      {userPosition && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Supplied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ${userPosition.totalCollateralUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Borrowed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                ${userPosition.totalDebtUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net APY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {netAPY >= 0 ? '+' : ''}{netAPY.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Health Factor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {userPosition.healthFactor === Infinity ? '∞' : userPosition.healthFactor.toFixed(2)}
                </p>
                <Badge variant={userPosition.healthFactor >= 1.5 ? 'secondary' : 'destructive'}>
                  {userPosition.healthFactor >= 1.5 ? 'Healthy' : 'At Risk'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available to Borrow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${userPosition.availableToBorrow.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Borrow Power Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">
                  {borrowingPowerUsed.toFixed(1)}%
                </p>
                <Progress value={Math.min(borrowingPowerUsed, 100)} className="h-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Health Factor Monitor - Detailed View */}
      {address && userPosition && userPosition.totalCollateralUSD > 0 && (
        <HealthFactorDisplay 
          userAddress={address}
          projectId={projectId}
          showDetails={true}
          autoRefresh={true}
        />
      )}

      {/* Warning Alert */}
      {userPosition && userPosition.healthFactor < 1.5 && userPosition.healthFactor !== Infinity && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your health factor is below 1.5. Consider adding more collateral or repaying debt to avoid liquidation.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="supplied" className="space-y-4">
        <TabsList>
          <TabsTrigger value="supplied">
            Supplied ({userPosition?.collateral.length || 0})
          </TabsTrigger>
          <TabsTrigger value="borrowed">
            Borrowed ({userPosition?.debt.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* Supplied Assets */}
        <TabsContent value="supplied" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplied Assets</CardTitle>
              <CardDescription>
                Your commodity collateral earning yield
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!userPosition || userPosition.collateral.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't supplied any assets yet</p>
                  <Button asChild>
                    <Link to="/trade-finance/supply">
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Start Supplying
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userPosition.collateral.map((collateral) => {
                    const market = getMarketInfo(collateral.commodityType);
                    const earned30d = market ? (collateral.valueUSD * (market.supplyAPY / 100)) / 12 : 0;
                    
                    return (
                      <div
                        key={collateral.commodityType}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold">
                              {collateral.commodityType.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{market?.commodityName || collateral.commodityType}</p>
                              <Badge variant="secondary">Collateral</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {collateral.amount} {market?.symbol || collateral.commodityType.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Value</p>
                            <p className="font-semibold">${collateral.valueUSD.toLocaleString()}</p>
                          </div>
                          {market && (
                            <>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">APY</p>
                                <p className="font-semibold text-green-600">{market.supplyAPY.toFixed(2)}%</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Earned (30d)</p>
                                <p className="font-semibold text-green-600">+${earned30d.toFixed(2)}</p>
                              </div>
                            </>
                          )}
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link to={`/trade-finance/withdraw?asset=${collateral.commodityType}`}>
                                Withdraw
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Borrowed Assets */}
        <TabsContent value="borrowed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Borrowed Assets</CardTitle>
              <CardDescription>
                Your active borrow positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!userPosition || userPosition.debt.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't borrowed any assets yet</p>
                  <Button asChild>
                    <Link to="/trade-finance/borrow">
                      <ArrowDownCircle className="mr-2 h-4 w-4" />
                      Start Borrowing
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userPosition.debt.map((debt) => {
                    const market = getMarketInfo(debt.assetAddress);
                    const interest30d = market ? (debt.valueUSD * (market.borrowAPY / 100)) / 12 : 0;
                    
                    return (
                      <div
                        key={debt.assetAddress}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <span className="text-lg font-bold">
                              {debt.assetAddress.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{market?.commodityName || debt.assetAddress}</p>
                            <p className="text-sm text-muted-foreground">
                              {debt.amount} {market?.symbol || debt.assetAddress.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Value</p>
                            <p className="font-semibold">${debt.valueUSD.toLocaleString()}</p>
                          </div>
                          {market && (
                            <>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">APY</p>
                                <p className="font-semibold text-blue-600">{market.borrowAPY.toFixed(2)}%</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Interest (30d)</p>
                                <p className="font-semibold text-red-600">-${interest30d.toFixed(2)}</p>
                              </div>
                            </>
                          )}
                          <div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/trade-finance/repay?asset=${debt.assetAddress}`}>
                                Repay
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Your recent supply, borrow, and repay transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transaction history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const market = getMarketInfo(item.commodityType);
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {getActionIcon(item.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getActionColor(item.type)}`}>
                                {item.type.toUpperCase()}
                              </Badge>
                              <span className="text-sm font-medium">
                                {market?.commodityName || item.commodityType}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.amount} {market?.symbol || item.commodityType.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Value</p>
                            <p className="font-semibold">${item.valueUSD.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Date</p>
                            <p className="text-sm">{formatTimestamp(item.timestamp)}</p>
                          </div>
                          {item.txHash && (
                            <div>
                              <Button variant="ghost" size="sm" asChild>
                                <a 
                                  href={`https://etherscan.io/tx/${item.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TradeFinancePortfolioPage;

/**
 * Derivatives Dashboard Component
 * 
 * Main dashboard for derivatives trading (perpetuals, futures, options)
 * Shows markets, positions, orders, and trading interface
 * 
 * UPDATED: Now uses DerivativesBackendService for API calls
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  AlertTriangle,
  Plus,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { InjectiveNavigation } from '../shared/injective-navigation';
import { DerivativesBackendService } from '@/services/derivatives/DerivativesBackendService';
import type { DerivativeMarket, DerivativePosition } from '@/services/derivatives/types';
import { OrdersTab } from './OrdersTab';
import { HistoryTab } from './HistoryTab';
import { DerivativesStats } from './shared';

interface DerivativesDashboardProps {
  projectId?: string;
}

export const DerivativesDashboard: React.FC<DerivativesDashboardProps> = ({ projectId }) => {
  const params = useParams<{ projectId?: string }>();
  const effectiveProjectId = projectId || params.projectId;
  const { toast } = useToast();

  const [markets, setMarkets] = useState<DerivativeMarket[]>([]);
  const [positions, setPositions] = useState<DerivativePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('markets');
  const [userAddress, setUserAddress] = useState<string>(''); // Get from wallet context

  useEffect(() => {
    // TODO: Get user address from wallet context
    // For now, using localStorage or hardcoded
    const storedAddress = localStorage.getItem('injectiveAddress') || 'inj1...';
    setUserAddress(storedAddress);
  }, []);

  useEffect(() => {
    if (userAddress) {
      loadData();
    }
  }, [effectiveProjectId, userAddress]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load markets from backend API
      const marketsResponse = await DerivativesBackendService.getMarkets({
        projectId: effectiveProjectId,
        blockchain: 'injective',
        network: 'testnet',
        status: 'active'
      });

      if (!marketsResponse.success) {
        throw new Error(marketsResponse.error || 'Failed to load markets');
      }

      setMarkets(marketsResponse.data || []);

      // Load positions from backend API
      const positionsResponse = await DerivativesBackendService.getUserOpenPositions(
        userAddress,
        'injective',
        'testnet'
      );

      if (!positionsResponse.success) {
        throw new Error(positionsResponse.error || 'Failed to load positions');
      }

      setPositions(positionsResponse.data || []);

    } catch (err: any) {
      console.error('Error loading derivatives data:', err);
      const errorMsg = err.message || 'Failed to load derivatives data';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    toast({
      title: 'Refreshing',
      description: 'Loading latest market data...'
    });
    await loadData();
    toast({
      title: 'Success',
      description: 'Data refreshed successfully'
    });
  };

  // Calculate portfolio stats
  const portfolioStats = positions.reduce(
    (acc, pos) => {
      const unrealizedPnl = parseFloat(pos.unrealizedPnl || '0');
      const margin = parseFloat(pos.margin || '0');
      
      return {
        totalMargin: acc.totalMargin + margin,
        totalUnrealizedPnl: acc.totalUnrealizedPnl + unrealizedPnl,
        openPositions: acc.openPositions + 1,
      };
    },
    { totalMargin: 0, totalUnrealizedPnl: 0, openPositions: 0 }
  );

  const portfolioValue = portfolioStats.totalMargin + portfolioStats.totalUnrealizedPnl;
  const returnPercent = portfolioStats.totalMargin > 0
    ? (portfolioStats.totalUnrealizedPnl / portfolioStats.totalMargin) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <InjectiveNavigation projectId={effectiveProjectId} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Derivatives Trading</h1>
          <p className="text-muted-foreground">
            Trade perpetual futures, expiry futures, and options
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Launch Market
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Portfolio Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 text-sm ${returnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {returnPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {returnPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Margin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolioStats.totalMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">Collateral deposited</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unrealized PnL</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolioStats.totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${portfolioStats.totalUnrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">From open positions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioStats.openPositions}</div>
            <div className="text-sm text-muted-foreground">Active trades</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="positions">Positions ({portfolioStats.openPositions})</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Markets</CardTitle>
              <CardDescription>
                Trade perpetual futures, expiry futures, and options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading markets...</span>
                </div>
              ) : markets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No derivative markets available yet
                </div>
              ) : (
                <div className="space-y-2">
                  {markets.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Your active derivative positions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading positions...</span>
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open positions
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map((position) => (
                    <PositionCard 
                      key={position.id} 
                      position={position}
                      onClose={() => loadData()}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <OrdersTab projectId={effectiveProjectId || ''} userAddress={userAddress} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab projectId={effectiveProjectId || ''} userAddress={userAddress} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Market Card Component
interface MarketCardProps {
  market: DerivativeMarket;
}

const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{market.ticker}</span>
          <Badge variant="outline">{market.marketType}</Badge>
          {market.status !== 'active' && (
            <Badge variant="secondary">{market.status}</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {market.baseDenom || market.quoteDenom}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm text-muted-foreground">24h Volume</div>
          <div className="font-semibold">
            ${parseFloat(market.totalVolume || '0').toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Open Interest</div>
          <div className="font-semibold">
            ${parseFloat(market.openInterest || '0').toLocaleString()}
          </div>
        </div>
        <Button size="sm">Trade</Button>
      </div>
    </div>
  );
};

// Position Card Component
interface PositionCardProps {
  position: DerivativePosition;
  onClose?: () => void;
}

const PositionCard: React.FC<PositionCardProps> = ({ position, onClose }) => {
  const { toast } = useToast();
  const [isClosing, setIsClosing] = useState(false);

  const pnl = parseFloat(position.unrealizedPnl || '0');
  const pnlPercent = parseFloat(position.margin) > 0
    ? (pnl / parseFloat(position.margin)) * 100
    : 0;

  const handleClosePosition = async () => {
    try {
      setIsClosing(true);
      
      // Get private key from localStorage (or secure storage)
      const privateKey = localStorage.getItem('injectivePrivateKey');
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const result = await DerivativesBackendService.closePosition({
        positionId: position.id,
        userAddress: position.userAddress,
        marketId: position.marketId,
        isLong: position.isLong,
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        blockchain: position.blockchain,
        network: position.network,
        subaccountId: position.subaccountId,
        privateKey
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to close position');
      }

      toast({
        title: 'Position Closed',
        description: `PnL: $${result.data?.realizedPnl || '0'}`,
        variant: 'default'
      });

      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to close position',
        variant: 'destructive'
      });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{position.marketId}</span>
          <Badge variant={position.isLong ? 'default' : 'destructive'}>
            {position.isLong ? 'Long' : 'Short'}
          </Badge>
          {position.leverage && (
            <Badge variant="outline">{position.leverage}x</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Entry: ${parseFloat(position.entryPrice).toFixed(2)} | 
          Current: ${parseFloat(position.currentPrice || position.entryPrice).toFixed(2)}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Size</div>
          <div className="font-semibold">{position.quantity}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Unrealized PnL</div>
          <div className={`font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleClosePosition}
          disabled={isClosing}
        >
          {isClosing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Closing...
            </>
          ) : (
            'Close'
          )}
        </Button>
      </div>
    </div>
  );
};

export default DerivativesDashboard;

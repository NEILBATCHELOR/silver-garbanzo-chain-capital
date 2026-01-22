import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { DerivativesBackendService } from '@/services/derivatives/DerivativesBackendService';

interface HistoryTabProps {
  projectId: string;
  userAddress: string;
}

interface Trade {
  tradeId: string;
  marketId: string;
  ticker: string;
  side: 'buy' | 'sell';
  quantity: string;
  price: string;
  fee: string;
  pnl?: string;
  timestamp: string;
  txHash: string;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  projectId,
  userAddress,
}) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterMarket, setFilterMarket] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadTradeHistory();
  }, [userAddress, filterSide, filterMarket]);

  const loadTradeHistory = async () => {
    if (!userAddress) return;

    setLoading(true);
    try {
      const response = await DerivativesBackendService.getTradeHistory({
        userAddress,
        side: filterSide === 'all' ? undefined : filterSide as any,
        marketId: filterMarket === 'all' ? undefined : filterMarket,
      });

      if (response.success && response.data) {
        setTrades(response.data);
      } else {
        console.error('Error loading trade history:', response.error);
        setTrades([]);
      }
    } catch (error) {
      toast({
        title: 'Error Loading Trade History',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueMarkets = () => {
    const markets = new Set(trades.map((trade) => trade.ticker));
    return Array.from(markets);
  };

  const filteredTrades = trades.filter((trade) => {
    if (filterSide !== 'all' && trade.side !== filterSide) return false;
    if (filterMarket !== 'all' && trade.ticker !== filterMarket) return false;
    return true;
  });

  const totalPnL = filteredTrades.reduce((sum, trade) => {
    return sum + (trade.pnl ? Number(trade.pnl) : 0);
  }, 0);

  const totalFees = filteredTrades.reduce((sum, trade) => {
    return sum + Number(trade.fee);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>
              View your past trades and performance
            </CardDescription>
          </div>
          <Button
            onClick={loadTradeHistory}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-4 grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTrades.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total PnL</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalPnL.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalFees.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="filter-market">Market</Label>
            <Select value={filterMarket} onValueChange={setFilterMarket}>
              <SelectTrigger id="filter-market">
                <SelectValue placeholder="All Markets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {getUniqueMarkets().map((market) => (
                  <SelectItem key={market} value={market}>
                    {market}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filter-side">Side</Label>
            <Select value={filterSide} onValueChange={setFilterSide}>
              <SelectTrigger id="filter-side">
                <SelectValue placeholder="All Sides" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sides</SelectItem>
                <SelectItem value="buy">Long</SelectItem>
                <SelectItem value="sell">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Trades Table */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No trade history found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">PnL</TableHead>
                <TableHead className="text-right">Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => (
                <TableRow key={trade.tradeId}>
                  <TableCell className="text-sm">
                    {new Date(trade.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{trade.ticker}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {trade.side === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                        {trade.side === 'buy' ? 'Long' : 'Short'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{trade.quantity}</TableCell>
                  <TableCell className="text-right">${Number(trade.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${Number(trade.fee).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {trade.pnl ? (
                      <span className={Number(trade.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${Number(trade.pnl).toFixed(2)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Open block explorer
                        window.open(`https://explorer.injective.network/transaction/${trade.txHash}`, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

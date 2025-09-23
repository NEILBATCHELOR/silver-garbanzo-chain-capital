/**
 * Injective Trading Interface
 * Comprehensive DEX trading UI for Injective Protocol
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Activity,
  DollarSign,
  BarChart3,
  LineChart,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Settings,
  Plus,
  Minus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { InjectiveWalletService } from '@/services/wallet/injective';

interface InjectiveTradingInterfaceProps {
  wallet: any;
}

interface Market {
  marketId: string;
  ticker: string;
  type: string;
  baseDenom: string;
  quoteDenom: string;
  makerFeeRate: string;
  takerFeeRate: string;
  serviceProviderFee: string;
  minPriceTickSize: string;
  minQuantityTickSize: string;
}

interface OrderBook {
  buys: OrderBookEntry[];
  sells: OrderBookEntry[];
}

interface OrderBookEntry {
  price: string;
  quantity: string;
  total: string;
  timestamp: number;
}

interface Position {
  marketId: string;
  subaccountId: string;
  direction: 'long' | 'short';
  quantity: string;
  entryPrice: string;
  margin: string;
  liquidationPrice: string;
  markPrice: string;
  unrealizedPnl: string;
}

interface Order {
  orderHash: string;
  marketId: string;
  subaccountId: string;
  price: string;
  quantity: string;
  unfilledQuantity: string;
  orderType: string;
  side: 'buy' | 'sell';
  state: string;
  createdAt: number;
}

export const InjectiveTradingInterface: React.FC<InjectiveTradingInterfaceProps> = ({ wallet }) => {
  const [loading, setLoading] = useState(false);
  const [injectiveService] = useState(() => new InjectiveWalletService());
  
  // Market state
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [orderBook, setOrderBook] = useState<OrderBook>({ buys: [], sells: [] });
  const [marketPrice, setMarketPrice] = useState<string>('0');
  const [priceChange24h, setPriceChange24h] = useState<string>('0');
  
  // Trading state
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [reduceOnly, setReduceOnly] = useState(false);
  const [postOnly, setPostOnly] = useState(false);
  
  // Portfolio state  
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  
  // Load initial data
  useEffect(() => {
    if (wallet?.address) {
      loadMarkets();
      loadAccountData();
    }
  }, [wallet]);
  
  useEffect(() => {
    if (selectedMarket) {
      loadOrderBook();
      startMarketDataStream();
    }
    
    return () => {
      // Clean up market data stream
      stopMarketDataStream();
    };
  }, [selectedMarket]);
  
  const loadMarkets = async () => {
    try {
      // Load spot and derivative markets
      const spotMarkets = await injectiveService.getSpotMarkets();
      const derivativeMarkets = await injectiveService.getDerivativeMarkets();
      
      const allMarkets = [
        ...spotMarkets.map(m => ({ ...m, type: 'spot' })),
        ...derivativeMarkets.map(m => ({ ...m, type: 'perpetual' }))
      ];
      
      setMarkets(allMarkets);
      
      if (allMarkets.length > 0 && !selectedMarket) {
        setSelectedMarket(allMarkets[0].marketId);
      }
    } catch (error) {
      console.error('Failed to load markets:', error);
      toast.error('Failed to load markets');
    }
  };
  
  const loadAccountData = async () => {
    if (!wallet?.address) return;
    
    try {
      // Load balances
      const accountBalances = await injectiveService.getBalances(wallet.address);
      
      // Transform array to object format expected by UI
      const balancesObj: Record<string, string> = {};
      if (Array.isArray(accountBalances)) {
        accountBalances.forEach((balance: any) => {
          if (balance.denom && balance.availableBalance) {
            // Convert denom to more readable format
            const tokenSymbol = balance.denom === 'inj' ? 'INJ' : 
                              balance.denom.includes('usdt') ? 'USDT' :
                              balance.denom.includes('usdc') ? 'USDC' :
                              balance.denom.toUpperCase();
            balancesObj[tokenSymbol] = balance.availableBalance;
          }
        });
      }
      
      // Ensure we have at least default tokens with 0 balance
      if (!balancesObj.INJ) balancesObj.INJ = '0';
      if (!balancesObj.USDT) balancesObj.USDT = '0';
      if (!balancesObj.USDC) balancesObj.USDC = '0';
      
      setBalances(balancesObj);
      
      // Load positions
      const accountPositions = await injectiveService.getPositions(wallet.address);
      setPositions(Array.isArray(accountPositions) ? accountPositions : []);
      
      // Load open orders
      const accountOrders = await injectiveService.getOrders(wallet.address);
      setOrders(accountOrders.filter(o => o.state === 'booked'));
      
      // Load trade history
      const trades = await injectiveService.getTradeHistory(wallet.address);
      setTradeHistory(trades.slice(0, 20));
    } catch (error) {
      console.error('Failed to load account data:', error);
    }
  };
  
  const loadOrderBook = async () => {
    if (!selectedMarket) return;
    
    try {
      const book = await injectiveService.getOrderbook(selectedMarket);
      setOrderBook(book);
      
      // Set market price from orderbook
      if (book.sells.length > 0) {
        setMarketPrice(book.sells[0].price);
      } else if (book.buys.length > 0) {
        setMarketPrice(book.buys[0].price);
      }
    } catch (error) {
      console.error('Failed to load orderbook:', error);
    }
  };
  
  const startMarketDataStream = () => {
    // In production, this would start a WebSocket stream
    // For now, we'll poll every 2 seconds
    const interval = setInterval(() => {
      loadOrderBook();
    }, 2000);
    
    // Store interval ID for cleanup
    (window as any).marketDataInterval = interval;
  };
  
  const stopMarketDataStream = () => {
    if ((window as any).marketDataInterval) {
      clearInterval((window as any).marketDataInterval);
      delete (window as any).marketDataInterval;
    }
  };
  
  const handlePlaceOrder = async () => {
    if (!selectedMarket || !orderQuantity) {
      toast.error('Please fill in all order details');
      return;
    }
    
    if (orderType === 'limit' && !orderPrice) {
      toast.error('Please enter a limit price');
      return;
    }
    
    try {
      setLoading(true);
      
      const order = {
        marketId: selectedMarket,
        orderType: orderType,
        price: orderType === 'market' ? '0' : orderPrice,
        quantity: orderQuantity,
        side: orderSide, // Add required side property
        leverage: leverage,
        isReduceOnly: reduceOnly,
        isPostOnly: postOnly
      };
      
      // Create account info for the service
      const accountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey,
        keyId: wallet.keyId
      };
      
      const result = await injectiveService.placeOrder(
        accountInfo,
        order
      );
      
      toast.success(`${orderSide === 'buy' ? 'Buy' : 'Sell'} order placed successfully`);
      
      // Reset form
      setOrderPrice('');
      setOrderQuantity('');
      
      // Refresh data
      await loadAccountData();
      await loadOrderBook();
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error('Failed to place order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelOrder = async (orderHash: string, marketId: string) => {
    try {
      setLoading(true);
      
      // Create account info for the service
      const accountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey,
        keyId: wallet.keyId
      };
      
      await injectiveService.cancelOrder(wallet.address, marketId, orderHash, accountInfo);
      
      toast.success('Order cancelled');
      await loadAccountData();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClosePosition = async (position: Position) => {
    try {
      setLoading(true);
      
      // Place a reduce-only market order to close the position
      const order = {
        marketId: position.marketId,
        orderType: 'market' as const,
        price: '0',
        quantity: position.quantity,
        side: position.direction === 'long' ? 'sell' as const : 'buy' as const, // Add required side property
        leverage: '1',
        isReduceOnly: true,
        isPostOnly: false
      };
      
      // Create account info for the service
      const accountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey,
        keyId: wallet.keyId
      };
      
      await injectiveService.placeOrder(accountInfo, order);
      
      toast.success('Position closed');
      await loadAccountData();
    } catch (error) {
      console.error('Failed to close position:', error);
      toast.error('Failed to close position');
    } finally {
      setLoading(false);
    }
  };
  
  const formatPrice = (price: string): string => {
    return parseFloat(price).toFixed(2);
  };
  
  const formatQuantity = (quantity: string): string => {
    return parseFloat(quantity).toFixed(4);
  };
  
  const calculateTotal = (): string => {
    if (!orderPrice || !orderQuantity) return '0';
    return (parseFloat(orderPrice) * parseFloat(orderQuantity)).toFixed(2);
  };
  
  return (
    <div className="space-y-6">
      {/* Market Selector and Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Injective DEX Trading
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((market) => (
                    <SelectItem key={market.marketId} value={market.marketId}>
                      <div className="flex items-center gap-2">
                        <span>{market.ticker}</span>
                        <Badge variant="outline" className="text-xs">
                          {market.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  loadOrderBook();
                  loadAccountData();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Price</p>
              <p className="text-2xl font-bold">${formatPrice(marketPrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">24h Change</p>
              <p className={`text-2xl font-bold ${parseFloat(priceChange24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {parseFloat(priceChange24h) >= 0 ? '+' : ''}{priceChange24h}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">24h Volume</p>
              <p className="text-2xl font-bold">$1.2M</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Open Interest</p>
              <p className="text-2xl font-bold">$850K</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Trading Interface */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Book */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Order Book</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {/* Sell Orders */}
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {orderBook.sells.slice(0, 10).reverse().map((order, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 gap-2 px-4 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                    onClick={() => setOrderPrice(order.price)}
                  >
                    <span className="text-red-500">{formatPrice(order.price)}</span>
                    <span className="text-right">{formatQuantity(order.quantity)}</span>
                    <span className="text-right text-muted-foreground">{formatPrice(order.total)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              {/* Current Price */}
              <div className="px-4 py-2 bg-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Market Price</span>
                  <span className="text-sm font-bold">${formatPrice(marketPrice)}</span>
                </div>
              </div>
              
              <Separator />
              
              {/* Buy Orders */}
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {orderBook.buys.slice(0, 10).map((order, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 gap-2 px-4 py-1 text-xs hover:bg-green-50 dark:hover:bg-green-950/20 cursor-pointer"
                    onClick={() => setOrderPrice(order.price)}
                  >
                    <span className="text-green-500">{formatPrice(order.price)}</span>
                    <span className="text-right">{formatQuantity(order.quantity)}</span>
                    <span className="text-right text-muted-foreground">{formatPrice(order.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Trading Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buy/Sell Toggle */}
            <div className="flex gap-2">
              <Button
                variant={orderSide === 'buy' ? 'default' : 'outline'}
                className={orderSide === 'buy' ? 'bg-green-500 hover:bg-green-600' : ''}
                onClick={() => setOrderSide('buy')}
                disabled={loading}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Buy / Long
              </Button>
              <Button
                variant={orderSide === 'sell' ? 'default' : 'outline'}
                className={orderSide === 'sell' ? 'bg-red-500 hover:bg-red-600' : ''}
                onClick={() => setOrderSide('sell')}
                disabled={loading}
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                Sell / Short
              </Button>
            </div>
            
            {/* Order Type */}
            <div className="space-y-2">
              <Label>Order Type</Label>
              <RadioGroup value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="limit" id="limit" />
                  <Label htmlFor="limit">Limit Order</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="market" id="market" />
                  <Label htmlFor="market">Market Order</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Price Input (for limit orders) */}
            {orderType === 'limit' && (
              <div className="space-y-2">
                <Label>Price</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrderPrice(marketPrice)}
                  >
                    Market
                  </Button>
                </div>
              </div>
            )}
            
            {/* Quantity Input */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  disabled={loading}
                />
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setOrderQuantity((parseFloat(balances.USDT || '0') * 0.25 / parseFloat(marketPrice || '1')).toString())}>
                    25%
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setOrderQuantity((parseFloat(balances.USDT || '0') * 0.50 / parseFloat(marketPrice || '1')).toString())}>
                    50%
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setOrderQuantity((parseFloat(balances.USDT || '0') * 0.75 / parseFloat(marketPrice || '1')).toString())}>
                    75%
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setOrderQuantity((parseFloat(balances.USDT || '0') / parseFloat(marketPrice || '1')).toString())}>
                    Max
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Leverage (for perpetuals) */}
            {markets.find(m => m.marketId === selectedMarket)?.type === 'perpetual' && (
              <div className="space-y-2">
                <Label>Leverage: {leverage}x</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLeverage(Math.max(1, parseInt(leverage) - 1).toString())}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Progress value={parseInt(leverage) * 5} className="flex-1" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLeverage(Math.min(20, parseInt(leverage) + 1).toString())}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Advanced Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reduce-only">Reduce Only</Label>
                <Switch
                  id="reduce-only"
                  checked={reduceOnly}
                  onCheckedChange={setReduceOnly}
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="post-only">Post Only</Label>
                <Switch
                  id="post-only"
                  checked={postOnly}
                  onCheckedChange={setPostOnly}
                  disabled={loading || orderType === 'market'}
                />
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">${calculateTotal()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (0.075%)</span>
                <span>${(parseFloat(calculateTotal()) * 0.00075).toFixed(2)}</span>
              </div>
            </div>
            
            {/* Place Order Button */}
            <Button
              onClick={handlePlaceOrder}
              disabled={loading || !orderQuantity || (orderType === 'limit' && !orderPrice)}
              className={`w-full ${orderSide === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {orderSide === 'buy' ? <TrendingUp className="mr-2 h-4 w-4" /> : <TrendingDown className="mr-2 h-4 w-4" />}
                  Place {orderSide === 'buy' ? 'Buy' : 'Sell'} Order
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Portfolio Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="orders">Open Orders</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>
        
        {/* Positions */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>
                Your active perpetual positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No open positions
                </p>
              ) : (
                <div className="space-y-3">
                  {positions.map((position) => (
                    <div key={position.marketId} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {markets.find(m => m.marketId === position.marketId)?.ticker}
                          </p>
                          <Badge variant={position.direction === 'long' ? 'success' : 'destructive'}>
                            {position.direction.toUpperCase()}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClosePosition(position)}
                          disabled={loading}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Close
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>{' '}
                          {formatQuantity(position.quantity)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Entry:</span>{' '}
                          ${formatPrice(position.entryPrice)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Mark:</span>{' '}
                          ${formatPrice(position.markPrice)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Liq Price:</span>{' '}
                          ${formatPrice(position.liquidationPrice)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Unrealized PnL</span>
                        <span className={`font-medium ${parseFloat(position.unrealizedPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {parseFloat(position.unrealizedPnl) >= 0 ? '+' : ''}{formatPrice(position.unrealizedPnl)} USDT
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Open Orders */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Orders</CardTitle>
              <CardDescription>
                Your pending limit orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No open orders
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.orderHash} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {markets.find(m => m.marketId === order.marketId)?.ticker}
                          </p>
                          <Badge variant={order.side === 'buy' ? 'success' : 'destructive'}>
                            {order.side.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {order.orderType}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(order.orderHash, order.marketId)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Price:</span>{' '}
                          ${formatPrice(order.price)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>{' '}
                          {formatQuantity(order.quantity)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Filled:</span>{' '}
                          {formatQuantity((parseFloat(order.quantity) - parseFloat(order.unfilledQuantity)).toString())}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Trade History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>
                Your recent trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tradeHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No trade history
                </p>
              ) : (
                <div className="space-y-2">
                  {tradeHistory.map((trade, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="font-medium text-sm">
                          {trade.ticker}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trade.executedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          <span className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                            {trade.side.toUpperCase()}
                          </span>{' '}
                          {formatQuantity(trade.quantity)} @ ${formatPrice(trade.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fee: ${formatPrice(trade.fee)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Balances */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
              <CardDescription>
                Your available trading balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(balances).map(([token, balance]) => (
                  <div key={token} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{token}</p>
                        <p className="text-sm text-muted-foreground">
                          {token === 'INJ' ? 'Injective' : 'USD Tether'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatQuantity(balance)}</p>
                      <p className="text-sm text-muted-foreground">
                        ${formatPrice((parseFloat(balance) * (token === 'INJ' ? 15 : 1)).toString())}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InjectiveTradingInterface;

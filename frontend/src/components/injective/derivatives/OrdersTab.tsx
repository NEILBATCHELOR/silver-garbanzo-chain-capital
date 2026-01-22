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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { X, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { DerivativesBackendService } from '@/services/derivatives/DerivativesBackendService';

interface OrdersTabProps {
  projectId: string;
  userAddress: string;
}

interface Order {
  orderId: string;
  marketId: string;
  ticker: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  quantity: string;
  price?: string;
  filledQuantity: string;
  status: 'pending' | 'partial' | 'filled' | 'cancelled';
  createdAt: string;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  projectId,
  userAddress,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [userAddress, filterStatus, filterSide]);

  const loadOrders = async () => {
    if (!userAddress) return;

    setLoading(true);
    try {
      const response = await DerivativesBackendService.getOrders({
        userAddress,
        status: filterStatus === 'all' ? undefined : filterStatus as any,
        side: filterSide === 'all' ? undefined : filterSide as any,
      });
      
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        console.error('Error loading orders:', response.error);
        setOrders([]);
      }
    } catch (error) {
      toast({
        title: 'Error Loading Orders',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await DerivativesBackendService.cancelOrder({
        orderId,
        userAddress,
        marketId: orders.find(o => o.orderId === orderId)?.marketId || '',
        privateKey: '', // TODO: Get from wallet
      });

      if (response.success) {
        toast({
          title: 'Order Cancelled',
          description: `Order ${orderId} has been cancelled successfully`,
        });
        loadOrders();
      } else {
        toast({
          title: 'Error Cancelling Order',
          description: response.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error Cancelling Order',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const variants = {
      pending: 'default',
      partial: 'outline',
      filled: 'default',
      cancelled: 'destructive',
    } as const;

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      filled: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (filterSide !== 'all' && order.side !== filterSide) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Open Orders</CardTitle>
            <CardDescription>
              Manage your active and pending orders
            </CardDescription>
          </div>
          <Button
            onClick={loadOrders}
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
        {/* Filters */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="filter-status">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partially Filled</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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

        {/* Orders Table */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Filled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">{order.ticker}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {order.side === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={order.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                        {order.side === 'buy' ? 'Long' : 'Short'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {order.orderType === 'limit' ? 'Limit' : 'Market'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{order.quantity}</TableCell>
                  <TableCell className="text-right">
                    {order.price ? `$${Number(order.price).toFixed(2)}` : 'Market'}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.filledQuantity} ({((Number(order.filledQuantity) / Number(order.quantity)) * 100).toFixed(0)}%)
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.status !== 'filled' && order.status !== 'cancelled' && (
                      <Button
                        onClick={() => handleCancelOrder(order.orderId)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
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

import React, { useState, useEffect, useMemo } from 'react'
import { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Loader2, 
  FileText, 
  X, 
  RefreshCw, 
  Info,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { XRPLDEXService } from '@/services/wallet/ripple/defi/XRPLDEXService'
import { XRPLDEXDatabaseService } from '@/services/wallet/ripple/defi/XRPLDEXDatabaseService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { DEXOrder, OrderStatus } from '@/services/wallet/ripple/defi/dex-types'

interface DEXOrderManagementProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  onOrderCancelled?: () => void
}

export function DEXOrderManagement({
  wallet,
  network,
  projectId,
  onOrderCancelled
}: DEXOrderManagementProps) {
  const { toast } = useToast()

  const [orders, setOrders] = useState<DEXOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  const databaseService = useMemo(
    () => new XRPLDEXDatabaseService(),
    []
  )

  useEffect(() => {
    loadOrders()
  }, [wallet.address, projectId, statusFilter])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      // Get orders from database with optional status filter
      const dbOrders = await databaseService.getOrdersByAccount(
        projectId,
        wallet.address,
        statusFilter === 'all' ? undefined : statusFilter
      )

      setOrders(dbOrders)

    } catch (error) {
      console.error('Failed to load orders:', error)
      toast({
        title: 'Load Failed',
        description: 'Failed to load orders',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOrder = async (order: DEXOrder) => {
    if (order.status !== 'active') {
      toast({
        title: 'Cannot Cancel',
        description: 'Only active orders can be cancelled',
        variant: 'destructive'
      })
      return
    }

    setIsCancelling(order.id)

    try {
      // Get XRPL client and create service
      const client = await xrplClientManager.getClient(network)
      const dexService = new XRPLDEXService(client)

      // Cancel on blockchain
      const result = await dexService.cancelOffer(
        wallet,
        order.orderSequence
      )

      // Update database
      await databaseService.updateOrderStatus(
        order.id,
        'cancelled',
        result.transactionHash
      )

      toast({
        title: 'Order Cancelled',
        description: `Successfully cancelled ${order.orderType} order`
      })

      // Reload orders
      await loadOrders()
      onOrderCancelled?.()

    } catch (error) {
      console.error('Failed to cancel order:', error)
      toast({
        title: 'Cancellation Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel order',
        variant: 'destructive'
      })
    } finally {
      setIsCancelling(null)
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />
      case 'filled':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'expired':
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: OrderStatus): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'active':
        return 'default'
      case 'filled':
        return 'secondary'
      case 'cancelled':
      case 'expired':
        return 'destructive'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const activeOrdersCount = orders.filter(o => o.status === 'active').length

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Management
              </CardTitle>
              <CardDescription>
                Manage your active and historical orders
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={loadOrders}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Orders:</span>
              <span className="ml-2 font-semibold">{orders.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Active Orders:</span>
              <span className="ml-2 font-semibold text-green-600">{activeOrdersCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          {orders.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {statusFilter === 'all' 
                  ? 'No orders found. Create your first order using the Order Placement form.'
                  : `No ${statusFilter} orders found.`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Badge 
                          variant={order.orderType === 'buy' ? 'default' : 'destructive'}
                          className={order.orderType === 'buy' ? 'bg-green-600' : 'bg-red-600'}
                        >
                          {order.orderType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.baseCurrency}/{order.quoteCurrency}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(order.price).toFixed(6)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(order.takerGetsAmount).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(order.takerPaysAmount).toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusVariant(order.status)}
                          className="flex items-center gap-1 w-fit"
                        >
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelOrder(order)}
                            disabled={isCancelling === order.id}
                          >
                            {isCancelling === order.id ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Cancelling
                              </>
                            ) : (
                              <>
                                <X className="mr-1 h-3 w-3" />
                                Cancel
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1 text-xs">
            <p><strong>Order Management Tips:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><strong>Active:</strong> Order is on the order book waiting to be filled</li>
              <li><strong>Filled:</strong> Order has been completely executed</li>
              <li><strong>Cancelled:</strong> Order was manually cancelled by you</li>
              <li><strong>Expired:</strong> Order expired before being filled</li>
              <li>You can only cancel active orders</li>
              <li>Partially filled orders will show remaining amount</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default DEXOrderManagement

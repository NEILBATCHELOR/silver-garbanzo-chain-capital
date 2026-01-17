import React, { useState, useEffect } from 'react'
import { Client, Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShoppingCart, DollarSign, Info, Calendar } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { XRPLDEXService } from '@/services/wallet/ripple/defi/XRPLDEXService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { OrderType } from '@/services/wallet/ripple/defi/dex-types'

interface DEXOrderPlacementProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  baseCurrency?: string
  baseIssuer?: string
  quoteCurrency?: string
  quoteIssuer?: string
  onSuccess?: () => void
}

export function DEXOrderPlacement({
  wallet,
  network,
  projectId,
  baseCurrency = 'XRP',
  baseIssuer,
  quoteCurrency = 'USD',
  quoteIssuer,
  onSuccess
}: DEXOrderPlacementProps) {
  const { toast } = useToast()
  
  // Order parameters
  const [orderType, setOrderType] = useState<OrderType>('buy')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [expiration, setExpiration] = useState('') // hours
  
  const [isPlacing, setIsPlacing] = useState(false)
  const [client, setClient] = useState<Client | null>(null)
  const [dexService, setDexService] = useState<XRPLDEXService | null>(null)

  // Initialize XRPL client
  useEffect(() => {
    const initClient = async () => {
      const xrplClient = await xrplClientManager.getClient(network)
      setClient(xrplClient)
      setDexService(new XRPLDEXService(xrplClient))
    }
    initClient()
  }, [network])

  // Calculate total cost/proceeds
  const total = React.useMemo(() => {
    if (!price || !amount) return '0'
    return (parseFloat(price) * parseFloat(amount)).toFixed(6)
  }, [price, amount])

  const handlePlaceOrder = async () => {
    if (!dexService) {
      toast({
        title: 'Not Ready',
        description: 'DEX service is initializing...',
        variant: 'destructive'
      })
      return
    }

    if (!price || !amount) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both price and amount',
        variant: 'destructive'
      })
      return
    }

    if (parseFloat(price) <= 0 || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Values',
        description: 'Price and amount must be greater than 0',
        variant: 'destructive'
      })
      return
    }

    setIsPlacing(true)

    try {
      // Calculate expiration timestamp if provided
      const expirationTimestamp = expiration 
        ? Math.floor(Date.now() / 1000) + (parseFloat(expiration) * 3600)
        : undefined

      // For buy orders: We pay quote currency, get base currency
      // For sell orders: We pay base currency, get quote currency
      // IMPORTANT: For issued currencies, issuer is REQUIRED (not optional)
      
      let takerGets: string | { currency: string; issuer: string; value: string }
      let takerPays: string | { currency: string; issuer: string; value: string }

      if (orderType === 'buy') {
        // Buying base with quote
        if (baseCurrency === 'XRP') {
          takerGets = String(parseFloat(amount) * 1_000_000) // Convert to drops
        } else {
          if (!baseIssuer) {
            throw new Error(`Issuer required for ${baseCurrency}`)
          }
          takerGets = { 
            value: amount, 
            currency: baseCurrency, 
            issuer: baseIssuer 
          }
        }
        
        if (quoteCurrency === 'XRP') {
          takerPays = String(parseFloat(total) * 1_000_000) // Convert to drops
        } else {
          if (!quoteIssuer) {
            throw new Error(`Issuer required for ${quoteCurrency}`)
          }
          takerPays = { 
            value: total, 
            currency: quoteCurrency, 
            issuer: quoteIssuer 
          }
        }
      } else {
        // Selling base for quote
        if (quoteCurrency === 'XRP') {
          takerGets = String(parseFloat(total) * 1_000_000) // Convert to drops
        } else {
          if (!quoteIssuer) {
            throw new Error(`Issuer required for ${quoteCurrency}`)
          }
          takerGets = { 
            value: total, 
            currency: quoteCurrency, 
            issuer: quoteIssuer 
          }
        }
        
        if (baseCurrency === 'XRP') {
          takerPays = String(parseFloat(amount) * 1_000_000) // Convert to drops
        } else {
          if (!baseIssuer) {
            throw new Error(`Issuer required for ${baseCurrency}`)
          }
          takerPays = { 
            value: amount, 
            currency: baseCurrency, 
            issuer: baseIssuer 
          }
        }
      }

      // Create offer - service expects (wallet, params)
      const result = await dexService.createOffer(wallet, {
        takerGets,
        takerPays,
        expiration: expirationTimestamp
      })

      toast({
        title: 'Order Placed',
        description: `Successfully placed ${orderType} order. Sequence: ${result.orderSequence}`
      })

      // Reset form
      setPrice('')
      setAmount('')
      setExpiration('')
      
      onSuccess?.()

    } catch (error) {
      console.error('Failed to place order:', error)
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Failed to place order',
        variant: 'destructive'
      })
    } finally {
      setIsPlacing(false)
    }
  }

  if (!client || !dexService) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Place Limit Order
        </CardTitle>
        <CardDescription>
          Create a {orderType} order for {baseCurrency}/{quoteCurrency}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Order Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={orderType === 'buy' ? 'default' : 'outline'}
            onClick={() => setOrderType('buy')}
            className="w-full"
          >
            Buy {baseCurrency}
          </Button>
          <Button
            variant={orderType === 'sell' ? 'default' : 'outline'}
            onClick={() => setOrderType('sell')}
            className="w-full"
          >
            Sell {baseCurrency}
          </Button>
        </div>

        {/* Price Input */}
        <div className="space-y-2">
          <Label htmlFor="price" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price ({quoteCurrency} per {baseCurrency})
          </Label>
          <Input
            id="price"
            type="number"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            step="0.000001"
            min="0"
          />
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount ({baseCurrency})
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.000001"
            min="0"
          />
        </div>

        {/* Expiration (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="expiration" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Expiration (hours, optional)
          </Label>
          <Input
            id="expiration"
            type="number"
            placeholder="Leave empty for no expiration"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            min="1"
            step="1"
          />
          <p className="text-xs text-muted-foreground">
            Order will expire after this many hours. Leave empty for no expiration.
          </p>
        </div>

        {/* Order Summary */}
        {price && amount && (
          <div className={`p-4 rounded-lg border ${
            orderType === 'buy' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Order Type:</span>
                <Badge variant={orderType === 'buy' ? 'default' : 'destructive'}>
                  {orderType.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-mono">{parseFloat(price).toFixed(6)} {quoteCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-mono">{parseFloat(amount).toFixed(6)} {baseCurrency}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total {orderType === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                <span className="font-mono">{total} {quoteCurrency}</span>
              </div>
              {expiration && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Expires in:</span>
                  <span>{expiration} hour(s)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-xs">
              <p><strong>Limit Order:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Order stays on order book until filled or cancelled</li>
                <li>Will only execute at your specified price or better</li>
                <li>May be partially filled over time</li>
                <li>No fees for placing orders (fees charged on execution)</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handlePlaceOrder}
          disabled={isPlacing || !price || !amount}
          className={`w-full ${
            orderType === 'buy' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isPlacing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {orderType === 'buy' ? 'Buy' : 'Sell'} {baseCurrency}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default DEXOrderPlacement

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Gavel, Info, TrendingDown, Clock } from 'lucide-react'
import { AMMAuctionSlotProps } from './types'
import { XRPLAMMService } from '@/services/wallet/ripple/defi'
import { Client, Wallet } from 'xrpl'

const NETWORK_URLS = {
  MAINNET: 'wss://xrplcluster.com',
  TESTNET: 'wss://s.altnet.rippletest.net:51233',
  DEVNET: 'wss://s.devnet.rippletest.net:51233'
}

interface AuctionSlotInfo {
  account?: string
  price?: string
  expiration?: number
  discountPercent?: number
}

export function AMMAuctionSlotManager({ 
  pool, 
  wallet,
  network,
  projectId,
  onSuccess 
}: AMMAuctionSlotProps) {
  const [bidMin, setBidMin] = useState('')
  const [bidMax, setBidMax] = useState('')
  const [authAccounts, setAuthAccounts] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingSlot, setLoadingSlot] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [auctionSlot, setAuctionSlot] = useState<AuctionSlotInfo | null>(null)

  // Initialize service with network client
  const ammService = React.useMemo(() => {
    const client = new Client(NETWORK_URLS[network])
    return new XRPLAMMService(client)
  }, [network])

  // Load auction slot info
  useEffect(() => {
    loadAuctionSlot()
  }, [pool])

  const loadAuctionSlot = async () => {
    setLoadingSlot(true)
    try {
      const asset1 = pool.asset1Issuer 
        ? { currency: pool.asset1Currency, issuer: pool.asset1Issuer }
        : { currency: 'XRP' }
      
      const asset2 = pool.asset2Issuer
        ? { currency: pool.asset2Currency, issuer: pool.asset2Issuer }
        : { currency: 'XRP' }

      const info = await ammService.getAMMInfo(asset1, asset2)
      
      setAuctionSlot({
        account: info.auctionSlot?.account,
        price: info.auctionSlot?.price,
        expiration: info.auctionSlot?.expiration,
        discountPercent: 90 // AMM auction slots typically give 90% discount
      })
    } catch (err) {
      console.error('Error loading auction slot:', err)
      setAuctionSlot(null)
    } finally {
      setLoadingSlot(false)
    }
  }

  const handleBidAuctionSlot = async () => {
    if (!bidMin && !bidMax) {
      setError('Please enter at least one bid amount')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const asset1 = pool.asset1Issuer 
        ? { currency: pool.asset1Currency, issuer: pool.asset1Issuer }
        : { currency: 'XRP' }
      
      const asset2 = pool.asset2Issuer
        ? { currency: pool.asset2Currency, issuer: pool.asset2Issuer }
        : { currency: 'XRP' }

      const authAccountsList = authAccounts
        ? authAccounts.split(',').map(addr => addr.trim()).filter(Boolean)
        : undefined

      const result = await ammService.bidAuctionSlot({
        wallet,
        asset1,
        asset2,
        bidMin,
        bidMax,
        authAccounts: authAccountsList
      })

      setSuccess(
        `Auction slot bid successful! ` +
        `Slot price: ${result.slotPrice}, ` +
        `Fee discount: ${result.feeDiscount}%. ` +
        `Transaction: ${result.transactionHash}`
      )
      
      // Reset form
      setBidMin('')
      setBidMax('')
      setAuthAccounts('')

      // Reload auction slot info
      await loadAuctionSlot()

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bid on auction slot')
    } finally {
      setLoading(false)
    }
  }

  const isSlotActive = auctionSlot?.account && auctionSlot?.expiration
  const isMySlot = auctionSlot?.account === wallet.address
  const timeRemaining = auctionSlot?.expiration 
    ? new Date(auctionSlot.expiration * 1000).toLocaleString()
    : null

  const feeDiscount = auctionSlot?.discountPercent || 0
  const discountedFee = pool.tradingFee * (1 - feeDiscount / 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Auction Slot
        </CardTitle>
        <CardDescription>
          Bid for discounted trading fees on {pool.asset1Currency}/{pool.asset2Currency} pool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Auction Slot Status */}
        {loadingSlot ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Current Auction Slot</div>
              {isSlotActive && (
                <Badge variant={isMySlot ? "default" : "secondary"}>
                  {isMySlot ? "You Own This Slot" : "Active"}
                </Badge>
              )}
            </div>

            {isSlotActive ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Slot Holder</div>
                  <div className="font-mono text-xs break-all">
                    {auctionSlot?.account}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Slot Price</div>
                  <div className="font-mono">{auctionSlot?.price || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Fee Discount
                  </div>
                  <div className="font-mono text-green-600">
                    {feeDiscount.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires
                  </div>
                  <div className="text-xs">{timeRemaining || 'N/A'}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No active auction slot. Be the first to bid!
              </div>
            )}

            {/* Fee Comparison */}
            <div className="pt-3 border-t space-y-2">
              <div className="text-xs font-medium">Trading Fee Comparison</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-muted-foreground">Standard Fee</div>
                  <div className="font-mono">{(pool.tradingFee / 10).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">With Discount</div>
                  <div className="font-mono text-green-600">
                    {(discountedFee / 10).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bid Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bidMin">
              Minimum Bid (LP Tokens)
            </Label>
            <Input
              id="bidMin"
              type="number"
              placeholder="0.00"
              value={bidMin}
              onChange={(e) => setBidMin(e.target.value)}
              disabled={loading}
            />
            <div className="text-xs text-muted-foreground">
              Minimum amount of LP tokens you're willing to pay
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bidMax">
              Maximum Bid (LP Tokens)
            </Label>
            <Input
              id="bidMax"
              type="number"
              placeholder="0.00"
              value={bidMax}
              onChange={(e) => setBidMax(e.target.value)}
              disabled={loading}
            />
            <div className="text-xs text-muted-foreground">
              Maximum amount of LP tokens you're willing to pay
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="authAccounts">
              Authorized Accounts (Optional)
            </Label>
            <Input
              id="authAccounts"
              type="text"
              placeholder="rAddress1, rAddress2, ..."
              value={authAccounts}
              onChange={(e) => setAuthAccounts(e.target.value)}
              disabled={loading}
            />
            <div className="text-xs text-muted-foreground">
              Comma-separated list of addresses to share the discount
            </div>
          </div>
        </div>

        {/* Info Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2 text-sm">
              <div className="font-medium">About Auction Slots:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Slot holders get discounted trading fees (typically 1/10th of normal fee)</li>
                <li>Auction slots last 24 hours or until outbid</li>
                <li>You pay with LP tokens from this pool</li>
                <li>Can authorize other accounts to share the discount</li>
                <li>Bidding higher than current slot price wins immediately</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription className="text-green-900">{success}</AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <Button
          onClick={handleBidAuctionSlot}
          disabled={loading || (!bidMin && !bidMax)}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Bid...
            </>
          ) : (
            <>
              <Gavel className="mr-2 h-4 w-4" />
              Bid on Auction Slot
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

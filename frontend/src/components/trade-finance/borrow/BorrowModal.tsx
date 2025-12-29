/**
 * Borrow Modal Component - INTEGRATED
 * Modal for borrowing stablecoins against commodity collateral
 * NOW WITH: Real-time price API + WebSocket updates
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, AlertCircle, CheckCircle2, Info, TrendingUp, RefreshCw } from 'lucide-react'
import { ethers } from 'ethers'
import { toast } from 'sonner'

// Import services
import { createCommodityPoolService, ChainType } from '@/services/trade-finance'
import { createTradeFinanceAPIService, TradeFinanceAPIService } from '@/services/trade-finance'
import { TradeFinanceWebSocketClient, PriceUpdate } from '@/services/trade-finance/WebSocketClient'

interface BorrowModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  poolAddress?: string
  userAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
  projectId: string
  apiBaseURL?: string
  wsURL?: string
  currentHealthFactor?: number
  availableToBorrow?: string // In USD
}

interface StablecoinAsset {
  address: string
  name: string
  symbol: string
  apy: string
}

export function BorrowModal({
  open,
  onClose,
  onSuccess,
  poolAddress = '0x...',
  userAddress,
  chainId = 11155111,
  networkType = 'testnet',
  projectId,
  apiBaseURL,
  wsURL,
  currentHealthFactor = 0,
  availableToBorrow = '0'
}: BorrowModalProps) {
  const [selectedAsset, setSelectedAsset] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [newHealthFactor, setNewHealthFactor] = useState<number>(currentHealthFactor)
  
  // API & WebSocket state
  const [apiService, setApiService] = useState<TradeFinanceAPIService | null>(null)
  const [wsClient, setWsClient] = useState<TradeFinanceWebSocketClient | null>(null)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date>(new Date())

  // Stablecoin assets available for borrowing
  const stablecoins: StablecoinAsset[] = [
    {
      address: '0xabc...',
      name: 'USD Coin',
      symbol: 'USDC',
      apy: '5.25'
    },
    {
      address: '0xdef...',
      name: 'Tether',
      symbol: 'USDT',
      apy: '5.15'
    },
    {
      address: '0xghi...',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      apy: '5.30'
    }
  ]

  const selectedAssetData = stablecoins.find(a => a.address === selectedAsset)

  // Initialize API service
  useEffect(() => {
    if (!open || !projectId) return
    
    const service = createTradeFinanceAPIService(projectId, apiBaseURL)
    setApiService(service)
  }, [open, projectId, apiBaseURL])

  // Initialize WebSocket client
  useEffect(() => {
    if (!open || !projectId) return

    const initWebSocket = async () => {
      try {
        const client = new TradeFinanceWebSocketClient(projectId, wsURL)
        await client.connect()

        // Subscribe to price updates
        client.subscribe('prices')

        // Handle real-time price updates
        client.on('PRICE_UPDATE', (data: PriceUpdate) => {
          setLivePrices(prev => ({
            ...prev,
            [data.commodity]: data.price
          }))
          setLastPriceUpdate(new Date())
        })

        setWsClient(client)
      } catch (error) {
        console.error('WebSocket connection failed:', error)
        // Continue without WebSocket - will use polling
      }
    }

    initWebSocket()

    return () => {
      if (wsClient) {
        wsClient.disconnect()
      }
    }
  }, [open, projectId, wsURL])

  // Fetch current prices from API
  const fetchPrices = useCallback(async () => {
    if (!apiService || !open) return

    try {
      setIsLoadingPrices(true)
      
      // Fetch prices for all relevant commodities
      const commodities = ['GOLD', 'SILVER', 'OIL'] // TODO: Get from user's collateral
      const priceData: Record<string, number> = {}

      for (const commodity of commodities) {
        try {
          const response = await apiService.getCurrentPrice(commodity)
          priceData[commodity] = response.price
        } catch (error) {
          console.error(`Failed to fetch price for ${commodity}:`, error)
        }
      }

      setLivePrices(priceData)
      setLastPriceUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch prices:', error)
      toast.error('Failed to fetch commodity prices')
    } finally {
      setIsLoadingPrices(false)
    }
  }, [apiService, open])

  // Initial price fetch
  useEffect(() => {
    if (open) {
      fetchPrices()
    }
  }, [open, fetchPrices])

  // Auto-refresh prices if WebSocket not connected
  useEffect(() => {
    if (!open || wsClient) return

    const interval = setInterval(() => {
      fetchPrices()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [open, wsClient, fetchPrices])

  // Calculate new health factor when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && currentHealthFactor > 0) {
      // Simplified calculation: HF decreases as debt increases
      const borrowAmount = parseFloat(amount)
      const availableAmount = parseFloat(availableToBorrow)
      
      if (availableAmount > 0) {
        const utilizationRatio = borrowAmount / availableAmount
        const estimatedNewHF = currentHealthFactor * (1 - utilizationRatio * 0.5) // Simplified
        setNewHealthFactor(Math.max(0, estimatedNewHF))
      }
    } else {
      setNewHealthFactor(currentHealthFactor)
    }
  }, [amount, currentHealthFactor, availableToBorrow])

  const handleMaxClick = () => {
    setAmount(availableToBorrow)
  }

  const getHealthFactorColor = (hf: number) => {
    if (hf >= 1.5) return 'text-green-600'
    if (hf >= 1.1) return 'text-yellow-600'
    if (hf >= 1.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getHealthFactorLabel = (hf: number) => {
    if (hf >= 1.5) return 'Healthy'
    if (hf >= 1.1) return 'Warning'
    if (hf >= 1.0) return 'At Risk'
    return 'Liquidatable'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset || !amount || !userAddress) {
      setError('Please fill all required fields')
      return
    }

    // Validate health factor
    if (newHealthFactor < 1.0) {
      setError('This borrow would make your position liquidatable. Please reduce amount.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      // Create pool service
      const poolService = createCommodityPoolService({
        poolAddress,
        chainType: ChainType.ETHEREUM,
        chainId,
        networkType
      })

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, 18) // Stablecoins typically 18 decimals

      // TODO: Get private key securely
      const privateKey = '0x...' // Placeholder

      // Borrow from pool
      const result = await poolService.borrow({
        userAddress,
        asset: selectedAsset,
        amount: amountWei.toString(),
        privateKey
      })

      setTxHash(result.transactionHash)
      setSuccess(true)
      toast.success('Borrow successful!', {
        description: `Borrowed ${amount} ${selectedAssetData?.symbol}`
      })

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess()
      }

      // Reset form after short delay
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err: any) {
      console.error('Borrow error:', err)
      setError(err.message || 'Failed to borrow')
      toast.error('Borrow failed', {
        description: err.message || 'Please try again'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedAsset('')
    setAmount('')
    setError(null)
    setSuccess(false)
    setTxHash(null)
    setNewHealthFactor(currentHealthFactor)
    setLivePrices({})
    onClose()
  }

  const timeSinceUpdate = Math.floor((Date.now() - lastPriceUpdate.getTime()) / 1000)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Borrow Stablecoins</span>
            <div className="flex items-center gap-2">
              {wsClient && (
                <Badge variant="secondary" className="text-xs">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                  Live
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPrices}
                disabled={isLoadingPrices}
              >
                {isLoadingPrices ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Borrow stablecoins against your commodity collateral
            {wsClient && (
              <span className="text-xs ml-2">
                • Prices updated {timeSinceUpdate}s ago
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Available to Borrow</p>
              <p className="text-lg font-semibold">${parseFloat(availableToBorrow).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Health Factor</p>
              <p className={`text-lg font-semibold ${getHealthFactorColor(currentHealthFactor)}`}>
                {currentHealthFactor.toFixed(2)} - {getHealthFactorLabel(currentHealthFactor)}
              </p>
            </div>
          </div>

          {/* Live Commodity Prices */}
          {Object.keys(livePrices).length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-2">Live Collateral Prices</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(livePrices).map(([commodity, price]) => (
                  <div key={commodity} className="text-xs">
                    <span className="font-medium">{commodity}:</span>
                    <span className="ml-1">${price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="asset">Stablecoin</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select stablecoin" />
              </SelectTrigger>
              <SelectContent>
                {stablecoins.map(coin => (
                  <SelectItem key={coin.address} value={coin.address}>
                    <div className="flex items-center justify-between w-full">
                      <span>{coin.name} ({coin.symbol})</span>
                      <Badge variant="secondary" className="ml-2">
                        {coin.apy}% APY
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!selectedAsset}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleMaxClick}
                disabled={!selectedAsset}
              >
                MAX
              </Button>
            </div>
          </div>

          {/* New Health Factor Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">New Health Factor</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${newHealthFactor < currentHealthFactor ? 'text-red-500 rotate-180' : 'text-green-500'}`} />
                  <span className={`text-sm font-semibold ${getHealthFactorColor(newHealthFactor)}`}>
                    {newHealthFactor.toFixed(2)}
                  </span>
                </div>
              </div>
              <Progress 
                value={(newHealthFactor / 2) * 100} 
                className={newHealthFactor < 1.0 ? 'bg-red-200' : ''} 
              />
              <p className="text-xs text-muted-foreground">
                {newHealthFactor >= 1.0 
                  ? 'Your position will remain healthy' 
                  : '⚠️ Warning: This would make your position liquidatable'}
              </p>
            </div>
          )}

          {/* Info Alert */}
          {selectedAsset && amount && newHealthFactor >= 1.0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You'll pay {selectedAssetData?.apy}% APY on this borrow. 
                Keep your health factor above 1.0 to avoid liquidation.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && txHash && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Borrow successful! Transaction: {txHash.slice(0, 10)}...
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedAsset || !amount || newHealthFactor < 1.0 || isSubmitting || success}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Borrowing...' : success ? 'Borrowed' : 'Borrow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default BorrowModal

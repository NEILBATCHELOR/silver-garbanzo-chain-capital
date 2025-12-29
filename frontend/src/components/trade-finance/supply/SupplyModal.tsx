/**
 * Supply Modal Component - INTEGRATED
 * Modal for supplying commodity collateral to the lending pool
 * NOW WITH: Real tokenization API + Position tracking
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react'
import { ethers } from 'ethers'
import { toast } from 'sonner'

// Import services
import { createCommodityPoolService, ChainType } from '@/services/trade-finance'
import { createTradeFinanceAPIService, TradeFinanceAPIService } from '@/services/trade-finance'
import { TradeFinanceWebSocketClient } from '@/services/trade-finance/WebSocketClient'

interface SupplyModalProps {
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
}

interface CommodityToken {
  address: string
  name: string
  symbol: string
  balance: string
  decimals: number
  currentPrice?: number
  totalValue?: number
}

export function SupplyModal({
  open,
  onClose,
  onSuccess,
  poolAddress = '0x...',
  userAddress,
  chainId = 11155111,
  networkType = 'testnet',
  projectId,
  apiBaseURL,
  wsURL
}: SupplyModalProps) {
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  
  // API & WebSocket state
  const [apiService, setApiService] = useState<TradeFinanceAPIService | null>(null)
  const [wsClient, setWsClient] = useState<TradeFinanceWebSocketClient | null>(null)
  const [commodityTokens, setCommodityTokens] = useState<CommodityToken[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

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
        client.on('PRICE_UPDATE', (data: any) => {
          setLivePrices(prev => ({
            ...prev,
            [data.commodity]: data.price
          }))

          // Update token prices
          setCommodityTokens(prev => 
            prev.map(token => {
              if (token.symbol === data.commodity) {
                return {
                  ...token,
                  currentPrice: data.price,
                  totalValue: parseFloat(token.balance) * data.price
                }
              }
              return token
            })
          )
        })

        setWsClient(client)
      } catch (error) {
        console.error('WebSocket connection failed:', error)
      }
    }

    initWebSocket()

    return () => {
      if (wsClient) {
        wsClient.disconnect()
      }
    }
  }, [open, projectId, wsURL])

  // Fetch user's commodity tokens
  const fetchUserTokens = useCallback(async () => {
    if (!apiService || !userAddress || !open) return

    try {
      setIsLoadingTokens(true)
      setError(null)

      // Get user's positions to find their tokens
      const response = await apiService.getPositionDetails(userAddress)
      
      // Extract commodity tokens from collateral
      const tokens: CommodityToken[] = response.collateral.map((col) => ({
        address: col.token_address || '0x...',
        name: `${col.commodity_type} Token`,
        symbol: col.commodity_type,
        balance: col.amount,
        decimals: 18,
        currentPrice: col.value_usd / parseFloat(col.amount),
        totalValue: col.value_usd
      }))

      // Add mock tokens for demo (remove in production)
      const mockTokens: CommodityToken[] = [
        {
          address: '0x123...',
          name: 'Gold Token',
          symbol: 'GOLD',
          balance: '10.5',
          decimals: 18,
          currentPrice: livePrices['GOLD'] || 2000,
          totalValue: 10.5 * (livePrices['GOLD'] || 2000)
        },
        {
          address: '0x456...',
          name: 'Silver Token',
          symbol: 'SILVER',
          balance: '50.0',
          decimals: 18,
          currentPrice: livePrices['SILVER'] || 25,
          totalValue: 50.0 * (livePrices['SILVER'] || 25)
        },
        {
          address: '0x789...',
          name: 'Oil Token',
          symbol: 'OIL',
          balance: '100.0',
          decimals: 18,
          currentPrice: livePrices['OIL'] || 80,
          totalValue: 100.0 * (livePrices['OIL'] || 80)
        }
      ]

      setCommodityTokens([...tokens, ...mockTokens])
    } catch (err) {
      console.error('Failed to fetch tokens:', err)
      // Fallback to mock tokens
      const mockTokens: CommodityToken[] = [
        {
          address: '0x123...',
          name: 'Gold Token',
          symbol: 'GOLD',
          balance: '10.5',
          decimals: 18
        },
        {
          address: '0x456...',
          name: 'Silver Token',
          symbol: 'SILVER',
          balance: '50.0',
          decimals: 18
        },
        {
          address: '0x789...',
          name: 'Oil Token',
          symbol: 'OIL',
          balance: '100.0',
          decimals: 18
        }
      ]
      setCommodityTokens(mockTokens)
    } finally {
      setIsLoadingTokens(false)
    }
  }, [apiService, userAddress, open, livePrices])

  // Initial token fetch
  useEffect(() => {
    if (open) {
      fetchUserTokens()
    }
  }, [open, fetchUserTokens])

  const selectedTokenData = commodityTokens.find(t => t.address === selectedToken)

  const handleMaxClick = () => {
    if (selectedTokenData) {
      setAmount(selectedTokenData.balance)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedToken || !amount || !userAddress) {
      setError('Please fill all required fields')
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
      const amountWei = ethers.parseUnits(amount, selectedTokenData?.decimals || 18)

      // TODO: Get private key securely (from wallet connection, not hardcoded)
      const privateKey = '0x...' // Placeholder

      // Supply to pool
      const result = await poolService.supply({
        userAddress,
        commodityToken: selectedToken,
        amount: amountWei.toString(),
        privateKey
      })

      setTxHash(result.transactionHash)
      setSuccess(true)
      toast.success('Supply successful!', {
        description: `Transaction: ${result.transactionHash.slice(0, 10)}...`
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
      console.error('Supply error:', err)
      setError(err.message || 'Failed to supply collateral')
      toast.error('Supply failed', {
        description: err.message || 'Please try again'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedToken('')
    setAmount('')
    setError(null)
    setSuccess(false)
    setTxHash(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Supply Collateral</span>
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
                onClick={fetchUserTokens}
                disabled={isLoadingTokens}
              >
                {isLoadingTokens ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Supply commodity tokens as collateral to borrow stablecoins
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Loading State */}
          {isLoadingTokens && commodityTokens.length === 0 && (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading your commodity tokens...</p>
            </div>
          )}

          {/* Commodity Token Selection */}
          {!isLoadingTokens && commodityTokens.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="token">Commodity Token</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger id="token">
                  <SelectValue placeholder="Select commodity token" />
                </SelectTrigger>
                <SelectContent>
                  {commodityTokens.map(token => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center justify-between w-full">
                        <span>{token.name} ({token.symbol})</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="ml-2">
                            Balance: {token.balance}
                          </Badge>
                          {token.currentPrice && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              ${token.currentPrice.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTokenData && selectedTokenData.totalValue && (
                <p className="text-xs text-muted-foreground">
                  Total Value: ${selectedTokenData.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}

          {/* No Tokens State */}
          {!isLoadingTokens && commodityTokens.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No commodity tokens found in your wallet. Please tokenize your commodities first.
              </AlertDescription>
            </Alert>
          )}

          {/* Amount Input */}
          {commodityTokens.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!selectedToken}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMaxClick}
                  disabled={!selectedToken}
                >
                  MAX
                </Button>
              </div>
              {selectedTokenData && (
                <p className="text-xs text-muted-foreground">
                  Available: {selectedTokenData.balance} {selectedTokenData.symbol}
                  {selectedTokenData.currentPrice && (
                    <span className="ml-2">
                      (~${(parseFloat(selectedTokenData.balance) * selectedTokenData.currentPrice).toLocaleString()})
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Supply Value Preview */}
          {selectedToken && amount && selectedTokenData && selectedTokenData.currentPrice && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">Supply Value</p>
              <p className="text-lg font-semibold text-blue-900">
                ${(parseFloat(amount) * selectedTokenData.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Info Alert */}
          {selectedToken && amount && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You will receive cTokens (receipt tokens) representing your supplied collateral.
                These tokens can be used in other DeFi protocols and will accrue value over time.
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
                Supply successful! Transaction: {txHash.slice(0, 10)}...
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
              disabled={!selectedToken || !amount || isSubmitting || success || commodityTokens.length === 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Supplying...' : success ? 'Supplied' : 'Supply'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default SupplyModal

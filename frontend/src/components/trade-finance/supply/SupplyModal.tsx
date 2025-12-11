/**
 * Supply Modal Component
 * Modal for supplying commodity collateral to the lending pool
 * Pattern: Similar to existing Dialog modals in the codebase
 */

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { ethers } from 'ethers'
import { toast } from 'sonner'

// Import services
import { createCommodityPoolService, ChainType } from '@/services/trade-finance'

interface SupplyModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  poolAddress?: string
  userAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
}

interface CommodityToken {
  address: string
  name: string
  symbol: string
  balance: string
  decimals: number
}

export function SupplyModal({
  open,
  onClose,
  onSuccess,
  poolAddress = '0x...', // TODO: Get from config
  userAddress,
  chainId = 11155111, // Sepolia default
  networkType = 'testnet'
}: SupplyModalProps) {
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Mock commodity tokens - TODO: Fetch from database/blockchain
  const commodityTokens: CommodityToken[] = [
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
          <DialogTitle>Supply Collateral</DialogTitle>
          <DialogDescription>
            Supply commodity tokens as collateral to borrow stablecoins
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Commodity Token Selection */}
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
                      <Badge variant="secondary" className="ml-2">
                        Balance: {token.balance}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
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
              </p>
            )}
          </div>

          {/* Info Alert */}
          {selectedToken && amount && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You will receive cTokens (receipt tokens) representing your supplied collateral.
                These tokens can be used in other DeFi protocols.
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
              disabled={!selectedToken || !amount || isSubmitting || success}
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

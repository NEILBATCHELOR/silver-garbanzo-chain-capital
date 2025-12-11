/**
 * Liquidate Modal Component
 * Modal for executing liquidations on underwater positions
 * Shows: Position details, profit calculation, liquidation confirmation
 */

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertCircle, CheckCircle2, Info, Zap, DollarSign, TrendingUp } from 'lucide-react'
import { ethers } from 'ethers'
import { toast } from 'sonner'

// Import services
import { createCommodityPoolService, ChainType } from '@/services/trade-finance'

interface LiquidateModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  position?: {
    borrower: string
    commodityToken: string
    commodityName: string
    collateralAmount: string
    collateralValueUSD: string
    borrowedAsset: string
    borrowedAmount: string
    borrowedValueUSD: string
    healthFactor: number
    liquidationBonus: number
    potentialProfit: string
  }
  poolAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
  liquidatorAddress?: string
}

export function LiquidateModal({
  open,
  onClose,
  onSuccess,
  position,
  poolAddress = '0x...',
  chainId = 11155111,
  networkType = 'testnet',
  liquidatorAddress
}: LiquidateModalProps) {
  const [debtToCover, setDebtToCover] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [calculatedProfit, setCalculatedProfit] = useState<string>('0')
  const [collateralReceived, setCollateralReceived] = useState<string>('0')

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setDebtToCover('')
      setError(null)
      setSuccess(false)
      setTxHash(null)
      setIsSubmitting(false)
      setCalculatedProfit('0')
      setCollateralReceived('0')
    }
  }, [open])

  // Calculate profit when debt amount changes
  useEffect(() => {
    if (!position || !debtToCover || parseFloat(debtToCover) <= 0) {
      setCalculatedProfit('0')
      setCollateralReceived('0')
      return
    }

    const debtValue = parseFloat(debtToCover)
    const maxDebt = parseFloat(position.borrowedAmount.replace(/,/g, ''))

    if (debtValue > maxDebt) {
      setDebtToCover(maxDebt.toString())
      return
    }

    // Calculate collateral received (with liquidation bonus)
    const collateralPrice = parseFloat(position.collateralValueUSD.replace(/,/g, '')) / 
                           parseFloat(position.collateralAmount)
    const bonusMultiplier = 1 + (position.liquidationBonus / 100)
    const collateralValue = debtValue * bonusMultiplier
    const collateralAmount = collateralValue / collateralPrice

    // Calculate profit
    const profit = collateralValue - debtValue

    setCollateralReceived(collateralAmount.toFixed(4))
    setCalculatedProfit(profit.toFixed(2))
  }, [debtToCover, position])

  // Handle max button
  const handleMax = () => {
    if (!position) return
    setDebtToCover(position.borrowedAmount.replace(/,/g, ''))
  }

  // Handle liquidation
  const handleLiquidate = async () => {
    if (!position || !liquidatorAddress || !debtToCover) {
      setError('Missing required parameters')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Convert to Wei (18 decimals) - ethers v6 syntax
      const debtToRepay = ethers.parseUnits(debtToCover, 18).toString()

      const poolService = createCommodityPoolService({
        poolAddress,
        chainType: ChainType.ETHEREUM,
        chainId,
        networkType
      })

      // TODO: Get private key from wallet provider
      const privateKey = '0x...'

      const result = await poolService.liquidate({
        liquidatorAddress,
        borrower: position.borrower,
        collateralAsset: position.commodityToken,
        debtAsset: position.borrowedAsset,
        debtToCover: debtToRepay,
        liquidatorPrivateKey: privateKey,
        receivecToken: false // Receive underlying asset, not cToken
      })

      setTxHash(result.transactionHash || '')
      setSuccess(true)
      toast.success(`Position liquidated! Profit: $${calculatedProfit}`)

      // Call success callback after a delay
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 2000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Liquidation failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!position) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Liquidate Position
          </DialogTitle>
          <DialogDescription>
            Execute liquidation on underwater position
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="space-y-6">
            {/* Position Details */}
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Borrower</span>
                  <span className="font-mono text-xs">
                    {position.borrower.slice(0, 8)}...{position.borrower.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Collateral</span>
                  <div className="text-right">
                    <p className="font-medium">{position.commodityName}</p>
                    <p className="text-xs text-muted-foreground">
                      {position.collateralAmount} ≈ ${position.collateralValueUSD}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Debt</span>
                  <div className="text-right">
                    <p className="font-medium">{position.borrowedAsset}</p>
                    <p className="text-xs text-muted-foreground">
                      ${position.borrowedAmount}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Health Factor</span>
                  <Badge variant="destructive" className="font-bold">
                    {position.healthFactor.toFixed(2)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Liquidation Bonus</span>
                  <Badge variant="outline" className="text-green-600">
                    +{position.liquidationBonus}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Liquidation Amount */}
            <div className="space-y-2">
              <Label htmlFor="debtToCover">Debt to Repay (USD)</Label>
              <div className="flex gap-2">
                <Input
                  id="debtToCover"
                  type="number"
                  placeholder="0.00"
                  value={debtToCover}
                  onChange={(e) => setDebtToCover(e.target.value)}
                  disabled={isSubmitting}
                  min="0"
                  step="0.01"
                />
                <Button
                  variant="outline"
                  onClick={handleMax}
                  disabled={isSubmitting}
                >
                  MAX
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum: ${position.borrowedAmount}
              </p>
            </div>

            {/* Profit Calculation */}
            {debtToCover && parseFloat(debtToCover) > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Expected Returns</span>
                    </div>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Debt to Repay</span>
                    <span className="font-medium">${parseFloat(debtToCover).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Collateral Received</span>
                    <span className="font-medium">{collateralReceived} {position.commodityName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Collateral Value</span>
                    <span className="font-medium">
                      ${(parseFloat(debtToCover) * (1 + position.liquidationBonus / 100)).toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold text-green-700">Net Profit</span>
                    <span className="font-bold text-xl text-green-600">
                      ${calculatedProfit}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You will repay ${debtToCover || '0'} of the borrower's debt and receive {collateralReceived || '0'} {position.commodityName} 
                (worth ${(parseFloat(debtToCover || '0') * (1 + position.liquidationBonus / 100)).toFixed(2)}) 
                as collateral with a {position.liquidationBonus}% liquidation bonus.
              </AlertDescription>
            </Alert>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          // Success State
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Liquidation Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Position liquidated with profit of ${calculatedProfit}
                </p>
              </div>
              {txHash && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Transaction:</span>
                  <a
                    href={`https://${networkType === 'testnet' ? 'sepolia.' : ''}etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!success && (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLiquidate}
                disabled={isSubmitting || !debtToCover || parseFloat(debtToCover) <= 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Liquidating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Liquidate Position
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

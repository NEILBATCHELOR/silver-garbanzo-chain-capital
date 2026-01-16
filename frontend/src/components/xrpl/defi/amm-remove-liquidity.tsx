import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Minus, Info, AlertTriangle } from 'lucide-react'
import { AMMRemoveLiquidityProps, LiquidityPositionData } from './types'
import { XRPLAMMService } from '@/services/wallet/ripple/defi'
import { Client, Wallet } from 'xrpl'

const NETWORK_URLS = {
  MAINNET: 'wss://xrplcluster.com',
  TESTNET: 'wss://s.altnet.rippletest.net:51233',
  DEVNET: 'wss://s.devnet.rippletest.net:51233'
}

interface ExtendedAMMRemoveLiquidityProps extends AMMRemoveLiquidityProps {
  position?: LiquidityPositionData
}

export function AMMRemoveLiquidity({ 
  pool, 
  position, 
  wallet,
  network,
  projectId,
  onSuccess 
}: ExtendedAMMRemoveLiquidityProps) {
  const [lpTokenAmount, setLpTokenAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [estimatedWithdrawal, setEstimatedWithdrawal] = useState<{
    asset1: string
    asset2: string
  } | null>(null)

  // Initialize service with network client
  const ammService = React.useMemo(() => {
    const client = new Client(NETWORK_URLS[network])
    return new XRPLAMMService(client)
  }, [network])

  // Calculate estimated withdrawal amounts
  const calculateEstimatedWithdrawal = () => {
    if (!lpTokenAmount || !position) {
      setEstimatedWithdrawal(null)
      return
    }

    try {
      const amounts = ammService.calculateWithdrawal(
        lpTokenAmount,
        pool.asset1Balance,
        pool.asset2Balance,
        pool.lpTokenSupply
      )
      setEstimatedWithdrawal(amounts)
    } catch (err) {
      console.error('Error calculating withdrawal:', err)
      setEstimatedWithdrawal(null)
    }
  }

  React.useEffect(() => {
    calculateEstimatedWithdrawal()
  }, [lpTokenAmount])

  const handleRemoveLiquidity = async () => {
    if (!lpTokenAmount) {
      setError('Please enter LP token amount')
      return
    }

    if (position && parseFloat(lpTokenAmount) > parseFloat(position.lpTokenBalance)) {
      setError('Insufficient LP token balance')
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

      const result = await ammService.removeLiquidity({
        wallet,
        asset1,
        asset2,
        lpTokenAmount
      })

      setSuccess(
        `Successfully removed liquidity! ` +
        `Received ${result.asset1Received} ${pool.asset1Currency} and ` +
        `${result.asset2Received} ${pool.asset2Currency}. ` +
        `Transaction: ${result.transactionHash}`
      )
      
      // Reset form
      setLpTokenAmount('')
      setEstimatedWithdrawal(null)

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove liquidity')
    } finally {
      setLoading(false)
    }
  }

  const handleMaxClick = () => {
    if (position) {
      setLpTokenAmount(position.lpTokenBalance)
    }
  }

  const withdrawalPercentage = position && lpTokenAmount
    ? ((parseFloat(lpTokenAmount) / parseFloat(position.lpTokenBalance)) * 100).toFixed(2)
    : '0'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Minus className="h-5 w-5" />
          Remove Liquidity
        </CardTitle>
        <CardDescription>
          Remove liquidity from {pool.asset1Currency}/{pool.asset2Currency} pool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Position Info */}
        {position ? (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="text-sm font-medium">Your Position</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">LP Token Balance</div>
                <div className="font-mono">{position.lpTokenBalance}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Pool Share</div>
                <div className="font-mono">{position.sharePercentage.toFixed(4)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">{pool.asset1Currency} Value</div>
                <div className="font-mono">{position.asset1Value}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{pool.asset2Currency} Value</div>
                <div className="font-mono">{position.asset2Value}</div>
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You don't have a position in this pool yet. Add liquidity first.
            </AlertDescription>
          </Alert>
        )}

        {/* Remove Liquidity Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lpTokenAmount">
                LP Tokens to Burn
              </Label>
              {position && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaxClick}
                  disabled={loading}
                  className="h-auto p-0 text-xs"
                >
                  MAX
                </Button>
              )}
            </div>
            <Input
              id="lpTokenAmount"
              type="number"
              placeholder="0.00"
              value={lpTokenAmount}
              onChange={(e) => setLpTokenAmount(e.target.value)}
              disabled={loading || !position}
              max={position?.lpTokenBalance}
            />
            {lpTokenAmount && (
              <div className="text-xs text-muted-foreground">
                Withdrawing {withdrawalPercentage}% of your position
              </div>
            )}
          </div>
        </div>

        {/* Estimated Withdrawal */}
        {estimatedWithdrawal && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="text-sm font-medium text-blue-900">
              Estimated Withdrawal
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-700">You will receive:</div>
                <div className="font-mono text-blue-900">
                  {estimatedWithdrawal.asset1} {pool.asset1Currency}
                </div>
              </div>
              <div>
                <div className="text-blue-700">And:</div>
                <div className="font-mono text-blue-900">
                  {estimatedWithdrawal.asset2} {pool.asset2Currency}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning for Full Withdrawal */}
        {position && lpTokenAmount === position.lpTokenBalance && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Full Withdrawal Warning</div>
              <div className="text-sm mt-1">
                You're removing 100% of your liquidity. This will close your position entirely.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div className="font-medium">About Withdrawal:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>You'll receive both assets proportionally to your LP tokens</li>
                <li>Withdrawal is instant (no waiting period)</li>
                <li>Current pool ratio determines asset amounts</li>
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
          onClick={handleRemoveLiquidity}
          disabled={loading || !lpTokenAmount || !position}
          variant="destructive"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Removing Liquidity...
            </>
          ) : (
            <>
              <Minus className="mr-2 h-4 w-4" />
              Remove Liquidity
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

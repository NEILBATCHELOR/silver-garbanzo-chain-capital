import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Info } from 'lucide-react'
import { AMMAddLiquidityProps } from './types'
import { XRPLAMMService } from '@/services/wallet/ripple/defi'
import { Client, Wallet } from 'xrpl'

const NETWORK_URLS = {
  MAINNET: 'wss://xrplcluster.com',
  TESTNET: 'wss://s.altnet.rippletest.net:51233',
  DEVNET: 'wss://s.devnet.rippletest.net:51233'
}

export function AMMAddLiquidity({ pool, wallet, network, projectId, onSuccess }: AMMAddLiquidityProps) {
  const [asset1Amount, setAsset1Amount] = useState('')
  const [asset2Amount, setAsset2Amount] = useState('')
  const [lpTokensOut, setLpTokensOut] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [estimatedLPTokens, setEstimatedLPTokens] = useState<string>('')

  // Initialize service with network client
  const ammService = React.useMemo(() => {
    const client = new Client(NETWORK_URLS[network])
    return new XRPLAMMService(client)
  }, [network])

  // Calculate estimated LP tokens when amounts change
  const calculateEstimatedLPTokens = () => {
    if (!asset1Amount || !asset2Amount) {
      setEstimatedLPTokens('')
      return
    }

    try {
      const lpTokens = ammService.calculateLPTokens(
        asset1Amount,
        asset2Amount,
        pool.asset1Balance,
        pool.asset2Balance,
        pool.lpTokenSupply
      )
      setEstimatedLPTokens(lpTokens)
    } catch (err) {
      console.error('Error calculating LP tokens:', err)
      setEstimatedLPTokens('Error calculating')
    }
  }

  React.useEffect(() => {
    calculateEstimatedLPTokens()
  }, [asset1Amount, asset2Amount])

  const handleAddLiquidity = async () => {
    if (!asset1Amount && !asset2Amount && !lpTokensOut) {
      setError('Please enter amounts for assets or LP tokens')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const asset1 = pool.asset1Issuer 
        ? { currency: pool.asset1Currency, issuer: pool.asset1Issuer, value: asset1Amount }
        : { currency: 'XRP', value: asset1Amount }
      
      const asset2 = pool.asset2Issuer
        ? { currency: pool.asset2Currency, issuer: pool.asset2Issuer, value: asset2Amount }
        : { currency: 'XRP', value: asset2Amount }

      const result = await ammService.addLiquidity({
        wallet,
        asset1,
        asset2,
        lpTokensOut
      })

      setSuccess(
        `Successfully added liquidity! Received ${result.lpTokensReceived} LP tokens. ` +
        `Transaction: ${result.transactionHash}`
      )
      
      // Reset form
      setAsset1Amount('')
      setAsset2Amount('')
      setLpTokensOut('')
      setEstimatedLPTokens('')

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add liquidity')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Liquidity
        </CardTitle>
        <CardDescription>
          Add liquidity to {pool.asset1Currency}/{pool.asset2Currency} pool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Pool Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium">Current Pool State</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">{pool.asset1Currency} Balance</div>
              <div className="font-mono">{pool.asset1Balance}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{pool.asset2Currency} Balance</div>
              <div className="font-mono">{pool.asset2Balance}</div>
            </div>
            <div>
              <div className="text-muted-foreground">LP Token Supply</div>
              <div className="font-mono">{pool.lpTokenSupply}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Trading Fee</div>
              <div className="font-mono">{pool.tradingFee / 10}%</div>
            </div>
          </div>
        </div>

        {/* Add Liquidity Options */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset1Amount">
              {pool.asset1Currency} Amount
            </Label>
            <Input
              id="asset1Amount"
              type="number"
              placeholder="0.00"
              value={asset1Amount}
              onChange={(e) => setAsset1Amount(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset2Amount">
              {pool.asset2Currency} Amount
            </Label>
            <Input
              id="asset2Amount"
              type="number"
              placeholder="0.00"
              value={asset2Amount}
              onChange={(e) => setAsset2Amount(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR specify LP tokens
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lpTokensOut">
              LP Tokens to Receive (Optional)
            </Label>
            <Input
              id="lpTokensOut"
              type="number"
              placeholder="0.00"
              value={lpTokensOut}
              onChange={(e) => setLpTokensOut(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Estimated LP Tokens */}
        {estimatedLPTokens && !lpTokensOut && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Estimated LP tokens to receive: <span className="font-mono font-semibold">{estimatedLPTokens}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div className="font-medium">Deposit Modes:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Dual-asset: Enter both asset amounts for balanced deposit</li>
                <li>Single-asset: Enter one asset amount (may incur price impact)</li>
                <li>LP-target: Specify desired LP tokens to receive</li>
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
          onClick={handleAddLiquidity}
          disabled={loading || (!asset1Amount && !asset2Amount && !lpTokensOut)}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Liquidity...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Liquidity
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

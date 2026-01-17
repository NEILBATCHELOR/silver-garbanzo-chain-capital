import React, { useState, useMemo } from 'react'
import { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Vote, Info, TrendingUp, TrendingDown } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { XRPLAMMService } from '@/services/wallet/ripple/defi/XRPLAMMService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { AMMPool } from './types'

interface AMMVoteFeeProps {
  pool: AMMPool
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  onSuccess?: () => void
}

export function AMMVoteFee({ 
  pool, 
  wallet, 
  network, 
  projectId,
  onSuccess 
}: AMMVoteFeeProps) {
  const { toast } = useToast()
  const [newFee, setNewFee] = useState('')
  const [isVoting, setIsVoting] = useState(false)
  const [ammService, setAmmService] = useState<XRPLAMMService | null>(null)

  // Initialize XRPL client and AMM service
  React.useEffect(() => {
    const initService = async () => {
      const client = await xrplClientManager.getClient(network)
      setAmmService(new XRPLAMMService(client))
    }
    initService()
  }, [network])

  // Current fee in basis points (0-1000)
  const currentFeeBps = pool.tradingFee
  const currentFeePercent = (currentFeeBps / 10).toFixed(2)

  // Calculate new fee details
  const newFeeBps = newFee ? Math.round(parseFloat(newFee) * 10) : 0
  const feeChange = newFeeBps - currentFeeBps
  const feeChangePercent = currentFeeBps > 0 
    ? ((feeChange / currentFeeBps) * 100).toFixed(1)
    : '0'

  const isIncrease = feeChange > 0
  const isDecrease = feeChange < 0

  const handleVote = async () => {
    if (!ammService) {
      toast({
        title: 'Service Not Ready',
        description: 'AMM service is still initializing. Please try again.',
        variant: 'destructive'
      })
      return
    }

    if (!newFee || newFeeBps < 0 || newFeeBps > 1000) {
      toast({
        title: 'Invalid Fee',
        description: 'Trading fee must be between 0% and 1% (0-1000 basis points)',
        variant: 'destructive'
      })
      return
    }

    if (newFeeBps === currentFeeBps) {
      toast({
        title: 'No Change',
        description: 'New fee is the same as current fee',
        variant: 'destructive'
      })
      return
    }

    setIsVoting(true)

    try {
      // Prepare asset objects
      const asset1 = pool.asset1Issuer 
        ? { currency: pool.asset1Currency, issuer: pool.asset1Issuer }
        : { currency: 'XRP' }

      const asset2 = pool.asset2Issuer
        ? { currency: pool.asset2Currency, issuer: pool.asset2Issuer }
        : { currency: 'XRP' }

      // Vote on new trading fee
      const result = await ammService.voteTradingFee({
        wallet,
        asset1,
        asset2,
        tradingFee: newFeeBps
      })

      toast({
        title: 'Vote Submitted',
        description: `Successfully voted for ${(newFeeBps / 10).toFixed(2)}% trading fee. Transaction: ${result.transactionHash.slice(0, 16)}...`
      })

      setNewFee('')
      onSuccess?.()

    } catch (error) {
      console.error('Vote failed:', error)
      toast({
        title: 'Vote Failed',
        description: error instanceof Error ? error.message : 'Failed to submit vote',
        variant: 'destructive'
      })
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Vote on Trading Fee
        </CardTitle>
        <CardDescription>
          Use your LP tokens to vote on the pool's trading fee
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Fee Display */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Current Trading Fee</div>
              <div className="text-2xl font-bold">{currentFeePercent}%</div>
              <div className="text-xs text-muted-foreground">{currentFeeBps} basis points</div>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
        </div>

        {/* New Fee Input */}
        <div className="space-y-2">
          <Label htmlFor="new-fee">
            Proposed New Fee (%)
          </Label>
          <Input
            id="new-fee"
            type="number"
            placeholder="0.00 - 1.00"
            value={newFee}
            onChange={(e) => setNewFee(e.target.value)}
            min="0"
            max="1"
            step="0.01"
          />
          <p className="text-xs text-muted-foreground">
            Enter a fee between 0% and 1% (0-1000 basis points)
          </p>
        </div>

        {/* Fee Change Preview */}
        {newFee && newFeeBps !== currentFeeBps && (
          <div className={`p-4 rounded-lg border ${
            isIncrease 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isIncrease ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
              <span className={`font-semibold ${
                isIncrease ? 'text-red-700' : 'text-green-700'
              }`}>
                Fee {isIncrease ? 'Increase' : 'Decrease'}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Current</div>
                <div className="font-semibold">{currentFeePercent}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Proposed</div>
                <div className="font-semibold">{(newFeeBps / 10).toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Change</div>
                <div className={`font-semibold ${
                  isIncrease ? 'text-red-700' : 'text-green-700'
                }`}>
                  {isIncrease ? '+' : ''}{feeChangePercent}%
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs">
              {isIncrease ? (
                <p className="text-red-700">
                  Higher fees may reduce trading volume but increase LP earnings per trade
                </p>
              ) : (
                <p className="text-green-700">
                  Lower fees may increase trading volume but reduce LP earnings per trade
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-xs">
              <p><strong>How voting works:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Your vote weight is proportional to your LP token holdings</li>
                <li>Votes are weighted by LP token balance at time of vote</li>
                <li>Fee changes take effect after voting period concludes</li>
                <li>Only LP token holders can vote on fee changes</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleVote}
          disabled={isVoting || !newFee || newFeeBps === currentFeeBps}
          className="w-full"
        >
          {isVoting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Vote...
            </>
          ) : (
            <>
              <Vote className="mr-2 h-4 w-4" />
              Submit Vote for {newFee ? `${(newFeeBps / 10).toFixed(2)}%` : 'New Fee'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default AMMVoteFee

import React, { useState, useEffect } from 'react'
import { Client, Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowDownUp, Zap, Info, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { XRPLDEXService } from '@/services/wallet/ripple/defi/XRPLDEXService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'

interface DEXMarketSwapProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  onSuccess?: () => void
}

export function DEXMarketSwap({
  wallet,
  network,
  projectId,
  onSuccess
}: DEXMarketSwapProps) {
  const { toast } = useToast()
  
  // Swap parameters
  const [fromCurrency, setFromCurrency] = useState('XRP')
  const [fromIssuer, setFromIssuer] = useState('')
  const [fromAmount, setFromAmount] = useState('')
  
  const [toCurrency, setToCurrency] = useState('USD')
  const [toIssuer, setToIssuer] = useState('')
  const [estimatedReceive, setEstimatedReceive] = useState('')
  
  const [maxSlippage, setMaxSlippage] = useState('1') // 1% default
  
  const [isSwapping, setIsSwapping] = useState(false)
  const [isEstimating, setIsEstimating] = useState(false)

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

  // Calculate effective price
  const effectivePrice = React.useMemo(() => {
    if (!fromAmount || !estimatedReceive) return '0'
    const price = parseFloat(estimatedReceive) / parseFloat(fromAmount)
    return price.toFixed(8)
  }, [fromAmount, estimatedReceive])

  // Estimate received amount
  const handleEstimate = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return

    setIsEstimating(true)
    try {
      // In a real implementation, would call path finding to get estimate
      // For now, show placeholder
      toast({
        title: 'Estimating',
        description: 'Calculating best swap path...'
      })

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock estimation (in real app, use actual path finding)
      const mockRate = 0.5 // Example: 1 XRP = 0.5 USD
      const estimated = (parseFloat(fromAmount) * mockRate).toFixed(6)
      setEstimatedReceive(estimated)

    } catch (error) {
      console.error('Estimation failed:', error)
      toast({
        title: 'Estimation Failed',
        description: 'Could not estimate swap amount',
        variant: 'destructive'
      })
    } finally {
      setIsEstimating(false)
    }
  }

  // Execute swap
  const handleSwap = async () => {
    if (!dexService) {
      toast({
        title: 'Not Ready',
        description: 'DEX service is initializing...',
        variant: 'destructive'
      })
      return
    }

    if (!fromAmount || !estimatedReceive) {
      toast({
        title: 'Missing Information',
        description: 'Please estimate the swap first',
        variant: 'destructive'
      })
      return
    }

    // Validate issuers for non-XRP currencies
    if (fromCurrency !== 'XRP' && !fromIssuer) {
      toast({
        title: 'Missing Issuer',
        description: `Issuer required for ${fromCurrency}`,
        variant: 'destructive'
      })
      return
    }

    if (toCurrency !== 'XRP' && !toIssuer) {
      toast({
        title: 'Missing Issuer',
        description: `Issuer required for ${toCurrency}`,
        variant: 'destructive'
      })
      return
    }

    setIsSwapping(true)

    try {
      // Service expects (wallet, params) - NOT params with wallet inside
      const result = await dexService.executeSwap(wallet, {
        fromCurrency,
        fromIssuer: fromCurrency === 'XRP' ? undefined : fromIssuer,
        toCurrency,
        toIssuer: toCurrency === 'XRP' ? undefined : toIssuer,
        amount: fromAmount,
        maxSlippage: parseFloat(maxSlippage)
      })

      toast({
        title: 'Swap Successful',
        description: `Swapped ${fromAmount} ${fromCurrency} for ${result.amountReceived} ${toCurrency}`
      })

      // Reset form
      setFromAmount('')
      setEstimatedReceive('')
      
      onSuccess?.()

    } catch (error) {
      console.error('Swap failed:', error)
      toast({
        title: 'Swap Failed',
        description: error instanceof Error ? error.message : 'Failed to execute swap',
        variant: 'destructive'
      })
    } finally {
      setIsSwapping(false)
    }
  }

  // Swap direction
  const handleSwapDirection = () => {
    const tempCurrency = fromCurrency
    const tempIssuer = fromIssuer
    const tempAmount = fromAmount

    setFromCurrency(toCurrency)
    setFromIssuer(toIssuer)
    setFromAmount(estimatedReceive)

    setToCurrency(tempCurrency)
    setToIssuer(tempIssuer)
    setEstimatedReceive(tempAmount)
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
          <Zap className="h-5 w-5" />
          Market Swap
        </CardTitle>
        <CardDescription>
          Instantly swap tokens at current market price
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* From Currency */}
        <div className="space-y-2">
          <Label>From</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Currency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="col-span-1"
            />
            <Input
              placeholder="Issuer (required for tokens)"
              value={fromIssuer}
              onChange={(e) => setFromIssuer(e.target.value)}
              className="col-span-2"
              disabled={fromCurrency === 'XRP'}
            />
          </div>
          <Input
            type="number"
            placeholder="0.00"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            onBlur={handleEstimate}
            step="0.000001"
            min="0"
          />
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapDirection}
            className="rounded-full"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* To Currency */}
        <div className="space-y-2">
          <Label>To (estimated)</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Currency"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="col-span-1"
            />
            <Input
              placeholder="Issuer (required for tokens)"
              value={toIssuer}
              onChange={(e) => setToIssuer(e.target.value)}
              className="col-span-2"
              disabled={toCurrency === 'XRP'}
            />
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={estimatedReceive}
              onChange={(e) => setEstimatedReceive(e.target.value)}
              step="0.000001"
              min="0"
              disabled
            />
            {isEstimating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Slippage Tolerance */}
        <div className="space-y-2">
          <Label htmlFor="slippage">
            Max Slippage Tolerance (%)
          </Label>
          <Select value={maxSlippage} onValueChange={setMaxSlippage}>
            <SelectTrigger id="slippage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5%</SelectItem>
              <SelectItem value="1">1%</SelectItem>
              <SelectItem value="2">2%</SelectItem>
              <SelectItem value="5">5%</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Transaction will revert if price changes unfavorably by more than this percentage
          </p>
        </div>

        {/* Swap Summary */}
        {fromAmount && estimatedReceive && (
          <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exchange Rate:</span>
              <span className="font-mono font-semibold">
                1 {fromCurrency} = {effectivePrice} {toCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Received:</span>
              <span className="font-mono">
                {(parseFloat(estimatedReceive) * (1 - parseFloat(maxSlippage) / 100)).toFixed(6)} {toCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Slippage:</span>
              <span className="font-semibold">{maxSlippage}%</span>
            </div>
          </div>
        )}

        {/* Warning for High Slippage */}
        {parseFloat(maxSlippage) > 2 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              High slippage tolerance! You may receive significantly less than estimated.
            </AlertDescription>
          </Alert>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-xs">
              <p><strong>Market Swap:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Executes immediately at current market price</li>
                <li>Price may change between estimate and execution</li>
                <li>Slippage tolerance protects against unfavorable price movements</li>
                <li>No order book placement - instant execution</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleEstimate}
          disabled={isEstimating || !fromAmount}
          className="flex-1"
        >
          {isEstimating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Estimating...
            </>
          ) : (
            'Get Estimate'
          )}
        </Button>
        
        <Button
          onClick={handleSwap}
          disabled={isSwapping || !estimatedReceive}
          className="flex-1"
        >
          {isSwapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Swapping...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Swap Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default DEXMarketSwap

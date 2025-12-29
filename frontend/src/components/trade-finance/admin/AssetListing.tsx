/**
 * Asset Listing Component
 * Admin interface for listing new commodities to the lending pool
 * Process: Select commodity → Set parameters → Review → Submit
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle2, Info, Plus, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Import API service
import { createTradeFinanceAPIService, TradeFinanceAPIService } from '@/services/trade-finance'

interface NewAssetParams {
  // Basic Info
  commodityType: string
  commodityName: string
  tokenAddress: string
  oracleAddress: string
  
  // Risk Parameters
  ltv: number
  liquidationThreshold: number
  liquidationBonus: number
  
  // Interest Rate Model
  baseInterestRate: number
  optimalUtilization: number
  slope1: number
  slope2: number
  
  // Caps & Limits
  supplyCap: string
  borrowCap: string
  
  // Advanced Options
  isIsolated: boolean
  debtCeiling: string
  borrowableInIsolation: string[] // Stablecoins
}

interface AssetListingProps {
  poolAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
  adminAddress?: string
  projectId: string
  apiBaseURL?: string
  onAssetListed?: (asset: NewAssetParams) => void
}

export function AssetListing({
  poolAddress = '0x...',
  chainId = 11155111,
  networkType = 'testnet',
  adminAddress,
  projectId,
  apiBaseURL,
  onAssetListed
}: AssetListingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [params, setParams] = useState<NewAssetParams>({
    commodityType: '',
    commodityName: '',
    tokenAddress: '',
    oracleAddress: '',
    ltv: 7000, // 70%
    liquidationThreshold: 7500, // 75%
    liquidationBonus: 800, // 8%
    baseInterestRate: 200, // 2%
    optimalUtilization: 80, // 80%
    slope1: 400, // 4%
    slope2: 6000, // 60%
    supplyCap: '10000000', // $10M
    borrowCap: '8000000', // $8M
    isIsolated: false,
    debtCeiling: '0',
    borrowableInIsolation: ['USDC', 'USDT', 'DAI']
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // API service state
  const [apiService, setApiService] = useState<TradeFinanceAPIService | null>(null)

  // Initialize API service
  useEffect(() => {
    if (!projectId) return
    
    const service = createTradeFinanceAPIService(projectId, apiBaseURL)
    setApiService(service)
  }, [projectId, apiBaseURL])

  // Commodity type options
  const commodityTypes = [
    { value: 'PRECIOUS_METAL', label: 'Precious Metal', example: 'Gold, Silver, Platinum' },
    { value: 'BASE_METAL', label: 'Base Metal', example: 'Copper, Aluminum, Steel' },
    { value: 'ENERGY', label: 'Energy', example: 'Oil, Gas, Coal' },
    { value: 'AGRICULTURAL', label: 'Agricultural', example: 'Wheat, Soybeans, Cotton' },
    { value: 'CARBON_CREDIT', label: 'Carbon Credits', example: 'VCS, Gold Standard' }
  ]

  // Stablecoin options for isolated borrowing
  const stablecoins = [
    { value: 'USDC', label: 'USD Coin (USDC)' },
    { value: 'USDT', label: 'Tether (USDT)' },
    { value: 'DAI', label: 'Dai (DAI)' }
  ]

  // Risk profile presets
  const riskPresets = {
    conservative: {
      label: 'Conservative (Low Risk)',
      ltv: 6000,
      liquidationThreshold: 7000,
      liquidationBonus: 1000
    },
    moderate: {
      label: 'Moderate (Medium Risk)',
      ltv: 7000,
      liquidationThreshold: 7500,
      liquidationBonus: 800
    },
    aggressive: {
      label: 'Aggressive (Higher Risk)',
      ltv: 8000,
      liquidationThreshold: 8500,
      liquidationBonus: 500
    }
  }

  const updateParam = (key: keyof NewAssetParams, value: any) => {
    setParams({ ...params, [key]: value })
  }

  const applyRiskPreset = (preset: keyof typeof riskPresets) => {
    const presetValues = riskPresets[preset]
    setParams({
      ...params,
      ltv: presetValues.ltv,
      liquidationThreshold: presetValues.liquidationThreshold,
      liquidationBonus: presetValues.liquidationBonus
    })
    toast.info(`Applied ${presetValues.label} preset`)
  }

  const toggleStablecoin = (stablecoin: string) => {
    const current = params.borrowableInIsolation
    const updated = current.includes(stablecoin)
      ? current.filter(s => s !== stablecoin)
      : [...current, stablecoin]
    updateParam('borrowableInIsolation', updated)
  }

  const validateStep1 = () => {
    if (!params.commodityType) return 'Please select commodity type'
    if (!params.commodityName) return 'Please enter commodity name'
    if (!params.tokenAddress || !params.tokenAddress.startsWith('0x')) return 'Invalid token address'
    if (!params.oracleAddress || !params.oracleAddress.startsWith('0x')) return 'Invalid oracle address'
    return null
  }

  const validateStep2 = () => {
    if (params.ltv >= params.liquidationThreshold) return 'LTV must be lower than liquidation threshold'
    if (params.ltv < 5000 || params.ltv > 9000) return 'LTV must be between 50-90%'
    if (params.liquidationThreshold < 6000 || params.liquidationThreshold > 9500) return 'Liquidation threshold must be between 60-95%'
    if (params.liquidationBonus < 100 || params.liquidationBonus > 1500) return 'Liquidation bonus must be between 1-15%'
    return null
  }

  const validateStep3 = () => {
    if (parseInt(params.supplyCap) <= 0) return 'Supply cap must be greater than 0'
    if (parseInt(params.borrowCap) <= 0) return 'Borrow cap must be greater than 0'
    if (parseInt(params.borrowCap) > parseInt(params.supplyCap)) return 'Borrow cap cannot exceed supply cap'
    if (params.isIsolated && parseInt(params.debtCeiling) <= 0) return 'Debt ceiling required for isolated assets'
    if (params.isIsolated && params.borrowableInIsolation.length === 0) return 'Select at least one borrowable stablecoin'
    return null
  }

  const handleNext = () => {
    let validation: string | null = null
    
    if (step === 1) validation = validateStep1()
    if (step === 2) validation = validateStep2()

    if (validation) {
      setError(validation)
      return
    }

    setError(null)
    if (step < 3) setStep((step + 1) as typeof step)
  }

  const handleBack = () => {
    setError(null)
    if (step > 1) setStep((step - 1) as typeof step)
  }

  const handleSubmit = async () => {
    const validation = validateStep3()
    if (validation) {
      setError(validation)
      return
    }

    if (!apiService) {
      setError('API service not initialized')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Call API to list new asset
      const result = await apiService.listAsset({
        commodityType: params.commodityType,
        commodityName: params.commodityName,
        tokenAddress: params.tokenAddress,
        oracleAddress: params.oracleAddress,
        ltv: params.ltv,
        liquidationThreshold: params.liquidationThreshold,
        liquidationBonus: params.liquidationBonus,
        baseInterestRate: params.baseInterestRate,
        optimalUtilization: params.optimalUtilization,
        slope1: params.slope1,
        slope2: params.slope2,
        supplyCap: params.supplyCap,
        borrowCap: params.borrowCap,
        isIsolated: params.isIsolated,
        debtCeiling: params.debtCeiling,
        borrowableInIsolation: params.borrowableInIsolation,
      })

      if (result.success) {
        setSuccess(true)
        toast.success(result.message || `${params.commodityName} listed successfully!`)

        if (onAssetListed) {
          onAssetListed(params)
        }

        // Reset after success
        setTimeout(() => {
          setStep(1)
          setParams({
            commodityType: '',
            commodityName: '',
            tokenAddress: '',
            oracleAddress: '',
            ltv: 7000,
            liquidationThreshold: 7500,
            liquidationBonus: 800,
            baseInterestRate: 200,
            optimalUtilization: 80,
            slope1: 400,
            slope2: 6000,
            supplyCap: '10000000',
            borrowCap: '8000000',
            isIsolated: false,
            debtCeiling: '0',
            borrowableInIsolation: ['USDC', 'USDT', 'DAI']
          })
          setSuccess(false)
        }, 3000)
      } else {
        throw new Error('Failed to list asset')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list asset'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const bpsToPercent = (bps: number) => (bps / 100).toFixed(2)
  const formatUSD = (amount: string) => `$${parseInt(amount).toLocaleString()}`

  // Success State
  if (success) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Asset Listed Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                {params.commodityName} has been added to the lending pool
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              List New Asset
            </CardTitle>
            <CardDescription>
              Add a new commodity to the lending pool
            </CardDescription>
          </div>
          <Badge variant="outline">
            Step {step} of 3
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                ${s === step ? 'bg-primary text-primary-foreground' : 
                  s < step ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}
              `}>
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`h-1 w-24 mx-2 ${s < step ? 'bg-green-600' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="commodityType">Commodity Type</Label>
                <Select value={params.commodityType} onValueChange={(v) => updateParam('commodityType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select commodity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {commodityTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex flex-col">
                          <span>{t.label}</span>
                          <span className="text-xs text-muted-foreground">{t.example}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commodityName">Commodity Name</Label>
                <Input
                  id="commodityName"
                  placeholder="e.g., Gold (GOLD)"
                  value={params.commodityName}
                  onChange={(e) => updateParam('commodityName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenAddress">Token Contract Address</Label>
                <Input
                  id="tokenAddress"
                  placeholder="0x..."
                  value={params.tokenAddress}
                  onChange={(e) => updateParam('tokenAddress', e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Address of the commodity token contract
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="oracleAddress">Price Oracle Address</Label>
                <Input
                  id="oracleAddress"
                  placeholder="0x..."
                  value={params.oracleAddress}
                  onChange={(e) => updateParam('oracleAddress', e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Chainlink or custom oracle for price feeds
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Ensure the token contract is verified and the oracle is actively updating prices. 
                These cannot be changed after listing.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Risk Parameters */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Risk Parameters</h3>
              <Select onValueChange={(v) => applyRiskPreset(v as keyof typeof riskPresets)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Apply preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ltv">Loan-to-Value (LTV)</Label>
                <Input
                  id="ltv"
                  type="number"
                  value={params.ltv}
                  onChange={(e) => updateParam('ltv', parseInt(e.target.value))}
                  min={5000}
                  max={9000}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  Current: {bpsToPercent(params.ltv)}% (50-90%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="liqThreshold">Liquidation Threshold</Label>
                <Input
                  id="liqThreshold"
                  type="number"
                  value={params.liquidationThreshold}
                  onChange={(e) => updateParam('liquidationThreshold', parseInt(e.target.value))}
                  min={6000}
                  max={9500}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  Current: {bpsToPercent(params.liquidationThreshold)}% (60-95%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="liqBonus">Liquidation Bonus</Label>
                <Input
                  id="liqBonus"
                  type="number"
                  value={params.liquidationBonus}
                  onChange={(e) => updateParam('liquidationBonus', parseInt(e.target.value))}
                  min={100}
                  max={1500}
                  step={50}
                />
                <p className="text-xs text-muted-foreground">
                  Current: {bpsToPercent(params.liquidationBonus)}% (1-15%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseRate">Base Interest Rate</Label>
                <Input
                  id="baseRate"
                  type="number"
                  value={params.baseInterestRate}
                  onChange={(e) => updateParam('baseInterestRate', parseInt(e.target.value))}
                  min={0}
                  max={1000}
                  step={25}
                />
                <p className="text-xs text-muted-foreground">
                  Current: {bpsToPercent(params.baseInterestRate)}% (0-10%)
                </p>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>Buffer Check:</strong> LTV to Liquidation Threshold buffer is {bpsToPercent(params.liquidationThreshold - params.ltv)}%. 
                Recommended: 5-10% for safety.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 3: Caps & Advanced */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Caps & Advanced Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplyCap">Supply Cap (USD)</Label>
                <Input
                  id="supplyCap"
                  type="number"
                  value={params.supplyCap}
                  onChange={(e) => updateParam('supplyCap', e.target.value)}
                  placeholder="10000000"
                />
                <p className="text-xs text-muted-foreground">
                  Current: {formatUSD(params.supplyCap)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="borrowCap">Borrow Cap (USD)</Label>
                <Input
                  id="borrowCap"
                  type="number"
                  value={params.borrowCap}
                  onChange={(e) => updateParam('borrowCap', e.target.value)}
                  placeholder="8000000"
                />
                <p className="text-xs text-muted-foreground">
                  Current: {formatUSD(params.borrowCap)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isIsolated"
                  checked={params.isIsolated}
                  onCheckedChange={(checked) => updateParam('isIsolated', checked)}
                />
                <Label htmlFor="isIsolated" className="cursor-pointer">
                  Enable Isolation Mode (for risky/new assets)
                </Label>
              </div>

              {params.isIsolated && (
                <div className="pl-6 space-y-4 border-l-2 border-amber-200">
                  <div className="space-y-2">
                    <Label htmlFor="debtCeiling">Debt Ceiling (USD)</Label>
                    <Input
                      id="debtCeiling"
                      type="number"
                      value={params.debtCeiling}
                      onChange={(e) => updateParam('debtCeiling', e.target.value)}
                      placeholder="5000000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum total debt for this isolated asset
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Borrowable Assets in Isolation</Label>
                    <div className="space-y-2">
                      {stablecoins.map(sc => (
                        <div key={sc.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={sc.value}
                            checked={params.borrowableInIsolation.includes(sc.value)}
                            onCheckedChange={() => toggleStablecoin(sc.value)}
                          />
                          <Label htmlFor={sc.value} className="cursor-pointer text-sm">
                            {sc.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm text-amber-900">
                      <strong>Isolation Mode:</strong> Users can only borrow selected stablecoins and cannot mix with other collateral.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Listing Asset...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  List Asset
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

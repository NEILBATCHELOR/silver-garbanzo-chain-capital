/**
 * Risk Parameter Control Component
 * Admin interface for adjusting risk parameters per commodity
 * Controls: LTV ratios, liquidation thresholds, interest rates, caps
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { AlertCircle, CheckCircle2, Info, Save, RotateCcw, TrendingUp, Shield, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CommodityRiskParams {
  commodityType: string
  commodityName: string
  // Loan-to-Value ratios (in basis points, 8000 = 80%)
  ltv: number
  liquidationThreshold: number
  liquidationBonus: number
  // Interest rates (in basis points, 500 = 5%)
  baseInterestRate: number
  optimalUtilization: number
  slope1: number
  slope2: number
  // Caps (in USD)
  supplyCap: string
  borrowCap: string
  // Status
  isActive: boolean
  isIsolated: boolean
  debtCeiling: string // For isolated assets
}

interface RiskParameterControlProps {
  poolAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
  adminAddress?: string
  onParameterUpdate?: (params: CommodityRiskParams) => void
}

export function RiskParameterControl({
  poolAddress = '0x...',
  chainId = 11155111,
  networkType = 'testnet',
  adminAddress,
  onParameterUpdate
}: RiskParameterControlProps) {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('')
  const [params, setParams] = useState<CommodityRiskParams | null>(null)
  const [originalParams, setOriginalParams] = useState<CommodityRiskParams | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Available commodities
  const commodities = [
    { value: 'GOLD', label: 'Gold (GOLD)' },
    { value: 'SILVER', label: 'Silver (SILVER)' },
    { value: 'OIL', label: 'Crude Oil (OIL)' },
    { value: 'WHEAT', label: 'Wheat (WHEAT)' },
    { value: 'CARBON', label: 'Carbon Credits (CARBON)' }
  ]

  // Load parameters when commodity selected
  useEffect(() => {
    if (!selectedCommodity) return

    const fetchParams = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // TODO: Replace with actual service call
        // const poolService = createCommodityPoolService(config)
        // const result = await poolService.getRiskParameters(selectedCommodity)

        // Mock data
        const mockParams: CommodityRiskParams = {
          commodityType: selectedCommodity,
          commodityName: commodities.find(c => c.value === selectedCommodity)?.label || '',
          ltv: selectedCommodity === 'GOLD' ? 8000 : selectedCommodity === 'OIL' ? 7000 : 6000,
          liquidationThreshold: selectedCommodity === 'GOLD' ? 8500 : selectedCommodity === 'OIL' ? 7500 : 7000,
          liquidationBonus: selectedCommodity === 'GOLD' ? 500 : selectedCommodity === 'OIL' ? 800 : 1000,
          baseInterestRate: 200, // 2%
          optimalUtilization: 80, // 80%
          slope1: 400, // 4%
          slope2: 6000, // 60%
          supplyCap: selectedCommodity === 'GOLD' ? '50000000' : '10000000',
          borrowCap: selectedCommodity === 'GOLD' ? '40000000' : '8000000',
          isActive: true,
          isIsolated: selectedCommodity === 'CARBON',
          debtCeiling: selectedCommodity === 'CARBON' ? '5000000' : '0'
        }

        setParams(mockParams)
        setOriginalParams(mockParams)
        setHasChanges(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load parameters'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchParams()
  }, [selectedCommodity])

  // Check for changes
  useEffect(() => {
    if (!params || !originalParams) {
      setHasChanges(false)
      return
    }

    const changed = JSON.stringify(params) !== JSON.stringify(originalParams)
    setHasChanges(changed)
  }, [params, originalParams])

  // Update parameter
  const updateParam = (key: keyof CommodityRiskParams, value: any) => {
    if (!params) return
    setParams({ ...params, [key]: value })
  }

  // Reset to original
  const handleReset = () => {
    if (originalParams) {
      setParams({ ...originalParams })
      setHasChanges(false)
      toast.info('Parameters reset to original values')
    }
  }

  // Save parameters
  const handleSave = async () => {
    if (!params || !adminAddress) {
      setError('Missing required parameters')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      // TODO: Replace with actual service call
      // const poolService = createCommodityPoolService(config)
      // await poolService.updateRiskParameters(params, privateKey)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      setOriginalParams(params)
      setHasChanges(false)
      toast.success('Risk parameters updated successfully')

      if (onParameterUpdate) {
        onParameterUpdate(params)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update parameters'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // Format basis points to percentage
  const bpsToPercent = (bps: number) => (bps / 100).toFixed(2)

  // Format USD amount
  const formatUSD = (amount: string) => {
    return `$${parseInt(amount).toLocaleString()}`
  }

  if (!selectedCommodity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Risk Parameter Control
          </CardTitle>
          <CardDescription>
            Adjust risk parameters for commodities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-10">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Select a commodity to adjust risk parameters
              </p>
              <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                <SelectTrigger className="w-[300px] mx-auto">
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Admin Only:</strong> Risk parameter changes affect all users and should be made carefully. 
                Ensure proper authorization and testing before applying to mainnet.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading parameters...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!params) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Risk Parameter Control
            </CardTitle>
            <CardDescription>
              Adjusting parameters for {params.commodityName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {commodities.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="lending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lending">Lending Params</TabsTrigger>
            <TabsTrigger value="interest">Interest Rates</TabsTrigger>
            <TabsTrigger value="caps">Caps & Limits</TabsTrigger>
          </TabsList>

          {/* Lending Parameters Tab */}
          <TabsContent value="lending" className="space-y-6">
            {/* LTV Ratio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="ltv">Loan-to-Value (LTV) Ratio</Label>
                <span className="text-sm font-semibold text-primary">
                  {bpsToPercent(params.ltv)}%
                </span>
              </div>
              <Slider
                id="ltv"
                value={[params.ltv]}
                onValueChange={([value]) => updateParam('ltv', value)}
                min={5000}
                max={9000}
                step={100}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum borrowing power relative to collateral value (50-90%)
              </p>
            </div>

            <Separator />

            {/* Liquidation Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="liquidationThreshold">Liquidation Threshold</Label>
                <span className="text-sm font-semibold text-orange-600">
                  {bpsToPercent(params.liquidationThreshold)}%
                </span>
              </div>
              <Slider
                id="liquidationThreshold"
                value={[params.liquidationThreshold]}
                onValueChange={([value]) => updateParam('liquidationThreshold', value)}
                min={6000}
                max={9500}
                step={100}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Point at which positions become liquidatable (60-95%)
              </p>
            </div>

            <Separator />

            {/* Liquidation Bonus */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="liquidationBonus">Liquidation Bonus</Label>
                <span className="text-sm font-semibold text-green-600">
                  {bpsToPercent(params.liquidationBonus)}%
                </span>
              </div>
              <Slider
                id="liquidationBonus"
                value={[params.liquidationBonus]}
                onValueChange={([value]) => updateParam('liquidationBonus', value)}
                min={100}
                max={1500}
                step={50}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Incentive for liquidators (1-15%)
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>Relationship:</strong> LTV must be lower than Liquidation Threshold. 
                Recommended buffer: 5-10%. Current buffer: {bpsToPercent(params.liquidationThreshold - params.ltv)}%
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Interest Rates Tab */}
          <TabsContent value="interest" className="space-y-6">
            {/* Base Interest Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="baseRate">Base Interest Rate</Label>
                <span className="text-sm font-semibold text-primary">
                  {bpsToPercent(params.baseInterestRate)}%
                </span>
              </div>
              <Slider
                id="baseRate"
                value={[params.baseInterestRate]}
                onValueChange={([value]) => updateParam('baseInterestRate', value)}
                min={0}
                max={1000}
                step={25}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Minimum interest rate at 0% utilization (0-10%)
              </p>
            </div>

            <Separator />

            {/* Optimal Utilization */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="optimalUtil">Optimal Utilization</Label>
                <span className="text-sm font-semibold text-primary">
                  {params.optimalUtilization}%
                </span>
              </div>
              <Slider
                id="optimalUtil"
                value={[params.optimalUtilization]}
                onValueChange={([value]) => updateParam('optimalUtilization', value)}
                min={50}
                max={95}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Target utilization rate (50-95%)
              </p>
            </div>

            <Separator />

            {/* Slope 1 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="slope1">Interest Rate Slope 1</Label>
                <span className="text-sm font-semibold text-primary">
                  {bpsToPercent(params.slope1)}%
                </span>
              </div>
              <Slider
                id="slope1"
                value={[params.slope1]}
                onValueChange={([value]) => updateParam('slope1', value)}
                min={100}
                max={2000}
                step={100}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Interest rate increase from base to optimal (1-20%)
              </p>
            </div>

            <Separator />

            {/* Slope 2 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="slope2">Interest Rate Slope 2</Label>
                <span className="text-sm font-semibold text-red-600">
                  {bpsToPercent(params.slope2)}%
                </span>
              </div>
              <Slider
                id="slope2"
                value={[params.slope2]}
                onValueChange={([value]) => updateParam('slope2', value)}
                min={1000}
                max={10000}
                step={500}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Steep increase above optimal utilization (10-100%)
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>Interest Rate Model:</strong> Base → (Base + Slope1) at optimal → (Base + Slope1 + Slope2) at 100%
                <br />
                Current: {bpsToPercent(params.baseInterestRate)}% → {bpsToPercent(params.baseInterestRate + params.slope1)}% → {bpsToPercent(params.baseInterestRate + params.slope1 + params.slope2)}%
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Caps & Limits Tab */}
          <TabsContent value="caps" className="space-y-6">
            {/* Supply Cap */}
            <div className="space-y-3">
              <Label htmlFor="supplyCap">Supply Cap (USD)</Label>
              <Input
                id="supplyCap"
                type="number"
                value={params.supplyCap}
                onChange={(e) => updateParam('supplyCap', e.target.value)}
                placeholder="50000000"
              />
              <p className="text-xs text-muted-foreground">
                Current: {formatUSD(params.supplyCap)} | Maximum total collateral value
              </p>
            </div>

            <Separator />

            {/* Borrow Cap */}
            <div className="space-y-3">
              <Label htmlFor="borrowCap">Borrow Cap (USD)</Label>
              <Input
                id="borrowCap"
                type="number"
                value={params.borrowCap}
                onChange={(e) => updateParam('borrowCap', e.target.value)}
                placeholder="40000000"
              />
              <p className="text-xs text-muted-foreground">
                Current: {formatUSD(params.borrowCap)} | Maximum total debt
              </p>
            </div>

            {params.isIsolated && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label htmlFor="debtCeiling">Debt Ceiling (Isolated Assets)</Label>
                  <Input
                    id="debtCeiling"
                    type="number"
                    value={params.debtCeiling}
                    onChange={(e) => updateParam('debtCeiling', e.target.value)}
                    placeholder="5000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {formatUSD(params.debtCeiling)} | Maximum debt for isolated asset
                  </p>
                </div>
              </>
            )}

            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-900">
                <strong>Important:</strong> Borrow Cap should be lower than Supply Cap × LTV. 
                Recommended: Supply Cap × {bpsToPercent(params.ltv)}% = {formatUSD((parseInt(params.supplyCap) * params.ltv / 10000).toString())}
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Changes
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Parameters
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Stablecoin Crypto Calculator Form
 * Crypto-backed stablecoin NAV calculator with over-collateralization and liquidation mechanisms
 * Domain-specific form that mirrors backend StablecoinCryptoCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, Shield, Zap, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/utils/shared/utils'

import { useCalculateNav } from '@/hooks/nav/useCalculateNav'
import { CalculatorFormProps } from './calculators.config'
import { 
  StablecoinCryptoFormData, 
  StablecoinCryptoCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Stablecoin Crypto validation schema
const stablecoinCryptoFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Token identification
  tokenName: z.string().min(1, "Token name is required"),
  tokenSymbol: z.string().min(1, "Token symbol is required").max(10),
  pegCurrency: z.enum(['USD', 'EUR', 'BTC', 'ETH', 'other']),
  protocol: z.string().min(1, "Protocol is required"),
  
  // Collateral mechanism
  collateralTokens: z.array(z.object({
    id: z.string().optional(),
    token: z.string().min(1, "Token is required")
  })).min(1, "At least one collateral token required"),
  overCollateralizationRatio: z.number().min(100, "Over-collateralization ratio must be at least 100%").max(500),
  liquidationRatio: z.number().min(100, "Liquidation ratio must be at least 100%").max(500),
  minimumCollateralRatio: z.number().min(100, "Minimum collateral ratio must be at least 100%").max(500),
  
  // Token metrics
  circulatingSupply: z.number().positive("Circulating supply must be positive"),
  totalSupply: z.number().positive("Total supply must be positive"),
  currentPrice: z.number().positive().optional(),
  
  // Protocol parameters
  stabilityFee: z.number().min(0).max(0.3, "Stability fee cannot exceed 30%"),
  mintFee: z.number().min(0).max(0.1).optional(),
  burnFee: z.number().min(0).max(0.1).optional(),
  governanceToken: z.string().optional(),
  
  // Risk parameters
  liquidationPenalty: z.number().min(0).max(0.5).optional(),
  auctionDuration: z.number().min(1).max(168).optional(), // 1-168 hours
  priceOracleSource: z.string().optional(),
  
  // Portfolio details
  tokenQuantity: z.number().positive("Token quantity must be positive"),
}).refine(data => {
  // Ensure circulating supply <= total supply
  return data.circulatingSupply <= data.totalSupply
}, {
  message: "Circulating supply cannot exceed total supply",
  path: ["circulatingSupply"]
}).refine(data => {
  // Ensure liquidation ratio < over-collateralization ratio
  return data.liquidationRatio < data.overCollateralizationRatio
}, {
  message: "Liquidation ratio must be less than over-collateralization ratio",
  path: ["liquidationRatio"]
}).refine(data => {
  // Ensure minimum collateral ratio <= liquidation ratio
  return data.minimumCollateralRatio <= data.liquidationRatio
}, {
  message: "Minimum collateral ratio must be less than or equal to liquidation ratio",
  path: ["minimumCollateralRatio"]
})

type StablecoinCryptoFormSchema = z.infer<typeof stablecoinCryptoFormSchema>

// Stablecoin Crypto Calculator Form implementation
export function StablecoinCryptoCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with stablecoin crypto-specific defaults
  const form = useForm<StablecoinCryptoFormSchema>({
    resolver: zodResolver(stablecoinCryptoFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      pegCurrency: 'USD',
      protocol: 'MakerDAO',
      collateralTokens: [{ token: 'ETH' }],
      overCollateralizationRatio: 150,
      liquidationRatio: 130,
      minimumCollateralRatio: 110,
      stabilityFee: 0.05,
      tokenQuantity: 1000,
      ...initialData
    }
  })

  // Handle dynamic collateral tokens array
  const { fields: collateralFields, append: addCollateral, remove: removeCollateral } = useFieldArray({
    control: form.control,
    name: "collateralTokens"
  })

  // Setup the calculation hook
  const {
    calculate,
    result,
    isLoading: isCalculating,
    reset: resetCalculation
  } = useCalculateNav({
    onSuccess: (result: CalculationResult) => {
      setIsSubmitting(false)
      onSubmit?.(result)
    },
    onError: (error) => {
      setIsSubmitting(false)
    }
  })

  // Handle form submission with domain-specific logic
  const handleSubmit = useCallback(async (data: StablecoinCryptoFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: StablecoinCryptoCalculationInput = {
      productType: AssetType.STABLECOIN_CRYPTO_BACKED,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Stablecoin-specific parameters
      tokenSymbol: data.tokenSymbol,
      tokenName: data.tokenName,
      pegCurrency: data.pegCurrency,
      collateral_tokens: data.collateralTokens.map(item => item.token),
      over_collateralization: data.overCollateralizationRatio / 100, // Convert to decimal
      liquidation_ratio: data.liquidationRatio / 100,
      stability_fee: data.stabilityFee,
      circulating_supply: data.circulatingSupply,
      protocol: data.protocol,
      governance_token: data.governanceToken,
      mint_fee: data.mintFee,
      burn_fee: data.burnFee,
      
      // Portfolio details
      sharesOutstanding: data.tokenQuantity
    }

    // Execute calculation with domain-specific input
    await calculate(calculationInput)
  }, [calculate])

  // Handle form reset
  const handleReset = useCallback(() => {
    form.reset()
    resetCalculation()
    setIsSubmitting(false)
    onReset?.()
  }, [form, resetCalculation, onReset])

  // Add collateral token
  const handleAddCollateral = useCallback(() => {
    addCollateral({ token: 'BTC' })
  }, [addCollateral])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="valuationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Valuation Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Token Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Token Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tokenName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Dai Stablecoin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokenSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Symbol *</FormLabel>
                  <FormControl>
                    <Input placeholder="DAI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="pegCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peg Currency *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select peg currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="protocol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Protocol *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="MakerDAO" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Collateral Mechanism Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Collateral Mechanism</h3>
          
          {/* Dynamic Collateral Tokens */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Collateral Tokens *</Label>
            {collateralFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`collateralTokens.${index}.token`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collateral token" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="BTC">WBTC</SelectItem>
                            <SelectItem value="LINK">LINK</SelectItem>
                            <SelectItem value="UNI">UNI</SelectItem>
                            <SelectItem value="COMP">COMP</SelectItem>
                            <SelectItem value="AAVE">AAVE</SelectItem>
                            <SelectItem value="YFI">YFI</SelectItem>
                            <SelectItem value="MATIC">MATIC</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {collateralFields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCollateral(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCollateral}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Collateral Token
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="overCollateralizationRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Over-collateralization *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="100"
                      max="500"
                      placeholder="150"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Collateral ratio as percentage</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="liquidationRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Liquidation Ratio *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="100"
                      max="500"
                      placeholder="130"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Liquidation threshold percentage</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="minimumCollateralRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Collateral Ratio *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="100"
                      max="500"
                      placeholder="110"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Minimum allowed ratio percentage</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Token Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Token Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="totalSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Supply *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="5000000000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Maximum token supply</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="circulatingSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circulating Supply *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="4000000000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Currently minted tokens</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currentPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      placeholder="1.0000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Current market price per token</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Protocol Parameters Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Protocol Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stabilityFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Stability Fee *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="0.3"
                      placeholder="0.05"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annual stability fee as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="governanceToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Governance Token</FormLabel>
                  <FormControl>
                    <Input placeholder="MKR" {...field} />
                  </FormControl>
                  <FormDescription>Protocol governance token symbol</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mintFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mint Fee</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="0.1"
                      placeholder="0.001"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Token minting fee as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="burnFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Burn Fee</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="0.1"
                      placeholder="0.001"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Token burning fee as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Risk Parameters Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Risk Parameters (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="liquidationPenalty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liquidation Penalty</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="0"
                      max="0.5"
                      placeholder="0.13"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Liquidation penalty as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="auctionDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auction Duration</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="1"
                      max="168"
                      placeholder="6"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Liquidation auction duration (hours)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priceOracleSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Oracle Source</FormLabel>
                  <FormControl>
                    <Input placeholder="Chainlink" {...field} />
                  </FormControl>
                  <FormDescription>Price oracle provider</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Portfolio Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Portfolio Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="tokenQuantity"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Token Quantity *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="1000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Number of tokens held in portfolio</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6">
          <Button 
            type="submit" 
            disabled={isLoading || isCalculating || isSubmitting}
            className="flex-1 max-w-xs"
          >
            {(isLoading || isCalculating || isSubmitting) ? 'Calculating...' : 'Calculate NAV'}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleReset}
            disabled={isLoading || isCalculating || isSubmitting}
          >
            Reset
          </Button>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </form>
    </Form>
  )
}

export default StablecoinCryptoCalculatorForm

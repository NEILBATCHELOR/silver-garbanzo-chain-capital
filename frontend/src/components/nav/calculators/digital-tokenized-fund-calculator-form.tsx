/**
 * Digital Tokenized Fund Calculator Form
 * Blockchain-based tokenized fund NAV calculator with DeFi yield features and underlying NAV tracking
 * Domain-specific form that mirrors backend DigitalTokenizedFundCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, Zap, Coins, Link } from 'lucide-react'

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
  DigitalTokenizedFundFormData, 
  DigitalTokenizedFundCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Digital Tokenized Fund validation schema
const digitalTokenizedFundFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Fund identification
  fundName: z.string().min(1, "Fund name is required"),
  fundManager: z.string().min(1, "Fund manager is required"),
  fundType: z.enum(['equity', 'bond', 'real_estate', 'commodity', 'mixed', 'crypto']),
  
  // Token details
  tokenSymbol: z.string().min(1, "Token symbol is required").max(10),
  tokenStandard: z.enum(['ERC-20', 'ERC-721', 'ERC-1155', 'ERC-1400', 'other']),
  blockchainNetwork: z.enum(['ethereum', 'polygon', 'bsc', 'avalanche', 'other']),
  contractAddress: z.string().optional(),
  
  // Token metrics
  totalSupply: z.number().positive("Total supply must be positive"),
  circulatingSupply: z.number().positive("Circulating supply must be positive"),
  currentTokenPrice: z.number().positive().optional(),
  underlyingNavPerToken: z.number().positive().optional(),
  
  // Fund metrics
  aum: z.number().positive("AUM must be positive"),
  managementFee: z.number().min(0).max(0.1, "Management fee must be between 0 and 10%"),
  performanceFee: z.number().min(0).max(0.3).optional(),
  redemptionFee: z.number().min(0).max(0.1).optional(),
  
  // Yield and rewards
  distributionYield: z.number().min(0).max(1).optional(),
  stakingRewards: z.number().min(0).max(1).optional(),
  stakingPeriod: z.number().min(0).max(365).optional(),
  
  // Liquidity
  dailyTradingVolume: z.number().min(0).optional(),
  liquidityPoolSize: z.number().min(0).optional(),
  exchangeListing: z.array(z.string()).optional(),
  
  // Portfolio details
  tokenQuantity: z.number().positive("Token quantity must be positive"),
}).refine(data => {
  // Ensure circulating supply <= total supply
  return data.circulatingSupply <= data.totalSupply
}, {
  message: "Circulating supply cannot exceed total supply",
  path: ["circulatingSupply"]
}).refine(data => {
  // Ensure staking period is provided if staking rewards are specified
  if (data.stakingRewards && data.stakingRewards > 0) {
    return data.stakingPeriod && data.stakingPeriod > 0
  }
  return true
}, {
  message: "Staking period must be provided when staking rewards are specified",
  path: ["stakingPeriod"]
})

type DigitalTokenizedFundFormSchema = z.infer<typeof digitalTokenizedFundFormSchema>

// Digital Tokenized Fund Calculator Form implementation
export function DigitalTokenizedFundCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with digital fund-specific defaults
  const form = useForm<DigitalTokenizedFundFormSchema>({
    resolver: zodResolver(digitalTokenizedFundFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      fundType: 'mixed',
      tokenStandard: 'ERC-20',
      blockchainNetwork: 'ethereum',
      totalSupply: 1000000,
      circulatingSupply: 800000,
      aum: 10000000,
      managementFee: 0.02,
      tokenQuantity: 1000,
      ...initialData
    }
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
  const handleSubmit = useCallback(async (data: DigitalTokenizedFundFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: DigitalTokenizedFundCalculationInput = {
      productType: AssetType.DIGITAL_TOKENIZED_FUNDS,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Digital tokenized fund-specific parameters
      fundName: data.fundName,
      tokenSymbol: data.tokenSymbol,
      tokenStandard: data.tokenStandard,
      blockchainNetwork: data.blockchainNetwork,
      totalSupply: data.totalSupply,
      circulatingSupply: data.circulatingSupply,
      tokenPrice: data.currentTokenPrice,
      underlyingNav: data.underlyingNavPerToken,
      managementFee: data.managementFee,
      performanceFee: data.performanceFee,
      redemptionFee: data.redemptionFee,
      liquidity: data.dailyTradingVolume,
      aum: data.aum,
      yield: data.distributionYield,
      stakingRewards: data.stakingRewards,
      
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

        {/* Fund Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Fund Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="fundName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="DeFi Index Token Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fundManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Manager *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digital Asset Management LLC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fundType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fund type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="bond">Bond</SelectItem>
                      <SelectItem value="real_estate">Real Estate</SelectItem>
                      <SelectItem value="commodity">Commodity</SelectItem>
                      <SelectItem value="mixed">Mixed Assets</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Token Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Token Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tokenSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Token Symbol *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="DTIF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokenStandard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Standard *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select token standard" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ERC-20">ERC-20</SelectItem>
                      <SelectItem value="ERC-721">ERC-721</SelectItem>
                      <SelectItem value="ERC-1155">ERC-1155</SelectItem>
                      <SelectItem value="ERC-1400">ERC-1400</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="blockchainNetwork"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Blockchain Network *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="bsc">Binance Smart Chain</SelectItem>
                      <SelectItem value="avalanche">Avalanche</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contractAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x1234...abcd" {...field} />
                  </FormControl>
                  <FormDescription>Smart contract address</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Token Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Token Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="totalSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Total Supply *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="1"
                      placeholder="1000000"
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
                      min="1"
                      placeholder="800000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Currently circulating tokens</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currentTokenPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Current Token Price
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="12.50"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Current market price per token</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="underlyingNavPerToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Underlying NAV per Token</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="12.25"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Net asset value per token</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Fund Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Fund Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="aum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    AUM *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1000"
                      min="0"
                      placeholder="10000000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Assets Under Management</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="managementFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Management Fee *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="0.1"
                      placeholder="0.02"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annual management fee as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="performanceFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Performance Fee</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="0"
                      max="0.3"
                      placeholder="0.2"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Performance fee as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="redemptionFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Redemption Fee</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="0.1"
                      placeholder="0.005"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Redemption fee as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Yield and Rewards Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Yield and Rewards (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="distributionYield"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Distribution Yield
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="0"
                      max="1"
                      placeholder="0.08"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Annual distribution yield as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="stakingRewards"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Staking Rewards
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="0"
                      max="1"
                      placeholder="0.12"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Annual staking rewards as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="stakingPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staking Period</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      max="365"
                      placeholder="90"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Staking lock-up period (days)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Liquidity Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Liquidity (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dailyTradingVolume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Daily Trading Volume
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1000"
                      min="0"
                      placeholder="500000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Average daily trading volume</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="liquidityPoolSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liquidity Pool Size</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1000"
                      min="0"
                      placeholder="2000000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Total liquidity pool value</FormDescription>
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
                  <FormDescription>Number of tokens held</FormDescription>
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

export default DigitalTokenizedFundCalculatorForm

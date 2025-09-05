/**
 * Quantitative Strategies Calculator Form
 * Quant strategies NAV with factor models and backtesting analysis
 * Domain-specific form that mirrors backend QuantitativeStrategiesCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, TrendingUp, Activity } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  QuantitativeStrategiesFormData, 
  QuantitativeStrategiesCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Quantitative strategies validation schema
const quantitativeStrategiesFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Strategy identification
  strategyName: z.string().min(1, "Strategy name is required"),
  strategyType: z.enum(['market_neutral', 'long_short', 'momentum', 'mean_reversion', 'arbitrage', 'factor', 'systematic_macro']),
  manager: z.string().min(1, "Manager is required"),
  
  // Fund characteristics
  aum: z.number().positive(),
  managementFee: z.number().min(0).max(1),
  performanceFee: z.number().min(0).max(1),
  highWaterMark: z.number().optional(),
  
  // Strategy parameters
  leverage: z.number().min(0),
  tradingFrequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  holdingPeriod: z.enum(['intraday', 'days', 'weeks', 'months']),
  
  // Performance metrics
  sharpeRatio: z.number().optional(),
  maxDrawdown: z.number().min(0).max(1).optional(),
  beta: z.number().optional(),
  alpha: z.number().optional(),
  correlation: z.number().min(-1).max(1).optional(),
  annualizedReturn: z.number().optional(),
  volatility: z.number().min(0),
  
  // Risk metrics
  var: z.number().optional(),
  expectedShortfall: z.number().optional(),
  
  // Data and execution
  dataSource: z.string().optional(),
  executionVenue: z.string().optional(),
  
  // Portfolio details
  investmentAmount: z.number().positive(),
}).refine(data => {
  // Max drawdown should be reasonable if provided
  if (data.maxDrawdown && data.maxDrawdown > 0.5) {
    return false
  }
  return true
}, {
  message: "Maximum drawdown should not exceed 50%",
  path: ["maxDrawdown"]
}).refine(data => {
  // Sharpe ratio should be reasonable if provided
  if (data.sharpeRatio && Math.abs(data.sharpeRatio) > 5) {
    return false
  }
  return true
}, {
  message: "Sharpe ratio should be between -5 and 5",
  path: ["sharpeRatio"]
}).refine(data => {
  // Volatility should be reasonable
  if (data.volatility > 2) {
    return false
  }
  return true
}, {
  message: "Volatility should not exceed 200%",
  path: ["volatility"]
})

type QuantitativeStrategiesFormSchema = z.infer<typeof quantitativeStrategiesFormSchema>

// Quantitative Strategies Calculator Form implementation with domain-specific logic
export function QuantitativeStrategiesCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with quantitative strategies-specific defaults
  const form = useForm<QuantitativeStrategiesFormSchema>({
    resolver: zodResolver(quantitativeStrategiesFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      strategyType: 'market_neutral',
      tradingFrequency: 'daily',
      holdingPeriod: 'days',
      aum: 100000000,
      managementFee: 0.02,
      performanceFee: 0.20,
      leverage: 2.0,
      volatility: 0.10,
      investmentAmount: 10000000,
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
  const handleSubmit = useCallback(async (data: QuantitativeStrategiesFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: QuantitativeStrategiesCalculationInput = {
      productType: AssetType.QUANT_STRATEGIES,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Quantitative strategies-specific parameters
      strategyType: data.strategyType,
      strategyName: data.strategyName,
      aum: data.aum,
      performanceFee: data.performanceFee,
      managementFee: data.managementFee,
      highWaterMark: data.highWaterMark,
      leverage: data.leverage,
      sharpeRatio: data.sharpeRatio,
      maxDrawdown: data.maxDrawdown,
      beta: data.beta,
      alpha: data.alpha,
      correlation: data.correlation,
      volatility: data.volatility,
      var: data.var,
      frequency: data.tradingFrequency,
      dataSource: data.dataSource,
      
      // Portfolio details
      sharesOutstanding: data.investmentAmount
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
                      <SelectItem value="CHF">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Strategy Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Strategy Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="strategyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Strategy Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Alpha Momentum Fund" {...field} />
                  </FormControl>
                  <FormDescription>Name of the quantitative strategy</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="strategyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="market_neutral">Market Neutral</SelectItem>
                      <SelectItem value="long_short">Long/Short Equity</SelectItem>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                      <SelectItem value="arbitrage">Arbitrage</SelectItem>
                      <SelectItem value="factor">Factor-Based</SelectItem>
                      <SelectItem value="systematic_macro">Systematic Macro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="manager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager *</FormLabel>
                  <FormControl>
                    <Input placeholder="Renaissance Technologies" {...field} />
                  </FormControl>
                  <FormDescription>Fund manager or management company</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Fund Characteristics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Fund Characteristics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      step="1"
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
                      max="1"
                      placeholder="0.02"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annual management fee (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="performanceFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Performance Fee *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.20"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Performance fee (% of profits, decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="highWaterMark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    High Water Mark
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="Optional"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Current high water mark for performance fees</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Strategy Parameters Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Strategy Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="leverage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Leverage *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Leverage ratio (times)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tradingFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Frequency *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="holdingPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Holding Period *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select holding period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="intraday">Intraday</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Performance Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Performance Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="sharpeRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sharpe Ratio</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="1.5"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Risk-adjusted return metric</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maxDrawdown"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Max Drawdown
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.05"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Maximum drawdown (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="volatility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Volatility *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="2"
                      placeholder="0.10"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annualized volatility (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="beta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beta</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.3"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Market beta</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="alpha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Alpha
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.05"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Annualized alpha (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="correlation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correlation</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="-1"
                      max="1"
                      placeholder="0.2"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Correlation to benchmark</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="annualizedReturn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Annualized Return
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.12"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Annualized return (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Risk Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Risk Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="var"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Value at Risk (95%)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="-0.03"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>95% confidence VaR (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expectedShortfall"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Expected Shortfall
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="-0.05"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Conditional Value at Risk (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Data and Execution Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Data and Execution</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dataSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Source</FormLabel>
                  <FormControl>
                    <Input placeholder="Bloomberg, Reuters" {...field} />
                  </FormControl>
                  <FormDescription>Primary data vendor</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="executionVenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Execution Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="Prime brokerage, DMA" {...field} />
                  </FormControl>
                  <FormDescription>Primary execution venue</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Portfolio Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Portfolio Details</h3>
          
          <FormField
            control={form.control}
            name="investmentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Investment Amount *
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="1"
                    min="0"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Total investment in the quantitative strategy</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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

export default QuantitativeStrategiesCalculatorForm
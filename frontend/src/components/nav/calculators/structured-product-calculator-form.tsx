/**
 * Structured Products Calculator Form
 * Structured products NAV with payoff modeling and scenario analysis
 * Domain-specific form that mirrors backend StructuredProductsCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, TrendingUp, BarChart3 } from 'lucide-react'

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
  StructuredProductsFormData, 
  StructuredProductsCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Structured products validation schema
const structuredProductsFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Product identification
  productName: z.string().min(1, "Product name is required"),
  productType: z.enum(['autocallable', 'barrier_option', 'bonus_certificate', 'capital_protection', 'tracker']),
  issuer: z.string().min(1, "Issuer is required"),
  
  // Underlying assets
  underlying: z.string().min(1, "Underlying asset is required"),
  underlyingType: z.enum(['equity', 'index', 'basket', 'fx', 'commodity', 'rates']),
  
  // Product terms
  maturityDate: z.date(),
  principalAmount: z.number().positive(),
  payoffStructure: z.string().min(1, "Payoff structure is required"),
  
  // Barrier and trigger levels
  barrier: z.number().min(0).max(2).optional(),
  knockIn: z.number().min(0).max(2).optional(),
  knockOut: z.number().min(0).max(2).optional(),
  
  // Participation and leverage
  coupon: z.number().min(0).optional(),
  participation: z.number().min(0),
  leverage: z.number().min(0).optional(),
  protection: z.number().min(0).max(1).optional(),
  
  // Market parameters
  currentUnderlyingPrice: z.number().positive(),
  volatility: z.number().min(0).max(2),
  riskFreeRate: z.number().min(0).max(1),
  dividendYield: z.number().min(0).max(1).optional(),
  correlation: z.number().min(-1).max(1).optional(),
  
  // Portfolio details
  notionalAmount: z.number().positive(),
}).refine(data => {
  // Maturity date must be in the future
  return data.maturityDate > data.valuationDate
}, {
  message: "Maturity date must be after valuation date",
  path: ["maturityDate"]
}).refine(data => {
  // Barrier levels should be logical
  if (data.barrier && data.knockIn) {
    return Math.abs(data.barrier - data.knockIn) <= 0.5 // Reasonable proximity
  }
  return true
}, {
  message: "Barrier and knock-in levels should be reasonably close",
  path: ["barrier"]
}).refine(data => {
  // Correlation is only relevant for basket products
  if (data.underlyingType === 'basket' && data.correlation === undefined) {
    return false
  }
  return true
}, {
  message: "Correlation is required for basket products",
  path: ["correlation"]
})

type StructuredProductsFormSchema = z.infer<typeof structuredProductsFormSchema>

// Structured Products Calculator Form implementation with domain-specific logic
export function StructuredProductCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with structured products-specific defaults
  const form = useForm<StructuredProductsFormSchema>({
    resolver: zodResolver(structuredProductsFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      productType: 'autocallable',
      underlyingType: 'index',
      principalAmount: 1000000,
      participation: 1.0,
      volatility: 0.20,
      riskFreeRate: 0.03,
      currentUnderlyingPrice: 100,
      notionalAmount: 1000000,
      payoffStructure: 'Autocallable with memory coupon',
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
  const handleSubmit = useCallback(async (data: StructuredProductsFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: StructuredProductsCalculationInput = {
      productType: AssetType.STRUCTURED_PRODUCTS,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Structured products-specific parameters
      underlying: data.underlying,
      barrier: data.barrier,
      knockIn: data.knockIn,
      knockOut: data.knockOut,
      coupon: data.coupon,
      participation: data.participation,
      leverage: data.leverage,
      protection: data.protection,
      maturityDate: data.maturityDate,
      payoffStructure: data.payoffStructure,
      volatility: data.volatility,
      correlation: data.correlation,
      dividendYield: data.dividendYield,
      
      // Portfolio details
      sharesOutstanding: data.notionalAmount
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

        {/* Product Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Product Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="S&P 500 Autocallable Note" {...field} />
                  </FormControl>
                  <FormDescription>Name of the structured product</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="autocallable">Autocallable</SelectItem>
                      <SelectItem value="barrier_option">Barrier Option</SelectItem>
                      <SelectItem value="bonus_certificate">Bonus Certificate</SelectItem>
                      <SelectItem value="capital_protection">Capital Protection</SelectItem>
                      <SelectItem value="tracker">Tracker Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="issuer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issuer *</FormLabel>
                  <FormControl>
                    <Input placeholder="Goldman Sachs" {...field} />
                  </FormControl>
                  <FormDescription>Issuing financial institution</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Underlying Assets Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Underlying Assets</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="underlying"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Underlying Asset *</FormLabel>
                  <FormControl>
                    <Input placeholder="S&P 500 Index" {...field} />
                  </FormControl>
                  <FormDescription>Name or identifier of underlying asset</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="underlyingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Underlying Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select underlying type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="equity">Single Equity</SelectItem>
                      <SelectItem value="index">Index</SelectItem>
                      <SelectItem value="basket">Basket of Assets</SelectItem>
                      <SelectItem value="fx">Foreign Exchange</SelectItem>
                      <SelectItem value="commodity">Commodity</SelectItem>
                      <SelectItem value="rates">Interest Rates</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Product Terms Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Terms</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="maturityDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Maturity Date *</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick maturity date"}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date <= new Date()}
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
              name="principalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Principal Amount *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Notional principal amount</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payoffStructure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payoff Structure *</FormLabel>
                  <FormControl>
                    <Input placeholder="Autocallable with memory coupon" {...field} />
                  </FormControl>
                  <FormDescription>Description of payoff mechanism</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Barriers and Triggers Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Barriers and Trigger Levels</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="barrier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Barrier Level
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="2"
                      placeholder="0.65"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Barrier as % of initial level (e.g., 0.65 for 65%)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="knockIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Knock-In Level
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="2"
                      placeholder="0.70"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Knock-in trigger level</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="knockOut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Knock-Out Level</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="2"
                      placeholder="1.00"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Knock-out trigger level</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Participation and Leverage Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Participation and Leverage</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="coupon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Coupon
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="100"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Coupon amount or rate</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="participation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Participation *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="1.00"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Participation rate (e.g., 1.0 for 100%)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="leverage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leverage</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="1.5"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Leverage factor</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="protection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Protection
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.85"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Principal protection (e.g., 0.85 for 85%)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Market Parameters Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Market Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="currentUnderlyingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Current Price *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Current underlying asset price</FormDescription>
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
                      placeholder="0.20"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Implied volatility (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="riskFreeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Risk-Free Rate *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="1"
                      placeholder="0.03"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Risk-free interest rate (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dividendYield"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Dividend Yield
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="1"
                      placeholder="0.02"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Dividend yield of underlying (decimal)</FormDescription>
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
                      placeholder="0.70"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Correlation for basket products</FormDescription>
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
            name="notionalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Notional Amount *
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
                <FormDescription>Total notional exposure to the structured product</FormDescription>
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

export default StructuredProductCalculatorForm
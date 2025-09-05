/**
 * Equity Calculator Form
 * Domain-specific NAV calculator for equity assets with market data integration
 */

import { useState, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, CalendarDays, TrendingUp, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useEquityCalculateNav } from '@/hooks/nav/useCalculateNav'
import { AssetType } from '@/types/nav'
import { EquityFormData, EquityCalculationInput } from '@/types/nav/calculator-inputs'
import { CalculatorFormProps } from './calculators.config'

// Zod validation schema for equity calculator
const equityFormSchema = z.object({
  // Required fields
  valuationDate: z.date({
    required_error: 'Valuation date is required'
  }),
  targetCurrency: z.string().min(3, 'Currency must be at least 3 characters'),
  
  // Equity identification
  tickerSymbol: z.string().min(1, 'Ticker symbol is required'),
  companyName: z.string().optional(),
  exchange: z.string().min(1, 'Exchange is required'),
  cusip: z.string().optional(),
  isin: z.string().optional(),
  
  // Market data
  lastTradePrice: z.number().positive().optional(),
  bidPrice: z.number().positive().optional(),
  askPrice: z.number().positive().optional(),
  marketCap: z.number().positive().optional(),
  
  // Company metrics
  sharesOutstanding: z.number().positive('Shares outstanding must be positive'),
  dividendYield: z.number().min(0).max(100).optional(),
  peRatio: z.number().positive().optional(),
  beta: z.number().optional(),
  
  // Classification
  sector: z.string().optional(),
  industry: z.string().optional(),
  
  // Portfolio details
  quantity: z.number().positive('Quantity must be positive'),
}).refine((data) => {
  // At least one price must be provided
  return data.lastTradePrice || data.bidPrice || data.askPrice
}, {
  message: 'At least one price (last trade, bid, or ask) must be provided',
  path: ['lastTradePrice']
})

type EquityFormValues = z.infer<typeof equityFormSchema>

export function EquityCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isCalculating, setIsCalculating] = useState(false)

  // Setup domain-specific calculation hook
  const { calculate, result, error: calcError } = useEquityCalculateNav({
    onSuccess: (result) => {
      setIsCalculating(false)
      onSubmit?.(result)
    },
    onError: (error) => {
      setIsCalculating(false)
      console.error('Equity calculation failed:', error)
    }
  })

  // Setup form with validation
  const form = useForm<EquityFormValues>({
    resolver: zodResolver(equityFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      exchange: '',
      tickerSymbol: '',
      sharesOutstanding: undefined,
      quantity: undefined,
      ...initialData
    }
  })

  const handleSubmit = useCallback(async (data: EquityFormValues) => {
    setIsCalculating(true)
    
    // Convert form data to calculation input
    const calculationInput: EquityCalculationInput = {
      // Base fields
      productType: AssetType.EQUITY,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Equity-specific fields
      tickerSymbol: data.tickerSymbol,
      exchange: data.exchange,
      lastTradePrice: data.lastTradePrice,
      bidPrice: data.bidPrice,
      askPrice: data.askPrice,
      marketCap: data.marketCap,
      sharesOutstanding: data.sharesOutstanding,
      dividendYield: data.dividendYield,
      peRatio: data.peRatio,
      beta: data.beta,
      sector: data.sector,
      industry: data.industry
    }

    await calculate(calculationInput)
  }, [calculate])

  const handleReset = useCallback(() => {
    form.reset()
    setIsCalculating(false)
    onReset?.()
  }, [form, onReset])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Equity NAV Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate NAV for equity securities with market price integration and dividend adjustments
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Basic Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valuationDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valuation Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Date for NAV calculation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Currency</FormLabel>
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
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Equity Identification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                EQUITY IDENTIFICATION
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="tickerSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., AAPL" {...field} className="uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="exchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select exchange" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                          <SelectItem value="NYSE">NYSE</SelectItem>
                          <SelectItem value="LSE">London Stock Exchange</SelectItem>
                          <SelectItem value="TSE">Tokyo Stock Exchange</SelectItem>
                          <SelectItem value="EURONEXT">Euronext</SelectItem>
                          <SelectItem value="TSX">Toronto Stock Exchange</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Apple Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cusip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CUSIP</FormLabel>
                      <FormControl>
                        <Input placeholder="9-character identifier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISIN</FormLabel>
                      <FormControl>
                        <Input placeholder="12-character identifier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Market Data */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">MARKET DATA</div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="lastTradePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Trade Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Most recent trade price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bidPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bid Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Highest bid price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="askPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ask Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Lowest ask price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Company Metrics */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">COMPANY METRICS</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sharesOutstanding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shares Outstanding *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Total shares outstanding</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Shares held in portfolio</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="dividendYield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dividend Yield (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="peRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>P/E Ratio</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
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
                          placeholder="1.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="marketCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Cap</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sector</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Technology" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Consumer Electronics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || isCalculating}
              >
                {isCalculating ? (
                  <>
                    <CalendarDays className="mr-2 h-4 w-4 animate-spin" />
                    Calculating NAV...
                  </>
                ) : (
                  'Calculate NAV'
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading || isCalculating}
              >
                Reset
              </Button>
            </div>
            
            {/* Error Display */}
            {(error || calcError) && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  {error || (calcError ? calcError.message : 'An error occurred')}
                </p>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default EquityCalculatorForm

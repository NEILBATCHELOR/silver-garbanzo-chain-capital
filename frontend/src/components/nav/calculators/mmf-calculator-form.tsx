/**
 * Money Market Fund Calculator Form
 * Domain-specific NAV calculator for money market funds with yield analysis
 */

import { useState, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, CalendarDays, Banknote, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useMmfCalculateNav } from '@/hooks/nav/useCalculateNav'
import { AssetType } from '@/types/nav'
import { MmfFormData, MmfCalculationInput } from '@/types/nav/calculator-inputs'
import { CalculatorFormProps } from './calculators.config'

// Zod validation schema for MMF calculator
const mmfFormSchema = z.object({
  // Required fields
  valuationDate: z.date({
    required_error: 'Valuation date is required'
  }),
  targetCurrency: z.string().min(3, 'Currency must be at least 3 characters'),
  
  // Fund identification
  fundName: z.string().min(1, 'Fund name is required'),
  fundFamily: z.string().optional(),
  fundSymbol: z.string().optional(),
  
  // Fund characteristics
  sevenDayYield: z.number().min(0).max(100, 'Seven-day yield must be between 0-100%'),
  expenseRatio: z.number().min(0).max(10, 'Expense ratio must be between 0-10%'),
  averageMaturity: z.number().positive('Average maturity must be positive'),
  pricePerShare: z.number().positive('Price per share must be positive'),
  dividendRate: z.number().min(0).optional(),
  
  // Compliance
  complianceType: z.enum(['government', 'prime', 'municipal'], {
    required_error: 'Compliance type is required'
  }),
  
  // Assets
  netAssets: z.number().positive('Net assets must be positive'),
  sharesOutstanding: z.number().positive('Shares outstanding must be positive'),
  
  // Portfolio details
  shareQuantity: z.number().positive('Share quantity must be positive'),
})

type MmfFormValues = z.infer<typeof mmfFormSchema>

export function MmfCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isCalculating, setIsCalculating] = useState(false)

  // Setup domain-specific calculation hook
  const { calculate, result, error: calcError } = useMmfCalculateNav({
    onSuccess: (result) => {
      setIsCalculating(false)
      onSubmit?.(result)
    },
    onError: (error) => {
      setIsCalculating(false)
      console.error('MMF calculation failed:', error)
    }
  })

  // Setup form with validation
  const form = useForm<MmfFormValues>({
    resolver: zodResolver(mmfFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      complianceType: 'prime',
      pricePerShare: 1.00, // MMFs typically maintain $1 NAV
      ...initialData
    }
  })

  const handleSubmit = useCallback(async (data: MmfFormValues) => {
    setIsCalculating(true)
    
    // Convert form data to calculation input
    const calculationInput: MmfCalculationInput = {
      // Base fields
      productType: AssetType.MMF,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // MMF-specific fields
      fundName: data.fundName,
      fundFamily: data.fundFamily,
      sevenDayYield: data.sevenDayYield,
      expenseRatio: data.expenseRatio,
      averageMaturity: data.averageMaturity,
      netAssets: data.netAssets,
      pricePerShare: data.pricePerShare,
      dividendRate: data.dividendRate,
      complianceType: data.complianceType,
      sharesOutstanding: data.sharesOutstanding
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
          <Banknote className="h-5 w-5 text-primary" />
          <CardTitle>Money Market Fund NAV Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate NAV for money market funds with yield curve analysis and maturity considerations
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fund Identification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building className="h-4 w-4" />
                FUND IDENTIFICATION
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fundName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Prime Money Market Fund" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fundFamily"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Family</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Vanguard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fundSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., VMMXX" {...field} className="uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Fund Characteristics */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">FUND CHARACTERISTICS</div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sevenDayYield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seven-Day Yield (%) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>SEC yield over 7 days</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expenseRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Ratio (%) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Annual expense ratio</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="averageMaturity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Maturity (days) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Weighted average maturity</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerShare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per Share *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="1.0000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Typically $1.00 for MMFs</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dividendRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dividend Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Current dividend rate</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="complianceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compliance Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="prime">Prime</SelectItem>
                          <SelectItem value="municipal">Municipal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Rule 2a-7 classification</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Assets and Portfolio */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">ASSETS & PORTFOLIO</div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="netAssets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Assets *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Total net assets of fund</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Total shares outstanding</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="shareQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Shares held in portfolio</FormDescription>
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

export default MmfCalculatorForm

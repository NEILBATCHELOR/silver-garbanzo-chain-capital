/**
 * Private Equity Calculator Form
 * Private equity NAV calculator with fund performance metrics (IRR, DPI, RVPI, TVPI)
 * Domain-specific form that mirrors backend PrivateEquityCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, TrendingUp, Building2 } from 'lucide-react'

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
  PrivateEquityFormData, 
  PrivateEquityCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Private Equity validation schema
const privateEquityFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Fund identification
  fundName: z.string().min(1, "Fund name is required"),
  fundType: z.enum(['buyout', 'growth', 'venture', 'distressed', 'secondary', 'fund_of_funds']),
  vintage: z.number().min(1990).max(2040, "Vintage year must be realistic"),
  generalPartner: z.string().min(1, "General partner is required"),
  
  // Fund characteristics
  fundSize: z.number().positive("Fund size must be positive"),
  commitmentAmount: z.number().positive("Commitment amount must be positive"),
  calledAmount: z.number().min(0, "Called amount cannot be negative"),
  distributedAmount: z.number().min(0).optional(),
  navReported: z.number().min(0).optional(),
  lastReportingDate: z.date().optional(),
  
  // Strategy
  investmentStrategy: z.string().min(1, "Investment strategy is required"),
  geographicFocus: z.string().optional(),
  industryFocus: z.string().optional(),
  
  // Performance metrics
  irr: z.number().min(-1).max(5).optional(), // -100% to 500%
  multiple: z.number().min(0).max(10).optional(),
  dpi: z.number().min(0).max(5).optional(), // Distributed to Paid-In
  rvpi: z.number().min(0).max(10).optional(), // Residual Value to Paid-In
  tvpi: z.number().min(0).max(15).optional(), // Total Value to Paid-In
  
  // Portfolio details
  ownershipPercentage: z.number().min(0).max(100, "Ownership percentage must be between 0 and 100"),
}).refine(data => {
  // Ensure called amount <= commitment amount
  return data.calledAmount <= data.commitmentAmount
}, {
  message: "Called amount cannot exceed commitment amount",
  path: ["calledAmount"]
}).refine(data => {
  // Ensure last reporting date is not in the future
  return !data.lastReportingDate || data.lastReportingDate <= new Date()
}, {
  message: "Last reporting date cannot be in the future",
  path: ["lastReportingDate"]
}).refine(data => {
  // If DPI and RVPI are provided, validate TVPI calculation
  if (data.dpi && data.rvpi && data.tvpi) {
    const calculatedTvpi = data.dpi + data.rvpi
    return Math.abs(data.tvpi - calculatedTvpi) < 0.01 // Allow small rounding differences
  }
  return true
}, {
  message: "TVPI should equal DPI + RVPI",
  path: ["tvpi"]
})

type PrivateEquityFormSchema = z.infer<typeof privateEquityFormSchema>

// Private Equity Calculator Form implementation
export function PrivateEquityCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with private equity-specific defaults
  const form = useForm<PrivateEquityFormSchema>({
    resolver: zodResolver(privateEquityFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      fundType: 'buyout',
      vintage: 2020,
      fundSize: 500000000, // $500M
      commitmentAmount: 10000000, // $10M
      calledAmount: 7000000, // $7M
      investmentStrategy: 'Mid-market buyout',
      ownershipPercentage: 1.0,
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
  const handleSubmit = useCallback(async (data: PrivateEquityFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: PrivateEquityCalculationInput = {
      productType: AssetType.PRIVATE_EQUITY,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Private equity-specific parameters
      fundName: data.fundName,
      fundType: data.fundType,
      vintage: data.vintage,
      fundSize: data.fundSize,
      commitmentAmount: data.commitmentAmount,
      calledAmount: data.calledAmount,
      distributedAmount: data.distributedAmount,
      navReported: data.navReported,
      lastReportingDate: data.lastReportingDate,
      generalPartner: data.generalPartner,
      investmentStrategy: data.investmentStrategy,
      geographicFocus: data.geographicFocus,
      industryFocus: data.industryFocus,
      irr: data.irr,
      multiple: data.multiple,
      dpi: data.dpi,
      rvpi: data.rvpi,
      tvpi: data.tvpi,
      
      // Portfolio details
      sharesOutstanding: data.ownershipPercentage
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
          <h3 className="text-lg font-medium">Fund Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fundName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Apollo Investment Fund VIII" {...field} />
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
                      <SelectItem value="buyout">Buyout</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="venture">Venture Capital</SelectItem>
                      <SelectItem value="distressed">Distressed</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="fund_of_funds">Fund of Funds</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vintage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vintage Year *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1990"
                      max="2040"
                      placeholder="2020"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Fund vintage year</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="generalPartner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    General Partner *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Apollo Global Management" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Fund Characteristics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Fund Characteristics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fundSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fund Size *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1000000"
                      min="0"
                      placeholder="500000000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Total fund size in target currency</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="commitmentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Commitment Amount *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="100000"
                      min="0"
                      placeholder="10000000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Total committed amount</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="calledAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Called Amount *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="100000"
                      min="0"
                      placeholder="7000000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Amount called by GP to date</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="distributedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distributed Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="100000"
                      min="0"
                      placeholder="2000000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Total distributions received</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="navReported"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reported NAV</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="100000"
                      min="0"
                      placeholder="8500000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Last reported NAV from GP</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastReportingDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Last Reporting Date</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick reporting date"}
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
          </div>
        </div>

        {/* Strategy Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Investment Strategy</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="investmentStrategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment Strategy *</FormLabel>
                  <FormControl>
                    <Input placeholder="Mid-market buyouts in North America" {...field} />
                  </FormControl>
                  <FormDescription>Brief description of investment strategy</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="geographicFocus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geographic Focus</FormLabel>
                  <FormControl>
                    <Input placeholder="North America, Europe" {...field} />
                  </FormControl>
                  <FormDescription>Primary geographic markets</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="industryFocus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry Focus</FormLabel>
                  <FormControl>
                    <Input placeholder="Technology, Healthcare, Consumer" {...field} />
                  </FormControl>
                  <FormDescription>Target industries or sectors</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Performance Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Performance Metrics (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="irr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    IRR
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="-1"
                      max="5"
                      placeholder="0.15"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Internal Rate of Return (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="multiple"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cash Multiple</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="1.5"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Cash-on-cash multiple</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tvpi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TVPI</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="15"
                      placeholder="1.35"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Total Value to Paid-In</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dpi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DPI</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="5"
                      placeholder="0.25"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Distributed to Paid-In</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rvpi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RVPI</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="1.10"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Residual Value to Paid-In</FormDescription>
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
              name="ownershipPercentage"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Ownership Percentage *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="1.0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Ownership percentage in the fund (%)</FormDescription>
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

export default PrivateEquityCalculatorForm

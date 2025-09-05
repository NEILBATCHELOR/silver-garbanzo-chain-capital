/**
 * Real Estate Calculator Form
 * Real estate NAV calculator with property details, income approach valuation, and cap rates
 * Domain-specific form that mirrors backend RealEstateCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, Building, MapPin } from 'lucide-react'

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
  RealEstateFormData, 
  RealEstateCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Real Estate validation schema
const realEstateFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Property identification
  propertyAddress: z.string().min(1, "Property address is required"),
  propertyType: z.enum(['office', 'retail', 'industrial', 'multifamily', 'hotel', 'mixed_use']),
  squareFootage: z.number().positive("Square footage must be positive"),
  location: z.string().min(1, "Location is required"),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear() + 5),
  
  // Valuation inputs
  lastAppraisalValue: z.number().positive().optional(),
  appraisalDate: z.date().optional(),
  
  // Income approach
  annualRentalIncome: z.number().min(0, "Annual rental income cannot be negative"),
  operatingExpenses: z.number().min(0, "Operating expenses cannot be negative"),
  capRate: z.number().min(0).max(1, "Cap rate must be between 0 and 1"),
  occupancyRate: z.number().min(0).max(1, "Occupancy rate must be between 0 and 1"),
  marketRentPsf: z.number().positive().optional(),
  
  // Portfolio details
  ownershipPercentage: z.number().min(0).max(100, "Ownership percentage must be between 0 and 100"),
}).refine(data => {
  // Ensure appraisal date is not in the future
  return !data.appraisalDate || data.appraisalDate <= new Date()
}, {
  message: "Appraisal date cannot be in the future",
  path: ["appraisalDate"]
}).refine(data => {
  // Ensure net operating income is positive if both rental income and expenses are provided
  if (data.annualRentalIncome > 0 && data.operatingExpenses >= 0) {
    return data.annualRentalIncome > data.operatingExpenses
  }
  return true
}, {
  message: "Annual rental income must exceed operating expenses",
  path: ["annualRentalIncome"]
})

type RealEstateFormSchema = z.infer<typeof realEstateFormSchema>

// Real Estate Calculator Form implementation
export function RealEstateCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with real estate-specific defaults
  const form = useForm<RealEstateFormSchema>({
    resolver: zodResolver(realEstateFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      propertyType: 'office',
      squareFootage: 10000,
      yearBuilt: 2020,
      capRate: 0.06,
      occupancyRate: 0.95,
      ownershipPercentage: 100,
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
  const handleSubmit = useCallback(async (data: RealEstateFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: RealEstateCalculationInput = {
      productType: AssetType.REAL_ESTATE,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Real estate-specific parameters
      propertyType: data.propertyType,
      squareFootage: data.squareFootage,
      location: data.location,
      yearBuilt: data.yearBuilt,
      lastAppraisalValue: data.lastAppraisalValue,
      appraisalDate: data.appraisalDate,
      rentalIncome: data.annualRentalIncome,
      operatingExpenses: data.operatingExpenses,
      capRate: data.capRate,
      occupancyRate: data.occupancyRate,
      marketRentPsf: data.marketRentPsf,
      
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

        {/* Property Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Property Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="propertyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Property Address *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street, New York, NY 10001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Property Type *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="multifamily">Multifamily</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="mixed_use">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="Manhattan, New York" {...field} />
                  </FormControl>
                  <FormDescription>City, state, or market area</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="squareFootage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Square Footage *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="1"
                      placeholder="10000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Total rentable square feet</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="yearBuilt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year Built *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1800"
                      max={new Date().getFullYear() + 5}
                      placeholder="2020"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Valuation Inputs Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Valuation Inputs (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="lastAppraisalValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Last Appraisal Value
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1000"
                      min="0"
                      placeholder="5000000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Most recent appraisal value</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="appraisalDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Appraisal Date</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick appraisal date"}
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

        {/* Income Approach Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Income Approach</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="annualRentalIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Annual Rental Income *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1000"
                      min="0"
                      placeholder="500000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Gross annual rental income</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="operatingExpenses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Operating Expenses *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1000"
                      min="0"
                      placeholder="150000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annual operating expenses</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="capRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Cap Rate *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="1"
                      placeholder="0.06"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Capitalization rate as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="occupancyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Occupancy Rate *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.95"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Current occupancy rate as decimal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="marketRentPsf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Rent PSF</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="45.00"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Market rent per square foot annually</FormDescription>
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
                      placeholder="100"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Ownership percentage of the property (%)</FormDescription>
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

export default RealEstateCalculatorForm

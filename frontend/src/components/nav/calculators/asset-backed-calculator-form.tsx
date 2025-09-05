/**
 * Asset-Backed Securities Calculator Form
 * ABS NAV with tranching analysis and credit enhancement modeling
 * Domain-specific form that mirrors backend AssetBackedCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, TrendingDown, Shield } from 'lucide-react'

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
  AssetBackedFormData, 
  AssetBackedCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Asset-Backed validation schema
const assetBackedFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Security identification
  assetNumber: z.string().optional(),
  securityName: z.string().optional(),
  underlyingAssetType: z.string().optional(),
  
  // Pool characteristics
  originalAmount: z.number().positive(),
  currentBalance: z.number().positive(),
  assetPoolValue: z.number().positive(),
  poolSize: z.number().positive().optional(),
  
  // Terms
  interestRate: z.number().min(0).max(1),
  maturityDate: z.date(),
  paymentFrequency: z.string(),
  lienPosition: z.enum(['senior', 'subordinate']),
  
  // Credit metrics
  creditRating: z.string().optional(),
  creditQuality: z.enum(['super_prime', 'prime', 'near_prime', 'subprime', 'deep_subprime']),
  delinquencyStatus: z.number().min(0),
  recoveryRate: z.number().min(0).max(1),
  
  // Tranching
  subordinationLevel: z.number().min(0).max(1),
  creditEnhancement: z.number().min(0).max(1),
  
  // Servicing
  servicerName: z.string().optional(),
  
  // Portfolio details
  sharesOutstanding: z.number().positive().optional(),
}).refine(data => {
  // Current balance should not exceed original amount
  return data.currentBalance <= data.originalAmount
}, {
  message: "Current balance cannot exceed original amount",
  path: ["currentBalance"]
}).refine(data => {
  // Ensure maturity is after valuation date for active assets
  return data.maturityDate >= data.valuationDate
}, {
  message: "Maturity date should be after valuation date for active assets",
  path: ["maturityDate"]
})

type AssetBackedFormSchema = z.infer<typeof assetBackedFormSchema>

// Asset-Backed Calculator Form implementation with domain-specific logic
export function AssetBackedCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with asset-backed-specific defaults
  const form = useForm<AssetBackedFormSchema>({
    resolver: zodResolver(assetBackedFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      originalAmount: 1000000,
      currentBalance: 800000,
      assetPoolValue: 800000,
      interestRate: 0.075,
      paymentFrequency: 'monthly',
      lienPosition: 'senior',
      creditQuality: 'prime',
      delinquencyStatus: 0,
      recoveryRate: 0.7,
      subordinationLevel: 0.1,
      creditEnhancement: 0.15,
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
  const handleSubmit = useCallback(async (data: AssetBackedFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: AssetBackedCalculationInput = {
      productType: AssetType.ASSET_BACKED,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Asset-backed security specific parameters
      assetNumber: data.assetNumber,
      assetType: data.underlyingAssetType,
      originalAmount: data.originalAmount,
      currentBalance: data.currentBalance,
      maturityDate: data.maturityDate,
      interestRate: data.interestRate,
      lienPosition: data.lienPosition,
      paymentFrequency: data.paymentFrequency,
      delinquencyStatus: data.delinquencyStatus,
      creditQuality: data.creditQuality,
      recoveryRate: data.recoveryRate,
      servicerName: data.servicerName,
      poolSize: data.poolSize,
      subordinationLevel: data.subordinationLevel,
      creditEnhancement: data.creditEnhancement,
      
      // Portfolio details
      sharesOutstanding: data.sharesOutstanding
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

        {/* Security Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Security Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="assetNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Number</FormLabel>
                  <FormControl>
                    <Input placeholder="ABS-2024-001" {...field} />
                  </FormControl>
                  <FormDescription>Internal asset identifier</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="securityName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Prime Auto Receivables Trust 2024-A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="underlyingAssetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Underlying Asset Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto_loans">Auto Loans</SelectItem>
                      <SelectItem value="mortgages">Mortgages</SelectItem>
                      <SelectItem value="credit_cards">Credit Cards</SelectItem>
                      <SelectItem value="equipment_loans">Equipment Loans</SelectItem>
                      <SelectItem value="student_loans">Student Loans</SelectItem>
                      <SelectItem value="commercial_mortgages">Commercial Mortgages</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pool Characteristics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Asset Pool Characteristics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="originalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Original Amount *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Original pool balance</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currentBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Current Balance *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Current outstanding balance</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="assetPoolValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pool Value *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Current appraised pool value</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="poolSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Pool Size
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      placeholder="5000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Number of individual assets in pool</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Terms Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Security Terms</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="interestRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Interest Rate *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      max="1"
                      placeholder="0.075"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Weighted average interest rate (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Frequency *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi_annual">Semi-annual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lienPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lien Position *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="subordinate">Subordinate</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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

        {/* Credit Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Credit & Risk Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="creditQuality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Quality *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select credit quality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="super_prime">Super Prime</SelectItem>
                      <SelectItem value="prime">Prime</SelectItem>
                      <SelectItem value="near_prime">Near Prime</SelectItem>
                      <SelectItem value="subprime">Subprime</SelectItem>
                      <SelectItem value="deep_subprime">Deep Subprime</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="creditRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Rating</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AAA">AAA</SelectItem>
                      <SelectItem value="AA">AA</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="BBB">BBB</SelectItem>
                      <SelectItem value="BB">BB</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="CCC">CCC</SelectItem>
                      <SelectItem value="NR">Not Rated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="delinquencyStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Delinquency Status *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="30"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Average days past due (0 = current)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recoveryRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Recovery Rate *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.70"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Expected recovery rate on defaults (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tranching Structure Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Tranching & Credit Enhancement</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="subordinationLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Subordination Level *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.10"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Subordination as percentage of pool (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="creditEnhancement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Credit Enhancement *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.15"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Total credit enhancement level (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Servicing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Servicing & Portfolio Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="servicerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Servicing Corp" {...field} />
                  </FormControl>
                  <FormDescription>Primary loan servicer</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sharesOutstanding"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shares Outstanding</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="10000000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Total shares outstanding for NAV per share calculation</FormDescription>
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

export default AssetBackedCalculatorForm

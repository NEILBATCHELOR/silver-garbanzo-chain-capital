/**
 * Invoice Receivables Calculator Form  
 * Cash flow asset NAV calculator with credit risk and collection timeline analysis
 * Domain-specific form that mirrors backend InvoiceReceivablesCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Building2, CreditCard, Percent, Clock } from 'lucide-react'

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
import { Checkbox } from '@/components/ui/checkbox'
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
  InvoiceReceivablesFormData, 
  InvoiceReceivablesCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Invoice Receivables validation schema
const invoiceReceivablesFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Invoice identification
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceAmount: z.number().positive("Invoice amount must be positive"),
  invoiceDate: z.date(),
  dueDate: z.date(),
  
  // Payor information
  payorName: z.string().min(1, "Payor name is required"),
  payorIndustry: z.string().optional(),
  payorRating: z.string().optional(),
  payorCountry: z.string().min(1, "Payor country is required"),
  paymentTerms: z.number().positive("Payment terms must be positive"),
  
  // Factoring terms
  advanceRate: z.number().min(0).max(100, "Advance rate must be between 0-100%"),
  factoringFee: z.number().min(0).max(100, "Factoring fee must be between 0-100%"),
  discountRate: z.number().min(0).max(100, "Discount rate must be between 0-100%"),
  recourse: z.boolean(),
  
  // Risk parameters
  concentrationLimit: z.number().min(0).max(100).optional(),
  dilutionReserve: z.number().min(0).max(100).optional(),
  collectionProbability: z.number().min(0).max(100).optional(),
  
  // Aging analysis
  daysPastDue: z.number().min(0).optional(),
  agingCategory: z.enum(['current', '1-30', '31-60', '61-90', '90+']),
  
  // Portfolio details
  purchasePrice: z.number().positive("Purchase price must be positive"),
  purchaseDate: z.date(),
}).refine(data => {
  // Ensure due date is after invoice date
  return data.dueDate >= data.invoiceDate
}, {
  message: "Due date must be after invoice date",
  path: ["dueDate"]
}).refine(data => {
  // Ensure invoice date is not in the future
  return data.invoiceDate <= new Date()
}, {
  message: "Invoice date cannot be in the future",
  path: ["invoiceDate"]
}).refine(data => {
  // Ensure purchase date is not in the future
  return data.purchaseDate <= new Date()
}, {
  message: "Purchase date cannot be in the future",
  path: ["purchaseDate"]
}).refine(data => {
  // Ensure purchase price doesn't exceed invoice amount
  return data.purchasePrice <= data.invoiceAmount
}, {
  message: "Purchase price cannot exceed invoice amount",
  path: ["purchasePrice"]
})

type InvoiceReceivablesFormSchema = z.infer<typeof invoiceReceivablesFormSchema>

// Invoice Receivables Calculator Form implementation
export function InvoiceReceivablesCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with invoice receivables-specific defaults
  const form = useForm<InvoiceReceivablesFormSchema>({
    resolver: zodResolver(invoiceReceivablesFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentTerms: 30,
      advanceRate: 80,
      factoringFee: 2.5,
      discountRate: 12,
      recourse: false,
      agingCategory: 'current',
      purchaseDate: new Date(),
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
  const handleSubmit = useCallback(async (data: InvoiceReceivablesFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: InvoiceReceivablesCalculationInput = {
      productType: AssetType.INVOICE_RECEIVABLES,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Invoice receivables-specific parameters
      invoiceNumber: data.invoiceNumber,
      invoiceAmount: data.invoiceAmount,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      payorName: data.payorName,
      payorRating: data.payorRating,
      discountRate: data.discountRate / 100, // Convert percentage to decimal
      advanceRate: data.advanceRate / 100, // Convert percentage to decimal
      factoring_fee: data.factoringFee / 100, // Convert percentage to decimal
      recourse: data.recourse,
      dilution_reserve: data.dilutionReserve ? data.dilutionReserve / 100 : undefined,
      concentration_limit: data.concentrationLimit ? data.concentrationLimit / 100 : undefined,
      collection_probability: data.collectionProbability ? data.collectionProbability / 100 : undefined,
      
      // Create aging buckets based on current status
      aging_buckets: {
        [data.agingCategory]: data.invoiceAmount
      },
      
      // Portfolio details - using purchase price as holdings value
      holdings: [{
        instrumentKey: data.invoiceNumber,
        quantity: 1,
        costBasis: data.purchasePrice,
        currency: data.targetCurrency,
        effectiveDate: data.purchaseDate
      }]
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

        {/* Invoice Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Invoice Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Invoice Number *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="INV-2024-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="invoiceAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Invoice Amount *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="50000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Face value of the invoice</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Invoice Date *</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick invoice date"}
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
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date *</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick due date"}
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

        {/* Payor Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Payor Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="payorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Payor Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payorIndustry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payor Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="Manufacturing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payorRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payor Credit Rating
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="BBB+" {...field} />
                  </FormControl>
                  <FormDescription>Credit rating of the paying entity</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payorCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payor Country *</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Payment Terms (Days) *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      step="1"
                      placeholder="30"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Standard payment terms in days</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Factoring Terms Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Factoring Terms</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="advanceRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Advance Rate (%) *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="80"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Percentage of invoice amount advanced</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="factoringFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Factoring Fee (%) *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="2.5"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Factoring service fee as percentage</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="discountRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Discount Rate (% p.a.) *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="12"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annual discount rate for valuation</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recourse"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Recourse Factoring</FormLabel>
                    <FormDescription>
                      Factor has recourse to seller if payor defaults
                    </FormDescription>
                  </div>
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
              name="concentrationLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concentration Limit (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="15"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Max % of portfolio from single payor</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dilutionReserve"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dilution Reserve (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="2"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Reserve for returns and disputes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="collectionProbability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection Probability (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="95"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Expected collection rate</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Aging Analysis Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Aging Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="daysPastDue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days Past Due</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      step="1"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Current days past due date</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="agingCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aging Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select aging category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="1-30">1-30 Days</SelectItem>
                      <SelectItem value="31-60">31-60 Days</SelectItem>
                      <SelectItem value="61-90">61-90 Days</SelectItem>
                      <SelectItem value="90+">90+ Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Portfolio Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Portfolio Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Purchase Price *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="40000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Amount paid to acquire the receivable</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Purchase Date *</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick purchase date"}
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

export default InvoiceReceivablesCalculatorForm
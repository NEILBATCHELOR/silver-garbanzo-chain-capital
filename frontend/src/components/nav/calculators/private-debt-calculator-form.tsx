/**
 * Private Debt Calculator Form
 * Private debt NAV with credit risk and recovery rate analysis
 * Domain-specific form that mirrors backend PrivateDebtCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, Shield } from 'lucide-react'

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
  PrivateDebtFormData, 
  PrivateDebtCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Private debt validation schema
const privateDebtFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Debt identification
  debtInstrumentName: z.string().min(1, "Debt instrument name is required"),
  debtType: z.enum(['senior_secured', 'senior_unsecured', 'subordinated', 'mezzanine', 'bridge']),
  borrowerName: z.string().min(1, "Borrower name is required"),
  borrowerIndustry: z.string().optional(),
  
  // Terms
  principalAmount: z.number().positive(),
  currentBalance: z.number().positive().optional(),
  interestRate: z.number().min(0).max(1),
  maturityDate: z.date(),
  issueDate: z.date(),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']),
  
  // Credit analysis
  creditRating: z.string().optional(),
  seniority: z.enum(['senior', 'subordinate', 'mezzanine']),
  security: z.enum(['secured', 'unsecured']),
  ltv: z.number().min(0).max(1).optional(), // Loan-to-Value
  dscr: z.number().positive().optional(), // Debt Service Coverage Ratio
  
  // Covenants
  maintenanceCovenants: z.array(z.string()).optional(),
  
  // Portfolio details
  investmentAmount: z.number().positive(),
}).refine(data => {
  // Ensure maturity is after issue date
  return data.maturityDate > data.issueDate
}, {
  message: "Maturity date must be after issue date",
  path: ["maturityDate"]
}).refine(data => {
  // Ensure maturity is after valuation date
  return data.maturityDate > data.valuationDate
}, {
  message: "Debt must not be matured",
  path: ["maturityDate"]
}).refine(data => {
  // Ensure current balance doesn't exceed principal
  if (data.currentBalance) {
    return data.currentBalance <= data.principalAmount
  }
  return true
}, {
  message: "Current balance cannot exceed principal amount",
  path: ["currentBalance"]
})

type PrivateDebtFormSchema = z.infer<typeof privateDebtFormSchema>

// Private Debt Calculator Form implementation with domain-specific logic
export function PrivateDebtCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with private debt-specific defaults
  const form = useForm<PrivateDebtFormSchema>({
    resolver: zodResolver(privateDebtFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      debtType: 'senior_secured',
      paymentFrequency: 'quarterly',
      seniority: 'senior',
      security: 'secured',
      interestRate: 0.08,
      principalAmount: 1000000,
      investmentAmount: 1000000,
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
  const handleSubmit = useCallback(async (data: PrivateDebtFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: PrivateDebtCalculationInput = {
      productType: AssetType.PRIVATE_DEBT,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Private debt-specific parameters
      debtType: data.debtType,
      principalAmount: data.principalAmount,
      currentBalance: data.currentBalance,
      interestRate: data.interestRate,
      maturityDate: data.maturityDate,
      issueDate: data.issueDate,
      paymentFrequency: data.paymentFrequency,
      creditRating: data.creditRating,
      seniority: data.seniority,
      security: data.security,
      borrowerName: data.borrowerName,
      borrowerIndustry: data.borrowerIndustry,
      ltv: data.ltv,
      dscr: data.dscr,
      covenants: data.maintenanceCovenants,
      
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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Debt Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Debt Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="debtInstrumentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Debt Instrument Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Term Loan" {...field} />
                  </FormControl>
                  <FormDescription>Name or description of the debt instrument</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="debtType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Debt Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select debt type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="senior_secured">Senior Secured</SelectItem>
                      <SelectItem value="senior_unsecured">Senior Unsecured</SelectItem>
                      <SelectItem value="subordinated">Subordinated</SelectItem>
                      <SelectItem value="mezzanine">Mezzanine</SelectItem>
                      <SelectItem value="bridge">Bridge</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="borrowerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Borrower Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Manufacturing Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="borrowerIndustry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Borrower Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="Manufacturing" {...field} />
                  </FormControl>
                  <FormDescription>Industry sector of the borrower</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Debt Terms Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Debt Terms</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Original principal amount</FormDescription>
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
                    Current Balance
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
                  <FormDescription>Outstanding balance (if different from principal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      placeholder="0.08"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annual interest rate (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Issue Date *</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick issue date"}
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
          </div>
          
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
                    <SelectItem value="semi-annual">Semi-annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Credit Analysis Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Credit Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="seniority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Seniority *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select seniority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="subordinate">Subordinate</SelectItem>
                      <SelectItem value="mezzanine">Mezzanine</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="security"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select security type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="secured">Secured</SelectItem>
                      <SelectItem value="unsecured">Unsecured</SelectItem>
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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
                      <SelectItem value="CC">CC</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="ltv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan-to-Value (LTV)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.75"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Loan-to-value ratio (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dscr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DSCR</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="1.25"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Debt Service Coverage Ratio</FormDescription>
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
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Total investment amount in this debt instrument</FormDescription>
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

export default PrivateDebtCalculatorForm
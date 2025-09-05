/**
 * Infrastructure Calculator Form
 * Infrastructure asset NAV with DCF modeling and regulatory assessment
 * Domain-specific form that mirrors backend InfrastructureCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, Building, Shield } from 'lucide-react'

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
  InfrastructureFormData, 
  InfrastructureCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Infrastructure validation schema
const infrastructureFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Project identification
  projectName: z.string().min(1, "Project name is required"),
  assetType: z.enum(['transportation', 'energy', 'utilities', 'social', 'telecom', 'environmental']),
  projectPhase: z.enum(['development', 'construction', 'operational', 'mature']),
  location: z.string().min(1, "Location is required"),
  
  // Operational metrics
  operatingHistory: z.number().min(0).optional(),
  concessionPeriod: z.number().min(1).optional(),
  cashFlowProfile: z.enum(['stable', 'growing', 'declining', 'cyclical']),
  
  // Financial metrics
  annualRevenue: z.number().positive(),
  ebitda: z.number(),
  capex: z.number().min(0).optional(),
  opex: z.number().min(0),
  
  // Risk assessment
  regulatoryFramework: z.enum(['regulated', 'quasi_regulated', 'merchant', 'contracted']),
  counterpartyRisk: z.enum(['government', 'corporate', 'mixed']),
  esgRating: z.string().optional(),
  
  // Valuation inputs
  discountRate: z.number().min(0).max(1),
  terminalValue: z.number().optional(),
  
  // Portfolio details
  ownershipPercentage: z.number().min(0).max(1),
}).refine(data => {
  // EBITDA should be positive for operational projects
  if (data.projectPhase === 'operational' || data.projectPhase === 'mature') {
    return data.ebitda > 0
  }
  return true
}, {
  message: "EBITDA should be positive for operational projects",
  path: ["ebitda"]
}).refine(data => {
  // Operating history should be provided for operational/mature projects
  if ((data.projectPhase === 'operational' || data.projectPhase === 'mature') && !data.operatingHistory) {
    return false
  }
  return true
}, {
  message: "Operating history is required for operational projects",
  path: ["operatingHistory"]
})

type InfrastructureFormSchema = z.infer<typeof infrastructureFormSchema>

// Infrastructure Calculator Form implementation with domain-specific logic
export function InfrastructureCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with infrastructure-specific defaults
  const form = useForm<InfrastructureFormSchema>({
    resolver: zodResolver(infrastructureFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      assetType: 'transportation',
      projectPhase: 'operational',
      cashFlowProfile: 'stable',
      regulatoryFramework: 'regulated',
      counterpartyRisk: 'government',
      discountRate: 0.08,
      ownershipPercentage: 1.0,
      annualRevenue: 10000000,
      ebitda: 5000000,
      opex: 3000000,
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
  const handleSubmit = useCallback(async (data: InfrastructureFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: InfrastructureCalculationInput = {
      productType: AssetType.INFRASTRUCTURE,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Infrastructure-specific parameters
      projectName: data.projectName,
      assetType: data.assetType,
      projectPhase: data.projectPhase,
      operatingHistory: data.operatingHistory,
      cashFlowProfile: data.cashFlowProfile,
      regulatoryFramework: data.regulatoryFramework,
      concessionPeriod: data.concessionPeriod,
      counterpartyRisk: data.counterpartyRisk,
      esgRating: data.esgRating,
      capex: data.capex,
      opex: data.opex,
      revenue: data.annualRevenue,
      ebitda: data.ebitda,
      discountRate: data.discountRate,
      terminalValue: data.terminalValue,
      
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
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Project Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Project Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Project Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="North Metro Transit Line" {...field} />
                  </FormControl>
                  <FormDescription>Name of the infrastructure project</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="social">Social Infrastructure</SelectItem>
                      <SelectItem value="telecom">Telecommunications</SelectItem>
                      <SelectItem value="environmental">Environmental</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="projectPhase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Phase *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="mature">Mature</SelectItem>
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
                    <Input placeholder="Denver, Colorado, USA" {...field} />
                  </FormControl>
                  <FormDescription>Geographic location of the project</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Operational Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Operational Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="operatingHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operating History (Years)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="5"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Years of operational history</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="concessionPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concession Period (Years)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="1"
                      placeholder="30"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Total concession period</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cashFlowProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cash Flow Profile *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select profile" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="growing">Growing</SelectItem>
                      <SelectItem value="declining">Declining</SelectItem>
                      <SelectItem value="cyclical">Cyclical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Financial Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Financial Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="annualRevenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Annual Revenue *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Annual revenue from operations</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="ebitda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    EBITDA *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Earnings before interest, taxes, depreciation, and amortization</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="capex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Capital Expenditures
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="Optional"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Annual capital expenditures</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="opex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Operating Expenses *
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
                  <FormDescription>Annual operating expenses</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Risk Assessment Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Risk Assessment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="regulatoryFramework"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Regulatory Framework *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select framework" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="regulated">Regulated</SelectItem>
                      <SelectItem value="quasi_regulated">Quasi-Regulated</SelectItem>
                      <SelectItem value="merchant">Merchant</SelectItem>
                      <SelectItem value="contracted">Contracted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="counterpartyRisk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Counterparty Risk *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select counterparty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="esgRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ESG Rating</FormLabel>
                  <FormControl>
                    <Input placeholder="A" {...field} />
                  </FormControl>
                  <FormDescription>Environmental, Social, Governance rating</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Valuation Inputs Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Valuation Inputs</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="discountRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Discount Rate *
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
                  <FormDescription>Discount rate for DCF analysis (decimal)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="terminalValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Terminal Value
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      placeholder="Optional"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Terminal value at end of projection period</FormDescription>
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
            name="ownershipPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Ownership Percentage *
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="1.00"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Ownership percentage (decimal, e.g., 0.25 for 25%)</FormDescription>
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

export default InfrastructureCalculatorForm
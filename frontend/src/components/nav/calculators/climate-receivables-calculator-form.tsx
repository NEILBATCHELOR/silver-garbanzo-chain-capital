/**
 * Climate Receivables Calculator Form
 * Climate credits and carbon offset NAV calculator with certification standards and policy risk
 * Domain-specific form that mirrors backend ClimateReceivablesCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, Leaf, Globe, Shield } from 'lucide-react'

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
  ClimateReceivablesFormData, 
  ClimateReceivablesCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Climate Receivables validation schema
const climateReceivablesFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Credit identification
  creditType: z.enum(['carbon_offset', 'renewable_energy', 'biodiversity', 'water']),
  projectName: z.string().min(1, "Project name is required"),
  projectType: z.string().min(1, "Project type is required"),
  vintageYear: z.number().min(2000).max(2040, "Vintage year must be realistic"),
  geography: z.string().min(1, "Geography is required"),
  
  // Certification
  certificationStandard: z.enum(['VCS', 'CDM', 'GS', 'CAR', 'ACR']),
  registryAccount: z.string().optional(),
  
  // Commercial terms
  creditVolume: z.number().positive("Credit volume must be positive"),
  pricePerCredit: z.number().positive("Price per credit must be positive"),
  deliverySchedule: z.string().min(1, "Delivery schedule is required"),
  
  // Risk factors
  carbonPrice: z.number().positive().optional(),
  policyRisk: z.number().min(0).max(1, "Policy risk must be between 0 and 1"),
  deliveryRisk: z.number().min(0).max(1).optional(),
  
  // Portfolio details
  contractValue: z.number().positive("Contract value must be positive"),
}).refine(data => {
  // Ensure vintage year is not in the distant future
  const currentYear = new Date().getFullYear()
  return data.vintageYear <= currentYear + 10
}, {
  message: "Vintage year cannot be more than 10 years in the future",
  path: ["vintageYear"]
})

type ClimateReceivablesFormSchema = z.infer<typeof climateReceivablesFormSchema>

// Project types by credit type
const projectTypesByCredit = {
  carbon_offset: [
    'Forest Conservation',
    'Reforestation',
    'Renewable Energy',
    'Energy Efficiency',
    'Methane Capture',
    'Industrial Processes',
    'Agriculture',
    'Transportation'
  ],
  renewable_energy: [
    'Solar',
    'Wind',
    'Hydro',
    'Biomass',
    'Geothermal'
  ],
  biodiversity: [
    'Habitat Restoration',
    'Species Protection',
    'Marine Conservation',
    'Wetland Restoration'
  ],
  water: [
    'Water Treatment',
    'Water Conservation',
    'Watershed Protection',
    'Water Access'
  ]
}

// Climate Receivables Calculator Form implementation
export function ClimateReceivablesCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with climate-specific defaults
  const form = useForm<ClimateReceivablesFormSchema>({
    resolver: zodResolver(climateReceivablesFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      creditType: 'carbon_offset',
      vintageYear: new Date().getFullYear(),
      certificationStandard: 'VCS',
      creditVolume: 10000,
      pricePerCredit: 15.00,
      deliverySchedule: 'Quarterly over 2 years',
      policyRisk: 0.1,
      contractValue: 150000,
      ...initialData
    }
  })

  // Watch credit type to update project type options
  const creditType = form.watch('creditType')

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
  const handleSubmit = useCallback(async (data: ClimateReceivablesFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: ClimateReceivablesCalculationInput = {
      productType: AssetType.CLIMATE_RECEIVABLES,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Climate receivables-specific parameters
      creditType: data.creditType,
      vintageYear: data.vintageYear,
      projectType: data.projectType,
      geography: data.geography,
      certificationStandard: data.certificationStandard,
      creditVolume: data.creditVolume,
      pricePerCredit: data.pricePerCredit,
      deliverySchedule: data.deliverySchedule,
      registryAccount: data.registryAccount,
      carbonPrice: data.carbonPrice,
      policyRisk: data.policyRisk,
      
      // Portfolio details
      sharesOutstanding: data.contractValue
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

        {/* Credit Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Credit Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="creditType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Leaf className="h-4 w-4" />
                    Credit Type *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select credit type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="carbon_offset">Carbon Offset</SelectItem>
                      <SelectItem value="renewable_energy">Renewable Energy</SelectItem>
                      <SelectItem value="biodiversity">Biodiversity</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Amazon Forest Conservation Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectTypesByCredit[creditType]?.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Type varies by credit category</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vintageYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vintage Year *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="2000"
                      max="2040"
                      placeholder="2024"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Credit vintage year</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="geography"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Geography *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Brazil, Amazon Basin" {...field} />
                  </FormControl>
                  <FormDescription>Project location and region</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Certification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Certification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="certificationStandard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Certification Standard *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select standard" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="VCS">VCS (Verified Carbon Standard)</SelectItem>
                      <SelectItem value="CDM">CDM (Clean Development Mechanism)</SelectItem>
                      <SelectItem value="GS">GS (Gold Standard)</SelectItem>
                      <SelectItem value="CAR">CAR (Climate Action Reserve)</SelectItem>
                      <SelectItem value="ACR">ACR (American Carbon Registry)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="registryAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registry Account</FormLabel>
                  <FormControl>
                    <Input placeholder="VCS-REG-12345" {...field} />
                  </FormControl>
                  <FormDescription>Registry account identifier</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Commercial Terms Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Commercial Terms</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="creditVolume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Credit Volume *
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
                  <FormDescription>Number of credits (tonnes CO2e)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="pricePerCredit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price per Credit *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="15.00"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Price per credit in target currency</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contractValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Contract Value *
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
                  <FormDescription>Total contract value</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="deliverySchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Schedule *</FormLabel>
                  <FormControl>
                    <Input placeholder="Quarterly deliveries over 24 months" {...field} />
                  </FormControl>
                  <FormDescription>Credit delivery timeline and schedule</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Risk Factors Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Risk Factors</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="carbonPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Carbon Price
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="25.50"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Reference carbon price ($/tonne)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="policyRisk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Policy Risk *
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
                  <FormDescription>Policy/regulatory risk (0-1 scale)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deliveryRisk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Risk</FormLabel>
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
                  <FormDescription>Credit delivery risk (0-1 scale)</FormDescription>
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

export default ClimateReceivablesCalculatorForm

/**
 * Energy Calculator Form
 * Energy assets NAV with commodity exposure and weather risk modeling
 * Domain-specific form that mirrors backend EnergyCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Percent, Zap, MapPin } from 'lucide-react'

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
  EnergyFormData, 
  EnergyCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Energy validation schema
const energyFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Energy asset identification
  projectName: z.string().min(1, "Project name is required"),
  energyType: z.enum(['solar', 'wind', 'hydro', 'natural_gas', 'nuclear', 'biomass', 'geothermal', 'storage']),
  location: z.string().min(1, "Location is required"),
  developmentStage: z.enum(['development', 'construction', 'operational']),
  
  // Technical specifications
  capacity: z.number().positive(),
  annualGeneration: z.number().positive().optional(),
  capacityFactor: z.number().min(0).max(1).optional(),
  
  // Commercial terms
  ppaPrice: z.number().positive().optional(),
  ppaTerm: z.number().min(1).optional(),
  contractType: z.enum(['ppa', 'merchant', 'regulated', 'hybrid']),
  
  // Operating costs
  fuelCosts: z.number().min(0).optional(),
  oAndMCosts: z.number().min(0),
  transmissionCosts: z.number().min(0).optional(),
  
  // Revenue sources
  carbonPrice: z.number().min(0).optional(),
  renewableCertificates: z.number().min(0).optional(),
  
  // Risk factors
  developmentRisk: z.enum(['low', 'medium', 'high']),
  technologyRisk: z.enum(['proven', 'emerging', 'experimental']),
  merchantRisk: z.number().min(0).max(1).optional(),
  
  // Portfolio details
  ownershipPercentage: z.number().min(0).max(1),
}).refine(data => {
  // PPA price should be provided for PPA contracts
  if (data.contractType === 'ppa' && !data.ppaPrice) {
    return false
  }
  return true
}, {
  message: "PPA price is required for PPA contracts",
  path: ["ppaPrice"]
}).refine(data => {
  // PPA term should be provided for PPA contracts
  if (data.contractType === 'ppa' && !data.ppaTerm) {
    return false
  }
  return true
}, {
  message: "PPA term is required for PPA contracts",
  path: ["ppaTerm"]
}).refine(data => {
  // Annual generation should be provided for operational projects
  if (data.developmentStage === 'operational' && !data.annualGeneration) {
    return false
  }
  return true
}, {
  message: "Annual generation is required for operational projects",
  path: ["annualGeneration"]
})

type EnergyFormSchema = z.infer<typeof energyFormSchema>

// Energy Calculator Form implementation with domain-specific logic
export function EnergyCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with energy-specific defaults
  const form = useForm<EnergyFormSchema>({
    resolver: zodResolver(energyFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      energyType: 'solar',
      developmentStage: 'operational',
      contractType: 'ppa',
      developmentRisk: 'low',
      technologyRisk: 'proven',
      capacity: 100,
      capacityFactor: 0.25,
      ppaPrice: 45,
      ppaTerm: 20,
      oAndMCosts: 15,
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
  const handleSubmit = useCallback(async (data: EnergyFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: EnergyCalculationInput = {
      productType: AssetType.ENERGY,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Energy-specific parameters
      energyType: data.energyType,
      capacity: data.capacity,
      generation: data.annualGeneration,
      capacity_factor: data.capacityFactor,
      ppa_price: data.ppaPrice,
      ppa_term: data.ppaTerm,
      fuel_costs: data.fuelCosts,
      o_and_m_costs: data.oAndMCosts,
      carbonPrice: data.carbonPrice,
      renewable_certificates: data.renewableCertificates,
      transmission_costs: data.transmissionCosts,
      development_risk: data.developmentRisk,
      technology_risk: data.technologyRisk,
      merchant_risk: data.merchantRisk,
      
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

        {/* Energy Asset Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Energy Asset Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Project Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Desert Sun Solar Farm" {...field} />
                  </FormControl>
                  <FormDescription>Name of the energy project</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="energyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select energy type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="solar">Solar</SelectItem>
                      <SelectItem value="wind">Wind</SelectItem>
                      <SelectItem value="hydro">Hydro</SelectItem>
                      <SelectItem value="natural_gas">Natural Gas</SelectItem>
                      <SelectItem value="nuclear">Nuclear</SelectItem>
                      <SelectItem value="biomass">Biomass</SelectItem>
                      <SelectItem value="geothermal">Geothermal</SelectItem>
                      <SelectItem value="storage">Energy Storage</SelectItem>
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
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Phoenix, Arizona, USA" {...field} />
                  </FormControl>
                  <FormDescription>Geographic location of the project</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="developmentStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Development Stage *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Technical Specifications Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Technical Specifications</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Capacity (MW) *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Nameplate capacity in MW (or MWh for storage)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="annualGeneration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Generation (MWh)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="Optional for development"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Expected annual generation</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="capacityFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Capacity Factor
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.25"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Expected capacity factor (decimal)</FormDescription>
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
              name="contractType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ppa">Power Purchase Agreement</SelectItem>
                      <SelectItem value="merchant">Merchant</SelectItem>
                      <SelectItem value="regulated">Regulated</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="ppaPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    PPA Price ($/MWh)
                  </FormLabel>
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
                  <FormDescription>Power purchase agreement price</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="ppaTerm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PPA Term (Years)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      min="1"
                      placeholder="20"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>PPA contract duration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Operating Costs Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Operating Costs</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="fuelCosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fuel Costs ($/MWh)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="0 for renewables"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Variable fuel costs per MWh</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="oAndMCosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    O&M Costs *
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
                  <FormDescription>Operations & maintenance costs ($/kW-year or $/MWh)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="transmissionCosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Transmission Costs ($/MWh)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="Optional"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Grid transmission costs</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Revenue Sources Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Revenue Sources</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="carbonPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Carbon Price ($/tonne CO2)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="Optional"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Carbon credit value</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="renewableCertificates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Renewable Certificates ($/MWh)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="Optional"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>REC value per MWh</FormDescription>
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
              name="developmentRisk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Development Risk *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="technologyRisk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technology Risk *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select technology type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="proven">Proven</SelectItem>
                      <SelectItem value="emerging">Emerging</SelectItem>
                      <SelectItem value="experimental">Experimental</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="merchantRisk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Merchant Risk (%)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.2 for 20%"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>% of revenue exposed to merchant pricing (decimal)</FormDescription>
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

export default EnergyCalculatorForm
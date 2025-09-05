/**
 * Collectibles Calculator Form
 * Alternative investment NAV calculator with provenance and authenticity assessment
 * Domain-specific form that mirrors backend CollectiblesCalculator logic
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, DollarSign, Hash, Award, Palette, Shield } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
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
  CollectiblesFormData, 
  CollectiblesCalculationInput,
  AssetType, 
  CalculationResult 
} from '@/types/nav'

// Collectibles validation schema
const collectiblesFormSchema = z.object({
  // Required fields
  valuationDate: z.date(),
  targetCurrency: z.string().min(3).max(3),
  
  // Item identification
  itemName: z.string().min(1, "Item name is required"),
  collectibleType: z.enum(['art', 'wine', 'watches', 'jewelry', 'rare_books', 'coins', 'stamps', 'memorabilia', 'classic_cars']),
  category: z.string().min(1, "Category is required"),
  
  // Attribution
  artist: z.string().optional(),
  maker: z.string().optional(),
  yearCreated: z.number().min(1000).max(new Date().getFullYear()).optional(),
  originCountry: z.string().optional(),
  
  // Condition and authenticity
  condition: z.enum(['mint', 'excellent', 'very_good', 'good', 'fair', 'poor']),
  rarity: z.enum(['unique', 'extremely_rare', 'very_rare', 'rare', 'uncommon', 'common']),
  authenticity: z.enum(['certified', 'attributed', 'school_of', 'disputed']),
  provenance: z.string().optional(),
  
  // Valuation history
  lastSalePrice: z.number().positive().optional(),
  lastSaleDate: z.date().optional(),
  lastSaleVenue: z.string().optional(),
  appraisalValue: z.number().positive().optional(),
  appraisalDate: z.date().optional(),
  appraiser: z.string().optional(),
  
  // Market factors
  insuranceValue: z.number().positive().optional(),
  marketTrend: z.enum(['strong_growth', 'moderate_growth', 'stable', 'declining', 'volatile']),
  liquidity: z.enum(['very_liquid', 'liquid', 'moderate', 'illiquid', 'very_illiquid']),
  
  // Physical details
  dimensions: z.string().optional(),
  weight: z.number().positive().optional(),
  storageRequirements: z.string().optional(),
  
  // Portfolio details
  acquisitionCost: z.number().positive("Acquisition cost is required"),
  acquisitionDate: z.date(),
}).refine(data => {
  // Ensure last sale date is not in the future
  return !data.lastSaleDate || data.lastSaleDate <= new Date()
}, {
  message: "Last sale date cannot be in the future",
  path: ["lastSaleDate"]
}).refine(data => {
  // Ensure appraisal date is not in the future
  return !data.appraisalDate || data.appraisalDate <= new Date()
}, {
  message: "Appraisal date cannot be in the future",
  path: ["appraisalDate"]
}).refine(data => {
  // Ensure acquisition date is not in the future
  return data.acquisitionDate <= new Date()
}, {
  message: "Acquisition date cannot be in the future",
  path: ["acquisitionDate"]
})

type CollectiblesFormSchema = z.infer<typeof collectiblesFormSchema>

// Collectibles Calculator Form implementation
export function CollectiblesCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with collectibles-specific defaults
  const form = useForm<CollectiblesFormSchema>({
    resolver: zodResolver(collectiblesFormSchema),
    defaultValues: {
      valuationDate: new Date(),
      targetCurrency: 'USD',
      collectibleType: 'art',
      condition: 'very_good',
      rarity: 'rare',
      authenticity: 'certified',
      marketTrend: 'stable',
      liquidity: 'moderate',
      acquisitionDate: new Date(),
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
  const handleSubmit = useCallback(async (data: CollectiblesFormSchema) => {
    setIsSubmitting(true)

    // Convert form data to backend calculation input
    const calculationInput: CollectiblesCalculationInput = {
      productType: AssetType.COLLECTIBLES,
      valuationDate: data.valuationDate,
      targetCurrency: data.targetCurrency,
      
      // Collectibles-specific parameters
      collectibleType: data.collectibleType,
      category: data.category,
      artist: data.artist,
      year: data.yearCreated,
      condition: data.condition,
      rarity: data.rarity,
      provenance: data.provenance,
      authenticity: data.authenticity === 'certified',
      lastSalePrice: data.lastSalePrice,
      lastSaleDate: data.lastSaleDate,
      appraisalValue: data.appraisalValue,
      appraisalDate: data.appraisalDate,
      insuranceValue: data.insuranceValue,
      marketTrend: data.marketTrend,
      liquidity: data.liquidity,
      
      // Portfolio details - using acquisition cost as holdings value
      holdings: [{
        instrumentKey: data.itemName,
        quantity: 1,
        costBasis: data.acquisitionCost,
        currency: data.targetCurrency,
        effectiveDate: data.acquisitionDate
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

        {/* Item Identification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Item Identification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Item Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Starry Night" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="collectibleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collectible Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="wine">Wine</SelectItem>
                      <SelectItem value="watches">Watches</SelectItem>
                      <SelectItem value="jewelry">Jewelry</SelectItem>
                      <SelectItem value="rare_books">Rare Books</SelectItem>
                      <SelectItem value="coins">Coins</SelectItem>
                      <SelectItem value="stamps">Stamps</SelectItem>
                      <SelectItem value="memorabilia">Memorabilia</SelectItem>
                      <SelectItem value="classic_cars">Classic Cars</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <FormControl>
                    <Input placeholder="Post-Impressionist painting" {...field} />
                  </FormControl>
                  <FormDescription>Specific category within the collectible type</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Attribution Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Attribution</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="artist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist/Creator</FormLabel>
                  <FormControl>
                    <Input placeholder="Vincent van Gogh" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maker/Manufacturer</FormLabel>
                  <FormControl>
                    <Input placeholder="Rolex" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="yearCreated"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year Created</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1000"
                      max={new Date().getFullYear()}
                      placeholder="1889"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="originCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country of Origin</FormLabel>
                  <FormControl>
                    <Input placeholder="France" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Condition and Authenticity Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Condition and Authenticity</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Condition *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mint">Mint</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="very_good">Very Good</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rarity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rarity *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rarity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unique">Unique</SelectItem>
                      <SelectItem value="extremely_rare">Extremely Rare</SelectItem>
                      <SelectItem value="very_rare">Very Rare</SelectItem>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="uncommon">Uncommon</SelectItem>
                      <SelectItem value="common">Common</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="authenticity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Authenticity *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select authenticity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="certified">Certified</SelectItem>
                      <SelectItem value="attributed">Attributed</SelectItem>
                      <SelectItem value="school_of">School of</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="provenance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provenance</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Ownership history and exhibition record..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Complete ownership and exhibition history</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Valuation History Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Valuation History</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="lastSalePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Last Sale Price
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="150000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastSaleDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Last Sale Date</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick sale date"}
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
              name="lastSaleVenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Sale Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="Sotheby's New York" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="appraisalValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appraisal Value</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="200000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
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
            
            <FormField
              control={form.control}
              name="appraiser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appraiser</FormLabel>
                  <FormControl>
                    <Input placeholder="Christie's Fine Art Department" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Market Factors Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Market Factors</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="insuranceValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Value</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="250000"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="marketTrend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Trend *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trend" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="strong_growth">Strong Growth</SelectItem>
                      <SelectItem value="moderate_growth">Moderate Growth</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="declining">Declining</SelectItem>
                      <SelectItem value="volatile">Volatile</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="liquidity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liquidity *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select liquidity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="very_liquid">Very Liquid</SelectItem>
                      <SelectItem value="liquid">Liquid</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="illiquid">Illiquid</SelectItem>
                      <SelectItem value="very_illiquid">Very Illiquid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Physical Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Physical Details (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions</FormLabel>
                  <FormControl>
                    <Input placeholder="73.7 cm × 92.1 cm" {...field} />
                  </FormControl>
                  <FormDescription>Height × Width × Depth</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="0"
                      placeholder="2.5"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="storageRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Requirements</FormLabel>
                  <FormControl>
                    <Input placeholder="Climate controlled, UV protection" {...field} />
                  </FormControl>
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
              name="acquisitionCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Acquisition Cost *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="100000"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Original purchase price</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="acquisitionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Acquisition Date *</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick acquisition date"}
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

export default CollectiblesCalculatorForm
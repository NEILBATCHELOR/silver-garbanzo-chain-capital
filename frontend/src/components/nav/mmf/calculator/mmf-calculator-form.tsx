import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Calculator, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/utils'

import { useCalculateMMFNAV } from '@/hooks/mmf/useMMFData'
import { MMFDiagnosticPanel } from './mmf-diagnostic-panel'
import type { MMFCalculationParams, MMFNAVResult } from '@/types/nav/mmf'

// Validation schema - Use empty string as default instead of undefined
const calculatorFormSchema = z.object({
  asOfDate: z.date({
    required_error: 'As-of date is required',
  }),
  includeBreakdown: z.boolean().default(true),
  saveToDatabase: z.boolean().default(true),
  // Config overrides (optional) - Use empty string for controlled inputs
  wamLimit: z.string().optional(),
  walLimit: z.string().optional(),
  dailyLiquidMinimum: z.string().optional(),
  weeklyLiquidMinimum: z.string().optional(),
})

type CalculatorFormValues = z.infer<typeof calculatorFormSchema>

interface MMFCalculatorFormProps {
  fundId: string
  fundName: string
  fundType?: string
  onSuccess?: (result: MMFNAVResult) => void
  onError?: (error: Error) => void
}

export function MMFCalculatorForm({
  fundId,
  fundName,
  fundType,
  onSuccess,
  onError,
}: MMFCalculatorFormProps) {
  const [calculationResult, setCalculationResult] = useState<MMFNAVResult | null>(null)
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [showConfigOverrides, setShowConfigOverrides] = useState(false)
  const calculateMutation = useCalculateMMFNAV(fundId)

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorFormSchema),
    defaultValues: {
      asOfDate: new Date(),
      includeBreakdown: true,
      saveToDatabase: true,
      wamLimit: '',
      walLimit: '',
      dailyLiquidMinimum: '',
      weeklyLiquidMinimum: '',
    },
  })

  const onSubmit = async (values: CalculatorFormValues) => {
    try {
      // Build config overrides if any are provided
      const configOverrides: any = {}
      
      // Parse string values to numbers, only if not empty
      const wamLimit = values.wamLimit && values.wamLimit !== '' ? Number(values.wamLimit) : undefined
      const walLimit = values.walLimit && values.walLimit !== '' ? Number(values.walLimit) : undefined
      const dailyLiquidMinimum = values.dailyLiquidMinimum && values.dailyLiquidMinimum !== '' 
        ? Number(values.dailyLiquidMinimum)  // Keep as percentage (25, not 0.25)
        : undefined
      const weeklyLiquidMinimum = values.weeklyLiquidMinimum && values.weeklyLiquidMinimum !== '' 
        ? Number(values.weeklyLiquidMinimum)  // Keep as percentage (50, not 0.50)
        : undefined
      
      // FIX: Build compliance overrides correctly
      if (wamLimit !== undefined || walLimit !== undefined || dailyLiquidMinimum !== undefined || weeklyLiquidMinimum !== undefined) {
        configOverrides.compliance = {}
        
        if (wamLimit !== undefined) {
          configOverrides.compliance.wamLimits = {
            [fundType || 'default']: wamLimit
          }
        }
        
        if (walLimit !== undefined) {
          configOverrides.compliance.walLimits = {
            [fundType || 'default']: walLimit
          }
        }
        
        if (dailyLiquidMinimum !== undefined) {
          configOverrides.compliance.dailyLiquidMinimum = dailyLiquidMinimum
        }
        
        if (weeklyLiquidMinimum !== undefined) {
          configOverrides.compliance.weeklyLiquidMinimum = weeklyLiquidMinimum
        }
      }

      console.log('=== SUBMITTING CALCULATION ===')
      console.log('Fund ID:', fundId)
      console.log('Fund Type:', fundType)
      console.log('Config Overrides:', JSON.stringify(configOverrides, null, 2))

      const params: MMFCalculationParams = {
        asOfDate: values.asOfDate,
        includeBreakdown: values.includeBreakdown,
        saveToDatabase: values.saveToDatabase,
        configOverrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined
      }

      const result = await calculateMutation.mutateAsync(params)
      
      console.log('=== CALCULATION RESULT ===')
      console.log('Success:', result.success)
      console.log('Data:', result.data)
      console.log('NAV:', result.data?.nav)
      console.log('=========================')
      
      if (result.data) {
        setCalculationResult(result.data)
        setDiagnostic(null) // Clear any previous diagnostic
        onSuccess?.(result.data)
      } else {
        throw new Error('Calculation returned no data')
      }
    } catch (error: any) {
      console.error('MMF NAV calculation error:', error)
      
      // Extract diagnostic information from error if available
      if (error.diagnostic) {
        console.log('Diagnostic info available:', error.diagnostic)
        setDiagnostic(error.diagnostic)
      } else {
        setDiagnostic(null)
      }
      
      onError?.(error as Error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Diagnostic Panel - Shows intelligent error analysis */}
      {diagnostic && (
        <MMFDiagnosticPanel 
          diagnostic={diagnostic}
          currentNAV={calculationResult?.nav}
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculate MMF NAV
          </CardTitle>
          <CardDescription>
            Calculate the Net Asset Value for {fundName}
            {fundType && ` (${fundType})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* As-of Date */}
              <FormField
                control={form.control}
                name="asOfDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>As-of Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-[240px] pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
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
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The date for which to calculate the NAV
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Calculation Options */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="includeBreakdown"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include detailed breakdown</FormLabel>
                        <FormDescription>
                          Show detailed component values and holdings breakdown
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="saveToDatabase"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Save to database</FormLabel>
                        <FormDescription>
                          Store calculation result in mmf_nav_history
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Config Overrides Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Configuration Overrides</div>
                  <div className="text-xs text-muted-foreground">
                    Temporarily adjust compliance thresholds for testing
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfigOverrides(!showConfigOverrides)}
                >
                  {showConfigOverrides ? 'Hide' : 'Show'}
                </Button>
              </div>

              {/* Config Overrides Section */}
              {showConfigOverrides && (
                <>
                  <Separator />
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Temporary Overrides</AlertTitle>
                    <AlertDescription>
                      These overrides only apply to this calculation and do not modify database values.
                      Leave fields empty to use default values from configuration.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="wamLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WAM Limit (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="60"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Max: 120 days (default: 60)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="walLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WAL Limit (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="120"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Max: 397 days (default: 120)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dailyLiquidMinimum"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Liquid Minimum (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="25"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Min: 0%, Max: 100% (default: 25%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weeklyLiquidMinimum"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weekly Liquid Minimum (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Min: 0%, Max: 100% (default: 50%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate NAV
                  </>
                )}
              </Button>

              {/* Error Display */}
              {calculateMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Calculation Failed</AlertTitle>
                  <AlertDescription>
                    {calculateMutation.error instanceof Error
                      ? calculateMutation.error.message
                      : 'An unknown error occurred'}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

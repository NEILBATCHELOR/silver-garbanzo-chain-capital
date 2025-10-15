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
import type { MMFCalculationParams, MMFNAVResult } from '@/types/nav/mmf'

// Validation schema
const calculatorFormSchema = z.object({
  asOfDate: z.date({
    required_error: 'As-of date is required',
  }),
  includeBreakdown: z.boolean().default(true),
  saveToDatabase: z.boolean().default(true),
  // Config overrides (optional)
  wamLimit: z.number().min(1).max(120).optional(),
  walLimit: z.number().min(1).max(397).optional(),
  dailyLiquidMinimum: z.number().min(0).max(100).optional(),
  weeklyLiquidMinimum: z.number().min(0).max(100).optional(),
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
  const [showConfigOverrides, setShowConfigOverrides] = useState(false)
  const calculateMutation = useCalculateMMFNAV(fundId)

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorFormSchema),
    defaultValues: {
      asOfDate: new Date(),
      includeBreakdown: true,
      saveToDatabase: true,
    },
  })

  const onSubmit = async (values: CalculatorFormValues) => {
    try {
      // Build config overrides if any are provided
      const configOverrides: any = {}
      if (values.wamLimit) {
        configOverrides.compliance = {
          ...configOverrides.compliance,
          wamLimits: { [fundType || 'prime']: values.wamLimit }
        }
      }
      if (values.walLimit) {
        configOverrides.compliance = {
          ...configOverrides.compliance,
          walLimits: { [fundType || 'prime']: values.walLimit }
        }
      }
      if (values.dailyLiquidMinimum !== undefined) {
        configOverrides.liquidity = {
          ...configOverrides.liquidity,
          dailyLiquidMinimum: values.dailyLiquidMinimum / 100
        }
      }
      if (values.weeklyLiquidMinimum !== undefined) {
        configOverrides.liquidity = {
          ...configOverrides.liquidity,
          weeklyLiquidMinimum: values.weeklyLiquidMinimum / 100
        }
      }

      const params: MMFCalculationParams = {
        asOfDate: values.asOfDate,
        includeBreakdown: values.includeBreakdown,
        saveToDatabase: values.saveToDatabase,
        configOverrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined
      }

      const result = await calculateMutation.mutateAsync(params)
      
      setCalculationResult(result.data)
      onSuccess?.(result.data)
    } catch (error) {
      console.error('MMF NAV calculation error:', error)
      onError?.(error as Error)
    }
  }

  return (
    <div className="space-y-6">
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
                        <FormLabel>Save to NAV history</FormLabel>
                        <FormDescription>
                          Store this calculation in the database for historical tracking
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Config Overrides Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
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

                {showConfigOverrides && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Testing Mode</AlertTitle>
                    <AlertDescription>
                      These overrides are temporary and only apply to this calculation.
                      They do not change the database configuration.
                    </AlertDescription>
                  </Alert>
                )}

                {showConfigOverrides && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
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
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Default: 60 days
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
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Default: 120 days
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
                          <FormLabel>Daily Liquid Min (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="25"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Default: 25%
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
                          <FormLabel>Weekly Liquid Min (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Default: 50%
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">About MMF NAV Calculation</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong>Stable NAV:</strong> Calculated using amortized cost method, targeting $1.00 per share.
            This is the primary NAV for money market funds.
          </p>
          <p>
            <strong>Shadow NAV:</strong> Mark-to-market valuation showing the current market value.
            Used for risk monitoring and "breaking the buck" alerts.
          </p>
          <p>
            <strong>Compliance:</strong> All calculations check SEC Rule 2a-7 requirements including
            WAM ≤ 60 days, WAL ≤ 120 days, Daily liquid ≥ 25%, Weekly liquid ≥ 50%.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

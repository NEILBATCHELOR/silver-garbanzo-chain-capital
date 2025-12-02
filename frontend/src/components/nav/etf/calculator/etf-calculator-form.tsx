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
import { cn } from '@/utils/utils'

import type { ETFProduct, ETFCalculationResult } from '@/types/nav/etf'
import { etfService } from '@/services/nav/etfService'
import { CalculationResults } from './calculation-results'
import { PremiumDiscountPanel } from './premium-discount-panel'
import { TrackingMetricsPanel } from './tracking-metrics-panel'
import { CryptoMetricsPanel } from './crypto-metrics-panel'

const calculatorFormSchema = z.object({
  asOfDate: z.date({
    required_error: 'As-of date is required',
  }),
  includeBreakdown: z.boolean().default(true),
  saveToDatabase: z.boolean().default(true),
})

type CalculatorFormValues = z.infer<typeof calculatorFormSchema>

interface ETFCalculatorFormProps {
  product: ETFProduct
  onSuccess?: (result: ETFCalculationResult) => void
  onError?: (error: Error) => void
}

export function ETFCalculatorForm({
  product,
  onSuccess,
  onError,
}: ETFCalculatorFormProps) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationResult, setCalculationResult] = useState<ETFCalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      setIsCalculating(true)
      setError(null)

      const response = await etfService.calculateNAV(
        product.id,
        values.asOfDate,
        {}
      )

      if (response.success && response.data) {
        setCalculationResult(response.data)
        onSuccess?.(response.data)
      } else {
        throw new Error(response.error || 'Calculation failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsCalculating(false)
    }
  }

  const isCryptoETF = product.metadata?.is_crypto_etf

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calculate NAV</CardTitle>
          <CardDescription>
            Calculate Net Asset Value for {product.fund_name} ({product.fund_ticker})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                              'w-full pl-3 text-left font-normal',
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
                      Date for NAV calculation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <FormLabel>
                          Include detailed breakdown
                        </FormLabel>
                        <FormDescription>
                          Show detailed asset breakdown and metrics
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
                        <FormLabel>
                          Save to NAV history
                        </FormLabel>
                        <FormDescription>
                          Store calculation result in database
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isCalculating}
                className="w-full"
              >
                {isCalculating ? (
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
            </form>
          </Form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {calculationResult && (
        <div className="space-y-6">
          <CalculationResults result={calculationResult} product={product} />
          
          {calculationResult.marketPrice && (
            <PremiumDiscountPanel result={calculationResult} product={product} />
          )}
          
          {(calculationResult.trackingError || calculationResult.trackingDifference) && (
            <TrackingMetricsPanel result={calculationResult} product={product} />
          )}
          
          {isCryptoETF && calculationResult.cryptoMetrics && (
            <CryptoMetricsPanel 
              metrics={calculationResult.cryptoMetrics} 
              product={product} 
            />
          )}
        </div>
      )}
    </div>
  )
}

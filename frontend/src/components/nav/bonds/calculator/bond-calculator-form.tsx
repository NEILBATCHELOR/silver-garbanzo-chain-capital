console.log('🚨🚨🚨 bond-calculator-form.tsx FILE LOADED')

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
import { cn } from '@/utils/utils'

import { useCalculateBondNAV } from '@/hooks/bonds/useBondData'
import type { CalculationParams, NAVResult } from '@/types/nav/bonds'

// Validation schema
// NOTE: accountingMethod is determined from the database, not user input
const calculatorFormSchema = z.object({
  asOfDate: z.date({
    required_error: 'As-of date is required',
  }),
  includeBreakdown: z.boolean().default(true),
  includeRiskMetrics: z.boolean().default(true),
  saveToDatabase: z.boolean().default(true),
})

type CalculatorFormValues = z.infer<typeof calculatorFormSchema>

interface BondCalculatorFormProps {
  bondId: string
  bondName: string
  accountingClassification?: 'held_to_maturity' | 'available_for_sale' | 'trading'
  onSuccess?: (result: NAVResult) => void
  onError?: (error: Error) => void
}

export function BondCalculatorForm({
  bondId,
  bondName,
  accountingClassification,
  onSuccess,
  onError,
}: BondCalculatorFormProps) {
  console.log('🟡 BondCalculatorForm mounted with bondId:', bondId)
  
  const [calculationResult, setCalculationResult] = useState<NAVResult | null>(null)
  const calculateMutation = useCalculateBondNAV(bondId)

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorFormSchema),
    defaultValues: {
      asOfDate: new Date(),
      includeBreakdown: true,
      includeRiskMetrics: true,
      saveToDatabase: true,
    },
  })

  const onSubmit = async (values: CalculatorFormValues) => {
    console.log('🟢 FORM SUBMITTED!')
    console.log('🟢 Form values:', values)
    
    try {
      const params: CalculationParams = {
        asOfDate: values.asOfDate,
        includeBreakdown: values.includeBreakdown,
        saveToDatabase: values.saveToDatabase,
      }

      console.log('🟢 Calling calculateMutation.mutateAsync with params:', params)
      
      const result = await calculateMutation.mutateAsync(params)
      
      console.log('🟢 Got result from mutation!')
      console.log('🟢 result:', result)
      console.log('🟢 result type:', typeof result)
      console.log('🟢 result keys:', result ? Object.keys(result) : 'null/undefined')
      console.log('🟢 result.data:', result.data)
      console.log('🟢 result.data.netAssetValue:', result.data?.netAssetValue)
      
      console.log('🟢 Setting calculation result to:', result.data)
      setCalculationResult(result.data)
      
      console.log('🟢 Calling onSuccess callback')
      onSuccess?.(result.data)
      
      console.log('🟢 Form submission complete!')
    } catch (error) {
      console.error('🔴 FORM ERROR:', error)
      onError?.(error as Error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculate Bond NAV
          </CardTitle>
          <CardDescription>
            Calculate the Net Asset Value for {bondName}
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
                      The valuation date for the NAV calculation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Accounting Classification Info */}
              {accountingClassification && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="font-medium text-sm mb-1">Accounting Classification</div>
                  <div className="text-sm text-muted-foreground">
                    This bond uses <span className="font-semibold text-foreground">
                      {accountingClassification === 'held_to_maturity' ? 'Held-to-Maturity (HTM)' :
                       accountingClassification === 'available_for_sale' ? 'Available-for-Sale (AFS)' :
                       'Trading'}
                    </span> accounting treatment. The calculator will automatically use the appropriate valuation method.
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-4">
                <div className="font-medium text-sm">Calculation Options</div>

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
                          Show detailed calculation components and formulas
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="includeRiskMetrics"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include risk metrics</FormLabel>
                        <FormDescription>
                          Calculate duration, convexity, and spread metrics
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
                          Store calculation results in NAV history
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Error Display - Enhanced with Detailed Validation Errors */}
              {calculateMutation.isError && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Calculation Failed</AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                      <p className="font-medium">
                        {calculateMutation.error?.message?.split('\n')[0] || 'An error occurred during calculation'}
                      </p>
                      
                      {/* Show detailed errors if available */}
                      {(calculateMutation.error as any)?.details && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          <p className="text-sm font-semibold">Detailed Information:</p>
                          {(calculateMutation.error as any).details.map((error: any, index: number) => (
                            <div key={index} className="bg-white/10 rounded-lg p-3 space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div className="space-y-1 flex-1">
                                  {/* Error Message */}
                                  <p className="font-medium">
                                    {error.field && `${error.field}: `}{error.message}
                                  </p>
                                  
                                  {/* Error Code (for database errors) */}
                                  {error.code && (
                                    <p className="text-xs opacity-90">
                                      🔧 <span className="font-medium">Error Code:</span> {error.code}
                                    </p>
                                  )}
                                  
                                  {/* Constraint Name (for database errors) */}
                                  {error.constraint && (
                                    <p className="text-xs opacity-90">
                                      ⚠️ <span className="font-medium">Constraint:</span> {error.constraint}
                                    </p>
                                  )}
                                  
                                  {/* Fix Instructions */}
                                  {error.fix && (
                                    <p className="text-xs opacity-90">
                                      💡 <span className="font-medium">Fix:</span> {error.fix}
                                    </p>
                                  )}
                                  
                                  {/* Table Name */}
                                  {error.table && (
                                    <p className="text-xs opacity-90">
                                      📊 <span className="font-medium">Table:</span> {error.table}
                                    </p>
                                  )}
                                  
                                  {/* Context Details (expandable) */}
                                  {error.context && Object.keys(error.context).length > 0 && (
                                    <details className="text-xs opacity-75 mt-2">
                                      <summary className="cursor-pointer hover:opacity-100 font-medium">
                                        Show technical details
                                      </summary>
                                      <div className="mt-2 p-2 bg-black/10 rounded space-y-1">
                                        {Object.entries(error.context).map(([key, value]) => (
                                          <div key={key} className="flex gap-2">
                                            <span className="font-medium">{key}:</span>
                                            <span className="opacity-90">
                                              {typeof value === 'object' 
                                                ? JSON.stringify(value, null, 2)
                                                : String(value)
                                              }
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Show formatted message if no details */}
                      {!(calculateMutation.error as any)?.details && 
                       calculateMutation.error?.message?.includes('\n') && (
                        <pre className="mt-3 text-xs whitespace-pre-wrap font-mono bg-white/10 p-3 rounded-lg max-h-60 overflow-auto">
                          {calculateMutation.error.message}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={calculateMutation.isPending}
                className="w-full"
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
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}


// Default export for lazy loading
export default BondCalculatorForm

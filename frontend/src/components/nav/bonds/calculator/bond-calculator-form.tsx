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
import { AccountingMethodSelector } from './accounting-method-selector'
import type { CalculationParams, NAVResult, AccountingTreatment } from '@/types/nav/bonds'

// Validation schema
const calculatorFormSchema = z.object({
  asOfDate: z.date({
    required_error: 'As-of date is required',
  }),
  accountingMethod: z.enum(['held_to_maturity', 'available_for_sale', 'trading'], {
    required_error: 'Accounting method is required',
  }),
  includeBreakdown: z.boolean().default(true),
  includeRiskMetrics: z.boolean().default(true),
  saveToDatabase: z.boolean().default(true),
})

type CalculatorFormValues = z.infer<typeof calculatorFormSchema>

interface BondCalculatorFormProps {
  bondId: string
  bondName: string
  currentAccountingMethod?: 'held_to_maturity' | 'available_for_sale' | 'trading'
  onSuccess?: (result: NAVResult) => void
  onError?: (error: Error) => void
}

export function BondCalculatorForm({
  bondId,
  bondName,
  currentAccountingMethod,
  onSuccess,
  onError,
}: BondCalculatorFormProps) {
  const [calculationResult, setCalculationResult] = useState<NAVResult | null>(null)
  const calculateMutation = useCalculateBondNAV(bondId)

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorFormSchema),
    defaultValues: {
      asOfDate: new Date(),
      accountingMethod: currentAccountingMethod || 'held_to_maturity',
      includeBreakdown: true,
      includeRiskMetrics: true,
      saveToDatabase: true,
    },
  })

  const onSubmit = async (values: CalculatorFormValues) => {
    try {
      const params: CalculationParams = {
        asOfDate: values.asOfDate,
        accountingMethod: values.accountingMethod as AccountingTreatment,
        includeBreakdown: values.includeBreakdown,
        saveToDatabase: values.saveToDatabase,
      }

      const result = await calculateMutation.mutateAsync(params)
      setCalculationResult(result.data)
      onSuccess?.(result.data)
    } catch (error) {
      console.error('Calculation error:', error)
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

              {/* Accounting Method */}
              <FormField
                control={form.control}
                name="accountingMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accounting Method</FormLabel>
                    <FormControl>
                      <AccountingMethodSelector
                        value={field.value}
                        onChange={field.onChange}
                        currentMethod={currentAccountingMethod}
                      />
                    </FormControl>
                    <FormDescription>
                      Select the accounting treatment method for valuation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              {/* Error Display */}
              {calculateMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Calculation Failed</AlertTitle>
                  <AlertDescription>
                    {calculateMutation.error?.message || 'An error occurred during calculation'}
                  </AlertDescription>
                </Alert>
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

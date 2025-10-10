import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Save, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/utils/utils'

const manualNAVSchema = z.object({
  navValue: z.number().positive('NAV value must be positive'),
  valuationDate: z.date({
    required_error: 'Valuation date is required',
  }),
  dataSource: z.string().min(1, 'Data source is required'),
  notes: z.string().optional(),
  confidenceLevel: z.enum(['high', 'medium', 'low']).default('medium'),
})

type ManualNAVFormValues = z.infer<typeof manualNAVSchema>

interface ManualNAVEntryProps {
  bondId: string
  bondName: string
  currentNAV?: number
  onSave: (values: ManualNAVFormValues) => Promise<void>
}

export function ManualNAVEntry({
  bondId,
  bondName,
  currentNAV,
  onSave,
}: ManualNAVEntryProps) {
  const form = useForm<ManualNAVFormValues>({
    resolver: zodResolver(manualNAVSchema),
    defaultValues: {
      navValue: currentNAV || 0,
      valuationDate: new Date(),
      dataSource: '',
      notes: '',
      confidenceLevel: 'medium',
    },
  })

  const onSubmit = async (values: ManualNAVFormValues) => {
    try {
      await onSave(values)
      form.reset()
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  const navChange = form.watch('navValue') - (currentNAV || 0)
  const navChangePercent = currentNAV ? (navChange / currentNAV) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual NAV Entry</CardTitle>
        <CardDescription>
          Enter NAV manually for {bondName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current NAV Display */}
        {currentNAV && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Current NAV</div>
            <div className="text-2xl font-bold">
              ${currentNAV.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* NAV Value */}
            <FormField
              control={form.control}
              name="navValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NAV Value</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-7"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter the manually calculated or observed NAV
                  </FormDescription>
                  <FormMessage />
                  {currentNAV && navChange !== 0 && (
                    <div className={`text-sm mt-1 ${
                      navChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {navChange >= 0 ? '+' : ''}
                      ${Math.abs(navChange).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {' '}
                      ({navChangePercent >= 0 ? '+' : ''}
                      {navChangePercent.toFixed(2)}%)
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Valuation Date */}
            <FormField
              control={form.control}
              name="valuationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Valuation Date</FormLabel>
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
                    The date this NAV value represents
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data Source */}
            <FormField
              control={form.control}
              name="dataSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Source</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Bloomberg, Internal Model, Broker Quote"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Where this NAV value came from
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confidence Level */}
            <FormField
              control={form.control}
              name="confidenceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence Level</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {(['high', 'medium', 'low'] as const).map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={field.value === level ? 'default' : 'outline'}
                          onClick={() => field.onChange(level)}
                          className="flex-1"
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Your confidence in this NAV value
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any relevant context, assumptions, or methodology..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Document your valuation methodology or any special circumstances
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Manual Entry</AlertTitle>
              <AlertDescription>
                This NAV will be marked as manually entered and will override any automated
                calculations for this date. Ensure accuracy and document your methodology
                in the notes field.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              <Save className="mr-2 h-4 w-4" />
              {form.formState.isSubmitting ? 'Saving...' : 'Save NAV Entry'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

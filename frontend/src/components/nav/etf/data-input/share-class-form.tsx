import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Loader2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

import type { ETFProduct } from '@/types/nav/etf'
import { etfService } from '@/services/nav/etfService'
import { toast } from 'sonner'

const shareClassFormSchema = z.object({
  share_class_name: z.string().min(1, 'Share class name is required').max(50),
  fund_ticker: z.string().min(1, 'Ticker is required').max(10),
  fund_name: z.string().min(1, 'Fund name is required').max(255),
  expense_ratio: z.number().min(0).max(100),
  minimum_investment: z.number().min(0).optional(),
  distribution_frequency: z.string().optional(),
})

type ShareClassFormValues = z.infer<typeof shareClassFormSchema>

interface ShareClassFormProps {
  parentProduct: ETFProduct
  onSuccess?: (productId: string) => void
  onCancel?: () => void
}

export function ShareClassForm({
  parentProduct,
  onSuccess,
  onCancel,
}: ShareClassFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ShareClassFormValues>({
    resolver: zodResolver(shareClassFormSchema),
    defaultValues: {
      share_class_name: '',
      fund_ticker: `${parentProduct.fund_ticker}-`,
      fund_name: `${parentProduct.fund_name} - `,
      expense_ratio: (parentProduct.expense_ratio || 0.5) * 0.8, // Default to 20% lower
      minimum_investment: 1000000,
      distribution_frequency: 'quarterly',
    },
  })

  const onSubmit = async (values: ShareClassFormValues) => {
    try {
      setIsSubmitting(true)

      const response = await etfService.createShareClass(parentProduct.id, {
        share_class_name: values.share_class_name,
        fund_ticker: values.fund_ticker,
        fund_name: values.fund_name,
        expense_ratio: values.expense_ratio,
        minimum_investment: values.minimum_investment,
        distribution_frequency: values.distribution_frequency,
      })

      if (response.success && response.data) {
        toast.success('Share class created successfully')
        onSuccess?.(response.data.id)
      } else {
        throw new Error(response.error || 'Failed to create share class')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create Share Class
        </CardTitle>
        <CardDescription>
          Create a new share class for {parentProduct.fund_name} ({parentProduct.fund_ticker})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="share_class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share Class Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Class I, Class A, Institutional" {...field} />
                    </FormControl>
                    <FormDescription>
                      E.g., "Class I" for institutional, "Class A" for retail
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fund_ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol *</FormLabel>
                      <FormControl>
                        <Input placeholder={`${parentProduct.fund_ticker}-I`} {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique ticker for this share class
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expense_ratio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Ratio (%) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Parent ETF expense ratio: {parentProduct.expense_ratio}%
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fund_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Fund Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={`${parentProduct.fund_name} - Institutional Class`} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="minimum_investment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Investment</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum investment amount (USD)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distribution_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distribution Frequency</FormLabel>
                      <FormControl>
                        <Input placeholder="quarterly, monthly, annually" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold">Share Class Details</h4>
              <p className="text-sm text-muted-foreground">
                This share class will inherit the same portfolio holdings as the parent ETF 
                ({parentProduct.fund_ticker}). The NAV will be calculated separately based on 
                the different expense ratio.
              </p>
            </div>

            <Separator />

            <div className="flex justify-end gap-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Share Class
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/utils/utils'

import { SecurityType } from '@/types/nav/etf'
import type { CreateETFHoldingInput, ETFProduct } from '@/types/nav/etf'
import { etfService } from '@/services/nav/etfService'
import { toast } from 'sonner'

const holdingFormSchema = z.object({
  security_ticker: z.string().optional(),
  security_name: z.string().min(1, 'Security name is required'),
  security_type: z.nativeEnum(SecurityType),
  quantity: z.number().positive('Quantity must be positive'),
  price_per_unit: z.number().positive('Price must be positive'),
  weight_percentage: z.number().min(0).max(100),
  currency: z.string().default('USD'),
  as_of_date: z.date(),
  sector: z.string().optional(),
  country: z.string().optional(),
})

type HoldingFormValues = z.infer<typeof holdingFormSchema>

interface HoldingsFormProps {
  product: ETFProduct
  existingHolding?: Partial<CreateETFHoldingInput> & { id?: string }
  onSuccess?: () => void
  onCancel?: () => void
}

export function HoldingsForm({
  product,
  existingHolding,
  onSuccess,
  onCancel,
}: HoldingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!existingHolding?.id

  const form = useForm<HoldingFormValues>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: {
      security_ticker: existingHolding?.security_ticker || '',
      security_name: existingHolding?.security_name || '',
      security_type: (existingHolding?.security_type as SecurityType) || SecurityType.EQUITY,
      quantity: existingHolding?.quantity || 0,
      price_per_unit: existingHolding?.price_per_unit || 0,
      weight_percentage: existingHolding?.weight_percentage || 0,
      currency: existingHolding?.currency || 'USD',
      as_of_date: existingHolding?.as_of_date ? new Date(existingHolding.as_of_date) : new Date(),
      sector: existingHolding?.sector || '',
      country: existingHolding?.country || '',
    },
  })

  // Calculate market value automatically
  const watchedQuantity = form.watch('quantity')
  const watchedPrice = form.watch('price_per_unit')
  const marketValue = watchedQuantity * watchedPrice

  const onSubmit = async (values: HoldingFormValues) => {
    try {
      setIsSubmitting(true)

      const data: CreateETFHoldingInput = {
        fund_product_id: product.id,
        security_name: values.security_name,
        security_type: values.security_type,
        quantity: values.quantity,
        price_per_unit: values.price_per_unit,
        weight_percentage: values.weight_percentage,
        market_value: marketValue,
        as_of_date: values.as_of_date,
        currency: values.currency,
        security_ticker: values.security_ticker,
        sector: values.sector,
        country: values.country,
      }

      const response = isEditing && existingHolding?.id
        ? await etfService.updateHolding(existingHolding.id, data)
        : await etfService.createHolding(product.id, data)

      if (response.success) {
        toast.success(isEditing ? 'Holding updated' : 'Holding added')
        onSuccess?.()
      } else {
        throw new Error(response.error || 'Operation failed')
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
        <CardTitle>{isEditing ? 'Edit Holding' : 'Add Holding'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update holding information' : `Add a new holding to ${product.fund_ticker}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="security_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Apple Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="security_ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticker Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="AAPL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="security_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SecurityType.EQUITY}>Equity</SelectItem>
                      <SelectItem value={SecurityType.BOND}>Bond</SelectItem>
                      <SelectItem value={SecurityType.CRYPTO}>Crypto</SelectItem>
                      <SelectItem value={SecurityType.COMMODITY}>Commodity</SelectItem>
                      <SelectItem value={SecurityType.CASH}>Cash</SelectItem>
                      <SelectItem value={SecurityType.DERIVATIVE}>Derivative</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Unit *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold">Calculated Market Value</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: form.getValues('currency'),
                }).format(marketValue)}
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector</FormLabel>
                    <FormControl>
                      <Input placeholder="Technology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="United States" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="as_of_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>As-of Date *</FormLabel>
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
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update' : 'Add Holding'}
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

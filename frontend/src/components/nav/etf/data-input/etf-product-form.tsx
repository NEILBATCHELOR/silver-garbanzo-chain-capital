import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Save, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/utils/utils'

import { ETFType, StructureType, ReplicationMethod, RegistrationStatus } from '@/types/nav/etf'
import type { CreateETFProductInput } from '@/types/nav/etf'
import { etfService } from '@/services/nav/etfService'
import { toast } from 'sonner'

const productFormSchema = z.object({
  fund_ticker: z.string().min(1, 'Ticker is required').max(10),
  fund_name: z.string().min(1, 'Name is required').max(255),
  fund_type: z.nativeEnum(ETFType),
  net_asset_value: z.number().positive('NAV must be positive'),
  assets_under_management: z.number().positive('AUM must be positive'),
  shares_outstanding: z.number().positive('Shares must be positive'),
  expense_ratio: z.number().min(0).max(100).optional(),
  total_expense_ratio: z.number().min(0).max(100).optional(),
  benchmark_index: z.string().optional(),
  currency: z.string().default('USD'),
  inception_date: z.date(),
  structure_type: z.nativeEnum(StructureType).optional(),
  replication_method: z.nativeEnum(ReplicationMethod).optional(),
  registration_status: z.nativeEnum(RegistrationStatus).optional(),
  exchange: z.string().optional(),
  isin: z.string().optional(),
  sedol: z.string().optional(),
  cusip: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface ETFProductFormProps {
  projectId: string
  existingProduct?: Partial<CreateETFProductInput> & { id?: string }
  onSuccess?: (productId: string) => void
  onCancel?: () => void
}

export function ETFProductForm({
  projectId,
  existingProduct,
  onSuccess,
  onCancel,
}: ETFProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!existingProduct?.id

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      fund_ticker: existingProduct?.fund_ticker || '',
      fund_name: existingProduct?.fund_name || '',
      fund_type: (existingProduct?.fund_type as ETFType) || ETFType.EQUITY,
      net_asset_value: existingProduct?.net_asset_value || 50,
      assets_under_management: existingProduct?.assets_under_management || 0,
      shares_outstanding: existingProduct?.shares_outstanding || 0,
      expense_ratio: existingProduct?.expense_ratio || 0.5,
      total_expense_ratio: existingProduct?.total_expense_ratio,
      benchmark_index: existingProduct?.benchmark_index || '',
      currency: existingProduct?.currency || 'USD',
      inception_date: existingProduct?.inception_date 
        ? new Date(existingProduct.inception_date) 
        : new Date(),
      structure_type: existingProduct?.structure_type as StructureType,
      replication_method: existingProduct?.replication_method as ReplicationMethod,
      registration_status: existingProduct?.registration_status as RegistrationStatus,
      exchange: existingProduct?.exchange || '',
      isin: existingProduct?.isin || '',
      sedol: existingProduct?.sedol || '',
      cusip: existingProduct?.cusip || '',
    },
  })

  const onSubmit = async (values: ProductFormValues) => {
    try {
      setIsSubmitting(true)

      const data: CreateETFProductInput = {
        project_id: projectId,
        fund_ticker: values.fund_ticker,
        fund_name: values.fund_name,
        fund_type: values.fund_type,
        net_asset_value: values.net_asset_value,
        assets_under_management: values.assets_under_management,
        shares_outstanding: values.shares_outstanding,
        expense_ratio: values.expense_ratio,
        total_expense_ratio: values.total_expense_ratio,
        benchmark_index: values.benchmark_index,
        currency: values.currency,
        inception_date: values.inception_date,
        structure_type: values.structure_type,
        replication_method: values.replication_method,
        registration_status: values.registration_status,
        exchange: values.exchange,
        isin: values.isin,
        sedol: values.sedol,
        cusip: values.cusip,
      }

      const response = isEditing && existingProduct?.id
        ? await etfService.updateETFProduct(existingProduct.id, data)
        : await etfService.createETFProduct(data)

      if (response.success && response.data) {
        toast.success(isEditing ? 'ETF updated successfully' : 'ETF created successfully')
        onSuccess?.(response.data.id)
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
        <CardTitle>{isEditing ? 'Edit ETF Product' : 'Create New ETF'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update ETF product information' : 'Enter details to create a new ETF product'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fund_ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol *</FormLabel>
                      <FormControl>
                        <Input placeholder="SPYX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fund_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ETF Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ETFType.EQUITY}>Equity</SelectItem>
                          <SelectItem value={ETFType.BOND}>Bond</SelectItem>
                          <SelectItem value={ETFType.COMMODITY}>Commodity</SelectItem>
                          <SelectItem value={ETFType.CRYPTO}>Crypto</SelectItem>
                          <SelectItem value={ETFType.SECTOR}>Sector</SelectItem>
                          <SelectItem value={ETFType.THEMATIC}>Thematic</SelectItem>
                          <SelectItem value={ETFType.SMART_BETA}>Smart Beta</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <FormLabel>Fund Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="S&P 500 ETF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="benchmark_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benchmark Index</FormLabel>
                    <FormControl>
                      <Input placeholder="S&P 500" {...field} />
                    </FormControl>
                    <FormDescription>Index this ETF tracks</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Financial Data */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial Data</h3>
              
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="net_asset_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NAV per Share *</FormLabel>
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
                  name="assets_under_management"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AUM *</FormLabel>
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
                  name="shares_outstanding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shares Outstanding *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="expense_ratio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Ratio (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Structure & Classification */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Structure & Classification</h3>
              
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="structure_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Structure Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={StructureType.PHYSICAL}>Physical</SelectItem>
                          <SelectItem value={StructureType.SYNTHETIC}>Synthetic</SelectItem>
                          <SelectItem value={StructureType.ACTIVE}>Active</SelectItem>
                          <SelectItem value={StructureType.PASSIVE}>Passive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="replication_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Replication Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ReplicationMethod.FULL}>Full Replication</SelectItem>
                          <SelectItem value={ReplicationMethod.OPTIMIZED}>Optimized</SelectItem>
                          <SelectItem value={ReplicationMethod.SWAP_BASED}>Swap-Based</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registration_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RegistrationStatus.DRAFT}>Draft</SelectItem>
                          <SelectItem value={RegistrationStatus.PENDING_SEC}>Pending SEC</SelectItem>
                          <SelectItem value={RegistrationStatus.ACTIVE}>Active</SelectItem>
                          <SelectItem value={RegistrationStatus.SUSPENDED}>Suspended</SelectItem>
                          <SelectItem value={RegistrationStatus.LIQUIDATING}>Liquidating</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Dates & Identifiers */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dates & Identifiers</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="inception_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Inception Date *</FormLabel>
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

                <FormField
                  control={form.control}
                  name="exchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange</FormLabel>
                      <FormControl>
                        <Input placeholder="NYSE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISIN</FormLabel>
                      <FormControl>
                        <Input placeholder="US..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cusip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CUSIP</FormLabel>
                      <FormControl>
                        <Input placeholder="..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Actions */}
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
                    {isEditing ? 'Update ETF' : 'Create ETF'}
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

/**
 * MMF Product Form
 * Form for creating/editing Money Market Fund products
 * Follows Bonds pattern with simplified structure (no multi-step wizard needed)
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Calendar, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import { useCreateMMF, useUpdateMMF } from '@/hooks/mmf'
import { 
  mmfProductInputSchema, 
  type MMFProductInputData 
} from '@/types/nav/mmf-validation'
import { MMFFundType, type MMFProduct, type MMFProductInput } from '@/types/nav/mmf'

interface MMFProductFormProps {
  projectId: string
  mmf?: MMFProduct
  onSuccess?: (mmf: MMFProduct) => void
  onCancel?: () => void
}

export function MMFProductForm({ 
  projectId, 
  mmf, 
  onSuccess, 
  onCancel 
}: MMFProductFormProps) {
  const isEdit = !!mmf

  // Setup mutations
  const createMutation = useCreateMMF({
    onSuccess: (response) => {
      onSuccess?.(response.data)
    }
  })

  const updateMutation = useUpdateMMF(mmf?.id || '', {
    onSuccess: (response) => {
      onSuccess?.(response.data)
    }
  })

  // Setup form with validation
  const form = useForm<MMFProductInputData>({
    resolver: zodResolver(mmfProductInputSchema),
    defaultValues: mmf ? {
      project_id: mmf.project_id,
      fund_name: mmf.fund_name,
      fund_type: mmf.fund_type,
      fund_ticker: mmf.fund_ticker,
      net_asset_value: mmf.net_asset_value,
      assets_under_management: mmf.assets_under_management,
      expense_ratio: mmf.expense_ratio,
      benchmark_index: mmf.benchmark_index,
      currency: mmf.currency,
      inception_date: new Date(mmf.inception_date),
      status: mmf.status,
      concentration_limits: mmf.concentration_limits,
    } as MMFProductInputData : {
      project_id: projectId,
      fund_name: '',
      fund_type: MMFFundType.GOVERNMENT,
      currency: 'USD',
      inception_date: new Date(),
      status: 'active',
      net_asset_value: 0,
      assets_under_management: 0,
    } as MMFProductInputData
  })

  const onSubmit = async (data: MMFProductInputData) => {
    // Convert Zod type to API type
    // Zod ensures all required fields are present, but TypeScript needs explicit typing
    const apiData: MMFProductInput = {
      project_id: data.project_id || projectId,
      fund_name: data.fund_name,
      fund_type: data.fund_type,
      // All other fields are optional and can be spread
      ...data,
    }
    
    if (isEdit) {
      await updateMutation.mutateAsync(apiData)
    } else {
      await createMutation.mutateAsync(apiData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEdit ? 'Edit MMF Product' : 'Create MMF Product'}
            </h2>
            <p className="text-muted-foreground">
              {isEdit ? 'Update money market fund details' : 'Create a new money market fund'}
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4 rounded-lg border p-6">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Fund Name */}
            <FormField
              control={form.control}
              name="fund_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Government Money Market Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fund Ticker */}
            <FormField
              control={form.control}
              name="fund_ticker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Ticker</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. GMMXX" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>Optional ticker symbol</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fund Type */}
            <FormField
              control={form.control}
              name="fund_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fund type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={MMFFundType.GOVERNMENT}>Government</SelectItem>
                      <SelectItem value={MMFFundType.PRIME}>Prime</SelectItem>
                      <SelectItem value={MMFFundType.RETAIL}>Retail</SelectItem>
                      <SelectItem value={MMFFundType.INSTITUTIONAL}>Institutional</SelectItem>
                      <SelectItem value={MMFFundType.MUNICIPAL}>Municipal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Determines regulatory requirements (Government: 99.5% gov securities)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Currency */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="USD" {...field} value={field.value || 'USD'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="space-y-4 rounded-lg border p-6">
          <h3 className="text-lg font-semibold">Financial Metrics</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* NAV */}
            <FormField
              control={form.control}
              name="net_asset_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Net Asset Value</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001"
                      placeholder="1.0000" 
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>Target: $1.00 per share</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* AUM */}
            <FormField
              control={form.control}
              name="assets_under_management"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assets Under Management</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0" 
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>Total fund assets in base currency</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expense Ratio */}
            <FormField
              control={form.control}
              name="expense_ratio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Ratio (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.15" 
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>Annual operating expenses as % of AUM</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Benchmark */}
            <FormField
              control={form.control}
              name="benchmark_index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benchmark Index</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. ICE BofA US Treasury Bill Index" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Fund Details */}
        <div className="space-y-4 rounded-lg border p-6">
          <h3 className="text-lg font-semibold">Fund Details</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Inception Date */}
            <FormField
              control={form.control}
              name="inception_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Inception Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'pl-3 text-left font-normal',
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Date the fund was launched</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            <Save className="mr-2 h-4 w-4" />
            {isEdit ? 'Update' : 'Create'} MMF
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

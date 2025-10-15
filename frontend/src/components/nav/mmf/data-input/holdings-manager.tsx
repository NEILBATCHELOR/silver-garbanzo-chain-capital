/**
 * Holdings Manager
 * Editable table for managing MMF portfolio securities
 * Supports add/edit/delete operations with real-time validation
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/shared/utils'

import { 
  useMMFHoldings,
  useAddMMFHoldings,
  useUpdateMMFHolding,
  useDeleteMMFHolding
} from '@/hooks/mmf'
import { 
  mmfHoldingInputSchema, 
  type MMFHoldingInputData 
} from '@/types/nav/mmf-validation'
import { MMFHoldingType, type MMFHolding, type MMFHoldingInput } from '@/types/nav/mmf'

interface HoldingsManagerProps {
  fundId: string
  fundCurrency?: string
}

export function HoldingsManager({ fundId, fundCurrency = 'USD' }: HoldingsManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<MMFHolding | null>(null)

  // Fetch holdings
  const { data: holdingsData, isLoading } = useMMFHoldings(fundId)
  const holdings = holdingsData?.data || []

  // Mutations
  const addMutation = useAddMMFHoldings(fundId, {
    onSuccess: () => {
      setIsAddDialogOpen(false)
    }
  })

  const updateMutation = useUpdateMMFHolding(fundId, {
    onSuccess: () => {
      setEditingHolding(null)
    }
  })

  const deleteMutation = useDeleteMMFHolding(fundId)

  const handleAdd = async (data: MMFHoldingInputData) => {
    // Convert Zod type to API type
    // Zod ensures all required fields are present, but TypeScript needs explicit typing
    const apiData: MMFHoldingInput = {
      fund_product_id: fundId,
      holding_type: data.holding_type,
      issuer_name: data.issuer_name,
      security_description: data.security_description,
      par_value: data.par_value,
      current_price: data.current_price,
      amortized_cost: data.amortized_cost,
      market_value: data.market_value,
      effective_maturity_date: data.effective_maturity_date,
      final_maturity_date: data.final_maturity_date,
      acquisition_date: data.acquisition_date,
      credit_rating: data.credit_rating,
      // All other fields are optional and can be spread
      ...data,
    }
    await addMutation.mutateAsync([apiData])
  }

  const handleUpdate = async (holdingId: string, data: Partial<MMFHoldingInputData>) => {
    // Convert Zod type to API type - Partial is ok for updates
    const apiData: Partial<MMFHoldingInput> = {
      ...data,
    }
    await updateMutation.mutateAsync({ holdingId, data: apiData })
  }

  const handleDelete = async (holdingId: string) => {
    if (confirm('Are you sure you want to delete this holding?')) {
      await deleteMutation.mutateAsync(holdingId)
    }
  }

  // Calculate portfolio totals
  const totalParValue = holdings.reduce((sum, h) => sum + Number(h.par_value), 0)
  const totalAmortizedCost = holdings.reduce((sum, h) => sum + Number(h.amortized_cost), 0)
  const totalMarketValue = holdings.reduce((sum, h) => sum + Number(h.market_value), 0)
  const dailyLiquid = holdings.filter(h => h.is_daily_liquid).reduce((sum, h) => sum + Number(h.amortized_cost), 0)
  const weeklyLiquid = holdings.filter(h => h.is_weekly_liquid || h.is_daily_liquid).reduce((sum, h) => sum + Number(h.amortized_cost), 0)

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Holdings</h3>
          <p className="text-sm text-muted-foreground">
            Manage securities in the money market fund
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <HoldingForm
              fundId={fundId}
              fundCurrency={fundCurrency}
              onSubmit={handleAdd}
              onCancel={() => setIsAddDialogOpen(false)}
              isLoading={addMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-4 rounded-lg border p-4 bg-muted/50">
        <div>
          <p className="text-sm text-muted-foreground">Total Par Value</p>
          <p className="text-2xl font-bold">${totalParValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Amortized Cost</p>
          <p className="text-2xl font-bold">${totalAmortizedCost.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Market Value</p>
          <p className="text-2xl font-bold">${totalMarketValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Liquidity</p>
          <p className="text-sm font-semibold">
            Daily: {totalAmortizedCost > 0 ? ((dailyLiquid / totalAmortizedCost) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-sm font-semibold">
            Weekly: {totalAmortizedCost > 0 ? ((weeklyLiquid / totalAmortizedCost) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead>Security</TableHead>
              <TableHead className="text-right">Par Value</TableHead>
              <TableHead className="text-right">Amortized Cost</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Liquidity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Loading holdings...
                </TableCell>
              </TableRow>
            ) : holdings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No holdings yet. Click "Add Holding" to start building the portfolio.
                </TableCell>
              </TableRow>
            ) : (
              holdings.map((holding) => (
                <TableRow key={holding.id}>
                  <TableCell>
                    <Badge variant="outline">{holding.holding_type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{holding.issuer_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {holding.security_description}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(holding.par_value).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(holding.amortized_cost).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(holding.market_value).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {format(new Date(holding.effective_maturity_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={holding.credit_rating.startsWith('AA') ? 'default' : 'secondary'}>
                      {holding.credit_rating}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {holding.is_daily_liquid && (
                        <Badge variant="default" className="text-xs">D</Badge>
                      )}
                      {holding.is_weekly_liquid && (
                        <Badge variant="secondary" className="text-xs">W</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingHolding(holding)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(holding.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editingHolding && (
        <Dialog open={!!editingHolding} onOpenChange={() => setEditingHolding(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <HoldingForm
              fundId={fundId}
              fundCurrency={fundCurrency}
              holding={editingHolding}
              onSubmit={(data) => handleUpdate(editingHolding.id, data)}
              onCancel={() => setEditingHolding(null)}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ==================== HOLDING FORM COMPONENT ====================

interface HoldingFormProps {
  fundId: string
  fundCurrency: string
  holding?: MMFHolding
  onSubmit: (data: MMFHoldingInputData) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}

function HoldingForm({ fundId, fundCurrency, holding, onSubmit, onCancel, isLoading }: HoldingFormProps) {
  const isEdit = !!holding

  const form = useForm<MMFHoldingInputData>({
    resolver: zodResolver(mmfHoldingInputSchema),
    defaultValues: holding ? {
      fund_product_id: holding.fund_product_id,
      holding_type: holding.holding_type,
      issuer_name: holding.issuer_name,
      issuer_id: holding.issuer_id,
      security_description: holding.security_description,
      cusip: holding.cusip,
      isin: holding.isin,
      par_value: Number(holding.par_value),
      purchase_price: holding.purchase_price ? Number(holding.purchase_price) : null,
      current_price: Number(holding.current_price),
      amortized_cost: Number(holding.amortized_cost),
      market_value: Number(holding.market_value),
      currency: holding.currency,
      quantity: holding.quantity ? Number(holding.quantity) : null,
      yield_to_maturity: holding.yield_to_maturity ? Number(holding.yield_to_maturity) : null,
      coupon_rate: holding.coupon_rate ? Number(holding.coupon_rate) : null,
      effective_maturity_date: new Date(holding.effective_maturity_date),
      final_maturity_date: new Date(holding.final_maturity_date),
      acquisition_date: new Date(holding.acquisition_date),
      credit_rating: holding.credit_rating,
      rating_agency: holding.rating_agency,
      is_government_security: holding.is_government_security,
      is_daily_liquid: holding.is_daily_liquid,
      is_weekly_liquid: holding.is_weekly_liquid,
      is_affiliated_issuer: holding.is_affiliated_issuer,
      concentration_percentage: holding.concentration_percentage ? Number(holding.concentration_percentage) : null,
    } as MMFHoldingInputData : {
      fund_product_id: fundId,
      holding_type: MMFHoldingType.TREASURY,
      issuer_name: '',
      security_description: '',
      par_value: 0,
      current_price: 0,
      amortized_cost: 0,
      market_value: 0,
      currency: fundCurrency,
      effective_maturity_date: new Date(),
      final_maturity_date: new Date(),
      acquisition_date: new Date(),
      credit_rating: 'AAA',
      is_government_security: false,
      is_daily_liquid: false,
      is_weekly_liquid: false,
      is_affiliated_issuer: false,
    } as MMFHoldingInputData
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Update the security details' : 'Add a new security to the portfolio'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-semibold">Basic Information</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="holding_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holding Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={MMFHoldingType.TREASURY}>Treasury</SelectItem>
                        <SelectItem value={MMFHoldingType.AGENCY}>Agency</SelectItem>
                        <SelectItem value={MMFHoldingType.COMMERCIAL_PAPER}>Commercial Paper</SelectItem>
                        <SelectItem value={MMFHoldingType.CD}>Certificate of Deposit</SelectItem>
                        <SelectItem value={MMFHoldingType.REPO}>Repurchase Agreement</SelectItem>
                        <SelectItem value={MMFHoldingType.TIME_DEPOSIT}>Time Deposit</SelectItem>
                        <SelectItem value={MMFHoldingType.VRDN}>VRDN</SelectItem>
                        <SelectItem value={MMFHoldingType.MUNICIPAL}>Municipal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuer Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. U.S. Treasury" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="security_description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Security Description *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. U.S. Treasury Bill 0.00% Due 2025-03-15" {...field} />
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
                      <Input placeholder="9 characters" {...field} value={field.value || ''} />
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
                      <Input placeholder="12 characters" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Valuation */}
          <div className="space-y-4">
            <h4 className="font-semibold">Valuation</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="par_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Par Value *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amortized_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amortized Cost * (KEY)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="market_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Value *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Price *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.0001"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yield_to_maturity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yield to Maturity (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coupon_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Maturity Dates */}
          <div className="space-y-4">
            <h4 className="font-semibold">Maturity</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="effective_maturity_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Effective Maturity *</FormLabel>
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
                name="final_maturity_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Final Maturity *</FormLabel>
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
                name="acquisition_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Acquisition Date *</FormLabel>
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Credit & Rating */}
          <div className="space-y-4">
            <h4 className="font-semibold">Credit & Rating</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="credit_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Rating *</FormLabel>
                    <FormControl>
                      <Input placeholder="AAA, AA+, AA, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rating_agency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating Agency</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Moody's, S&P, Fitch" 
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

          {/* Liquidity & Classification */}
          <div className="space-y-4">
            <h4 className="font-semibold">Liquidity & Classification</h4>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_government_security"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Government Security</FormLabel>
                      <FormDescription>
                        U.S. Treasury or Government Agency security
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_daily_liquid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Daily Liquid Asset</FormLabel>
                      <FormDescription>
                        Can be converted to cash within 1 business day (SEC Rule 2a-7)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_weekly_liquid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Weekly Liquid Asset</FormLabel>
                      <FormDescription>
                        Can be converted to cash within 5 business days (SEC Rule 2a-7)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_affiliated_issuer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Affiliated Issuer</FormLabel>
                      <FormDescription>
                        Issuer is affiliated with the fund or its adviser
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Dialog Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? 'Update' : 'Add'} Holding
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}

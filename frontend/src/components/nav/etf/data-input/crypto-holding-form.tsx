import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Loader2, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/utils/utils'

import { SecurityType, CustodyType } from '@/types/nav/etf'
import type { CreateETFHoldingInput, ETFProduct } from '@/types/nav/etf'
import { etfService } from '@/services/nav/etfService'
import { toast } from 'sonner'

const SUPPORTED_BLOCKCHAINS = [
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'solana', label: 'Solana' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'avalanche', label: 'Avalanche' },
  { value: 'base', label: 'Base' },
]

const TOKEN_STANDARDS = [
  { value: 'native', label: 'Native Token' },
  { value: 'erc20', label: 'ERC-20' },
  { value: 'spl', label: 'SPL Token' },
]

const cryptoHoldingFormSchema = z.object({
  // Basic Security Info
  security_name: z.string().min(1, 'Security name is required'),
  security_ticker: z.string().optional(),
  security_type: z.literal(SecurityType.CRYPTO),
  
  // Crypto-Specific
  blockchain: z.string().min(1, 'Blockchain is required'),
  contract_address: z.string().optional(),
  token_standard: z.string().optional(),
  
  // Quantity & Pricing (high precision for crypto)
  quantity: z.number().positive('Quantity must be positive'),
  price_per_unit: z.number().positive('Price must be positive'),
  weight_percentage: z.number().min(0).max(100),
  currency: z.string().default('USD'),
  
  // Custody
  custodian_name: z.string().optional(),
  custody_address: z.string().optional(),
  custody_type: z.enum([CustodyType.COLD_STORAGE, CustodyType.INSTITUTIONAL_CUSTODY, CustodyType.MULTI_SIG, CustodyType.QUALIFIED_CUSTODIAN] as const).optional(),
  
  // Staking (for PoS chains)
  is_staked: z.boolean().default(false),
  staking_apr: z.number().min(0).max(100).optional(),
  staking_rewards_accrued: z.number().min(0).optional(),
  
  // Classification
  as_of_date: z.date(),
  sector: z.string().optional(),
  country: z.string().optional(),
})

type CryptoHoldingFormValues = z.infer<typeof cryptoHoldingFormSchema>

interface CryptoHoldingFormProps {
  product: ETFProduct
  existingHolding?: Partial<CreateETFHoldingInput> & { id?: string }
  onSuccess?: () => void
  onCancel?: () => void
}

export function CryptoHoldingForm({
  product,
  existingHolding,
  onSuccess,
  onCancel,
}: CryptoHoldingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!existingHolding?.id

  const form = useForm<CryptoHoldingFormValues>({
    resolver: zodResolver(cryptoHoldingFormSchema),
    defaultValues: {
      security_name: existingHolding?.security_name || '',
      security_ticker: existingHolding?.security_ticker || '',
      security_type: SecurityType.CRYPTO,
      blockchain: existingHolding?.blockchain || '',
      contract_address: existingHolding?.contract_address || '',
      token_standard: existingHolding?.token_standard || 'native',
      quantity: existingHolding?.quantity || 0,
      price_per_unit: existingHolding?.price_per_unit || 0,
      weight_percentage: existingHolding?.weight_percentage || 0,
      currency: existingHolding?.currency || 'USD',
      custodian_name: existingHolding?.custodian_name || '',
      custody_address: existingHolding?.custody_address || '',
      custody_type: existingHolding?.custody_type || undefined,
      is_staked: existingHolding?.is_staked || false,
      staking_apr: existingHolding?.staking_apr || 0,
      staking_rewards_accrued: existingHolding?.staking_rewards_accrued || 0,
      as_of_date: existingHolding?.as_of_date ? new Date(existingHolding.as_of_date) : new Date(),
      sector: existingHolding?.sector || 'Cryptocurrency',
      country: existingHolding?.country || '',
    },
  })

  const watchedQuantity = form.watch('quantity')
  const watchedPrice = form.watch('price_per_unit')
  const watchedIsStaked = form.watch('is_staked')
  const watchedBlockchain = form.watch('blockchain')
  const marketValue = watchedQuantity * watchedPrice

  const onSubmit = async (values: CryptoHoldingFormValues) => {
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
        blockchain: values.blockchain,
        contract_address: values.contract_address,
        token_standard: values.token_standard,
        custodian_name: values.custodian_name,
        custody_address: values.custody_address,
        custody_type: values.custody_type,
        is_staked: values.is_staked,
        staking_apr: values.staking_apr,
        staking_rewards_accrued: values.staking_rewards_accrued,
        sector: values.sector,
        country: values.country,
      }

      const response = isEditing && existingHolding?.id
        ? await etfService.updateHolding(existingHolding.id, data)
        : await etfService.createHolding(product.id, data)

      if (response.success) {
        toast.success(isEditing ? 'Crypto holding updated' : 'Crypto holding added')
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
        <CardTitle>{isEditing ? 'Edit' : 'Add'} Crypto Holding</CardTitle>
        <CardDescription>
          {isEditing ? 'Update' : 'Add a new'} cryptocurrency holding to {product.fund_name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="security_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Bitcoin" {...field} />
                      </FormControl>
                      <FormDescription>Full name of the cryptocurrency</FormDescription>
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
                        <Input placeholder="BTC" {...field} />
                      </FormControl>
                      <FormDescription>Optional ticker symbol</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Blockchain Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Blockchain Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="blockchain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blockchain *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blockchain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPORTED_BLOCKCHAINS.map((chain) => (
                            <SelectItem key={chain.value} value={chain.value}>
                              {chain.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Primary blockchain network</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="token_standard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Standard</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select standard" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TOKEN_STANDARDS.map((standard) => (
                            <SelectItem key={standard.value} value={standard.value}>
                              {standard.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Token type (native, ERC-20, SPL)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contract_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormDescription>Smart contract address (for tokens)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Quantity & Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quantity & Pricing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.00000001"
                          placeholder="0.00000000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>High precision (8 decimals)</FormDescription>
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
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Current market price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Portfolio weight</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Market Value: ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </AlertDescription>
              </Alert>
            </div>

            <Separator />

            {/* Custody Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Custody Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="custodian_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custodian Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Coinbase Custody" {...field} />
                      </FormControl>
                      <FormDescription>Institutional custodian</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="custody_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custody Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select custody type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CustodyType.COLD_STORAGE}>Cold Storage</SelectItem>
                          <SelectItem value={CustodyType.INSTITUTIONAL_CUSTODY}>Institutional Custody</SelectItem>
                          <SelectItem value={CustodyType.MULTI_SIG}>Multi-Signature</SelectItem>
                          <SelectItem value={CustodyType.QUALIFIED_CUSTODIAN}>Qualified Custodian</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Storage method</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="custody_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custody Address</FormLabel>
                    <FormControl>
                      <Input placeholder="bc1q..." {...field} />
                    </FormControl>
                    <FormDescription>On-chain custody address</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Staking Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Staking Configuration</h3>
              
              <FormField
                control={form.control}
                name="is_staked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Staking</FormLabel>
                      <FormDescription>
                        This asset is staked (for PoS blockchains like Ethereum, Solana)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {watchedIsStaked && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="staking_apr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staking APR %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Annual percentage rate</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="staking_rewards_accrued"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rewards Accrued</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.00000001"
                            placeholder="0.00000000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Accumulated rewards</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="as_of_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>As of Date *</FormLabel>
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
                              {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Valuation date</FormDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Valuation currency</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update' : 'Add'} Holding
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

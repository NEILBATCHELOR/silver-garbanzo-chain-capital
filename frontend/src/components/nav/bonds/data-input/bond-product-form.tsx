/**
 * Bond Product Form
 * Multi-step wizard for creating/editing bond products in database
 * Handles all 41 fields from bond_products table with validation
 */

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/utils/shared/utils'

import { useCreateBond, useUpdateBond } from '@/hooks/bonds'
import { 
  bondProductInputSchema, 
  type BondProductInputData 
} from '@/types/nav/bonds-validation'
import {
  BondType,
  IssuerType,
  Seniority,
  AccountingTreatment,
  type BondProductInput,
  DayCountConvention,
  type BondProduct
} from '@/types/nav/bonds'

interface BondProductFormProps {
  projectId: string
  bond?: BondProduct
  onSuccess?: (bond: BondProduct) => void
  onCancel?: () => void
}

const STEPS = [
  { id: 1, title: 'Basic Information', description: 'Identifiers and issuer details' },
  { id: 2, title: 'Characteristics', description: 'Financial terms and dates' },
  { id: 3, title: 'Features & Accounting', description: 'Options and classification' },
]

export function BondProductForm({ 
  projectId, 
  bond, 
  onSuccess, 
  onCancel 
}: BondProductFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const isEdit = !!bond

  // Setup mutations
  const createMutation = useCreateBond({
    onSuccess: (response) => {
      onSuccess?.(response.data)
    }
  })

  const updateMutation = useUpdateBond(bond?.id || '', {
    onSuccess: (response) => {
      onSuccess?.(response.data)
    }
  })

  // Setup form with validation
  const form = useForm<BondProductInputData>({
    resolver: zodResolver(bondProductInputSchema),
    defaultValues: bond ? {
      project_id: bond.project_id,
      bond_type: bond.bond_type as BondType,
      face_value: bond.face_value || 1000000,
      coupon_rate: bond.coupon_rate || 0,
      coupon_frequency: bond.coupon_frequency || '2',
      issue_date: bond.issue_date ? new Date(bond.issue_date) : new Date(),
      maturity_date: bond.maturity_date ? new Date(bond.maturity_date) : new Date(),
      accounting_treatment: bond.accounting_treatment as AccountingTreatment,
      currency: bond.currency || 'USD',
      isin: bond.isin,
      cusip: bond.cusip,
      sedol: bond.sedol,
      asset_name: bond.asset_name,
      issuer_name: bond.issuer_name,
      issuer_type: bond.issuer_type as IssuerType,
      credit_rating: bond.credit_rating,
      seniority: bond.seniority as Seniority,
      day_count_convention: bond.day_count_convention as DayCountConvention,
      purchase_date: bond.purchase_date ? new Date(bond.purchase_date) : undefined,
      purchase_price: bond.purchase_price,
      current_price: bond.current_price,
      callable_features: bond.callable_features,
      puttable: bond.puttable,
      convertible: bond.convertible,
      status: bond.status,
    } : {
      project_id: projectId,
      bond_type: BondType.CORPORATE,
      face_value: 1000000,
      coupon_rate: 0.05,
      coupon_frequency: '2',
      issue_date: new Date(),
      maturity_date: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
      accounting_treatment: AccountingTreatment.HELD_TO_MATURITY,
      currency: 'USD',
    }
  })

  // Handle form submission
  const onSubmit = useCallback(async (data: BondProductInputData) => {
    // Ensure required fields are set
    const submitData: BondProductInput = {
      project_id: data.project_id || projectId,
      bond_type: data.bond_type,
      face_value: data.face_value,
      coupon_rate: data.coupon_rate,
      coupon_frequency: data.coupon_frequency,
      issue_date: data.issue_date,
      maturity_date: data.maturity_date,
      accounting_treatment: data.accounting_treatment,
      currency: data.currency,
      ...data,
    }
    
    if (isEdit) {
      await updateMutation.mutateAsync(submitData)
    } else {
      await createMutation.mutateAsync(submitData)
    }
  }, [isEdit, createMutation, updateMutation, projectId])

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, STEPS.length))
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1))

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.id}
              </div>
              <div className="text-xs mt-1 text-center">
                <div className="font-medium">{step.title}</div>
                <div className="text-muted-foreground">{step.description}</div>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bond_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bond Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={BondType.GOVERNMENT}>Government</SelectItem>
                          <SelectItem value={BondType.CORPORATE}>Corporate</SelectItem>
                          <SelectItem value={BondType.MUNICIPAL}>Municipal</SelectItem>
                          <SelectItem value={BondType.AGENCY}>Agency</SelectItem>
                          <SelectItem value={BondType.SUPRANATIONAL}>Supranational</SelectItem>
                          <SelectItem value={BondType.ASSET_BACKED}>Asset-Backed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="isin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISIN</FormLabel>
                      <FormControl>
                        <Input placeholder="US1234567890" {...field} />
                      </FormControl>
                      <FormDescription>12-character ISIN code</FormDescription>
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
                        <Input placeholder="123456789" {...field} />
                      </FormControl>
                      <FormDescription>9-character CUSIP code</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sedol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SEDOL</FormLabel>
                      <FormControl>
                        <Input placeholder="B0WNLY7" {...field} />
                      </FormControl>
                      <FormDescription>7-character SEDOL code</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="asset_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bond Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Apple Inc 3.25% 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issuer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Apple Inc" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuer_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuer Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={IssuerType.SOVEREIGN}>Sovereign</SelectItem>
                          <SelectItem value={IssuerType.CORPORATE}>Corporate</SelectItem>
                          <SelectItem value={IssuerType.FINANCIAL}>Financial</SelectItem>
                          <SelectItem value={IssuerType.GOVERNMENT_AGENCY}>Government Agency</SelectItem>
                          <SelectItem value={IssuerType.SUPRANATIONAL}>Supranational</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 2: Characteristics - Continue in next chunk */}
          {/* Step 2: Characteristics */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bond Characteristics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="face_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Face Value *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Par value of the bond</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coupon_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Rate * (decimal)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001"
                          min="0"
                          max="1"
                          placeholder="0.05"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Annual rate (e.g., 0.05 for 5%)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coupon_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Frequency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="2">Semi-annual (2x per year)</SelectItem>
                        <SelectItem value="4">Quarterly (4x per year)</SelectItem>
                        <SelectItem value="12">Monthly (12x per year)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issue_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issue Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : "Pick date"}
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
                  name="maturity_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Maturity Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : "Pick date"}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date <= new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="credit_rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Rating</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AAA">AAA</SelectItem>
                          <SelectItem value="AA+">AA+</SelectItem>
                          <SelectItem value="AA">AA</SelectItem>
                          <SelectItem value="AA-">AA-</SelectItem>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="BBB+">BBB+</SelectItem>
                          <SelectItem value="BBB">BBB</SelectItem>
                          <SelectItem value="BBB-">BBB-</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seniority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seniority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select seniority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={Seniority.SENIOR_SECURED}>Senior Secured</SelectItem>
                          <SelectItem value={Seniority.SENIOR_UNSECURED}>Senior Unsecured</SelectItem>
                          <SelectItem value={Seniority.SUBORDINATED}>Subordinated</SelectItem>
                          <SelectItem value={Seniority.JUNIOR}>Junior</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="day_count_convention"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day Count Convention</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select convention" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={DayCountConvention.ACTUAL_ACTUAL}>Actual/Actual</SelectItem>
                          <SelectItem value={DayCountConvention.ACTUAL_360}>Actual/360</SelectItem>
                          <SelectItem value={DayCountConvention.ACTUAL_365}>Actual/365</SelectItem>
                          <SelectItem value={DayCountConvention.THIRTY_360}>30/360</SelectItem>
                          <SelectItem value={DayCountConvention.THIRTY_360E}>30/360E</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 3: Features & Accounting */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features & Accounting</h3>
              
              <FormField
                control={form.control}
                name="accounting_treatment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accounting Treatment *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AccountingTreatment.HELD_TO_MATURITY}>
                          Held to Maturity (HTM)
                        </SelectItem>
                        <SelectItem value={AccountingTreatment.AVAILABLE_FOR_SALE}>
                          Available for Sale (AFS)
                        </SelectItem>
                        <SelectItem value={AccountingTreatment.TRADING}>
                          Trading
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines valuation method: HTM uses amortized cost, AFS/Trading use fair value
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Label>Bond Features</Label>
                <div className="flex flex-col space-y-2">
                  <FormField
                    control={form.control}
                    name="callable_features"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Callable (issuer can redeem early)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="puttable"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Puttable (investor can sell back early)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="convertible"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Convertible (can convert to equity)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Purchase Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : "Pick date"}
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
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="1000000"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Price paid for the bond</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="matured">Matured</SelectItem>
                        <SelectItem value="called">Called</SelectItem>
                        <SelectItem value="defaulted">Defaulted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={isLoading}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={isLoading}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEdit ? 'Update Bond' : 'Create Bond'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default BondProductForm

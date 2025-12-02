/**
 * New ETF Wizard
 * Multi-step form for creating new ETF products
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { ETFType } from '@/types/nav/etf'
import { etfService } from '@/services/nav/etfService'
import { useToast } from '@/components/ui/use-toast'

const basicInfoSchema = z.object({
  fund_ticker: z.string().min(1, 'Ticker is required').max(10, 'Ticker must be 10 characters or less'),
  fund_name: z.string().min(1, 'Fund name is required'),
  fund_type: z.nativeEnum(ETFType),
  benchmark_index: z.string().optional(),
  currency: z.string().default('USD'),
})

const strategySchema = z.object({
  investment_objective: z.string().min(10, 'Investment objective required (min 10 characters)'),
  strategy_description: z.string().optional(),
  replication_method: z.enum(['full', 'optimized', 'swap_based']).optional(),
  is_crypto_etf: z.boolean().default(false),
  supported_blockchains: z.array(z.string()).optional(),
})

const feesSchema = z.object({
  expense_ratio: z.number().min(0).max(5),
  total_expense_ratio: z.number().min(0).max(5).optional(),
})

const seedCapitalSchema = z.object({
  initial_nav: z.number().min(1),
  initial_shares: z.number().min(1),
  assets_under_management: z.number().min(0),
})

type WizardStep = 'basic' | 'strategy' | 'fees' | 'seed' | 'review'

interface NewETFWizardProps {
  projectId: string
  onComplete?: (etfId: string) => void
  onCancel?: () => void
}

export function NewETFWizard({ projectId, onComplete, onCancel }: NewETFWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  const [wizardData, setWizardData] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const basicForm = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      fund_ticker: '',
      fund_name: '',
      fund_type: ETFType.EQUITY,
      benchmark_index: '',
      currency: 'USD',
    },
  })

  const strategyForm = useForm({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      investment_objective: '',
      strategy_description: '',
      replication_method: undefined,
      is_crypto_etf: false,
      supported_blockchains: [],
    },
  })

  const feesForm = useForm({
    resolver: zodResolver(feesSchema),
    defaultValues: {
      expense_ratio: 0.0050,
      total_expense_ratio: undefined,
    },
  })

  const seedForm = useForm({
    resolver: zodResolver(seedCapitalSchema),
    defaultValues: {
      initial_nav: 50.0,
      initial_shares: 100000,
      assets_under_management: 5000000,
    },
  })

  const steps: Array<{ key: WizardStep; label: string; description: string }> = [
    { key: 'basic', label: 'Basic Info', description: 'Ticker, name, and type' },
    { key: 'strategy', label: 'Strategy', description: 'Investment objective and approach' },
    { key: 'fees', label: 'Fees', description: 'Expense ratios' },
    { key: 'seed', label: 'Seed Capital', description: 'Initial funding' },
    { key: 'review', label: 'Review', description: 'Confirm and create' },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleBasicNext = basicForm.handleSubmit((data) => {
    setWizardData({ ...wizardData, ...data })
    setCurrentStep('strategy')
  })

  const handleStrategyNext = strategyForm.handleSubmit((data) => {
    setWizardData({ ...wizardData, ...data })
    setCurrentStep('fees')
  })

  const handleFeesNext = feesForm.handleSubmit((data) => {
    setWizardData({ ...wizardData, ...data })
    setCurrentStep('seed')
  })

  const handleSeedNext = seedForm.handleSubmit((data) => {
    setWizardData({ ...wizardData, ...data })
    setCurrentStep('review')
  })

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const etfData = {
        ...wizardData,
        project_id: projectId,
        net_asset_value: wizardData.initial_nav,
        shares_outstanding: wizardData.initial_shares,
        status: 'active',
        registration_status: 'draft',
      }

      const result = await etfService.createETFProduct(etfData)
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create ETF')
      }

      toast({
        title: 'ETF Created Successfully',
        description: `${result.data.fund_ticker} has been created in draft status.`,
      })

      onComplete?.(result.data.id)
    } catch (error) {
      toast({
        title: 'Error Creating ETF',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    const steps: WizardStep[] = ['basic', 'strategy', 'fees', 'seed', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle>Create New ETF</CardTitle>
          <CardDescription>
            {steps[currentStepIndex].description}
          </CardDescription>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="font-medium">{steps[currentStepIndex].label}</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 'basic' && (
            <Form {...basicForm}>
              <form onSubmit={handleBasicNext} className="space-y-4">
                <FormField
                  control={basicForm.control}
                  name="fund_ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol *</FormLabel>
                      <FormControl>
                        <Input placeholder="BTCX" {...field} />
                      </FormControl>
                      <FormDescription>
                        Trading symbol (max 10 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={basicForm.control}
                  name="fund_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Bitcoin Trust ETF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={basicForm.control}
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
                          <SelectItem value={ETFType.EQUITY}>Equity ETF</SelectItem>
                          <SelectItem value={ETFType.BOND}>Bond ETF</SelectItem>
                          <SelectItem value={ETFType.COMMODITY}>Commodity ETF</SelectItem>
                          <SelectItem value={ETFType.CRYPTO}>Crypto ETF</SelectItem>
                          <SelectItem value={ETFType.SECTOR}>Sector ETF</SelectItem>
                          <SelectItem value={ETFType.THEMATIC}>Thematic ETF</SelectItem>
                          <SelectItem value={ETFType.SMART_BETA}>Smart Beta ETF</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={basicForm.control}
                  name="benchmark_index"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benchmark Index</FormLabel>
                      <FormControl>
                        <Input placeholder="S&P 500" {...field} />
                      </FormControl>
                      <FormDescription>
                        Primary benchmark for tracking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {currentStep === 'strategy' && (
            <Form {...strategyForm}>
              <form onSubmit={handleStrategyNext} className="space-y-4">
                <FormField
                  control={strategyForm.control}
                  name="investment_objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Objective *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="To track the performance of..." 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Clear statement of fund's goals (min 10 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={strategyForm.control}
                  name="strategy_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed investment strategy..." 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={strategyForm.control}
                  name="replication_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Replication Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full">Full Replication</SelectItem>
                          <SelectItem value="optimized">Optimized Sampling</SelectItem>
                          <SelectItem value="swap_based">Swap-Based</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How the ETF will track its benchmark
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          )}
          {currentStep === 'fees' && (
            <Form {...feesForm}>
              <form onSubmit={handleFeesNext} className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Expense ratios are expressed as annual percentages. Lower fees are more competitive.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={feesForm.control}
                  name="expense_ratio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Ratio (%) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001"
                          placeholder="0.0050"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Annual management fee (e.g., 0.0050 = 0.50%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={feesForm.control}
                  name="total_expense_ratio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Expense Ratio (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001"
                          placeholder="0.0065"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Includes all fund expenses (if different from expense ratio)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {currentStep === 'seed' && (
            <Form {...seedForm}>
              <form onSubmit={handleSeedNext} className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Set initial values for your ETF. Typical starting NAV is $25-$50 per share.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={seedForm.control}
                  name="initial_nav"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial NAV per Share ($) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="50.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Starting price per share (common: $25, $50, or $100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={seedForm.control}
                  name="initial_shares"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Shares Outstanding *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="100000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of shares at launch
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={seedForm.control}
                  name="assets_under_management"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial AUM ($) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="5000000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Total value of assets at launch (NAV × Shares)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {seedForm.watch('initial_nav') && seedForm.watch('initial_shares') && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Calculated Total:</p>
                    <p className="text-2xl font-bold">
                      ${(seedForm.watch('initial_nav') * seedForm.watch('initial_shares')).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      NAV per share × Shares outstanding
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit">
                    Review <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          )}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Review your ETF details before creation. You can edit holdings and settings after creation.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">Ticker</dt>
                      <dd className="font-mono font-bold">{wizardData.fund_ticker}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Fund Name</dt>
                      <dd className="font-medium">{wizardData.fund_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Type</dt>
                      <dd><Badge>{wizardData.fund_type}</Badge></dd>
                    </div>
                    {wizardData.benchmark_index && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Benchmark</dt>
                        <dd>{wizardData.benchmark_index}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Strategy</h3>
                  <div className="space-y-2">
                    <div>
                      <dt className="text-sm text-muted-foreground">Investment Objective</dt>
                      <dd className="text-sm mt-1">{wizardData.investment_objective}</dd>
                    </div>
                    {wizardData.replication_method && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Replication Method</dt>
                        <dd className="text-sm mt-1 capitalize">{wizardData.replication_method.replace('_', ' ')}</dd>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Fees</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">Expense Ratio</dt>
                      <dd className="font-semibold">{(wizardData.expense_ratio * 100).toFixed(2)}%</dd>
                    </div>
                    {wizardData.total_expense_ratio && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Total Expense Ratio</dt>
                        <dd className="font-semibold">{(wizardData.total_expense_ratio * 100).toFixed(2)}%</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Seed Capital</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">Initial NAV</dt>
                      <dd className="font-semibold">${wizardData.initial_nav?.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Initial Shares</dt>
                      <dd className="font-semibold">{wizardData.initial_shares?.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Initial AUM</dt>
                      <dd className="font-semibold">${wizardData.assets_under_management?.toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create ETF'}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Indicators */}
      <div className="flex justify-center gap-2">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`w-2 h-2 rounded-full ${
              index <= currentStepIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

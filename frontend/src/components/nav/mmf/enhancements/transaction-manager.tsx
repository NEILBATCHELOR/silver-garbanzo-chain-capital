/**
 * ENHANCEMENT 5: Transaction Manager
 * Pre-trade impact analysis with compliance checks and execution
 * Following Bonds pattern - Zero hardcoded values
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MMFAPI } from '@/infrastructure/api/nav/mmf-api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TransactionManagerProps {
  fundId: string
}

const transactionSchema = z.object({
  type: z.enum(['buy', 'sell', 'mature']),
  holdingType: z.string().min(1, 'Holding type is required'),
  issuerName: z.string().min(1, 'Issuer name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  maturityDate: z.date(),
  isGovernmentSecurity: z.boolean(),
  isDailyLiquid: z.boolean(),
  isWeeklyLiquid: z.boolean(),
  creditRating: z.string().min(1, 'Credit rating is required')
})

type TransactionInput = z.infer<typeof transactionSchema>

export function TransactionManager({ fundId }: TransactionManagerProps) {
  const [showImpactDialog, setShowImpactDialog] = useState(false)
  const [impactData, setImpactData] = useState<any>(null)
  const [isExecuted, setIsExecuted] = useState(false) // Track if transaction was executed
  
  const queryClient = useQueryClient()

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'buy',
      holdingType: '',
      issuerName: '',
      quantity: 0,
      price: 0,
      maturityDate: new Date(),
      isGovernmentSecurity: false,
      isDailyLiquid: false,
      isWeeklyLiquid: false,
      creditRating: 'A-1'
    } as TransactionInput
  })

  const analyzeMutation = useMutation({
    mutationFn: (data: TransactionInput) => {
      return MMFAPI.analyzeTransactionImpact(fundId, data as {
        type: 'buy' | 'sell' | 'mature'
        holdingType: string
        issuerName: string
        quantity: number
        price: number
        maturityDate: Date
        isGovernmentSecurity: boolean
        isDailyLiquid: boolean
        isWeeklyLiquid: boolean
        creditRating: string
      })
    },
    onSuccess: (response) => {
      setImpactData(response.data)
      setIsExecuted(false) // This is just analysis
      setShowImpactDialog(true)
    },
    onError: (error) => {
      toast.error(`Failed to analyze transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  const executeMutation = useMutation({
    mutationFn: (data: TransactionInput) => {
      return MMFAPI.executeTransaction(fundId, data as {
        type: 'buy' | 'sell' | 'mature'
        holdingType: string
        issuerName: string
        quantity: number
        price: number
        maturityDate: Date
        isGovernmentSecurity: boolean
        isDailyLiquid: boolean
        isWeeklyLiquid: boolean
        creditRating: string
      })
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Transaction executed successfully')
      setImpactData(response.data)
      setIsExecuted(true) // Transaction was executed
      setShowImpactDialog(true)
      form.reset()
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['mmf', fundId] })
      queryClient.invalidateQueries({ queryKey: ['mmf-holdings', fundId] })
      queryClient.invalidateQueries({ queryKey: ['mmf-calculations', fundId] })
    },
    onError: (error) => {
      toast.error(`Failed to execute transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  const onAnalyze = (data: TransactionInput) => {
    analyzeMutation.mutate(data)
  }

  const onExecute = () => {
    const data = form.getValues()
    executeMutation.mutate(data)
    setShowImpactDialog(false)
  }

  const onSubmit = (data: TransactionInput) => {
    // Default: analyze first
    onAnalyze(data)
  }

  const handleCloseDialog = () => {
    setShowImpactDialog(false)
    setImpactData(null)
    setIsExecuted(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Manager</CardTitle>
          <CardDescription>Buy, sell, or process maturities with compliance pre-checks</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Transaction Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                        <SelectItem value="mature">Mature</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Holding Type */}
                <FormField
                  control={form.control}
                  name="holdingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Holding Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="treasury">Treasury Bill</SelectItem>
                          <SelectItem value="agency">Agency Security</SelectItem>
                          <SelectItem value="commercial_paper">Commercial Paper</SelectItem>
                          <SelectItem value="cd">Certificate of Deposit</SelectItem>
                          <SelectItem value="repo">Repurchase Agreement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Issuer Name */}
                <FormField
                  control={form.control}
                  name="issuerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuer Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., U.S. Treasury" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Maturity Date */}
                <FormField
                  control={form.control}
                  name="maturityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maturity Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value instanceof Date
                            ? field.value.toISOString().split('T')[0]
                            : ''
                          }
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Credit Rating */}
                <FormField
                  control={form.control}
                  name="creditRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Rating</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A-1+">A-1+ (Prime-1)</SelectItem>
                          <SelectItem value="A-1">A-1 (Prime-1)</SelectItem>
                          <SelectItem value="A-2">A-2 (Prime-2)</SelectItem>
                          <SelectItem value="A-3">A-3 (Prime-3)</SelectItem>
                          <SelectItem value="AAA">AAA</SelectItem>
                          <SelectItem value="AA+">AA+</SelectItem>
                          <SelectItem value="AA">AA</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Flags */}
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="isGovernmentSecurity"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Government Security</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDailyLiquid"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Daily Liquid Asset</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isWeeklyLiquid"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Weekly Liquid Asset</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={analyzeMutation.isPending}>
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Transaction Impact'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Impact Analysis Dialog */}
      {impactData && (
        <Dialog open={showImpactDialog} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isExecuted ? 'Transaction Executed Successfully' : 'Transaction Impact Analysis'}
              </DialogTitle>
              <DialogDescription>
                {isExecuted 
                  ? 'Below are the results of the executed transaction'
                  : 'Review the impact before executing the transaction'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Recommendation Banner */}
              <Alert
                variant={
                  isExecuted 
                    ? 'default'
                    : impactData.recommendation === 'approve'
                      ? 'default'
                      : impactData.recommendation === 'reject'
                        ? 'destructive'
                        : 'default'
                }
              >
                {(isExecuted || impactData.recommendation === 'approve') && <CheckCircle2 className="h-4 w-4" />}
                {!isExecuted && impactData.recommendation === 'review' && <AlertCircle className="h-4 w-4" />}
                {!isExecuted && impactData.recommendation === 'reject' && <XCircle className="h-4 w-4" />}
                <AlertTitle className="uppercase">
                  {isExecuted ? 'SUCCESS' : impactData.recommendation}
                </AlertTitle>
                <AlertDescription>
                  {isExecuted 
                    ? impactData.message || 'Transaction has been executed and holdings have been updated'
                    : impactData.recommendationReason
                  }
                </AlertDescription>
              </Alert>

              {/* Transaction Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Type</div>
                    <div className="font-medium capitalize">{impactData.transaction.type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Security</div>
                    <div className="font-medium">{impactData.transaction.security || impactData.transaction.issuer}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Quantity</div>
                    <div className="font-medium">
                      {impactData.transaction.quantity.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                    <div className="font-medium">
                      ${(impactData.transaction.totalValue / 1_000_000).toFixed(2)}M
                    </div>
                  </div>
                  {isExecuted && (
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground">Transaction ID</div>
                      <div className="font-mono text-sm">{impactData.transaction.id}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Impact Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Impact on Portfolio Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Before</TableHead>
                        <TableHead>After</TableHead>
                        <TableHead>Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>NAV</TableCell>
                        <TableCell>${impactData.preTransaction.nav.toFixed(4)}</TableCell>
                        <TableCell>${impactData.postTransaction.nav.toFixed(4)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              impactData.impacts.navChange < 0
                                ? 'text-red-500'
                                : 'text-green-500'
                            }
                          >
                            {impactData.impacts.navChange >= 0 ? '+' : ''}
                            ${impactData.impacts.navChange.toFixed(4)}
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>WAM</TableCell>
                        <TableCell>{impactData.preTransaction.wam.toFixed(1)} days</TableCell>
                        <TableCell>{impactData.postTransaction.wam.toFixed(1)} days</TableCell>
                        <TableCell>
                          <span
                            className={
                              impactData.impacts.wamChange > 0
                                ? 'text-yellow-500'
                                : 'text-green-500'
                            }
                          >
                            {impactData.impacts.wamChange > 0 ? '+' : ''}
                            {impactData.impacts.wamChange.toFixed(1)} days
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>WAL</TableCell>
                        <TableCell>{impactData.preTransaction.wal.toFixed(1)} days</TableCell>
                        <TableCell>{impactData.postTransaction.wal.toFixed(1)} days</TableCell>
                        <TableCell>
                          <span
                            className={
                              impactData.impacts.walChange > 0
                                ? 'text-yellow-500'
                                : 'text-green-500'
                            }
                          >
                            {impactData.impacts.walChange > 0 ? '+' : ''}
                            {impactData.impacts.walChange.toFixed(1)} days
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Daily Liquidity</TableCell>
                        <TableCell>
                          {(impactData.preTransaction.dailyLiquidPercentage || impactData.preTransaction.dailyLiquid).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          {(impactData.postTransaction.dailyLiquidPercentage || impactData.postTransaction.dailyLiquid).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              impactData.impacts.dailyLiquidChange < 0
                                ? 'text-yellow-500'
                                : 'text-green-500'
                            }
                          >
                            {impactData.impacts.dailyLiquidChange > 0 ? '+' : ''}
                            {impactData.impacts.dailyLiquidChange.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Weekly Liquidity</TableCell>
                        <TableCell>
                          {(impactData.preTransaction.weeklyLiquidPercentage || impactData.preTransaction.weeklyLiquid).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          {(impactData.postTransaction.weeklyLiquidPercentage || impactData.postTransaction.weeklyLiquid).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              impactData.impacts.weeklyLiquidChange < 0
                                ? 'text-yellow-500'
                                : 'text-green-500'
                            }
                          >
                            {impactData.impacts.weeklyLiquidChange > 0 ? '+' : ''}
                            {impactData.impacts.weeklyLiquidChange.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Concentration Check (only for buy transactions in analysis mode) */}
              {!isExecuted && impactData.transaction.type === 'buy' && impactData.concentrationCheck && (
                <Card>
                  <CardHeader>
                    <CardTitle>Concentration Risk Check</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert
                      variant={
                        impactData.concentrationCheck.exceedsLimit ? 'destructive' : 'default'
                      }
                    >
                      {impactData.concentrationCheck.exceedsLimit ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {impactData.concentrationCheck.message}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* Violations/Warnings (only in analysis mode) */}
              {!isExecuted && impactData.complianceCheck && (
                (impactData.complianceCheck.violations.length > 0 ||
                impactData.complianceCheck.warnings.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Checks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {impactData.complianceCheck.violations.map((violation: string, idx: number) => (
                        <Alert key={`v-${idx}`} variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>{violation}</AlertDescription>
                        </Alert>
                      ))}
                      {impactData.complianceCheck.warnings.map((warning: string, idx: number) => (
                        <Alert key={`w-${idx}`}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                )
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                {isExecuted ? 'Close' : 'Cancel'}
              </Button>
              {!isExecuted && (
                <Button
                  disabled={impactData.recommendation === 'reject' || executeMutation.isPending}
                  variant={impactData.recommendation === 'approve' ? 'default' : 'secondary'}
                  onClick={onExecute}
                >
                  {executeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      {impactData.recommendation === 'approve'
                        ? 'Execute Transaction'
                        : 'Review and Execute'}
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

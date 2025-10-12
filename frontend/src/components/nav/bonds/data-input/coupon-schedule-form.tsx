/**
 * Coupon Schedule Form
 * 
 * UI for entering and managing bond coupon payment schedules
 * Supports auto-generation and manual entry
 * FIXED: Frequency conversion from database text values to numeric
 * ADDED: Accrued interest calculator
 */

import { useState, useEffect, useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Calendar, Plus, Trash2, Wand2, Calculator } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useToast } from '@/hooks/shared/use-toast'
import { useCouponSchedule } from '@/hooks/bonds/useCouponSchedule'
import { 
  generateCouponSchedule, 
  validateScheduleParams,
  getScheduleSummary,
  type GenerateScheduleParams 
} from '@/utils/nav/generateCouponSchedule'
import { convertFrequencyToNumber, getFrequencyLabel } from '@/utils/bonds/frequencyMapper'
import type { CouponPaymentInput } from '@/types/nav/bonds'
import { PaymentStatus } from '@/types/nav/bonds'

export interface CouponScheduleFormProps {
  bondId: string
  bondDetails: {
    face_value: number
    coupon_rate: number
    coupon_frequency: string
    issue_date: Date
    maturity_date: Date
    day_count_convention?: string
  }
  existingPayments?: CouponPaymentInput[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function CouponScheduleForm({
  bondId,
  bondDetails,
  existingPayments = [],
  onSuccess,
  onCancel
}: CouponScheduleFormProps) {
  const [payments, setPayments] = useState<CouponPaymentInput[]>(existingPayments)
  const [showAccruedCalculator, setShowAccruedCalculator] = useState(false)
  const [calculationDate, setCalculationDate] = useState<Date>(new Date())
  const { toast } = useToast()
  
  const { addCouponSchedule, isLoading } = useCouponSchedule({
    bondId,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Coupon schedule saved successfully'
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
  
  // Auto-generate schedule on mount if no existing payments
  useEffect(() => {
    if (existingPayments.length === 0) {
      handleAutoGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  /**
   * Generate coupon schedule with frequency conversion
   * FIXED: Convert database text frequency to numeric value
   */
  const handleAutoGenerate = () => {
    // Check for missing required fields
    const missingFields: string[] = []
    if (!bondDetails.face_value) missingFields.push('Face Value')
    if (!bondDetails.coupon_rate) missingFields.push('Coupon Rate')
    if (!bondDetails.coupon_frequency) missingFields.push('Payment Frequency')
    if (!bondDetails.issue_date) missingFields.push('Issue Date')
    if (!bondDetails.maturity_date) missingFields.push('Maturity Date')

    if (missingFields.length > 0) {
      toast({
        title: 'Cannot Generate Schedule',
        description: `Missing required bond characteristics:\n• ${missingFields.join('\n• ')}\n\nPlease edit the bond details to add these fields.`,
        variant: 'destructive'
      })
      return
    }

    // CRITICAL FIX: Convert text frequency to numeric
    const numericFrequency = convertFrequencyToNumber(bondDetails.coupon_frequency)
    
    const params: GenerateScheduleParams = {
      issueDate: new Date(bondDetails.issue_date),
      maturityDate: new Date(bondDetails.maturity_date),
      couponRate: bondDetails.coupon_rate,
      frequency: numericFrequency.toString(), // Now sending '2' instead of 'semi-annual'
      faceValue: bondDetails.face_value,
      dayCountConvention: (bondDetails.day_count_convention as any) || 'actual_actual'
    }
    
    const validation = validateScheduleParams(params)
    
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive'
      })
      return
    }
    
    const generated = generateCouponSchedule(params)
    setPayments(generated)
    
    toast({
      title: 'Schedule Generated',
      description: `${generated.length} coupon payments created`
    })
  }
  
  /**
   * Calculate accrued interest as of calculation date
   * Copied from coupon-payment-builder.tsx - WORKING IMPLEMENTATION
   */
  const calculateAccruedInterest = useMemo(() => {
    if (!payments.length || !calculationDate) return null

    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    )

    // Find the payment period that contains the calculation date
    let currentPeriod = null
    
    for (let i = 0; i < sortedPayments.length; i++) {
      const payment = sortedPayments[i]
      const paymentDate = new Date(payment.payment_date)
      const accrualStart = new Date(payment.accrual_start_date)
      
      // Check if calculation date is within this period
      if (calculationDate >= accrualStart && calculationDate <= paymentDate) {
        currentPeriod = payment
        break
      }
      
      // If calculation date is after this payment, keep looking
      if (calculationDate > paymentDate) {
        continue
      }
    }

    if (!currentPeriod) return null

    const startDate = new Date(currentPeriod.accrual_start_date)
    const endDate = new Date(currentPeriod.accrual_end_date)
    const daysSinceStart = differenceInDays(calculationDate, startDate)
    const totalDaysInPeriod = currentPeriod.days_in_period

    // Accrued interest = (Coupon Amount * Days Since Start) / Total Days
    const accruedInterest = (currentPeriod.coupon_amount * daysSinceStart) / totalDaysInPeriod

    return {
      amount: accruedInterest,
      daysSinceStart,
      totalDaysInPeriod,
      lastPaymentDate: format(startDate, 'MMM dd, yyyy'),
      nextPaymentDate: format(endDate, 'MMM dd, yyyy'),
    }
  }, [payments, calculationDate])
  
  const handleSave = async () => {
    if (payments.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one coupon payment',
        variant: 'destructive'
      })
      return
    }
    
    await addCouponSchedule(payments)
  }
  
  const summary = getScheduleSummary(payments)
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coupon Payment Schedule</CardTitle>
          <CardDescription>
            Manage coupon payment dates and amounts for this bond
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-Generate Button */}
          <div className="flex justify-between items-center">
            <div>
              <Label>Generate Schedule</Label>
              <p className="text-sm text-muted-foreground">
                Auto-generate payments from bond terms ({getFrequencyLabel(bondDetails.coupon_frequency || 'semi-annual')})
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoGenerate}
                disabled={isLoading}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Auto-Generate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAccruedCalculator(!showAccruedCalculator)}
                disabled={payments.length === 0}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Accrued Interest
              </Button>
            </div>
          </div>
          
          {/* Schedule Summary */}
          {payments.length > 0 && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Payments:</span>
                  <span className="ml-2 font-medium">{summary.totalPayments}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Scheduled:</span>
                  <span className="ml-2 font-medium">{summary.scheduledPayments}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="ml-2 font-medium">{summary.paidPayments}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Coupon:</span>
                  <span className="ml-2 font-medium">
                    ${summary.totalCouponAmount.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {summary.nextPaymentDate && (
                <div className="text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Next Payment:</span>
                  <span className="ml-2 font-medium">
                    {format(summary.nextPaymentDate, 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Accrued Interest Calculator */}
          {showAccruedCalculator && payments.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Accrued Interest Calculator</CardTitle>
                <CardDescription>
                  Calculate interest accrued as of a specific date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>Calculation Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(calculationDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={calculationDate}
                          onSelect={(date) => date && setCalculationDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {calculateAccruedInterest ? (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="text-lg font-semibold">
                          Accrued Interest: ${calculateAccruedInterest.amount.toFixed(2)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Days Since Start: {calculateAccruedInterest.daysSinceStart}</div>
                          <div>Total Days in Period: {calculateAccruedInterest.totalDaysInPeriod}</div>
                          <div>Period Start: {calculateAccruedInterest.lastPaymentDate}</div>
                          <div>Period End: {calculateAccruedInterest.nextPaymentDate}</div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No accrued interest to calculate. The calculation date may be outside the payment schedule range.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Payment List */}
          <div className="space-y-2">
            <Label>Payment Schedule ({payments.length} payments)</Label>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {payments.map((payment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${payment.coupon_amount.toLocaleString()} • {payment.payment_status}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      payment.payment_status === PaymentStatus.PAID
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {payment.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex justify-end gap-2">
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
        
        <Button
          type="button"
          onClick={handleSave}
          disabled={isLoading || payments.length === 0}
        >
          {isLoading ? 'Saving...' : 'Save Schedule'}
        </Button>
      </div>
    </div>
  )
}

export default CouponScheduleForm

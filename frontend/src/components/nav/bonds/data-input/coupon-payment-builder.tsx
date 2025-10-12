import React, { useState, useMemo } from 'react'
import { format, addMonths, addDays, differenceInDays } from 'date-fns'
import { Plus, Trash2, Download, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAddCouponPayments, useDeleteCouponPayment } from '@/hooks/bonds/useBondData'
import type { CouponPaymentInput, CouponPayment } from '@/types/nav/bonds'
import { PaymentStatus } from '@/types/nav/bonds'
import { validateCouponPayments, formatPaymentStatus } from '@/utils/bonds'

interface BondCharacteristics {
  faceValue: number
  couponRate: number
  paymentFrequency: 2 | 4 | 12
  issueDate: Date
  maturityDate: Date
}

interface CouponPaymentBuilderProps {
  bondId: string
  characteristics: BondCharacteristics
  existingPayments?: Array<CouponPayment | CouponPaymentInput>  // Support both types
  onSuccess?: () => void
}

export function CouponPaymentBuilder({
  bondId,
  characteristics,
  existingPayments = [],
  onSuccess,
}: CouponPaymentBuilderProps) {
  const [payments, setPayments] = useState<Array<CouponPayment | CouponPaymentInput>>(existingPayments)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [showAccruedCalculator, setShowAccruedCalculator] = useState(false)
  const [calculationDate, setCalculationDate] = useState<Date>(new Date())
  const [validationErrors, setValidationErrors] = useState<Map<number, string[]>>(new Map())
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)  // Track which payment is being deleted

  const addPaymentsMutation = useAddCouponPayments(bondId)
  const deletePaymentMutation = useDeleteCouponPayment(bondId)

  /**
   * Generate payment schedule from bond characteristics
   * FIXED: Properly sets actual_payment_date for past 'paid' payments
   * ENHANCED: Better error message listing specific missing fields
   */
  const generatePaymentSchedule = () => {
    const { faceValue, couponRate, paymentFrequency, issueDate, maturityDate } = characteristics

    // Check for missing fields and provide detailed feedback
    const missingFields: string[] = []
    if (!faceValue) missingFields.push('Face Value')
    if (!couponRate) missingFields.push('Coupon Rate')
    if (!paymentFrequency) missingFields.push('Payment Frequency')
    if (!issueDate) missingFields.push('Issue Date')
    if (!maturityDate) missingFields.push('Maturity Date')

    if (missingFields.length > 0) {
      alert(
        `Cannot auto-generate schedule. Missing required bond characteristics:\n\n` +
        `• ${missingFields.join('\n• ')}\n\n` +
        `Please edit the bond details to add these fields before generating the payment schedule.`
      )
      return
    }

    const paymentAmount = (faceValue * couponRate) / paymentFrequency
    const generatedPayments: CouponPaymentInput[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

    let currentDate = new Date(issueDate)
    let previousDate = new Date(issueDate)
    const maturity = new Date(maturityDate)

    // Generate regular coupon payments
    while (currentDate < maturity) {
      currentDate = addMonths(currentDate, 12 / paymentFrequency)

      // Only add if payment date is before or on maturity
      if (currentDate <= maturity) {
        const daysInPeriod = differenceInDays(currentDate, previousDate)
        const isPastPayment = currentDate < today

        generatedPayments.push({
          payment_date: new Date(currentDate),
          coupon_amount: paymentAmount,
          // CRITICAL FIX: If payment date is in the past, mark as 'paid' and set actual_payment_date
          payment_status: isPastPayment ? PaymentStatus.PAID : PaymentStatus.SCHEDULED,
          actual_payment_date: isPastPayment ? new Date(currentDate) : undefined,
          accrual_start_date: new Date(previousDate),
          accrual_end_date: new Date(currentDate),
          days_in_period: daysInPeriod,
        })

        previousDate = new Date(currentDate)
      }
    }

    // Add maturity payment (principal + final coupon) if not already added
    const lastPayment = generatedPayments[generatedPayments.length - 1]
    if (!lastPayment || lastPayment.payment_date.getTime() !== maturity.getTime()) {
      const maturityDays = differenceInDays(maturity, previousDate)
      const isPastMaturity = maturity < today
      
      generatedPayments.push({
        payment_date: new Date(maturity),
        coupon_amount: faceValue + paymentAmount, // Principal + final coupon
        payment_status: isPastMaturity ? PaymentStatus.PAID : PaymentStatus.SCHEDULED,
        actual_payment_date: isPastMaturity ? new Date(maturity) : undefined,
        accrual_start_date: new Date(previousDate),
        accrual_end_date: new Date(maturity),
        days_in_period: maturityDays,
      })
    } else {
      // Update last payment to include principal
      lastPayment.coupon_amount = faceValue + paymentAmount
    }

    setPayments(generatedPayments)
    setValidationErrors(new Map()) // Clear validation errors
  }

  /**
   * Calculate accrued interest as of calculation date
   * Fixed: Better logic for finding relevant payment period
   */
  const calculateAccruedInterest = useMemo(() => {
    if (!payments.length || !calculationDate) return null

    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    )

    // Find the payment period that contains the calculation date
    let currentPeriod = null
    let nextPeriod = null
    
    for (let i = 0; i < sortedPayments.length; i++) {
      const payment = sortedPayments[i]
      const paymentDate = new Date(payment.payment_date)
      const accrualStart = new Date(payment.accrual_start_date)
      
      // Check if calculation date is within this period
      if (calculationDate >= accrualStart && calculationDate <= paymentDate) {
        currentPeriod = payment
        nextPeriod = sortedPayments[i + 1] || null
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

  /**
   * Add new payment manually
   * Fixed: Set days_in_period to 1 (minimum valid value) instead of 0
   */
  const handleAddPayment = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const newPayment: CouponPaymentInput = {
      payment_date: tomorrow,
      coupon_amount: 0,
      payment_status: PaymentStatus.SCHEDULED,
      accrual_start_date: today,
      accrual_end_date: tomorrow,
      days_in_period: 1, // Minimum valid value, will be recalculated when dates change
    }
    setPayments([...payments, newPayment])
    setEditingIndex(payments.length)
  }

  /**
   * Delete payment - calls API if payment exists in database
   * FIXED: Now properly deletes from database instead of just local state
   */
  const handleDeletePayment = async (index: number) => {
    const payment = payments[index]
    
    // Check if this is an existing payment (has an id from database)
    const isExistingPayment = 'id' in payment && payment.id
    
    if (isExistingPayment) {
      // Payment exists in database - call API to delete
      const confirmed = window.confirm(
        'Delete this coupon payment from the database? This action cannot be undone.'
      )
      
      if (!confirmed) return
      
      try {
        setDeletingIndex(index)  // Show loading state
        
        await deletePaymentMutation.mutateAsync(payment.id)
        
        // Success - remove from local state
        setPayments(payments.filter((_, i) => i !== index))
        
        // Clear validation errors
        const errors = new Map(validationErrors)
        errors.delete(index)
        setValidationErrors(errors)
        
        // Call success callback
        onSuccess?.()
      } catch (error) {
        console.error('Failed to delete coupon payment:', error)
        alert(
          `Failed to delete payment: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      } finally {
        setDeletingIndex(null)
      }
    } else {
      // New payment not yet saved - just remove from local state
      setPayments(payments.filter((_, i) => i !== index))
      
      // Clear validation errors
      const errors = new Map(validationErrors)
      errors.delete(index)
      setValidationErrors(errors)
    }
  }

  /**
   * Update payment field and recalculate days if dates change
   * FIXED: Ensures payment_date stays synchronized with accrual_end_date
   * ENHANCED: Adjusts end date when days are manually changed
   */
  const handleUpdatePayment = (index: number, field: keyof CouponPaymentInput, value: any) => {
    const updated = [...payments]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-calculate days_in_period when dates change
    if (field === 'accrual_start_date' || field === 'accrual_end_date') {
      const startDate = new Date(updated[index].accrual_start_date)
      const endDate = new Date(updated[index].accrual_end_date)
      const days = differenceInDays(endDate, startDate)
      updated[index].days_in_period = Math.max(1, days) // Ensure at least 1 day
      
      // CRITICAL FIX: Keep payment_date synchronized with accrual_end_date
      // This matches database constraint and standard bond payment logic
      if (field === 'accrual_end_date') {
        updated[index].payment_date = endDate
      }
    }
    
    // NEW: When days_in_period is manually changed, adjust accrual_end_date
    if (field === 'days_in_period') {
      const startDate = new Date(updated[index].accrual_start_date)
      const daysValue = Math.max(1, value) // Ensure at least 1 day
      const newEndDate = addDays(startDate, daysValue)
      updated[index].accrual_end_date = newEndDate
      updated[index].payment_date = newEndDate // Keep constraint satisfied
      updated[index].days_in_period = daysValue // Use the validated value
    }
    
    // If payment_date is changed directly, sync accrual_end_date
    if (field === 'payment_date') {
      updated[index].accrual_end_date = new Date(value)
      // Recalculate days
      const startDate = new Date(updated[index].accrual_start_date)
      const endDate = new Date(value)
      const days = differenceInDays(endDate, startDate)
      updated[index].days_in_period = Math.max(1, days)
    }

    setPayments(updated)
    
    // Clear validation errors for this payment
    if (validationErrors.has(index)) {
      const errors = new Map(validationErrors)
      errors.delete(index)
      setValidationErrors(errors)
    }
  }

  /**
   * Validate and save coupon payments
   * New: Pre-save validation with clear error messages
   */
  const handleSave = async () => {
    // Validate all payments
    const errors = validateCouponPayments(payments)
    
    if (errors.size > 0) {
      setValidationErrors(errors)
      alert(`Validation failed: ${errors.size} payment(s) have errors. Please fix them before saving.`)
      return
    }

    try {
      await addPaymentsMutation.mutateAsync(payments)
      setValidationErrors(new Map())
      onSuccess?.()
    } catch (error) {
      console.error('Failed to save coupon payments:', error)
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Payment Date', 'Coupon Amount', 'Status', 'Accrual Start', 'Accrual End', 'Days']
    const rows = payments.map((p) => [
      format(new Date(p.payment_date), 'yyyy-MM-dd'),
      p.coupon_amount.toFixed(2),
      p.payment_status,
      format(new Date(p.accrual_start_date), 'yyyy-MM-dd'),
      format(new Date(p.accrual_end_date), 'yyyy-MM-dd'),
      p.days_in_period,
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bond-${bondId}-coupon-schedule.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coupon Payment Schedule</CardTitle>
          <CardDescription>
            Auto-generate or manually manage the coupon payment schedule for this bond
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={generatePaymentSchedule} variant="default">
              <Calendar className="mr-2 h-4 w-4" />
              Auto-Generate Schedule
            </Button>
            <Button onClick={handleAddPayment} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
            <Button onClick={handleExportCSV} variant="outline" disabled={!payments.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowAccruedCalculator(!showAccruedCalculator)}
              variant="outline"
            >
              Calculate Accrued Interest
            </Button>
          </div>

          {validationErrors.size > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validationErrors.size} payment(s) have validation errors. Please review and fix.
              </AlertDescription>
            </Alert>
          )}

          {payments.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Total Payments:</span> {payments.length}
                  </div>
                  <div>
                    <span className="font-semibold">Total Amount:</span> $
                    {payments.reduce((sum, p) => sum + p.coupon_amount, 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div>
                    <span className="font-semibold">Next Payment:</span>{' '}
                    {(() => {
                      const nextPayment = payments.find((p) => p.payment_status === PaymentStatus.SCHEDULED)
                      return nextPayment ? format(new Date(nextPayment.payment_date), 'MMM dd, yyyy') : 'N/A'
                    })()}
                  </div>
                  <div>
                    <span className="font-semibold">Scheduled:</span>{' '}
                    {payments.filter((p) => p.payment_status === PaymentStatus.SCHEDULED).length}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {showAccruedCalculator && (
        <Card>
          <CardHeader>
            <CardTitle>Accrued Interest Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Calculation Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(calculationDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={calculationDate}
                      onSelect={(date) => date && setCalculationDate(date)}
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accrual Start</TableHead>
                <TableHead>Accrual End</TableHead>
                <TableHead>Days</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => {
                const hasErrors = validationErrors.has(index)
                const paymentStatus = formatPaymentStatus(payment.payment_status)
                
                return (
                  <TableRow key={index} className={hasErrors ? 'bg-red-50' : ''}>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="date"
                          value={format(new Date(payment.payment_date), 'yyyy-MM-dd')}
                          onChange={(e) => handleUpdatePayment(index, 'payment_date', new Date(e.target.value))}
                        />
                      ) : (
                        format(new Date(payment.payment_date), 'MMM dd, yyyy')
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={payment.coupon_amount}
                          onChange={(e) =>
                            handleUpdatePayment(index, 'coupon_amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      ) : (
                        `$${payment.coupon_amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Select
                          value={payment.payment_status}
                          onValueChange={(value) =>
                            handleUpdatePayment(index, 'payment_status', value as PaymentStatus)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
                            <SelectItem value="deferred">Deferred</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${paymentStatus.colorClass}`}>
                          {paymentStatus.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="date"
                          value={format(new Date(payment.accrual_start_date), 'yyyy-MM-dd')}
                          onChange={(e) =>
                            handleUpdatePayment(index, 'accrual_start_date', new Date(e.target.value))
                          }
                        />
                      ) : (
                        format(new Date(payment.accrual_start_date), 'MMM dd, yyyy')
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="date"
                          value={format(new Date(payment.accrual_end_date), 'yyyy-MM-dd')}
                          onChange={(e) => handleUpdatePayment(index, 'accrual_end_date', new Date(e.target.value))}
                        />
                      ) : (
                        format(new Date(payment.accrual_end_date), 'MMM dd, yyyy')
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          value={payment.days_in_period}
                          onChange={(e) =>
                            handleUpdatePayment(index, 'days_in_period', parseInt(e.target.value, 10) || 1)
                          }
                        />
                      ) : (
                        payment.days_in_period
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingIndex === index ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingIndex(null)}
                          >
                            Done
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingIndex(index)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(index)}
                          disabled={deletingIndex === index}
                        >
                          {deletingIndex === index ? (
                            <span className="text-xs">Deleting...</span>
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                      {hasErrors && (
                        <div className="mt-1 text-xs text-red-600">
                          {validationErrors.get(index)?.join(', ')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={!payments.length || addPaymentsMutation.isPending}
        >
          {addPaymentsMutation.isPending ? 'Saving...' : 'Save Payment Schedule'}
        </Button>
      </div>
    </div>
  )
}

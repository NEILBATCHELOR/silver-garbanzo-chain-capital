import React, { useState, useMemo } from 'react'
import { format, addMonths, differenceInDays } from 'date-fns'
import { Plus, Trash2, Download, Calendar } from 'lucide-react'
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
import { useAddCouponPayments } from '@/hooks/bonds/useBondData'
import type { CouponPaymentInput } from '@/types/nav/bonds'
import { PaymentStatus } from '@/types/nav/bonds'

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
  existingPayments?: CouponPaymentInput[]
  onSuccess?: () => void
}

export function CouponPaymentBuilder({
  bondId,
  characteristics,
  existingPayments = [],
  onSuccess,
}: CouponPaymentBuilderProps) {
  const [payments, setPayments] = useState<CouponPaymentInput[]>(existingPayments)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [showAccruedCalculator, setShowAccruedCalculator] = useState(false)
  const [calculationDate, setCalculationDate] = useState<Date>(new Date())

  const addPaymentsMutation = useAddCouponPayments(bondId)

  const generatePaymentSchedule = () => {
    const { faceValue, couponRate, paymentFrequency, issueDate, maturityDate } = characteristics

    if (!faceValue || !couponRate || !paymentFrequency || !issueDate || !maturityDate) {
      return
    }

    const paymentAmount = (faceValue * couponRate) / paymentFrequency
    const generatedPayments: CouponPaymentInput[] = []

    let currentDate = new Date(issueDate)
    let previousDate = new Date(issueDate)

    while (currentDate < maturityDate) {
      currentDate = addMonths(currentDate, 12 / paymentFrequency)

      if (currentDate <= maturityDate) {
        const daysInPeriod = differenceInDays(currentDate, previousDate)

        generatedPayments.push({
          payment_date: new Date(currentDate),
          coupon_amount: paymentAmount,
          payment_status: PaymentStatus.SCHEDULED,
          accrual_start_date: new Date(previousDate),
          accrual_end_date: new Date(currentDate),
          days_in_period: daysInPeriod,
        })

        previousDate = new Date(currentDate)
      }
    }

    const maturityDays = differenceInDays(maturityDate, previousDate)
    generatedPayments.push({
      payment_date: new Date(maturityDate),
      coupon_amount: faceValue + paymentAmount,
      payment_status: PaymentStatus.SCHEDULED,
      accrual_start_date: new Date(previousDate),
      accrual_end_date: new Date(maturityDate),
      days_in_period: maturityDays,
    })

    setPayments(generatedPayments)
  }

  const calculateAccruedInterest = useMemo(() => {
    if (!payments.length || !calculationDate) return null

    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    )

    let relevantPayment = null
    for (const payment of sortedPayments) {
      const paymentDate = new Date(payment.payment_date)
      if (paymentDate <= calculationDate) {
        relevantPayment = payment
      } else {
        break
      }
    }

    if (!relevantPayment) return null

    const startDate = new Date(relevantPayment.accrual_start_date)
    const daysSinceLastPayment = differenceInDays(calculationDate, startDate)
    const totalDaysInPeriod = relevantPayment.days_in_period

    const accruedInterest = (relevantPayment.coupon_amount * daysSinceLastPayment) / totalDaysInPeriod

    return {
      amount: accruedInterest,
      daysSinceLastPayment,
      totalDaysInPeriod,
      lastPaymentDate: relevantPayment.payment_date,
      nextPaymentDate: relevantPayment.payment_date,
    }
  }, [payments, calculationDate])

  const handleAddPayment = () => {
    const newPayment: CouponPaymentInput = {
      payment_date: new Date(),
      coupon_amount: 0,
      payment_status: PaymentStatus.SCHEDULED,
      accrual_start_date: new Date(),
      accrual_end_date: new Date(),
      days_in_period: 0,
    }
    setPayments([...payments, newPayment])
    setEditingIndex(payments.length)
  }

  const handleDeletePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index))
  }

  const handleUpdatePayment = (index: number, field: keyof CouponPaymentInput, value: any) => {
    const updated = [...payments]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'accrual_start_date' || field === 'accrual_end_date') {
      const startDate = new Date(updated[index].accrual_start_date)
      const endDate = new Date(updated[index].accrual_end_date)
      updated[index].days_in_period = differenceInDays(endDate, startDate)
    }

    setPayments(updated)
  }

  const handleSave = async () => {
    try {
      await addPaymentsMutation.mutateAsync(payments)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to save coupon payments:', error)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Payment Date', 'Coupon Amount', 'Status', 'Accrual Start', 'Accrual End', 'Days']
    const rows = payments.map((p) => [
      p.payment_date,
      p.coupon_amount,
      p.payment_status,
      p.accrual_start_date,
      p.accrual_end_date,
      p.days_in_period,
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bond-${bondId}-coupon-schedule.csv`
    a.click()
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

          {payments.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Total Payments:</span> {payments.length}
                  </div>
                  <div>
                    <span className="font-semibold">Total Amount:</span> $
                    {payments.reduce((sum, p) => sum + p.coupon_amount, 0).toLocaleString()}
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

            {calculateAccruedInterest && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="text-lg font-semibold">
                      Accrued Interest: ${calculateAccruedInterest.amount.toFixed(2)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Days Since Last Payment: {calculateAccruedInterest.daysSinceLastPayment}</div>
                      <div>Total Days in Period: {calculateAccruedInterest.totalDaysInPeriod}</div>
                      <div>Last Payment: {calculateAccruedInterest.lastPaymentDate}</div>
                      <div>Next Payment: {calculateAccruedInterest.nextPaymentDate}</div>
                    </div>
                  </div>
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
              {payments.map((payment, index) => (
                <TableRow key={index}>
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
                        value={payment.coupon_amount}
                        onChange={(e) =>
                          handleUpdatePayment(index, 'coupon_amount', parseFloat(e.target.value))
                        }
                      />
                    ) : (
                      `$${payment.coupon_amount.toLocaleString()}`
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
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          payment.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : payment.payment_status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : payment.payment_status === 'missed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {payment.payment_status}
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
                  <TableCell>{payment.days_in_period}</TableCell>
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
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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

/**
 * Coupon Schedule Generator
 * 
 * Generates coupon payment schedule from bond terms
 * Handles various payment frequencies and day count conventions
 */

import { addMonths, differenceInDays, isBefore, startOfDay } from 'date-fns'
import type { CouponPaymentInput } from '@/types/nav/bonds'
import { PaymentStatus } from '@/types/nav/bonds'

export interface GenerateScheduleParams {
  issueDate: Date
  maturityDate: Date
  couponRate: number
  frequency: string // '2' | '4' | '12' for semi-annual, quarterly, monthly
  faceValue: number
  dayCountConvention?: 'actual_actual' | 'actual_360' | 'actual_365' | 'thirty_360'
}

/**
 * Generate complete coupon payment schedule
 */
export function generateCouponSchedule({
  issueDate,
  maturityDate,
  couponRate,
  frequency,
  faceValue,
  dayCountConvention = 'actual_actual'
}: GenerateScheduleParams): CouponPaymentInput[] {
  const payments: CouponPaymentInput[] = []
  const freq = parseInt(frequency)
  const monthsPerPeriod = 12 / freq
  const couponPerPayment = (faceValue * couponRate) / freq
  
  let currentDate = addMonths(issueDate, monthsPerPeriod)
  let previousDate = issueDate
  const today = startOfDay(new Date())
  
  // Generate payment schedule until maturity
  while (isBefore(currentDate, maturityDate) || currentDate.getTime() === maturityDate.getTime()) {
    const daysInPeriod = calculateDaysInPeriod(
      previousDate,
      currentDate,
      dayCountConvention
    )
    
    const isPast = isBefore(currentDate, today)
    
    payments.push({
      payment_date: currentDate,
      coupon_amount: couponPerPayment,
      payment_status: isPast ? PaymentStatus.PAID : PaymentStatus.SCHEDULED,
      actual_payment_date: isPast ? currentDate : undefined,
      accrual_start_date: previousDate,
      accrual_end_date: currentDate,
      days_in_period: daysInPeriod
    })
    
    previousDate = currentDate
    currentDate = addMonths(currentDate, monthsPerPeriod)
  }
  
  return payments
}

/**
 * Calculate days in period using specified convention
 */
function calculateDaysInPeriod(
  startDate: Date,
  endDate: Date,
  convention: string
): number {
  switch (convention) {
    case 'actual_actual':
    case 'actual_365':
    case 'actual_360':
      return differenceInDays(endDate, startDate)
      
    case 'thirty_360':
      // 30/360 convention: assumes 30 days per month
      const d1 = Math.min(startDate.getDate(), 30)
      const d2 = Math.min(endDate.getDate(), 30)
      const m1 = startDate.getMonth() + 1
      const m2 = endDate.getMonth() + 1
      const y1 = startDate.getFullYear()
      const y2 = endDate.getFullYear()
      
      return 360 * (y2 - y1) + 30 * (m2 - m1) + (d2 - d1)
      
    default:
      return differenceInDays(endDate, startDate)
  }
}

/**
 * Validate coupon schedule parameters
 */
export function validateScheduleParams(params: GenerateScheduleParams): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (params.maturityDate <= params.issueDate) {
    errors.push('Maturity date must be after issue date')
  }
  
  if (params.couponRate < 0 || params.couponRate > 1) {
    errors.push('Coupon rate must be between 0 and 1')
  }
  
  if (params.faceValue <= 0) {
    errors.push('Face value must be positive')
  }
  
  const freq = parseInt(params.frequency)
  if (![1, 2, 4, 12].includes(freq)) {
    errors.push('Frequency must be 1, 2, 4, or 12')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Preview schedule summary
 */
export function getScheduleSummary(payments: CouponPaymentInput[]): {
  totalPayments: number
  scheduledPayments: number
  paidPayments: number
  totalCouponAmount: number
  nextPaymentDate?: Date
} {
  const scheduled = payments.filter(p => p.payment_status === PaymentStatus.SCHEDULED)
  const paid = payments.filter(p => p.payment_status === PaymentStatus.PAID)
  
  const nextPayment = scheduled.length > 0 
    ? scheduled[0]
    : undefined
  
  return {
    totalPayments: payments.length,
    scheduledPayments: scheduled.length,
    paidPayments: paid.length,
    totalCouponAmount: payments.reduce((sum, p) => sum + p.coupon_amount, 0),
    nextPaymentDate: nextPayment?.payment_date
  }
}

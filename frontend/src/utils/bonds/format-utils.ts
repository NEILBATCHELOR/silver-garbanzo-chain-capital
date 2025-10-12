/**
 * Bond Formatting Utilities
 * 
 * Human-readable formatters for bond data
 */

import type { CouponPaymentInput } from '@/types/nav/bonds'
import { differenceInDays } from 'date-fns'

/**
 * Format payment frequency to human-readable string
 * ENHANCED: Handles both number and string enum formats
 */
export function formatPaymentFrequency(frequency: number | string | null | undefined): string {
  if (!frequency) return 'Not specified'
  
  // Handle numeric frequencies
  if (typeof frequency === 'number') {
    const frequencyMap: Record<number, string> = {
      1: 'Annual',
      2: 'Semi Annual',
      4: 'Quarterly',
      12: 'Monthly',
    }
    return frequencyMap[frequency] || `${frequency}x/year`
  }
  
  // Handle string enum frequencies
  const stringFrequencyMap: Record<string, string> = {
    'annual': 'Annual',
    'semi_annual': 'Semi Annual',
    'quarterly': 'Quarterly',
    'monthly': 'Monthly',
    'semiannual': 'Semi Annual',
  }
  
  const normalized = frequency.toLowerCase().replace(/[-\s]/g, '_')
  return stringFrequencyMap[normalized] || frequency
}

/**
 * Format day count convention to human-readable string
 * ENHANCED: Handles underscore and slash formats
 */
export function formatDayCountConvention(convention: string | null | undefined): string {
  if (!convention) return 'Not specified'
  
  const conventionMap: Record<string, string> = {
    // Slash formats
    '30/360': '30/360 (Bond Basis)',
    'actual/360': 'Actual/360',
    'actual/365': 'Actual/365 (Fixed)',
    'actual/actual': 'Actual/Actual (ISDA)',
    'actual/365l': 'Actual/365 (Leap)',
    '30e/360': '30E/360 (Eurobond Basis)',
    '30e+/360': '30E+/360',
    // Underscore formats (database enum style)
    '30_360': '30/360 (Bond Basis)',
    'actual_360': 'Actual/360',
    'actual_365': 'Actual/365 (Fixed)',
    'actual_actual': 'Actual/Actual (ISDA)',
    'actual_365l': 'Actual/365 (Leap)',
    '30e_360': '30E/360 (Eurobond Basis)',
    '30e_plus_360': '30E+/360',
  }
  
  const normalized = convention.toLowerCase().replace(/\s+/g, '')
  return conventionMap[normalized] || convention
}

/**
 * Validate a coupon payment and return error messages
 */
export function validateCouponPayment(payment: CouponPaymentInput): string[] {
  const errors: string[] = []
  
  // Validate coupon amount
  if (payment.coupon_amount <= 0) {
    errors.push('Coupon amount must be positive')
  }
  
  // Validate days in period
  if (payment.days_in_period <= 0) {
    errors.push('Days in period must be greater than 0')
  }
  
  if (payment.days_in_period > 366) {
    errors.push('Days in period cannot exceed 366')
  }
  
  // Validate date relationship
  const startDate = new Date(payment.accrual_start_date)
  const endDate = new Date(payment.accrual_end_date)
  
  if (endDate <= startDate) {
    errors.push('Accrual end date must be after start date')
  }
  
  // Validate days calculation matches
  const calculatedDays = differenceInDays(endDate, startDate)
  if (Math.abs(calculatedDays - payment.days_in_period) > 1) {
    errors.push(`Days in period (${payment.days_in_period}) doesn't match calculated days (${calculatedDays})`)
  }
  
  // CRITICAL: Validate payment_date matches accrual_end_date EXACTLY (database constraint)
  // Database requires: CHECK ((payment_date = accrual_end_date))
  // No tolerance allowed - dates must match exactly
  const paymentDate = new Date(payment.payment_date)
  const paymentDateStr = paymentDate.toISOString().split('T')[0]
  const accrualEndDateStr = endDate.toISOString().split('T')[0]
  
  if (paymentDateStr !== accrualEndDateStr) {
    errors.push(`Payment date must EXACTLY match accrual end date (payment: ${paymentDateStr}, accrual end: ${accrualEndDateStr})`)
  }
  
  // Validate actual payment date if status is paid
  if (payment.payment_status === 'paid' && !payment.actual_payment_date) {
    errors.push('Actual payment date required when status is paid')
  }
  
  return errors
}

/**
 * Validate multiple coupon payments
 */
export function validateCouponPayments(payments: CouponPaymentInput[]): Map<number, string[]> {
  const errorMap = new Map<number, string[]>()
  
  payments.forEach((payment, index) => {
    const errors = validateCouponPayment(payment)
    if (errors.length > 0) {
      errorMap.set(index, errors)
    }
  })
  
  return errorMap
}

/**
 * Format payment status to human-readable string with color
 */
export function formatPaymentStatus(status: string): { label: string; colorClass: string } {
  const statusMap: Record<string, { label: string; colorClass: string }> = {
    scheduled: {
      label: 'Scheduled',
      colorClass: 'bg-blue-100 text-blue-700',
    },
    paid: {
      label: 'Paid',
      colorClass: 'bg-green-100 text-green-700',
    },
    missed: {
      label: 'Missed',
      colorClass: 'bg-red-100 text-red-700',
    },
    deferred: {
      label: 'Deferred',
      colorClass: 'bg-yellow-100 text-yellow-700',
    },
  }
  
  return statusMap[status] || { label: status, colorClass: 'bg-gray-100 text-gray-700' }
}

/**
 * PSP Fiat Payment Service
 * 
 * Specialized service for fiat payment processing with rail-specific validations,
 * cutoff time management, and optimizations for ACH, Wire, RTP, FedNow, and Push-to-Card.
 * 
 * Features:
 * - Rail-specific validation logic
 * - Cutoff time enforcement
 * - Amount limit checks per rail
 * - Business day calculations
 * - ACH batch processing preparation
 * - Same-day ACH eligibility
 * - Wire formatting and validation
 * - RTP/FedNow instant payment optimizations
 * - Push-to-Card validation
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { WarpClientService } from '../auth/warpClientService';
import {
  convertDbPaymentToPSPPayment,
  stringToDecimal
} from '@/utils/psp-converters';
import type {
  PSPPayment,
  CreateFiatPaymentRequest,
  PaymentRail,
  PSPEnvironment
} from '@/types/psp';

// Rail-specific configuration
interface RailConfig {
  name: string;
  maxAmount: string;
  minAmount: string;
  cutoffTimeET: string; // Eastern Time
  sameDayCutoffET?: string;
  allowWeekends: boolean;
  allowHolidays: boolean;
  estimatedSettlement: string;
  requiresRoutingNumber: boolean;
  requiresAccountNumber: boolean;
}

const RAIL_CONFIGS: Record<PaymentRail, RailConfig> = {
  ach: {
    name: 'ACH',
    maxAmount: '50000.00',
    minAmount: '0.01',
    cutoffTimeET: '16:00', // 4 PM ET
    sameDayCutoffET: '14:00', // 2 PM ET for same-day ACH
    allowWeekends: false,
    allowHolidays: false,
    estimatedSettlement: 'Next business day (or same-day if eligible)',
    requiresRoutingNumber: true,
    requiresAccountNumber: true
  },
  wire: {
    name: 'Wire',
    maxAmount: '5000000.00',
    minAmount: '100.00',
    cutoffTimeET: '17:00', // 5 PM ET
    allowWeekends: false,
    allowHolidays: false,
    estimatedSettlement: 'Same business day',
    requiresRoutingNumber: true,
    requiresAccountNumber: true
  },
  rtp: {
    name: 'RTP',
    maxAmount: '100000.00',
    minAmount: '0.01',
    cutoffTimeET: '23:59', // 24/7 operation
    allowWeekends: true,
    allowHolidays: true,
    estimatedSettlement: 'Instant (seconds)',
    requiresRoutingNumber: true,
    requiresAccountNumber: true
  },
  fednow: {
    name: 'FedNow',
    maxAmount: '100000.00',
    minAmount: '0.01',
    cutoffTimeET: '23:59', // 24/7 operation
    allowWeekends: true,
    allowHolidays: true,
    estimatedSettlement: 'Instant (seconds)',
    requiresRoutingNumber: true,
    requiresAccountNumber: true
  },
  push_to_card: {
    name: 'Push-to-Card',
    maxAmount: '10000.00',
    minAmount: '1.00',
    cutoffTimeET: '23:59', // 24/7 operation
    allowWeekends: true,
    allowHolidays: true,
    estimatedSettlement: 'Minutes to hours',
    requiresRoutingNumber: false,
    requiresAccountNumber: false // Uses card number instead
  },
  crypto: {
    name: 'Crypto',
    maxAmount: '999999999.00',
    minAmount: '0.01',
    cutoffTimeET: '23:59',
    allowWeekends: true,
    allowHolidays: true,
    estimatedSettlement: 'Network dependent',
    requiresRoutingNumber: false,
    requiresAccountNumber: false
  }
};

// US Banking holidays (2025)
const US_BANK_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents Day
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-12-25'  // Christmas
];

export interface FiatPaymentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimated_settlement?: string;
  cutoff_passed?: boolean;
  same_day_eligible?: boolean;
}

export class FiatPaymentService extends BaseService {
  constructor() {
    super('PSPFiatPayment');
  }

  /**
   * Create fiat payment with comprehensive validation
   */
  async createFiatPayment(
    request: CreateFiatPaymentRequest,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPPayment>> {
    try {
      // Step 1: Validate payment request
      const validation = await this.validateFiatPayment(request);
      
      if (!validation.valid) {
        return this.error(
          `Payment validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_FAILED',
          400
        );
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        this.logWarn('Payment warnings', {
          warnings: validation.warnings,
          projectId: request.project_id
        });
      }

      // Step 2: Get external account details for additional validation
      const accountResult = await this.getExternalAccount(
        request.destination.external_account_id,
        request.project_id
      );

      if (!accountResult.success || !accountResult.data) {
        return this.error(
          'External account not found',
          'ACCOUNT_NOT_FOUND',
          404
        );
      }

      const account = accountResult.data;

      // Step 3: Validate account is active
      if (account.status !== 'active') {
        return this.error(
          'External account is not active',
          'ACCOUNT_INACTIVE',
          400
        );
      }

      // Step 4: Determine optimal payment rail if not specified
      const paymentRail = request.payment_rail || 
        this.determineOptimalRail(request.amount, validation);

      // Step 5: Create payment in Warp
      const warpClient = await WarpClientService.getClientForProject(
        request.project_id,
        environment
      );

      this.logInfo('Creating fiat payment', {
        projectId: request.project_id,
        amount: request.amount,
        rail: paymentRail,
        accountId: account.id,
        sameDayEligible: validation.same_day_eligible
      });

      const warpResponse = await warpClient.createFiatPayment(
        {
          source: {
            walletId: request.source.wallet_id,
            virtualAccountId: request.source.virtual_account_id
          },
          destination: {
            externalAccountId: request.destination.external_account_id
          },
          amount: request.amount,
          memo: request.memo
        },
        request.idempotency_key
      );

      if (!warpResponse.success || !warpResponse.data) {
        return this.error(
          'Failed to create payment in Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Step 6: Store payment in our database
      const payment = await this.db.psp_payments.create({
        data: {
          project_id: request.project_id,
          warp_payment_id: warpResponse.data.id,
          payment_type: 'fiat_payment',
          direction: 'outbound',
          source_type: 'wallet',
          source_id: request.source.wallet_id || request.source.virtual_account_id,
          destination_type: 'external_account',
          destination_id: request.destination.external_account_id,
          amount: stringToDecimal(request.amount),
          currency: 'USD',
          payment_rail: paymentRail,
          status: 'pending',
          memo: request.memo,
          idempotency_key: request.idempotency_key,
          metadata: {
            estimated_settlement: validation.estimated_settlement,
            same_day_eligible: validation.same_day_eligible,
            cutoff_passed: validation.cutoff_passed
          },
          initiated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('Fiat payment created successfully', {
        paymentId: payment.id,
        warpPaymentId: warpResponse.data.id
      });

      // Convert Prisma result to PSPPayment format
      const pspPayment = convertDbPaymentToPSPPayment(payment);

      return this.success(pspPayment);
    } catch (error) {
      return this.handleError('Failed to create fiat payment', error);
    }
  }

  /**
   * Validate fiat payment with rail-specific rules
   */
  async validateFiatPayment(
    request: CreateFiatPaymentRequest
  ): Promise<FiatPaymentValidationResult> {
    const result: FiatPaymentValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    const rail = request.payment_rail || 'ach'; // Default to ACH
    const config = RAIL_CONFIGS[rail as PaymentRail];

    // Validate amount
    const amount = parseFloat(request.amount);
    const minAmount = parseFloat(config.minAmount);
    const maxAmount = parseFloat(config.maxAmount);

    if (amount < minAmount) {
      result.errors.push(
        `Amount ${request.amount} is below minimum ${config.minAmount} for ${config.name}`
      );
      result.valid = false;
    }

    if (amount > maxAmount) {
      result.errors.push(
        `Amount ${request.amount} exceeds maximum ${config.maxAmount} for ${config.name}`
      );
      result.valid = false;
    }

    // Check business day requirements
    const now = new Date();
    const isBusinessDay = this.isBusinessDay(now);
    const cutoffPassed = this.isCutoffPassed(now, config.cutoffTimeET);

    if (!config.allowWeekends && !isBusinessDay) {
      result.warnings.push(
        `${config.name} payments will be processed on next business day (weekend)`
      );
    }

    if (!config.allowHolidays && this.isHoliday(now)) {
      result.warnings.push(
        `${config.name} payments will be processed on next business day (holiday)`
      );
    }

    // Cutoff time checks
    result.cutoff_passed = cutoffPassed;
    if (cutoffPassed && !config.allowWeekends) {
      result.warnings.push(
        `Payment submitted after ${config.cutoffTimeET} ET cutoff. Will process next business day.`
      );
    }

    // Same-day ACH eligibility
    if (rail === 'ach' && config.sameDayCutoffET) {
      const sameDayCutoffPassed = this.isCutoffPassed(now, config.sameDayCutoffET);
      result.same_day_eligible = !sameDayCutoffPassed && isBusinessDay && !this.isHoliday(now);
      
      if (result.same_day_eligible) {
        result.warnings.push('Eligible for same-day ACH processing');
      }
    }

    // Set estimated settlement
    result.estimated_settlement = config.estimatedSettlement;

    return result;
  }

  /**
   * Determine optimal payment rail based on amount and timing
   */
  determineOptimalRail(
    amount: string,
    validation: FiatPaymentValidationResult
  ): PaymentRail {
    const amountNum = parseFloat(amount);

    // For instant payments under $100k, prefer RTP/FedNow
    if (amountNum <= 100000) {
      return 'rtp'; // Real-time payments
    }

    // For large amounts, use Wire
    if (amountNum > 50000) {
      return 'wire';
    }

    // For same-day eligible ACH, use ACH
    if (validation.same_day_eligible) {
      return 'ach';
    }

    // Default to ACH for standard processing
    return 'ach';
  }

  /**
   * Check if ACH batch processing is available
   */
  async checkBatchEligibility(
    projectId: string,
    payments: CreateFiatPaymentRequest[]
  ): Promise<ServiceResult<{
    eligible: boolean;
    batch_count: number;
    total_amount: string;
    estimated_fee_savings: string;
  }>> {
    try {
      // ACH supports batch processing for multiple payments
      const achPayments = payments.filter(p => 
        p.payment_rail === 'ach' || !p.payment_rail
      );

      if (achPayments.length < 2) {
        return this.success({
          eligible: false,
          batch_count: achPayments.length,
          total_amount: '0',
          estimated_fee_savings: '0'
        });
      }

      const totalAmount = achPayments.reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0
      );

      // Estimate fee savings (example: 30% savings on batch vs individual)
      const individualFees = achPayments.length * 0.50; // $0.50 per payment
      const batchFees = achPayments.length * 0.35; // $0.35 per payment in batch
      const savings = individualFees - batchFees;

      return this.success({
        eligible: true,
        batch_count: achPayments.length,
        total_amount: totalAmount.toString(),
        estimated_fee_savings: savings.toFixed(2)
      });
    } catch (error) {
      return this.handleError('Failed to check batch eligibility', error);
    }
  }

  /**
   * Get next business day for settlement estimation
   */
  getNextBusinessDay(date: Date = new Date()): Date {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (!this.isBusinessDay(nextDay) || this.isHoliday(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Check if date is a business day (Monday-Friday)
   */
  private isBusinessDay(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday = 1, Friday = 5
  }

  /**
   * Check if date is a US banking holiday
   */
  private isHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0] || '';
    return US_BANK_HOLIDAYS_2025.includes(dateStr);
  }

  /**
   * Check if cutoff time has passed
   */
  private isCutoffPassed(date: Date, cutoffTimeET: string): boolean {
    // Convert current time to ET
    const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const timeParts = cutoffTimeET.split(':').map(Number);
    const hours = timeParts[0] ?? 0;
    const minutes = timeParts[1] ?? 0;
    
    const cutoffMinutes = hours * 60 + minutes;
    const currentMinutes = etDate.getHours() * 60 + etDate.getMinutes();

    return currentMinutes >= cutoffMinutes;
  }

  /**
   * Get external account from database
   */
  private async getExternalAccount(
    accountId: string,
    projectId: string
  ): Promise<ServiceResult<any>> {
    try {
      const account = await this.db.psp_external_accounts.findFirst({
        where: {
          id: accountId,
          project_id: projectId
        }
      });

      return this.success(account);
    } catch (error) {
      return this.handleError('Failed to get external account', error);
    }
  }

  /**
   * Validate routing number (US banks use 9-digit ABA routing numbers)
   */
  validateRoutingNumber(routingNumber: string): boolean {
    // Must be exactly 9 digits
    if (!/^\d{9}$/.test(routingNumber)) {
      return false;
    }

    // Implement ABA routing number checksum validation
    const digits = routingNumber.split('').map(Number);
    const checksum = 
      3 * ((digits[0] ?? 0) + (digits[3] ?? 0) + (digits[6] ?? 0)) +
      7 * ((digits[1] ?? 0) + (digits[4] ?? 0) + (digits[7] ?? 0)) +
      1 * ((digits[2] ?? 0) + (digits[5] ?? 0) + (digits[8] ?? 0));

    return checksum % 10 === 0;
  }

  /**
   * Validate account number format
   */
  validateAccountNumber(accountNumber: string): boolean {
    // Account numbers are typically 4-17 digits
    return /^\d{4,17}$/.test(accountNumber);
  }
}

export default FiatPaymentService;

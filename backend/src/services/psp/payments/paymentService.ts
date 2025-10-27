/**
 * PSP Payment Service
 * 
 * Core payment orchestration service that coordinates all payment operations.
 * Routes payments to appropriate handlers (fiat vs crypto) and manages
 * payment lifecycle, status tracking, and automation.
 * 
 * Features:
 * - Unified payment creation interface
 * - Payment status tracking
 * - Transaction history
 * - Idempotency handling
 * - Payment cancellation
 * - Integration with automation settings
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { WarpClientService } from '../auth/warpClientService';
import { SettingsService } from '../automation/settingsService';
import { BalanceService } from '../accounts/balanceService';
import { mapPaymentToApiType, mapPaymentsToApiType } from '../utils/mappers';
import type {
  PSPPayment,
  CreateFiatPaymentRequest,
  CreateCryptoPaymentRequest,
  PaymentType,
  PaymentDirection,
  PaymentStatus,
  PaymentRail,
  PSPEnvironment
} from '@/types/psp';

export class PaymentService extends BaseService {
  private settingsService: SettingsService;
  private balanceService: BalanceService;

  constructor() {
    super('PSPPayment');
    this.settingsService = new SettingsService();
    this.balanceService = new BalanceService();
  }

  /**
   * Create a fiat payment (ACH, Wire, RTP, FedNow, Push-to-Card)
   */
  async createFiatPayment(
    request: CreateFiatPaymentRequest,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPPayment>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(request, [
        'project_id',
        'source',
        'destination',
        'amount'
      ]);

      if (!validation.success) {
        return this.error(
          validation.error || 'Validation failed',
          'VALIDATION_ERROR',
          400
        );
      }

      // Check for idempotency
      if (request.idempotency_key) {
        const existing = await this.findByIdempotencyKey(request.idempotency_key);
        if (existing) {
          this.logInfo('Returning existing payment for idempotency key', {
            paymentId: existing.id,
            idempotencyKey: request.idempotency_key
          });
          return this.success(existing);
        }
      }

      // Get Warp API client
      const warpClient = await WarpClientService.getClientForProject(
        request.project_id,
        environment
      );

      // Execute payment in Warp
      this.logInfo('Creating fiat payment in Warp', {
        projectId: request.project_id,
        amount: request.amount,
        sourceWalletId: request.source.wallet_id,
        destinationAccountId: request.destination.external_account_id
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
        this.logError('Failed to create fiat payment in Warp', warpResponse.error);
        return this.error(
          warpResponse.error?.message || 'Failed to create fiat payment',
          'WARP_API_ERROR',
          500
        );
      }

      // Determine payment rail from Warp response or use default
      const paymentRail = this.determinePaymentRail(warpResponse.data, 'fiat');

      // Store payment record in database
      const payment = await this.db.psp_payments.create({
        data: {
          project_id: request.project_id,
          warp_payment_id: warpResponse.data.id,
          payment_type: 'fiat_payment' as PaymentType,
          direction: 'outbound' as PaymentDirection,
          source_type: 'wallet',
          source_id: request.source.wallet_id,
          destination_type: 'external_account',
          destination_id: request.destination.external_account_id,
          amount: request.amount,
          currency: 'USD',
          payment_rail: paymentRail,
          status: this.mapWarpPaymentStatus(warpResponse.data.status),
          memo: request.memo || null,
          idempotency_key: request.idempotency_key || null,
          initiated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('Fiat payment created successfully', {
        paymentId: payment.id,
        warpPaymentId: payment.warp_payment_id,
        status: payment.status
      });

      return this.success(mapPaymentToApiType(payment));
    } catch (error) {
      return this.handleError('Failed to create fiat payment', error);
    }
  }

  /**
   * Create a crypto payment
   */
  async createCryptoPayment(
    request: CreateCryptoPaymentRequest,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPPayment>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(request, [
        'project_id',
        'source',
        'destination',
        'amount',
        'asset',
        'network'
      ]);

      if (!validation.success) {
        return this.error(
          validation.error || 'Validation failed',
          'VALIDATION_ERROR',
          400
        );
      }

      // Check for idempotency
      if (request.idempotency_key) {
        const existing = await this.findByIdempotencyKey(request.idempotency_key);
        if (existing) {
          this.logInfo('Returning existing payment for idempotency key', {
            paymentId: existing.id,
            idempotencyKey: request.idempotency_key
          });
          return this.success(existing);
        }
      }

      // Verify balance
      const balanceCheck = await this.balanceService.hasSufficientBalance(
        request.project_id,
        request.asset,
        request.amount,
        request.network
      );

      if (!balanceCheck.success || !balanceCheck.data) {
        return this.error(
          'Insufficient balance for crypto payment',
          'INSUFFICIENT_BALANCE',
          400
        );
      }

      // Get Warp API client
      const warpClient = await WarpClientService.getClientForProject(
        request.project_id,
        environment
      );

      // Execute payment in Warp
      this.logInfo('Creating crypto payment in Warp', {
        projectId: request.project_id,
        amount: request.amount,
        asset: request.asset,
        network: request.network
      });

      const warpResponse = await warpClient.createCryptoPayment(
        {
          source: {
            walletId: request.source.wallet_id,
            virtualAccountId: request.source.virtual_account_id
          },
          destination: {
            externalAccountId: request.destination.external_account_id
          },
          amount: request.amount,
          asset: request.asset,
          network: request.network
        },
        request.idempotency_key
      );

      if (!warpResponse.success || !warpResponse.data) {
        this.logError('Failed to create crypto payment in Warp', warpResponse.error);
        return this.error(
          warpResponse.error?.message || 'Failed to create crypto payment',
          'WARP_API_ERROR',
          500
        );
      }

      // Store payment record in database
      const payment = await this.db.psp_payments.create({
        data: {
          project_id: request.project_id,
          warp_payment_id: warpResponse.data.id,
          payment_type: 'crypto_payment' as PaymentType,
          direction: 'outbound' as PaymentDirection,
          source_type: 'wallet',
          source_id: request.source.wallet_id,
          destination_type: 'external_account',
          destination_id: request.destination.external_account_id,
          amount: request.amount,
          currency: request.asset,
          network: request.network,
          payment_rail: 'crypto' as PaymentRail,
          status: this.mapWarpPaymentStatus(warpResponse.data.status),
          idempotency_key: request.idempotency_key || null,
          initiated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('Crypto payment created successfully', {
        paymentId: payment.id,
        warpPaymentId: payment.warp_payment_id,
        asset: request.asset,
        network: request.network
      });

      return this.success(mapPaymentToApiType(payment));
    } catch (error) {
      return this.handleError('Failed to create crypto payment', error);
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<ServiceResult<PSPPayment>> {
    try {
      const payment = await this.db.psp_payments.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        return this.error('Payment not found', 'NOT_FOUND', 404);
      }

      return this.success(mapPaymentToApiType(payment));
    } catch (error) {
      return this.handleError('Failed to get payment', error);
    }
  }

  /**
   * List payments for a project
   */
  async listPayments(
    projectId: string,
    options?: {
      paymentType?: PaymentType;
      status?: PaymentStatus;
      direction?: PaymentDirection;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<ServiceResult<PSPPayment[]>> {
    try {
      const whereClause: any = { project_id: projectId };

      if (options?.paymentType) {
        whereClause.payment_type = options.paymentType;
      }

      if (options?.status) {
        whereClause.status = options.status;
      }

      if (options?.direction) {
        whereClause.direction = options.direction;
      }

      if (options?.dateFrom || options?.dateTo) {
        whereClause.created_at = {};
        if (options.dateFrom) {
          whereClause.created_at.gte = options.dateFrom;
        }
        if (options.dateTo) {
          whereClause.created_at.lte = options.dateTo;
        }
      }

      const payments = await this.db.psp_payments.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      });

      return this.success(mapPaymentsToApiType(payments));
    } catch (error) {
      return this.handleError('Failed to list payments', error);
    }
  }

  /**
   * Sync payment status from Warp
   */
  async syncPaymentStatus(
    paymentId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPPayment>> {
    try {
      const payment = await this.db.psp_payments.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          project_id: true,
          warp_payment_id: true
        }
      });

      if (!payment) {
        return this.error('Payment not found', 'NOT_FOUND', 404);
      }

      if (!payment.warp_payment_id) {
        return this.error('No Warp payment ID found', 'INVALID_STATE', 400);
      }

      // Get payment status from Warp
      const warpClient = await WarpClientService.getClientForProject(
        payment.project_id,
        environment
      );

      const response = await warpClient.getTransactionById(payment.warp_payment_id);

      if (!response.success || !response.data) {
        return this.error(
          'Failed to fetch payment status from Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Update local record
      const updateData: any = {
        status: this.mapWarpPaymentStatus(response.data.status),
        updated_at: new Date()
      };

      if (response.data.errorCode) {
        updateData.error_code = response.data.errorCode;
        updateData.error_message = response.data.errorMessage || response.data.error;
      }

      if (response.data.status === 'completed') {
        updateData.completed_at = new Date();
      } else if (response.data.status === 'failed') {
        updateData.failed_at = new Date();
      }

      const updatedPayment = await this.db.psp_payments.update({
        where: { id: paymentId },
        data: updateData
      });

      return this.success(mapPaymentToApiType(updatedPayment));
    } catch (error) {
      return this.handleError('Failed to sync payment status', error);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(
    paymentId: string,
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<boolean>> {
    try {
      const payment = await this.db.psp_payments.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          project_id: true,
          warp_payment_id: true,
          status: true
        }
      });

      if (!payment) {
        return this.error('Payment not found', 'NOT_FOUND', 404);
      }

      if (payment.project_id !== projectId) {
        return this.error('Forbidden', 'FORBIDDEN', 403);
      }

      // Check if payment can be cancelled
      if (payment.status === 'completed') {
        return this.error(
          'Cannot cancel completed payment',
          'INVALID_STATE',
          400
        );
      }

      if (payment.status === 'cancelled') {
        return this.success(true);
      }

      // Update local status
      await this.db.psp_payments.update({
        where: { id: paymentId },
        data: {
          status: 'cancelled',
          updated_at: new Date()
        }
      });

      this.logInfo('Payment cancelled', { paymentId, projectId });

      return this.success(true);
    } catch (error) {
      return this.handleError('Failed to cancel payment', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Find payment by idempotency key
   */
  private async findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<PSPPayment | null> {
    const payment = await this.db.psp_payments.findFirst({
      where: { idempotency_key: idempotencyKey }
    });

    return payment ? mapPaymentToApiType(payment) : null;
  }

  /**
   * Determine payment rail from Warp response
   */
  private determinePaymentRail(
    warpData: any,
    defaultType: 'fiat' | 'crypto'
  ): PaymentRail {
    if (warpData.paymentRail) {
      return warpData.paymentRail;
    }

    if (warpData.rail) {
      return warpData.rail;
    }

    // Default to ACH for fiat, crypto for crypto
    return defaultType === 'fiat' ? 'ach' : 'crypto';
  }

  /**
   * Map Warp payment status to our PaymentStatus type
   */
  private mapWarpPaymentStatus(warpStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': 'pending',
      'processing': 'processing',
      'initiated': 'pending',
      'completed': 'completed',
      'success': 'completed',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled'
    };

    return statusMap[warpStatus.toLowerCase()] || 'pending';
  }
}

export default PaymentService;

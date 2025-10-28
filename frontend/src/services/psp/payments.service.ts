/**
 * PSP Payments Service
 * Service for managing payment transactions
 */

import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '@/types/core/api'
import {
  PspPayment,
  PaymentsSummary,
  PaymentListFilters,
  CreateFiatPaymentRequest,
  CreateCryptoPaymentRequest
} from '@/types/psp'

class PspPaymentsService extends BaseApiService {
  constructor() {
    super('/api/psp')
  }

  /**
   * Get all payments for a project
   */
  async listPayments(filters?: PaymentListFilters): Promise<ApiResponse<PspPayment[]>> {
    return this.get<PspPayment[]>('/payments', filters)
  }

  /**
   * Get payments summary
   */
  async getPaymentsSummary(projectId: string): Promise<ApiResponse<PaymentsSummary>> {
    return this.get<PaymentsSummary>('/payments/summary', { project_id: projectId })
  }

  /**
   * Get a specific payment by ID
   */
  async getPayment(id: string): Promise<ApiResponse<PspPayment>> {
    return this.get<PspPayment>(`/payments/${id}`)
  }

  /**
   * Create a fiat payment
   */
  async createFiatPayment(data: CreateFiatPaymentRequest): Promise<ApiResponse<PspPayment>> {
    return this.post<PspPayment>('/payments/fiat', data)
  }

  /**
   * Create a crypto payment
   */
  async createCryptoPayment(data: CreateCryptoPaymentRequest): Promise<ApiResponse<PspPayment>> {
    return this.post<PspPayment>('/payments/crypto', data)
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/payments/${id}`)
  }
}

export const pspPaymentsService = new PspPaymentsService()

/**
 * Redemption Service
 * Service for managing redemption requests, approvals, and processing
 */

import { BaseService } from '../BaseService'
import type {
  RedemptionRequest,
  RedemptionRequestDB,
  RedemptionCreateRequest,
  RedemptionUpdateRequest,
  RedemptionQueryOptions,
  RedemptionApproval,
  RedemptionApprovalDB,
  RedemptionApprovalRequest,
  RedemptionWindow,
  RedemptionWindowDB,
  RedemptionValidationResult,
  RedemptionCreationResult,
  RedemptionWorkflow,
  RedemptionWorkflowStage,
  RedemptionStatus,
  RedemptionType,
  RedemptionWindowStatus,
  RedemptionApprovalStatus
} from '../../types/subscriptions'
import type { ServiceResult, PaginatedResponse } from '../../types/index'
import {
  decimalToNumber,
  nullToUndefined,
  convertDatabaseRecord,
  convertDatabaseRecords,
  addDecimals,
  isGreaterThan
} from '../../utils/decimal-helpers'

export class RedemptionService extends BaseService {

  constructor() {
    super('Redemption')
  }

  /**
   * Convert database redemption record to API response format
   */
  private convertRedemptionRecord(record: RedemptionRequestDB): RedemptionRequest {
    return {
      id: record.id,
      token_amount: decimalToNumber(record.token_amount),
      token_type: record.token_type,
      redemption_type: record.redemption_type,
      status: record.status as RedemptionStatus,
      source_wallet_address: record.source_wallet_address,
      destination_wallet_address: record.destination_wallet_address,
      conversion_rate: decimalToNumber(record.conversion_rate),
      investor_name: nullToUndefined(record.investor_name),
      investor_id: nullToUndefined(record.investor_id),
      required_approvals: record.required_approvals,
      is_bulk_redemption: nullToUndefined(record.is_bulk_redemption),
      investor_count: nullToUndefined(record.investor_count),
      rejection_reason: nullToUndefined(record.rejection_reason),
      rejected_by: nullToUndefined(record.rejected_by),
      rejection_timestamp: nullToUndefined(record.rejection_timestamp),
      created_at: record.created_at,
      updated_at: record.updated_at
    }
  }

  /**
   * Convert database redemption window record to API response format
   */
  private convertRedemptionWindowRecord(record: RedemptionWindowDB): RedemptionWindow {
    return {
      id: record.id,
      config_id: record.config_id,
      start_date: record.start_date,
      end_date: record.end_date,
      submission_start_date: record.submission_start_date,
      submission_end_date: record.submission_end_date,
      nav: nullToUndefined(record.nav ? decimalToNumber(record.nav) : undefined),
      nav_date: nullToUndefined(record.nav_date),
      nav_source: nullToUndefined(record.nav_source),
      status: record.status as RedemptionWindowStatus,
      max_redemption_amount: nullToUndefined(record.max_redemption_amount ? decimalToNumber(record.max_redemption_amount) : undefined),
      current_requests: nullToUndefined(record.current_requests),
      total_request_value: nullToUndefined(record.total_request_value ? decimalToNumber(record.total_request_value) : undefined),
      approved_requests: nullToUndefined(record.approved_requests),
      approved_value: nullToUndefined(record.approved_value ? decimalToNumber(record.approved_value) : undefined),
      rejected_requests: nullToUndefined(record.rejected_requests),
      rejected_value: nullToUndefined(record.rejected_value ? decimalToNumber(record.rejected_value) : undefined),
      queued_requests: nullToUndefined(record.queued_requests),
      queued_value: nullToUndefined(record.queued_value ? decimalToNumber(record.queued_value) : undefined),
      processed_by: nullToUndefined(record.processed_by),
      processed_at: nullToUndefined(record.processed_at),
      notes: nullToUndefined(record.notes),
      created_at: nullToUndefined(record.created_at),
      updated_at: nullToUndefined(record.updated_at),
      created_by: nullToUndefined(record.created_by)
    }
  }

  /**
   * Convert database redemption approval record to API response format
   */
  private convertRedemptionApprovalRecord(record: RedemptionApprovalDB): RedemptionApproval {
    return {
      id: record.id,
      redemption_request_id: record.redemption_request_id,
      approval_config_id: record.approval_config_id,
      approver_user_id: record.approver_user_id,
      assigned_at: nullToUndefined(record.assigned_at),
      status: record.status ? (record.status as RedemptionApprovalStatus) : undefined,
      approval_timestamp: nullToUndefined(record.approval_timestamp),
      rejection_reason: nullToUndefined(record.rejection_reason),
      comments: nullToUndefined(record.comments),
      approval_signature: nullToUndefined(record.approval_signature),
      ip_address: nullToUndefined(record.ip_address),
      user_agent: nullToUndefined(record.user_agent)
    }
  }

  /**
   * Get all redemption requests with filtering and pagination
   */
  async getRedemptionRequests(options: RedemptionQueryOptions = {}): Promise<PaginatedResponse<RedemptionRequest>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        investor_id,
        status,
        redemption_type,
        token_type,
        amount_min,
        amount_max,
        created_from,
        created_to,
        requires_approval,
        is_bulk_redemption,
        include_approvals = false,
        include_window = false,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options

      // Build where clause
      const where: any = {}

      if (investor_id) {
        where.investor_id = investor_id
      }

      if (status && status.length > 0) {
        where.status = { in: status }
      }

      if (redemption_type && redemption_type.length > 0) {
        where.redemption_type = { in: redemption_type }
      }

      if (token_type && token_type.length > 0) {
        where.token_type = { in: token_type }
      }

      if (amount_min !== undefined || amount_max !== undefined) {
        where.token_amount = {}
        if (amount_min !== undefined) where.token_amount.gte = amount_min
        if (amount_max !== undefined) where.token_amount.lte = amount_max
      }

      if (created_from || created_to) {
        where.created_at = {}
        if (created_from) where.created_at.gte = created_from
        if (created_to) where.created_at.lte = created_to
      }

      if (requires_approval !== undefined) {
        where.required_approvals = requires_approval ? { gt: 0 } : 0
      }

      if (is_bulk_redemption !== undefined) {
        where.is_bulk_redemption = is_bulk_redemption
      }

      // Search functionality
      if (search) {
        where.OR = [
          { investor_name: { contains: search, mode: 'insensitive' } },
          { investor_id: { contains: search, mode: 'insensitive' } },
          { source_wallet_address: { contains: search, mode: 'insensitive' } },
          { destination_wallet_address: { contains: search, mode: 'insensitive' } },
          { token_type: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Build include clause - note: need to check actual Prisma schema for correct relation names
      const include: any = {}
      // Temporarily disabled until Prisma schema relations are confirmed
      // if (include_approvals) {
      //   include.redemption_approver_assignments = true
      // }

      // Execute paginated query
      const { skip, take } = this.parseQueryOptions({ page, limit })
      const orderBy = { [sort_by]: sort_order }

      const [redemptions, total] = await Promise.all([
        this.db.redemption_requests.findMany({
          skip,
          take,
          where,
          include,
          orderBy
        }),
        this.db.redemption_requests.count({ where })
      ])

      // Convert database records to API response format
      const convertedRedemptions = redemptions.map((redemption: any) => this.convertRedemptionRecord(redemption))

      return this.paginatedResponse(convertedRedemptions, total, page, limit)
    } catch (error) {
      this.logError('Failed to get redemption requests', { error, options })
      throw error
    }
  }

  /**
   * Get redemption request by ID
   */
  async getRedemptionById(
    id: string,
    options: {
      include_approvals?: boolean
      include_window?: boolean
    } = {}
  ): Promise<ServiceResult<RedemptionRequest>> {
    try {
      const { include_approvals = true, include_window = false } = options

      const include: any = {}
      // Temporarily disabled until Prisma schema relations are confirmed
      // if (include_approvals) {
      //   include.redemption_approver_assignments = true
      // }

      const redemption = await this.db.redemption_requests.findUnique({
        where: { id },
        include
      })

      if (!redemption) {
        return this.error('Redemption request not found', 'NOT_FOUND', 404)
      }

      // Convert database record to API response format
      const convertedRedemption = this.convertRedemptionRecord(redemption as any)

      return this.success(convertedRedemption)
    } catch (error) {
      this.logError('Failed to get redemption by ID', { error, id })
      return this.error('Failed to get redemption request', 'DATABASE_ERROR')
    }
  }

  /**
   * Create new redemption request
   */
  async createRedemptionRequest(
    data: RedemptionCreateRequest,
    options: {
      auto_assign_approvers?: boolean
      validate_before_create?: boolean
    } = {}
  ): Promise<ServiceResult<RedemptionCreationResult>> {
    try {
      const { auto_assign_approvers = true, validate_before_create = true } = options

      // Validate required fields
      const validation = this.validateRequiredFields(data, [
        'token_amount', 
        'token_type', 
        'redemption_type', 
        'source_wallet_address', 
        'destination_wallet_address'
      ])
      if (!validation.success) {
        return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
      }

      // Perform validation if requested
      let validationResult: RedemptionValidationResult | undefined
      if (validate_before_create) {
        // This would call the validation service
        // For now, create a basic validation result
        validationResult = {
          is_valid: true,
          validation_errors: [],
          compliance_issues: [],
          workflow_requirements: [],
          approval_requirements: {
            required_approvers: data.required_approvals || 1,
            assigned_approvers: [],
            missing_approvers: data.required_approvals || 1
          },
          eligibility_check: {
            wallet_verified: true,
            token_balance_sufficient: true, // Would need blockchain verification
            redemption_window_open: true,
            investor_eligible: true
          },
          risk_assessment: {
            risk_level: data.token_amount > 100000 ? 'high' : 'medium',
            risk_factors: [],
            additional_checks_required: []
          },
          estimated_completion_time: this.calculateEstimatedCompletionTime(data)
        }
      }

      // Create redemption request
      const redemption = await this.db.redemption_requests.create({
        data: {
          token_amount: data.token_amount,
          token_type: data.token_type,
          redemption_type: data.redemption_type,
          status: 'submitted',
          source_wallet_address: data.source_wallet_address,
          destination_wallet_address: data.destination_wallet_address,
          conversion_rate: data.conversion_rate || 1.0,
          investor_name: data.investor_id, // Would resolve to actual name
          investor_id: data.investor_id,
          required_approvals: data.required_approvals || 1,
          is_bulk_redemption: false,
          investor_count: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      // Auto-assign approvers if requested
      const assignedApprovers: string[] = []
      if (auto_assign_approvers) {
        const approvers = await this.assignApprovers(redemption.id, data.required_approvals || 1)
        assignedApprovers.push(...approvers)
      }

      // Create workflow
      const workflow = await this.createRedemptionWorkflow(redemption.id)

      // Calculate estimated completion
      const estimatedCompletion = new Date(Date.now() + (validationResult?.estimated_completion_time || 48) * 60 * 60 * 1000)

      // Convert database record to API response format
      const convertedRedemption = this.convertRedemptionRecord(redemption as any)

      const result: RedemptionCreationResult = {
        redemption: convertedRedemption,
        validation: validationResult || this.getDefaultValidationResult(),
        workflow,
        assigned_approvers: assignedApprovers,
        estimated_completion: estimatedCompletion
      }

      this.logInfo(
        'Redemption request created successfully',
        { redemptionId: redemption.id, tokenAmount: data.token_amount, tokenType: data.token_type }
      )

      return this.success(result)
    } catch (error) {
      this.logError('Failed to create redemption request', { error, data })
      return this.error('Failed to create redemption request', 'DATABASE_ERROR')
    }
  }

  /**
   * Update redemption request
   */
  async updateRedemptionRequest(
    id: string,
    data: RedemptionUpdateRequest,
    options: {
      validate_before_update?: boolean
    } = {}
  ): Promise<ServiceResult<RedemptionRequest>> {
    try {
      const { validate_before_update = true } = options

      // Check if redemption exists
      const existingRedemption = await this.db.redemption_requests.findUnique({
        where: { id }
      })

      if (!existingRedemption) {
        return this.error('Redemption request not found', 'NOT_FOUND', 404)
      }

      // Validate status transitions
      if (data.status && !this.isValidStatusTransition(existingRedemption.status as RedemptionStatus, data.status)) {
        return this.error(
          `Invalid status transition from ${existingRedemption.status} to ${data.status}`,
          'INVALID_TRANSITION',
          400
        )
      }

      // Update redemption
      const updatedRedemption = await this.db.redemption_requests.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date()
        }
        // Temporarily disabled until Prisma schema relations are confirmed
        // include: {
        //   redemption_approver_assignments: true
        // }
      })

      // Convert database record to API response format
      const convertedRedemption = this.convertRedemptionRecord(updatedRedemption as any)

      this.logInfo('Redemption request updated successfully', { redemptionId: id })
      return this.success(convertedRedemption)
    } catch (error) {
      this.logError('Failed to update redemption request', { error, id, data })
      return this.error('Failed to update redemption request', 'DATABASE_ERROR')
    }
  }

  /**
   * Process redemption approval
   */
  async processRedemptionApproval(
    approvalData: RedemptionApprovalRequest
  ): Promise<ServiceResult<RedemptionApproval>> {
    try {
      const { redemption_request_id, approver_user_id, action, comments, rejection_reason, approval_signature } = approvalData

      // Check if redemption exists
      const redemption = await this.db.redemption_requests.findUnique({
        where: { id: redemption_request_id }
        // Temporarily disabled until Prisma schema relations are confirmed
        // include: {
        //   redemption_approver_assignments: true
        // }
      })

      if (!redemption) {
        return this.error('Redemption request not found', 'NOT_FOUND', 404)
      }

      // Find the specific approval assignment - use redemption_approvers table
      const assignment = await this.db.redemption_approvers.findFirst({
        where: {
          redemption_id: redemption_request_id,
          approver_id: approver_user_id,
          status: 'pending'
        }
      })

      if (!assignment) {
        return this.error('Approval assignment not found or already processed', 'NOT_FOUND', 404)
      }

      // Process the approval
      const approval = await this.db.redemption_approvers.update({
        where: { id: assignment.id },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_at: new Date(),
          comments: action === 'reject' ? rejection_reason : comments
        }
      })

      // Check if all required approvals are completed
      const allAssignments = await this.db.redemption_approvers.findMany({
        where: { redemption_id: redemption_request_id }
      })

      const approvedCount = allAssignments.filter((a: any) => a.status === 'approved').length
      const rejectedCount = allAssignments.filter((a: any) => a.status === 'rejected').length
      const requiredApprovals = redemption.required_approvals

      // Update redemption status based on approval results
      let newStatus: RedemptionStatus = redemption.status as RedemptionStatus

      if (rejectedCount > 0) {
        newStatus = 'rejected'
        await this.db.redemption_requests.update({
          where: { id: redemption_request_id },
          data: {
            status: newStatus,
            rejection_reason: rejection_reason || 'Rejected by approver',
            rejected_by: approver_user_id,
            rejection_timestamp: new Date(),
            updated_at: new Date()
          }
        })
      } else if (approvedCount >= requiredApprovals) {
        newStatus = 'approved'
        await this.db.redemption_requests.update({
          where: { id: redemption_request_id },
          data: {
            status: newStatus,
            updated_at: new Date()
          }
        })
      }

      this.logInfo(
        'Redemption approval processed',
        { 
          redemptionId: redemption_request_id, 
          approverId: approver_user_id, 
          action, 
          newStatus 
        }
      )

      // Convert database record to API response format
      const convertedApproval = this.convertRedemptionApprovalRecord(approval as any)

      return this.success(convertedApproval)
    } catch (error) {
      this.logError('Failed to process redemption approval', { error, approvalData })
      return this.error('Failed to process redemption approval', 'DATABASE_ERROR')
    }
  }

  /**
   * Get active redemption windows
   */
  async getActiveRedemptionWindows(): Promise<ServiceResult<RedemptionWindow[]>> {
    try {
      const now = new Date()

      const windows = await this.db.redemption_windows.findMany({
        where: {
          status: 'open',
          start_date: { lte: now },
          end_date: { gte: now }
        },
        orderBy: { start_date: 'asc' }
      })

      // Convert database records to API response format
      const convertedWindows = windows.map((window: any) => this.convertRedemptionWindowRecord(window))

      return this.success(convertedWindows)
    } catch (error) {
      this.logError('Failed to get active redemption windows', { error })
      return this.error('Failed to get redemption windows', 'DATABASE_ERROR')
    }
  }

  /**
   * Check if redemption is allowed in current window
   */
  async isRedemptionAllowed(
    tokenType: string,
    amount: number
  ): Promise<ServiceResult<{
    allowed: boolean
    reason?: string
    activeWindow?: RedemptionWindow
  }>> {
    try {
      const activeWindows = await this.getActiveRedemptionWindows()
      
      if (!activeWindows.success || !activeWindows.data || activeWindows.data.length === 0) {
        return this.success({
          allowed: false,
          reason: 'No active redemption window'
        })
      }

      // Find window that matches token type (simplified logic)
      const applicableWindow = activeWindows.data[0] // Use first active window for now
      
      if (!applicableWindow) {
        return this.success({
          allowed: false,
          reason: 'No applicable redemption window found'
        })
      }

      // Check if window has capacity
      const currentTotal = applicableWindow.total_request_value || 0
      const maxAmount = applicableWindow.max_redemption_amount || Number.MAX_SAFE_INTEGER

      if (currentTotal + amount > maxAmount) {
        return this.success({
          allowed: false,
          reason: 'Redemption amount exceeds window capacity',
          activeWindow: applicableWindow
        })
      }

      return this.success({
        allowed: true,
        activeWindow: applicableWindow
      })
    } catch (error) {
      this.logError('Failed to check redemption eligibility', { error, tokenType, amount })
      return this.error('Failed to check redemption eligibility', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async assignApprovers(redemptionId: string, requiredApprovals: number): Promise<string[]> {
    // Simplified approver assignment - in production would have complex logic
    // to assign based on amount, token type, investor tier, etc.
    
    // For now, return empty array - would implement actual assignment logic
    return []
  }

  private async createRedemptionWorkflow(redemptionId: string): Promise<RedemptionWorkflow> {
    const currentStage: RedemptionWorkflowStage = 'submitted'
    const completedStages: RedemptionWorkflowStage[] = ['submitted']
    const pendingStages: RedemptionWorkflowStage[] = ['validation', 'approval_required', 'approved', 'processing', 'settlement', 'completed']

    return {
      redemption_id: redemptionId,
      current_stage: currentStage,
      completed_stages: completedStages,
      pending_stages: pendingStages,
      approvals: [],
      workflow_data: {
        created_at: new Date(),
        requires_approval: true
      },
      estimated_completion: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      actual_completion: undefined,
      blocked_reason: undefined
    }
  }

  private getDefaultValidationResult(): RedemptionValidationResult {
    return {
      is_valid: true,
      validation_errors: [],
      compliance_issues: [],
      workflow_requirements: [],
      approval_requirements: {
        required_approvers: 1,
        assigned_approvers: [],
        missing_approvers: 1
      },
      eligibility_check: {
        wallet_verified: true,
        token_balance_sufficient: true,
        redemption_window_open: true,
        investor_eligible: true
      },
      risk_assessment: {
        risk_level: 'medium',
        risk_factors: [],
        additional_checks_required: []
      },
      estimated_completion_time: 48
    }
  }

  private calculateEstimatedCompletionTime(data: RedemptionCreateRequest): number {
    let hours = 48 // Base time

    if (data.token_amount > 100000) hours += 24
    if (data.redemption_type === 'full') hours += 12
    if (data.required_approvals && data.required_approvals > 1) hours += 24

    return hours
  }

  private isValidStatusTransition(from: RedemptionStatus, to: RedemptionStatus): boolean {
    const validTransitions: Record<RedemptionStatus, RedemptionStatus[]> = {
      'submitted': ['pending_approval', 'approved', 'rejected', 'cancelled'],
      'pending_approval': ['approved', 'rejected', 'cancelled'],
      'approved': ['processing', 'cancelled'],
      'rejected': [], // Final state
      'processing': ['completed', 'failed'],
      'completed': [], // Final state
      'cancelled': [], // Final state
      'failed': ['processing'] // Can retry
    }

    return validTransitions[from]?.includes(to) || false
  }
}

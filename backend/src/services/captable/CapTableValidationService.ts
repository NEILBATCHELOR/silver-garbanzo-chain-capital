// Captable Validation Service - Data validation & business rules
// Provides comprehensive validation for captable operations

import { BaseService } from '../BaseService'
import { logger } from '@/utils/logger'
import {
  CapTableCreateRequest,
  CapTableUpdateRequest,
  InvestorCreateRequest,
  InvestorUpdateRequest,
  SubscriptionCreateRequest,
  SubscriptionUpdateRequest,
  TokenAllocationCreateRequest,
  TokenAllocationUpdateRequest,
  DistributionCreateRequest,
  DistributionUpdateRequest,
  CapTableValidationResult,
  ValidationError,
  ValidationWarning,
  ServiceResult
} from '@/types/captable-service'
import { Decimal } from 'decimal.js'

export class CapTableValidationService extends BaseService {
  constructor() {
    super('CapTableValidation')
  }

  // ============================================================================
  // CAP TABLE VALIDATION
  // ============================================================================

  /**
   * Validate cap table creation data
   */
  async validateCapTableCreate(data: CapTableCreateRequest): Promise<ServiceResult<CapTableValidationResult>> {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      // Required field validation
      if (!data.projectId) {
        errors.push({
          field: 'projectId',
          message: 'Project ID is required',
          code: 'REQUIRED_FIELD',
          severity: 'error'
        })
      }

      if (!data.name || data.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: 'Cap table name is required',
          code: 'REQUIRED_FIELD',
          severity: 'error'
        })
      }

      // Business rule validation
      if (data.name && data.name.length > 255) {
        errors.push({
          field: 'name',
          message: 'Cap table name must be less than 255 characters',
          code: 'FIELD_TOO_LONG',
          severity: 'error'
        })
      }

      if (data.description && data.description.length > 1000) {
        warnings.push({
          field: 'description',
          message: 'Description is quite long. Consider keeping it concise',
          code: 'FIELD_LONG',
          recommendation: 'Keep description under 500 characters for better readability'
        })
      }

      // Check if project exists
      if (data.projectId) {
        const project = await this.db.projects.findUnique({
          where: { id: data.projectId }
        })

        if (!project) {
          errors.push({
            field: 'projectId',
            message: 'Project does not exist',
            code: 'INVALID_REFERENCE',
            severity: 'error'
          })
        }

        // Check if cap table already exists for this project
        const existingCapTable = await this.db.cap_tables.findFirst({
          where: { project_id: data.projectId }
        })

        if (existingCapTable) {
          errors.push({
            field: 'projectId',
            message: 'Cap table already exists for this project',
            code: 'DUPLICATE_ENTRY',
            severity: 'error'
          })
        }
      }

      const result: CapTableValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        completionPercentage: this.calculateCompletionPercentage(['projectId', 'name'], data),
        missingFields: this.getMissingRequiredFields(['projectId', 'name'], data),
        requiredActions: errors.map(e => e.message)
      }

      return this.success(result)

    } catch (error) {
      this.logError('Error validating cap table creation', { error, data })
      return this.error('Validation failed', 'VALIDATION_ERROR')
    }
  }

  /**
   * Validate cap table update data
   */
  async validateCapTableUpdate(
    id: string, 
    data: CapTableUpdateRequest
  ): Promise<ServiceResult<CapTableValidationResult>> {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      // Check if cap table exists
      const capTable = await this.db.cap_tables.findUnique({
        where: { id }
      })

      if (!capTable) {
        errors.push({
          field: 'id',
          message: 'Cap table not found',
          code: 'NOT_FOUND',
          severity: 'error'
        })
      }

      // Field validation
      if (data.name !== undefined) {
        if (!data.name || data.name.trim().length === 0) {
          errors.push({
            field: 'name',
            message: 'Cap table name cannot be empty',
            code: 'REQUIRED_FIELD',
            severity: 'error'
          })
        } else if (data.name.length > 255) {
          errors.push({
            field: 'name',
            message: 'Cap table name must be less than 255 characters',
            code: 'FIELD_TOO_LONG',
            severity: 'error'
          })
        }
      }

      if (data.description && data.description.length > 1000) {
        warnings.push({
          field: 'description',
          message: 'Description is quite long. Consider keeping it concise',
          code: 'FIELD_LONG',
          recommendation: 'Keep description under 500 characters for better readability'
        })
      }

      const result: CapTableValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        completionPercentage: 100, // Updates don't have completion percentage
        missingFields: [],
        requiredActions: errors.map(e => e.message)
      }

      return this.success(result)

    } catch (error) {
      this.logError('Error validating cap table update', { error, id, data })
      return this.error('Validation failed', 'VALIDATION_ERROR')
    }
  }

  // ============================================================================
  // INVESTOR VALIDATION
  // ============================================================================

  /**
   * Validate investor creation data
   */
  async validateInvestorCreate(data: InvestorCreateRequest): Promise<ServiceResult<CapTableValidationResult>> {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      const requiredFields = ['investorId', 'name', 'email']

      // Required field validation
      requiredFields.forEach(field => {
        const value = (data as any)[field]
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          errors.push({
            field,
            message: `${field} is required`,
            code: 'REQUIRED_FIELD',
            severity: 'error'
          })
        }
      })

      // Email validation
      if (data.email && !this.isValidEmail(data.email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format',
          code: 'INVALID_FORMAT',
          severity: 'error'
        })
      }

      // Investor ID format validation
      if (data.investorId && data.investorId.length < 3) {
        errors.push({
          field: 'investorId',
          message: 'Investor ID must be at least 3 characters long',
          code: 'FIELD_TOO_SHORT',
          severity: 'error'
        })
      }

      // Check for duplicate investor ID or email
      if (data.investorId || data.email) {
        const existingInvestor = await this.db.investors.findFirst({
          where: {
            OR: [
              { investor_id: data.investorId },
              { email: data.email }
            ]
          }
        })

        if (existingInvestor) {
          if (existingInvestor.investor_id === data.investorId) {
            errors.push({
              field: 'investorId',
              message: 'Investor ID already exists',
              code: 'DUPLICATE_ENTRY',
              severity: 'error'
            })
          }
          if (existingInvestor.email === data.email) {
            errors.push({
              field: 'email',
              message: 'Email address already exists',
              code: 'DUPLICATE_ENTRY',
              severity: 'error'
            })
          }
        }
      }

      // Financial validation
      if (data.annualIncome && data.annualIncome.lessThan(0)) {
        errors.push({
          field: 'annualIncome',
          message: 'Annual income cannot be negative',
          code: 'INVALID_VALUE',
          severity: 'error'
        })
      }

      if (data.netWorth && data.netWorth.lessThan(0)) {
        errors.push({
          field: 'netWorth',
          message: 'Net worth cannot be negative',
          code: 'INVALID_VALUE',
          severity: 'error'
        })
      }

      // Age validation if date of birth provided
      if (data.dateOfBirth) {
        const age = this.calculateAge(data.dateOfBirth)
        if (age < 18) {
          errors.push({
            field: 'dateOfBirth',
            message: 'Investor must be at least 18 years old',
            code: 'INVALID_AGE',
            severity: 'error'
          })
        }
        if (age > 120) {
          warnings.push({
            field: 'dateOfBirth',
            message: 'Please verify the date of birth',
            code: 'UNUSUAL_AGE',
            recommendation: 'Age seems unusually high, please double-check'
          })
        }
      }

      // Wallet address validation
      if (data.walletAddress && !this.isValidWalletAddress(data.walletAddress)) {
        warnings.push({
          field: 'walletAddress',
          message: 'Wallet address format may be invalid',
          code: 'INVALID_FORMAT',
          recommendation: 'Verify that the wallet address is correct'
        })
      }

      const result: CapTableValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        completionPercentage: this.calculateCompletionPercentage(requiredFields, data),
        missingFields: this.getMissingRequiredFields(requiredFields, data),
        requiredActions: errors.map(e => e.message)
      }

      return this.success(result)

    } catch (error) {
      this.logError('Error validating investor creation', { error, data })
      return this.error('Validation failed', 'VALIDATION_ERROR')
    }
  }

  // ============================================================================
  // SUBSCRIPTION VALIDATION
  // ============================================================================

  /**
   * Validate subscription creation data
   */
  async validateSubscriptionCreate(data: SubscriptionCreateRequest): Promise<ServiceResult<CapTableValidationResult>> {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      const requiredFields = ['projectId', 'investorId', 'subscriptionAmount']

      // Required field validation
      requiredFields.forEach(field => {
        if (!(data as any)[field]) {
          errors.push({
            field,
            message: `${field} is required`,
            code: 'REQUIRED_FIELD',
            severity: 'error'
          })
        }
      })

      // Amount validation
      if (data.subscriptionAmount) {
        if (data.subscriptionAmount.lessThanOrEqualTo(0)) {
          errors.push({
            field: 'subscriptionAmount',
            message: 'Subscription amount must be greater than zero',
            code: 'INVALID_VALUE',
            severity: 'error'
          })
        }

        // Check for reasonable maximum
        const maxAmount = new Decimal('1000000000') // 1 billion
        if (data.subscriptionAmount.greaterThan(maxAmount)) {
          warnings.push({
            field: 'subscriptionAmount',
            message: 'Subscription amount is very large',
            code: 'UNUSUAL_VALUE',
            recommendation: 'Please verify the subscription amount'
          })
        }
      }

      // Check if project exists and is active
      if (data.projectId) {
        const project = await this.db.projects.findUnique({
          where: { id: data.projectId }
        })

        if (!project) {
          errors.push({
            field: 'projectId',
            message: 'Project does not exist',
            code: 'INVALID_REFERENCE',
            severity: 'error'
          })
        } else if (project.status !== 'Active') {
          warnings.push({
            field: 'projectId',
            message: 'Project is not active',
            code: 'PROJECT_INACTIVE',
            recommendation: 'Verify that subscriptions are allowed for this project'
          })
        }
      }

      // Check if investor exists and is active
      if (data.investorId) {
        const investor = await this.db.investors.findUnique({
          where: { investor_id: data.investorId }
        })

        if (!investor) {
          errors.push({
            field: 'investorId',
            message: 'Investor does not exist',
            code: 'INVALID_REFERENCE',
            severity: 'error'
          })
        } else {
          if (investor.investor_status !== 'active') {
            errors.push({
              field: 'investorId',
              message: 'Investor account is inactive',
              code: 'INVESTOR_INACTIVE',
              severity: 'error'
            })
          }

          if (investor.kyc_status !== 'approved') {
            warnings.push({
              field: 'investorId',
              message: 'Investor KYC is not approved',
              code: 'KYC_NOT_APPROVED',
              recommendation: 'Complete KYC approval before processing subscription'
            })
          }
        }
      }

      // Date validation
      if (data.subscriptionDate) {
        const now = new Date()
        const subscriptionDate = new Date(data.subscriptionDate)
        
        if (subscriptionDate > now) {
          errors.push({
            field: 'subscriptionDate',
            message: 'Subscription date cannot be in the future',
            code: 'INVALID_DATE',
            severity: 'error'
          })
        }

        // Check if subscription is too old (more than 5 years)
        const fiveYearsAgo = new Date()
        fiveYearsAgo.setFullYear(now.getFullYear() - 5)
        
        if (subscriptionDate < fiveYearsAgo) {
          warnings.push({
            field: 'subscriptionDate',
            message: 'Subscription date is more than 5 years old',
            code: 'OLD_DATE',
            recommendation: 'Verify the subscription date is correct'
          })
        }
      }

      const result: CapTableValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        completionPercentage: this.calculateCompletionPercentage(requiredFields, data),
        missingFields: this.getMissingRequiredFields(requiredFields, data),
        requiredActions: errors.map(e => e.message)
      }

      return this.success(result)

    } catch (error) {
      this.logError('Error validating subscription creation', { error, data })
      return this.error('Validation failed', 'VALIDATION_ERROR')
    }
  }

  // ============================================================================
  // TOKEN ALLOCATION VALIDATION
  // ============================================================================

  /**
   * Validate token allocation creation data
   */
  async validateTokenAllocationCreate(data: TokenAllocationCreateRequest): Promise<ServiceResult<CapTableValidationResult>> {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      const requiredFields = ['projectId', 'subscriptionId', 'investorId', 'tokenType', 'tokenAmount']

      // Required field validation
      requiredFields.forEach(field => {
        if (!(data as any)[field]) {
          errors.push({
            field,
            message: `${field} is required`,
            code: 'REQUIRED_FIELD',
            severity: 'error'
          })
        }
      })

      // Token amount validation
      if (data.tokenAmount) {
        if (data.tokenAmount.lessThanOrEqualTo(0)) {
          errors.push({
            field: 'tokenAmount',
            message: 'Token amount must be greater than zero',
            code: 'INVALID_VALUE',
            severity: 'error'
          })
        }
      }

      // Check if subscription exists and validate allocation against subscription amount
      if (data.subscriptionId) {
        const subscription = await this.db.subscriptions.findUnique({
          where: { id: data.subscriptionId },
          include: { token_allocations: true }
        })

        if (!subscription) {
          errors.push({
            field: 'subscriptionId',
            message: 'Subscription does not exist',
            code: 'INVALID_REFERENCE',
            severity: 'error'
          })
        } else {
          // Check if this would cause over-allocation
          const existingAllocations = subscription.token_allocations || []
          const totalExistingTokens = existingAllocations.reduce(
            (sum: any, alloc: any) => sum.add(alloc.token_amount), 
            new Decimal(0)
          )
          const totalAfterAllocation = totalExistingTokens.add(data.tokenAmount || 0)

          // This is a business rule - you might want to allow over-allocation in some cases
          if (totalAfterAllocation.greaterThan(subscription.fiat_amount)) {
            warnings.push({
              field: 'tokenAmount',
              message: 'Token allocation exceeds subscription amount',
              code: 'OVER_ALLOCATION',
              recommendation: 'Verify that the allocation amount is correct'
            })
          }

          // Check subscription and investor match
          if (data.investorId && subscription.investor_id !== data.investorId) {
            errors.push({
              field: 'investorId',
              message: 'Investor ID does not match subscription investor',
              code: 'INVESTOR_MISMATCH',
              severity: 'error'
            })
          }

          if (data.projectId && subscription.project_id !== data.projectId) {
            errors.push({
              field: 'projectId',
              message: 'Project ID does not match subscription project',
              code: 'PROJECT_MISMATCH',
              severity: 'error'
            })
          }
        }
      }

      // Validate allocation date
      if (data.allocationDate) {
        const now = new Date()
        const allocationDate = new Date(data.allocationDate)
        
        if (allocationDate > now) {
          errors.push({
            field: 'allocationDate',
            message: 'Allocation date cannot be in the future',
            code: 'INVALID_DATE',
            severity: 'error'
          })
        }
      }

      const result: CapTableValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        completionPercentage: this.calculateCompletionPercentage(requiredFields, data),
        missingFields: this.getMissingRequiredFields(requiredFields, data),
        requiredActions: errors.map(e => e.message)
      }

      return this.success(result)

    } catch (error) {
      this.logError('Error validating token allocation creation', { error, data })
      return this.error('Validation failed', 'VALIDATION_ERROR')
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate wallet address format (basic validation)
   */
  private isValidWalletAddress(address: string): boolean {
    // Basic Ethereum address validation (0x + 40 hex characters)
    const ethRegex = /^0x[a-fA-F0-9]{40}$/
    return ethRegex.test(address)
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  /**
   * Calculate completion percentage based on required fields
   */
  private calculateCompletionPercentage(requiredFields: string[], data: any): number {
    const completedFields = requiredFields.filter(field => {
      const value = data[field]
      return value !== undefined && value !== null && 
             (typeof value !== 'string' || value.trim().length > 0)
    })
    
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  /**
   * Get missing required fields
   */
  private getMissingRequiredFields(requiredFields: string[], data: any): string[] {
    return requiredFields.filter(field => {
      const value = data[field]
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim().length === 0)
    })
  }

  /**
   * Validate bulk operation
   */
  async validateBulkOperation(
    operationType: string,
    items: any[],
    maxBatchSize: number = 100
  ): Promise<ServiceResult<CapTableValidationResult>> {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      // Check batch size
      if (items.length === 0) {
        errors.push({
          field: 'items',
          message: 'No items provided for bulk operation',
          code: 'EMPTY_BATCH',
          severity: 'error'
        })
      }

      if (items.length > maxBatchSize) {
        errors.push({
          field: 'items',
          message: `Batch size exceeds maximum limit of ${maxBatchSize}`,
          code: 'BATCH_TOO_LARGE',
          severity: 'error'
        })
      }

      // Warn about large batches
      if (items.length > 50) {
        warnings.push({
          field: 'items',
          message: 'Large batch operation may take significant time to process',
          code: 'LARGE_BATCH',
          recommendation: 'Consider processing in smaller batches for better performance'
        })
      }

      const result: CapTableValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        completionPercentage: 100,
        missingFields: [],
        requiredActions: errors.map(e => e.message)
      }

      return this.success(result)

    } catch (error) {
      this.logError('Error validating bulk operation', { error, operationType, itemCount: items.length })
      return this.error('Validation failed', 'VALIDATION_ERROR')
    }
  }
}

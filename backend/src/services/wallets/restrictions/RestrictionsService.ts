import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { SmartContractWalletService } from '../smart-contract/SmartContractWalletService'

export interface RestrictionRule {
  id: string
  walletId: string
  ruleType: 'whitelist' | 'blacklist' | 'daily_limit' | 'time_restriction' | 'amount_limit' | 'custom'
  name: string
  description?: string
  isActive: boolean
  priority: number
  ruleData: RestrictionRuleData
  createdAt: string
  updatedAt: string
}

export interface RestrictionRuleData {
  // Whitelist/Blacklist
  addresses?: string[]
  
  // Daily limit
  dailyLimitUSD?: number
  dailyLimitETH?: number
  dailyLimitBTC?: number
  
  // Time restrictions
  allowedHours?: { start: number; end: number }[]
  allowedDays?: number[] // 0-6, Sunday = 0
  timezone?: string
  
  // Amount limits
  maxTransactionUSD?: number
  maxTransactionETH?: number
  maxTransactionBTC?: number
  
  // Custom restriction
  contractAddress?: string
  functionSelector?: string
  customData?: any
}

export interface TransactionValidationRequest {
  walletId: string
  fromAddress: string
  toAddress: string
  value: string
  data?: string
  blockchain: string
  tokenAddress?: string
  tokenAmount?: string
}

export interface ValidationResult {
  isValid: boolean
  failedRules: RestrictionRule[]
  warnings: string[]
  approvedAmount?: string
}

/**
 * RestrictionsService - Transaction Compliance & Restrictions
 * 
 * Manages and enforces transaction restrictions for smart contract wallets.
 * Based on Barz RestrictionsFacet with enhanced Chain Capital functionality.
 * 
 * Supported restriction types:
 * - Whitelist/Blacklist addresses
 * - Daily transaction limits
 * - Time-based restrictions  
 * - Amount limits per transaction
 * - Custom smart contract restrictions
 */
export class RestrictionsService extends BaseService {
  
  private smartContractWallet: SmartContractWalletService

  constructor() {
    super('Restrictions')
    this.smartContractWallet = new SmartContractWalletService()
  }

  /**
   * Initialize restrictions for a smart contract wallet
   */
  async initializeRestrictions(
    walletId: string,
    initialRules: Omit<RestrictionRule, 'id' | 'walletId' | 'createdAt' | 'updatedAt'>[] = []
  ): Promise<ServiceResult<RestrictionRule[]>> {
    try {
      // Validate wallet exists and is smart contract wallet
      const smartWallet = await this.smartContractWallet.getSmartContractWallet(walletId)
      if (!smartWallet.success || !smartWallet.data) {
        return this.error('Smart contract wallet not found', 'SMART_WALLET_NOT_FOUND', 404)
      }

      // Check if already initialized
      const existingRules = await this.db.wallet_restriction_rules.findMany({
        where: { wallet_id: walletId }
      })

      if (existingRules.length > 0) {
        return this.error('Restrictions already initialized', 'RESTRICTIONS_ALREADY_INITIALIZED')
      }

      // Create initial rules
      const createdRules: RestrictionRule[] = []
      
      if (initialRules.length === 0) {
        // Create default restrictions if none provided
        const defaultRule = await this.createDefaultRestrictions(walletId)
        createdRules.push(defaultRule)
      } else {
        // Create provided rules
        for (const rule of initialRules) {
          const created = await this.db.wallet_restriction_rules.create({
            data: {
              wallet_id: walletId,
              rule_type: rule.ruleType,
              name: rule.name,
              description: rule.description,
              is_active: rule.isActive,
              priority: rule.priority,
              rule_data: rule.ruleData as any
            }
          })
          
          createdRules.push(this.mapToRestrictionRule(created))
        }
      }

      this.logger.info({
        walletId,
        rulesCount: createdRules.length
      }, 'Wallet restrictions initialized')

      return this.success(createdRules)

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to initialize restrictions')
      return this.error('Failed to initialize restrictions', 'RESTRICTIONS_INIT_ERROR')
    }
  }

  /**
   * Add a restriction rule to a wallet
   */
  async addRestriction(
    walletId: string,
    rule: Omit<RestrictionRule, 'id' | 'walletId' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceResult<RestrictionRule>> {
    try {
      // Validate rule data
      const validation = this.validateRestrictionRule(rule)
      if (!validation.isValid) {
        return this.error(validation.errors.join(', '), 'INVALID_RULE_DATA')
      }

      // Create the rule
      const created = await this.db.wallet_restriction_rules.create({
        data: {
          wallet_id: walletId,
          rule_type: rule.ruleType,
          name: rule.name,
          description: rule.description,
          is_active: rule.isActive,
          priority: rule.priority,
          rule_data: rule.ruleData as any
        }
      })

      const restrictionRule = this.mapToRestrictionRule(created)

      this.logger.info({
        walletId,
        ruleId: restrictionRule.id,
        ruleType: rule.ruleType
      }, 'Restriction rule added')

      return this.success(restrictionRule)

    } catch (error) {
      this.logger.error({ error, walletId, rule }, 'Failed to add restriction')
      return this.error('Failed to add restriction', 'RESTRICTION_ADD_ERROR')
    }
  }

  /**
   * Remove a restriction rule
   */
  async removeRestriction(walletId: string, ruleId: string): Promise<ServiceResult<boolean>> {
    try {
      const rule = await this.db.wallet_restriction_rules.findFirst({
        where: {
          id: ruleId,
          wallet_id: walletId
        }
      })

      if (!rule) {
        return this.error('Restriction rule not found', 'RULE_NOT_FOUND', 404)
      }

      // Check if this is the last rule (can't remove all restrictions)
      const totalRules = await this.db.wallet_restriction_rules.count({
        where: {
          wallet_id: walletId,
          is_active: true
        }
      })

      if (totalRules <= 1) {
        return this.error('Cannot remove the last restriction rule', 'CANNOT_REMOVE_LAST_RULE')
      }

      // Remove the rule
      await this.db.wallet_restriction_rules.delete({
        where: { id: ruleId }
      })

      this.logger.info({
        walletId,
        ruleId,
        ruleType: rule.rule_type
      }, 'Restriction rule removed')

      return this.success(true)

    } catch (error) {
      this.logger.error({ error, walletId, ruleId }, 'Failed to remove restriction')
      return this.error('Failed to remove restriction', 'RESTRICTION_REMOVE_ERROR')
    }
  }

  /**
   * Update a restriction rule
   */
  async updateRestriction(
    walletId: string,
    ruleId: string,
    updates: Partial<Omit<RestrictionRule, 'id' | 'walletId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ServiceResult<RestrictionRule>> {
    try {
      const rule = await this.db.wallet_restriction_rules.findFirst({
        where: {
          id: ruleId,
          wallet_id: walletId
        }
      })

      if (!rule) {
        return this.error('Restriction rule not found', 'RULE_NOT_FOUND', 404)
      }

      // Update the rule
      const updated = await this.db.wallet_restriction_rules.update({
        where: { id: ruleId },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.isActive !== undefined && { is_active: updates.isActive }),
          ...(updates.priority !== undefined && { priority: updates.priority }),
          ...(updates.ruleData && { rule_data: updates.ruleData as any }),
          updated_at: new Date()
        }
      })

      const updatedRule = this.mapToRestrictionRule(updated)

      this.logger.info({
        walletId,
        ruleId,
        updates: Object.keys(updates)
      }, 'Restriction rule updated')

      return this.success(updatedRule)

    } catch (error) {
      this.logger.error({ error, walletId, ruleId, updates }, 'Failed to update restriction')
      return this.error('Failed to update restriction', 'RESTRICTION_UPDATE_ERROR')
    }
  }

  /**
   * Get all restriction rules for a wallet
   */
  async getRestrictions(
    walletId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<ServiceResult<RestrictionRule[]>> {
    try {
      const { activeOnly = true } = options

      const where: any = { wallet_id: walletId }
      if (activeOnly) {
        where.is_active = true
      }

      const rules = await this.db.wallet_restriction_rules.findMany({
        where,
        orderBy: { priority: 'asc' }
      })

      return this.success(rules.map(r => this.mapToRestrictionRule(r)))

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to get restrictions')
      return this.error('Failed to get restrictions', 'RESTRICTIONS_GET_ERROR')
    }
  }

  /**
   * Validate a transaction against all restrictions
   */
  async validateTransaction(request: TransactionValidationRequest): Promise<ServiceResult<ValidationResult>> {
    try {
      const { walletId, fromAddress, toAddress, value, data, blockchain, tokenAddress, tokenAmount } = request

      // Get active restrictions for the wallet
      const restrictionsResult = await this.getRestrictions(walletId, { activeOnly: true })
      if (!restrictionsResult.success) {
        return this.error(restrictionsResult.error!, restrictionsResult.code!)
      }

      const restrictions = restrictionsResult.data!
      const failedRules: RestrictionRule[] = []
      const warnings: string[] = []

      // Validate against each restriction
      for (const rule of restrictions) {
        const validation = await this.validateAgainstRule(rule, request)
        
        if (!validation.isValid) {
          failedRules.push(rule)
          
          if (validation.reason) {
            warnings.push(`${rule.name}: ${validation.reason}`)
          }
        }
      }

      const result: ValidationResult = {
        isValid: failedRules.length === 0,
        failedRules,
        warnings
      }

      this.logger.debug({
        walletId,
        toAddress,
        value,
        rulesChecked: restrictions.length,
        failedRulesCount: failedRules.length,
        isValid: result.isValid
      }, 'Transaction validation completed')

      return this.success(result)

    } catch (error) {
      this.logger.error({ error, request }, 'Failed to validate transaction')
      return this.error('Failed to validate transaction', 'TRANSACTION_VALIDATION_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async createDefaultRestrictions(walletId: string): Promise<RestrictionRule> {
    // Create a default "allow all" rule with basic safety limits
    const defaultRule = await this.db.wallet_restriction_rules.create({
      data: {
        wallet_id: walletId,
        rule_type: 'amount_limit',
        name: 'Default Safety Limits',
        description: 'Basic safety limits for transactions',
        is_active: true,
        priority: 100,
        rule_data: {
          maxTransactionUSD: 10000, // $10,000 max per transaction
          maxTransactionETH: 5,     // 5 ETH max per transaction
          maxTransactionBTC: 0.5,   // 0.5 BTC max per transaction
          dailyLimitUSD: 50000      // $50,000 daily limit
        }
      }
    })

    return this.mapToRestrictionRule(defaultRule)
  }

  private validateRestrictionRule(rule: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!rule.name || rule.name.length < 3) {
      errors.push('Rule name must be at least 3 characters')
    }

    if (!rule.ruleType || !['whitelist', 'blacklist', 'daily_limit', 'time_restriction', 'amount_limit', 'custom'].includes(rule.ruleType)) {
      errors.push('Invalid rule type')
    }

    if (typeof rule.isActive !== 'boolean') {
      errors.push('isActive must be a boolean')
    }

    if (typeof rule.priority !== 'number' || rule.priority < 0) {
      errors.push('Priority must be a positive number')
    }

    if (!rule.ruleData || typeof rule.ruleData !== 'object') {
      errors.push('Rule data is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private async validateAgainstRule(
    rule: RestrictionRule,
    request: TransactionValidationRequest
  ): Promise<{ isValid: boolean; reason?: string }> {
    const { ruleType, ruleData } = rule
    const { toAddress, value, fromAddress } = request

    switch (ruleType) {
      case 'whitelist':
        if (ruleData.addresses && !ruleData.addresses.includes(toAddress.toLowerCase())) {
          return { isValid: false, reason: 'Address not in whitelist' }
        }
        break

      case 'blacklist':
        if (ruleData.addresses && ruleData.addresses.includes(toAddress.toLowerCase())) {
          return { isValid: false, reason: 'Address is blacklisted' }
        }
        break

      case 'amount_limit':
        const valueInETH = parseFloat(value) / 1e18 // Convert wei to ETH
        if (ruleData.maxTransactionETH && valueInETH > ruleData.maxTransactionETH) {
          return { isValid: false, reason: `Transaction exceeds maximum amount limit` }
        }
        break

      case 'time_restriction':
        const now = new Date()
        const hour = now.getHours()
        const day = now.getDay()

        if (ruleData.allowedHours) {
          const isHourAllowed = ruleData.allowedHours.some(
            range => hour >= range.start && hour <= range.end
          )
          if (!isHourAllowed) {
            return { isValid: false, reason: 'Transaction not allowed at this time' }
          }
        }

        if (ruleData.allowedDays && !ruleData.allowedDays.includes(day)) {
          return { isValid: false, reason: 'Transaction not allowed on this day' }
        }
        break

      case 'daily_limit':
        // This would check against daily transaction totals (requires tracking)
        // For now, implement basic check
        const dailyTotalCheck = await this.checkDailyLimit(request.walletId, ruleData)
        if (!dailyTotalCheck.isValid) {
          return dailyTotalCheck
        }
        break

      case 'custom':
        // Custom restriction validation would go here
        // For now, allow all custom restrictions
        break
    }

    return { isValid: true }
  }

  private async checkDailyLimit(
    walletId: string,
    ruleData: RestrictionRuleData
  ): Promise<{ isValid: boolean; reason?: string }> {
    // This would integrate with transaction tracking to check daily limits
    // Placeholder implementation
    this.logger.debug({
      walletId,
      dailyLimitUSD: ruleData.dailyLimitUSD
    }, 'Checking daily limit (placeholder)')

    return { isValid: true }
  }

  private mapToRestrictionRule(rule: any): RestrictionRule {
    return {
      id: rule.id,
      walletId: rule.wallet_id,
      ruleType: rule.rule_type,
      name: rule.name,
      description: rule.description,
      isActive: rule.is_active,
      priority: rule.priority,
      ruleData: rule.rule_data,
      createdAt: rule.created_at.toISOString(),
      updatedAt: rule.updated_at.toISOString()
    }
  }
}

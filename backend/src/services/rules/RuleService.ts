/**
 * Rule Service
 * Main service for managing rules using BaseService pattern
 */

import { BaseService } from '../BaseService'
import type { 
  Rule, 
  CreateRuleRequest, 
  UpdateRuleRequest, 
  RuleResponse,
  RuleQueryOptions,
  RuleValidationResult 
} from '@/types/rule-service'
import type { ServiceResult, PaginatedResponse } from '@/types/index'

export class RuleService extends BaseService {
  constructor() {
    super('Rule')
  }

  /**
   * Create a new rule
   */
  async createRule(
    data: CreateRuleRequest,
    createdBy: string
  ): Promise<ServiceResult<RuleResponse>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(data, ['rule_name', 'rule_type'])
      if (!validation.success) {
        return validation as ServiceResult<RuleResponse>
      }

      // Create rule data with required fields
      const ruleData = {
        rule_name: data.rule_name,
        rule_type: data.rule_type,
        rule_details: data.rule_details || null,
        created_by: createdBy,
        status: data.status || 'active',
        is_template: data.is_template || false,
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await this.createEntity<any>(
        this.db.rules,
        ruleData
      )

      if (result.success && result.data) {
        // Transform to match RuleResponse
        const transformedData: RuleResponse = {
          ...result.data,
          rule_details: (result.data.rule_details && typeof result.data.rule_details === 'object' && result.data.rule_details !== null)
            ? result.data.rule_details as Record<string, any>
            : null
        }
        
        return this.success(transformedData)
      }

      return result as ServiceResult<RuleResponse>
    } catch (error) {
      this.logError('Failed to create rule', { error, data })
      return this.error('Failed to create rule', 'CREATION_ERROR')
    }
  }

  /**
   * Get rule by ID
   */
  async getRuleById(ruleId: string): Promise<ServiceResult<RuleResponse>> {
    return this.findById<RuleResponse>(this.db.rules, ruleId)
  }

  /**
   * List rules with pagination and filtering
   */
  async listRules(options: RuleQueryOptions = {}): Promise<PaginatedResponse<RuleResponse>> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        rule_type, 
        status, 
        is_template, 
        search,
        created_by 
      } = options

      // Build where clause for filtering
      const where: any = {}
      
      if (rule_type) where.rule_type = rule_type
      if (status) where.status = status  
      if (is_template !== undefined) where.is_template = is_template
      if (created_by) where.created_by = created_by

      // Add search functionality
      if (search) {
        where.OR = [
          { rule_name: { contains: search, mode: 'insensitive' } },
          { rule_type: { contains: search, mode: 'insensitive' } }
        ]
      }

      const result = await this.executePaginatedQuery<any>(this.db.rules, {
        page,
        limit,
        where,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      // Transform the data to match RuleResponse
      const transformedData = result.data?.map(rule => ({
        ...rule,
        rule_details: (rule.rule_details && typeof rule.rule_details === 'object' && rule.rule_details !== null)
          ? rule.rule_details as Record<string, any>
          : null
      }))

      return {
        ...result,
        data: transformedData
      }
    } catch (error) {
      this.logError('Failed to list rules', { error, options })
      throw error
    }
  }

  /**
   * Update rule
   */
  async updateRule(
    ruleId: string,
    data: UpdateRuleRequest
  ): Promise<ServiceResult<RuleResponse>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date()
      }

      return this.updateEntity<RuleResponse>(
        this.db.rules,
        ruleId,
        updateData
      )
    } catch (error) {
      this.logError('Failed to update rule', { error, ruleId, data })
      return this.error('Failed to update rule', 'UPDATE_ERROR')
    }
  }

  /**
   * Delete rule
   */
  async deleteRule(ruleId: string): Promise<ServiceResult<boolean>> {
    try {
      return this.deleteEntity(this.db.rules, ruleId)
    } catch (error) {
      this.logError('Failed to delete rule', { error, ruleId })
      return this.error('Failed to delete rule', 'DELETE_ERROR')
    }
  }

  /**
   * Get rules by type
   */
  async getRulesByType(ruleType: string): Promise<ServiceResult<RuleResponse[]>> {
    try {
      const rules = await this.db.rules.findMany({
        where: { 
          rule_type: ruleType,
          status: 'active'
        },
        orderBy: { created_at: 'desc' }
      })

      // Transform the data to match RuleResponse
      const transformedRules = rules.map(rule => ({
        ...rule,
        rule_details: (rule.rule_details && typeof rule.rule_details === 'object' && rule.rule_details !== null)
          ? rule.rule_details as Record<string, any>
          : null
      }))

      return this.success(transformedRules)
    } catch (error) {
      this.logError('Failed to get rules by type', { error, ruleType })
      return this.error('Failed to get rules by type', 'QUERY_ERROR')
    }
  }

  /**
   * Get rule templates
   */
  async getRuleTemplates(): Promise<ServiceResult<RuleResponse[]>> {
    try {
      const templates = await this.db.rules.findMany({
        where: { 
          is_template: true,
          status: 'active'
        },
        orderBy: { rule_name: 'asc' }
      })

      // Transform the data to match RuleResponse
      const transformedTemplates = templates.map(template => ({
        ...template,
        rule_details: (template.rule_details && typeof template.rule_details === 'object' && template.rule_details !== null)
          ? template.rule_details as Record<string, any>
          : null
      }))

      return this.success(transformedTemplates)
    } catch (error) {
      this.logError('Failed to get rule templates', { error })
      return this.error('Failed to get rule templates', 'QUERY_ERROR')
    }
  }
}

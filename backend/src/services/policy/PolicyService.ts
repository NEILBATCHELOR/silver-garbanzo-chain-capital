/**
 * Policy Service
 * Main service for managing policy templates using BaseService pattern
 */

import { BaseService } from '../BaseService'
import type { 
  PolicyTemplate,
  CreatePolicyTemplateRequest,
  UpdatePolicyTemplateRequest,
  PolicyTemplateResponse,
  PolicyTemplateQueryOptions,
  ApprovalConfig,
  CreateApprovalConfigRequest,
  UpdateApprovalConfigRequest,
  ApprovalConfigResponse
} from '@/types/policy-service'
import type { ServiceResult, PaginatedResponse } from '@/types/index'

export class PolicyService extends BaseService {
  constructor() {
    super('Policy')
  }

  /**
   * Create a new policy template
   */
  async createPolicyTemplate(
    data: CreatePolicyTemplateRequest,
    createdBy: string
  ): Promise<ServiceResult<PolicyTemplateResponse>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(data, ['template_name', 'template_data'])
      if (!validation.success) {
        return validation as ServiceResult<PolicyTemplateResponse>
      }

      // Create policy template data
      const templateData = {
        template_name: data.template_name,
        description: data.description || null,
        template_data: data.template_data,
        created_by: createdBy,
        template_type: data.template_type || null,
        status: data.status || 'draft',
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await this.createEntity<any>(
        this.db.policy_templates,
        templateData
      )

      if (result.success && result.data) {
        // Transform to match PolicyTemplateResponse
        const transformedData: PolicyTemplateResponse = {
          ...result.data,
          template_data: (result.data.template_data && typeof result.data.template_data === 'object' && result.data.template_data !== null)
            ? result.data.template_data as Record<string, any>
            : {}
        }
        
        return this.success(transformedData)
      }

      return result as ServiceResult<PolicyTemplateResponse>
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create policy template')
      return this.error('Failed to create policy template', 'CREATION_ERROR')
    }
  }

  /**
   * Get policy template by ID
   */
  async getPolicyTemplateById(templateId: string): Promise<ServiceResult<PolicyTemplateResponse>> {
    return this.findById<PolicyTemplateResponse>(this.db.policy_templates, templateId)
  }

  /**
   * List policy templates with pagination and filtering
   */
  async listPolicyTemplates(options: PolicyTemplateQueryOptions = {}): Promise<PaginatedResponse<PolicyTemplateResponse>> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        template_type, 
        status, 
        search,
        created_by 
      } = options

      // Build where clause for filtering
      const where: any = {}
      
      if (template_type) where.template_type = template_type
      if (status) where.status = status  
      if (created_by) where.created_by = created_by

      // Add search functionality
      if (search) {
        where.OR = [
          { template_name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { template_type: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get raw data from database
      const templates = await this.db.policy_templates.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })

      const totalCount = await this.db.policy_templates.count({ where })

      // Transform the data to match PolicyTemplateResponse
      const transformedData: PolicyTemplateResponse[] = templates.map(template => ({
        ...template,
        template_data: (template.template_data && typeof template.template_data === 'object' && template.template_data !== null) 
          ? template.template_data as Record<string, any>
          : {}
      }))

      const totalPages = Math.ceil(totalCount / limit)
      
      return {
        
        data: transformedData,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasMore: page < totalPages,
          nextPage: page < totalPages ? page + 1 : undefined,
          prevPage: page > 1 ? page - 1 : undefined
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to list policy templates')
      throw error
    }
  }

  /**
   * Update policy template
   */
  async updatePolicyTemplate(
    templateId: string,
    data: UpdatePolicyTemplateRequest
  ): Promise<ServiceResult<PolicyTemplateResponse>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date()
      }

      return this.updateEntity<PolicyTemplateResponse>(
        this.db.policy_templates,
        templateId,
        updateData
      )
    } catch (error) {
      this.logger.error({ error, templateId, data }, 'Failed to update policy template')
      return this.error('Failed to update policy template', 'UPDATE_ERROR')
    }
  }

  /**
   * Delete policy template
   */
  async deletePolicyTemplate(templateId: string): Promise<ServiceResult<boolean>> {
    try {
      return this.deleteEntity(this.db.policy_templates, templateId)
    } catch (error) {
      this.logger.error({ error, templateId }, 'Failed to delete policy template')
      return this.error('Failed to delete policy template', 'DELETE_ERROR')
    }
  }

  /**
   * Get policy templates by type
   */
  async getPolicyTemplatesByType(templateType: string): Promise<ServiceResult<PolicyTemplateResponse[]>> {
    try {
      const templates = await this.db.policy_templates.findMany({
        where: { 
          template_type: templateType,
          status: 'active'
        },
        orderBy: { created_at: 'desc' }
      })

      return this.success(templates.map(template => ({ ...template, template_data: (template.template_data && typeof template.template_data === 'object' && template.template_data !== null) ? template.template_data as Record<string, any> : {} })))
    } catch (error) {
      this.logger.error({ error, templateType }, 'Failed to get policy templates by type')
      return this.error('Failed to get policy templates by type', 'QUERY_ERROR')
    }
  }

  /**
   * Get published policy templates
   */
  async getPublishedPolicyTemplates(): Promise<ServiceResult<PolicyTemplateResponse[]>> {
    try {
      const templates = await this.db.policy_templates.findMany({
        where: { 
          status: 'published'
        },
        orderBy: { template_name: 'asc' }
      })

      // Transform the data to match PolicyTemplateResponse
      const transformedTemplates: PolicyTemplateResponse[] = templates.map(template => ({
        ...template,
        template_data: (template.template_data && typeof template.template_data === 'object' && template.template_data !== null) 
          ? template.template_data as Record<string, any>
          : {}
      }))

      return this.success(transformedTemplates)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get published policy templates')
      return this.error('Failed to get published policy templates', 'QUERY_ERROR')
    }
  }

  /**
   * Create approval configuration
   */
  async createApprovalConfig(
    data: CreateApprovalConfigRequest,
    createdBy: string
  ): Promise<ServiceResult<ApprovalConfigResponse>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(data, [
        'permission_id', 
        'required_approvals', 
        'eligible_roles', 
        'consensus_type'
      ])
      if (!validation.success) {
        return validation as ServiceResult<ApprovalConfigResponse>
      }

      const configData = {
        ...data,
        created_by: createdBy,
        active: data.active !== undefined ? data.active : true,
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await this.createEntity<any>(
        this.db.approval_configs,
        configData
      )

      if (result.success && result.data) {
        // Transform to match ApprovalConfigResponse
        const transformedData: ApprovalConfigResponse = {
          ...result.data,
          auto_approval_conditions: (result.data.auto_approval_conditions && typeof result.data.auto_approval_conditions === 'object' && result.data.auto_approval_conditions !== null)
            ? result.data.auto_approval_conditions as Record<string, any>
            : null,
          escalation_config: (result.data.escalation_config && typeof result.data.escalation_config === 'object' && result.data.escalation_config !== null)
            ? result.data.escalation_config as Record<string, any>
            : null,
          notification_config: (result.data.notification_config && typeof result.data.notification_config === 'object' && result.data.notification_config !== null)
            ? result.data.notification_config as Record<string, any>
            : null
        }
        
        return this.success(transformedData)
      }

      return result as ServiceResult<ApprovalConfigResponse>
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create approval config')
      return this.error('Failed to create approval config', 'CREATION_ERROR')
    }
  }

  /**
   * Get approval configuration by ID
   */
  async getApprovalConfigById(configId: string): Promise<ServiceResult<ApprovalConfigResponse>> {
    return this.findById<ApprovalConfigResponse>(this.db.approval_configs, configId)
  }

  /**
   * List approval configurations
   */
  async listApprovalConfigs(): Promise<ServiceResult<ApprovalConfigResponse[]>> {
    try {
      const configs = await this.db.approval_configs.findMany({
        where: { active: true },
        orderBy: { created_at: 'desc' }
      })

      // Transform the data to match ApprovalConfigResponse
      const transformedConfigs = configs.map(config => ({
        ...config,
        auto_approval_conditions: (config.auto_approval_conditions && typeof config.auto_approval_conditions === 'object' && config.auto_approval_conditions !== null)
          ? config.auto_approval_conditions as Record<string, any>
          : null,
        escalation_config: (config.escalation_config && typeof config.escalation_config === 'object' && config.escalation_config !== null)
          ? config.escalation_config as Record<string, any>
          : null,
        notification_config: (config.notification_config && typeof config.notification_config === 'object' && config.notification_config !== null)
          ? config.notification_config as Record<string, any>
          : null
      }))

      return this.success(transformedConfigs)
    } catch (error) {
      this.logger.error({ error }, 'Failed to list approval configs')
      return this.error('Failed to list approval configs', 'QUERY_ERROR')
    }
  }

  /**
   * Update approval configuration
   */
  async updateApprovalConfig(
    configId: string,
    data: UpdateApprovalConfigRequest,
    modifiedBy: string
  ): Promise<ServiceResult<ApprovalConfigResponse>> {
    try {
      const updateData = {
        ...data,
        last_modified_by: modifiedBy,
        updated_at: new Date()
      }

      return this.updateEntity<ApprovalConfigResponse>(
        this.db.approval_configs,
        configId,
        updateData
      )
    } catch (error) {
      this.logger.error({ error, configId, data }, 'Failed to update approval config')
      return this.error('Failed to update approval config', 'UPDATE_ERROR')
    }
  }

  /**
   * Delete approval configuration
   */
  async deleteApprovalConfig(configId: string): Promise<ServiceResult<boolean>> {
    try {
      return this.deleteEntity(this.db.approval_configs, configId)
    } catch (error) {
      this.logger.error({ error, configId }, 'Failed to delete approval config')
      return this.error('Failed to delete approval config', 'DELETE_ERROR')
    }
  }

  /**
   * Get approval configs by permission
   */
  async getApprovalConfigsByPermission(permissionId: string): Promise<ServiceResult<ApprovalConfigResponse[]>> {
    try {
      const configs = await this.db.approval_configs.findMany({
        where: { 
          permission_id: permissionId,
          active: true
        },
        orderBy: { created_at: 'desc' }
      })

      // Transform the data to match ApprovalConfigResponse
      const transformedConfigs = configs.map(config => ({
        ...config,
        auto_approval_conditions: (config.auto_approval_conditions && typeof config.auto_approval_conditions === 'object' && config.auto_approval_conditions !== null)
          ? config.auto_approval_conditions as Record<string, any>
          : null,
        escalation_config: (config.escalation_config && typeof config.escalation_config === 'object' && config.escalation_config !== null)
          ? config.escalation_config as Record<string, any>
          : null,
        notification_config: (config.notification_config && typeof config.notification_config === 'object' && config.notification_config !== null)
          ? config.notification_config as Record<string, any>
          : null
      }))

      return this.success(transformedConfigs)
    } catch (error) {
      this.logger.error({ error, permissionId }, 'Failed to get approval configs by permission')
      return this.error('Failed to get approval configs by permission', 'QUERY_ERROR')
    }
  }
}

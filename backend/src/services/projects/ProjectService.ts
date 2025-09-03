/**
 * Project Service
 * Main service for project CRUD operations, primary project management,
 * and statistics calculation
 */

import { BaseService } from '../BaseService'
import { ProjectValidationService } from './ProjectValidationService'
import type {
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectResponse,
  ProjectWithStats,
  ProjectStatistics,
  ProjectQueryOptions,
  ProjectValidationResult,
  ProjectCreationResult,
  BulkProjectUpdateRequest,
  ProjectComplianceSummary,
  ProjectStatus,
  InvestmentStatus
} from '@/types/project-service'
import type { ServiceResult, PaginatedResponse } from '../../types/index'

export class ProjectService extends BaseService {
  private validationService: ProjectValidationService

  constructor() {
    super('Project')
    this.validationService = new ProjectValidationService()
  }

  /**
   * Helper method to safely convert Decimal/number/null to number | undefined
   */
  private convertToNumber(value: any): number | undefined {
    if (value === null || value === undefined) {
      return undefined
    }
    
    // If it's already a number, return as is
    if (typeof value === 'number') {
      return value
    }
    
    // If it has a toNumber method (Prisma Decimal), use it
    if (value && typeof value.toNumber === 'function') {
      return value.toNumber()
    }
    
    // If it's a Decimal-like object with toString, convert via string
    if (value && typeof value.toString === 'function') {
      const numValue = Number(value.toString())
      return isNaN(numValue) ? undefined : numValue
    }
    
    // Try to convert to number directly
    const numValue = Number(value)
    return isNaN(numValue) ? undefined : numValue
  }

  /**
   * Get all projects with filtering, pagination, and optional statistics
   */
  async getProjects(options: ProjectQueryOptions = {}): Promise<PaginatedResponse<ProjectWithStats>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        projectType,
        investmentStatus,
        isPrimary,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeStatistics = true,
        includeTokens = false,
        includeCapTable = false
      } = options

      // Build where clause
      const where: any = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { legal_entity: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (status && status.length > 0) {
        where.status = { in: status }
      }

      if (projectType && projectType.length > 0) {
        where.project_type = { in: projectType }
      }

      if (investmentStatus && investmentStatus.length > 0) {
        where.investment_status = { in: investmentStatus }
      }

      if (isPrimary !== undefined) {
        where.is_primary = isPrimary
      }

      // Include related data
      const include: any = {}
      if (includeTokens) {
        include.tokens = {
          select: {
            id: true,
            name: true,
            symbol: true,
            status: true,
            created_at: true
          }
        }
      }
      if (includeCapTable) {
        include.cap_tables = {
          select: {
            id: true,
            name: true,
            created_at: true
          }
        }
      }

      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)

      const [projects, total] = await Promise.all([
        this.db.projects.findMany({
          where,
          include,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder }
        }),
        this.db.projects.count({ where })
      ])

      // Enhance with statistics if requested
      let enhancedProjects: ProjectWithStats[]
      if (includeStatistics) {
        enhancedProjects = await Promise.all(
          projects.map((project: any) => this.enhanceProjectWithStats(project))
        )
      } else {
        enhancedProjects = projects.map((project: any) => ({
          ...project,
          // Handle null to undefined conversion for optional fields
          description: project.description ?? undefined,
          legalEntity: project.legal_entity ?? undefined,
          jurisdiction: project.jurisdiction ?? undefined,
          currency: project.currency ?? undefined,
          tokenSymbol: project.token_symbol ?? undefined,
          taxId: project.tax_id ?? undefined,
          
          // Handle required fields that might be null
          projectType: project.project_type || '',
          name: project.name || '',
          
          // Handle enum fields with proper casting
          status: project.status ? (project.status as ProjectStatus) : undefined,
          investmentStatus: project.investment_status ? (project.investment_status as InvestmentStatus) : undefined,
          
          // Handle boolean fields
          isPrimary: project.is_primary ?? undefined,
          
          // Handle number fields with null to undefined conversion
          authorizedShares: project.authorized_shares ?? undefined,
          
          // Handle enum fields with null to undefined conversion
          duration: project.duration ?? undefined,
          
          // Convert Decimal to number using helper method
          targetRaise: this.convertToNumber(project.target_raise),
          sharePrice: this.convertToNumber(project.share_price),
          companyValuation: this.convertToNumber(project.company_valuation),
          estimatedYieldPercentage: this.convertToNumber(project.estimated_yield_percentage),
          minimumInvestment: this.convertToNumber(project.minimum_investment),
          totalNotional: this.convertToNumber(project.total_notional),
          
          // Convert dates to strings with proper null handling - required fields
          createdAt: project.created_at?.toISOString ? project.created_at.toISOString() : (project.created_at?.toString() || new Date().toISOString()),
          updatedAt: project.updated_at?.toISOString ? project.updated_at.toISOString() : (project.updated_at?.toString() || new Date().toISOString()),
          
          // Handle date null to undefined conversion
          subscriptionStartDate: project.subscription_start_date?.toISOString ? project.subscription_start_date.toISOString() : undefined,
          subscriptionEndDate: project.subscription_end_date?.toISOString ? project.subscription_end_date.toISOString() : undefined,
          transactionStartDate: project.transaction_start_date?.toISOString ? project.transaction_start_date.toISOString() : undefined,
          maturityDate: project.maturity_date?.toISOString ? project.maturity_date.toISOString() : undefined
        }))
      }

      return this.paginatedResponse(enhancedProjects, total, page, limit)
    } catch (error) {
      this.logError('Failed to get projects', { error, options })
      throw new Error('Failed to retrieve projects')
    }
  }

  /**
   * Get project by ID with optional statistics and related data
   */
  async getProjectById(
    id: string,
    includeStats = true,
    includeRelated = false
  ): Promise<ServiceResult<ProjectWithStats>> {
    try {
      const include: any = {}
      if (includeRelated) {
        include.tokens = true
        include.subscriptions = {
          include: {
            investor: {
              select: {
                id: true,
                name: true,
                email: true,
                kycStatus: true
              }
            }
          }
        }
        include.capTables = true
        include.distributions = true
      }

      const project = await this.db.projects.findUnique({
        where: { id },
        include
      })

      if (!project) {
        return this.error('Project not found', 'NOT_FOUND', 404)
      }

      let enhancedProject: ProjectWithStats
      if (includeStats) {
        enhancedProject = await this.enhanceProjectWithStats(project)
      } else {
        enhancedProject = {
          ...project,
          // Handle null to undefined conversion for optional fields
          description: project.description ?? undefined,
          legalEntity: project.legal_entity ?? undefined,
          jurisdiction: project.jurisdiction ?? undefined,
          currency: project.currency ?? undefined,
          tokenSymbol: project.token_symbol ?? undefined,
          taxId: project.tax_id ?? undefined,
          
          // Handle required fields that might be null
          projectType: project.project_type || '',
          name: project.name || '',
          
          // Handle enum fields with proper casting
          status: project.status ? (project.status as ProjectStatus) : undefined,
          investmentStatus: project.investment_status ? (project.investment_status as InvestmentStatus) : undefined,
          
          // Handle boolean fields
          isPrimary: project.is_primary ?? undefined,
          
          // Handle number fields with null to undefined conversion
          authorizedShares: project.authorized_shares ?? undefined,
          
          // Handle enum fields with null to undefined conversion
          duration: project.duration ?? undefined,
          
          // Convert Decimal to number using helper method
          targetRaise: this.convertToNumber(project.target_raise),
          sharePrice: this.convertToNumber(project.share_price),
          companyValuation: this.convertToNumber(project.company_valuation),
          estimatedYieldPercentage: this.convertToNumber(project.estimated_yield_percentage),
          minimumInvestment: this.convertToNumber(project.minimum_investment),
          totalNotional: this.convertToNumber(project.total_notional),
          
          // Convert dates to strings with proper null handling - required fields
          createdAt: project.created_at?.toISOString ? project.created_at.toISOString() : (project.created_at?.toString() || new Date().toISOString()),
          updatedAt: project.updated_at?.toISOString ? project.updated_at.toISOString() : (project.updated_at?.toString() || new Date().toISOString()),
          
          // Handle date null to undefined conversion
          subscriptionStartDate: project.subscription_start_date?.toISOString ? project.subscription_start_date.toISOString() : undefined,
          subscriptionEndDate: project.subscription_end_date?.toISOString ? project.subscription_end_date.toISOString() : undefined,
          transactionStartDate: project.transaction_start_date?.toISOString ? project.transaction_start_date.toISOString() : undefined,
          maturityDate: project.maturity_date?.toISOString ? project.maturity_date.toISOString() : undefined
        }
      }

      return this.success(enhancedProject)
    } catch (error) {
      this.logError('Failed to get project by ID', { error, projectId: id })
      return this.error('Failed to retrieve project', 'DATABASE_ERROR')
    }
  }

  /**
   * Create new project with validation and optional cap table creation
   */
  async createProject(
    data: ProjectCreateRequest,
    createCapTable = true
  ): Promise<ServiceResult<ProjectCreationResult>> {
    try {
      // Validate project data
      const validation = await this.validationService.validateProject(data)
      if (!validation.isValid) {
        return this.error(
          `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR',
          400
        )
      }

      // Convert numeric fields from numbers to Decimal for Prisma
      const projectData = {
        ...data,
        project_type: data.projectType,
        target_raise: data.targetRaise,
        share_price: data.sharePrice,
        company_valuation: data.companyValuation,
        estimated_yield_percentage: data.estimatedYieldPercentage,
        minimum_investment: data.minimumInvestment,
        total_notional: data.totalNotional,
        subscription_start_date: data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : null,
        subscription_end_date: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : null,
        transaction_start_date: data.transactionStartDate ? new Date(data.transactionStartDate) : null,
        maturity_date: data.maturityDate ? new Date(data.maturityDate) : null
      }

      const result = await this.withTransaction(async (tx) => {
        // Create project
        const project = await tx.projects.create({
          data: projectData
        })

        let capTable = null
        if (createCapTable) {
          capTable = await tx.cap_tables.create({
            data: {
              project_id: project.id,
              name: `${project.name} Cap Table`,
              description: `Capital table for ${project.name}`
            }
          })
        }

        return { project, capTable, validation }
      })

      if (!result.success) {
        return result
      }

      const { project, capTable } = result.data!

      // Enhance project with stats
      const enhancedProject = await this.enhanceProjectWithStats(project)

      const creationResult: ProjectCreationResult = {
        project: enhancedProject,
        capTable: capTable ? {
          id: capTable.id,
          name: capTable.name
        } : undefined,
        validation
      }

      this.logInfo('Project created successfully', { projectId: project.id, capTableId: capTable?.id })
      return this.success(creationResult)
    } catch (error) {
      this.logError('Failed to create project', { error, data })
      return this.error('Failed to create project', 'DATABASE_ERROR')
    }
  }

  /**
   * Update existing project
   */
  async updateProject(
    id: string,
    data: ProjectUpdateRequest
  ): Promise<ServiceResult<ProjectWithStats>> {
    try {
      // Validate update data
      const validation = await this.validationService.validateProject({ ...data, name: data.name || '', projectType: data.projectType || '' })
      
      // Convert date strings to Date objects and handle duration
      const updateData: any = {
        ...data,
        subscription_start_date: data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : undefined,
        subscription_end_date: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : undefined,
        transaction_start_date: data.transactionStartDate ? new Date(data.transactionStartDate) : undefined,
        maturity_date: data.maturityDate ? new Date(data.maturityDate) : undefined,
        updated_at: new Date()
      }

      // Handle duration enum conversion if needed
      if (data.duration) {
        updateData.duration = data.duration
      }

      const project = await this.db.projects.update({
        where: { id },
        data: updateData
      })

      const enhancedProject = await this.enhanceProjectWithStats(project)

      this.logInfo('Project updated successfully', { projectId: id })
      return this.success(enhancedProject)
    } catch (error) {
      this.logError('Failed to update project', { error, projectId: id, data })
      
      if ((error as any).code === 'P2025') {
        return this.error('Project not found', 'NOT_FOUND', 404)
      }
      
      return this.error('Failed to update project', 'DATABASE_ERROR')
    }
  }

  /**
   * Delete project and related data
   */
  async deleteProject(id: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.withTransaction(async (tx) => {
        // Check if project exists
        const project = await tx.projects.findUnique({ where: { id } })
        if (!project) {
          throw new Error('Project not found')
        }

        // Delete related data in correct order
        await tx.distributions.deleteMany({ where: { project_id: id } })
        await tx.token_allocations.deleteMany({ where: { project_id: id } })
        await tx.subscriptions.deleteMany({ where: { project_id: id } })
        await tx.cap_tables.deleteMany({ where: { project_id: id } })
        await tx.issuer_detail_documents.deleteMany({ where: { project_id: id } })
        
        // Delete tokens (this will cascade to token-related tables)
        await tx.tokens.deleteMany({ where: { project_id: id } })
        
        // Finally delete the project
        await tx.projects.delete({ where: { id } })

        return true
      })

      if (!result.success) {
        return result
      }

      this.logInfo('Project deleted successfully', { projectId: id })
      return this.success(true)
    } catch (error) {
      this.logError('Failed to delete project', { error, projectId: id })
      
      if (error instanceof Error && error.message === 'Project not found') {
        return this.error('Project not found', 'NOT_FOUND', 404)
      }
      
      return this.error('Failed to delete project', 'DATABASE_ERROR')
    }
  }

  /**
   * Get the primary project
   */
  async getPrimaryProject(): Promise<ServiceResult<ProjectWithStats | null>> {
    try {
      const project = await this.db.projects.findFirst({
        where: { is_primary: true }
      })

      if (!project) {
        return this.success(null)
      }

      const enhancedProject = await this.enhanceProjectWithStats(project)
      return this.success(enhancedProject)
    } catch (error) {
      this.logError('Failed to get primary project', { error })
      return this.error('Failed to get primary project', 'DATABASE_ERROR')
    }
  }

  /**
   * Set project as primary (unsets current primary)
   */
  async setPrimaryProject(id: string): Promise<ServiceResult<ProjectWithStats>> {
    try {
      const result = await this.withTransaction(async (tx) => {
        // Check if project exists
        const project = await tx.projects.findUnique({ where: { id } })
        if (!project) {
          throw new Error('Project not found')
        }

        // Unset current primary project
        await tx.projects.updateMany({
          where: { is_primary: true },
          data: { is_primary: false, updated_at: new Date() }
        })

        // Set new primary project
        const updatedProject = await tx.projects.update({
          where: { id },
          data: { is_primary: true, updated_at: new Date() }
        })

        return updatedProject
      })

      if (!result.success) {
        return result
      }

      const enhancedProject = await this.enhanceProjectWithStats(result.data!)

      this.logInfo('Primary project set successfully', { projectId: id })
      return this.success(enhancedProject)
    } catch (error) {
      this.logError('Failed to set primary project', { error, projectId: id })
      
      if (error instanceof Error && error.message === 'Project not found') {
        return this.error('Project not found', 'NOT_FOUND', 404)
      }
      
      return this.error('Failed to set primary project', 'DATABASE_ERROR')
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(id: string): Promise<ServiceResult<ProjectStatistics>> {
    try {
      const statistics = await this.calculateProjectStatistics(id)
      return this.success(statistics)
    } catch (error) {
      this.logError('Failed to get project statistics', { error, projectId: id })
      return this.error('Failed to get project statistics', 'DATABASE_ERROR')
    }
  }

  /**
   * Bulk update multiple projects
   */
  async bulkUpdateProjects(request: BulkProjectUpdateRequest): Promise<ServiceResult<any>> {
    try {
      const { projectIds, updates, options = {} } = request
      const { validateBeforeUpdate = true, createAuditLog = true } = options

      if (validateBeforeUpdate) {
        const validation = await this.validationService.validateProject({ ...updates, name: '', projectType: '' })
        if (!validation.isValid) {
          return this.error(
            `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
            'VALIDATION_ERROR',
            400
          )
        }
      }

      const result = await this.withTransaction(async (tx) => {
        const successful: ProjectWithStats[] = []
        const failed: Array<{ item: string, error: string, index: number }> = []

        for (let i = 0; i < projectIds.length; i++) {
          const projectId = projectIds[i]
          try {
            // Ensure projectId is defined
            if (!projectId) {
              failed.push({
                item: `Project at index ${i}`,
                error: 'Project ID is missing',
                index: i
              })
              continue
            }

            const project = await tx.projects.update({
              where: { id: projectId },
              data: {
                ...updates,
                updated_at: new Date()
              }
            })
            
            const enhanced = await this.enhanceProjectWithStats(project)
            successful.push(enhanced)
          } catch (error) {
            failed.push({
              item: projectId || `Project at index ${i}`,
              error: error instanceof Error ? error.message : 'Unknown error',
              index: i
            })
          }
        }

        return {
          successful,
          failed,
          summary: {
            total: projectIds.length,
            success: successful.length,
            failed: failed.length
          }
        }
      })

      if (!result.success) {
        return result
      }

      const data = result.data!

      this.logInfo('Bulk update completed', { 
        projectIds, 
        successCount: data.successful.length,
        failCount: data.failed.length 
      })

      return this.success(data)
    } catch (error) {
      this.logError('Failed to bulk update projects', { error, request })
      return this.error('Failed to bulk update projects', 'DATABASE_ERROR')
    }
  }

  /**
   * Get compliance summary for all projects
   */
  async getComplianceSummary(): Promise<ServiceResult<ProjectComplianceSummary>> {
    try {
      const projects = await this.db.projects.findMany({
        select: {
          id: true,
          project_type: true,
          status: true,
          tokens: {
            select: {
              id: true
            }
          }
        }
      })

      const summary: ProjectComplianceSummary = {
        totalProjects: projects.length,
        byCategory: {
          traditional: 0,
          alternative: 0,
          digital: 0
        },
        completionStatus: {
          complete: 0,
          incomplete: 0
        },
        esgRatings: {
          low: 0,
          medium: 0,
          high: 0,
          notAssessed: 0
        },
        sfdrClassification: {
          article6: 0,
          article8: 0,
          article9: 0,
          notApplicable: 0
        },
        digitalAssets: {
          total: 0,
          withWallet: 0,
          withoutWallet: 0
        }
      }

      // Calculate summary statistics
      for (const project of projects) {
        // Category classification (simplified)
        const category = this.categorizeProject(project.project_type ?? undefined)
        summary.byCategory[category]++

        // ESG ratings - placeholder since fields don't exist yet
        summary.esgRatings.notAssessed++

        // Digital assets
        if (category === 'digital') {
          summary.digitalAssets.total++
          if (project.tokens && project.tokens.length > 0) {
            summary.digitalAssets.withWallet++
          } else {
            summary.digitalAssets.withoutWallet++
          }
        }
      }

      return this.success(summary)
    } catch (error) {
      this.logError('Failed to get compliance summary', { error })
      return this.error('Failed to get compliance summary', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async enhanceProjectWithStats(project: any): Promise<ProjectWithStats> {
    const statistics = await this.calculateProjectStatistics(project.id)
    const validation = await this.validationService.validateProject(project)

    return {
      ...project,
      // Handle null to undefined conversion for optional fields
      description: project.description ?? undefined,
      legalEntity: project.legal_entity ?? undefined,
      jurisdiction: project.jurisdiction ?? undefined,
      currency: project.currency ?? undefined,
      tokenSymbol: project.token_symbol ?? undefined,
      taxId: project.tax_id ?? undefined,
      
      // Handle required fields that might be null
      projectType: project.project_type || '',
      name: project.name || '',
      
      // Handle enum fields with proper casting
      status: project.status ? (project.status as ProjectStatus) : undefined,
      investmentStatus: project.investment_status ? (project.investment_status as InvestmentStatus) : undefined,
      
      // Handle boolean fields
      isPrimary: project.is_primary ?? undefined,
      
      // Handle number fields with null to undefined conversion
      authorizedShares: project.authorized_shares ?? undefined,
      
      // Handle enum fields with null to undefined conversion
      duration: project.duration ?? undefined,
      
      // Convert Decimal to number using helper method
      targetRaise: this.convertToNumber(project.target_raise),
      sharePrice: this.convertToNumber(project.share_price),
      companyValuation: this.convertToNumber(project.company_valuation),
      estimatedYieldPercentage: this.convertToNumber(project.estimated_yield_percentage),
      minimumInvestment: this.convertToNumber(project.minimum_investment),
      totalNotional: this.convertToNumber(project.total_notional),
      
      // Convert dates to strings with proper null handling - required fields
      createdAt: project.created_at?.toISOString ? project.created_at.toISOString() : (project.created_at?.toString() || new Date().toISOString()),
      updatedAt: project.updated_at?.toISOString ? project.updated_at.toISOString() : (project.updated_at?.toString() || new Date().toISOString()),
      subscriptionStartDate: project.subscription_start_date?.toISOString ? project.subscription_start_date.toISOString() : undefined,
      subscriptionEndDate: project.subscription_end_date?.toISOString ? project.subscription_end_date.toISOString() : undefined,
      transactionStartDate: project.transaction_start_date?.toISOString ? project.transaction_start_date.toISOString() : undefined,
      maturityDate: project.maturity_date?.toISOString ? project.maturity_date.toISOString() : undefined,
      
      // Add computed fields
      completionPercentage: validation.isValid ? 100 : Math.max(0, 100 - (validation.errors.length * 10)),
      missingFields: validation.errors.map(e => e.field),
      walletRequired: this.isWalletRequired(project.project_type ?? undefined),
      hasWallet: statistics.tokenCount > 0,
      
      // Add statistics
      ...statistics
    }
  }

  private async calculateProjectStatistics(projectId: string): Promise<ProjectStatistics> {
    const [
      subscriptions,
      tokenAllocations,
      tokens,
      capTableData
    ] = await Promise.all([
      this.db.subscriptions.findMany({
        where: { project_id: projectId },
        include: { investors: true }
      }),
      this.db.token_allocations.findMany({
        where: { project_id: projectId }
      }),
      this.db.tokens.findMany({
        where: { project_id: projectId },
        include: { token_deployments: true }
      }),
      this.db.cap_tables.findMany({
        where: { project_id: projectId }
      })
    ])

    const uniqueInvestors = new Set(subscriptions.map((s: any) => s.investor_id))
    const raisedAmount = subscriptions.reduce((sum: number, s: any) => {
      const amount = this.convertToNumber(s.subscription_amount) ?? 0
      return sum + amount
    }, 0)
    const totalAllocation = tokenAllocations.reduce((sum: number, a: any) => {
      const amount = this.convertToNumber(a.token_amount) ?? 0
      return sum + amount
    }, 0)
    const deployedTokens = tokens.filter((t: any) => 
      t.token_deployments && t.token_deployments.some((d: any) => d.status === 'success')
    ).length

    return {
      investorCount: uniqueInvestors.size,
      totalAllocation,
      raisedAmount,
      subscriptionCount: subscriptions.length,
      tokenCount: tokens.length,
      deployedTokens,
      complianceScore: this.calculateComplianceScore(subscriptions),
      kycCompletionRate: this.calculateKYCCompletionRate(subscriptions),
      capTableInvestorCount: capTableData.length
    }
  }

  private calculateComplianceScore(subscriptions: any[]): number {
    if (subscriptions.length === 0) return 100

    const compliantInvestors = subscriptions.filter(s => 
      s.investors?.kyc_status === 'approved'
    ).length

    return Math.round((compliantInvestors / subscriptions.length) * 100)
  }

  private calculateKYCCompletionRate(subscriptions: any[]): number {
    if (subscriptions.length === 0) return 0

    const kycCompleted = subscriptions.filter(s => 
      s.investors?.kyc_status === 'approved' || s.investors?.kyc_status === 'pending'
    ).length

    return Math.round((kycCompleted / subscriptions.length) * 100)
  }

  private isWalletRequired(projectType?: string): boolean {
    if (!projectType) return false
    
    const digitalAssetTypes = [
      'stablecoins',
      'tokenized_funds',
      'cryptocurrency',
      'defi',
      'nft'
    ]
    
    return digitalAssetTypes.some(type => 
      projectType.toLowerCase().includes(type)
    )
  }

  private categorizeProject(projectType?: string): 'traditional' | 'alternative' | 'digital' {
    if (!projectType) return 'traditional'

    const type = projectType.toLowerCase()
    
    if (type.includes('stablecoin') || type.includes('tokenized') || type.includes('crypto') || type.includes('digital')) {
      return 'digital'
    }
    
    if (type.includes('private_equity') || type.includes('real_estate') || type.includes('receivables') || type.includes('energy')) {
      return 'alternative'
    }
    
    return 'traditional'
  }
}

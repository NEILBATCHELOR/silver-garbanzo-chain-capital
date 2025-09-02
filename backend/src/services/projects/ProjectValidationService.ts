/**
 * Project Validation Service
 * Handles data validation and business rules for different project types
 * Supports Traditional, Alternative, and Digital asset projects
 */

import type {
  ProjectCreateRequest,
  ProjectValidationResult,
  ProjectCategory,
  ProjectStatus,
  InvestmentStatus
} from '@/types/project-service'

interface ValidationRule {
  field: string
  rule: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'date' | 'array' | 'custom'
  value?: any
  message: string
  customValidator?: (value: any, data: any) => boolean
}

interface ProjectTypeConfig {
  category: ProjectCategory
  mandatoryFields: string[]
  validationRules: ValidationRule[]
  description: string
}

export class ProjectValidationService {
  private static readonly PROJECT_TYPE_CONFIGS: Record<string, ProjectTypeConfig> = {
    // Traditional Assets - Structured Products
    structured_products: {
      category: 'traditional',
      mandatoryFields: [
        'name', 'projectType', 'targetRaise', 'minimumInvestment',
        'capitalProtectionLevel', 'underlyingAssets', 'payoffStructure',
        'legalEntity', 'jurisdiction'
      ],
      validationRules: [
        {
          field: 'capitalProtectionLevel',
          rule: 'min',
          value: 0,
          message: 'Capital protection level must be non-negative'
        },
        {
          field: 'capitalProtectionLevel',
          rule: 'max',
          value: 100,
          message: 'Capital protection level cannot exceed 100%'
        },
        {
          field: 'underlyingAssets',
          rule: 'array',
          message: 'Underlying assets must be specified as an array'
        }
      ],
      description: 'Capital protection, underlying assets, payoff structures'
    },

    // Traditional Assets - Equity
    equity: {
      category: 'traditional',
      mandatoryFields: [
        'name', 'projectType', 'targetRaise', 'authorizedShares', 'sharePrice',
        'legalEntity', 'jurisdiction', 'votingRights', 'dividendPolicy'
      ],
      validationRules: [
        {
          field: 'authorizedShares',
          rule: 'min',
          value: 1,
          message: 'Authorized shares must be at least 1'
        },
        {
          field: 'sharePrice',
          rule: 'min',
          value: 0.01,
          message: 'Share price must be at least 0.01'
        },
        {
          field: 'votingRights',
          rule: 'pattern',
          value: /^(common|preferred|no_voting)$/,
          message: 'Voting rights must be common, preferred, or no_voting'
        }
      ],
      description: 'Voting rights, dividend policy, dilution protection'
    },

    // Traditional Assets - Bonds
    bonds: {
      category: 'traditional',
      mandatoryFields: [
        'name', 'projectType', 'targetRaise', 'minimumInvestment', 'maturityDate',
        'creditRating', 'couponFrequency', 'legalEntity', 'jurisdiction'
      ],
      validationRules: [
        {
          field: 'creditRating',
          rule: 'pattern',
          value: /^(AAA|AA|A|BBB|BB|B|CCC|CC|C|D)[+-]?$/,
          message: 'Invalid credit rating format'
        },
        {
          field: 'couponFrequency',
          rule: 'pattern',
          value: /^(monthly|quarterly|semi_annual|annual)$/,
          message: 'Coupon frequency must be monthly, quarterly, semi_annual, or annual'
        },
        {
          field: 'maturityDate',
          rule: 'date',
          message: 'Maturity date must be a valid future date'
        }
      ],
      description: 'Credit ratings, coupon frequency, callable features'
    },

    // Alternative Assets - Private Equity
    private_equity: {
      category: 'alternative',
      mandatoryFields: [
        'name', 'projectType', 'targetRaise', 'minimumInvestment',
        'fundVintageYear', 'investmentStage', 'sectorFocus', 'legalEntity', 'jurisdiction'
      ],
      validationRules: [
        {
          field: 'fundVintageYear',
          rule: 'min',
          value: 2020,
          message: 'Fund vintage year must be 2020 or later'
        },
        {
          field: 'fundVintageYear',
          rule: 'max',
          value: new Date().getFullYear() + 2,
          message: 'Fund vintage year cannot be more than 2 years in the future'
        },
        {
          field: 'investmentStage',
          rule: 'pattern',
          value: /^(seed|early|growth|late|buyout)$/,
          message: 'Investment stage must be seed, early, growth, late, or buyout'
        },
        {
          field: 'sectorFocus',
          rule: 'array',
          message: 'Sector focus must be specified as an array'
        }
      ],
      description: 'Vintage year, investment stage, sector focus'
    },

    // Alternative Assets - Real Estate
    real_estate: {
      category: 'alternative',
      mandatoryFields: [
        'name', 'projectType', 'targetRaise', 'minimumInvestment',
        'propertyType', 'geographicLocation', 'developmentStage', 'legalEntity', 'jurisdiction'
      ],
      validationRules: [
        {
          field: 'propertyType',
          rule: 'pattern',
          value: /^(residential|commercial|industrial|mixed_use|land)$/,
          message: 'Property type must be residential, commercial, industrial, mixed_use, or land'
        },
        {
          field: 'developmentStage',
          rule: 'pattern',
          value: /^(planning|construction|completed|renovation)$/,
          message: 'Development stage must be planning, construction, completed, or renovation'
        }
      ],
      description: 'Property type, geographic location, development stage'
    },

    // Alternative Assets - Receivables
    receivables: {
      category: 'alternative',
      mandatoryFields: [
        'name', 'projectType', 'targetRaise', 'minimumInvestment',
        'debtorCreditQuality', 'collectionPeriodDays', 'recoveryRatePercentage',
        'legalEntity', 'jurisdiction'
      ],
      validationRules: [
        {
          field: 'collectionPeriodDays',
          rule: 'min',
          value: 1,
          message: 'Collection period must be at least 1 day'
        },
        {
          field: 'collectionPeriodDays',
          rule: 'max',
          value: 365,
          message: 'Collection period cannot exceed 365 days'
        },
        {
          field: 'recoveryRatePercentage',
          rule: 'min',
          value: 0,
          message: 'Recovery rate must be non-negative'
        },
        {
          field: 'recoveryRatePercentage',
          rule: 'max',
          value: 100,
          message: 'Recovery rate cannot exceed 100%'
        }
      ],
      description: 'Credit quality, collection periods, recovery rates'
    },

    // Alternative Assets - Energy
    energy: {
      category: 'alternative',
      mandatoryFields: [
        'name', 'projectType', 'targetRaise', 'minimumInvestment',
        'projectCapacityMw', 'powerPurchaseAgreements', 'regulatoryApprovals',
        'legalEntity', 'jurisdiction'
      ],
      validationRules: [
        {
          field: 'projectCapacityMw',
          rule: 'min',
          value: 0.1,
          message: 'Project capacity must be at least 0.1 MW'
        },
        {
          field: 'carbonOffsetPotential',
          rule: 'min',
          value: 0,
          message: 'Carbon offset potential must be non-negative'
        }
      ],
      description: 'Project capacity, power purchase agreements, regulatory approvals'
    },

    // Digital Assets - Stablecoins
    stablecoins: {
      category: 'digital',
      mandatoryFields: [
        'name', 'projectType', 'tokenSymbol', 'targetRaise',
        'collateralType', 'reserveManagementPolicy', 'auditFrequency',
        'redemptionMechanism', 'blockchainNetwork', 'smartContractAuditStatus'
      ],
      validationRules: [
        {
          field: 'tokenSymbol',
          rule: 'pattern',
          value: /^[A-Z]{2,10}$/,
          message: 'Token symbol must be 2-10 uppercase letters'
        },
        {
          field: 'collateralType',
          rule: 'pattern',
          value: /^(fiat|crypto|commodity|algorithmic)$/,
          message: 'Collateral type must be fiat, crypto, commodity, or algorithmic'
        },
        {
          field: 'auditFrequency',
          rule: 'pattern',
          value: /^(monthly|quarterly|semi_annual|annual)$/,
          message: 'Audit frequency must be monthly, quarterly, semi_annual, or annual'
        },
        {
          field: 'blockchainNetwork',
          rule: 'required',
          message: 'Blockchain network is required for digital assets'
        }
      ],
      description: 'Collateral type, reserve management, audit frequency'
    },

    // Digital Assets - Tokenized Funds
    tokenized_funds: {
      category: 'digital',
      mandatoryFields: [
        'name', 'projectType', 'tokenSymbol', 'targetRaise',
        'tokenEconomics', 'custodyArrangements', 'smartContractAddress',
        'blockchainNetwork', 'smartContractAuditStatus'
      ],
      validationRules: [
        {
          field: 'tokenSymbol',
          rule: 'pattern',
          value: /^[A-Z]{2,10}$/,
          message: 'Token symbol must be 2-10 uppercase letters'
        },
        {
          field: 'smartContractAddress',
          rule: 'pattern',
          value: /^0x[a-fA-F0-9]{40}$/,
          message: 'Smart contract address must be a valid Ethereum address'
        },
        {
          field: 'blockchainNetwork',
          rule: 'required',
          message: 'Blockchain network is required for digital assets'
        }
      ],
      description: 'Token economics, custody arrangements, smart contracts'
    }
  }

  private static readonly VALID_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
    'draft': ['under_review', 'cancelled'],
    'under_review': ['approved', 'draft', 'cancelled'],
    'approved': ['active', 'cancelled'],
    'active': ['paused', 'completed', 'cancelled'],
    'paused': ['active', 'cancelled'],
    'completed': [], // Terminal state
    'cancelled': []  // Terminal state
  }

  /**
   * Validate project data based on project type and business rules
   */
  async validateProject(data: Partial<ProjectCreateRequest>): Promise<ProjectValidationResult> {
    const errors: Array<{ field: string, message: string, code: string }> = []
    const warnings: Array<{ field: string, message: string, code: string }> = []

    // Basic validation - always required fields
    if (!data.name || data.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Project name is required',
        code: 'REQUIRED_FIELD'
      })
    }

    if (!data.projectType) {
      errors.push({
        field: 'projectType',
        message: 'Project type is required',
        code: 'REQUIRED_FIELD'
      })
      return { isValid: false, errors, warnings }
    }

    // Get project type configuration
    const config = ProjectValidationService.getProjectTypeConfig(data.projectType)
    if (!config) {
      errors.push({
        field: 'projectType',
        message: `Unknown project type: ${data.projectType}`,
        code: 'INVALID_PROJECT_TYPE'
      })
      return { isValid: false, errors, warnings }
    }

    // Validate mandatory fields for project type
    for (const field of config.mandatoryFields) {
      const value = (data as any)[field]
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `${field} is required for ${data.projectType} projects`,
          code: 'REQUIRED_FIELD'
        })
      }
    }

    // Apply validation rules
    for (const rule of config.validationRules) {
      const value = (data as any)[rule.field]
      
      if (value !== undefined && value !== null) {
        const isValid = this.validateRule(value, rule, data)
        if (!isValid) {
          errors.push({
            field: rule.field,
            message: rule.message,
            code: 'VALIDATION_RULE'
          })
        }
      }
    }

    // Status transition validation
    if (data.status) {
      const validationResult = this.validateStatusTransition(data.status as ProjectStatus)
      if (!validationResult.isValid && validationResult.error) {
        warnings.push({
          field: 'status',
          message: validationResult.error,
          code: 'STATUS_TRANSITION'
        })
      }
    }

    // Financial validation
    if (data.targetRaise && data.minimumInvestment) {
      if (data.minimumInvestment > data.targetRaise) {
        errors.push({
          field: 'minimumInvestment',
          message: 'Minimum investment cannot exceed target raise',
          code: 'FINANCIAL_VALIDATION'
        })
      }
    }

    // Date validation
    const dateValidation = this.validateDates(data)
    errors.push(...dateValidation.errors)
    warnings.push(...dateValidation.warnings)

    // ESG and compliance validation
    const esgValidation = this.validateESGCompliance(data)
    warnings.push(...esgValidation.warnings)

    // Digital asset specific validation
    if (config.category === 'digital') {
      const digitalValidation = this.validateDigitalAssets(data)
      errors.push(...digitalValidation.errors)
      warnings.push(...digitalValidation.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get project type configuration
   */
  static getProjectTypeConfig(projectType: string): ProjectTypeConfig | null {
    return this.PROJECT_TYPE_CONFIGS[projectType] || null
  }

  /**
   * Get all project types by category
   */
  static getProjectTypesByCategory(category: ProjectCategory): string[] {
    return Object.entries(this.PROJECT_TYPE_CONFIGS)
      .filter(([_, config]) => config.category === category)
      .map(([type, _]) => type)
  }

  /**
   * Get all available project types
   */
  static getAllProjectTypes(): Array<{ type: string; config: ProjectTypeConfig }> {
    return Object.entries(this.PROJECT_TYPE_CONFIGS)
      .map(([type, config]) => ({ type, config }))
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    newStatus: ProjectStatus,
    currentStatus?: ProjectStatus
  ): { isValid: boolean; error?: string } {
    if (!currentStatus) {
      // New project, allow any initial status except terminal states
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        return {
          isValid: false,
          error: `Cannot create project with terminal status: ${newStatus}`
        }
      }
      return { isValid: true }
    }

    const validTransitions = ProjectValidationService.VALID_STATUS_TRANSITIONS[currentStatus]
    if (!validTransitions || !validTransitions.includes(newStatus)) {
      return {
        isValid: false,
        error: `Invalid status transition from ${currentStatus} to ${newStatus}`
      }
    }

    return { isValid: true }
  }

  /**
   * Validate individual rule
   */
  private validateRule(value: any, rule: ValidationRule, fullData: any): boolean {
    switch (rule.rule) {
      case 'required':
        return value !== undefined && value !== null && value !== ''

      case 'min':
        return typeof value === 'number' && value >= rule.value

      case 'max':
        return typeof value === 'number' && value <= rule.value

      case 'pattern':
        return typeof value === 'string' && rule.value.test(value)

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return typeof value === 'string' && emailRegex.test(value)

      case 'url':
        try {
          new URL(value)
          return true
        } catch {
          return false
        }

      case 'date':
        const date = new Date(value)
        return !isNaN(date.getTime()) && date > new Date()

      case 'array':
        return Array.isArray(value) && value.length > 0

      case 'custom':
        return rule.customValidator ? rule.customValidator(value, fullData) : true

      default:
        return true
    }
  }

  /**
   * Validate date fields
   */
  private validateDates(data: Partial<ProjectCreateRequest>): {
    errors: Array<{ field: string, message: string, code: string }>
    warnings: Array<{ field: string, message: string, code: string }>
  } {
    const errors: Array<{ field: string, message: string, code: string }> = []
    const warnings: Array<{ field: string, message: string, code: string }> = []

    const now = new Date()

    // Subscription dates
    if (data.subscriptionStartDate && data.subscriptionEndDate) {
      const startDate = new Date(data.subscriptionStartDate)
      const endDate = new Date(data.subscriptionEndDate)

      if (startDate >= endDate) {
        errors.push({
          field: 'subscriptionEndDate',
          message: 'Subscription end date must be after start date',
          code: 'DATE_VALIDATION'
        })
      }

      if (startDate < now) {
        warnings.push({
          field: 'subscriptionStartDate',
          message: 'Subscription start date is in the past',
          code: 'DATE_WARNING'
        })
      }
    }

    // Transaction and maturity dates
    if (data.transactionStartDate && data.maturityDate) {
      const transactionDate = new Date(data.transactionStartDate)
      const maturityDate = new Date(data.maturityDate)

      if (transactionDate >= maturityDate) {
        errors.push({
          field: 'maturityDate',
          message: 'Maturity date must be after transaction start date',
          code: 'DATE_VALIDATION'
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Validate ESG and compliance requirements
   */
  private validateESGCompliance(data: Partial<ProjectCreateRequest>): {
    warnings: Array<{ field: string, message: string, code: string }>
  } {
    const warnings: Array<{ field: string, message: string, code: string }> = []

    // ESG rating recommendations
    if (!data.esgRiskRating) {
      warnings.push({
        field: 'esgRiskRating',
        message: 'ESG risk rating is recommended for regulatory compliance',
        code: 'ESG_RECOMMENDATION'
      })
    }

    if (!data.sustainabilityClassification) {
      warnings.push({
        field: 'sustainabilityClassification',
        message: 'Sustainability classification helps with SFDR compliance',
        code: 'ESG_RECOMMENDATION'
      })
    }

    // Taxonomy alignment
    if (data.taxonomyAlignmentPercentage !== undefined) {
      if (data.taxonomyAlignmentPercentage < 0 || data.taxonomyAlignmentPercentage > 100) {
        warnings.push({
          field: 'taxonomyAlignmentPercentage',
          message: 'Taxonomy alignment should be between 0-100%',
          code: 'ESG_VALIDATION'
        })
      }
    }

    return { warnings }
  }

  /**
   * Validate digital asset specific requirements
   */
  private validateDigitalAssets(data: Partial<ProjectCreateRequest>): {
    errors: Array<{ field: string, message: string, code: string }>
    warnings: Array<{ field: string, message: string, code: string }>
  } {
    const errors: Array<{ field: string, message: string, code: string }> = []
    const warnings: Array<{ field: string, message: string, code: string }> = []

    // Smart contract audit status
    if (!data.smartContractAuditStatus) {
      warnings.push({
        field: 'smartContractAuditStatus',
        message: 'Smart contract audit status is highly recommended for digital assets',
        code: 'DIGITAL_ASSET_WARNING'
      })
    }

    // Oracle dependencies for complex digital assets
    if (data.projectType === 'stablecoins' && (!data.oracleDependencies || data.oracleDependencies.length === 0)) {
      warnings.push({
        field: 'oracleDependencies',
        message: 'Oracle dependencies should be specified for stablecoins',
        code: 'DIGITAL_ASSET_WARNING'
      })
    }

    // Gas fee structure
    if (!data.gasFeeStructure) {
      warnings.push({
        field: 'gasFeeStructure',
        message: 'Gas fee structure helps investors understand transaction costs',
        code: 'DIGITAL_ASSET_WARNING'
      })
    }

    return { errors, warnings }
  }
}

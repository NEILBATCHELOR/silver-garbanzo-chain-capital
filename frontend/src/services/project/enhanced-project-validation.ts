/**
 * Enhanced Project Validation Service
 * Provides comprehensive validation for all project types and fields
 */

import { z } from 'zod';
import { getMandatoryFields, getProjectTypeConfig } from '@/types/projects/projectTypes';

/**
 * Field validation rules for enhanced project fields
 */
export const EnhancedProjectValidation = {
  
  // Universal ESG & Sustainability validations
  sustainability_classification: z.enum(['article_6', 'article_8', 'article_9', 'not_applicable'])
    .optional()
    .refine((val) => val !== undefined, { message: "SFDR classification is required for regulated products" }),
    
  esg_risk_rating: z.enum(['low', 'medium', 'high', 'not_assessed'])
    .optional(),
    
  principal_adverse_impacts: z.enum(['yes', 'no', 'not_applicable'])
    .optional(),
    
  taxonomy_alignment_percentage: z.number()
    .min(0, "Alignment percentage cannot be negative")
    .max(100, "Alignment percentage cannot exceed 100%")
    .optional(),
    
  // Risk & Governance validations
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive', 'speculative'])
    .optional(),
    
  governance_structure: z.string()
    .min(10, "Governance structure description must be at least 10 characters")
    .max(2000, "Governance structure description is too long")
    .optional(),
    
  compliance_framework: z.array(z.enum([
    'mifid_ii', 'sfdr', 'csrd', 'aifmd', 'ucits', 'sec_regulations', 'fca_rules', 'other'
  ])).optional(),
  
  // Investor Protection validations
  target_investor_type: z.enum(['retail', 'professional', 'institutional', 'mixed'])
    .optional(),
    
  complexity_indicator: z.enum(['simple', 'complex', 'very_complex'])
    .optional(),
    
  liquidity_terms: z.enum([
    'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'maturity_only', 'no_liquidity'
  ]).optional(),
  
  fee_structure_summary: z.string()
    .min(20, "Fee structure summary must be at least 20 characters")
    .max(1000, "Fee structure summary is too long")
    .optional(),
    
  // Traditional Assets - Structured Products validations
  capital_protection_level: z.number()
    .min(0, "Capital protection level cannot be negative")
    .max(100, "Capital protection level cannot exceed 100%")
    .optional(),
    
  underlying_assets: z.array(z.enum([
    'equities', 'indices', 'commodities', 'currencies', 'bonds', 'credit', 'volatility', 'inflation', 'other'
  ])).optional(),
  
  barrier_level: z.number()
    .positive("Barrier level must be positive")
    .optional(),
    
  payoff_structure: z.enum([
    'autocall', 'barrier_reverse_convertible', 'capital_protected_note', 'phoenix', 'range_accrual', 'other'
  ]).optional(),
  
  // Traditional Assets - Equity validations
  voting_rights: z.enum(['full_voting', 'limited_voting', 'no_voting', 'class_specific'])
    .optional(),
    
  dividend_policy: z.string()
    .max(500, "Dividend policy description is too long")
    .optional(),
    
  dilution_protection: z.array(z.enum([
    'anti_dilution', 'preemptive_rights', 'tag_along', 'drag_along', 'none'
  ])).optional(),
  
  exit_strategy: z.enum([
    'ipo', 'strategic_sale', 'management_buyout', 'secondary_sale', 'liquidation', 'not_defined'
  ]).optional(),
  
  // Traditional Assets - Bonds validations
  credit_rating: z.enum(['aaa', 'aa', 'a', 'bbb', 'bb', 'b', 'ccc', 'd', 'unrated'])
    .optional(),
    
  coupon_frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual', 'zero_coupon', 'variable'])
    .optional(),
    
  call_price: z.number()
    .positive("Call price must be positive")
    .optional(),
    
  security_collateral: z.string()
    .max(1000, "Security collateral description is too long")
    .optional(),
    
  // Alternative Assets - Private Equity validations
  fund_vintage_year: z.string()
    .regex(/^\d{4}$/, "Vintage year must be a 4-digit year")
    .refine((year) => {
      const yearNum = parseInt(year);
      const currentYear = new Date().getFullYear();
      return yearNum >= currentYear - 20 && yearNum <= currentYear + 2;
    }, "Vintage year must be within reasonable range")
    .optional(),
    
  investment_stage: z.enum(['seed', 'series_a', 'series_b', 'growth', 'buyout', 'distressed'])
    .optional(),
    
  sector_focus: z.array(z.enum([
    'technology', 'healthcare', 'financial_services', 'industrials', 'consumer', 
    'energy', 'real_estate', 'telecommunications', 'media', 'diversified'
  ])).optional(),
  
  geographic_focus: z.array(z.enum([
    'north_america', 'europe', 'asia_pacific', 'latin_america', 'middle_east', 'africa', 'global'
  ])).optional(),
  
  // Alternative Assets - Real Estate validations
  property_type: z.enum([
    'office', 'retail', 'industrial', 'multifamily', 'hotel', 'mixed_use', 'land', 'specialty'
  ]).optional(),
  
  geographic_location: z.string()
    .min(5, "Geographic location must be at least 5 characters")
    .max(100, "Geographic location is too long")
    .optional(),
    
  development_stage: z.enum(['existing', 'renovation', 'development', 'pre_development'])
    .optional(),
    
  environmental_certifications: z.array(z.enum([
    'leed', 'breeam', 'energy_star', 'green_globes', 'passive_house', 'none', 'pending'
  ])).optional(),
  
  // Alternative Assets - Receivables validations
  debtor_credit_quality: z.enum(['excellent', 'good', 'fair', 'poor'])
    .optional(),
    
  collection_period_days: z.number()
    .positive("Collection period must be positive")
    .max(365, "Collection period cannot exceed 365 days")
    .optional(),
    
  recovery_rate_percentage: z.number()
    .min(0, "Recovery rate cannot be negative")
    .max(100, "Recovery rate cannot exceed 100%")
    .optional(),
    
  // Alternative Assets - Energy/Solar & Wind validations
  project_capacity_mw: z.number()
    .positive("Project capacity must be positive")
    .optional(),
    
  power_purchase_agreements: z.string()
    .max(1000, "PPA description is too long")
    .optional(),
    
  regulatory_approvals: z.array(z.enum([
    'environmental_permit', 'construction_permit', 'grid_connection', 
    'land_use_permit', 'operating_license', 'pending'
  ])).optional(),
  
  carbon_offset_potential: z.number()
    .positive("Carbon offset potential must be positive")
    .optional(),
    
  // Digital Assets validations
  blockchain_network: z.enum([
    'ethereum', 'polygon', 'binance_smart_chain', 'avalanche', 
    'arbitrum', 'optimism', 'solana', 'cardano'
  ]).optional(),
  
  smart_contract_audit_status: z.enum([
    'completed', 'in_progress', 'scheduled', 'not_required', 'not_started'
  ]).optional(),
  
  consensus_mechanism: z.enum([
    'proof_of_stake', 'proof_of_work', 'delegated_proof_of_stake', 
    'proof_of_authority', 'hybrid', 'other'
  ]).optional(),
  
  gas_fee_structure: z.string()
    .max(500, "Gas fee structure description is too long")
    .optional(),
    
  oracle_dependencies: z.array(z.enum([
    'chainlink', 'band_protocol', 'pyth', 'uma', 'custom', 'none'
  ])).optional(),
  
  // Stablecoin specific validations
  collateral_type: z.enum(['fiat', 'crypto', 'commodity', 'algorithmic'])
    .optional(),
    
  reserve_management_policy: z.string()
    .min(10, "Reserve management policy must be at least 10 characters")
    .max(1000, "Reserve management policy is too long")
    .optional(),
    
  audit_frequency: z.enum([
    'real_time', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc'
  ]).optional(),
  
  redemption_mechanism: z.string()
    .max(500, "Redemption mechanism description is too long")
    .optional(),
    
  depeg_risk_mitigation: z.array(z.enum([
    'overcollateralization', 'dynamic_supply', 'arbitrage_mechanisms', 
    'circuit_breakers', 'governance_intervention', 'insurance_fund'
  ])).optional(),
  
  // Tokenized Fund specific validations
  token_economics: z.string()
    .min(10, "Token economics description must be at least 10 characters")
    .max(1000, "Token economics description is too long")
    .optional(),
    
  custody_arrangements: z.string()
    .max(500, "Custody arrangements description is too long")
    .optional(),
    
  smart_contract_address: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format")
    .optional(),
    
  upgrade_governance: z.string()
    .max(500, "Upgrade governance description is too long")
    .optional(),
    
  // Operational & Compliance validations
  data_processing_basis: z.enum([
    'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'
  ]).optional(),
  
  privacy_policy_link: z.string()
    .url("Privacy policy must be a valid URL")
    .optional(),
    
  data_retention_policy: z.string()
    .max(500, "Data retention policy description is too long")
    .optional(),
    
  cybersecurity_framework: z.array(z.enum([
    'iso_27001', 'nist', 'cis_controls', 'pci_dss', 'soc_2', 'gdpr', 'custom'
  ])).optional(),
  
  disaster_recovery_procedures: z.string()
    .max(1000, "Disaster recovery procedures description is too long")
    .optional(),
    
  tax_reporting_obligations: z.array(z.enum([
    'us_tax_reporting', 'eu_tax_reporting', 'fatca', 'crs', 'local_tax', 'none'
  ])).optional(),
  
  regulatory_permissions: z.array(z.enum([
    'banking_license', 'investment_license', 'securities_license', 
    'aml_registration', 'data_protection', 'pending'
  ])).optional(),
  
  cross_border_implications: z.string()
    .max(1000, "Cross-border implications description is too long")
    .optional(),
};

/**
 * Enhanced Project Validation Service
 */
export class EnhancedProjectValidationService {
  
  /**
   * Validate project data based on project type
   */
  static validateProject(projectData: any, projectType: string): {
    isValid: boolean;
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    
    try {
      const mandatoryFields = getMandatoryFields(projectType);
      const projectConfig = getProjectTypeConfig(projectType);
      
      // Validate mandatory fields
      mandatoryFields.forEach(fieldName => {
        const value = projectData[fieldName];
        
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          if (!errors[fieldName]) errors[fieldName] = [];
          errors[fieldName].push(`${fieldName.replace(/_/g, ' ')} is required for ${projectConfig?.label || projectType}`);
        }
      });
      
      // Validate field formats using Zod schemas
      Object.entries(EnhancedProjectValidation).forEach(([fieldName, schema]) => {
        const value = projectData[fieldName];
        
        if (value !== undefined && value !== null && value !== '') {
          try {
            schema.parse(value);
          } catch (zodError: any) {
            if (!errors[fieldName]) errors[fieldName] = [];
            zodError.errors?.forEach((err: any) => {
              errors[fieldName].push(err.message);
            });
          }
        }
      });
      
      // Project type specific validations
      this.validateProjectTypeSpecific(projectData, projectType, errors, warnings);
      
      // Cross-field validations
      this.validateCrossFieldDependencies(projectData, projectType, errors, warnings);
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: { general: ['Validation failed due to unexpected error'] },
        warnings: {}
      };
    }
  }
  
  /**
   * Validate specific requirements for each project type
   */
  private static validateProjectTypeSpecific(
    projectData: any, 
    projectType: string, 
    errors: Record<string, string[]>, 
    warnings: Record<string, string[]>
  ): void {
    const projectConfig = getProjectTypeConfig(projectType);
    
    if (!projectConfig) {
      if (!errors.project_type) errors.project_type = [];
      errors.project_type.push('Invalid project type');
      return;
    }
    
    // Digital asset specific validations
    if (projectConfig.category === 'digital') {
      // Blockchain network is required for digital assets
      if (!projectData.blockchain_network) {
        if (!warnings.blockchain_network) warnings.blockchain_network = [];
        warnings.blockchain_network.push('Blockchain network should be specified for digital assets');
      }
      
      // Smart contract audit is recommended
      if (!projectData.smart_contract_audit_status || projectData.smart_contract_audit_status === 'not_started') {
        if (!warnings.smart_contract_audit_status) warnings.smart_contract_audit_status = [];
        warnings.smart_contract_audit_status.push('Smart contract audit is recommended for digital assets');
      }
      
      // Stablecoin specific validations
      if (projectType.includes('stablecoin')) {
        if (!projectData.collateral_type) {
          if (!warnings.collateral_type) warnings.collateral_type = [];
          warnings.collateral_type.push('Collateral type should be specified for stablecoins');
        }
        
        if (!projectData.reserve_management_policy) {
          if (!warnings.reserve_management_policy) warnings.reserve_management_policy = [];
          warnings.reserve_management_policy.push('Reserve management policy is important for stablecoins');
        }
      }
    }
    
    // ESG and sustainability validations
    if (projectConfig.category === 'traditional' || projectConfig.category === 'alternative') {
      // SFDR classification is required for EU regulated products
      if (!projectData.sustainability_classification) {
        if (!warnings.sustainability_classification) warnings.sustainability_classification = [];
        warnings.sustainability_classification.push('SFDR classification may be required for regulated products');
      }
      
      // ESG risk rating is recommended
      if (!projectData.esg_risk_rating || projectData.esg_risk_rating === 'not_assessed') {
        if (!warnings.esg_risk_rating) warnings.esg_risk_rating = [];
        warnings.esg_risk_rating.push('ESG risk assessment is recommended');
      }
    }
    
    // Financial validations
    if (projectData.target_raise && projectData.minimum_investment) {
      const targetRaise = parseFloat(projectData.target_raise);
      const minInvestment = parseFloat(projectData.minimum_investment);
      
      if (minInvestment > targetRaise) {
        if (!errors.minimum_investment) errors.minimum_investment = [];
        errors.minimum_investment.push('Minimum investment cannot exceed target raise');
      }
    }
  }
  
  /**
   * Validate cross-field dependencies and logic
   */
  private static validateCrossFieldDependencies(
    projectData: any, 
    projectType: string, 
    errors: Record<string, string[]>, 
    warnings: Record<string, string[]>
  ): void {
    // Date validations
    if (projectData.subscription_start_date && projectData.subscription_end_date) {
      const startDate = new Date(projectData.subscription_start_date);
      const endDate = new Date(projectData.subscription_end_date);
      
      if (startDate >= endDate) {
        if (!errors.subscription_end_date) errors.subscription_end_date = [];
        errors.subscription_end_date.push('Subscription end date must be after start date');
      }
    }
    
    if (projectData.subscription_end_date && projectData.maturity_date) {
      const subscriptionEnd = new Date(projectData.subscription_end_date);
      const maturityDate = new Date(projectData.maturity_date);
      
      if (maturityDate <= subscriptionEnd) {
        if (!warnings.maturity_date) warnings.maturity_date = [];
        warnings.maturity_date.push('Maturity date should typically be after subscription period');
      }
    }
    
    // Custodian validations
    if (projectData.third_party_custodian && !projectData.custodian_name) {
      if (!warnings.custodian_name) warnings.custodian_name = [];
      warnings.custodian_name.push('Custodian name should be provided when using third-party custody');
    }
    
    // Callable bond validations
    if (projectData.callable_features) {
      if (!projectData.call_date) {
        if (!warnings.call_date) warnings.call_date = [];
        warnings.call_date.push('Call date should be specified for callable bonds');
      }
      
      if (!projectData.call_price) {
        if (!warnings.call_price) warnings.call_price = [];
        warnings.call_price.push('Call price should be specified for callable bonds');
      }
    }
    
    // EU Taxonomy alignment validation
    if (projectData.taxonomy_alignment_percentage > 0 && 
        (!projectData.sustainability_classification || projectData.sustainability_classification === 'article_6')) {
      if (!warnings.sustainability_classification) warnings.sustainability_classification = [];
      warnings.sustainability_classification.push('Products with EU Taxonomy alignment should typically be Article 8 or 9');
    }
  }
  
  /**
   * Get validation summary for a project
   */
  static getValidationSummary(projectData: any, projectType: string) {
    const validation = this.validateProject(projectData, projectType);
    const mandatoryFields = getMandatoryFields(projectType);
    
    const completedMandatory = mandatoryFields.filter(field => {
      const value = projectData[field];
      return value !== null && value !== undefined && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    });
    
    return {
      ...validation,
      completionPercentage: mandatoryFields.length > 0 
        ? Math.round((completedMandatory.length / mandatoryFields.length) * 100)
        : 100,
      mandatoryFieldsTotal: mandatoryFields.length,
      mandatoryFieldsCompleted: completedMandatory.length,
      mandatoryFieldsMissing: mandatoryFields.length - completedMandatory.length,
    };
  }
}

export default EnhancedProjectValidationService;
/**
 * Enhanced Project Types with Mandatory Fields Configuration
 * 
 * This file defines the project types and their mandatory field requirements
 * to ensure proper data collection based on the specific asset class.
 * 
 * Updated with comprehensive enhancement fields from Project Enhancement.md
 */

export enum ProjectType {
  // Traditional Assets
  STRUCTURED_PRODUCTS = "structured_products",
  EQUITY = "equity",
  COMMODITIES = "commodities",
  FUNDS_ETFS_ETPS = "funds_etfs_etps",
  BONDS = "bonds",
  QUANTITATIVE_INVESTMENT_STRATEGIES = "quantitative_investment_strategies",
  
  // Alternative Assets
  PRIVATE_EQUITY = "private_equity",
  PRIVATE_DEBT = "private_debt",
  REAL_ESTATE = "real_estate",
  ENERGY = "energy",
  INFRASTRUCTURE = "infrastructure",
  COLLECTIBLES = "collectibles",
  RECEIVABLES = "receivables",
  SOLAR_WIND_CLIMATE = "solar_wind_climate",
  
  // Digital Assets
  DIGITAL_TOKENISED_FUND = "digital_tokenised_fund",
  FIAT_BACKED_STABLECOIN = "fiat_backed_stablecoin",
  CRYPTO_BACKED_STABLECOIN = "crypto_backed_stablecoin",
  COMMODITY_BACKED_STABLECOIN = "commodity_backed_stablecoin",
  ALGORITHMIC_STABLECOIN = "algorithmic_stablecoin",
  REBASING_STABLECOIN = "rebasing_stablecoin",
}

export interface ProjectTypeConfig {
  value: string;
  label: string;
  category: 'traditional' | 'alternative' | 'digital';
  description: string;
  mandatoryFields: string[];
  recommendedFields: string[];
  walletRequired: boolean;
}

// Universal mandatory fields applied to all project types
const UNIVERSAL_MANDATORY_FIELDS = [
  'sustainability_classification',
  'esg_risk_rating', 
  'principal_adverse_impacts',
  'risk_profile',
  'governance_structure',
  'target_investor_type',
  'complexity_indicator',
  'liquidity_terms',
  'fee_structure_summary'
];

// Universal recommended fields for all project types
const UNIVERSAL_RECOMMENDED_FIELDS = [
  'taxonomy_alignment_percentage',
  'compliance_framework',
  'third_party_custodian',
  'data_processing_basis',
  'privacy_policy_link',
  'business_continuity_plan',
  'cybersecurity_framework'
];

// Digital asset specific mandatory fields
const DIGITAL_ASSET_MANDATORY_FIELDS = [
  'blockchain_network',
  'smart_contract_audit_status',
  'consensus_mechanism',
  'gas_fee_structure',
  'oracle_dependencies'
];

export const PROJECT_TYPE_CONFIGS: Record<ProjectType, ProjectTypeConfig> = {
  // Traditional Assets
  [ProjectType.STRUCTURED_PRODUCTS]: {
    value: "structured_products",
    label: "Structured Products",
    category: 'traditional',
    description: "Complex financial instruments with multiple components",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'subscription_start_date',
      'subscription_end_date',
      'maturity_date',
      'estimated_yield_percentage',
      'duration',
      'legal_entity',
      'jurisdiction',
      'currency',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Structured Products specific
      'capital_protection_level',
      'underlying_assets',
      'barrier_level',
      'payoff_structure'
    ],
    recommendedFields: [
      'company_valuation',
      'tax_id',
      'share_price',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.EQUITY]: {
    value: "equity",
    label: "Equity",
    category: 'traditional',
    description: "Ownership shares in a company",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'authorized_shares',
      'share_price',
      'company_valuation',
      'legal_entity',
      'jurisdiction',
      'minimum_investment',
      'currency',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Equity specific
      'voting_rights',
      'dividend_policy',
      'dilution_protection',
      'exit_strategy'
    ],
    recommendedFields: [
      'tax_id',
      'estimated_yield_percentage',
      'duration',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.COMMODITIES]: {
    value: "commodities",
    label: "Commodities",
    category: 'traditional',
    description: "Physical goods and raw materials",
    mandatoryFields: [
      // Original mandatory fields
      'total_notional',
      'minimum_investment',
      'transaction_start_date',
      'maturity_date',
      'currency',
      'legal_entity',
      'jurisdiction',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS
    ],
    recommendedFields: [
      'target_raise',
      'estimated_yield_percentage',
      'duration',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.FUNDS_ETFS_ETPS]: {
    value: "funds_etfs_etps",
    label: "Funds, ETFs, ETPs",
    category: 'traditional',
    description: "Pooled investment vehicles",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'subscription_start_date',
      'subscription_end_date',
      'legal_entity',
      'jurisdiction',
      'currency',
      'estimated_yield_percentage',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS
    ],
    recommendedFields: [
      'duration',
      'share_price',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.BONDS]: {
    value: "bonds",
    label: "Bonds",
    category: 'traditional',
    description: "Debt securities with fixed income",
    mandatoryFields: [
      // Original mandatory fields
      'total_notional',
      'minimum_investment',
      'subscription_start_date',
      'maturity_date',
      'estimated_yield_percentage',
      'duration',
      'legal_entity',
      'jurisdiction',
      'currency',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Bonds specific
      'credit_rating',
      'coupon_frequency',
      'security_collateral'
    ],
    recommendedFields: [
      'target_raise',
      'tax_id',
      'transaction_start_date',
      'callable_features',
      'call_date',
      'call_price',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES]: {
    value: "quantitative_investment_strategies",
    label: "Quantitative Investment Strategies",
    category: 'traditional',
    description: "Algorithm-based investment approaches",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'estimated_yield_percentage',
      'legal_entity',
      'jurisdiction',
      'currency',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS
    ],
    recommendedFields: [
      'duration',
      'subscription_start_date',
      'subscription_end_date',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  // Alternative Assets
  [ProjectType.PRIVATE_EQUITY]: {
    value: "private_equity",
    label: "Private Equity",
    category: 'alternative',
    description: "Private company ownership and buyouts",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'company_valuation',
      'legal_entity',
      'jurisdiction',
      'currency',
      'duration',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Private Equity specific
      'fund_vintage_year',
      'investment_stage',
      'sector_focus',
      'geographic_focus'
    ],
    recommendedFields: [
      'estimated_yield_percentage',
      'subscription_start_date',
      'subscription_end_date',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.PRIVATE_DEBT]: {
    value: "private_debt",
    label: "Private Debt",
    category: 'alternative',
    description: "Non-public debt instruments",
    mandatoryFields: [
      // Original mandatory fields
      'total_notional',
      'minimum_investment',
      'maturity_date',
      'estimated_yield_percentage',
      'duration',
      'legal_entity',
      'jurisdiction',
      'currency',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS
    ],
    recommendedFields: [
      'target_raise',
      'subscription_start_date',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.REAL_ESTATE]: {
    value: "real_estate",
    label: "Real Estate",
    category: 'alternative',
    description: "Property and real estate investments",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'company_valuation',
      'legal_entity',
      'jurisdiction',
      'currency',
      'duration',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Real Estate specific
      'property_type',
      'geographic_location',
      'development_stage',
      'environmental_certifications'
    ],
    recommendedFields: [
      'estimated_yield_percentage',
      'subscription_start_date',
      'subscription_end_date',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.ENERGY]: {
    value: "energy",
    label: "Energy",
    category: 'alternative',
    description: "Energy sector investments",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'legal_entity',
      'jurisdiction',
      'currency',
      'duration',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS
    ],
    recommendedFields: [
      'estimated_yield_percentage',
      'company_valuation',
      'subscription_start_date',
      'maturity_date',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.INFRASTRUCTURE]: {
    value: "infrastructure",
    label: "Infrastructure",
    category: 'alternative',
    description: "Infrastructure and utility investments",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'legal_entity',
      'jurisdiction',
      'currency',
      'duration',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS
    ],
    recommendedFields: [
      'estimated_yield_percentage',
      'company_valuation',
      'subscription_start_date',
      'maturity_date',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.COLLECTIBLES]: {
    value: "collectibles",
    label: "Collectibles & Other Assets",
    category: 'alternative',
    description: "Art, collectibles, and alternative investments",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'legal_entity',
      'jurisdiction',
      'currency',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS
    ],
    recommendedFields: [
      'estimated_yield_percentage',
      'duration',
      'company_valuation',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.RECEIVABLES]: {
    value: "receivables",
    label: "Asset Backed Securities / Receivables",
    category: 'alternative',
    description: "Invoice receivables and asset-backed securities",
    mandatoryFields: [
      // Original mandatory fields
      'total_notional',
      'minimum_investment',
      'maturity_date',
      'estimated_yield_percentage',
      'duration',
      'legal_entity',
      'jurisdiction',
      'currency',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Receivables specific
      'debtor_credit_quality',
      'collection_period_days',
      'recovery_rate_percentage',
      'diversification_metrics'
    ],
    recommendedFields: [
      'target_raise',
      'subscription_start_date',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  [ProjectType.SOLAR_WIND_CLIMATE]: {
    value: "solar_wind_climate",
    label: "Solar and Wind Energy, Climate Receivables",
    category: 'alternative',
    description: "Renewable energy and climate finance",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'legal_entity',
      'jurisdiction',
      'currency',
      'duration',
      'estimated_yield_percentage',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Energy/Climate specific
      'project_capacity_mw',
      'power_purchase_agreements',
      'regulatory_approvals',
      'carbon_offset_potential'
    ],
    recommendedFields: [
      'total_notional',
      'subscription_start_date',
      'maturity_date',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: false
  },
  
  // Digital Assets
  [ProjectType.DIGITAL_TOKENISED_FUND]: {
    value: "digital_tokenised_fund",
    label: "Digital Tokenised Fund",
    category: 'digital',
    description: "Blockchain-based tokenized investment funds",
    mandatoryFields: [
      // Original mandatory fields
      'target_raise',
      'minimum_investment',
      'token_symbol',
      'legal_entity',
      'jurisdiction',
      'currency',
      'subscription_start_date',
      'transaction_start_date',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Digital asset specific
      ...DIGITAL_ASSET_MANDATORY_FIELDS,
      // Tokenized Fund specific
      'token_economics',
      'custody_arrangements',
      'smart_contract_address',
      'upgrade_governance'
    ],
    recommendedFields: [
      'estimated_yield_percentage',
      'duration',
      'share_price',
      'authorized_shares',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: true
  },
  
  [ProjectType.FIAT_BACKED_STABLECOIN]: {
    value: "fiat_backed_stablecoin",
    label: "Fiat-Backed Stablecoin",
    category: 'digital',
    description: "Stablecoin backed by fiat currency reserves",
    mandatoryFields: [
      // Original mandatory fields
      'token_symbol',
      'legal_entity',
      'jurisdiction',
      'currency',
      'minimum_investment',
      'transaction_start_date',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Digital asset specific
      ...DIGITAL_ASSET_MANDATORY_FIELDS,
      // Stablecoin specific
      'collateral_type',
      'reserve_management_policy',
      'audit_frequency',
      'redemption_mechanism',
      'depeg_risk_mitigation'
    ],
    recommendedFields: [
      'target_raise',
      'total_notional',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: true
  },
  
  [ProjectType.CRYPTO_BACKED_STABLECOIN]: {
    value: "crypto_backed_stablecoin",
    label: "Crypto-Backed Stablecoin",
    category: 'digital',
    description: "Stablecoin backed by cryptocurrency collateral",
    mandatoryFields: [
      // Original mandatory fields
      'token_symbol',
      'legal_entity',
      'jurisdiction',
      'currency',
      'minimum_investment',
      'transaction_start_date',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Digital asset specific
      ...DIGITAL_ASSET_MANDATORY_FIELDS,
      // Stablecoin specific
      'collateral_type',
      'reserve_management_policy',
      'audit_frequency',
      'redemption_mechanism',
      'depeg_risk_mitigation'
    ],
    recommendedFields: [
      'target_raise',
      'total_notional',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: true
  },
  
  [ProjectType.COMMODITY_BACKED_STABLECOIN]: {
    value: "commodity_backed_stablecoin",
    label: "Commodity-Backed Stablecoin",
    category: 'digital',
    description: "Stablecoin backed by commodity reserves",
    mandatoryFields: [
      // Original mandatory fields
      'token_symbol',
      'legal_entity',
      'jurisdiction',
      'currency',
      'minimum_investment',
      'transaction_start_date',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Digital asset specific
      ...DIGITAL_ASSET_MANDATORY_FIELDS,
      // Stablecoin specific
      'collateral_type',
      'reserve_management_policy',
      'audit_frequency',
      'redemption_mechanism',
      'depeg_risk_mitigation'
    ],
    recommendedFields: [
      'target_raise',
      'total_notional',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: true
  },
  
  [ProjectType.ALGORITHMIC_STABLECOIN]: {
    value: "algorithmic_stablecoin",
    label: "Algorithmic Stablecoin",
    category: 'digital',
    description: "Stablecoin maintained through algorithmic mechanisms",
    mandatoryFields: [
      // Original mandatory fields
      'token_symbol',
      'legal_entity',
      'jurisdiction',
      'currency',
      'minimum_investment',
      'transaction_start_date',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Digital asset specific
      ...DIGITAL_ASSET_MANDATORY_FIELDS,
      // Stablecoin specific
      'collateral_type',
      'reserve_management_policy',
      'audit_frequency',
      'redemption_mechanism',
      'depeg_risk_mitigation'
    ],
    recommendedFields: [
      'target_raise',
      'total_notional',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: true
  },
  
  [ProjectType.REBASING_STABLECOIN]: {
    value: "rebasing_stablecoin",
    label: "Rebasing Stablecoin",
    category: 'digital',
    description: "Stablecoin with elastic supply mechanism",
    mandatoryFields: [
      // Original mandatory fields
      'token_symbol',
      'legal_entity',
      'jurisdiction',
      'currency',
      'minimum_investment',
      'transaction_start_date',
      // Universal mandatory fields
      ...UNIVERSAL_MANDATORY_FIELDS,
      // Digital asset specific
      ...DIGITAL_ASSET_MANDATORY_FIELDS,
      // Stablecoin specific
      'collateral_type',
      'reserve_management_policy',
      'audit_frequency',
      'redemption_mechanism',
      'depeg_risk_mitigation'
    ],
    recommendedFields: [
      'target_raise',
      'total_notional',
      'tax_id',
      ...UNIVERSAL_RECOMMENDED_FIELDS
    ],
    walletRequired: true
  },
};

export const getProjectTypesByCategory = () => {
  const traditional = Object.values(PROJECT_TYPE_CONFIGS).filter(config => config.category === 'traditional');
  const alternative = Object.values(PROJECT_TYPE_CONFIGS).filter(config => config.category === 'alternative');
  const digital = Object.values(PROJECT_TYPE_CONFIGS).filter(config => config.category === 'digital');
  
  return { traditional, alternative, digital };
};

export const getMandatoryFields = (projectType: string): string[] => {
  const config = Object.values(PROJECT_TYPE_CONFIGS).find(config => config.value === projectType);
  return config ? config.mandatoryFields : [];
};

export const getRecommendedFields = (projectType: string): string[] => {
  const config = Object.values(PROJECT_TYPE_CONFIGS).find(config => config.value === projectType);
  return config ? config.recommendedFields : [];
};

export const isWalletRequired = (projectType: string): boolean => {
  const config = Object.values(PROJECT_TYPE_CONFIGS).find(config => config.value === projectType);
  return config ? config.walletRequired : false;
};

export const getProjectTypeConfig = (projectType: string): ProjectTypeConfig | undefined => {
  return Object.values(PROJECT_TYPE_CONFIGS).find(config => config.value === projectType);
};

// Helper function to get all universal fields
export const getUniversalMandatoryFields = (): string[] => {
  return [...UNIVERSAL_MANDATORY_FIELDS];
};

export const getUniversalRecommendedFields = (): string[] => {
  return [...UNIVERSAL_RECOMMENDED_FIELDS];
};

// Helper function to get digital asset specific fields
export const getDigitalAssetMandatoryFields = (): string[] => {
  return [...DIGITAL_ASSET_MANDATORY_FIELDS];
};

// Helper function to calculate completion percentage
export const calculateCompletionPercentage = (projectData: any, projectType: string): number => {
  const config = getProjectTypeConfig(projectType);
  if (!config) return 0;
  
  const mandatoryFields = config.mandatoryFields;
  const completedFields = mandatoryFields.filter(field => {
    const value = projectData[field];
    return value !== null && value !== undefined && value !== '' && 
           (Array.isArray(value) ? value.length > 0 : true);
  });
  
  return Math.round((completedFields.length / mandatoryFields.length) * 100);
};

// Helper function to get missing mandatory fields
export const getMissingMandatoryFields = (projectData: any, projectType: string): string[] => {
  const config = getProjectTypeConfig(projectType);
  if (!config) return [];
  
  return config.mandatoryFields.filter(field => {
    const value = projectData[field];
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0);
  });
};

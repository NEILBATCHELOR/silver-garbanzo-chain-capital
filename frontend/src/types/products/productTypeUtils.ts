import { ProjectType } from '@/types/projects';

/**
 * Creates mapping between internal product types and project types
 */
export const ProductTypeMap: Record<string, ProjectType> = {
  structured_products: ProjectType.STRUCTURED_PRODUCTS,
  equity_products: ProjectType.EQUITY,
  commodities_products: ProjectType.COMMODITIES,
  fund_products: ProjectType.FUNDS_ETFS_ETPS,
  bond_products: ProjectType.BONDS,
  qis_products: ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES,
  private_equity_products: ProjectType.PRIVATE_EQUITY,
  private_debt_products: ProjectType.PRIVATE_DEBT,
  real_estate_products: ProjectType.REAL_ESTATE,
  energy_products: ProjectType.ENERGY,
  infrastructure_products: ProjectType.INFRASTRUCTURE,
  collectibles_products: ProjectType.COLLECTIBLES,
  asset_backed_products: ProjectType.RECEIVABLES,
  digital_tokenized_fund_products: ProjectType.DIGITAL_TOKENISED_FUND,
  stablecoin_products: ProjectType.FIAT_BACKED_STABLECOIN // Default stablecoin type
};

// Re-export ProjectType for use in product-related components
export { ProjectType };

/**
 * Enum for different lifecycle event types
 */
export enum LifecycleEventType {
  ISSUANCE = 'issuance',
  COUPON_PAYMENT = 'coupon_payment',
  MATURITY = 'maturity',
  REDEMPTION = 'redemption',
  BARRIER_HIT = 'barrier_hit',
  DIVIDEND = 'dividend',
  CORPORATE_ACTION = 'corporate_action',
  ROLL = 'roll',
  EXPIRATION = 'expiration',
  CREATION = 'creation',
  DISTRIBUTION = 'distribution',
  CALL = 'call',
  PUT = 'put',
  INTEREST_PAYMENT = 'interest_payment',
  INVESTMENT = 'investment',
  EXIT = 'exit',
  CAPITAL_CALL = 'capital_call',
  DRAWDOWN = 'drawdown',
  LEASE_START = 'lease_start',
  LEASE_END = 'lease_end',
  MAINTENANCE = 'maintenance',
  OPERATIONS = 'operations',
  SALE = 'sale',
  VALUATION = 'valuation',
  APPRAISAL = 'appraisal',
  AUDIT = 'audit',
  MODIFICATION = 'modification',
  MINT = 'mint',
  BURN = 'burn',
  REBASE = 'rebase',
  LIQUIDATION = 'liquidation',
  DEPEG = 'depeg',
  PARAMETER_CHANGE = 'parameter_change',
  OTHER = 'other'
}

/**
 * Type for lifecycle event creation request
 */
export interface CreateLifecycleEventRequest {
  productId: string;
  productType: ProjectType;
  eventType: LifecycleEventType;
  eventDate?: Date;
  quantity?: number;
  transactionHash?: string;
  actor?: string;
  details?: string;
}

/**
 * Interface for simplified project representation
 */
export interface SimplifiedProject {
  id: string;
  name: string;
  type: ProjectType;
  status: string;
  createdAt: Date;
}

/**
 * Interface for project with associated products
 */
export interface ProjectWithProducts extends SimplifiedProject {
  products: any[];
}

/**
 * Interface for Digital Tokenized Fund
 */
export interface DigitalTokenisedFund {
  id: string;
  projectId: string;
  assetName: string;
  assetSymbol: string;
  issuer: string;
  blockchainNetwork: string;
  smartContractAddress: string;
  issuanceDate: Date;
  totalSupply: number;
  circulatingSupply: number;
  nav: number;
  fractionalizationEnabled: boolean;
  managementFee: number;
  performanceFee: number;
  redemptionTerms: string;
  complianceRules: string;
  permissionControls: string;
  embeddedRights: string;
  provenanceHistoryEnabled: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Union type for all product types
 */
export type ProductUnion = any;

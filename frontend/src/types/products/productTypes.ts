/**
 * Product Types - Type definitions for all financial product categories
 * 
 * This file contains TypeScript interfaces for the 15 financial product categories
 * used in the application. Each product type has a specific set of fields
 * for terms and lifecycle management.
 */

import { ProjectType } from "../projects/projectTypes";

// Common base interface for all products
export interface BaseProduct {
  id: string;
  projectId: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  targetRaise?: number;
}

// =========================================
// TRADITIONAL ASSETS
// =========================================

/**
 * Structured Product model
 * Complex financial instruments often combining derivatives with underlying assets
 */
export interface StructuredProduct extends BaseProduct {
  productId?: string;
  productName?: string;
  issuer?: string;
  underlyingAssets?: string[];
  payoffStructure?: string;
  barrierLevel?: number;
  couponRate?: number;
  strikePrice?: number;
  protectionLevel?: number;
  currency?: string;
  nominalAmount?: number;
  riskIndicators?: number;
  issueDate?: string;
  maturityDate?: string;
  eventHistory?: any;
  redemptionDate?: string;
  valuationHistory?: any;
  monitoringTriggers?: any;
  // Additional fields from database schema
  targetAudience?: string;
  distributionStrategy?: string;
  riskRating?: number;
  complexFeatures?: any;
}

/**
 * Equity Product model
 * Represents ownership in companies
 */
export interface EquityProduct extends BaseProduct {
  tickerSymbol?: string;
  companyName?: string;
  exchange?: string;
  sectorIndustry?: string;
  marketCapitalization?: number;
  authorizedShares?: number;
  sharesOutstanding?: number;
  dividendYield?: number;
  earningsPerShare?: number;
  priceEarningsRatio?: number;
  currency?: string;
  ipoDate?: string;
  delistingDate?: string;
  corporateActionsHistory?: any;
  dividendPaymentDates?: string[];
  acquisitionDisposalDate?: string;
  votingRights?: string;
  dividendPolicy?: string;
  dilutionProtection?: string[];
  exitStrategy?: string;
}

/**
 * Commodities Product model
 * Physical or futures-based commodities assets
 */
export interface CommoditiesProduct extends BaseProduct {
  commodityId?: string;
  commodityName?: string;
  commodityType?: string;
  unitOfMeasure?: string;
  contractSize?: number;
  gradeQuality?: string;
  exchange?: string;
  deliveryMonths?: string[];
  liquidityMetric?: number;
  currency?: string;
  contractIssueDate?: string;
  expirationDate?: string;
  rollHistory?: any;
  storageDeliveryCosts?: number;
  productionInventoryLevels?: number[];
  targetRaise?: number;
}

/**
 * Fund/ETF/ETP Product model
 * Pooled investment vehicles
 */
export interface FundProduct extends BaseProduct {
  fundTicker?: string;
  fundName?: string;
  fundType?: string;
  netAssetValue?: number;
  assetsUnderManagement?: number;
  expenseRatio?: number;
  benchmarkIndex?: string;
  holdings?: any;
  distributionFrequency?: string;
  trackingError?: number;
  currency?: string;
  inceptionDate?: string;
  closureLiquidationDate?: string;
  creationRedemptionHistory?: any;
  performanceHistory?: any;
  flowData?: any;
  // Additional fields for compatibility - support both string and array types
  fundVintageYear?: string | number;
  investmentStage?: string;
  sectorFocus?: string | string[];
  geographicFocus?: string | string[];
}

/**
 * Bond Product model
 * Debt instruments
 */
export interface BondProduct extends BaseProduct {
  bondIdentifier?: string;
  issuerName?: string;
  couponRate?: number;
  faceValue?: number;
  creditRating?: string;
  bondType?: string;
  callableFlag?: boolean;
  callPutDates?: string[];
  yieldToMaturity?: number;
  duration?: number;
  currency?: string;
  issueDate?: string;
  maturityDate?: string;
  couponPaymentHistory?: any;
  redemptionCallDate?: string;
  accruedInterest?: number;
  couponFrequency?: string;
  securityCollateral?: string;
  callableFeatures?: string;
  callDate?: string;
  callPrice?: number;
}

/**
 * Quantitative Investment Strategy Product model
 * Rules-based approaches using models and data analytics
 */
export interface QuantitativeInvestmentStrategyProduct extends BaseProduct {
  strategyId?: string;
  strategyName?: string;
  strategyType?: string;
  parameters?: any;
  underlyingAssets?: string[];
  riskMetrics?: number;
  benchmark?: string;
  dataSources?: string[];
  machineLearningFlags?: boolean;
  currency?: string;
  inceptionDate?: string;
  terminationDate?: string;
  backtestHistory?: any;
  adjustmentHistory?: any;
  performanceAttribution?: any;
}

// =========================================
// ALTERNATIVE ASSETS
// =========================================

/**
 * Private Equity Product model
 * Private company investments
 */
export interface PrivateEquityProduct extends BaseProduct {
  fundId?: string;
  fundName?: string;
  fundType?: string;
  fundSize?: number;
  formationDate?: string;
  commitmentPeriod?: number;
  capitalCommitment?: number;
  capitalCall?: number;
  investedCapital?: number;
  managementFee?: number;
  carriedInterest?: number;
  hurdleRate?: number;
  internalRateOfReturn?: number;
  netAssetValue?: number;
  distributedToPaidIn?: number;
  residualValueToPaidIn?: number;
  investmentDate?: string;
  exitDate?: string;
  exitMechanism?: string;
  portfolioCompanyId?: string;
  stageOfDevelopment?: string;
  financingRound?: string;
  investmentAmount?: number;
  valuationPreMoney?: number;
  valuationPostMoney?: number;
  ownershipPercentage?: number;
  investorType?: string;
  currency?: string;
  fundVintageYear?: string;
  investmentStage?: string;
  sectorFocus?: string;
  geographicFocus?: string;
}

/**
 * Private Debt Product model
 * Non-public debt instruments
 */
export interface PrivateDebtProduct extends BaseProduct {
  dealId?: string;
  opportunitySource?: string;
  industrySector?: string;
  companyName?: string;
  dealSize?: number;
  screeningStatus?: string;
  dueDiligenceStatus?: string;
  financialMetrics?: any;
  riskProfile?: string;
  valuationAmount?: number;
  dealStructureDetails?: string;
  transactionStatus?: string;
  executionDate?: string;
  portfolioPerformanceMetrics?: any;
  complianceStatus?: string;
  monitoringFrequency?: number;
  advisoryServiceType?: string;
  exitStrategyStatus?: string;
  outcome?: string;
  // Additional fields from database schema
  debtorCreditQuality?: string;
  collectionPeriodDays?: number;
  recoveryRatePercentage?: number;
  diversificationMetrics?: any;
}

/**
 * Real Estate Product model
 * Property investments
 */
export interface RealEstateProduct extends BaseProduct {
  propertyId?: string;
  propertyName?: string;
  propertyAddress?: string;
  propertyType?: string;
  acquisitionDate?: string;
  building?: string;
  unit?: string;
  areaType?: string;
  units?: number;
  leaseNumber?: string;
  tenant?: string;
  leaseBeginDate?: string;
  leaseEndDate?: string;
  leaseManager?: string;
  leaseClassification?: string;
  borrowingRate?: number;
  assetNumber?: string;
  grossAmount?: number;
  taxableAmount?: number;
  billingFrequency?: string;
  startingDate?: string;
  endingDate?: string;
  dispositionDate?: string;
  propertyType2?: string;
  currency?: string;
  geographicLocation?: string;
  developmentStage?: string;
  environmentalCertifications?: string;
}

/**
 * Energy Product model (including Solar and Wind)
 * Energy sector investments
 */
export interface EnergyProduct extends BaseProduct {
  projectIdentifier?: string; // Added to match database schema
  energyProjectId?: string;
  projectName?: string;
  projectType?: string;
  capacity?: number;
  projectStatus?: string;
  siteId?: string;
  siteLocation?: string;
  owner?: string;
  electricityPurchaser?: string;
  landType?: string;
  expectedOnlineDate?: string;
  financialData?: any;
  regulatoryCompliance?: string;
  timelineData?: any;
  fieldServiceLogs?: string;
  performanceMetrics?: any;
  receivableAmount?: number;
  decommissionDate?: string;
  projectCapacityMw?: number;
  powerPurchaseAgreements?: string;
  regulatoryApprovals?: string | string[]; // Support both string and array types
  carbonOffsetPotential?: string | number;
}

/**
 * Infrastructure Product model
 * Infrastructure and utility investments
 */
export interface InfrastructureProduct extends BaseProduct {
  assetId?: string;
  assetType?: string;
  designDate?: string;
  procurementDate?: string;
  conditionScore?: number;
  age?: number;
  maintenanceBacklog?: number;
  performanceMetrics?: any;
  meanTimeBetweenFailure?: number;
  rehabilitationDate?: string;
  replacementDate?: string;
  costOfReplacement?: number;
  inspectionDate?: string;
  safetyIncidents?: number;
}

/**
 * Collectibles Product model
 * Art, collectibles, and other alternative assets
 */
export interface CollectiblesProduct extends BaseProduct {
  assetId?: string;
  assetType?: string;
  description?: string;
  acquisitionDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  condition?: string;
  location?: string;
  owner?: string;
  insuranceDetails?: number;
  appraisalDate?: string;
  saleDate?: string;
  salePrice?: number;
}

/**
 * Asset Backed / Receivables Product model
 * Invoice receivables and asset-backed securities
 */
export interface AssetBackedProduct extends BaseProduct {
  assetNumber?: string;
  assetType?: string;
  originationDate?: string;
  originalAmount?: number;
  maturityDate?: string;
  interestRate?: number;
  accrualType?: string;
  lienPosition?: string;
  paymentFrequency?: string;
  currentBalance?: number;
  modificationIndicator?: boolean;
  prepaymentPenalty?: number;
  delinquencyStatus?: number;
  repurchaseAmount?: number;
  demandResolutionDate?: string;
  repurchaser?: string;
  debtorCreditQuality?: string;
  collectionPeriodDays?: number;
  recoveryRatePercentage?: number;
  diversificationMetrics?: string;
}

// =========================================
// DIGITAL ASSETS
// =========================================

/**
 * Digital Tokenized Fund Product model
 * Blockchain-based tokenized investment funds
 */
export interface DigitalTokenizedFundProduct extends BaseProduct {
  assetName?: string;
  assetSymbol?: string;
  assetType?: string;
  issuer?: string;
  blockchainNetwork?: string;
  smartContractAddress?: string;
  issuanceDate?: string;
  totalSupply?: number;
  circulatingSupply?: number;
  nav?: number;
  fractionalizationEnabled?: boolean;
  complianceRules?: string;
  permissionControls?: string;
  embeddedRights?: string;
  provenanceHistoryEnabled?: boolean;
  tokenEconomics?: string;
  custodyArrangements?: string;
  upgradeGovernance?: string;
}

/**
 * Stablecoin Product model
 * Base interface for all stablecoin types
 */
export interface StablecoinProduct extends BaseProduct {
  assetName?: string;
  assetSymbol?: string;
  assetType?: string;
  issuer?: string;
  blockchainNetwork?: string;
  smartContractAddress?: string;
  issuanceDate?: string;
  totalSupply?: number;
  circulatingSupply?: number;
  pegValue?: number;
  fractionalizationEnabled?: boolean;
  complianceRules?: string;
  collateralType?: string;
  collateralRatio?: number;
  overcollateralizationThreshold?: number;
  liquidationTerms?: string;
  stabilityMechanism?: string;
  rebaseFrequency?: string;
  algorithmDescription?: string;
  embeddedRights?: string;
  provenanceHistoryEnabled?: boolean;
  collateralTypeEnum?: string;
  reserveManagementPolicy?: string;
  auditFrequency?: string;
  redemptionMechanism?: string;
  depegRiskMitigation?: string[];
}

/**
 * Specific Stablecoin Types 
 * (extending base stablecoin with type-specific features)
 */
export interface FiatBackedStablecoin extends StablecoinProduct {
  reserveAssets?: string[];
  reserveAuditFrequency?: string;
  reserveCustodian?: string;
  reserveInsurance?: boolean;
}

export interface CryptoBackedStablecoin extends StablecoinProduct {
  collateralAssets?: string[];
  minimumCollateralizationRatio?: number;
  liquidationPenalty?: number;
  oracleProvider?: string;
  interestRate?: number;
}

export interface CommodityBackedStablecoin extends StablecoinProduct {
  commodityType?: string;
  storageProvider?: string;
  physicalRedemption?: boolean;
  redemptionFee?: number;
  auditProvider?: string;
}

export interface AlgorithmicStablecoin extends StablecoinProduct {
  algorithmType?: string;
  secondaryTokenSymbol?: string;
  expansionMechanism?: string;
  contractionMechanism?: string;
  governanceToken?: string;
}

export interface RebasingStablecoin extends StablecoinProduct {
  rebaseFrequency?: string;
  rebaseOracle?: string;
  positiveRebaseLimit?: number;
  negativeRebaseLimit?: number;
  rebaseGovernance?: string;
}

// Helper type to map ProjectType to specific product interfaces
export type ProductTypeMap = {
  [ProjectType.STRUCTURED_PRODUCTS]: StructuredProduct;
  [ProjectType.EQUITY]: EquityProduct;
  [ProjectType.COMMODITIES]: CommoditiesProduct;
  [ProjectType.FUNDS_ETFS_ETPS]: FundProduct;
  [ProjectType.BONDS]: BondProduct;
  [ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES]: QuantitativeInvestmentStrategyProduct;
  [ProjectType.PRIVATE_EQUITY]: PrivateEquityProduct;
  [ProjectType.PRIVATE_DEBT]: PrivateDebtProduct;
  [ProjectType.REAL_ESTATE]: RealEstateProduct;
  [ProjectType.ENERGY]: EnergyProduct;
  [ProjectType.SOLAR_WIND_CLIMATE]: EnergyProduct;
  [ProjectType.INFRASTRUCTURE]: InfrastructureProduct;
  [ProjectType.COLLECTIBLES]: CollectiblesProduct;
  [ProjectType.RECEIVABLES]: AssetBackedProduct;
  [ProjectType.DIGITAL_TOKENISED_FUND]: DigitalTokenizedFundProduct;
  [ProjectType.FIAT_BACKED_STABLECOIN]: FiatBackedStablecoin;
  [ProjectType.CRYPTO_BACKED_STABLECOIN]: CryptoBackedStablecoin;
  [ProjectType.COMMODITY_BACKED_STABLECOIN]: CommodityBackedStablecoin;
  [ProjectType.ALGORITHMIC_STABLECOIN]: AlgorithmicStablecoin;
  [ProjectType.REBASING_STABLECOIN]: RebasingStablecoin;
};

// Type for any product
export type AnyProduct = 
  | StructuredProduct
  | EquityProduct
  | CommoditiesProduct
  | FundProduct
  | BondProduct
  | QuantitativeInvestmentStrategyProduct
  | PrivateEquityProduct
  | PrivateDebtProduct
  | RealEstateProduct
  | EnergyProduct
  | InfrastructureProduct
  | CollectiblesProduct
  | AssetBackedProduct
  | DigitalTokenizedFundProduct
  | FiatBackedStablecoin
  | CryptoBackedStablecoin
  | CommodityBackedStablecoin
  | AlgorithmicStablecoin
  | RebasingStablecoin;

/**
 * Lifecycle event types for product management
 */
export enum LifecycleEventType {
  ISSUANCE = 'issuance',
  MATURITY = 'maturity',
  REDEMPTION = 'redemption',
  CALL = 'call',
  RESET = 'reset',
  REBALANCE = 'rebalance',
  COUPON_PAYMENT = 'coupon_payment',
  DIVIDEND_PAYMENT = 'dividend_payment',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REBASE = 'rebase',
  LIQUIDATION = 'liquidation',
  DEPEG = 'depeg',
  BARRIER_HIT = 'barrier_hit',
  UPGRADE = 'upgrade',
  AUDIT = 'audit',
  VALUATION = 'valuation',
  CORPORATE_ACTION = 'corporate_action'
}

/**
 * Status values for lifecycle events
 */
export enum EventStatus {
  PENDING = 'Pending',
  SUCCESS = 'Success',
  FAILED = 'Failed',
  PROCESSING = 'Processing',
  CANCELLED = 'Cancelled'
}

/**
 * Product lifecycle event model
 */
export interface ProductLifecycleEvent {
  id: string;
  productId: string;
  productType: ProjectType;
  eventType: LifecycleEventType;
  eventDate: Date;
  quantity?: number;
  transactionHash?: string;
  actor?: string;
  details?: string;
  status: EventStatus;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Request to create a lifecycle event
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
  metadata?: {
    submissionId?: string;
    timestamp?: number;
    [key: string]: any;
  };
}

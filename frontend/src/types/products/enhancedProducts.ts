/**
 * Enhanced Product Types - Comprehensive implementation of all financial product categories
 * 
 * This file contains TypeScript interfaces for the 15 financial product categories
 * with full support for all terms and lifecycle management fields as specified in
 * the product database documentation.
 */

import { AnyProduct, BaseProduct, ProductLifecycleEvent, LifecycleEventType, EventStatus } from './productTypes';
import { ProjectType } from '../projects/projectTypes';

// =========================================
// ENHANCED PRODUCT INTERFACES
// =========================================

/**
 * Enhanced Structured Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedStructuredProduct extends BaseProduct {
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
  issueDate?: string | Date;
  maturityDate?: string | Date;
  eventHistory?: any;
  redemptionDate?: string | Date;
  valuationHistory?: any;
  monitoringTriggers?: any;
  // Enhanced fields
  targetAudience?: string;
  distributionStrategy?: string;
  riskRating?: number;
  complexFeatures?: {
    participationRate?: number;
    airbagFeature?: boolean;
    autocallableFlag?: boolean;
    softProtectionBarrier?: number;
    [key: string]: any;
  };
}

/**
 * Enhanced Equity Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedEquityProduct extends BaseProduct {
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
  ipoDate?: string | Date;
  delistingDate?: string | Date;
  corporateActionsHistory?: any;
  dividendPaymentDates?: (string | Date)[];
  acquisitionDisposalDate?: string | Date;
  // Enhanced fields
  votingRights?: string;
  dividendPolicy?: string;
  dilutionProtection?: string[];
  exitStrategy?: string;
  shareClass?: string;
  boardRepresentation?: boolean;
  preemptiveRights?: boolean;
  liquidationPreference?: number;
}

/**
 * Enhanced Commodities Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedCommoditiesProduct extends BaseProduct {
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
  contractIssueDate?: string | Date;
  expirationDate?: string | Date;
  rollHistory?: any;
  storageDeliveryCosts?: number;
  productionInventoryLevels?: number[];
  targetRaise?: number;
  // Enhanced fields
  contangoBackwardation?: string;
  seasonalityFactors?: string[];
  producingRegions?: string[];
  environmentalCompliance?: string;
  storageLocation?: string;
  transportationCosts?: number;
  qualityAssessmentMethod?: string;
}

/**
 * Enhanced Fund Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedFundProduct extends BaseProduct {
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
  inceptionDate?: string | Date;
  closureLiquidationDate?: string | Date;
  creationRedemptionHistory?: any;
  performanceHistory?: any;
  flowData?: any;
  // Enhanced fields
  investmentStrategy?: string;
  fundManager?: string;
  fundManagerHistory?: any;
  minimumInvestment?: number;
  lockupPeriod?: number;
  redemptionTerms?: string;
  shareClasses?: string[];
  performanceFee?: number;
  highWaterMark?: boolean;
  sustainabilityRating?: number;
  esgIntegration?: string;
}

/**
 * Enhanced Bond Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedBondProduct extends BaseProduct {
  bondIdentifier?: string;
  issuerName?: string;
  couponRate?: number;
  faceValue?: number;
  creditRating?: string;
  bondType?: string;
  callableFlag?: boolean;
  callPutDates?: (string | Date)[];
  yieldToMaturity?: number;
  duration?: number;
  currency?: string;
  issueDate?: string | Date;
  maturityDate?: string | Date;
  couponPaymentHistory?: any;
  redemptionCallDate?: string | Date;
  accruedInterest?: number;
  // Enhanced fields
  couponFrequency?: string;
  securityCollateral?: string;
  callableFeatures?: string;
  callDate?: string | Date;
  callPrice?: number;
  convexity?: number;
  covenants?: string[];
  issuerSector?: string;
  subordination?: string;
  ratingAgencies?: string[];
  yieldToWorst?: number;
  spreadOverTreasury?: number;
}

/**
 * Enhanced Quantitative Investment Strategy Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedQuantitativeInvestmentStrategyProduct extends BaseProduct {
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
  inceptionDate?: string | Date;
  terminationDate?: string | Date;
  backtestHistory?: any;
  adjustmentHistory?: any;
  performanceAttribution?: any;
  // Enhanced fields
  algorithmDescription?: string;
  factorExposures?: any;
  rebalancingFrequency?: string;
  executionStrategy?: string;
  dataFrequency?: string;
  confidenceIntervals?: any;
  backtestPeriod?: {
    start: string | Date;
    end: string | Date;
  };
  modelValidationMethod?: string;
  optimizationObjective?: string;
  riskConstraints?: any;
}

/**
 * Enhanced Private Equity Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedPrivateEquityProduct extends BaseProduct {
  fundId?: string;
  fundName?: string;
  fundType?: string;
  fundSize?: number;
  formationDate?: string | Date;
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
  investmentDate?: string | Date;
  exitDate?: string | Date;
  exitMechanism?: string;
  portfolioCompanyId?: string;
  stageOfDevelopment?: string;
  financingRound?: string;
  investmentAmount?: number;
  valuationPreMoney?: number;
  valuationPostMoney?: number;
  ownershipPercentage?: number;
  investorType?: string;
  // Enhanced fields
  fundVintageYear?: string;
  investmentStage?: string;
  sectorFocus?: string;
  geographicFocus?: string;
  clawbackProvision?: boolean;
  keyPersonProvision?: boolean;
  investmentPeriod?: number;
  totalTermYears?: number;
  gpCommitment?: number;
  lpCommitment?: number;
  waterfall?: string;
  valuationMethodology?: string;
}

/**
 * Enhanced Private Debt Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedPrivateDebtProduct extends BaseProduct {
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
  executionDate?: string | Date;
  portfolioPerformanceMetrics?: any;
  complianceStatus?: string;
  monitoringFrequency?: number;
  advisoryServiceType?: string;
  exitStrategyStatus?: string;
  outcome?: string;
  // Enhanced fields
  debtTerm?: number;
  amortizationSchedule?: string;
  interestRateType?: string;
  baseRate?: number;
  margin?: number;
  effectiveInterestRate?: number;
  covenants?: string[];
  securityPackage?: string[];
  prePaymentTerms?: string;
  defaultProtections?: string[];
  guarantees?: string[];
  subordination?: string;
  crossDefault?: boolean;
  // Additional fields from the database schema
  debtorCreditQuality?: string;
  collectionPeriodDays?: number;
  recoveryRatePercentage?: number;
  diversificationMetrics?: any;
}

/**
 * Enhanced Real Estate Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedRealEstateProduct extends BaseProduct {
  propertyId?: string;
  propertyName?: string;
  propertyAddress?: string;
  propertyType?: string;
  acquisitionDate?: string | Date;
  building?: string;
  unit?: string;
  areaType?: string;
  units?: number;
  leaseNumber?: string;
  tenant?: string;
  leaseBeginDate?: string | Date;
  leaseEndDate?: string | Date;
  leaseManager?: string;
  leaseClassification?: string;
  borrowingRate?: number;
  assetNumber?: string;
  grossAmount?: number;
  taxableAmount?: number;
  billingFrequency?: string;
  startingDate?: string | Date;
  endingDate?: string | Date;
  dispositionDate?: string | Date;
  // Enhanced fields
  geographicLocation?: string;
  developmentStage?: string;
  environmentalCertifications?: string;
  occupancyRate?: number;
  netOperatingIncome?: number;
  capRate?: number;
  grossRentMultiplier?: number;
  propertyManagementCompany?: string;
  constructionYear?: number;
  renovationYear?: number;
  squareFootage?: number;
  zoning?: string;
  amenities?: string[];
  propertyTaxes?: number;
}

/**
 * Enhanced Energy Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedEnergyProduct extends BaseProduct {
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
  expectedOnlineDate?: string | Date;
  financialData?: any;
  regulatoryCompliance?: string;
  timelineData?: any;
  fieldServiceLogs?: string;
  performanceMetrics?: any;
  receivableAmount?: number;
  decommissionDate?: string | Date;
  // Enhanced fields
  projectCapacityMw?: number;
  powerPurchaseAgreements?: string;
  regulatoryApprovals?: string;
  carbonOffsetPotential?: string;
  energyStorageCapacity?: number;
  gridConnectionDetails?: string;
  capacityFactor?: number;
  equipmentManufacturer?: string;
  operationalExpenses?: number;
  subsidyEligibility?: string;
  energyYieldAssessment?: any;
  financingStructure?: string;
  maintenanceSchedule?: any;
  environmentalImpactAssessment?: string;
}

/**
 * Enhanced Infrastructure Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedInfrastructureProduct extends BaseProduct {
  assetId?: string;
  assetType?: string;
  designDate?: string | Date;
  procurementDate?: string | Date;
  conditionScore?: number;
  age?: number;
  maintenanceBacklog?: number;
  performanceMetrics?: any;
  meanTimeBetweenFailure?: number;
  rehabilitationDate?: string | Date;
  replacementDate?: string | Date;
  costOfReplacement?: number;
  inspectionDate?: string | Date;
  safetyIncidents?: number;
  // Enhanced fields
  publicPrivatePartnership?: boolean;
  concessionPeriod?: number;
  revenueModel?: string;
  publicAuthority?: string;
  capacityUtilization?: number;
  criticalityRating?: number;
  downtime?: number;
  usageStatistics?: any;
  resilienceRating?: number;
  disasterRecoveryPlan?: string;
  accessibilityCompliance?: string;
  securityFeatures?: string[];
  lifeCycleCostAnalysis?: any;
}

/**
 * Enhanced Collectibles Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedCollectiblesProduct extends BaseProduct {
  assetId?: string;
  assetType?: string;
  description?: string;
  acquisitionDate?: string | Date;
  purchasePrice?: number;
  currentValue?: number;
  condition?: string;
  location?: string;
  owner?: string;
  insuranceDetails?: number;
  appraisalDate?: string | Date;
  saleDate?: string | Date;
  salePrice?: number;
  // Enhanced fields
  creator?: string;
  dateOfCreation?: string | Date;
  authenticityCertificate?: boolean;
  provenance?: string[];
  rarityIndex?: number;
  custodian?: string;
  storageConditions?: string;
  exhibitionHistory?: any;
  conservationHistory?: any;
  culturalSignificance?: string;
  expertOpinions?: any;
  restorationWork?: string;
  mediaAppearances?: string[];
}

/**
 * Enhanced Asset Backed Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedAssetBackedProduct extends BaseProduct {
  assetNumber?: string;
  assetType?: string;
  originationDate?: string | Date;
  originalAmount?: number;
  maturityDate?: string | Date;
  interestRate?: number;
  accrualType?: string;
  lienPosition?: string;
  paymentFrequency?: string;
  currentBalance?: number;
  modificationIndicator?: boolean;
  prepaymentPenalty?: number;
  delinquencyStatus?: number;
  repurchaseAmount?: number;
  demandResolutionDate?: string | Date;
  repurchaser?: string;
  // Enhanced fields
  debtorCreditQuality?: string;
  collectionPeriodDays?: number;
  recoveryRatePercentage?: number;
  diversificationMetrics?: any;
  underwritingCriteria?: string;
  servicingFee?: number;
  tranchingStructure?: any;
  subordinationLevel?: number;
  creditEnhancement?: string[];
  assetConcentrationLimits?: any;
  covenants?: string[];
  earlyAmortizationTriggers?: string[];
  reserveAccount?: number;
  advanceRate?: number;
}

/**
 * Enhanced Digital Tokenized Fund Product model
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedDigitalTokenizedFundProduct extends BaseProduct {
  assetName?: string;
  assetSymbol?: string;
  assetType?: string;
  issuer?: string;
  blockchainNetwork?: string;
  smartContractAddress?: string;
  issuanceDate?: string | Date;
  totalSupply?: number;
  circulatingSupply?: number;
  nav?: number;
  fractionalizationEnabled?: boolean;
  complianceRules?: string;
  permissionControls?: string;
  embeddedRights?: string;
  provenanceHistoryEnabled?: boolean;
  // Enhanced fields
  tokenEconomics?: string;
  custodyArrangements?: string;
  upgradeGovernance?: string;
  blockchainProtocol?: string;
  gasModel?: string;
  transactionCosts?: number;
  smartContractAuditor?: string;
  secondaryMarketExchanges?: string[];
  tokenStandard?: string;
  transferRestrictions?: string[];
  kyc_amlRequirements?: string;
  whitelistStatus?: boolean;
  dividendDistributionMechanism?: string;
  votingMechanism?: string;
  redemptionProcess?: string;
}

/**
 * Enhanced Stablecoin Product model - Base model for all stablecoin types
 * Comprehensive implementation with all terms and lifecycle fields
 */
export interface EnhancedStablecoinProduct extends BaseProduct {
  assetName?: string;
  assetSymbol?: string;
  assetType?: string;
  issuer?: string;
  blockchainNetwork?: string;
  smartContractAddress?: string;
  issuanceDate?: string | Date;
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
  // Enhanced fields
  collateralTypeEnum?: 'Fiat' | 'Crypto' | 'Commodity' | 'Algorithmic' | 'Hybrid' | 'None';
  reserveManagementPolicy?: string;
  auditFrequency?: string;
  redemptionMechanism?: string;
  depegRiskMitigation?: string[];
  blockchainFees?: number;
  gasOptimizations?: string;
  chainAuditor?: string;
  marketMakingStrategy?: string;
  emergencyShutdownProcedure?: string;
  governanceStructure?: string;
  transparencyMeasures?: string[];
  interoperability?: string[];
  // Type-specific fields that might be in the form
  reserveAssets?: string[];
  reserveAuditFrequency?: string;
  reserveCustodian?: string;
  reserveInsurance?: boolean;
  collateralAssets?: string[];
  minimumCollateralizationRatio?: number;
  liquidationPenalty?: number;
  oracleProvider?: string;
  physicalRedemption?: boolean;
  commodityType?: string;
  storageProvider?: string;
  redemptionFee?: number;
  auditProvider?: string;
}

/**
 * Enhanced Fiat-Backed Stablecoin
 * Comprehensive implementation with type-specific fields
 */
export interface EnhancedFiatBackedStablecoin extends EnhancedStablecoinProduct {
  // Fiat-backed specific
  reserveAssets?: string[];
  reserveAuditFrequency?: string;
  reserveCustodian?: string;
  reserveInsurance?: boolean;
  // Additional enhanced fields
  bankPartners?: string[];
  centralBankDigitalCurrencyIntegration?: boolean;
  jurisdictionalCompliance?: string[];
  depositProtection?: string;
  settlementTime?: string;
  interestBearing?: boolean;
  interestRate?: number;
  fiatCurrenciesSupported?: string[];
}

/**
 * Enhanced Crypto-Backed Stablecoin
 * Comprehensive implementation with type-specific fields
 */
export interface EnhancedCryptoBackedStablecoin extends EnhancedStablecoinProduct {
  // Crypto-backed specific
  collateralAssets?: string[];
  minimumCollateralizationRatio?: number;
  liquidationPenalty?: number;
  oracleProvider?: string;
  interestRate?: number;
  // Additional enhanced fields
  vaultMechanism?: string;
  liquidationAuction?: string;
  emergencyShutdown?: string;
  priceFeeds?: string[];
  stabilityFee?: number;
  savingsRate?: number;
  multiCollateralSupport?: boolean;
  governanceToken?: string;
  debtCeiling?: number;
}

/**
 * Enhanced Commodity-Backed Stablecoin
 * Comprehensive implementation with type-specific fields
 */
export interface EnhancedCommodityBackedStablecoin extends EnhancedStablecoinProduct {
  // Commodity-backed specific
  commodityType?: string;
  storageProvider?: string;
  physicalRedemption?: boolean;
  redemptionFee?: number;
  auditProvider?: string;
  // Additional enhanced fields
  insuranceProvider?: string;
  storageLocation?: string[];
  transportationPartners?: string[];
  qualityAssuranceProtocol?: string;
  refinementStandards?: string;
  allocationMethod?: string;
  commodityOrigin?: string[];
  ethicalSourcingCertification?: string;
  physicalDeliveryTerms?: string;
}

/**
 * Enhanced Algorithmic Stablecoin
 * Comprehensive implementation with type-specific fields
 */
export interface EnhancedAlgorithmicStablecoin extends EnhancedStablecoinProduct {
  // Algorithmic specific
  algorithmType?: string;
  secondaryTokenSymbol?: string;
  expansionMechanism?: string;
  contractionMechanism?: string;
  governanceToken?: string;
  // Additional enhanced fields
  bondsIssuance?: string;
  seigniorageDistribution?: string;
  oracleNetwork?: string[];
  stabilityParameters?: any;
  gameTheoryModel?: string;
  bootstrapMechanism?: string;
  arbitrageIncentives?: string;
  elasticSupplyModel?: string;
  demandPrediction?: string;
  volatilityControls?: string[];
}

/**
 * Enhanced Rebasing Stablecoin
 * Comprehensive implementation with type-specific fields
 */
export interface EnhancedRebasingStablecoin extends EnhancedStablecoinProduct {
  // Rebasing specific
  rebaseOracle?: string;
  positiveRebaseLimit?: number;
  negativeRebaseLimit?: number;
  rebaseGovernance?: string;
  // Additional enhanced fields
  rebaseFormula?: string;
  smoothingPeriod?: number;
  supplyAdjustmentDelay?: number;
  synchronizationMechanism?: string;
  targetDeviationThreshold?: number;
  priceDataSources?: string[];
  rebaseVotingMechanism?: string;
  staking?: string;
  nonRebasing?: boolean;
  transferAdjustments?: string;
}

/**
 * Stablecoin Collateral Asset
 * Tracks individual collateral assets for stablecoins
 */
export interface StablecoinCollateralAsset {
  id?: string;
  stablecoinId: string;
  collateralAsset: string;
  backingAmount: number;
  custodian?: string;
  auditor?: string;
  lastAuditDate?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Enhanced Product Lifecycle Event
 * Comprehensive implementation with additional fields
 */
export interface EnhancedProductLifecycleEvent extends ProductLifecycleEvent {
  previousState?: string;
  currentState?: string;
  changeReason?: string;
  approver?: string;
  documentation?: string;
  valueChange?: number;
  valueBefore?: number;
  valueAfter?: number;
  relatedEvents?: string[];
  riskImpact?: string;
  complianceChecks?: any;
  notificationsSent?: boolean;
  nextScheduledEvent?: string | Date;
}

/**
 * Enhanced lifecycle event request
 */
export interface EnhancedCreateLifecycleEventRequest {
  productId: string;
  productType: ProjectType;
  eventType: LifecycleEventType;
  eventDate?: Date;
  quantity?: number;
  transactionHash?: string;
  actor?: string;
  details?: string;
  // Enhanced fields
  previousState?: string;
  currentState?: string;
  changeReason?: string;
  approver?: string;
  documentation?: string;
  valueChange?: number;
  valueBefore?: number;
  valueAfter?: number;
  relatedEvents?: string[];
  riskImpact?: string;
  complianceChecks?: any;
  notificationsSent?: boolean;
  nextScheduledEvent?: string | Date;
}

/**
 * Enhanced Product Type Map - Maps project types to enhanced product interfaces
 */
export type EnhancedProductTypeMap = {
  [ProjectType.STRUCTURED_PRODUCTS]: EnhancedStructuredProduct;
  [ProjectType.EQUITY]: EnhancedEquityProduct;
  [ProjectType.COMMODITIES]: EnhancedCommoditiesProduct;
  [ProjectType.FUNDS_ETFS_ETPS]: EnhancedFundProduct;
  [ProjectType.BONDS]: EnhancedBondProduct;
  [ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES]: EnhancedQuantitativeInvestmentStrategyProduct;
  [ProjectType.PRIVATE_EQUITY]: EnhancedPrivateEquityProduct;
  [ProjectType.PRIVATE_DEBT]: EnhancedPrivateDebtProduct;
  [ProjectType.REAL_ESTATE]: EnhancedRealEstateProduct;
  [ProjectType.ENERGY]: EnhancedEnergyProduct;
  [ProjectType.SOLAR_WIND_CLIMATE]: EnhancedEnergyProduct;
  [ProjectType.INFRASTRUCTURE]: EnhancedInfrastructureProduct;
  [ProjectType.COLLECTIBLES]: EnhancedCollectiblesProduct;
  [ProjectType.RECEIVABLES]: EnhancedAssetBackedProduct;
  [ProjectType.DIGITAL_TOKENISED_FUND]: EnhancedDigitalTokenizedFundProduct;
  [ProjectType.FIAT_BACKED_STABLECOIN]: EnhancedFiatBackedStablecoin;
  [ProjectType.CRYPTO_BACKED_STABLECOIN]: EnhancedCryptoBackedStablecoin;
  [ProjectType.COMMODITY_BACKED_STABLECOIN]: EnhancedCommodityBackedStablecoin;
  [ProjectType.ALGORITHMIC_STABLECOIN]: EnhancedAlgorithmicStablecoin;
  [ProjectType.REBASING_STABLECOIN]: EnhancedRebasingStablecoin;
};

/**
 * Enhanced Any Product - Union type of all enhanced product interfaces
 */
export type EnhancedAnyProduct = 
  | EnhancedStructuredProduct
  | EnhancedEquityProduct
  | EnhancedCommoditiesProduct
  | EnhancedFundProduct
  | EnhancedBondProduct
  | EnhancedQuantitativeInvestmentStrategyProduct
  | EnhancedPrivateEquityProduct
  | EnhancedPrivateDebtProduct
  | EnhancedRealEstateProduct
  | EnhancedEnergyProduct
  | EnhancedInfrastructureProduct
  | EnhancedCollectiblesProduct
  | EnhancedAssetBackedProduct
  | EnhancedDigitalTokenizedFundProduct
  | EnhancedFiatBackedStablecoin
  | EnhancedCryptoBackedStablecoin
  | EnhancedCommodityBackedStablecoin
  | EnhancedAlgorithmicStablecoin
  | EnhancedRebasingStablecoin;

/**
 * Service interface for product lifecycle management
 */
export interface EnhancedProductLifecycleServiceInterface {
  createEvent(request: EnhancedCreateLifecycleEventRequest): Promise<EnhancedProductLifecycleEvent>;
  getEventsByProductId(productId: string): Promise<EnhancedProductLifecycleEvent[]>;
  getEventById(eventId: string): Promise<EnhancedProductLifecycleEvent>;
  updateEventStatus(eventId: string, status: EventStatus): Promise<EnhancedProductLifecycleEvent>;
  scheduleEvent(request: EnhancedCreateLifecycleEventRequest, scheduledDate: Date): Promise<EnhancedProductLifecycleEvent>;
  getUpcomingEvents(days: number): Promise<EnhancedProductLifecycleEvent[]>;
  cancelEvent(eventId: string, reason: string): Promise<EnhancedProductLifecycleEvent>;
}

/**
 * Service interface for product management
 */
export interface EnhancedProductServiceInterface<T extends EnhancedAnyProduct> {
  create(product: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  getById(id: string): Promise<T>;
  getByProjectId(projectId: string): Promise<T | null>;
  update(id: string, product: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  getLifecycleEvents(productId: string): Promise<EnhancedProductLifecycleEvent[]>;
  addLifecycleEvent(request: EnhancedCreateLifecycleEventRequest): Promise<EnhancedProductLifecycleEvent>;
  getCollateral?(productId: string): Promise<StablecoinCollateralAsset[]>;
  addCollateral?(collateral: Omit<StablecoinCollateralAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<StablecoinCollateralAsset>;
}

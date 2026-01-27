/**
 * On-Chain Metadata Types for Asset Tokenization
 * 
 * Comprehensive type definitions for all asset classes
 * Based on Chain Capital Token-2022 Metadata Specification v1.0.0
 * 
 * Size constraints: Target ~1KB per token metadata
 */

// ============================================================================
// UNIVERSAL TYPES
// ============================================================================

export type AssetClass = 
  | 'structured_product'
  | 'equity'
  | 'fixed_income'
  | 'fund'
  | 'commodity'
  | 'alternative'
  | 'digital_native';

export interface UniversalMetadata {
  assetClass: AssetClass;
  instrumentType: string;
  version?: string;
  issuer: string;
  jurisdiction: string;
  issueDate: string; // ISO 8601
  maturityDate?: string; // ISO 8601
  currency: string;
  decimals: string;
  prospectusUri?: string; // Arweave/IPFS
  termSheetUri?: string; // Arweave/IPFS
}

// ============================================================================
// STRUCTURED PRODUCTS
// ============================================================================

export interface AutocallableMetadata extends UniversalMetadata {
  assetClass: 'structured_product';
  instrumentType: 'autocallable';
  productSubtype: 'barrier' | 'phoenix' | 'worst-of';
  
  // Underlying
  underlying: string;
  underlyingName: string;
  initialPrice: string;
  
  // Autocallable Terms
  barrierLevel: string;
  knockInBarrier: string;
  protectionBarrier?: string;
  couponRate: string;
  couponType: 'fixed' | 'conditional' | 'memory';
  memoryFeature: 'true' | 'false';
  
  // Observation
  observationFreq: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  callType: 'american' | 'european' | 'bermudan';
  firstObsDate: string;
  finalObsDate: string;
  
  // Oracle & Pricing
  oracleProvider: 'pyth' | 'chainlink' | 'switchboard';
  oracleAddress: string;
  valuationMethod: 'end-of-day' | 'intraday';
  fixingTime: string;
  
  // Redemption
  redemptionVault: string;
  redemptionMethod: 'automatic' | 'manual';
  settlementDays: string;
  
  // Participation
  upsideParticipation: string;
  downsideParticipation: string;
  cap?: string;
}

export interface PrincipalProtectedNoteMetadata extends UniversalMetadata {
  assetClass: 'structured_product';
  instrumentType: 'principal_protected_note';
  
  // Protection
  protectionLevel: string; // % of notional
  protectionType: 'hard' | 'soft';
  
  // Underlying
  underlying: string;
  underlyingName: string;
  initialPrice: string;
  
  // Participation
  upsideParticipation: string;
  downsideProtection: string;
  capLevel?: string;
  
  // Oracle
  oracleProvider: 'pyth' | 'chainlink' | 'switchboard';
  oracleAddress: string;
  
  // Redemption
  redemptionVault: string;
  redemptionMethod: 'maturity-only' | 'early-redemption';
}

export interface ReverseConvertibleMetadata extends UniversalMetadata {
  assetClass: 'structured_product';
  instrumentType: 'reverse_convertible';
  
  // Underlying
  underlying: string;
  underlyingName: string;
  initialPrice: string;
  strikePrice: string;
  
  // Coupon
  couponRate: string;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  couponType: 'fixed' | 'conditional';
  
  // Conversion
  knockInBarrier: string;
  conversionRatio: string;
  barrierType: 'continuous' | 'discrete';
  
  // Observation
  observationType: 'continuous' | 'discrete';
  
  // Oracle
  oracleProvider: 'pyth' | 'chainlink' | 'switchboard';
  oracleAddress: string;
  
  // Settlement
  settlementType: 'physical' | 'cash';
  redemptionVault: string;
}

// ============================================================================
// EQUITY SECURITIES
// ============================================================================

export interface CommonStockMetadata extends UniversalMetadata {
  assetClass: 'equity';
  instrumentType: 'common_stock';
  securityType: 'public' | 'private';
  
  // Company
  companyName: string;
  ticker?: string;
  cusip?: string;
  isin?: string;
  exchange?: string;
  
  // Valuation
  valuationMethod: 'mark_to_market' | 'dcf' | 'comparable';
  oracleProvider?: 'pyth' | 'chainlink' | 'manual';
  oracleAddress?: string;
  
  // Dividends
  dividendYield?: string;
  dividendFrequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  exDividendDate?: string;
  
  // Rights
  votingRights: 'true' | 'false';
  sharesOutstanding?: string;
}

export interface PrivateEquityMetadata extends UniversalMetadata {
  assetClass: 'equity';
  instrumentType: 'private_equity';
  securityType: 'preferred' | 'common';
  fundingRound?: 'seed' | 'series-a' | 'series-b' | 'series-c' | 'series-d';
  
  // Company
  companyName: string;
  sector: string;
  foundedYear?: string;
  
  // Valuation
  valuationMethod: 'dcf' | '409a' | 'comparable';
  fairMarketValue: string;
  lastRoundPrice?: string;
  lastRoundDate?: string;
  
  // Rights
  liquidationPreference?: string;
  participationRights: 'true' | 'false';
  votingRights: 'true' | 'false';
  proRataRights: 'true' | 'false';
  dragAlongRights: 'true' | 'false';
  
  // Restrictions
  lockupPeriod?: string; // Days
  transferRestrictions?: string;
  
  // Documents
  articlesUri?: string;
  shareholderAgreementUri?: string;
}

// ============================================================================
// FIXED INCOME
// ============================================================================

export interface CorporateBondMetadata extends UniversalMetadata {
  assetClass: 'fixed_income';
  instrumentType: 'corporate_bond';
  bondType: 'senior_unsecured' | 'senior_secured' | 'subordinated' | 'convertible';
  
  // Issuer
  cusip?: string;
  isin?: string;
  creditRating: string;
  
  // Bond Terms
  parValue: string;
  couponRate: string;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  
  // Valuation
  valuationMethod: 'ytm' | 'mark_to_market';
  currentYield?: string;
  durationYears?: string;
  
  // Payment
  paymentDates?: string; // Abbreviated schedule
  accruedInterest?: string;
  
  // Features
  callable: 'true' | 'false';
  putable: 'true' | 'false';
  callDate?: string;
  callPrice?: string;
  
  // Settlement
  settlementDays: string;
  paymentVault?: string;
  
  // Documents
  indentureUri?: string;
}

export interface GovernmentBondMetadata extends UniversalMetadata {
  assetClass: 'fixed_income';
  instrumentType: 'government_bond';
  bondType: 'treasury_note' | 'treasury_bond' | 'treasury_bill' | 'municipal';
  
  // Issuer
  cusip?: string;
  isin?: string;
  creditRating: string;
  
  // Bond Terms
  parValue: string;
  couponRate: string;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  
  // Valuation
  valuationMethod: 'ytm' | 'discount';
  benchmarkSpread?: string;
  
  // Settlement
  settlementDays: string;
  paymentVault?: string;
}

export interface CommercialPaperMetadata extends UniversalMetadata {
  assetClass: 'fixed_income';
  instrumentType: 'commercial_paper';
  cpType: 'secured' | 'unsecured';
  
  // Issuer
  creditRating: string; // Short-term rating
  
  // Terms
  parValue: string;
  discountRate: string;
  maturityDays: string;
  
  // Valuation
  valuationMethod: 'discount';
  currentPrice: string;
  
  // Settlement
  settlementDays: string;
  redemptionVault: string;
}

export interface CreditLinkedNoteMetadata extends UniversalMetadata {
  assetClass: 'fixed_income';
  instrumentType: 'credit_linked_note';
  clnType: 'single_name' | 'basket' | 'index';
  
  // Reference Entity
  referenceEntity: string;
  referenceEntityLEI?: string;
  referenceObligation?: string;
  creditRating: string;
  
  // CLN Terms
  parValue: string;
  couponRate: string;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  
  // Credit Event
  creditEvents: string; // Comma-separated
  recoveryRate: string; // Expected %
  settlementMethod: 'cash' | 'physical';
  
  // Oracle
  oracleProvider?: 'chainlink' | 'manual';
  creditEventOracle?: string;
  
  // Redemption
  redemptionVault: string;
  settlementDays: string;
  
  // ISDA
  isdaDefinitions?: string; // Version
}

// ============================================================================
// FUNDS, ETFs, ETPs
// ============================================================================

export interface MutualFundMetadata extends UniversalMetadata {
  assetClass: 'fund';
  instrumentType: 'mutual_fund';
  fundType: 'open_end' | 'closed_end';
  category: string;
  
  // Fund Details
  fundManager: string;
  inceptionDate: string;
  fiscalYearEnd: string;
  
  // Valuation
  valuationMethod: 'nav';
  navFrequency: 'daily' | 'weekly' | 'monthly';
  navCalculationTime: string;
  currentNav: string;
  previousNav?: string;
  
  // Fees
  managementFee: string; // Annual %
  performanceFee?: string;
  entranceFee?: string;
  exitFee?: string;
  hurdleRate?: string;
  
  // Portfolio
  aum: string; // Assets under management
  sharesOutstanding: string;
  portfolioHoldings?: string;
  
  // Subscriptions/Redemptions
  subscriptionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  redemptionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  minInvestment?: string;
  redemptionNoticeDays?: string;
  
  // Documents
  factSheetUri?: string;
}

export interface ETFMetadata extends UniversalMetadata {
  assetClass: 'fund';
  instrumentType: 'etf';
  etfType: 'equity' | 'fixed_income' | 'commodity' | 'mixed';
  indexTracked?: string;
  
  // Trading
  exchange: string;
  primaryMarket: string;
  creationUnit: string;
  
  // Valuation
  valuationMethod: 'nav';
  navFrequency: 'intraday' | 'daily';
  iNavProvider?: string;
  currentNav: string;
  marketPrice?: string;
  premiumDiscount?: string;
  
  // Fees
  expenseRatio: string;
  managementFee: string;
  
  // Portfolio
  aum: string;
  holdingsCount: string;
  topHoldingPercent?: string;
  
  // Oracle
  oracleProvider?: 'pyth' | 'chainlink';
  oracleAddress?: string;
}

export interface ActivelyManagedCertificateMetadata extends UniversalMetadata {
  assetClass: 'fund';
  instrumentType: 'actively_managed_certificate';
  strategy: string;
  
  // Management
  portfolioManager: string;
  inceptionDate: string;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  
  // Valuation
  valuationMethod: 'nav';
  navFrequency: 'daily' | 'weekly';
  currentNav: string;
  
  // Fees
  managementFee: string;
  performanceFee?: string;
  hurdleRate?: string;
  
  // Portfolio Composition
  longExposure?: string;
  shortExposure?: string;
  netExposure?: string;
  leverage?: string;
  
  // Risk Metrics
  beta?: string;
  sharpeRatio?: string;
  volatility?: string;
  
  // Documents
  riskDisclosureUri?: string;
}

// ============================================================================
// COMMODITIES
// ============================================================================

export interface CommoditySpotMetadata extends UniversalMetadata {
  assetClass: 'commodity';
  instrumentType: 'commodity_spot';
  commodity: string;
  unit: string;
  
  // Details
  purity?: string;
  form: 'allocated' | 'unallocated';
  vault?: string;
  vaultAddress?: string;
  custodian: string;
  
  // Valuation
  valuationMethod: 'mark_to_market';
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddress: string;
  
  // Physical Backing
  backingRatio: string;
  totalPhysicalGrams?: string;
  auditFrequency?: 'monthly' | 'quarterly' | 'annual';
  lastAuditDate?: string;
  auditReportUri?: string;
  
  // Redemption
  physicalRedemption: 'true' | 'false';
  minRedemptionUnits?: string;
  redemptionFee?: string;
}

export interface CommodityFuturesMetadata extends UniversalMetadata {
  assetClass: 'commodity';
  instrumentType: 'commodity_futures';
  commodity: string;
  contract: string;
  
  // Contract Specs
  contractSize: string;
  tickSize: string;
  expiryDate: string;
  deliveryMonth: string;
  deliveryLocation?: string;
  
  // Pricing
  currentPrice: string;
  settlementPrice?: string;
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddress: string;
  
  // Margin
  initialMargin?: string;
  maintenanceMargin?: string;
  
  // Contango/Backwardation
  contango?: string; // % annualized
  nextContractPrice?: string;
  rollDate?: string;
  
  // Settlement
  settlementType: 'cash' | 'physical';
  finalSettlement?: string;
  
  // Exchange
  exchange?: string;
  contractSpecsUri?: string;
}

export interface TrackerCertificateMetadata extends UniversalMetadata {
  assetClass: 'commodity';
  instrumentType: 'tracker_certificate';
  trackerType: 'single' | 'basket' | 'index';
  
  // Composition
  basket?: string; // Abbreviated composition
  rebalanceFrequency?: 'monthly' | 'quarterly' | 'annual';
  lastRebalance?: string;
  
  // Valuation
  valuationMethod: 'nav';
  navFrequency: 'intraday' | 'daily';
  currentNav: string;
  
  // Fees
  managementFee: string;
  trackingError?: string;
  
  // Oracle
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddresses?: string; // Comma-separated
  
  // Redemption
  redemptionMethod: 'cash' | 'physical';
  redemptionVault?: string;
  
  // Documents
  basketCompositionUri?: string;
}

// ============================================================================
// ALTERNATIVE INVESTMENTS  
// ============================================================================

export interface VentureCapitalFundMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'private_equity';
  fundType: 'venture_capital';
  stage: 'seed' | 'early_stage' | 'growth' | 'late_stage';
  
  // Fund Details
  fundManager: string;
  vintageYear: string;
  fundSize: string;
  capitalCalled: string;
  distributedReturns: string;
  
  // Strategy
  sector: string;
  geography: string;
  checkSize?: string;
  targetCompanies?: string;
  
  // Fees & Carry
  managementFee: string;
  carriedInterest: string;
  hurdleRate: string;
  gpCommitment?: string;
  
  // Term
  fundLife: string; // Years
  investmentPeriod: string; // Years
  inceptionDate: string;
  expectedExit?: string;
  
  // Valuation
  valuationMethod: 'fair_market_value';
  lastValuationDate: string;
  currentNav: string;
  irr?: string;
  moic?: string;
  
  // Distributions
  distributionFrequency: 'as_realized' | 'quarterly';
  preferredReturn?: string;
  
  // Documents
  lpAgreementUri?: string;
  subscriptionDocsUri?: string;
}

export interface DirectLendingMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'private_debt';
  debtType: 'senior_secured' | 'mezzanine' | 'unitranche';
  borrowerType: 'sme' | 'corporate' | 'real_estate';
  
  // Portfolio
  loanCount: string;
  totalCommitment: string;
  outstandingPrincipal: string;
  weightedAvgMaturity: string;
  
  // Pricing
  interestRate: string; // e.g., "SOFR+550"
  currentSofr?: string;
  allInRate: string;
  paymentFrequency: 'monthly' | 'quarterly';
  
  // Credit Metrics
  weightedAvgLtv?: string;
  defaultRate?: string;
  recoveryRate?: string;
  creditRatingAvg?: string;
  
  // Collateral
  collateralType: string;
  collateralCoverage: string;
  
  // Valuation
  valuationMethod: 'model_based' | 'mark_to_market';
  currentNav: string;
  yieldToMaturity?: string;
  
  // Distributions
  distributionFrequency: 'monthly' | 'quarterly';
  lastDistribution?: string;
  annualizedYield: string;
  
  // Documents
  creditAgreementUri?: string;
}

export interface CommercialRealEstateMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'real_estate';
  propertyType: 'office' | 'retail' | 'industrial' | 'multifamily' | 'hotel';
  propertyClass: 'class_a' | 'class_b' | 'class_c';
  
  // Property Details
  propertyName: string;
  address: string;
  squareFeet: string;
  floors?: string;
  yearBuilt: string;
  yearRenovated?: string;
  
  // Financial Metrics
  purchasePrice: string;
  currentValue: string;
  ltv: string;
  debt: string;
  equity: string;
  
  // Operating Metrics
  occupancyRate: string;
  tenantCount?: string;
  avgLeaseYears?: string;
  annualNoi: string; // Net operating income
  capRate: string;
  
  // Valuation
  valuationMethod: 'cap_rate' | 'dcf';
  lastAppraisalDate: string;
  appraiserUri?: string;
  
  // Distributions
  distributionFrequency: 'monthly' | 'quarterly';
  annualizedYield: string;
  lastDistribution?: string;
  distributionPerToken?: string;
  
  // Tenants
  anchorTenants?: string; // Abbreviated
  
  // Documents
  propertyDeedsUri?: string;
  leaseSummaryUri?: string;
}

export interface REITMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'reit';
  reitType: 'equity' | 'mortgage' | 'hybrid';
  sector: string;
  
  // Portfolio Composition
  propertyCount: string;
  totalSquareFeet?: string;
  geography: string;
  propertyTypes?: string;
  
  // Financial Metrics
  aum: string;
  totalDebt: string;
  debtToEquity: string;
  occupancyRate: string;
  avgLeaseTerm?: string;
  
  // REIT-Specific
  ffo: string; // Funds from operations
  affo: string; // Adjusted FFO
  ffoPerShare: string;
  dividendYield: string;
  payoutRatio: string;
  
  // Valuation
  valuationMethod: 'nav';
  priceToNav?: string;
  currentNav: string;
  
  // Distributions
  distributionFrequency: 'monthly' | 'quarterly';
  lastDistribution?: string;
  annualizedDividend: string;
  
  // Legal
  reitQualified: 'true' | 'false';
}

export interface InfrastructureAssetMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'infrastructure';
  sector: 'transportation' | 'energy' | 'water' | 'telecom';
  assetType: string;
  
  // Project Details
  projectName: string;
  location: string;
  concessionStart?: string;
  concessionEnd?: string;
  concessionYears?: string;
  
  // Financial Structure
  projectValue: string;
  equityInvestment: string;
  debtFinancing: string;
  sponsorEquity?: string;
  
  // Revenue Model
  revenueType: string;
  annualRevenue: string;
  annualOpex: string;
  ebitda: string;
  debtService?: string;
  
  // Returns
  projectedIrr: string;
  projectedEquityMultiple?: string;
  cashYield: string;
  
  // Distributions
  distributionFrequency: 'monthly' | 'quarterly';
  distributionWaterfall?: string;
  lastDistribution?: string;
  
  // Risk
  trafficRisk?: string;
  regulatoryRisk?: string;
  competitionRisk?: string;
  
  // Documents
  concessionAgreementUri?: string;
}

export interface RenewableEnergyProjectMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'energy_asset';
  energyType: 'solar' | 'wind' | 'hydro' | 'geothermal';
  projectStage: 'development' | 'construction' | 'operational';
  
  // Project Details
  projectName: string;
  location: string;
  capacity: string; // MW
  codDate?: string; // Commercial operation date
  
  // Generation & Revenue
  annualMwhProduction?: string;
  capacityFactor?: string;
  ppaPrice?: string;
  ppaCounterparty?: string;
  ppaExpiryDate?: string;
  annualRevenue?: string;
  
  // Financial Metrics
  projectCost: string;
  equityInvested: string;
  debtFinancing: string;
  ltv?: string;
  
  // Returns
  projectedIrr: string;
  projectedEquityMultiple?: string;
  cashYield: string;
  paybackPeriod?: string;
  
  // Environmental
  co2AvoidedAnnually?: string;
  renewableCredits?: string;
  
  // Distributions
  distributionFrequency: 'monthly' | 'quarterly';
  lastDistribution?: string;
  distributionPerToken?: string;
  
  // Documents
  ppaUri?: string;
  interconnectionUri?: string;
}

export interface OilGasAssetMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'energy_asset';
  energyType: 'oil_gas';
  assetStage: 'producing' | 'development';
  
  // Asset Details
  projectName: string;
  location: string;
  wellCount?: string;
  acreage?: string;
  formation?: string;
  
  // Production
  oilProductionBpd?: string;
  gasProductionMcfd?: string;
  nglProductionBpd?: string;
  avgWellDeclineRate?: string;
  
  // Economics
  breakEvenPrice: string;
  currentOilPrice?: string;
  netbackPerBoe?: string;
  annualNetRevenue: string;
  opex: string;
  capitalBudget?: string;
  
  // Reserves
  provedReserves?: string;
  probableReserves?: string;
  reserveLife?: string;
  
  // Returns
  projectedIrr: string;
  cashYield: string;
  
  // Distributions
  distributionFrequency: 'monthly' | 'quarterly';
  distributionPerToken?: string;
  
  // Documents
  operatingAgreementUri?: string;
  reserveReportUri?: string;
}

export interface CollectibleMetadata extends UniversalMetadata {
  assetClass: 'alternative';
  instrumentType: 'collectible';
  collectibleType: 'fine_art' | 'wine' | 'classic_car' | 'rare_book';
  
  // Asset Details
  artist?: string;
  title: string;
  year?: string;
  
  // Provenance
  previousOwners?: string;
  lastSaleDate?: string;
  lastSalePrice?: string;
  currentAppraisal: string;
  appraiserName?: string;
  appraisalDate: string;
  
  // Custody & Insurance
  custodian: string;
  location: string;
  insuredValue: string;
  insuranceCarrier?: string;
  storageConditions?: string;
  
  // Tokenization
  totalTokens: string;
  pricePerToken: string;
  minimumInvestment?: string;
  
  // Liquidity & Exit
  lockupPeriod?: string; // Days
  exitStrategy: string;
  estimatedSaleDate?: string;
  estimatedSalePrice?: string;
  
  // Valuation
  valuationMethod: 'comparable_sales' | 'appraisal';
  lastValuation: string;
  valuationFrequency?: 'annual' | 'biannual';
  
  // Documents
  authenticationUri?: string;
  provenanceUri?: string;
  imageUri?: string;
}

// ============================================================================
// DIGITAL NATIVE ASSETS
// ============================================================================

export interface FiatBackedStablecoinMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'stablecoin_fiat';
  stablecoinType: 'fiat_backed';
  peggedCurrency: string;
  
  // Backing
  backingRatio: string;
  reserveType: string;
  reserveAssets?: string;
  custodian: string;
  custodianAddress?: string;
  
  // Attestation
  attestationFrequency: 'daily' | 'weekly' | 'monthly';
  auditor: string;
  lastAttestationDate: string;
  attestationUri?: string;
  
  // Supply
  totalSupply: string;
  circulatingSupply: string;
  
  // Redemption
  redemptionMethod: 'on_demand' | 'periodic';
  redemptionFee?: string;
  redemptionVault?: string;
  minRedemption?: string;
  
  // Oracle
  pegOracle?: string;
  oracleAddress?: string;
  currentPeg?: string;
  pegDeviation?: string;
  
  // Regulatory
  regulatoryStatus?: string;
  termsUri?: string;
}

export interface CryptoBackedStablecoinMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'stablecoin_crypto';
  stablecoinType: 'crypto_backed';
  peggedCurrency: string;
  
  // Collateral
  collateralRatio: string;
  collateralTypes?: string;
  minCollateralRatio: string;
  vaultAddress: string;
  
  // Liquidation
  liquidationPenalty: string;
  liquidationEngine?: string;
  auctionDuration?: string;
  
  // Stability Mechanism
  stabilityFee?: string;
  targetPeg: string;
  currentPeg: string;
  pegDeviation: string;
  
  // Oracle
  collateralOracles?: string;
  oracleProvider: 'pyth' | 'chainlink';
  pegOracle?: string;
  
  // Governance
  governanceToken?: string;
  daoAddress?: string;
  
  // Documents
  auditUri?: string;
}

export interface AlgorithmicStablecoinMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'stablecoin_algorithmic';
  stablecoinType: 'pure_algorithmic' | 'hybrid';
  peggedCurrency: string;
  
  // Mechanism
  mechanismType: 'seigniorage' | 'rebase' | 'dual_token';
  sharesToken?: string;
  bondsToken?: string;
  algorithmAddress?: string;
  
  // State
  currentPeg: string;
  expansionPhase?: 'true' | 'false';
  contractionPhase?: 'true' | 'false';
  
  // Supply Dynamics
  totalSupply: string;
  targetSupply?: string;
  dailyRebaseRate?: string;
  lastRebaseTime?: string;
  
  // Oracle
  pegOracle: string;
  oracleAddress?: string;
  oracleUpdateFreq?: string;
  
  // Governance
  governanceToken?: string;
  daoAddress?: string;
  proposalThreshold?: string;
  
  // Documents
  whitepaper?: string;
}

export interface RebasingStablecoinMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'stablecoin_rebasing';
  stablecoinType: 'elastic_supply';
  peggedCurrency: string;
  
  // Rebase Mechanism
  rebaseFrequency: 'hourly' | 'daily' | 'weekly';
  rebaseTime?: string;
  lastRebase?: string;
  lastRebaseRate?: string;
  rebaseHistory?: string;
  
  // Target
  targetPrice: string;
  currentPrice: string;
  rebaseThreshold: string;
  
  // Supply
  totalSupply: string;
  supplyChange24h?: string;
  
  // Oracle
  priceOracle: string;
  oracleAddress?: string;
  
  // Program
  rebaseProgram?: string;
  
  // Documents
  docsUri?: string;
}

export interface CommodityBackedStablecoinMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'stablecoin_commodity';
  stablecoinType: 'commodity_backed';
  backedCommodity: string;
  
  // Backing
  backingRatio: string;
  commodityUnit: string;
  tokensPerUnit: string;
  totalPhysicalGrams?: string;
  purity?: string;
  
  // Custody
  custodian: string;
  vaultLocation: string;
  vaultAddress?: string;
  insuranceValue?: string;
  
  // Audit
  auditFrequency: 'monthly' | 'quarterly' | 'annual';
  lastAuditDate: string;
  auditor: string;
  auditReportUri?: string;
  
  // Pricing
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddress: string;
  currentGoldPrice?: string;
  
  // Redemption
  physicalRedemption: 'true' | 'false';
  minRedemption?: string;
  redemptionFee?: string;
}

export interface CarbonCreditMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'carbon_credit';
  creditType: string; // VCS, Gold Standard, etc.
  methodology?: string;
  
  // Project Details
  projectName: string;
  projectId: string;
  location: string;
  projectType: string;
  hectares?: string;
  
  // Carbon Metrics
  co2ePerCredit: string;
  vintageYear: string;
  totalCredits: string;
  retiredCredits: string;
  remainingCredits: string;
  
  // Verification
  verifier: string;
  verificationDate: string;
  verificationStatus: string;
  certificationUri?: string;
  
  // Registry
  registry: string;
  registryId: string;
  serialNumberRange?: string;
  
  // Pricing
  currentPrice?: string;
  priceOracle?: string;
  
  // Retirement
  retirementMethod: 'on_chain' | 'registry';
  retirementProgram?: string;
  
  // Documents
  projectDocsUri?: string;
}

export interface RenewableEnergyCertificateMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'climate_finance';
  certificateType: 'srec' | 'rec' | 'go';
  
  // Generation Details
  projectName: string;
  projectId: string;
  location: string;
  energySource: 'solar' | 'wind' | 'hydro';
  capacity?: string;
  
  // Certificate Metrics
  mwhPerCredit: string;
  vintageYear: string;
  vintageQuarter?: string;
  generationDate: string;
  totalMwh: string;
  
  // Certification
  certifyingBody: string;
  registryId: string;
  verificationDate: string;
  certificationUri?: string;
  
  // Compliance
  complianceMarket?: string;
  complianceYear?: string;
  eligiblePrograms?: string;
  
  // Retirement
  retired: 'true' | 'false';
  retirementDate?: string;
  retirementProgram?: string;
  
  // Documents
  recAgreementUri?: string;
}

export interface InvoiceReceivableMetadata extends UniversalMetadata {
  assetClass: 'digital_native';
  instrumentType: 'invoice_receivable';
  receivableType: string; // medicaid, commercial, etc.
  
  // Pool Composition
  invoiceCount: string;
  totalFaceValue: string;
  discountRate: string;
  purchasePrice: string;
  
  // Payer Details
  primaryPayer: string;
  payerState?: string;
  payerCreditRating?: string;
  defaultHistory?: string;
  
  // Receivables Stats
  weightedAvgMaturity: string; // Days
  oldestInvoice?: string;
  newestInvoice?: string;
  avgInvoiceSize?: string;
  
  // Performance
  expectedRecovery: string;
  expectedLoss: string;
  historicRecovery?: string;
  avgCollectionDays?: string;
  
  // Cash Flow
  monthlyRepayments?: 'true' | 'false';
  projectedCashflow?: string;
  accelerationClause?: 'true' | 'false';
  
  // Returns
  annualizedYield: string;
  irr?: string;
  paybackPeriod?: string;
  
  // Servicing
  servicer: string;
  servicingFee?: string;
  collectionMethod?: string;
  
  // Documents
  purchaseAgreementUri?: string;
  servicingAgreementUri?: string;
}

// ============================================================================
// METADATA VALIDATION
// ============================================================================

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedSize: number;
}

export interface MetadataConstraints {
  name: number;
  symbol: number;
  uri: number;
  additionalMetadata: {
    maxFields: number;
    maxKeyLength: number;
    maxValueLength: number;
    totalSize: number;
  };
}

export const TOKEN2022_METADATA_CONSTRAINTS: MetadataConstraints = {
  name: 32,
  symbol: 10,
  uri: 200,
  additionalMetadata: {
    maxFields: 20,
    maxKeyLength: 32,
    maxValueLength: 128,
    totalSize: 1024
  }
};

// ============================================================================
// BUILDER RESULT
// ============================================================================

export interface OnChainMetadataResult {
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata: Map<string, string>;
  validation: MetadataValidationResult;
}

// ============================================================================
// BUILDER INPUT TYPES
// ============================================================================

export type MetadataInput = 
  // Structured Products
  | AutocallableInput
  | PrincipalProtectedNoteInput
  | ReverseConvertibleInput
  // Equity
  | CommonStockInput
  | PrivateEquityInput
  // Fixed Income
  | CorporateBondInput
  | GovernmentBondInput
  | CommercialPaperInput
  | CreditLinkedNoteInput
  // Funds
  | MutualFundInput
  | ETFInput
  | ActivelyManagedCertificateInput
  // Commodities
  | CommoditySpotInput
  | CommodityFuturesInput
  | TrackerCertificateInput
  // Alternatives
  | VentureCapitalFundInput
  | DirectLendingInput
  | CommercialRealEstateInput
  | REITInput
  | InfrastructureAssetInput
  | RenewableEnergyProjectInput
  | OilGasAssetInput
  | CollectibleInput
  // Digital Native
  | FiatBackedStablecoinInput
  | CryptoBackedStablecoinInput
  | AlgorithmicStablecoinInput
  | RebasingStablecoinInput
  | CommodityBackedStablecoinInput
  | CarbonCreditInput
  | RenewableEnergyCertificateInput
  | InvoiceReceivableInput
  // Generic
  | GenericInput;

// ============================================================================
// INPUT TYPE DEFINITIONS (for builder)
// ============================================================================

// Base input interface
interface BaseInput {
  type: string;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  issuer: string;
  jurisdiction: string;
  issueDate: string;
  maturityDate?: string;
  currency: string;
  prospectusUri?: string;
  termSheetUri?: string;
}

// Structured Products Inputs
export interface AutocallableInput extends BaseInput {
  type: 'autocallable';
  productSubtype: 'barrier' | 'phoenix' | 'worst-of';
  underlying: string;
  underlyingName: string;
  initialPrice: number;
  barrierLevel: number;
  knockInBarrier: number;
  protectionBarrier?: number;
  couponRate: number;
  couponType: 'fixed' | 'conditional' | 'memory';
  memoryFeature: boolean;
  observationFreq: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  callType: 'american' | 'european' | 'bermudan';
  firstObsDate: string;
  finalObsDate: string;
  oracleProvider: 'pyth' | 'chainlink' | 'switchboard';
  oracleAddress: string;
  valuationMethod: 'end-of-day' | 'intraday';
  fixingTime: string;
  redemptionVault: string;
  redemptionMethod: 'automatic' | 'manual';
  settlementDays: number;
  upsideParticipation: number;
  downsideParticipation: number;
  cap?: number;
}

export interface PrincipalProtectedNoteInput extends BaseInput {
  type: 'principal_protected_note';
  protectionLevel: number;
  protectionType: 'hard' | 'soft';
  underlying: string;
  underlyingName: string;
  initialPrice: number;
  upsideParticipation: number;
  downsideProtection: number;
  capLevel?: number;
  oracleProvider: 'pyth' | 'chainlink' | 'switchboard';
  oracleAddress: string;
  redemptionVault: string;
  redemptionMethod: 'maturity-only' | 'early-redemption';
}

export interface ReverseConvertibleInput extends BaseInput {
  type: 'reverse_convertible';
  underlying: string;
  underlyingName: string;
  initialPrice: number;
  strikePrice: number;
  couponRate: number;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  couponType: 'fixed' | 'conditional';
  knockInBarrier: number;
  conversionRatio: number;
  barrierType: 'continuous' | 'discrete';
  observationType: 'continuous' | 'discrete';
  oracleProvider: 'pyth' | 'chainlink' | 'switchboard';
  oracleAddress: string;
  settlementType: 'physical' | 'cash';
  redemptionVault: string;
}

// Equity Inputs
export interface CommonStockInput extends BaseInput {
  type: 'common_stock';
  securityType: 'public' | 'private';
  companyName: string;
  ticker?: string;
  cusip?: string;
  isin?: string;
  exchange?: string;
  valuationMethod: 'mark_to_market' | 'dcf' | 'comparable';
  oracleProvider?: 'pyth' | 'chainlink' | 'manual';
  oracleAddress?: string;
  dividendYield?: number;
  dividendFrequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  exDividendDate?: string;
  votingRights: boolean;
  sharesOutstanding?: number;
}

export interface PrivateEquityInput extends BaseInput {
  type: 'private_equity';
  securityType: 'preferred' | 'common';
  fundingRound?: 'seed' | 'series-a' | 'series-b' | 'series-c' | 'series-d';
  companyName: string;
  sector: string;
  foundedYear?: string;
  valuationMethod: 'dcf' | '409a' | 'comparable';
  fairMarketValue: number;
  lastRoundPrice?: number;
  lastRoundDate?: string;
  liquidationPreference?: number;
  participationRights: boolean;
  votingRights: boolean;
  proRataRights: boolean;
  dragAlongRights: boolean;
  lockupPeriod?: number;
  transferRestrictions?: string;
  articlesUri?: string;
  shareholderAgreementUri?: string;
}

// Fixed Income Inputs
export interface CorporateBondInput extends BaseInput {
  type: 'corporate_bond';
  bondType: 'senior_unsecured' | 'senior_secured' | 'subordinated' | 'convertible';
  cusip?: string;
  isin?: string;
  creditRating: string;
  parValue: number;
  couponRate: number;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  valuationMethod: 'ytm' | 'mark_to_market';
  currentYield?: number;
  durationYears?: number;
  paymentDates?: string;
  accruedInterest?: string;
  callable: boolean;
  putable: boolean;
  callDate?: string;
  callPrice?: number;
  settlementDays: number;
  paymentVault?: string;
  indentureUri?: string;
}

export interface GovernmentBondInput extends BaseInput {
  type: 'government_bond';
  bondType: 'treasury_note' | 'treasury_bond' | 'treasury_bill' | 'municipal';
  cusip?: string;
  isin?: string;
  creditRating: string;
  parValue: number;
  couponRate: number;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  valuationMethod: 'ytm' | 'discount';
  benchmarkSpread?: number;
  settlementDays: number;
  paymentVault?: string;
}

export interface CommercialPaperInput extends BaseInput {
  type: 'commercial_paper';
  cpType: 'secured' | 'unsecured';
  creditRating: string;
  parValue: number;
  discountRate: number;
  maturityDays: number;
  valuationMethod: 'discount';
  currentPrice: number;
  settlementDays: number;
  redemptionVault: string;
}

export interface CreditLinkedNoteInput extends BaseInput {
  type: 'credit_linked_note';
  clnType: 'single_name' | 'basket' | 'index';
  referenceEntity: string;
  referenceEntityLEI?: string;
  referenceObligation?: string;
  creditRating: string;
  parValue: number;
  couponRate: number;
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  creditEvents: string;
  recoveryRate: number;
  settlementMethod: 'cash' | 'physical';
  oracleProvider?: 'chainlink' | 'manual';
  creditEventOracle?: string;
  redemptionVault: string;
  settlementDays: number;
  isdaDefinitions?: string;
}

// Fund Inputs
export interface MutualFundInput extends BaseInput {
  type: 'mutual_fund';
  fundType: 'open_end' | 'closed_end';
  category: string;
  fundManager: string;
  inceptionDate: string;
  fiscalYearEnd: string;
  valuationMethod: 'nav';
  navFrequency: 'daily' | 'weekly' | 'monthly';
  navCalculationTime: string;
  currentNav: number;
  previousNav?: number;
  managementFee: number;
  performanceFee?: number;
  entranceFee?: number;
  exitFee?: number;
  hurdleRate?: number;
  aum: number;
  sharesOutstanding: number;
  portfolioHoldings?: number;
  subscriptionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  redemptionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  minInvestment?: number;
  redemptionNoticeDays?: number;
  factSheetUri?: string;
}

export interface ETFInput extends BaseInput {
  type: 'etf';
  etfType: 'equity' | 'fixed_income' | 'commodity' | 'mixed';
  indexTracked?: string;
  exchange: string;
  primaryMarket: string;
  creationUnit: number;
  valuationMethod: 'nav';
  navFrequency: 'intraday' | 'daily';
  iNavProvider?: string;
  currentNav: number;
  marketPrice?: number;
  premiumDiscount?: number;
  expenseRatio: number;
  managementFee: number;
  aum: number;
  holdingsCount: number;
  topHoldingPercent?: number;
  oracleProvider?: 'pyth' | 'chainlink';
  oracleAddress?: string;
}

export interface ActivelyManagedCertificateInput extends BaseInput {
  type: 'actively_managed_certificate';
  strategy: string;
  portfolioManager: string;
  inceptionDate: string;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  valuationMethod: 'nav';
  navFrequency: 'daily' | 'weekly';
  currentNav: number;
  managementFee: number;
  performanceFee?: number;
  hurdleRate?: number;
  longExposure?: number;
  shortExposure?: number;
  netExposure?: number;
  leverage?: string;
  beta?: number;
  sharpeRatio?: number;
  volatility?: number;
  riskDisclosureUri?: string;
}

// Commodity Inputs
export interface CommoditySpotInput extends BaseInput {
  type: 'commodity_spot';
  commodity: string;
  unit: string;
  purity?: string;
  form: 'allocated' | 'unallocated';
  vault?: string;
  vaultAddress?: string;
  custodian: string;
  valuationMethod: 'mark_to_market';
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddress: string;
  backingRatio: number;
  totalPhysicalGrams?: number;
  auditFrequency?: 'monthly' | 'quarterly' | 'annual';
  lastAuditDate?: string;
  auditReportUri?: string;
  physicalRedemption: boolean;
  minRedemptionUnits?: number;
  redemptionFee?: number;
}

export interface CommodityFuturesInput extends BaseInput {
  type: 'commodity_futures';
  commodity: string;
  contract: string;
  contractSize: number;
  tickSize: number;
  expiryDate: string;
  deliveryMonth: string;
  deliveryLocation?: string;
  currentPrice: number;
  settlementPrice?: number;
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddress: string;
  initialMargin?: number;
  maintenanceMargin?: number;
  contango?: number;
  nextContractPrice?: number;
  rollDate?: string;
  settlementType: 'cash' | 'physical';
  finalSettlement?: string;
  exchange?: string;
  contractSpecsUri?: string;
}

export interface TrackerCertificateInput extends BaseInput {
  type: 'tracker_certificate';
  trackerType: 'single' | 'basket' | 'index';
  basket?: string;
  rebalanceFrequency?: 'monthly' | 'quarterly' | 'annual';
  lastRebalance?: string;
  valuationMethod: 'nav';
  navFrequency: 'intraday' | 'daily';
  currentNav: number;
  managementFee: number;
  trackingError?: number;
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddresses?: string;
  redemptionMethod: 'cash' | 'physical';
  redemptionVault?: string;
  basketCompositionUri?: string;
}

// Alternative Inputs
export interface VentureCapitalFundInput extends BaseInput {
  type: 'venture_capital_fund';
  fundType: 'venture_capital';
  stage: 'seed' | 'early_stage' | 'growth' | 'late_stage';
  fundManager: string;
  vintageYear: string;
  fundSize: number;
  capitalCalled: number;
  distributedReturns: number;
  sector: string;
  geography: string;
  checkSize?: string;
  targetCompanies?: string;
  managementFee: number;
  carriedInterest: number;
  hurdleRate: number;
  gpCommitment?: number;
  fundLife: number;
  investmentPeriod: number;
  inceptionDate: string;
  expectedExit?: string;
  valuationMethod: 'fair_market_value';
  lastValuationDate: string;
  currentNav: number;
  irr?: number;
  moic?: number;
  distributionFrequency: 'as_realized' | 'quarterly';
  preferredReturn?: number;
  lpAgreementUri?: string;
  subscriptionDocsUri?: string;
}

export interface DirectLendingInput extends BaseInput {
  type: 'direct_lending';
  debtType: 'senior_secured' | 'mezzanine' | 'unitranche';
  borrowerType: 'sme' | 'corporate' | 'real_estate';
  loanCount: number;
  totalCommitment: number;
  outstandingPrincipal: number;
  weightedAvgMaturity: number;
  interestRate: string;
  currentSofr?: number;
  allInRate: number;
  paymentFrequency: 'monthly' | 'quarterly';
  weightedAvgLtv?: number;
  defaultRate?: number;
  recoveryRate?: number;
  creditRatingAvg?: string;
  collateralType: string;
  collateralCoverage: number;
  valuationMethod: 'model_based' | 'mark_to_market';
  currentNav: number;
  yieldToMaturity?: number;
  distributionFrequency: 'monthly' | 'quarterly';
  lastDistribution?: string;
  annualizedYield: number;
  creditAgreementUri?: string;
}

export interface CommercialRealEstateInput extends BaseInput {
  type: 'commercial_real_estate';
  propertyType: 'office' | 'retail' | 'industrial' | 'multifamily' | 'hotel';
  propertyClass: 'class_a' | 'class_b' | 'class_c';
  propertyName: string;
  address: string;
  squareFeet: number;
  floors?: number;
  yearBuilt: string;
  yearRenovated?: string;
  purchasePrice: number;
  currentValue: number;
  ltv: number;
  debt: number;
  equity: number;
  occupancyRate: number;
  tenantCount?: number;
  avgLeaseYears?: number;
  annualNoi: number;
  capRate: number;
  valuationMethod: 'cap_rate' | 'dcf';
  lastAppraisalDate: string;
  appraiserUri?: string;
  distributionFrequency: 'monthly' | 'quarterly';
  annualizedYield: number;
  lastDistribution?: string;
  distributionPerToken?: number;
  anchorTenants?: string;
  propertyDeedsUri?: string;
  leaseSummaryUri?: string;
}

export interface REITInput extends BaseInput {
  type: 'reit';
  reitType: 'equity' | 'mortgage' | 'hybrid';
  sector: string;
  propertyCount: number;
  totalSquareFeet?: number;
  geography: string;
  propertyTypes?: string;
  aum: number;
  totalDebt: number;
  debtToEquity: number;
  occupancyRate: number;
  avgLeaseTerm?: number;
  ffo: number;
  affo: number;
  ffoPerShare: number;
  dividendYield: number;
  payoutRatio: number;
  valuationMethod: 'nav';
  priceToNav?: number;
  currentNav: number;
  distributionFrequency: 'monthly' | 'quarterly';
  lastDistribution?: string;
  annualizedDividend: number;
  reitQualified: boolean;
}

export interface InfrastructureAssetInput extends BaseInput {
  type: 'infrastructure';
  sector: 'transportation' | 'energy' | 'water' | 'telecom';
  assetType: string;
  projectName: string;
  location: string;
  concessionStart?: string;
  concessionEnd?: string;
  concessionYears?: number;
  projectValue: number;
  equityInvestment: number;
  debtFinancing: number;
  sponsorEquity?: number;
  revenueType: string;
  annualRevenue: number;
  annualOpex: number;
  ebitda: number;
  debtService?: number;
  projectedIrr: number;
  projectedEquityMultiple?: string;
  cashYield: number;
  distributionFrequency: 'monthly' | 'quarterly';
  distributionWaterfall?: string;
  lastDistribution?: string;
  trafficRisk?: string;
  regulatoryRisk?: string;
  competitionRisk?: string;
  concessionAgreementUri?: string;
}

export interface RenewableEnergyProjectInput extends BaseInput {
  type: 'renewable_energy_project';
  energyType: 'solar' | 'wind' | 'hydro' | 'geothermal';
  projectStage: 'development' | 'construction' | 'operational';
  projectName: string;
  location: string;
  capacity: number;
  codDate?: string;
  annualMwhProduction?: number;
  capacityFactor?: number;
  ppaPrice?: number;
  ppaCounterparty?: string;
  ppaExpiryDate?: string;
  annualRevenue?: number;
  projectCost: number;
  equityInvested: number;
  debtFinancing: number;
  ltv?: number;
  projectedIrr: number;
  projectedEquityMultiple?: string;
  cashYield: number;
  paybackPeriod?: number;
  co2AvoidedAnnually?: number;
  renewableCredits?: string;
  distributionFrequency: 'monthly' | 'quarterly';
  lastDistribution?: string;
  distributionPerToken?: number;
  ppaUri?: string;
  interconnectionUri?: string;
}

export interface OilGasAssetInput extends BaseInput {
  type: 'oil_gas_asset';
  energyType: 'oil_gas';
  assetStage: 'producing' | 'development';
  projectName: string;
  location: string;
  wellCount?: number;
  acreage?: number;
  formation?: string;
  oilProductionBpd?: number;
  gasProductionMcfd?: number;
  nglProductionBpd?: number;
  avgWellDeclineRate?: number;
  breakEvenPrice: number;
  currentOilPrice?: number;
  netbackPerBoe?: number;
  annualNetRevenue: number;
  opex: number;
  capitalBudget?: number;
  provedReserves?: number;
  probableReserves?: number;
  reserveLife?: number;
  projectedIrr: number;
  cashYield: number;
  distributionFrequency: 'monthly' | 'quarterly';
  distributionPerToken?: number;
  operatingAgreementUri?: string;
  reserveReportUri?: string;
}

export interface CollectibleInput extends BaseInput {
  type: 'collectible';
  collectibleType: 'fine_art' | 'wine' | 'classic_car' | 'rare_book';
  artist?: string;
  title: string;
  year?: string;
  previousOwners?: string;
  lastSaleDate?: string;
  lastSalePrice?: number;
  currentAppraisal: number;
  appraiserName?: string;
  appraisalDate: string;
  custodian: string;
  location: string;
  insuredValue: number;
  insuranceCarrier?: string;
  storageConditions?: string;
  totalTokens: number;
  pricePerToken: number;
  minimumInvestment?: number;
  lockupPeriod?: number;
  exitStrategy: string;
  estimatedSaleDate?: string;
  estimatedSalePrice?: number;
  valuationMethod: 'comparable_sales' | 'appraisal';
  lastValuation: number;
  valuationFrequency?: 'annual' | 'biannual';
  authenticationUri?: string;
  provenanceUri?: string;
  imageUri?: string;
}

// Digital Native Inputs
export interface FiatBackedStablecoinInput extends BaseInput {
  type: 'fiat_backed_stablecoin';
  stablecoinType: 'fiat_backed';
  peggedCurrency: string;
  backingRatio: number;
  reserveType: string;
  reserveAssets?: string;
  custodian: string;
  custodianAddress?: string;
  attestationFrequency: 'daily' | 'weekly' | 'monthly';
  auditor: string;
  lastAttestationDate: string;
  attestationUri?: string;
  totalSupply: number;
  circulatingSupply: number;
  redemptionMethod: 'on_demand' | 'periodic';
  redemptionFee?: number;
  redemptionVault?: string;
  minRedemption?: number;
  pegOracle?: string;
  oracleAddress?: string;
  currentPeg?: number;
  pegDeviation?: number;
  regulatoryStatus?: string;
  termsUri?: string;
}

export interface CryptoBackedStablecoinInput extends BaseInput {
  type: 'crypto_backed_stablecoin';
  stablecoinType: 'crypto_backed';
  peggedCurrency: string;
  collateralRatio: number;
  collateralTypes?: string;
  minCollateralRatio: number;
  vaultAddress: string;
  liquidationPenalty: number;
  liquidationEngine?: string;
  auctionDuration?: number;
  stabilityFee?: number;
  targetPeg: number;
  currentPeg: number;
  pegDeviation: number;
  collateralOracles?: string;
  oracleProvider: 'pyth' | 'chainlink';
  pegOracle?: string;
  governanceToken?: string;
  daoAddress?: string;
  auditUri?: string;
}

export interface AlgorithmicStablecoinInput extends BaseInput {
  type: 'algorithmic_stablecoin';
  stablecoinType: 'pure_algorithmic' | 'hybrid';
  peggedCurrency: string;
  mechanismType: 'seigniorage' | 'rebase' | 'dual_token';
  sharesToken?: string;
  bondsToken?: string;
  algorithmAddress?: string;
  currentPeg: number;
  expansionPhase?: boolean;
  contractionPhase?: boolean;
  totalSupply: number;
  targetSupply?: number;
  dailyRebaseRate?: number;
  lastRebaseTime?: string;
  pegOracle: string;
  oracleAddress?: string;
  oracleUpdateFreq?: number;
  governanceToken?: string;
  daoAddress?: string;
  proposalThreshold?: number;
  whitepaper?: string;
}

export interface RebasingStablecoinInput extends BaseInput {
  type: 'rebasing_stablecoin';
  stablecoinType: 'elastic_supply';
  peggedCurrency: string;
  rebaseFrequency: 'hourly' | 'daily' | 'weekly';
  rebaseTime?: string;
  lastRebase?: string;
  lastRebaseRate?: number;
  rebaseHistory?: string;
  targetPrice: number;
  currentPrice: number;
  rebaseThreshold: number;
  totalSupply: number;
  supplyChange24h?: number;
  priceOracle: string;
  oracleAddress?: string;
  rebaseProgram?: string;
  docsUri?: string;
}

export interface CommodityBackedStablecoinInput extends BaseInput {
  type: 'commodity_backed_stablecoin';
  stablecoinType: 'commodity_backed';
  backedCommodity: string;
  backingRatio: number;
  commodityUnit: string;
  tokensPerUnit: number;
  totalPhysicalGrams?: number;
  purity?: string;
  custodian: string;
  vaultLocation: string;
  vaultAddress?: string;
  insuranceValue?: number;
  auditFrequency: 'monthly' | 'quarterly' | 'annual';
  lastAuditDate: string;
  auditor: string;
  auditReportUri?: string;
  oracleProvider: 'pyth' | 'chainlink';
  oracleAddress: string;
  currentGoldPrice?: number;
  physicalRedemption: boolean;
  minRedemption?: number;
  redemptionFee?: number;
}

export interface CarbonCreditInput extends BaseInput {
  type: 'carbon_credit';
  creditType: string;
  methodology?: string;
  projectName: string;
  projectId: string;
  location: string;
  projectType: string;
  hectares?: number;
  co2ePerCredit: number;
  vintageYear: string;
  totalCredits: number;
  retiredCredits: number;
  remainingCredits: number;
  verifier: string;
  verificationDate: string;
  verificationStatus: string;
  certificationUri?: string;
  registry: string;
  registryId: string;
  serialNumberRange?: string;
  currentPrice?: number;
  priceOracle?: string;
  retirementMethod: 'on_chain' | 'registry';
  retirementProgram?: string;
  projectDocsUri?: string;
}

export interface RenewableEnergyCertificateInput extends BaseInput {
  type: 'renewable_energy_certificate';
  certificateType: 'srec' | 'rec' | 'go';
  projectName: string;
  projectId: string;
  location: string;
  energySource: 'solar' | 'wind' | 'hydro';
  capacity?: number;
  mwhPerCredit: number;
  vintageYear: string;
  vintageQuarter?: string;
  generationDate: string;
  totalMwh: number;
  certifyingBody: string;
  registryId: string;
  verificationDate: string;
  certificationUri?: string;
  complianceMarket?: string;
  complianceYear?: string;
  eligiblePrograms?: string;
  retired: boolean;
  retirementDate?: string;
  retirementProgram?: string;
  recAgreementUri?: string;
}

export interface InvoiceReceivableInput extends BaseInput {
  type: 'invoice_receivable';
  receivableType: string;
  invoiceCount: number;
  totalFaceValue: number;
  discountRate: number;
  purchasePrice: number;
  primaryPayer: string;
  payerState?: string;
  payerCreditRating?: string;
  defaultHistory?: number;
  weightedAvgMaturity: number;
  oldestInvoice?: number;
  newestInvoice?: number;
  avgInvoiceSize?: number;
  expectedRecovery: number;
  expectedLoss: number;
  historicRecovery?: number;
  avgCollectionDays?: number;
  monthlyRepayments?: boolean;
  projectedCashflow?: string;
  accelerationClause?: boolean;
  annualizedYield: number;
  irr?: number;
  paybackPeriod?: number;
  servicer: string;
  servicingFee?: number;
  collectionMethod?: string;
  purchaseAgreementUri?: string;
  servicingAgreementUri?: string;
}

// Generic Input
export interface GenericInput {
  type: 'generic';
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  assetClass: AssetClass;
  instrumentType: string;
  customFields: Record<string, string>;
}

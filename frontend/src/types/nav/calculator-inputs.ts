/**
 * Calculator-Specific Input Types
 * Domain-specific types that mirror backend calculator interfaces
 * NO MORE GENERIC SCHEMAS - These connect directly to backend domain logic
 */

import { AssetType } from './nav'

// ==================== BASE CALCULATION INPUT ====================

export interface BaseCalculationInput {
  assetId?: string
  productType?: AssetType
  projectId?: string
  valuationDate: Date
  targetCurrency?: string
  holdings?: AssetHolding[]
  fees?: number
  liabilities?: number
  sharesOutstanding?: number
}

export interface AssetHolding {
  instrumentKey: string
  quantity: number
  weight?: number
  costBasis?: number
  currency: string
  effectiveDate: Date
}

// ==================== BONDS CALCULATOR ====================

export interface BondCalculationInput extends BaseCalculationInput {
  // Bond-specific parameters from backend BondCalculator
  faceValue?: number
  couponRate?: number
  maturityDate?: Date
  issueDate?: Date
  paymentFrequency?: number // payments per year (2 = semi-annual, 4 = quarterly)
  creditRating?: string
  cusip?: string
  isin?: string
  yieldToMaturity?: number
  marketPrice?: number // as percentage of face value (e.g., 98.5)
  accruedInterest?: number
  sector?: string
  issuerType?: 'government' | 'corporate' | 'municipal' | 'supranational'
}

export interface BondFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Bond identification
  cusip?: string
  isin?: string
  bondName?: string
  issuer?: string

  // Bond characteristics
  faceValue: number
  couponRate: number
  maturityDate: Date
  issueDate: Date
  paymentFrequency: 2 | 4 | 12 // Semi-annual, quarterly, monthly
  creditRating: string
  issuerType: 'government' | 'corporate' | 'municipal' | 'supranational'

  // Market data
  marketPrice?: number
  yieldToMaturity?: number
  
  // Portfolio details
  quantity?: number
  sharesOutstanding?: number
}

// ==================== ASSET-BACKED SECURITIES ====================

export interface AssetBackedCalculationInput extends BaseCalculationInput {
  // Asset-backed security specific parameters from backend AssetBackedCalculator
  assetNumber?: string
  assetType?: string
  originalAmount?: number
  currentBalance?: number
  maturityDate?: Date
  interestRate?: number
  accrualType?: string
  lienPosition?: string
  paymentFrequency?: string
  delinquencyStatus?: number
  modificationIndicator?: boolean
  prepaymentPenalty?: number
  creditQuality?: string
  recoveryRate?: number
  servicerName?: string
  poolSize?: number
  subordinationLevel?: number
  creditEnhancement?: number
}

export interface AssetBackedFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Security identification
  assetNumber?: string
  securityName?: string
  underlyingAssetType?: string

  // Pool characteristics
  originalAmount: number
  currentBalance: number
  assetPoolValue: number
  poolSize?: number

  // Terms
  interestRate: number
  maturityDate: Date
  paymentFrequency: string
  lienPosition: 'senior' | 'subordinate'

  // Credit metrics
  creditRating?: string
  creditQuality: 'super_prime' | 'prime' | 'near_prime' | 'subprime' | 'deep_subprime'
  delinquencyStatus: number
  recoveryRate: number

  // Tranching
  subordinationLevel: number
  creditEnhancement: number

  // Servicing
  servicerName?: string
  
  // Portfolio details
  sharesOutstanding?: number
}

// ==================== EQUITY CALCULATOR ====================

export interface EquityCalculationInput extends BaseCalculationInput {
  // Equity-specific parameters
  tickerSymbol?: string
  exchange?: string
  marketCap?: number
  sharesOutstanding?: number
  lastTradePrice?: number
  bidPrice?: number
  askPrice?: number
  dividendYield?: number
  peRatio?: number
  sector?: string
  industry?: string
  beta?: number
}

export interface EquityFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Equity identification
  tickerSymbol: string
  companyName?: string
  exchange: string
  cusip?: string
  isin?: string

  // Market data
  lastTradePrice?: number
  bidPrice?: number
  askPrice?: number
  marketCap?: number

  // Company metrics
  sharesOutstanding: number
  dividendYield?: number
  peRatio?: number
  beta?: number

  // Classification
  sector?: string
  industry?: string
  
  // Portfolio details
  quantity: number
}

// ==================== MONEY MARKET FUND ====================

export interface MmfCalculationInput extends BaseCalculationInput {
  // MMF-specific parameters
  fundName?: string
  fundFamily?: string
  sevenDayYield?: number
  expenseRatio?: number
  averageMaturity?: number
  netAssets?: number
  pricePerShare?: number
  dividendRate?: number
  complianceType?: 'government' | 'prime' | 'municipal'
}

export interface MmfFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Fund identification
  fundName: string
  fundFamily?: string
  fundSymbol?: string

  // Fund characteristics
  sevenDayYield: number
  expenseRatio: number
  averageMaturity: number
  pricePerShare: number
  dividendRate?: number

  // Compliance
  complianceType: 'government' | 'prime' | 'municipal'
  
  // Assets
  netAssets: number
  sharesOutstanding: number
  
  // Portfolio details
  shareQuantity: number
}

// ==================== COMMODITIES CALCULATOR ====================

export interface CommoditiesCalculationInput extends BaseCalculationInput {
  commodityType?: string
  contractSize?: number
  deliveryMonth?: string
  deliveryYear?: number
  spotPrice?: number
  futuresPrice?: number
  storageCosting?: number
  convenienceYield?: number
  riskFreeRate?: number
  volatility?: number
}

export interface CommoditiesFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Commodity identification
  commodityType: string
  commoditySymbol?: string
  exchange?: string

  // Contract details
  contractSize: number
  deliveryMonth?: string
  deliveryYear?: number
  
  // Pricing
  spotPrice?: number
  futuresPrice?: number
  storageCosting: number
  convenienceYield?: number
  
  // Risk parameters
  volatility?: number
  riskFreeRate?: number
  
  // Portfolio details
  contractQuantity: number
}

// ==================== REAL ESTATE CALCULATOR ====================

export interface RealEstateCalculationInput extends BaseCalculationInput {
  propertyType?: string
  squareFootage?: number
  location?: string
  yearBuilt?: number
  lastAppraisalValue?: number
  appraisalDate?: Date
  rentalIncome?: number
  operatingExpenses?: number
  capRate?: number
  occupancyRate?: number
  marketRentPsf?: number
}

export interface RealEstateFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Property identification
  propertyAddress: string
  propertyType: 'office' | 'retail' | 'industrial' | 'multifamily' | 'hotel' | 'mixed_use'
  squareFootage: number
  location: string
  yearBuilt: number

  // Valuation inputs
  lastAppraisalValue?: number
  appraisalDate?: Date
  
  // Income approach
  annualRentalIncome: number
  operatingExpenses: number
  capRate: number
  occupancyRate: number
  marketRentPsf?: number
  
  // Portfolio details
  ownershipPercentage: number
}

// ==================== PRIVATE EQUITY CALCULATOR ====================

export interface PrivateEquityCalculationInput extends BaseCalculationInput {
  fundName?: string
  fundType?: string
  vintage?: number
  fundSize?: number
  commitmentAmount?: number
  calledAmount?: number
  distributedAmount?: number
  navReported?: number
  lastReportingDate?: Date
  generalPartner?: string
  investmentStrategy?: string
  geographicFocus?: string
  industryFocus?: string
  irr?: number
  multiple?: number
  dpi?: number
  rvpi?: number
  tvpi?: number
}

export interface PrivateEquityFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Fund identification
  fundName: string
  fundType: 'buyout' | 'growth' | 'venture' | 'distressed' | 'secondary' | 'fund_of_funds'
  vintage: number
  generalPartner: string
  
  // Fund characteristics
  fundSize: number
  commitmentAmount: number
  calledAmount: number
  distributedAmount?: number
  navReported?: number
  lastReportingDate?: Date
  
  // Strategy
  investmentStrategy: string
  geographicFocus?: string
  industryFocus?: string
  
  // Performance metrics
  irr?: number
  multiple?: number
  dpi?: number // Distributed to Paid-In
  rvpi?: number // Residual Value to Paid-In
  tvpi?: number // Total Value to Paid-In
  
  // Portfolio details
  ownershipPercentage: number
}

// ==================== PRIVATE DEBT CALCULATOR ====================

export interface PrivateDebtCalculationInput extends BaseCalculationInput {
  debtType?: string
  principalAmount?: number
  interestRate?: number
  maturityDate?: Date
  issueDate?: Date
  paymentFrequency?: string
  creditRating?: string
  seniority?: string
  security?: string
  covenants?: string[]
  borrowerName?: string
  borrowerIndustry?: string
  ltv?: number
  dscr?: number
  currentBalance?: number
}

export interface PrivateDebtFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Debt identification
  debtInstrumentName: string
  debtType: 'senior_secured' | 'senior_unsecured' | 'subordinated' | 'mezzanine' | 'bridge'
  borrowerName: string
  borrowerIndustry?: string
  
  // Terms
  principalAmount: number
  currentBalance?: number
  interestRate: number
  maturityDate: Date
  issueDate: Date
  paymentFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual'
  
  // Credit analysis
  creditRating?: string
  seniority: 'senior' | 'subordinate' | 'mezzanine'
  security: 'secured' | 'unsecured'
  ltv?: number // Loan-to-Value
  dscr?: number // Debt Service Coverage Ratio
  
  // Covenants
  maintenanceCovenants?: string[]
  
  // Portfolio details
  investmentAmount: number
}

// ==================== INFRASTRUCTURE CALCULATOR ====================

export interface InfrastructureCalculationInput extends BaseCalculationInput {
  projectName?: string
  assetType?: string
  projectPhase?: string
  operatingHistory?: number
  cashFlowProfile?: string
  regulatoryFramework?: string
  concessionPeriod?: number
  counterpartyRisk?: string
  esgRating?: string
  capex?: number
  opex?: number
  revenue?: number
  ebitda?: number
  discountRate?: number
  terminalValue?: number
}

export interface InfrastructureFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Project identification
  projectName: string
  assetType: 'transportation' | 'energy' | 'utilities' | 'social' | 'telecom' | 'environmental'
  projectPhase: 'development' | 'construction' | 'operational' | 'mature'
  location: string
  
  // Operational metrics
  operatingHistory?: number // years
  concessionPeriod?: number // years
  cashFlowProfile: 'stable' | 'growing' | 'declining' | 'cyclical'
  
  // Financial metrics
  annualRevenue: number
  ebitda: number
  capex?: number
  opex: number
  
  // Risk assessment
  regulatoryFramework: 'regulated' | 'quasi_regulated' | 'merchant' | 'contracted'
  counterpartyRisk: 'government' | 'corporate' | 'mixed'
  esgRating?: string
  
  // Valuation inputs
  discountRate: number
  terminalValue?: number
  
  // Portfolio details
  ownershipPercentage: number
}

// ==================== ENERGY CALCULATOR ====================

export interface EnergyCalculationInput extends BaseCalculationInput {
  energyType?: string
  capacity?: number
  generation?: number
  capacity_factor?: number
  ppa_price?: number
  ppa_term?: number
  fuel_costs?: number
  o_and_m_costs?: number
  carbonPrice?: number
  renewable_certificates?: number
  transmission_costs?: number
  development_risk?: string
  technology_risk?: string
  merchant_risk?: number
}

export interface EnergyFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Energy asset identification
  projectName: string
  energyType: 'solar' | 'wind' | 'hydro' | 'natural_gas' | 'nuclear' | 'biomass' | 'geothermal' | 'storage'
  location: string
  developmentStage: 'development' | 'construction' | 'operational'
  
  // Technical specifications
  capacity: number // MW or MWh for storage
  annualGeneration?: number // MWh
  capacityFactor?: number // %
  
  // Commercial terms
  ppaPrice?: number // $/MWh
  ppaTerm?: number // years
  contractType: 'ppa' | 'merchant' | 'regulated' | 'hybrid'
  
  // Operating costs
  fuelCosts?: number // $/MWh
  oAndMCosts: number // $/kW-year or $/MWh
  transmissionCosts?: number // $/MWh
  
  // Revenue sources
  carbonPrice?: number // $/tonne CO2
  renewableCertificates?: number // $/MWh
  
  // Risk factors
  developmentRisk: 'low' | 'medium' | 'high'
  technologyRisk: 'proven' | 'emerging' | 'experimental'
  merchantRisk?: number // % of revenue exposed to merchant pricing
  
  // Portfolio details
  ownershipPercentage: number
}

// ==================== STRUCTURED PRODUCTS ====================

export interface StructuredProductsCalculationInput extends BaseCalculationInput {
  productType?: AssetType
  underlying?: string
  barrier?: number
  knockIn?: number
  knockOut?: number
  coupon?: number
  participation?: number
  leverage?: number
  protection?: number
  maturityDate?: Date
  payoffStructure?: string
  volatility?: number
  correlation?: number
  dividendYield?: number
}

export interface StructuredProductsFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Product identification
  productName: string
  productType: 'autocallable' | 'barrier_option' | 'bonus_certificate' | 'capital_protection' | 'tracker'
  issuer: string
  
  // Underlying assets
  underlying: string
  underlyingType: 'equity' | 'index' | 'basket' | 'fx' | 'commodity' | 'rates'
  
  // Product terms
  maturityDate: Date
  principalAmount: number
  payoffStructure: string
  
  // Barrier and trigger levels
  barrier?: number // % of initial level
  knockIn?: number // % of initial level
  knockOut?: number // % of initial level
  
  // Participation and leverage
  coupon?: number // % or absolute amount
  participation: number // % participation in upside
  leverage?: number // leverage factor
  protection?: number // % principal protection
  
  // Market parameters
  currentUnderlyingPrice: number
  volatility: number // implied volatility
  riskFreeRate: number
  dividendYield?: number
  correlation?: number // for basket products
  
  // Portfolio details
  notionalAmount: number
}

// ==================== QUANTITATIVE STRATEGIES ====================

export interface QuantitativeStrategiesCalculationInput extends BaseCalculationInput {
  strategyType?: string
  strategyName?: string
  aum?: number
  performanceFee?: number
  managementFee?: number
  highWaterMark?: number
  leverage?: number
  sharpeRatio?: number
  maxDrawdown?: number
  beta?: number
  alpha?: number
  correlation?: number
  volatility?: number
  var?: number
  frequency?: string
  dataSource?: string
}

export interface QuantitativeStrategiesFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Strategy identification
  strategyName: string
  strategyType: 'market_neutral' | 'long_short' | 'momentum' | 'mean_reversion' | 'arbitrage' | 'factor' | 'systematic_macro'
  manager: string
  
  // Fund characteristics
  aum: number // Assets Under Management
  managementFee: number // % per annum
  performanceFee: number // % of profits
  highWaterMark?: number
  
  // Strategy parameters
  leverage: number // times
  tradingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  holdingPeriod: 'intraday' | 'days' | 'weeks' | 'months'
  
  // Performance metrics
  sharpeRatio?: number
  maxDrawdown?: number // %
  beta?: number
  alpha?: number // % per annum
  correlation?: number // to benchmark
  annualizedReturn?: number // %
  volatility: number // % per annum
  
  // Risk metrics
  var?: number // Value at Risk (95% confidence)
  expectedShortfall?: number
  
  // Data and execution
  dataSource?: string
  executionVenue?: string
  
  // Portfolio details
  investmentAmount: number
}

// ==================== COLLECTIBLES ====================

export interface CollectiblesCalculationInput extends BaseCalculationInput {
  collectibleType?: string
  category?: string
  artist?: string
  year?: number
  condition?: string
  rarity?: string
  provenance?: string
  authenticity?: boolean
  lastSalePrice?: number
  lastSaleDate?: Date
  appraisalValue?: number
  appraisalDate?: Date
  insuranceValue?: number
  marketTrend?: string
  liquidity?: string
}

export interface CollectiblesFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Item identification
  itemName: string
  collectibleType: 'art' | 'wine' | 'watches' | 'jewelry' | 'rare_books' | 'coins' | 'stamps' | 'memorabilia' | 'classic_cars'
  category: string
  
  // Attribution
  artist?: string
  maker?: string
  yearCreated?: number
  originCountry?: string
  
  // Condition and authenticity
  condition: 'mint' | 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'
  rarity: 'unique' | 'extremely_rare' | 'very_rare' | 'rare' | 'uncommon' | 'common'
  authenticity: 'certified' | 'attributed' | 'school_of' | 'disputed'
  provenance?: string
  
  // Valuation history
  lastSalePrice?: number
  lastSaleDate?: Date
  lastSaleVenue?: string
  appraisalValue?: number
  appraisalDate?: Date
  appraiser?: string
  
  // Market factors
  insuranceValue?: number
  marketTrend: 'strong_growth' | 'moderate_growth' | 'stable' | 'declining' | 'volatile'
  liquidity: 'very_liquid' | 'liquid' | 'moderate' | 'illiquid' | 'very_illiquid'
  
  // Physical details
  dimensions?: string
  weight?: number
  storageRequirements?: string
  
  // Portfolio details
  acquisitionCost: number
  acquisitionDate: Date
}

// ==================== DIGITAL TOKENIZED FUNDS ====================

export interface DigitalTokenizedFundCalculationInput extends BaseCalculationInput {
  fundName?: string
  tokenSymbol?: string
  tokenStandard?: string
  blockchainNetwork?: string
  totalSupply?: number
  circulatingSupply?: number
  tokenPrice?: number
  underlyingNav?: number
  managementFee?: number
  performanceFee?: number
  redemptionFee?: number
  liquidity?: number
  aum?: number
  yield?: number
  stakingRewards?: number
}

export interface DigitalTokenizedFundFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Fund identification
  fundName: string
  fundManager: string
  fundType: 'equity' | 'bond' | 'real_estate' | 'commodity' | 'mixed' | 'crypto'
  
  // Token details
  tokenSymbol: string
  tokenStandard: 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-1400' | 'other'
  blockchainNetwork: 'ethereum' | 'polygon' | 'bsc' | 'avalanche' | 'other'
  contractAddress?: string
  
  // Token metrics
  totalSupply: number
  circulatingSupply: number
  currentTokenPrice?: number
  underlyingNavPerToken?: number
  
  // Fund metrics
  aum: number
  managementFee: number // % per annum
  performanceFee?: number // % of profits
  redemptionFee?: number // %
  
  // Yield and rewards
  distributionYield?: number // % per annum
  stakingRewards?: number // % per annum
  stakingPeriod?: number // days
  
  // Liquidity
  dailyTradingVolume?: number
  liquidityPoolSize?: number
  exchangeListing?: string[]
  
  // Portfolio details
  tokenQuantity: number
}

// ==================== INVOICE RECEIVABLES ====================

export interface InvoiceReceivablesCalculationInput extends BaseCalculationInput {
  invoiceNumber?: string
  invoiceAmount?: number
  invoiceDate?: Date
  dueDate?: Date
  payorName?: string
  payorRating?: string
  discountRate?: number
  advanceRate?: number
  factoring_fee?: number
  recourse?: boolean
  dilution_reserve?: number
  concentration_limit?: number
  aging_buckets?: Record<string, number>
  collection_probability?: number
}

export interface InvoiceReceivablesFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Invoice identification
  invoiceNumber: string
  invoiceAmount: number
  invoiceDate: Date
  dueDate: Date
  
  // Payor information
  payorName: string
  payorIndustry?: string
  payorRating?: string
  payorCountry: string
  paymentTerms: number // days
  
  // Factoring terms
  advanceRate: number // %
  factoringFee: number // %
  discountRate: number // % per annum
  recourse: boolean
  
  // Risk parameters
  concentrationLimit?: number // % of portfolio
  dilutionReserve?: number // %
  collectionProbability?: number // %
  
  // Aging analysis
  daysPastDue?: number
  agingCategory: 'current' | '1-30' | '31-60' | '61-90' | '90+'
  
  // Portfolio details
  purchasePrice: number
  purchaseDate: Date
}

// ==================== STABLECOIN CALCULATORS ====================

export interface StablecoinFiatCalculationInput extends BaseCalculationInput {
  tokenSymbol?: string
  tokenName?: string
  pegCurrency?: string
  collateralRatio?: number
  reserveAmount?: number
  circulating_supply?: number
  backing_assets?: string[]
  custodian?: string
  audit_frequency?: string
  regulatory_status?: string
  redemption_fee?: number
}

export interface StablecoinFiatFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Token identification
  tokenName: string
  tokenSymbol: string
  pegCurrency: 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'other'
  issuer: string
  
  // Collateral backing
  collateralType: 'cash' | 'treasury_bills' | 'commercial_paper' | 'deposits' | 'mixed'
  collateralRatio: number // %
  reserveAmount: number
  
  // Token metrics
  circulatingSupply: number
  totalSupply: number
  currentPrice?: number
  
  // Operational details
  custodian?: string
  auditFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual'
  lastAuditDate?: Date
  regulatoryStatus?: string
  
  // Fees
  redemptionFee?: number // %
  managementFee?: number // % per annum
  
  // Portfolio details
  tokenQuantity: number
}

export interface StablecoinCryptoCalculationInput extends BaseCalculationInput {
  tokenSymbol?: string
  tokenName?: string
  pegCurrency?: string
  collateral_tokens?: string[]
  over_collateralization?: number
  liquidation_ratio?: number
  stability_fee?: number
  circulating_supply?: number
  protocol?: string
  governance_token?: string
  mint_fee?: number
  burn_fee?: number
}

export interface StablecoinCryptoFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Token identification
  tokenName: string
  tokenSymbol: string
  pegCurrency: 'USD' | 'EUR' | 'BTC' | 'ETH' | 'other'
  protocol: string
  
  // Collateral mechanism
  collateralTokens: string[] // e.g., ['ETH', 'BTC', 'LINK']
  overCollateralizationRatio: number // %
  liquidationRatio: number // %
  minimumCollateralRatio: number // %
  
  // Token metrics
  circulatingSupply: number
  totalSupply: number
  currentPrice?: number
  
  // Protocol parameters
  stabilityFee: number // % per annum
  mintFee?: number // %
  burnFee?: number // %
  governanceToken?: string
  
  // Risk parameters
  liquidationPenalty?: number // %
  auctionDuration?: number // hours
  priceOracleSource?: string
  
  // Portfolio details
  tokenQuantity: number
}

// ==================== CLIMATE RECEIVABLES ====================

export interface ClimateReceivablesCalculationInput extends BaseCalculationInput {
  creditType?: string
  vintageYear?: number
  projectType?: string
  geography?: string
  certificationStandard?: string
  creditVolume?: number
  pricePerCredit?: number
  deliverySchedule?: string
  registryAccount?: string
  carbonPrice?: number
  policyRisk?: number
}

export interface ClimateReceivablesFormData {
  // Required fields
  valuationDate: Date
  targetCurrency: string

  // Credit identification
  creditType: 'carbon_offset' | 'renewable_energy' | 'biodiversity' | 'water'
  projectName: string
  projectType: string
  vintageYear: number
  geography: string

  // Certification
  certificationStandard: 'VCS' | 'CDM' | 'GS' | 'CAR' | 'ACR'
  registryAccount?: string
  
  // Commercial terms
  creditVolume: number
  pricePerCredit: number
  deliverySchedule: string
  
  // Risk factors
  carbonPrice?: number
  policyRisk: number
  deliveryRisk?: number
  
  // Portfolio details
  contractValue: number
}

// ==================== TYPE UNIONS ====================

export type CalculatorInput = 
  | BondCalculationInput
  | AssetBackedCalculationInput
  | EquityCalculationInput
  | MmfCalculationInput
  | CommoditiesCalculationInput
  | RealEstateCalculationInput
  | PrivateEquityCalculationInput
  | PrivateDebtCalculationInput
  | InfrastructureCalculationInput
  | EnergyCalculationInput
  | StructuredProductsCalculationInput
  | QuantitativeStrategiesCalculationInput
  | CollectiblesCalculationInput
  | DigitalTokenizedFundCalculationInput
  | InvoiceReceivablesCalculationInput
  | StablecoinFiatCalculationInput
  | StablecoinCryptoCalculationInput
  | ClimateReceivablesCalculationInput

export type CalculatorFormData =
  | BondFormData
  | AssetBackedFormData
  | EquityFormData
  | MmfFormData
  | CommoditiesFormData
  | RealEstateFormData
  | PrivateEquityFormData
  | PrivateDebtFormData
  | InfrastructureFormData
  | EnergyFormData
  | StructuredProductsFormData
  | QuantitativeStrategiesFormData
  | CollectiblesFormData
  | DigitalTokenizedFundFormData
  | InvoiceReceivablesFormData
  | StablecoinFiatFormData
  | StablecoinCryptoFormData
  | ClimateReceivablesFormData

// ==================== FORM VALIDATION ====================

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

// ==================== TYPE GUARDS ====================

export function isBondInput(input: CalculatorInput): input is BondCalculationInput {
  return input.productType === AssetType.BONDS
}

export function isAssetBackedInput(input: CalculatorInput): input is AssetBackedCalculationInput {
  return input.productType === AssetType.ASSET_BACKED
}

export function isEquityInput(input: CalculatorInput): input is EquityCalculationInput {
  return input.productType === AssetType.EQUITY
}

export function isMmfInput(input: CalculatorInput): input is MmfCalculationInput {
  return input.productType === AssetType.MMF
}

export function isCommoditiesInput(input: CalculatorInput): input is CommoditiesCalculationInput {
  return input.productType === AssetType.COMMODITIES
}

export function isRealEstateInput(input: CalculatorInput): input is RealEstateCalculationInput {
  return input.productType === AssetType.REAL_ESTATE
}

export function isPrivateEquityInput(input: CalculatorInput): input is PrivateEquityCalculationInput {
  return input.productType === AssetType.PRIVATE_EQUITY
}

export function isPrivateDebtInput(input: CalculatorInput): input is PrivateDebtCalculationInput {
  return input.productType === AssetType.PRIVATE_DEBT
}

export function isInfrastructureInput(input: CalculatorInput): input is InfrastructureCalculationInput {
  return input.productType === AssetType.INFRASTRUCTURE
}

export function isEnergyInput(input: CalculatorInput): input is EnergyCalculationInput {
  return input.productType === AssetType.ENERGY
}

export function isStructuredProductsInput(input: CalculatorInput): input is StructuredProductsCalculationInput {
  return input.productType === AssetType.STRUCTURED_PRODUCTS
}

export function isQuantitativeStrategiesInput(input: CalculatorInput): input is QuantitativeStrategiesCalculationInput {
  return input.productType === AssetType.QUANT_STRATEGIES
}

export function isCollectiblesInput(input: CalculatorInput): input is CollectiblesCalculationInput {
  return input.productType === AssetType.COLLECTIBLES
}

export function isDigitalTokenizedFundInput(input: CalculatorInput): input is DigitalTokenizedFundCalculationInput {
  return input.productType === AssetType.DIGITAL_TOKENIZED_FUNDS
}

export function isInvoiceReceivablesInput(input: CalculatorInput): input is InvoiceReceivablesCalculationInput {
  return input.productType === AssetType.INVOICE_RECEIVABLES
}

export function isStablecoinFiatInput(input: CalculatorInput): input is StablecoinFiatCalculationInput {
  return input.productType === AssetType.STABLECOIN_FIAT_BACKED
}

export function isStablecoinCryptoInput(input: CalculatorInput): input is StablecoinCryptoCalculationInput {
  return input.productType === AssetType.STABLECOIN_CRYPTO_BACKED
}

export function isClimateReceivablesInput(input: CalculatorInput): input is ClimateReceivablesCalculationInput {
  return input.productType === AssetType.CLIMATE_RECEIVABLES
}

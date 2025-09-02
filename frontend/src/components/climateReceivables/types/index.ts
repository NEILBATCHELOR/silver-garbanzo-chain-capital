// Energy Asset Types
export enum EnergyAssetType {
  SOLAR = 'solar',
  WIND = 'wind',
  HYDRO = 'hydro',
  BIOMASS = 'biomass',
  GEOTHERMAL = 'geothermal',
  OTHER = 'other'
}

// Database types (snake_case following PostgreSQL conventions)
// These types match the database schema exactly
export interface EnergyAssetDB {
  asset_id: string;
  name: string;
  type: EnergyAssetType;
  location: string;
  capacity: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// UI/Frontend types (camelCase for JavaScript/TypeScript conventions)
// These types are used in the UI components
export interface EnergyAsset {
  assetId: string;
  name: string;
  type: EnergyAssetType;
  location: string;
  capacity: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnergyAssetFormState {
  name: string;
  type: EnergyAssetType;
  location: string;
  capacity: number;
  ownerId?: string;
}

// Insert type for database operations
export interface InsertEnergyAsset {
  name: string;
  type: EnergyAssetType;
  location: string;
  capacity: number;
  owner_id?: string;
}

// CSV import types
export interface EnergyAssetCsvRow {
  name: string;
  type: string;
  location: string;
  capacity: string;
  owner_id?: string;
}

export interface EnergyAssetValidationError {
  rowIndex: number;
  fieldName: string;
  errorMessage: string;
}

// Weather Data Types
export interface WeatherDataDB {
  weather_id: string;
  location: string;
  date: string;
  sunlight_hours?: number;
  wind_speed?: number;
  temperature?: number;
  created_at: string;
  updated_at: string;
}

export interface WeatherData {
  weatherId: string;
  location: string;
  date: string;
  sunlightHours?: number;
  windSpeed?: number;
  temperature?: number;
  createdAt: string;
  updatedAt: string;
}

// Production Data Types
export interface ProductionDataDB {
  production_id: string;
  asset_id: string;
  production_date: string;
  output_mwh: number;
  weather_condition_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionData {
  productionId: string;
  assetId: string;
  productionDate: string;
  outputMwh: number;
  weatherConditionId?: string;
  createdAt: string;
  updatedAt: string;
  asset?: EnergyAsset;
  weatherData?: WeatherData;
  // For direct access to weather conditions
  weatherCondition?: {
    sunlightHours?: number;
    windSpeed?: number;
    temperature?: number;
  };
}

export interface ProductionDataFormState {
  assetId: string;
  productionDate: string;
  outputMwh: number;
  weatherConditionId?: string;
}

// Database insert type - used by the service layer to communicate with the database
export interface InsertProductionData {
  asset_id: string;
  production_date: string;
  output_mwh: number;
  weather_condition_id?: string;
}

// Climate Payers Types
export interface ClimatePayerDB {
  payer_id: string;
  name: string;
  credit_rating?: string;
  financial_health_score?: number;
  payment_history?: any;
  created_at: string;
  updated_at: string;
}

export interface ClimatePayer {
  payerId: string;
  name: string;
  creditRating?: string;
  financialHealthScore?: number;
  paymentHistory?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InsertClimatePayer {
  name: string;
  credit_rating?: string;
  financial_health_score?: number;
  payment_history?: any;
}

// Climate Policies Types
export interface ClimatePolicyDB {
  policy_id: string;
  name: string;
  description?: string;
  impact_level?: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface ClimatePolicy {
  policyId: string;
  name: string;
  description?: string;
  impactLevel?: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

// Risk Levels
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// Climate Receivables Types
export interface ClimateReceivableDB {
  receivable_id: string;
  asset_id: string | null;
  payer_id: string | null;
  amount: number;
  due_date: string;
  risk_score?: number | null;
  discount_rate?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClimateReceivable {
  receivableId: string;
  assetId: string | null;
  payerId: string | null;
  amount: number;
  dueDate: string;
  riskScore?: number | null;
  discountRate?: number | null;
  createdAt: string;
  updatedAt: string;
  asset?: EnergyAsset;
  payer?: ClimatePayer;
  incentives?: ClimateIncentive[];
  riskFactors?: ClimateRiskFactor[];
  policyImpacts?: ClimatePolicyImpact[];
}

export interface ClimateReceivableFormState {
  assetId: string;
  payerId: string;
  amount: number;
  dueDate: string;
  riskScore?: number;
  discountRate?: number;
}

export interface InsertClimateReceivable {
  asset_id: string | null;
  payer_id: string | null;
  amount: number;
  due_date: string;
  risk_score?: number | null;
  discount_rate?: number | null;
}

// Incentive Types
export enum IncentiveType {
  TAX_CREDIT = 'tax_credit',
  REC = 'rec',
  GRANT = 'grant',
  SUBSIDY = 'subsidy',
  OTHER = 'other'
}

export enum IncentiveStatus {
  APPLIED = 'applied',
  APPROVED = 'approved',
  PENDING = 'pending',
  RECEIVED = 'received',
  REJECTED = 'rejected'
}

export interface ClimateIncentiveDB {
  incentive_id: string;
  type: IncentiveType;
  amount: number;
  status: IncentiveStatus;
  asset_id?: string;
  receivable_id?: string;
  project_id?: string;
  expected_receipt_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ClimateIncentive {
  incentiveId: string;
  type: IncentiveType;
  amount: number;
  status: IncentiveStatus;
  assetId?: string;
  receivableId?: string;
  projectId?: string;
  expectedReceiptDate?: string;
  createdAt: string;
  updatedAt: string;
  asset?: EnergyAsset;
  receivable?: ClimateReceivable;
}

export interface ClimateIncentiveFormState {
  type: IncentiveType;
  amount: number;
  status: IncentiveStatus;
  assetId?: string;
  receivableId?: string;
  expectedReceiptDate?: Date | string;
}

export interface InsertClimateIncentive {
  type: IncentiveType;
  amount: number;
  status: IncentiveStatus;
  asset_id?: string;
  receivable_id?: string;
  project_id?: string;
  expected_receipt_date?: string;
}

// Climate Risk Factors Types
export interface ClimateRiskFactorDB {
  factor_id: string;
  receivable_id: string;
  production_risk?: number;
  credit_risk?: number;
  policy_risk?: number;
  created_at: string;
  updated_at: string;
}

export interface ClimateRiskFactor {
  factorId: string;
  receivableId: string;
  productionRisk?: number;
  creditRisk?: number;
  policyRisk?: number;
  createdAt: string;
  updatedAt: string;
}

// Climate Policy Impacts Types
export interface ClimatePolicyImpactDB {
  impact_id: string;
  policy_id: string;
  receivable_id?: string;
  asset_id?: string;
  impact_description?: string;
  created_at: string;
  updated_at: string;
}

export interface ClimatePolicyImpact {
  impactId: string;
  policyId: string;
  receivableId?: string;
  assetId?: string;
  impactDescription?: string;
  createdAt: string;
  updatedAt: string;
  policy?: ClimatePolicy;
}

// Tokenization Pool Types
export interface ClimateTokenizationPoolDB {
  pool_id: string;
  name: string;
  total_value: number;
  risk_profile: RiskLevel;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ClimateTokenizationPool {
  poolId: string;
  name: string;
  totalValue: number;
  riskProfile: RiskLevel;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  receivables?: ClimateReceivable[];
  investors?: ClimateInvestorPool[];
}

export interface ClimateTokenizationPoolFormState {
  name: string;
  totalValue: number;
  riskProfile: RiskLevel;
  projectId?: string;
}

export interface InsertClimateTokenizationPool {
  name: string;
  total_value: number;
  risk_profile: RiskLevel;
  project_id?: string;
}

// Pool Receivables Types
export interface ClimatePoolReceivableDB {
  pool_id: string;
  receivable_id: string;
  created_at: string;
}

export interface ClimatePoolReceivable {
  poolId: string;
  receivableId: string;
  createdAt: string;
}

// Investor Types
export interface InvestorDB {
  investor_id: string;
  name: string;
  contact_info?: string;
  created_at: string;
  updated_at: string;
}

export interface Investor {
  investorId: string;
  name: string;
  contactInfo?: string;
  createdAt: string;
  updatedAt: string;
}

// Investor Pools Types
export interface ClimateInvestorPoolDB {
  investor_id: string;
  pool_id: string;
  investment_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ClimateInvestorPool {
  investorId: string;
  poolId: string;
  investmentAmount: number;
  createdAt: string;
  updatedAt: string;
  investor?: Investor;
  pool?: ClimateTokenizationPool;
}

// Renewable Energy Credits Types
export enum RECMarketType {
  COMPLIANCE = 'compliance',
  VOLUNTARY = 'voluntary'
}

export enum RECStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RETIRED = 'retired',
  PENDING = 'pending'
}

export interface RenewableEnergyCreditDB {
  rec_id: string;
  asset_id: string | null;
  receivable_id?: string | null;
  incentive_id?: string | null;
  project_id?: string | null;
  quantity: number;
  vintage_year: number;
  market_type: RECMarketType;
  price_per_rec: number;
  total_value: number;
  certification?: string;
  status: RECStatus;
  created_at: string;
  updated_at: string;
}

export interface RenewableEnergyCredit {
  recId: string;
  assetId: string | null;
  receivableId?: string | null;
  incentiveId?: string | null;
  projectId?: string | null;
  quantity: number;
  vintageYear: number;
  marketType: RECMarketType;
  pricePerRec: number;
  totalValue: number;
  certification?: string;
  status: RECStatus;
  createdAt: string;
  updatedAt: string;
  asset?: EnergyAsset;
  receivable?: ClimateReceivable;
}

export interface RenewableEnergyCreditFormState {
  assetId: string;
  receivableId?: string;
  quantity: number;
  vintageYear: number;
  marketType: RECMarketType;
  pricePerRec: number;
  totalValue?: number;
  certification?: string;
  status: RECStatus;
}

export interface InsertRenewableEnergyCredit {
  asset_id: string | null;
  receivable_id?: string | null;
  incentive_id?: string | null;
  project_id?: string | null;
  quantity: number;
  vintage_year: number;
  market_type: RECMarketType;
  price_per_rec: number;
  total_value: number;
  certification?: string;
  status: RECStatus;
}

// Carbon Offset Types
export enum CarbonOffsetType {
  REFORESTATION = 'reforestation',
  RENEWABLE_ENERGY = 'renewable_energy',
  METHANE_CAPTURE = 'methane_capture',
  ENERGY_EFFICIENCY = 'energy_efficiency',
  OTHER = 'other'
}

export enum CarbonOffsetStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  RETIRED = 'retired'
}

export interface CarbonOffsetDB {
  offset_id: string;
  project_id: string;
  type: CarbonOffsetType;
  amount: number;
  price_per_ton: number;
  total_value: number;
  verification_standard?: string;
  verification_date?: string;
  expiration_date?: string;
  status: CarbonOffsetStatus;
  created_at: string;
  updated_at: string;
}

export interface CarbonOffset {
  offsetId: string;
  projectId: string;
  type: CarbonOffsetType;
  amount: number;
  pricePerTon: number;
  totalValue: number;
  verificationStandard?: string;
  verificationDate?: string;
  expirationDate?: string;
  status: CarbonOffsetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CarbonOffsetFormState {
  projectId: string;
  type: CarbonOffsetType;
  amount: number;
  pricePerTon: number;
  verificationStandard?: string;
  verificationDate?: string | Date;
  expirationDate?: string | Date;
  status: CarbonOffsetStatus;
}

export interface InsertCarbonOffset {
  project_id: string;
  type: CarbonOffsetType;
  amount: number;
  price_per_ton: number;
  total_value: number;
  verification_standard?: string;
  verification_date?: string;
  expiration_date?: string;
  status: CarbonOffsetStatus;
}

// Custom UUID type for consistency
export type UUID = string;

// Token Properties
export interface TokenClimatePropertiesDB {
  token_id: UUID;
  pool_id: string;
  average_risk_score: number;
  discounted_value: number;
  discount_amount: number;
  average_discount_rate: number;
  security_interest_details?: string;
  created_at: string;
  updated_at: string;
}

export interface TokenClimateProperties {
  tokenId: UUID;
  poolId: string;
  averageRiskScore: number;
  discountedValue: number;
  discountAmount: number;
  averageDiscountRate: number;
  securityInterestDetails?: string;
  createdAt: string;
  updatedAt: string;
}

// Cash Flow Projection Types
export interface ClimateCashFlowProjectionDB {
  projection_id: string;
  projection_date: string;
  projected_amount: number;
  source_type: string;
  entity_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ClimateCashFlowProjection {
  projectionId: string;
  projectionDate: string;
  projectedAmount: number;
  sourceType: string;
  entityId?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper functions for converting between database and UI types
export function dbToUiEnergyAsset(db: EnergyAssetDB): EnergyAsset {
  return {
    assetId: db.asset_id,
    name: db.name,
    type: db.type,
    location: db.location,
    capacity: db.capacity,
    ownerId: db.owner_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function uiToDbEnergyAsset(ui: EnergyAsset): EnergyAssetDB {
  return {
    asset_id: ui.assetId,
    name: ui.name,
    type: ui.type,
    location: ui.location,
    capacity: ui.capacity,
    owner_id: ui.ownerId,
    created_at: ui.createdAt,
    updated_at: ui.updatedAt
  };
}

export function dbToUiClimatePayer(db: ClimatePayerDB): ClimatePayer {
  return {
    payerId: db.payer_id,
    name: db.name,
    creditRating: db.credit_rating,
    financialHealthScore: db.financial_health_score,
    paymentHistory: db.payment_history,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function dbToUiClimateReceivable(db: ClimateReceivableDB): ClimateReceivable {
  return {
    receivableId: db.receivable_id,
    assetId: db.asset_id,
    payerId: db.payer_id,
    amount: db.amount,
    dueDate: db.due_date,
    riskScore: db.risk_score,
    discountRate: db.discount_rate,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function dbToUiClimateIncentive(db: ClimateIncentiveDB): ClimateIncentive {
  return {
    incentiveId: db.incentive_id,
    type: db.type,
    amount: db.amount,
    status: db.status,
    assetId: db.asset_id,
    receivableId: db.receivable_id,
    projectId: db.project_id,
    expectedReceiptDate: db.expected_receipt_date,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function dbToUiRenewableEnergyCredit(db: RenewableEnergyCreditDB): RenewableEnergyCredit {
  return {
    recId: db.rec_id,
    assetId: db.asset_id,
    receivableId: db.receivable_id,
    incentiveId: db.incentive_id,
    projectId: db.project_id,
    quantity: db.quantity,
    vintageYear: db.vintage_year,
    marketType: db.market_type,
    pricePerRec: db.price_per_rec,
    totalValue: db.total_value,
    certification: db.certification,
    status: db.status,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function dbToUiClimateRiskFactor(db: ClimateRiskFactorDB): ClimateRiskFactor {
  return {
    factorId: db.factor_id,
    receivableId: db.receivable_id,
    productionRisk: db.production_risk,
    creditRisk: db.credit_risk,
    policyRisk: db.policy_risk,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function dbToUiClimatePolicyImpact(db: ClimatePolicyImpactDB): ClimatePolicyImpact {
  return {
    impactId: db.impact_id,
    policyId: db.policy_id,
    receivableId: db.receivable_id,
    assetId: db.asset_id,
    impactDescription: db.impact_description,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function dbToUiCarbonOffset(db: CarbonOffsetDB): CarbonOffset {
  return {
    offsetId: db.offset_id,
    projectId: db.project_id,
    type: db.type,
    amount: db.amount,
    pricePerTon: db.price_per_ton,
    totalValue: db.total_value,
    verificationStandard: db.verification_standard,
    verificationDate: db.verification_date,
    expirationDate: db.expiration_date,
    status: db.status,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function dbToUiProductionData(db: ProductionDataDB): ProductionData {
  return {
    productionId: db.production_id,
    assetId: db.asset_id,
    productionDate: db.production_date,
    outputMwh: db.output_mwh,
    weatherConditionId: db.weather_condition_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

// Climate Token interface for tokenization management
export interface ClimateToken {
  id: string;
  poolId: string;
  tokenName: string;
  tokenSymbol: string;
  totalTokens: number;
  tokenValue: number;
  totalValue: number;
  createdAt: string;
  status: string;
  securityInterestDetails: string;
  projectId: string;
  metadata: any;
  averageRiskScore?: number;
  discountedValue?: number;
  discountAmount?: number;
  averageDiscountRate?: number;
  poolDetails?: ClimateTokenizationPool;
}

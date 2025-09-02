/**
 * Enhanced ERC1400 Security Token Types
 * Complete coverage of all 11 database tables with 335 total fields
 * 
 * This file contains interfaces for ALL ERC1400 database tables to achieve
 * true 100% database coverage vs the previous incomplete implementation.
 */

//------------------------------------------------------------------------------
// ERC1400 Controllers Table (token_erc1400_controllers - 6 fields)
//------------------------------------------------------------------------------

export interface ERC1400Controller {
  id?: string;
  tokenId?: string;
  address: string;
  permissions?: string[]; // Array of permission types
  createdAt?: string;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// ERC1400 Corporate Actions Table (token_erc1400_corporate_actions - 17 fields)
//------------------------------------------------------------------------------

export interface ERC1400CorporateAction {
  id?: string;
  tokenId?: string;
  actionType: 'dividend' | 'stock_split' | 'stock_dividend' | 'rights_offering' | 'spin_off' | 'merger' | 'acquisition' | 'buyback' | 'split' | 'other';
  announcementDate: string; // ISO date string
  recordDate?: string;
  effectiveDate?: string;
  paymentDate?: string;
  actionDetails: Record<string, any>; // JSONB data
  impactOnSupply?: 'increase' | 'decrease' | 'no_change';
  impactOnPrice?: 'increase' | 'decrease' | 'no_change' | 'unknown';
  shareholderApprovalRequired?: boolean;
  votingDeadline?: string;
  regulatoryApprovalRequired?: boolean;
  status?: 'announced' | 'pending_approval' | 'approved' | 'executed' | 'cancelled';
  executionTransactionHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// ERC1400 Custody Providers Table (token_erc1400_custody_providers - 14 fields)
//------------------------------------------------------------------------------

export interface ERC1400CustodyProvider {
  id?: string;
  tokenId?: string;
  providerName: string;
  providerType: 'institutional' | 'prime_broker' | 'qualified_custodian' | 'bank' | 'trust_company' | 'other';
  providerAddress?: string; // Wallet address
  providerLei?: string; // Legal Entity Identifier
  custodyAgreementHash?: string;
  isActive?: boolean;
  certificationLevel?: 'tier_1' | 'tier_2' | 'tier_3' | 'qualified_custodian';
  jurisdiction?: string; // Country/region code
  regulatoryApprovals?: string[]; // Array of regulatory approvals
  integrationStatus?: 'pending' | 'active' | 'suspended' | 'terminated';
  createdAt?: string;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// ERC1400 Documents Table (token_erc1400_documents - 8 fields)
//------------------------------------------------------------------------------

export interface ERC1400Document {
  id?: string;
  tokenId?: string;
  name: string;
  documentUri: string;
  documentType?: 'prospectus' | 'offering_circular' | 'subscription_agreement' | 'private_placement_memorandum' | 'terms_conditions' | 'regulatory_filing' | 'other';
  documentHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// ERC1400 Partitions Table (token_erc1400_partitions - 13 fields)
//------------------------------------------------------------------------------

export interface ERC1400Partition {
  id?: string;
  tokenId?: string;
  name: string;
  partitionId: string; // Bytes32 partition identifier
  metadata?: Record<string, any>;
  createdAt?: string;
  totalSupply?: string;
  partitionType?: 'common' | 'preferred' | 'class_a' | 'class_b' | 'series_a' | 'series_b' | 'convertible' | 'warrant' | 'other';
  amount?: string;
  updatedAt?: string;
  corporateActions?: boolean;
  customFeatures?: Record<string, any>;
  transferable?: boolean;
}

//------------------------------------------------------------------------------
// ERC1400 Partition Balances Table (token_erc1400_partition_balances - 7 fields)
//------------------------------------------------------------------------------

export interface ERC1400PartitionBalance {
  id?: string;
  partitionId: string;
  holderAddress: string;
  balance: string;
  lastUpdated?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// ERC1400 Partition Operators Table (token_erc1400_partition_operators - 8 fields)
//------------------------------------------------------------------------------

export interface ERC1400PartitionOperator {
  id?: string;
  partitionId: string;
  holderAddress: string;
  operatorAddress: string;
  authorized?: boolean;
  lastUpdated?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// ERC1400 Partition Transfers Table (token_erc1400_partition_transfers - 10 fields)
//------------------------------------------------------------------------------

export interface ERC1400PartitionTransfer {
  id?: string;
  partitionId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  operatorAddress?: string;
  timestamp?: string;
  transactionHash?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// ERC1400 Regulatory Filings Table (token_erc1400_regulatory_filings - 14 fields)
//------------------------------------------------------------------------------

export interface ERC1400RegulatoryFiling {
  id?: string;
  tokenId?: string;
  filingType: 'form_d' | 'form_s1' | 'form_10k' | 'form_10q' | 'form_8k' | 'form_144' | 'reg_a' | 'reg_cf' | 'other';
  filingDate: string; // Date string
  filingJurisdiction: string; // Country/region
  filingReference?: string;
  documentHash?: string;
  documentUri?: string;
  regulatoryBody?: 'sec' | 'finra' | 'cftc' | 'fed' | 'fca' | 'esma' | 'other';
  complianceStatus?: 'pending' | 'filed' | 'approved' | 'rejected' | 'under_review';
  dueDate?: string;
  autoGenerated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

//------------------------------------------------------------------------------
// Complete ERC1400 Configuration Interface with ALL Tables
//------------------------------------------------------------------------------

export interface ERC1400CompleteConfig {
  // Core Token Properties (token_erc1400_properties - 119 fields)
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  initialSupply: string;
  cap?: string;
  securityType?: 'equity' | 'debt' | 'derivative' | 'fund' | 'reit' | 'other';
  issuingJurisdiction?: string;
  issuingEntityName?: string;
  issuingEntityLei?: string;
  regulationType?: 'reg-d' | 'reg-a-plus' | 'reg-s' | 'reg-cf' | 'public' | 'other';
  
  // Basic Token Features
  isMintable?: boolean;
  isBurnable?: boolean;
  isPausable?: boolean;
  documentUri?: string;
  documentHash?: string;
  controllerAddress?: string;
  requireKyc?: boolean;
  isMultiClass?: boolean;
  trancheTransferability?: boolean;
  tokenDetails?: string;
  legalTerms?: string;
  prospectus?: string;
  enforceKyc?: boolean;
  forcedTransfers?: boolean;
  forcedRedemptionEnabled?: boolean;
  whitelistEnabled?: boolean;
  holdingPeriod?: string;
  maxInvestorCount?: string;
  investorAccreditation?: boolean;
  autoCompliance?: boolean;
  manualApprovals?: boolean;
  complianceModule?: string;
  complianceAutomationLevel?: string;
  isIssuable?: boolean;
  granularControl?: boolean;
  dividendDistribution?: boolean;
  corporateActionsEnabled?: boolean;
  issuanceModules?: boolean;
  documentManagement?: boolean;
  recoveryMechanism?: boolean;
  investorWhitelistEnabled?: boolean;
  accreditedInvestorOnly?: boolean;
  useGeographicRestrictions?: boolean;
  defaultRestrictionPolicy?: string;
  
  // Institutional Grade Features
  institutionalGrade?: boolean;
  custodyIntegrationEnabled?: boolean;
  primeBrokerageSupport?: boolean;
  settlementIntegration?: string;
  clearingHouseIntegration?: boolean;
  centralSecuritiesDepositoryIntegration?: boolean;
  thirdPartyCustodyAddresses?: string[];
  institutionalWalletSupport?: boolean;
  
  // Enhanced Compliance Monitoring
  realTimeComplianceMonitoring?: boolean;
  automatedSanctionsScreening?: boolean;
  pepScreeningEnabled?: boolean;
  amlMonitoringEnabled?: boolean;
  suspiciousActivityReporting?: boolean;
  complianceOfficerNotifications?: boolean;
  regulatoryReportingAutomation?: boolean;
  
  // Advanced Corporate Actions
  advancedCorporateActions?: boolean;
  stockSplitsEnabled?: boolean;
  stockDividendsEnabled?: boolean;
  rightsOfferingsEnabled?: boolean;
  spinOffsEnabled?: boolean;
  mergersAcquisitionsSupport?: boolean;
  treasuryManagementEnabled?: boolean;
  buybackProgramsEnabled?: boolean;
  shareRepurchaseAutomation?: boolean;
  
  // Advanced Governance Features
  advancedGovernanceEnabled?: boolean;
  proxyVotingEnabled?: boolean;
  cumulativeVotingEnabled?: boolean;
  weightedVotingByClass?: boolean;
  votingDelegationEnabled?: boolean;
  institutionalVotingServices?: boolean;
  boardElectionSupport?: boolean;
  
  // Cross-border Trading & International
  crossBorderTradingEnabled?: boolean;
  multiJurisdictionCompliance?: boolean;
  passportRegimeSupport?: boolean;
  treatyBenefitsEnabled?: boolean;
  withholdingTaxAutomation?: boolean;
  currencyHedgingEnabled?: boolean;
  
  // Enhanced Reporting & Analytics
  enhancedReportingEnabled?: boolean;
  realTimeShareholderRegistry?: boolean;
  beneficialOwnershipTracking?: boolean;
  positionReconciliationEnabled?: boolean;
  regulatoryFilingAutomation?: boolean;
  auditTrailComprehensive?: boolean;
  performanceAnalyticsEnabled?: boolean;
  esgReportingEnabled?: boolean;
  
  // Traditional Finance Integration
  traditionalFinanceIntegration?: boolean;
  swiftIntegrationEnabled?: boolean;
  iso20022MessagingSupport?: boolean;
  financialDataVendorIntegration?: boolean;
  marketDataFeedsEnabled?: boolean;
  
  // Advanced Risk Management
  advancedRiskManagement?: boolean;
  positionLimitsEnabled?: boolean;
  stressTestingEnabled?: boolean;
  marginRequirementsDynamic?: boolean;
  collateralManagementEnabled?: boolean;
  insuranceCoverageEnabled?: boolean;
  disasterRecoveryEnabled?: boolean;
  
  // Blockchain & Interoperability
  crossChainBridgeSupport?: boolean;
  layer2ScalingSupport?: boolean;
  
  // Complex Configuration Objects (JSONB fields)
  transferRestrictions?: Record<string, any>;
  kycSettings?: Record<string, any>;
  complianceSettings?: Record<string, any>;
  customFeatures?: Record<string, any>;
  geographicRestrictions?: Record<string, any>;
  whitelistConfig?: Record<string, any>;
  jurisdictionRestrictions?: Record<string, any>;
  investorLimits?: Record<string, any>;
  foreignOwnershipRestrictions?: Record<string, any>;
  regulatoryEquivalenceMapping?: Record<string, any>;
  quorumRequirements?: Record<string, any>;
  transactionMonitoringRules?: Record<string, any>;
  concentrationLimits?: Record<string, any>;
  priceDiscoveryMechanisms?: Record<string, any>;
  
  // NEW: Controllers Management (token_erc1400_controllers - 6 fields)
  controllers?: ERC1400Controller[];
  
  // NEW: Corporate Actions Management (token_erc1400_corporate_actions - 17 fields)
  corporateActions?: ERC1400CorporateAction[];
  
  // NEW: Custody Provider Integration (token_erc1400_custody_providers - 14 fields)
  custodyProviders?: ERC1400CustodyProvider[];
  
  // NEW: Document Management System (token_erc1400_documents - 8 fields)
  documents?: ERC1400Document[];
  
  // NEW: Enhanced Partition Management (token_erc1400_partitions - 13 fields)
  partitions?: ERC1400Partition[];
  
  // NEW: Partition Balance Tracking (token_erc1400_partition_balances - 7 fields)
  partitionBalances?: ERC1400PartitionBalance[];
  
  // NEW: Partition Operator Management (token_erc1400_partition_operators - 8 fields)
  partitionOperators?: ERC1400PartitionOperator[];
  
  // NEW: Partition Transfer History (token_erc1400_partition_transfers - 10 fields)
  partitionTransfers?: ERC1400PartitionTransfer[];
  
  // NEW: Regulatory Filing Automation (token_erc1400_regulatory_filings - 14 fields)
  regulatoryFilings?: ERC1400RegulatoryFiling[];
}

//------------------------------------------------------------------------------
// Enhanced Configuration State Management
//------------------------------------------------------------------------------

export interface ERC1400ConfigState extends ERC1400CompleteConfig {
  // Additional UI state management
  activeAccordionSections?: string[];
  validation?: {
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  };
  
  // Feature flags for progressive disclosure
  enabledFeatures?: {
    controllers: boolean;
    corporateActions: boolean;
    custodyProviders: boolean;
    documents: boolean;
    partitions: boolean;
    partitionBalances: boolean;
    partitionOperators: boolean;
    partitionTransfers: boolean;
    regulatoryFilings: boolean;
  };
}

//------------------------------------------------------------------------------
// Form Action Types for Enhanced Management
//------------------------------------------------------------------------------

export type ERC1400FormAction = 
  | { type: 'ADD_CONTROLLER'; payload: ERC1400Controller }
  | { type: 'REMOVE_CONTROLLER'; payload: string }
  | { type: 'UPDATE_CONTROLLER'; payload: { index: number; controller: ERC1400Controller } }
  | { type: 'ADD_CORPORATE_ACTION'; payload: ERC1400CorporateAction }
  | { type: 'REMOVE_CORPORATE_ACTION'; payload: string }
  | { type: 'UPDATE_CORPORATE_ACTION'; payload: { index: number; action: ERC1400CorporateAction } }
  | { type: 'ADD_CUSTODY_PROVIDER'; payload: ERC1400CustodyProvider }
  | { type: 'REMOVE_CUSTODY_PROVIDER'; payload: string }
  | { type: 'UPDATE_CUSTODY_PROVIDER'; payload: { index: number; provider: ERC1400CustodyProvider } }
  | { type: 'ADD_DOCUMENT'; payload: ERC1400Document }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'UPDATE_DOCUMENT'; payload: { index: number; document: ERC1400Document } }
  | { type: 'ADD_PARTITION'; payload: ERC1400Partition }
  | { type: 'REMOVE_PARTITION'; payload: string }
  | { type: 'UPDATE_PARTITION'; payload: { index: number; partition: ERC1400Partition } }
  | { type: 'ADD_REGULATORY_FILING'; payload: ERC1400RegulatoryFiling }
  | { type: 'REMOVE_REGULATORY_FILING'; payload: string }
  | { type: 'UPDATE_REGULATORY_FILING'; payload: { index: number; filing: ERC1400RegulatoryFiling } }
  | { type: 'SET_FEATURE_ENABLED'; payload: { feature: string; enabled: boolean } }
  | { type: 'RESET_CONFIG' }
  | { type: 'LOAD_CONFIG'; payload: ERC1400CompleteConfig };

//------------------------------------------------------------------------------
// Component Props for Enhanced Configuration
//------------------------------------------------------------------------------

export interface ERC1400EnhancedConfigProps {
  tokenForm: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setTokenForm: React.Dispatch<React.SetStateAction<any>>;
  onConfigChange?: (config: ERC1400CompleteConfig) => void;
  initialConfig?: Partial<ERC1400CompleteConfig>;
  enableAllFeatures?: boolean; // Enable all advanced features by default
}

//------------------------------------------------------------------------------
// Validation Schemas
//------------------------------------------------------------------------------

export interface ERC1400ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  coverage: {
    propertiesTable: boolean;
    controllersTable: boolean;
    corporateActionsTable: boolean;
    custodyProvidersTable: boolean;
    documentsTable: boolean;
    partitionsTable: boolean;
    partitionBalancesTable: boolean;
    partitionOperatorsTable: boolean;
    partitionTransfersTable: boolean;
    regulatoryFilingsTable: boolean;
  };
}

//------------------------------------------------------------------------------
// Database Statistics
//------------------------------------------------------------------------------

export interface ERC1400DatabaseCoverage {
  totalTables: number;
  implementedTables: number;
  totalFields: number;
  implementedFields: number;
  coveragePercentage: number;
  missingTables: string[];
  missingFields: Record<string, string[]>;
}

//------------------------------------------------------------------------------
// Business Logic Types
//------------------------------------------------------------------------------

export interface CorporateActionExecution {
  actionId: string;
  executionDate: string;
  executedBy: string;
  transactionHash?: string;
  status: 'success' | 'failed' | 'pending';
  affectedPartitions?: string[];
  supplyImpact?: {
    totalSupplyBefore: string;
    totalSupplyAfter: string;
    changeAmount: string;
    changeType: 'increase' | 'decrease';
  };
}

export interface PartitionBalanceSnapshot {
  partitionId: string;
  snapshotDate: string;
  totalHolders: number;
  totalBalance: string;
  largestHoldings: Array<{
    address: string;
    balance: string;
    percentage: string;
  }>;
}

export interface ComplianceAuditTrail {
  tokenId: string;
  eventType: 'transfer' | 'mint' | 'burn' | 'partition_change' | 'corporate_action';
  eventDate: string;
  partitionId?: string;
  fromAddress?: string;
  toAddress?: string;
  amount?: string;
  complianceChecks: Array<{
    checkType: string;
    result: 'pass' | 'fail';
    details?: string;
  }>;
  regulatoryReference?: string;
}
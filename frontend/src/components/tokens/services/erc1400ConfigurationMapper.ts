/**
 * ERC1400 Configuration Mapper
 * 
 * Transforms max configuration UI data into enhanced ERC-1400 deployment format
 * Handles all 119+ enterprise security token features with validation
 */

import { ethers } from 'ethers';
import { TokenFormData } from '@/components/tokens/types';
import { ERC1400FormData, TokenERC1400Properties } from '../utils/mappers/erc1400/erc1400PropertyMapper';

export interface EnhancedERC1400Config {
  // Basic configuration (deployed in constructor)
  baseConfig: {
    name: string;
    symbol: string;
    decimals: number;
    granularity: number; // ERC-1400 mandatory: minimum transferable unit
    initialSupply: string;
    cap: string;
    controllerAddress: string;
    requireKyc: boolean;
    documentUri: string;
    documentHash: string;
    
    // Core features
    isMintable: boolean;
    isBurnable: boolean;
    isPausable: boolean;
  };
  
  // Security token metadata (set post-deployment)
  securityMetadata?: {
    securityType: string;
    regulationType: string;
    issuingJurisdiction: string;
    issuingEntityName: string;
    issuingEntityLei: string;
    tokenDetails?: string;
    legalTerms?: string;
    prospectus?: string;
  };
  
  // Compliance configuration (set post-deployment)
  complianceConfig?: {
    enforceKyc: boolean;
    investorAccreditation: boolean;
    accreditedInvestorOnly: boolean;
    whitelistEnabled: boolean;
    holdingPeriod?: number;
    maxInvestorCount?: number;
    autoCompliance: boolean;
    manualApprovals: boolean;
    complianceAutomationLevel: string;
    realTimeComplianceMonitoring: boolean;
    automatedSanctionsScreening: boolean;
    pepScreeningEnabled: boolean;
    amlMonitoringEnabled: boolean;
  };
  
  // Corporate features (set post-deployment)
  corporateConfig?: {
    forcedTransfers: boolean;
    forcedRedemptionEnabled: boolean;
    recoveryMechanism: boolean;
    dividendDistribution: boolean;
    corporateActions: boolean;
    issuanceModules: boolean;
    documentManagement: boolean;
    granularControl: boolean;
    isMultiClass: boolean;
    trancheTransferability: boolean;
  };
  
  // Advanced corporate actions (set post-deployment)
  advancedCorporateActions?: {
    enabled: boolean;
    stockSplitsEnabled: boolean;
    stockDividendsEnabled: boolean;
    rightsOfferingsEnabled: boolean;
    spinOffsEnabled: boolean;
    mergersAcquisitionsSupport: boolean;
    treasuryManagementEnabled: boolean;
    buybackProgramsEnabled: boolean;
    shareRepurchaseAutomation: boolean;
  };
  
  // Governance configuration (set post-deployment)
  governanceConfig?: {
    enabled: boolean;
    proxyVotingEnabled: boolean;
    cumulativeVotingEnabled: boolean;
    weightedVotingByClass: boolean;
    votingDelegationEnabled: boolean;
    institutionalVotingServices: boolean;
    boardElectionSupport: boolean;
    quorumRequirements?: Array<{
      proposalType: string;
      minimumQuorum: string;
      votingPeriod: number;
      executionDelay?: number;
    }>;
  };
  
  // Institutional features (set post-deployment)
  institutionalConfig?: {
    institutionalGrade: boolean;
    custodyIntegrationEnabled: boolean;
    primeBrokerageSupport: boolean;
    settlementIntegration?: string;
    clearingHouseIntegration: boolean;
    centralSecuritiesDepositoryIntegration: boolean;
    thirdPartyCustodyAddresses: string[];
    institutionalWalletSupport: boolean;
  };
  
  // Cross-border features (set post-deployment)
  crossBorderConfig?: {
    crossBorderTradingEnabled: boolean;
    multiJurisdictionCompliance: boolean;
    passportRegimeSupport: boolean;
    treatyBenefitsEnabled: boolean;
    withholdingTaxAutomation: boolean;
    currencyHedgingEnabled: boolean;
    foreignOwnershipRestrictions?: Array<{
      jurisdiction: string;
      maxPercentage: string;
      exemptions?: string[];
      treatyBenefits?: boolean;
    }>;
  };
  
  // Reporting and analytics (set post-deployment)
  reportingConfig?: {
    enhancedReportingEnabled: boolean;
    realTimeShareholderRegistry: boolean;
    beneficialOwnershipTracking: boolean;
    positionReconciliationEnabled: boolean;
    regulatoryFilingAutomation: boolean;
    auditTrailComprehensive: boolean;
    performanceAnalyticsEnabled: boolean;
    esgReportingEnabled: boolean;
    suspiciousActivityReporting: boolean;
    complianceOfficerNotifications: boolean;
    regulatoryReportingAutomation: boolean;
  };
  
  // Traditional finance integration (set post-deployment)
  tradFiConfig?: {
    traditionalFinanceIntegration: boolean;
    swiftIntegrationEnabled: boolean;
    iso20022MessagingSupport: boolean;
    financialDataVendorIntegration: boolean;
    marketDataFeedsEnabled: boolean;
    priceDiscoveryMechanisms?: Array<{
      type: 'auction' | 'market_maker' | 'fixed_price' | 'formula_based';
      parameters: Record<string, any>;
      enabled: boolean;
    }>;
  };
  
  // Risk management (set post-deployment)
  riskManagementConfig?: {
    advancedRiskManagement: boolean;
    positionLimitsEnabled: boolean;
    concentrationLimits?: Array<{
      entityType: 'individual' | 'institution' | 'fund';
      maxPercentage: string;
      exemptions?: string[];
    }>;
    stressTestingEnabled: boolean;
    marginRequirementsDynamic: boolean;
    collateralManagementEnabled: boolean;
    insuranceCoverageEnabled: boolean;
    disasterRecoveryEnabled: boolean;
  };
  
  // Blockchain features (set post-deployment)
  blockchainConfig?: {
    crossChainBridgeSupport: boolean;
    layer2ScalingSupport: boolean;
  };
  
  // Geographic restrictions (set post-deployment)
  geographicConfig?: {
    useGeographicRestrictions: boolean;
    defaultRestrictionPolicy: string;
    restrictedCountries: string[];
    allowedCountries?: string[];
    jurisdictionRestrictions?: Array<{
      jurisdiction: string;
      allowed: boolean;
      requiredDocuments?: string[];
      additionalCompliance?: string[];
    }>;
  };
  
  // Transaction monitoring (set post-deployment)
  monitoringConfig?: {
    transactionMonitoringRules?: Array<{
      id: string;
      name: string;
      ruleType: 'amount_threshold' | 'frequency' | 'pattern' | 'location' | 'identity';
      threshold?: string;
      timeframe?: number;
      action: 'flag' | 'block' | 'require_approval';
      enabled: boolean;
    }>;
  };
  
  // Partition configuration (set post-deployment)
  partitionConfig?: {
    partitions: Array<{
      name: string;
      description: string;
      transferable: boolean;
      votingRights: boolean;
      dividendRights: boolean;
      liquidationPreference?: number;
    }>;
    controllers: Array<{
      address: string;
      name: string;
      role: string;
      permissions: string[];
    }>;
    operators: Array<{
      holderAddress: string;
      operatorAddress: string;
      partition: string;
      authorized: boolean;
      purpose?: string;
      expirationDate?: string;
    }>;
  };
  
  // Document management (set post-deployment)
  documentConfig?: {
    documents: Array<{
      name: string;
      documentUri: string;
      documentType?: string;
      documentHash?: string;
    }>;
  };
  
  // Corporate actions data (set post-deployment)
  corporateActionsData?: {
    corporateActions: Array<{
      actionType: string;
      announcementDate: string;
      recordDate: string;
      effectiveDate: string;
      paymentDate?: string;
      description: string;
      actionDetails: Record<string, any>;
      requiresApproval: boolean;
      approvalType?: string;
      status: string;
    }>;
  };
  
  // Custody providers (set post-deployment)
  custodyConfig?: {
    custodyProviders: Array<{
      name: string;
      providerType: string;
      leiCode?: string;
      jurisdiction: string;
      regulatoryApprovals: string[];
      integrationStatus: string;
      certificationLevel?: string;
      custodyAgreementHash?: string;
    }>;
  };
  
  // Regulatory filings (set post-deployment)
  regulatoryConfig?: {
    regulatoryFilings: Array<{
      filingType: string;
      regulatoryBody: string;
      dueDate: string;
      status: string;
      filingReference?: string;
      documentUri?: string;
      documentHash?: string;
      autoGenerated: boolean;
    }>;
  };
}

export interface ConfigurationMappingResult {
  success: boolean;
  config?: EnhancedERC1400Config;
  errors: string[];
  warnings: string[];
  complexity: {
    level: 'low' | 'medium' | 'high' | 'extreme';
    score: number;
    chunksRequired: number;
    featureCount: number;
    requiresChunking: boolean;
  };
}

export class ERC1400ConfigurationMapper {
  /**
   * Map token form data to enhanced ERC-1400 configuration
   */
  mapTokenFormToEnhancedConfig(tokenForm: TokenFormData): ConfigurationMappingResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Extract base configuration
      const baseConfig = this.extractBaseConfig(tokenForm, errors);
      if (errors.length > 0) {
        return { 
          success: false, 
          errors, 
          warnings, 
          complexity: { level: 'low', score: 0, chunksRequired: 0, featureCount: 0, requiresChunking: false } 
        };
      }

      // Extract all advanced configurations
      const config: EnhancedERC1400Config = {
        baseConfig,
        securityMetadata: this.extractSecurityMetadata(tokenForm, warnings),
        complianceConfig: this.extractComplianceConfig(tokenForm, warnings),
        corporateConfig: this.extractCorporateConfig(tokenForm, warnings),
        advancedCorporateActions: this.extractAdvancedCorporateActions(tokenForm, warnings),
        governanceConfig: this.extractGovernanceConfig(tokenForm, warnings),
        institutionalConfig: this.extractInstitutionalConfig(tokenForm, warnings),
        crossBorderConfig: this.extractCrossBorderConfig(tokenForm, warnings),
        reportingConfig: this.extractReportingConfig(tokenForm, warnings),
        tradFiConfig: this.extractTradFiConfig(tokenForm, warnings),
        riskManagementConfig: this.extractRiskManagementConfig(tokenForm, warnings),
        blockchainConfig: this.extractBlockchainConfig(tokenForm, warnings),
        geographicConfig: this.extractGeographicConfig(tokenForm, warnings),
        monitoringConfig: this.extractMonitoringConfig(tokenForm, warnings),
        partitionConfig: this.extractPartitionConfig(tokenForm, warnings),
        documentConfig: this.extractDocumentConfig(tokenForm, warnings),
        corporateActionsData: this.extractCorporateActionsData(tokenForm, warnings),
        custodyConfig: this.extractCustodyConfig(tokenForm, warnings),
        regulatoryConfig: this.extractRegulatoryConfig(tokenForm, warnings)
      };

      // Calculate complexity
      const complexity = this.calculateComplexity(config);

      // Add complexity-based warnings
      if (complexity.level === 'extreme') {
        warnings.push('Extremely complex security token configuration - deployment may take 15+ minutes');
        warnings.push('Consider deploying in phases for institutional compliance requirements');
      } else if (complexity.level === 'high') {
        warnings.push('High complexity security token - chunked deployment recommended');
        warnings.push('Enterprise features detected - ensure institutional readiness');
      }

      return {
        success: true,
        config,
        errors,
        warnings,
        complexity
      };

    } catch (error) {
      errors.push(`Configuration mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings,
        complexity: { level: 'low', score: 0, chunksRequired: 0, featureCount: 0, requiresChunking: false }
      };
    }
  }

  /**
   * Extract base configuration (required fields)
   */
  private extractBaseConfig(tokenForm: TokenFormData, errors: string[]): EnhancedERC1400Config['baseConfig'] {
    // Validate required fields for security tokens
    if (!tokenForm.name?.trim()) errors.push('Security token name is required');
    if (!tokenForm.symbol?.trim()) errors.push('Security token symbol is required');
    if (tokenForm.decimals === undefined || tokenForm.decimals < 0 || tokenForm.decimals > 18) {
      errors.push('Decimals must be between 0 and 18');
    }

    // Get from form data or properties
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    return {
      name: tokenForm.name || '',
      symbol: tokenForm.symbol || '',
      decimals: tokenForm.decimals || 18,
      granularity: (props as any).granularity || 1, // ERC-1400 mandatory: minimum transferable unit (defaults to 1)
      initialSupply: props.initialSupply || tokenForm.initialSupply || '0',
      cap: props.cap || tokenForm.cap || '0',
      controllerAddress: props.controllerAddress || tokenForm.initialOwner || ethers.ZeroAddress,
      requireKyc: props.requireKyc ?? true,
      documentUri: props.documentUri || '',
      documentHash: props.documentHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      isMintable: props.isMintable ?? false,
      isBurnable: props.isBurnable ?? false,
      isPausable: props.isPausable ?? false
    };
  }

  /**
   * Extract security token metadata
   */
  private extractSecurityMetadata(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['securityMetadata'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.securityType && !props.issuingJurisdiction) return undefined;

    const metadata = {
      securityType: props.securityType || 'equity',
      regulationType: props.regulationType || 'reg-d',
      issuingJurisdiction: props.issuingJurisdiction || '',
      issuingEntityName: props.issuingEntityName || '',
      issuingEntityLei: props.issuingEntityLei || '',
      tokenDetails: props.tokenDetails,
      legalTerms: props.legalTerms,
      prospectus: props.prospectus
    };

    // Validate LEI format if provided
    if (metadata.issuingEntityLei && !/^[A-Z0-9]{18}[0-9]{2}$/.test(metadata.issuingEntityLei)) {
      warnings.push('Invalid LEI format - should be 20 characters');
    }

    if (!metadata.issuingJurisdiction) {
      warnings.push('Issuing jurisdiction not specified - required for regulatory compliance');
    }

    return metadata;
  }

  /**
   * Extract compliance configuration
   */
  private extractComplianceConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['complianceConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    const config = {
      enforceKyc: props.enforceKyc ?? props.requireKyc ?? true,
      investorAccreditation: props.investorAccreditation ?? true,
      accreditedInvestorOnly: props.accreditedInvestorOnly ?? false,
      whitelistEnabled: props.whitelistEnabled ?? props.investorWhitelistEnabled ?? true,
      holdingPeriod: props.holdingPeriod,
      maxInvestorCount: props.maxInvestorCount,
      autoCompliance: props.autoCompliance ?? false,
      manualApprovals: props.manualApprovals ?? true,
      complianceAutomationLevel: props.complianceAutomationLevel || 'manual',
      realTimeComplianceMonitoring: props.realTimeComplianceMonitoring ?? false,
      automatedSanctionsScreening: props.automatedSanctionsScreening ?? false,
      pepScreeningEnabled: props.pepScreeningEnabled ?? false,
      amlMonitoringEnabled: props.amlMonitoringEnabled ?? false
    };

    // Business logic validations
    if (!config.enforceKyc && config.investorAccreditation) {
      warnings.push('Investor accreditation enabled without KYC enforcement may create compliance gaps');
    }

    if (config.accreditedInvestorOnly && !config.investorAccreditation) {
      warnings.push('Accredited investor only mode requires investor accreditation to be enabled');
    }

    if (config.autoCompliance && config.manualApprovals) {
      warnings.push('Auto compliance with manual approvals may create conflicting workflows');
    }

    return config;
  }

  /**
   * Extract corporate configuration
   */
  private extractCorporateConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['corporateConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    return {
      forcedTransfers: props.forcedTransfers ?? false,
      forcedRedemptionEnabled: props.forcedRedemptionEnabled ?? false,
      recoveryMechanism: props.recoveryMechanism ?? false,
      dividendDistribution: props.dividendDistribution ?? false,
      corporateActions: props.corporateActions ?? false,
      issuanceModules: props.issuanceModules ?? false,
      documentManagement: props.documentManagement ?? true,
      granularControl: props.granularControl ?? true,
      isMultiClass: props.isMultiClass ?? false,
      trancheTransferability: props.trancheTransferability ?? false
    };
  }

  /**
   * Extract advanced corporate actions configuration
   */
  private extractAdvancedCorporateActions(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['advancedCorporateActions'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.advancedCorporateActions) return undefined;

    return {
      enabled: props.advancedCorporateActions,
      stockSplitsEnabled: props.stockSplitsEnabled ?? false,
      stockDividendsEnabled: props.stockDividendsEnabled ?? false,
      rightsOfferingsEnabled: props.rightsOfferingsEnabled ?? false,
      spinOffsEnabled: props.spinOffsEnabled ?? false,
      mergersAcquisitionsSupport: props.mergersAcquisitionsSupport ?? false,
      treasuryManagementEnabled: props.treasuryManagementEnabled ?? false,
      buybackProgramsEnabled: props.buybackProgramsEnabled ?? false,
      shareRepurchaseAutomation: props.shareRepurchaseAutomation ?? false
    };
  }

  /**
   * Extract governance configuration
   */
  private extractGovernanceConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['governanceConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.advancedGovernanceEnabled) return undefined;

    return {
      enabled: props.advancedGovernanceEnabled,
      proxyVotingEnabled: props.proxyVotingEnabled ?? false,
      cumulativeVotingEnabled: props.cumulativeVotingEnabled ?? false,
      weightedVotingByClass: props.weightedVotingByClass ?? false,
      votingDelegationEnabled: props.votingDelegationEnabled ?? false,
      institutionalVotingServices: props.institutionalVotingServices ?? false,
      boardElectionSupport: props.boardElectionSupport ?? false,
      quorumRequirements: props.quorumRequirements || []
    };
  }

  /**
   * Extract institutional configuration
   */
  private extractInstitutionalConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['institutionalConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.institutionalGrade) return undefined;

    const config = {
      institutionalGrade: props.institutionalGrade,
      custodyIntegrationEnabled: props.custodyIntegrationEnabled ?? false,
      primeBrokerageSupport: props.primeBrokerageSupport ?? false,
      settlementIntegration: props.settlementIntegration,
      clearingHouseIntegration: props.clearingHouseIntegration ?? false,
      centralSecuritiesDepositoryIntegration: props.centralSecuritiesDepositoryIntegration ?? false,
      thirdPartyCustodyAddresses: props.thirdPartyCustodyAddresses || [],
      institutionalWalletSupport: props.institutionalWalletSupport ?? false
    };

    // Validate custody addresses
    if (config.thirdPartyCustodyAddresses.length > 0) {
      const invalidAddresses = config.thirdPartyCustodyAddresses.filter(addr => !ethers.isAddress(addr));
      if (invalidAddresses.length > 0) {
        warnings.push(`Invalid custody addresses detected: ${invalidAddresses.join(', ')}`);
      }
    }

    return config;
  }

  /**
   * Extract cross-border configuration
   */
  private extractCrossBorderConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['crossBorderConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.crossBorderTradingEnabled) return undefined;

    return {
      crossBorderTradingEnabled: props.crossBorderTradingEnabled,
      multiJurisdictionCompliance: props.multiJurisdictionCompliance ?? false,
      passportRegimeSupport: props.passportRegimeSupport ?? false,
      treatyBenefitsEnabled: props.treatyBenefitsEnabled ?? false,
      withholdingTaxAutomation: props.withholdingTaxAutomation ?? false,
      currencyHedgingEnabled: props.currencyHedgingEnabled ?? false,
      foreignOwnershipRestrictions: props.foreignOwnershipRestrictions || []
    };
  }

  /**
   * Extract reporting configuration
   */
  private extractReportingConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['reportingConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    return {
      enhancedReportingEnabled: props.enhancedReportingEnabled ?? false,
      realTimeShareholderRegistry: props.realTimeShareholderRegistry ?? false,
      beneficialOwnershipTracking: props.beneficialOwnershipTracking ?? false,
      positionReconciliationEnabled: props.positionReconciliationEnabled ?? false,
      regulatoryFilingAutomation: props.regulatoryFilingAutomation ?? false,
      auditTrailComprehensive: props.auditTrailComprehensive ?? true,
      performanceAnalyticsEnabled: props.performanceAnalyticsEnabled ?? false,
      esgReportingEnabled: props.esgReportingEnabled ?? false,
      suspiciousActivityReporting: props.suspiciousActivityReporting ?? false,
      complianceOfficerNotifications: props.complianceOfficerNotifications ?? false,
      regulatoryReportingAutomation: props.regulatoryReportingAutomation ?? false
    };
  }

  /**
   * Extract traditional finance configuration
   */
  private extractTradFiConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['tradFiConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.traditionalFinanceIntegration) return undefined;

    return {
      traditionalFinanceIntegration: props.traditionalFinanceIntegration,
      swiftIntegrationEnabled: props.swiftIntegrationEnabled ?? false,
      iso20022MessagingSupport: props.iso20022MessagingSupport ?? false,
      financialDataVendorIntegration: props.financialDataVendorIntegration ?? false,
      marketDataFeedsEnabled: props.marketDataFeedsEnabled ?? false,
      priceDiscoveryMechanisms: props.priceDiscoveryMechanisms || []
    };
  }

  /**
   * Extract risk management configuration
   */
  private extractRiskManagementConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['riskManagementConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.advancedRiskManagement) return undefined;

    return {
      advancedRiskManagement: props.advancedRiskManagement,
      positionLimitsEnabled: props.positionLimitsEnabled ?? false,
      concentrationLimits: props.concentrationLimits || [],
      stressTestingEnabled: props.stressTestingEnabled ?? false,
      marginRequirementsDynamic: props.marginRequirementsDynamic ?? false,
      collateralManagementEnabled: props.collateralManagementEnabled ?? false,
      insuranceCoverageEnabled: props.insuranceCoverageEnabled ?? false,
      disasterRecoveryEnabled: props.disasterRecoveryEnabled ?? false
    };
  }

  /**
   * Extract blockchain configuration
   */
  private extractBlockchainConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['blockchainConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    return {
      crossChainBridgeSupport: props.crossChainBridgeSupport ?? false,
      layer2ScalingSupport: props.layer2ScalingSupport ?? false
    };
  }

  /**
   * Extract geographic configuration
   */
  private extractGeographicConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['geographicConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.useGeographicRestrictions) return undefined;

    const restrictions = props.geographicRestrictions || {};
    
    return {
      useGeographicRestrictions: props.useGeographicRestrictions,
      defaultRestrictionPolicy: props.defaultRestrictionPolicy || 'deny',
      restrictedCountries: (restrictions as any).restrictedCountries || [],
      allowedCountries: (restrictions as any).allowedCountries,
      jurisdictionRestrictions: props.jurisdictionRestrictions || []
    };
  }

  /**
   * Extract monitoring configuration
   */
  private extractMonitoringConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['monitoringConfig'] {
    const props = (tokenForm.erc1400Properties || {}) as Partial<TokenERC1400Properties>;
    
    if (!props.transactionMonitoringRules || props.transactionMonitoringRules.length === 0) return undefined;

    return {
      transactionMonitoringRules: props.transactionMonitoringRules
    };
  }

  /**
   * Extract partition configuration from related tables
   */
  private extractPartitionConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['partitionConfig'] {
    // Access related table data from the form
    const partitions = (tokenForm as any).partitions || [];
    const controllers = (tokenForm as any).controllers || [];
    const operators = (tokenForm as any).partitionOperators || [];
    
    if (partitions.length === 0 && controllers.length === 0 && operators.length === 0) return undefined;

    return {
      partitions: partitions.map((p: any) => ({
        name: p.name || '',
        description: p.description || '',
        transferable: p.transferable ?? true,
        votingRights: p.votingRights ?? true,
        dividendRights: p.dividendRights ?? true,
        liquidationPreference: p.liquidationPreference
      })),
      controllers: controllers.map((c: any) => ({
        address: c.address || '',
        name: c.name || '',
        role: c.role || 'controller',
        permissions: c.permissions || []
      })),
      operators: operators.map((o: any) => ({
        holderAddress: o.holderAddress || '',
        operatorAddress: o.operatorAddress || '',
        partition: o.partition || '',
        authorized: o.authorized ?? true,
        purpose: o.purpose,
        expirationDate: o.expirationDate
      }))
    };
  }

  /**
   * Extract document configuration from related tables
   */
  private extractDocumentConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['documentConfig'] {
    const documents = (tokenForm as any).documents || [];
    
    if (documents.length === 0) return undefined;

    return {
      documents: documents.map((d: any) => ({
        name: d.name || '',
        documentUri: d.documentUri || d.document_uri || '',
        documentType: d.documentType || d.document_type,
        documentHash: d.documentHash || d.document_hash
      }))
    };
  }

  /**
   * Extract corporate actions data from related tables
   */
  private extractCorporateActionsData(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['corporateActionsData'] {
    const corporateActions = (tokenForm as any).corporateActions || [];
    
    if (corporateActions.length === 0) return undefined;

    return {
      corporateActions: corporateActions.map((ca: any) => ({
        actionType: ca.actionType || ca.action_type || '',
        announcementDate: ca.announcementDate || ca.announcement_date || '',
        recordDate: ca.recordDate || ca.record_date || '',
        effectiveDate: ca.effectiveDate || ca.effective_date || '',
        paymentDate: ca.paymentDate || ca.payment_date,
        description: ca.description || '',
        actionDetails: ca.actionDetails || ca.action_details || {},
        requiresApproval: ca.requiresApproval ?? ca.requires_approval ?? false,
        approvalType: ca.approvalType || ca.approval_type,
        status: ca.status || 'announced'
      }))
    };
  }

  /**
   * Extract custody configuration from related tables
   */
  private extractCustodyConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['custodyConfig'] {
    const custodyProviders = (tokenForm as any).custodyProviders || [];
    
    if (custodyProviders.length === 0) return undefined;

    return {
      custodyProviders: custodyProviders.map((cp: any) => ({
        name: cp.name || '',
        providerType: cp.providerType || cp.provider_type || 'bank',
        leiCode: cp.leiCode || cp.lei_code,
        jurisdiction: cp.jurisdiction || '',
        regulatoryApprovals: cp.regulatoryApprovals || cp.regulatory_approvals || [],
        integrationStatus: cp.integrationStatus || cp.integration_status || 'not_integrated',
        certificationLevel: cp.certificationLevel || cp.certification_level,
        custodyAgreementHash: cp.custodyAgreementHash || cp.custody_agreement_hash
      }))
    };
  }

  /**
   * Extract regulatory configuration from related tables
   */
  private extractRegulatoryConfig(tokenForm: TokenFormData, warnings: string[]): EnhancedERC1400Config['regulatoryConfig'] {
    const regulatoryFilings = (tokenForm as any).regulatoryFilings || [];
    
    if (regulatoryFilings.length === 0) return undefined;

    return {
      regulatoryFilings: regulatoryFilings.map((rf: any) => ({
        filingType: rf.filingType || rf.filing_type || '',
        regulatoryBody: rf.regulatoryBody || rf.regulatory_body || '',
        dueDate: rf.dueDate || rf.due_date || '',
        status: rf.status || 'pending',
        filingReference: rf.filingReference || rf.filing_reference,
        documentUri: rf.documentUri || rf.document_uri,
        documentHash: rf.documentHash || rf.document_hash,
        autoGenerated: rf.autoGenerated ?? rf.auto_generated ?? false
      }))
    };
  }

  /**
   * Calculate configuration complexity for ERC-1400
   */
  private calculateComplexity(config: EnhancedERC1400Config) {
    let score = 15; // Base complexity for security tokens
    let chunksRequired = 1; // Base deployment
    let featureCount = 0;

    // Security metadata
    if (config.securityMetadata) {
      score += 10;
      featureCount++;
      chunksRequired++;
    }

    // Compliance configuration
    if (config.complianceConfig) {
      score += 15; // Higher weight for compliance
      featureCount++;
      chunksRequired++;
      
      if (config.complianceConfig.realTimeComplianceMonitoring) score += 5;
      if (config.complianceConfig.automatedSanctionsScreening) score += 5;
      if (config.complianceConfig.amlMonitoringEnabled) score += 5;
    }

    // Corporate configuration
    if (config.corporateConfig) {
      score += 12;
      featureCount++;
      chunksRequired++;
    }

    // Advanced corporate actions
    if (config.advancedCorporateActions?.enabled) {
      score += 15;
      featureCount++;
      chunksRequired++;
    }

    // Governance
    if (config.governanceConfig?.enabled) {
      score += 18; // Higher weight for governance
      featureCount++;
      chunksRequired++;
      
      if (config.governanceConfig.quorumRequirements?.length) {
        score += config.governanceConfig.quorumRequirements.length * 2;
      }
    }

    // Institutional features
    if (config.institutionalConfig?.institutionalGrade) {
      score += 20; // Highest weight for institutional grade
      featureCount++;
      chunksRequired++;
      
      if (config.institutionalConfig.custodyIntegrationEnabled) score += 5;
      if (config.institutionalConfig.primeBrokerageSupport) score += 5;
    }

    // Cross-border features
    if (config.crossBorderConfig?.crossBorderTradingEnabled) {
      score += 16;
      featureCount++;
      chunksRequired++;
      
      if (config.crossBorderConfig.foreignOwnershipRestrictions?.length) {
        score += config.crossBorderConfig.foreignOwnershipRestrictions.length * 2;
      }
    }

    // Reporting features
    if (config.reportingConfig) {
      let reportingComplexity = 0;
      if (config.reportingConfig.enhancedReportingEnabled) reportingComplexity += 3;
      if (config.reportingConfig.realTimeShareholderRegistry) reportingComplexity += 4;
      if (config.reportingConfig.beneficialOwnershipTracking) reportingComplexity += 4;
      if (config.reportingConfig.regulatoryFilingAutomation) reportingComplexity += 5;
      
      if (reportingComplexity > 0) {
        score += reportingComplexity;
        featureCount++;
        chunksRequired++;
      }
    }

    // Traditional finance integration
    if (config.tradFiConfig?.traditionalFinanceIntegration) {
      score += 14;
      featureCount++;
      chunksRequired++;
    }

    // Risk management
    if (config.riskManagementConfig?.advancedRiskManagement) {
      score += 12;
      featureCount++;
      chunksRequired++;
      
      if (config.riskManagementConfig.concentrationLimits?.length) {
        score += config.riskManagementConfig.concentrationLimits.length * 1.5;
      }
    }

    // Geographic restrictions
    if (config.geographicConfig?.useGeographicRestrictions) {
      score += 8;
      featureCount++;
      chunksRequired++;
      
      const countryCount = (config.geographicConfig.restrictedCountries?.length || 0) + 
                          (config.geographicConfig.allowedCountries?.length || 0);
      score += Math.min(countryCount * 0.5, 10);
    }

    // Transaction monitoring
    if (config.monitoringConfig?.transactionMonitoringRules?.length) {
      score += 6 + (config.monitoringConfig.transactionMonitoringRules.length * 2);
      featureCount++;
      chunksRequired++;
    }

    // Partition configuration
    if (config.partitionConfig) {
      const partitionComplexity = (config.partitionConfig.partitions?.length || 0) * 3 +
                                 (config.partitionConfig.controllers?.length || 0) * 2 +
                                 (config.partitionConfig.operators?.length || 0) * 1;
      
      if (partitionComplexity > 0) {
        score += Math.min(partitionComplexity, 25);
        featureCount++;
        chunksRequired++;
      }
    }

    // Documents
    if (config.documentConfig?.documents?.length) {
      score += Math.min(config.documentConfig.documents.length * 1, 8);
      featureCount++;
      chunksRequired++;
    }

    // Corporate actions data
    if (config.corporateActionsData?.corporateActions?.length) {
      score += Math.min(config.corporateActionsData.corporateActions.length * 2, 15);
      featureCount++;
      chunksRequired++;
    }

    // Custody providers
    if (config.custodyConfig?.custodyProviders?.length) {
      score += Math.min(config.custodyConfig.custodyProviders.length * 3, 12);
      featureCount++;
      chunksRequired++;
    }

    // Regulatory filings
    if (config.regulatoryConfig?.regulatoryFilings?.length) {
      score += Math.min(config.regulatoryConfig.regulatoryFilings.length * 2, 10);
      featureCount++;
      chunksRequired++;
    }

    // Determine complexity level
    let level: 'low' | 'medium' | 'high' | 'extreme';
    if (score < 40) level = 'low';
    else if (score < 80) level = 'medium';
    else if (score < 150) level = 'high';
    else level = 'extreme';

    const requiresChunking = score > 60 || chunksRequired > 8 || featureCount > 6;

    return { 
      level, 
      score, 
      chunksRequired, 
      featureCount,
      requiresChunking
    };
  }

  /**
   * Validate configuration before deployment
   */
  validateConfiguration(config: EnhancedERC1400Config): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Base configuration validation
    if (!config.baseConfig.name) errors.push('Security token name is required');
    if (!config.baseConfig.symbol) errors.push('Security token symbol is required');
    if (!ethers.isAddress(config.baseConfig.controllerAddress)) {
      errors.push('Valid controller address is required for security tokens');
    }

    // Security metadata validation
    if (config.securityMetadata) {
      if (!config.securityMetadata.securityType) {
        errors.push('Security type is required for security tokens');
      }
      if (!config.securityMetadata.issuingJurisdiction) {
        errors.push('Issuing jurisdiction is required for regulatory compliance');
      }
      if (config.securityMetadata.issuingEntityLei && 
          !/^[A-Z0-9]{18}[0-9]{2}$/.test(config.securityMetadata.issuingEntityLei)) {
        errors.push('Invalid LEI format');
      }
    }

    // Compliance validation
    if (config.complianceConfig) {
      if (config.complianceConfig.accreditedInvestorOnly && 
          !config.complianceConfig.investorAccreditation) {
        errors.push('Accredited investor only mode requires investor accreditation');
      }
      if (config.complianceConfig.maxInvestorCount && 
          config.complianceConfig.maxInvestorCount <= 0) {
        errors.push('Maximum investor count must be positive');
      }
    }

    // Institutional validation
    if (config.institutionalConfig) {
      const invalidCustodyAddresses = config.institutionalConfig.thirdPartyCustodyAddresses
        .filter(addr => !ethers.isAddress(addr));
      if (invalidCustodyAddresses.length > 0) {
        errors.push('Invalid custody addresses detected');
      }
    }

    // Governance validation
    if (config.governanceConfig?.quorumRequirements) {
      for (const req of config.governanceConfig.quorumRequirements) {
        const quorum = parseFloat(req.minimumQuorum);
        if (quorum < 0 || quorum > 100) {
          errors.push('Quorum percentage must be between 0 and 100');
        }
        if (req.votingPeriod <= 0) {
          errors.push('Voting period must be positive');
        }
      }
    }

    // Risk management validation
    if (config.riskManagementConfig?.concentrationLimits) {
      for (const limit of config.riskManagementConfig.concentrationLimits) {
        const percentage = parseFloat(limit.maxPercentage);
        if (percentage < 0 || percentage > 100) {
          errors.push('Concentration limit percentage must be between 0 and 100');
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

// Export singleton instance
export const erc1400ConfigurationMapper = new ERC1400ConfigurationMapper();

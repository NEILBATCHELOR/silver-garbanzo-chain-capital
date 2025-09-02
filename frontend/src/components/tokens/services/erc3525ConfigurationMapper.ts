/**
 * ERC-3525 Configuration Mapper
 * 
 * Maps UI form data to enhanced ERC-3525 contract configuration
 * Supports all 107+ fields from max configuration UI
 */

import { ethers } from 'ethers';

export interface ERC3525Slot {
  slotId: string;
  slotName: string;
  slotDescription?: string;
  valueUnits?: string;
  slotType?: string;
  transferable?: boolean;
  tradeable?: boolean;
  divisible?: boolean;
  minValue?: string;
  maxValue?: string;
  valuePrecision?: number;
  slotProperties?: Record<string, any>;
}

export interface ERC3525Allocation {
  tokenIdWithinSlot: string;
  slotId: string;
  recipient: string;
  value: string;
  linkedTokenId?: string;
}

export interface ERC3525PaymentSchedule {
  slotId: string;
  paymentDate: string;
  paymentAmount: string;
  paymentType: string;
  currency?: string;
  isCompleted?: boolean;
}

export interface ERC3525ValueAdjustment {
  slotId: string;
  adjustmentDate: string;
  adjustmentType: string;
  adjustmentAmount: string;
  adjustmentReason?: string;
  oraclePrice?: string;
  oracleSource?: string;
}

export interface ERC3525SlotConfig {
  slotId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  valueUnits?: string;
  slotTransferable?: boolean;
}

export interface EnhancedERC3525Config {
  // Basic Configuration
  baseConfig: {
    name: string;
    symbol: string;
    valueDecimals: number;
    initialOwner: string;
  };

  // Features Configuration
  features: {
    // Core Features
    mintingEnabled: boolean;
    burningEnabled: boolean;
    transfersPaused: boolean;
    hasRoyalty: boolean;
    
    // Advanced Features
    slotApprovals: boolean;
    valueApprovals: boolean;
    valueTransfersEnabled: boolean;
    updatableSlots: boolean;
    updatableValues: boolean;
    
    // Aggregation Features
    mergable: boolean;
    splittable: boolean;
    valueAggregation: boolean;
    fractionalOwnershipEnabled: boolean;
    autoUnitCalculation: boolean;
    
    // Slot Management
    slotCreationEnabled: boolean;
    dynamicSlotCreation: boolean;
    slotFreezeEnabled: boolean;
    slotMergeEnabled: boolean;
    slotSplitEnabled: boolean;
    crossSlotTransfers: boolean;
    
    // Trading Features
    slotMarketplaceEnabled: boolean;
    valueMarketplaceEnabled: boolean;
    partialValueTrading: boolean;
    tradingFeesEnabled: boolean;
    marketMakerEnabled: boolean;
    
    // Governance Features
    slotVotingEnabled: boolean;
    valueWeightedVoting: boolean;
    delegateEnabled: boolean;
    
    // DeFi Features
    yieldFarmingEnabled: boolean;
    liquidityProvisionEnabled: boolean;
    compoundInterestEnabled: boolean;
    flashLoanEnabled: boolean;
    
    // Compliance Features
    regulatoryComplianceEnabled: boolean;
    kycRequired: boolean;
    accreditedInvestorOnly: boolean;
    useGeographicRestrictions: boolean;
    
    // Enterprise Features
    multiSignatureRequired: boolean;
    approvalWorkflowEnabled: boolean;
    institutionalCustodySupport: boolean;
    auditTrailEnhanced: boolean;
    batchOperationsEnabled: boolean;
    emergencyPauseEnabled: boolean;
  };

  // Financial Instrument Configuration
  financialInstrument?: {
    instrumentType: string;
    principalAmount?: string;
    interestRate?: string;
    maturityDate?: string;
    couponFrequency?: string;
    earlyRedemptionEnabled?: boolean;
    redemptionPenaltyRate?: string;
  };

  // Derivative Configuration
  derivative?: {
    derivativeType: string;
    underlyingAsset: string;
    underlyingAssetAddress?: string;
    strikePrice?: string;
    expirationDate?: string;
    settlementType?: string;
    leverageRatio?: string;
  };

  // Value Computation
  valueComputation?: {
    computationMethod: string;
    oracleAddress?: string;
    calculationFormula?: string;
    accrualEnabled: boolean;
    accrualRate?: string;
    accrualFrequency?: string;
    adjustmentEnabled: boolean;
  };

  // Governance Configuration
  governance?: {
    votingPowerCalculation: string;
    quorumCalculationMethod: string;
    proposalValueThreshold?: string;
  };

  // DeFi Configuration
  defi?: {
    stakingYieldRate?: string;
    collateralFactor?: string;
    liquidationThreshold?: string;
  };

  // Trading Configuration
  trading?: {
    minimumTradeValue?: string;
    tradingFeePercentage?: string;
  };

  // Compliance Configuration
  compliance?: {
    holdingPeriodRestrictions?: any;
    transferLimits?: any;
    reportingRequirements?: any;
    defaultRestrictionPolicy?: string;
    geographicRestrictions?: string[];
  };

  // Royalty Configuration
  royalty?: {
    royaltyPercentage: number;
    royaltyReceiver: string;
  };

  // Metadata Configuration
  metadata: {
    baseUri?: string;
    metadataStorage?: string;
    dynamicMetadata?: boolean;
    updatableUris?: boolean;
  };

  // Post-deployment Configuration
  postDeployment: {
    slots: ERC3525Slot[];
    allocations: ERC3525Allocation[];
    paymentSchedules: ERC3525PaymentSchedule[];
    valueAdjustments: ERC3525ValueAdjustment[];
    slotConfigs: ERC3525SlotConfig[];
  };
}

export interface ComplexityAnalysis {
  level: 'low' | 'medium' | 'high' | 'extreme';
  score: number;
  featureCount: number;
  requiresChunking: boolean;
  deploymentStrategy: 'basic' | 'enhanced' | 'chunked';
  estimatedChunks: number;
  reasons: string[];
}

export interface ConfigurationMappingResult {
  success: boolean;
  config?: EnhancedERC3525Config;
  complexity: ComplexityAnalysis;
  warnings: string[];
  errors: string[];
}

/**
 * ERC-3525 Configuration Mapper
 * Transforms UI configuration to deployment-ready contract parameters
 */
export class ERC3525ConfigurationMapper {
  
  /**
   * Map token form data to enhanced ERC-3525 configuration
   */
  mapTokenFormToEnhancedConfig(
    tokenForm: any,
    deployerAddress: string = ethers.ZeroAddress
  ): ConfigurationMappingResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Basic validation
      if (!tokenForm.name || !tokenForm.symbol) {
        errors.push('Token name and symbol are required');
      }

      if (!deployerAddress || deployerAddress === ethers.ZeroAddress) {
        warnings.push('Using zero address as deployer - should be set to actual deployer');
        deployerAddress = ethers.ZeroAddress;
      }

      // Extract configuration data
      const config = this.extractConfiguration(tokenForm, deployerAddress, warnings, errors);
      
      // Analyze complexity
      const complexity = this.analyzeComplexity(config, tokenForm);

      // Validate configuration
      this.validateConfiguration(config, warnings, errors);

      return {
        success: errors.length === 0,
        config: errors.length === 0 ? config : undefined,
        complexity,
        warnings,
        errors
      };

    } catch (error) {
      errors.push(`Configuration mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        complexity: {
          level: 'low',
          score: 0,
          featureCount: 0,
          requiresChunking: false,
          deploymentStrategy: 'basic',
          estimatedChunks: 1,
          reasons: ['Configuration parsing failed']
        },
        warnings,
        errors
      };
    }
  }

  /**
   * Extract configuration from token form
   */
  private extractConfiguration(
    tokenForm: any,
    deployerAddress: string,
    warnings: string[],
    errors: string[]
  ): EnhancedERC3525Config {
    // Basic configuration
    const baseConfig = {
      name: tokenForm.name || '',
      symbol: tokenForm.symbol || '',
      valueDecimals: this.parseNumber(tokenForm.valueDecimals, 18),
      initialOwner: deployerAddress
    };

    // Features configuration
    const features = {
      // Core Features
      mintingEnabled: this.parseBoolean(tokenForm.mintingEnabled, true),
      burningEnabled: this.parseBoolean(tokenForm.burningEnabled, false),
      transfersPaused: this.parseBoolean(tokenForm.transfersPaused, false),
      hasRoyalty: this.parseBoolean(tokenForm.hasRoyalty, false),
      
      // Advanced Features
      slotApprovals: this.parseBoolean(tokenForm.slotApprovals, true),
      valueApprovals: this.parseBoolean(tokenForm.valueApprovals, true),
      valueTransfersEnabled: this.parseBoolean(tokenForm.valueTransfersEnabled, true),
      updatableSlots: this.parseBoolean(tokenForm.updatableSlots, false),
      updatableValues: this.parseBoolean(tokenForm.updatableValues, false),
      
      // Aggregation Features
      mergable: this.parseBoolean(tokenForm.mergable, false),
      splittable: this.parseBoolean(tokenForm.splittable, false),
      valueAggregation: this.parseBoolean(tokenForm.valueAggregation, false),
      fractionalOwnershipEnabled: this.parseBoolean(tokenForm.fractionalOwnershipEnabled, false),
      autoUnitCalculation: this.parseBoolean(tokenForm.autoUnitCalculation, false),
      
      // Slot Management
      slotCreationEnabled: this.parseBoolean(tokenForm.slotCreationEnabled, false),
      dynamicSlotCreation: this.parseBoolean(tokenForm.dynamicSlotCreation, false),
      slotFreezeEnabled: this.parseBoolean(tokenForm.slotFreezeEnabled, false),
      slotMergeEnabled: this.parseBoolean(tokenForm.slotMergeEnabled, false),
      slotSplitEnabled: this.parseBoolean(tokenForm.slotSplitEnabled, false),
      crossSlotTransfers: this.parseBoolean(tokenForm.crossSlotTransfers, false),
      
      // Trading Features
      slotMarketplaceEnabled: this.parseBoolean(tokenForm.slotMarketplaceEnabled, false),
      valueMarketplaceEnabled: this.parseBoolean(tokenForm.valueMarketplaceEnabled, false),
      partialValueTrading: this.parseBoolean(tokenForm.partialValueTrading, false),
      tradingFeesEnabled: this.parseBoolean(tokenForm.tradingFeesEnabled, false),
      marketMakerEnabled: this.parseBoolean(tokenForm.marketMakerEnabled, false),
      
      // Governance Features
      slotVotingEnabled: this.parseBoolean(tokenForm.slotVotingEnabled, false),
      valueWeightedVoting: this.parseBoolean(tokenForm.valueWeightedVoting, false),
      delegateEnabled: this.parseBoolean(tokenForm.delegateEnabled, false),
      
      // DeFi Features
      yieldFarmingEnabled: this.parseBoolean(tokenForm.yieldFarmingEnabled, false),
      liquidityProvisionEnabled: this.parseBoolean(tokenForm.liquidityProvisionEnabled, false),
      compoundInterestEnabled: this.parseBoolean(tokenForm.compoundInterestEnabled, false),
      flashLoanEnabled: this.parseBoolean(tokenForm.flashLoanEnabled, false),
      
      // Compliance Features
      regulatoryComplianceEnabled: this.parseBoolean(tokenForm.regulatoryComplianceEnabled, false),
      kycRequired: this.parseBoolean(tokenForm.kycRequired, false),
      accreditedInvestorOnly: this.parseBoolean(tokenForm.accreditedInvestorOnly, false),
      useGeographicRestrictions: this.parseBoolean(tokenForm.useGeographicRestrictions, false),
      
      // Enterprise Features
      multiSignatureRequired: this.parseBoolean(tokenForm.multiSignatureRequired, false),
      approvalWorkflowEnabled: this.parseBoolean(tokenForm.approvalWorkflowEnabled, false),
      institutionalCustodySupport: this.parseBoolean(tokenForm.institutionalCustodySupport, false),
      auditTrailEnhanced: this.parseBoolean(tokenForm.auditTrailEnhanced, false),
      batchOperationsEnabled: this.parseBoolean(tokenForm.batchOperationsEnabled, false),
      emergencyPauseEnabled: this.parseBoolean(tokenForm.emergencyPauseEnabled, false)
    };

    // Financial Instrument Configuration
    let financialInstrument;
    if (tokenForm.financialInstrumentType) {
      financialInstrument = {
        instrumentType: tokenForm.financialInstrumentType,
        principalAmount: tokenForm.principalAmount || '',
        interestRate: tokenForm.interestRate || '',
        maturityDate: tokenForm.maturityDate || '',
        couponFrequency: tokenForm.couponFrequency || '',
        earlyRedemptionEnabled: this.parseBoolean(tokenForm.earlyRedemptionEnabled, false),
        redemptionPenaltyRate: tokenForm.redemptionPenaltyRate || ''
      };
    }

    // Derivative Configuration
    let derivative;
    if (tokenForm.derivativeType) {
      derivative = {
        derivativeType: tokenForm.derivativeType,
        underlyingAsset: tokenForm.underlyingAsset || '',
        underlyingAssetAddress: tokenForm.underlyingAssetAddress || '',
        strikePrice: tokenForm.strikePrice || '',
        expirationDate: tokenForm.expirationDate || '',
        settlementType: tokenForm.settlementType || '',
        leverageRatio: tokenForm.leverageRatio || ''
      };
    }

    // Value Computation Configuration
    let valueComputation;
    if (tokenForm.valueComputationMethod) {
      valueComputation = {
        computationMethod: tokenForm.valueComputationMethod,
        oracleAddress: tokenForm.valueOracleAddress || '',
        calculationFormula: tokenForm.valueCalculationFormula || '',
        accrualEnabled: this.parseBoolean(tokenForm.accrualEnabled, false),
        accrualRate: tokenForm.accrualRate || '',
        accrualFrequency: tokenForm.accrualFrequency || '',
        adjustmentEnabled: this.parseBoolean(tokenForm.valueAdjustmentEnabled, false)
      };
    }

    // Governance Configuration
    let governance;
    if (features.slotVotingEnabled || features.valueWeightedVoting) {
      governance = {
        votingPowerCalculation: tokenForm.votingPowerCalculation || 'value-weighted',
        quorumCalculationMethod: tokenForm.quorumCalculationMethod || 'simple-majority',
        proposalValueThreshold: tokenForm.proposalValueThreshold || '0'
      };
    }

    // DeFi Configuration
    let defi;
    if (features.yieldFarmingEnabled || features.flashLoanEnabled) {
      defi = {
        stakingYieldRate: tokenForm.stakingYieldRate || '',
        collateralFactor: tokenForm.collateralFactor || '',
        liquidationThreshold: tokenForm.liquidationThreshold || ''
      };
    }

    // Trading Configuration
    let trading;
    if (features.slotMarketplaceEnabled || features.valueMarketplaceEnabled) {
      trading = {
        minimumTradeValue: tokenForm.minimumTradeValue || '0',
        tradingFeePercentage: tokenForm.tradingFeePercentage || '0'
      };
    }

    // Compliance Configuration
    let compliance;
    if (features.regulatoryComplianceEnabled || features.useGeographicRestrictions) {
      compliance = {
        holdingPeriodRestrictions: tokenForm.holdingPeriodRestrictions || null,
        transferLimits: tokenForm.transferLimits || {},
        reportingRequirements: tokenForm.reportingRequirements || {},
        defaultRestrictionPolicy: tokenForm.defaultRestrictionPolicy || 'blocked',
        geographicRestrictions: tokenForm.geographicRestrictions || []
      };
    }

    // Royalty Configuration
    let royalty;
    if (features.hasRoyalty) {
      const royaltyPercentage = this.parseNumber(tokenForm.royaltyPercentage, 0);
      if (royaltyPercentage > 0) {
        royalty = {
          royaltyPercentage,
          royaltyReceiver: tokenForm.royaltyReceiver || deployerAddress
        };
      } else {
        warnings.push('Royalty enabled but percentage is 0 or invalid');
      }
    }

    // Metadata Configuration
    const metadata = {
      baseUri: tokenForm.baseUri || '',
      metadataStorage: tokenForm.metadataStorage || 'ipfs',
      dynamicMetadata: this.parseBoolean(tokenForm.dynamicMetadata, false),
      updatableUris: this.parseBoolean(tokenForm.updatableUris, false)
    };

    // Post-deployment Configuration
    const postDeployment = {
      slots: this.parseSlots(tokenForm.slots || [], warnings),
      allocations: this.parseAllocations(tokenForm.allocations || [], warnings),
      paymentSchedules: this.parsePaymentSchedules(tokenForm.paymentSchedules || [], warnings),
      valueAdjustments: this.parseValueAdjustments(tokenForm.valueAdjustments || [], warnings),
      slotConfigs: this.parseSlotConfigs(tokenForm.slotConfigs || [], warnings)
    };

    return {
      baseConfig,
      features,
      financialInstrument,
      derivative,
      valueComputation,
      governance,
      defi,
      trading,
      compliance,
      royalty,
      metadata,
      postDeployment
    };
  }

  /**
   * Analyze configuration complexity
   */
  private analyzeComplexity(config: EnhancedERC3525Config, tokenForm: any): ComplexityAnalysis {
    let score = 0;
    let featureCount = 0;
    const reasons: string[] = [];

    // Count enabled features
    const features = config.features;
    const featureKeys = Object.keys(features);
    featureCount = featureKeys.filter(key => features[key as keyof typeof features] === true).length;

    // Base complexity
    score += featureCount * 2;

    // Slot complexity
    const slotsCount = config.postDeployment.slots.length;
    if (slotsCount > 0) {
      score += slotsCount * 3;
      reasons.push(`${slotsCount} slots configured`);
    }

    // Allocation complexity
    const allocationsCount = config.postDeployment.allocations.length;
    if (allocationsCount > 0) {
      score += allocationsCount * 2;
      reasons.push(`${allocationsCount} allocations configured`);
    }

    // Payment schedules complexity
    const paymentsCount = config.postDeployment.paymentSchedules.length;
    if (paymentsCount > 0) {
      score += paymentsCount * 4;
      reasons.push(`${paymentsCount} payment schedules`);
    }

    // Value adjustments complexity
    const adjustmentsCount = config.postDeployment.valueAdjustments.length;
    if (adjustmentsCount > 0) {
      score += adjustmentsCount * 3;
      reasons.push(`${adjustmentsCount} value adjustments`);
    }

    // Advanced feature complexity bonuses
    if (config.financialInstrument) {
      score += 15;
      reasons.push(`Financial instrument: ${config.financialInstrument.instrumentType}`);
    }

    if (config.derivative) {
      score += 20;
      reasons.push(`Derivative: ${config.derivative.derivativeType}`);
    }

    if (config.valueComputation) {
      score += 10;
      reasons.push('Value computation enabled');
    }

    if (config.governance) {
      score += 12;
      reasons.push('Governance features enabled');
    }

    if (config.defi) {
      score += 15;
      reasons.push('DeFi features enabled');
    }

    if (config.compliance) {
      score += 8;
      reasons.push('Compliance features enabled');
    }

    // Determine complexity level and strategy
    let level: ComplexityAnalysis['level'];
    let deploymentStrategy: ComplexityAnalysis['deploymentStrategy'];
    let requiresChunking = false;
    let estimatedChunks = 1;

    if (score < 20) {
      level = 'low';
      deploymentStrategy = 'basic';
    } else if (score < 50) {
      level = 'medium';
      deploymentStrategy = 'enhanced';
    } else if (score < 100) {
      level = 'high';
      deploymentStrategy = 'chunked';
      requiresChunking = true;
      estimatedChunks = Math.ceil(score / 30);
    } else {
      level = 'extreme';
      deploymentStrategy = 'chunked';
      requiresChunking = true;
      estimatedChunks = Math.ceil(score / 25);
    }

    // Special cases that always require chunking
    if (slotsCount > 10 || allocationsCount > 20 || paymentsCount > 5) {
      requiresChunking = true;
      deploymentStrategy = 'chunked';
      if (level === 'low') level = 'medium';
      reasons.push('High entity count requires chunking');
    }

    return {
      level,
      score,
      featureCount,
      requiresChunking,
      deploymentStrategy,
      estimatedChunks,
      reasons
    };
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(
    config: EnhancedERC3525Config,
    warnings: string[],
    errors: string[]
  ): void {
    // Basic validation
    if (config.baseConfig.valueDecimals < 0 || config.baseConfig.valueDecimals > 18) {
      errors.push('Value decimals must be between 0 and 18');
    }

    // Slot validation
    if (config.postDeployment.slots.length === 0) {
      warnings.push('No slots configured - ERC-3525 tokens typically require at least one slot');
    }

    // Validate slot IDs are unique
    const slotIds = config.postDeployment.slots.map(s => s.slotId);
    const uniqueSlotIds = new Set(slotIds);
    if (slotIds.length !== uniqueSlotIds.size) {
      errors.push('Duplicate slot IDs found');
    }

    // Validate allocations reference existing slots
    for (const allocation of config.postDeployment.allocations) {
      if (!slotIds.includes(allocation.slotId)) {
        errors.push(`Allocation references non-existent slot: ${allocation.slotId}`);
      }
      
      if (!ethers.isAddress(allocation.recipient)) {
        errors.push(`Invalid recipient address in allocation: ${allocation.recipient}`);
      }

      const value = parseFloat(allocation.value);
      if (isNaN(value) || value <= 0) {
        errors.push(`Invalid allocation value: ${allocation.value}`);
      }
    }

    // Financial instrument validation
    if (config.financialInstrument) {
      const fi = config.financialInstrument;
      
      if ((fi.instrumentType === 'bond' || fi.instrumentType === 'note') && !fi.principalAmount) {
        errors.push('Principal amount required for debt instruments');
      }
      
      if (fi.instrumentType === 'derivative' && !config.derivative) {
        errors.push('Derivative configuration required for derivative instruments');
      }
    }

    // Royalty validation
    if (config.royalty) {
      if (config.royalty.royaltyPercentage < 0 || config.royalty.royaltyPercentage > 100) {
        errors.push('Royalty percentage must be between 0 and 100');
      }
      
      if (!ethers.isAddress(config.royalty.royaltyReceiver)) {
        errors.push('Invalid royalty receiver address');
      }
    }

    // DeFi validation
    if (config.defi) {
      if (config.features.flashLoanEnabled && (!config.defi.collateralFactor || !config.defi.liquidationThreshold)) {
        warnings.push('Collateral factor and liquidation threshold recommended for flash loans');
      }
    }

    // Governance validation
    if (config.governance && config.features.slotVotingEnabled) {
      if (!config.governance.proposalValueThreshold) {
        warnings.push('Proposal value threshold recommended for voting systems');
      }
    }
  }

  /**
   * Utility parsing methods
   */
  private parseBoolean(value: any, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return defaultValue;
  }

  private parseNumber(value: any, defaultValue: number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  private parseSlots(slots: any[], warnings: string[]): ERC3525Slot[] {
    return slots.map((slot, index) => {
      if (!slot.slotId || !slot.slotName) {
        warnings.push(`Slot ${index + 1} missing required fields`);
      }
      
      return {
        slotId: slot.slotId || `slot-${index + 1}`,
        slotName: slot.slotName || `Slot ${index + 1}`,
        slotDescription: slot.slotDescription || '',
        valueUnits: slot.valueUnits || '',
        slotType: slot.slotType || 'generic',
        transferable: this.parseBoolean(slot.transferable, true),
        tradeable: this.parseBoolean(slot.tradeable, true),
        divisible: this.parseBoolean(slot.divisible, true),
        minValue: slot.minValue || '0',
        maxValue: slot.maxValue || '',
        valuePrecision: this.parseNumber(slot.valuePrecision, 18),
        slotProperties: slot.slotProperties || {}
      };
    });
  }

  private parseAllocations(allocations: any[], warnings: string[]): ERC3525Allocation[] {
    return allocations.map((allocation, index) => {
      if (!allocation.tokenIdWithinSlot || !allocation.slotId || !allocation.recipient || !allocation.value) {
        warnings.push(`Allocation ${index + 1} missing required fields`);
      }
      
      return {
        tokenIdWithinSlot: allocation.tokenIdWithinSlot || `token-${index + 1}`,
        slotId: allocation.slotId || 'slot-1',
        recipient: allocation.recipient || ethers.ZeroAddress,
        value: allocation.value || '0',
        linkedTokenId: allocation.linkedTokenId
      };
    });
  }

  private parsePaymentSchedules(schedules: any[], warnings: string[]): ERC3525PaymentSchedule[] {
    return schedules.map((schedule, index) => {
      if (!schedule.slotId || !schedule.paymentDate || !schedule.paymentAmount || !schedule.paymentType) {
        warnings.push(`Payment schedule ${index + 1} missing required fields`);
      }
      
      return {
        slotId: schedule.slotId || 'slot-1',
        paymentDate: schedule.paymentDate || new Date().toISOString(),
        paymentAmount: schedule.paymentAmount || '0',
        paymentType: schedule.paymentType || 'interest',
        currency: schedule.currency || 'USD',
        isCompleted: this.parseBoolean(schedule.isCompleted, false)
      };
    });
  }

  private parseValueAdjustments(adjustments: any[], warnings: string[]): ERC3525ValueAdjustment[] {
    return adjustments.map((adjustment, index) => {
      if (!adjustment.slotId || !adjustment.adjustmentType || !adjustment.adjustmentAmount) {
        warnings.push(`Value adjustment ${index + 1} missing required fields`);
      }
      
      return {
        slotId: adjustment.slotId || 'slot-1',
        adjustmentDate: adjustment.adjustmentDate || new Date().toISOString(),
        adjustmentType: adjustment.adjustmentType || 'market',
        adjustmentAmount: adjustment.adjustmentAmount || '0',
        adjustmentReason: adjustment.adjustmentReason || '',
        oraclePrice: adjustment.oraclePrice || '',
        oracleSource: adjustment.oracleSource || ''
      };
    });
  }

  private parseSlotConfigs(configs: any[], warnings: string[]): ERC3525SlotConfig[] {
    return configs.map((config, index) => {
      if (!config.slotId) {
        warnings.push(`Slot config ${index + 1} missing slot ID`);
      }
      
      return {
        slotId: config.slotId || `slot-${index + 1}`,
        name: config.name || '',
        description: config.description || '',
        metadata: config.metadata || {},
        valueUnits: config.valueUnits || '',
        slotTransferable: this.parseBoolean(config.slotTransferable, true)
      };
    });
  }
}

// Export singleton instance
export const erc3525ConfigurationMapper = new ERC3525ConfigurationMapper();

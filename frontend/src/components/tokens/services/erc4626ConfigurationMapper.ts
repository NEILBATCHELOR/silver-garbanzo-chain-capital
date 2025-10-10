/**
 * ERC-4626 Configuration Mapper
 * 
 * Maps UI configuration to enhanced ERC-4626 contract parameters
 * Supports all 110+ max configuration features with complexity analysis
 */

import { TokenERC4626Properties } from '@/types/core/centralModels';

/**
 * Form data interface matching the max configuration UI
 */
export interface ERC4626FormData {
  // Basic vault properties
  name?: string;
  symbol?: string;
  description?: string;
  decimals?: number;
  assetAddress?: string;
  assetDecimals?: number;

  // Fee structure
  feeStructure?: {
    managementFee?: string;
    performanceFee?: string;
    withdrawalFee?: string;
    depositFee?: string;
    feeRecipient?: string;
  };

  // Deposit/withdrawal limits
  depositLimits?: {
    minDeposit?: string;
    maxDeposit?: string;
    depositLimit?: string;
    depositsEnabled?: boolean;
    withdrawalsEnabled?: boolean;
  };

  // Yield optimization
  yieldOptimization?: {
    enabled?: boolean;
    autoRebalancing?: boolean;
    rebalanceThreshold?: string;
    rebalanceFrequency?: number;
    autoCompounding?: boolean;
    compoundFrequency?: number;
    yieldFarmingEnabled?: boolean;
    arbitrageEnabled?: boolean;
    crossDexOptimization?: boolean;
  };

  // Risk management
  riskManagement?: {
    enabled?: boolean;
    maxLeverage?: string;
    liquidationThreshold?: string;
    liquidationPenalty?: string;
    impermanentLossProtection?: boolean;
    maxDrawdown?: string;
    stopLossEnabled?: boolean;
    stopLossThreshold?: string;
  };

  // Performance tracking
  performanceTracking?: {
    enabled?: boolean;
    benchmarkAPY?: string;
    realTimeTracking?: boolean;
    performanceHistoryRetention?: number;
    apyTrackingEnabled?: boolean;
    benchmarkTrackingEnabled?: boolean;
  };

  // Institutional features
  institutionalFeatures?: {
    institutionalGrade?: boolean;
    custodyIntegration?: boolean;
    complianceReporting?: boolean;
    fundAdministration?: boolean;
    thirdPartyAudits?: boolean;
    custodyProvider?: string;
    minimumInvestment?: string;
    kycRequired?: boolean;
    accreditedInvestorOnly?: boolean;
  };

  // DeFi integration
  defiIntegration?: {
    lendingProtocolEnabled?: boolean;
    borrowingEnabled?: boolean;
    leverageEnabled?: boolean;
    crossChainYieldEnabled?: boolean;
    marketMakingEnabled?: boolean;
    liquidityMiningEnabled?: boolean;
  };

  // Vault strategies (related data)
  vaultStrategies?: Array<{
    name?: string;
    strategyType?: string;
    allocation?: string;
    targetAPY?: string;
    riskLevel?: number;
    isActive?: boolean;
    autoRebalance?: boolean;
  }>;

  // Asset allocations (related data)
  assetAllocations?: Array<{
    assetAddress?: string;
    allocation?: string;
    assetType?: string;
    minAllocation?: string;
    maxAllocation?: string;
  }>;

  // Fee tiers (related data)
  feeTiers?: Array<{
    tierName?: string;
    minimumBalance?: string;
    managementFeeDiscount?: string;
    performanceFeeDiscount?: string;
    withdrawalFeeDiscount?: string;
  }>;

  // Performance metrics (related data)
  performanceMetrics?: Array<{
    metricName?: string;
    targetValue?: string;
    currentValue?: string;
    metricType?: string;
  }>;

  // Strategy parameters (related data)
  strategyParams?: Array<{
    parameterName?: string;
    parameterValue?: string;
    parameterType?: string;
    description?: string;
  }>;

  // Feature flags from max config
  gasFeeOptimization?: boolean;
  portfolioAnalyticsEnabled?: boolean;
  realTimePnlTracking?: boolean;
  taxReportingEnabled?: boolean;
  automatedReporting?: boolean;
  notificationSystemEnabled?: boolean;
  mobileAppIntegration?: boolean;
  socialTradingEnabled?: boolean;
  auditTrailComprehensive?: boolean;
  diversificationEnabled?: boolean;
  dynamicFeesEnabled?: boolean;
  feeRebateEnabled?: boolean;
}

/**
 * Enhanced contract configuration interface
 */
export interface EnhancedERC4626Config {
  // Contract constructor parameters
  vaultConfig: {
    name: string;
    symbol: string;
    decimals: number;
    asset: string;
    managementFee: number; // basis points
    performanceFee: number; // basis points
    depositLimit: string;
    minDeposit: string;
    withdrawalFee: number; // basis points
    depositsEnabled: boolean;
    withdrawalsEnabled: boolean;
    transfersPaused: boolean;
    feeRecipient: string;
    initialOwner: string;
  };

  yieldOptimization: {
    enabled: boolean;
    rebalanceThreshold: number; // basis points
    rebalanceFrequency: number; // seconds
    autoCompounding: boolean;
    compoundFrequency: number; // seconds
    yieldFarmingEnabled: boolean;
    arbitrageEnabled: boolean;
    crossDexOptimization: boolean;
  };

  riskManagement: {
    enabled: boolean;
    maxLeverage: string; // scaled by 1e18
    liquidationThreshold: number; // basis points
    liquidationPenalty: number; // basis points
    impermanentLossProtection: boolean;
    maxDrawdown: number; // basis points
    stopLossEnabled: boolean;
    stopLossThreshold: number; // basis points
  };

  performanceTracking: {
    enabled: boolean;
    benchmarkAPY: number; // basis points
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: string; // scaled by 1e18
    lastPerformanceUpdate: number;
    realTimeTracking: boolean;
    performanceHistoryRetention: number; // days
  };

  institutionalFeatures: {
    institutionalGrade: boolean;
    custodyIntegration: boolean;
    complianceReporting: boolean;
    fundAdministration: boolean;
    thirdPartyAudits: boolean;
    custodyProvider: string;
    minimumInvestment: string;
    kycRequired: boolean;
    accreditedInvestorOnly: boolean;
  };

  // Post-deployment configuration
  postDeployment: {
    strategies: Array<{
      name: string;
      strategyContract: string; // Will be set during deployment
      allocation: string; // scaled by 1e18
      targetAPY: number; // basis points
      riskLevel: number; // 1-10
      isActive: boolean;
      autoRebalance: boolean;
    }>;
    featureFlags: {
      leverageEnabled: boolean;
      crossChainYieldEnabled: boolean;
      lendingProtocolEnabled: boolean;
      marketMakingEnabled: boolean;
      liquidityMiningEnabled: boolean;
      socialTradingEnabled: boolean;
      notificationSystemEnabled: boolean;
    };
  };
}

/**
 * Configuration complexity analysis result
 */
export interface ERC4626ComplexityAnalysis {
  level: 'low' | 'medium' | 'high' | 'extreme';
  score: number;
  featureCount: number;
  requiresChunking: boolean;
  recommendedStrategy: 'basic' | 'enhanced' | 'chunked';
  reasoning: string[];
  warnings: string[];
  gasEstimate: {
    basic: number;
    enhanced: number;
    chunked: number;
  };
}

/**
 * Configuration mapping result
 */
export interface ERC4626ConfigurationResult {
  success: boolean;
  config?: EnhancedERC4626Config;
  complexity: ERC4626ComplexityAnalysis;
  warnings: string[];
  errors: string[];
}

/**
 * ERC-4626 Configuration Mapper Class
 */
export class ERC4626ConfigurationMapper {

  /**
   * Map token form data to enhanced ERC-4626 configuration
   * ✅ FIX #4: Removed 'default_address' default parameter - deployerAddress should always be provided
   */
  mapTokenFormToEnhancedConfig(
    tokenForm: any,
    deployerAddress?: string
  ): ERC4626ConfigurationResult {
    try {
      const warnings: string[] = [];
      const errors: string[] = [];

      // Extract form data
      const formData = this.extractFormData(tokenForm, deployerAddress);

      // Validate required fields
      const validation = this.validateConfiguration(formData);
      if (!validation.isValid) {
        return {
          success: false,
          complexity: this.analyzeComplexity(formData),
          warnings,
          errors: validation.errors
        };
      }

      // Build enhanced configuration
      // ✅ FIX #4: Provide default empty string if deployerAddress is undefined
      const config = this.buildEnhancedConfig(formData, deployerAddress || '', warnings);

      // Analyze complexity
      const complexity = this.analyzeComplexity(formData);

      return {
        success: true,
        config,
        complexity,
        warnings,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        complexity: {
          level: 'low',
          score: 0,
          featureCount: 0,
          requiresChunking: false,
          recommendedStrategy: 'basic',
          reasoning: ['Error during configuration mapping'],
          warnings: [],
          gasEstimate: { basic: 2000000, enhanced: 2000000, chunked: 2000000 }
        },
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Extract form data from various input formats
   */
  private extractFormData(tokenForm: any, deployerAddress?: string): ERC4626FormData {
    return {
      // Basic properties
      name: tokenForm.name || '',
      symbol: tokenForm.symbol || '',
      description: tokenForm.description || '',
      decimals: tokenForm.decimals || 18,
      assetAddress: tokenForm.assetAddress || tokenForm.erc4626Properties?.assetAddress || '',
      assetDecimals: tokenForm.assetDecimals || 18,

      // Fee structure
      // ✅ FIX #4: Removed 'default_address' fallback - use deployerAddress or empty string
      feeStructure: {
        managementFee: tokenForm.feeStructure?.managementFee || tokenForm.erc4626Properties?.feeStructure?.managementFee || '2',
        performanceFee: tokenForm.feeStructure?.performanceFee || tokenForm.erc4626Properties?.feeStructure?.performanceFee || '20',
        withdrawalFee: tokenForm.feeStructure?.withdrawalFee || tokenForm.erc4626Properties?.feeStructure?.withdrawalFee || '0',
        depositFee: tokenForm.feeStructure?.depositFee || tokenForm.erc4626Properties?.feeStructure?.depositFee || '0',
        feeRecipient: tokenForm.feeStructure?.feeRecipient || tokenForm.deployed_by || deployerAddress || ''
      },

      // Deposit limits
      depositLimits: {
        minDeposit: tokenForm.minDeposit || tokenForm.erc4626Properties?.minDeposit || '0',
        maxDeposit: tokenForm.maxDeposit || tokenForm.erc4626Properties?.maxDeposit || '0',
        depositLimit: tokenForm.depositLimit || tokenForm.erc4626Properties?.depositLimit || '0',
        depositsEnabled: tokenForm.depositsEnabled ?? tokenForm.erc4626Properties?.depositsEnabled ?? true,
        withdrawalsEnabled: tokenForm.withdrawalsEnabled ?? tokenForm.erc4626Properties?.withdrawalsEnabled ?? true
      },

      // Feature flags from max config
      yieldOptimization: {
        enabled: tokenForm.yieldOptimizationEnabled || false,
        autoRebalancing: tokenForm.automatedRebalancing || false,
        rebalanceThreshold: tokenForm.rebalanceThreshold || '5', // 5%
        rebalanceFrequency: tokenForm.rebalanceFrequency || 86400, // 1 day
        autoCompounding: tokenForm.autoCompoundingEnabled || false,
        compoundFrequency: tokenForm.compoundFrequency || 86400, // 1 day
        yieldFarmingEnabled: tokenForm.liquivityMiningEnabled || false, // Note: liquivityMiningEnabled maps to yieldFarmingEnabled
        arbitrageEnabled: tokenForm.arbitrageEnabled || false,
        crossDexOptimization: tokenForm.crossDexOptimization || false
      },

      riskManagement: {
        enabled: tokenForm.riskManagementEnabled || false,
        maxLeverage: tokenForm.maxLeverage || '2', // 2x leverage
        liquidationThreshold: tokenForm.liquidationThreshold || '80', // 80%
        liquidationPenalty: tokenForm.liquidationPenalty || '5', // 5%
        impermanentLossProtection: tokenForm.impermanentLossProtection || false,
        maxDrawdown: tokenForm.maxDrawdown || '20', // 20%
        stopLossEnabled: tokenForm.stopLossEnabled || false,
        stopLossThreshold: tokenForm.stopLossThreshold || '10' // 10%
      },

      performanceTracking: {
        enabled: tokenForm.performanceTracking || false,
        benchmarkAPY: tokenForm.benchmarkAPY || '5', // 5%
        realTimeTracking: tokenForm.realTimePnlTracking || false,
        performanceHistoryRetention: tokenForm.performanceHistoryRetention || 365,
        apyTrackingEnabled: tokenForm.apyTrackingEnabled || false,
        benchmarkTrackingEnabled: tokenForm.benchmarkTrackingEnabled || false
      },

      institutionalFeatures: {
        institutionalGrade: tokenForm.institutionalGrade || false,
        custodyIntegration: tokenForm.custodyIntegration || false,
        complianceReporting: tokenForm.complianceReportingEnabled || false,
        fundAdministration: tokenForm.fundAdministrationEnabled || false,
        thirdPartyAudits: tokenForm.thirdPartyAuditsEnabled || false,
        custodyProvider: tokenForm.custodyProvider || '',
        minimumInvestment: tokenForm.minimumInvestment || '0',
        kycRequired: tokenForm.kycRequired || false,
        accreditedInvestorOnly: tokenForm.accreditedInvestorOnly || false
      },

      defiIntegration: {
        lendingProtocolEnabled: tokenForm.lendingProtocolEnabled || false,
        borrowingEnabled: tokenForm.borrowingEnabled || false,
        leverageEnabled: tokenForm.leverageEnabled || false,
        crossChainYieldEnabled: tokenForm.crossChainYieldEnabled || false,
        marketMakingEnabled: tokenForm.marketMakingEnabled || false,
        liquidityMiningEnabled: tokenForm.liquivityMiningEnabled || false // Note: typo in original config
      },

      // Related data
      vaultStrategies: tokenForm.vaultStrategies || [],
      assetAllocations: tokenForm.assetAllocations || [],
      feeTiers: tokenForm.feeTiers || [],
      performanceMetrics: tokenForm.performanceMetrics || [],
      strategyParams: tokenForm.strategyParams || [],

      // Additional feature flags
      gasFeeOptimization: tokenForm.gasFeeOptimization || false,
      portfolioAnalyticsEnabled: tokenForm.portfolioAnalyticsEnabled || false,
      realTimePnlTracking: tokenForm.realTimePnlTracking || false,
      taxReportingEnabled: tokenForm.taxReportingEnabled || false,
      automatedReporting: tokenForm.automatedReporting || false,
      notificationSystemEnabled: tokenForm.notificationSystemEnabled || false,
      mobileAppIntegration: tokenForm.mobileAppIntegration || false,
      socialTradingEnabled: tokenForm.socialTradingEnabled || false,
      auditTrailComprehensive: tokenForm.auditTrailComprehensive || false,
      diversificationEnabled: tokenForm.diversificationEnabled || false,
      dynamicFeesEnabled: tokenForm.dynamicFeesEnabled || false,
      feeRebateEnabled: tokenForm.feeRebateEnabled || false
    };
  }

  /**
   * Validate configuration data
   */
  private validateConfiguration(formData: ERC4626FormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!formData.name || formData.name.trim() === '') {
      errors.push('Vault name is required');
    }

    if (!formData.symbol || formData.symbol.trim() === '') {
      errors.push('Vault symbol is required');
    }

    if (!formData.assetAddress || formData.assetAddress === '') {
      errors.push('Asset address is required');
    }

    // Validate Ethereum address format
    if (formData.assetAddress && !/^0x[a-fA-F0-9]{40}$/.test(formData.assetAddress)) {
      errors.push('Invalid asset address format');
    }

    // Validate fee percentages
    const managementFee = parseFloat(formData.feeStructure?.managementFee || '0');
    if (managementFee < 0 || managementFee > 10) {
      errors.push('Management fee must be between 0% and 10%');
    }

    const performanceFee = parseFloat(formData.feeStructure?.performanceFee || '0');
    if (performanceFee < 0 || performanceFee > 50) {
      errors.push('Performance fee must be between 0% and 50%');
    }

    // Validate leverage
    const maxLeverage = parseFloat(formData.riskManagement?.maxLeverage || '1');
    if (formData.riskManagement?.enabled && (maxLeverage < 1 || maxLeverage > 10)) {
      errors.push('Maximum leverage must be between 1x and 10x');
    }

    // Validate strategy allocations
    if (formData.vaultStrategies && formData.vaultStrategies.length > 0) {
      let totalAllocation = 0;
      for (const strategy of formData.vaultStrategies) {
        const allocation = parseFloat(strategy.allocation || '0');
        if (allocation < 0 || allocation > 100) {
          errors.push(`Strategy "${strategy.name}" allocation must be between 0% and 100%`);
        }
        totalAllocation += allocation;
      }
      
      if (totalAllocation > 100) {
        errors.push('Total strategy allocation cannot exceed 100%');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Build enhanced contract configuration
   */
  private buildEnhancedConfig(
    formData: ERC4626FormData,
    deployerAddress: string,
    warnings: string[]
  ): EnhancedERC4626Config {
    
    // Helper to convert percentage to basis points
    const toBasisPoints = (percentage: string): number => {
      return Math.round(parseFloat(percentage) * 100);
    };

    // Helper to convert percentage to scaled value (1e18)
    const toScaledValue = (percentage: string): string => {
      const value = parseFloat(percentage);
      return (BigInt(Math.round(value * 1e16)) * BigInt(100)).toString(); // Scale by 1e18
    };

    return {
      vaultConfig: {
        name: formData.name || 'Enhanced Vault',
        symbol: formData.symbol || 'EVAULT',
        decimals: formData.decimals || 18,
        asset: formData.assetAddress || '',
        managementFee: toBasisPoints(formData.feeStructure?.managementFee || '2'),
        performanceFee: toBasisPoints(formData.feeStructure?.performanceFee || '20'),
        depositLimit: formData.depositLimits?.depositLimit || '0',
        minDeposit: formData.depositLimits?.minDeposit || '0',
        withdrawalFee: toBasisPoints(formData.feeStructure?.withdrawalFee || '0'),
        depositsEnabled: formData.depositLimits?.depositsEnabled ?? true,
        withdrawalsEnabled: formData.depositLimits?.withdrawalsEnabled ?? true,
        transfersPaused: false,
        feeRecipient: formData.feeStructure?.feeRecipient || deployerAddress,
        initialOwner: deployerAddress
      },

      yieldOptimization: {
        enabled: formData.yieldOptimization?.enabled || false,
        rebalanceThreshold: toBasisPoints(formData.yieldOptimization?.rebalanceThreshold || '5'),
        rebalanceFrequency: formData.yieldOptimization?.rebalanceFrequency || 86400,
        autoCompounding: formData.yieldOptimization?.autoCompounding || false,
        compoundFrequency: formData.yieldOptimization?.compoundFrequency || 86400,
        yieldFarmingEnabled: formData.yieldOptimization?.yieldFarmingEnabled || false,
        arbitrageEnabled: formData.yieldOptimization?.arbitrageEnabled || false,
        crossDexOptimization: formData.yieldOptimization?.crossDexOptimization || false
      },

      riskManagement: {
        enabled: formData.riskManagement?.enabled || false,
        maxLeverage: toScaledValue(formData.riskManagement?.maxLeverage || '1'),
        liquidationThreshold: toBasisPoints(formData.riskManagement?.liquidationThreshold || '80'),
        liquidationPenalty: toBasisPoints(formData.riskManagement?.liquidationPenalty || '5'),
        impermanentLossProtection: formData.riskManagement?.impermanentLossProtection || false,
        maxDrawdown: toBasisPoints(formData.riskManagement?.maxDrawdown || '20'),
        stopLossEnabled: formData.riskManagement?.stopLossEnabled || false,
        stopLossThreshold: toBasisPoints(formData.riskManagement?.stopLossThreshold || '10')
      },

      performanceTracking: {
        enabled: formData.performanceTracking?.enabled || false,
        benchmarkAPY: toBasisPoints(formData.performanceTracking?.benchmarkAPY || '5'),
        totalReturn: 0, // Will be calculated dynamically
        maxDrawdown: 0, // Will be calculated dynamically
        sharpeRatio: '0', // Will be calculated dynamically
        lastPerformanceUpdate: Math.floor(Date.now() / 1000),
        realTimeTracking: formData.performanceTracking?.realTimeTracking || false,
        performanceHistoryRetention: formData.performanceTracking?.performanceHistoryRetention || 365
      },

      institutionalFeatures: {
        institutionalGrade: formData.institutionalFeatures?.institutionalGrade || false,
        custodyIntegration: formData.institutionalFeatures?.custodyIntegration || false,
        complianceReporting: formData.institutionalFeatures?.complianceReporting || false,
        fundAdministration: formData.institutionalFeatures?.fundAdministration || false,
        thirdPartyAudits: formData.institutionalFeatures?.thirdPartyAudits || false,
        custodyProvider: formData.institutionalFeatures?.custodyProvider || deployerAddress,
        minimumInvestment: formData.institutionalFeatures?.minimumInvestment || '0',
        kycRequired: formData.institutionalFeatures?.kycRequired || false,
        accreditedInvestorOnly: formData.institutionalFeatures?.accreditedInvestorOnly || false
      },

      postDeployment: {
        strategies: (formData.vaultStrategies || []).map((strategy, index) => ({
          name: strategy.name || `Strategy ${index + 1}`,
          strategyContract: deployerAddress, // Placeholder - will be set during deployment
          allocation: toScaledValue(strategy.allocation || '0'),
          targetAPY: toBasisPoints(strategy.targetAPY || '0'),
          riskLevel: strategy.riskLevel || 5,
          isActive: strategy.isActive ?? true,
          autoRebalance: strategy.autoRebalance ?? true
        })),

        featureFlags: {
          leverageEnabled: formData.defiIntegration?.leverageEnabled || false,
          crossChainYieldEnabled: formData.defiIntegration?.crossChainYieldEnabled || false,
          lendingProtocolEnabled: formData.defiIntegration?.lendingProtocolEnabled || false,
          marketMakingEnabled: formData.defiIntegration?.marketMakingEnabled || false,
          liquidityMiningEnabled: formData.defiIntegration?.liquidityMiningEnabled || false,
          socialTradingEnabled: formData.socialTradingEnabled || false,
          notificationSystemEnabled: formData.notificationSystemEnabled || false
        }
      }
    };
  }

  /**
   * Analyze configuration complexity
   */
  private analyzeComplexity(formData: ERC4626FormData): ERC4626ComplexityAnalysis {
    let score = 0;
    let featureCount = 0;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Base complexity
    score += 10;
    reasoning.push('Base ERC-4626 vault configuration');

    // Fee structure complexity
    if (formData.feeStructure?.managementFee && parseFloat(formData.feeStructure.managementFee) > 0) {
      score += 5;
      featureCount++;
    }
    if (formData.feeStructure?.performanceFee && parseFloat(formData.feeStructure.performanceFee) > 0) {
      score += 8;
      featureCount++;
    }
    if (formData.feeStructure?.withdrawalFee && parseFloat(formData.feeStructure.withdrawalFee) > 0) {
      score += 3;
      featureCount++;
    }

    // Yield optimization features
    if (formData.yieldOptimization?.enabled) {
      score += 15;
      featureCount++;
      reasoning.push('Yield optimization enabled');
      
      if (formData.yieldOptimization.autoRebalancing) {
        score += 10;
        featureCount++;
        reasoning.push('Automated rebalancing requires complex logic');
      }
      
      if (formData.yieldOptimization.yieldFarmingEnabled) {
        score += 12;
        featureCount++;
        reasoning.push('Yield farming integration');
      }
      
      if (formData.yieldOptimization.arbitrageEnabled) {
        score += 15;
        featureCount++;
        reasoning.push('Arbitrage features require advanced trading logic');
      }
    }

    // Risk management features
    if (formData.riskManagement?.enabled) {
      score += 20;
      featureCount++;
      reasoning.push('Risk management system enabled');
      
      if (formData.riskManagement.maxLeverage && parseFloat(formData.riskManagement.maxLeverage) > 2) {
        score += 15;
        featureCount++;
        reasoning.push('High leverage requires sophisticated risk controls');
        warnings.push('High leverage increases complexity and risk');
      }
      
      if (formData.riskManagement.impermanentLossProtection) {
        score += 20;
        featureCount++;
        reasoning.push('Impermanent loss protection requires complex calculations');
      }
    }

    // Performance tracking
    if (formData.performanceTracking?.enabled) {
      score += 10;
      featureCount++;
      
      if (formData.performanceTracking.realTimeTracking) {
        score += 15;
        featureCount++;
        reasoning.push('Real-time performance tracking adds complexity');
      }
    }

    // Institutional features
    if (formData.institutionalFeatures?.institutionalGrade) {
      score += 25;
      featureCount++;
      reasoning.push('Institutional-grade features require extensive compliance');
      
      if (formData.institutionalFeatures.custodyIntegration) {
        score += 10;
        featureCount++;
      }
      
      if (formData.institutionalFeatures.complianceReporting) {
        score += 8;
        featureCount++;
      }
    }

    // DeFi integration features
    if (formData.defiIntegration?.lendingProtocolEnabled) {
      score += 18;
      featureCount++;
      reasoning.push('Lending protocol integration');
    }

    if (formData.defiIntegration?.leverageEnabled) {
      score += 20;
      featureCount++;
      reasoning.push('Leverage functionality requires complex risk management');
    }

    if (formData.defiIntegration?.crossChainYieldEnabled) {
      score += 25;
      featureCount++;
      reasoning.push('Cross-chain yield requires bridge integration');
    }

    // Strategy complexity
    const strategyCount = formData.vaultStrategies?.length || 0;
    if (strategyCount > 0) {
      score += strategyCount * 8;
      featureCount += strategyCount;
      reasoning.push(`${strategyCount} vault strategies configured`);
      
      if (strategyCount > 5) {
        warnings.push('Large number of strategies may require chunked deployment');
      }
    }

    // Asset allocation complexity
    const allocationCount = formData.assetAllocations?.length || 0;
    if (allocationCount > 0) {
      score += allocationCount * 3;
      featureCount += allocationCount;
      
      if (allocationCount > 15) {
        score += 20;
        reasoning.push('Complex asset allocation structure');
        warnings.push('Large number of allocations increases gas costs');
      }
    }

    // Fee tiers complexity
    const feeTierCount = formData.feeTiers?.length || 0;
    if (feeTierCount > 0) {
      score += feeTierCount * 5;
      featureCount += feeTierCount;
      reasoning.push('Fee tier system adds complexity');
    }

    // Additional features
    const additionalFeatures = [
      formData.gasFeeOptimization,
      formData.portfolioAnalyticsEnabled,
      formData.realTimePnlTracking,
      formData.taxReportingEnabled,
      formData.automatedReporting,
      formData.notificationSystemEnabled,
      formData.socialTradingEnabled,
      formData.auditTrailComprehensive,
      formData.diversificationEnabled,
      formData.dynamicFeesEnabled
    ].filter(Boolean).length;

    score += additionalFeatures * 2;
    featureCount += additionalFeatures;

    // Determine complexity level and recommendations
    let level: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    let recommendedStrategy: 'basic' | 'enhanced' | 'chunked' = 'basic';
    let requiresChunking = false;

    if (score >= 150) {
      level = 'extreme';
      recommendedStrategy = 'chunked';
      requiresChunking = true;
      reasoning.push('Extreme complexity requires chunked deployment for reliability');
    } else if (score >= 100) {
      level = 'high';
      recommendedStrategy = 'chunked';
      requiresChunking = true;
      reasoning.push('High complexity benefits from chunked deployment');
    } else if (score >= 50) {
      level = 'medium';
      recommendedStrategy = 'enhanced';
      reasoning.push('Medium complexity suitable for enhanced deployment');
    } else {
      level = 'low';
      recommendedStrategy = 'basic';
      reasoning.push('Low complexity suitable for basic deployment');
    }

    // Gas estimates based on complexity
    const baseGas = 2800000;
    const gasEstimate = {
      basic: baseGas,
      enhanced: Math.round(baseGas * (1 + score * 0.01)),
      chunked: Math.round(baseGas * (1 + score * 0.005)) // Chunked is more efficient
    };

    return {
      level,
      score,
      featureCount,
      requiresChunking,
      recommendedStrategy,
      reasoning,
      warnings,
      gasEstimate
    };
  }
}

// Export singleton instance
export const erc4626ConfigurationMapper = new ERC4626ConfigurationMapper();

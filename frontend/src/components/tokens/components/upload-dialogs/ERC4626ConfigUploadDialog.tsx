/**
 * ERC4626ConfigUploadDialog.tsx
 * 
 * Comprehensive JSON configuration upload dialog specifically for ERC4626 vault tokens.
 * Covers ALL 110+ fields from TokenERC4626Properties table and related ERC4626 tables.
 * 
 * Supports:
 * - All ERC4626 core properties (assetAddress, vaultType, strategy, etc.)
 * - Vault strategy management and configuration
 * - Asset allocation and portfolio management
 * - Fee structures and performance tracking
 * - Risk management and insurance features
 * - DeFi protocol integrations and yield optimization
 * - Governance and institutional features
 * - Compliance and regulatory capabilities
 * - No validation blocking - accepts any valid JSON structure
 */

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Download, 
  CheckCircle, 
  Info,
  Copy,
  Eye,
  EyeOff,
  Vault,
  Code,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenFormData } from "../../types";
import { TokenStandard } from "@/types/core/centralModels";
import { useToast } from "@/components/ui/use-toast";

interface ERC4626ConfigUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (tokenData: Partial<TokenFormData>) => void;
}

interface ProcessingResult {
  isValid: boolean;
  warnings: string[];
  mappedData?: Partial<TokenFormData>;
  fieldsDetected?: number;
  structureAnalysis?: {
    hasERC4626Properties: boolean;
    hasVaultStrategies: boolean;
    hasAssetAllocations: boolean;
    hasFeeTiers: boolean;
    hasPerformanceMetrics: boolean;
    hasStrategyParams: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

const ERC4626ConfigUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
}: ERC4626ConfigUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [rawJsonData, setRawJsonData] = useState<any>(null);
  const [jsonText, setJsonText] = useState<string>("");
  const [showRawData, setShowRawData] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  /**
   * ERC4626-specific JSON processing with comprehensive field mapping
   * Covers all 110+ fields from TokenERC4626Properties and related tables
   */
  const processERC4626JsonData = (jsonData: any): ProcessingResult => {
    const warnings: string[] = [];
    const mappedData: Partial<TokenFormData> = {};
    let fieldsDetected = 0;

    // Helper function to get nested values safely
    const getNestedValue = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    };

    // ==========================================
    // CORE ERC4626 FIELD MAPPINGS (ALL 110+ FIELDS)
    // ==========================================

    // Core token information
    const coreFieldMappings = {
      name: [
        'name', 'tokenName', 'vaultName', 'token_name', 'vaultTokenName', 'fundName'
      ],
      symbol: [
        'symbol', 'tokenSymbol', 'vaultSymbol', 'token_symbol', 'fundSymbol'
      ],
      
      // Asset configuration
      assetAddress: [
        'assetAddress', 'asset_address', 'underlyingAsset', 'baseAsset', 'depositAsset'
      ],
      assetName: [
        'assetName', 'asset_name', 'underlyingName', 'baseAssetName'
      ],
      assetSymbol: [
        'assetSymbol', 'asset_symbol', 'underlyingSymbol', 'baseSymbol'
      ],
      assetDecimals: [
        'assetDecimals', 'asset_decimals', 'underlyingDecimals', 'baseDecimals'
      ],
      
      // Vault configuration
      vaultType: [
        'vaultType', 'vault_type', 'strategyType', 'fundType', 'vaultCategory'
      ],
      isMintable: [
        'isMintable', 'is_mintable', 'mintable', 'canMint', 'allowMinting'
      ],
      isBurnable: [
        'isBurnable', 'is_burnable', 'burnable', 'canBurn', 'allowBurning'
      ],
      isPausable: [
        'isPausable', 'is_pausable', 'pausable', 'canPause', 'allowPausing'
      ],
      
      // Strategy configuration
      vaultStrategy: [
        'vaultStrategy', 'vault_strategy', 'strategy', 'investmentStrategy', 'yieldStrategy'
      ],
      customStrategy: [
        'customStrategy', 'custom_strategy', 'hasCustomStrategy', 'customStrategyEnabled'
      ],
      strategyController: [
        'strategyController', 'strategy_controller', 'controller', 'strategyManager'
      ],
      accessControl: [
        'accessControl', 'access_control', 'permissions', 'controlType'
      ],
      permit: [
        'permit', 'permitEnabled', 'eip2612', 'permitSupport'
      ],
      flashLoans: [
        'flashLoans', 'flash_loans', 'flashLoanEnabled', 'flashLoanSupport'
      ],
      emergencyShutdown: [
        'emergencyShutdown', 'emergency_shutdown', 'emergencyExit', 'emergencyStop'
      ],
      
      // Performance and tracking
      performanceTrackingEnabled: [
        'performanceTrackingEnabled', 'performance_tracking_enabled', 'trackPerformance', 'metricsEnabled'
      ],
      
      // Yield and strategy details
      yieldSource: [
        'yieldSource', 'yield_source', 'yieldStrategy', 'incomeSource'
      ],
      strategyDocumentation: [
        'strategyDocumentation', 'strategy_documentation', 'docs', 'documentation'
      ],
      rebalanceThreshold: [
        'rebalanceThreshold', 'rebalance_threshold', 'rebalanceTrigger'
      ],
      liquidityReserve: [
        'liquidityReserve', 'liquidity_reserve', 'cashReserve', 'reserveRatio'
      ],
      maxSlippage: [
        'maxSlippage', 'max_slippage', 'slippageTolerance', 'maxSlippageTolerance'
      ],
      
      // Deposit and withdrawal limits
      depositLimit: [
        'depositLimit', 'deposit_limit', 'maxDeposit', 'depositCap'
      ],
      withdrawalLimit: [
        'withdrawalLimit', 'withdrawal_limit', 'maxWithdrawal', 'withdrawalCap'
      ],
      minDeposit: [
        'minDeposit', 'min_deposit', 'minimumDeposit', 'depositMinimum'
      ],
      maxDeposit: [
        'maxDeposit', 'max_deposit', 'maximumDeposit', 'depositMaximum'
      ],
      minWithdrawal: [
        'minWithdrawal', 'min_withdrawal', 'minimumWithdrawal', 'withdrawalMinimum'
      ],
      maxWithdrawal: [
        'maxWithdrawal', 'max_withdrawal', 'maximumWithdrawal', 'withdrawalMaximum'
      ],
      
      // Performance tracking
      performanceTracking: [
        'performanceTracking', 'performance_tracking', 'trackPerformance', 'performanceMonitoring'
      ],
      
      // Fee structure
      depositFee: [
        'depositFee', 'deposit_fee', 'entryFee', 'subscriptionFee'
      ],
      withdrawalFee: [
        'withdrawalFee', 'withdrawal_fee', 'exitFee', 'redemptionFee'
      ],
      managementFee: [
        'managementFee', 'management_fee', 'annualFee', 'adminFee'
      ],
      performanceFee: [
        'performanceFee', 'performance_fee', 'incentiveFee', 'carryFee'
      ],
      feeRecipient: [
        'feeRecipient', 'fee_recipient', 'feeAddress', 'treasuryAddress'
      ],
      
      // Yield optimization features
      yieldOptimizationEnabled: [
        'yieldOptimizationEnabled', 'yield_optimization_enabled', 'optimizeYield', 'yieldOptimization'
      ],
      automatedRebalancing: [
        'automatedRebalancing', 'automated_rebalancing', 'autoRebalance', 'rebalancingEnabled'
      ],
      
      // Geographic and access restrictions
      useGeographicRestrictions: [
        'useGeographicRestrictions', 'use_geographic_restrictions', 'geoRestrictions', 'geographicLimits'
      ],
      defaultRestrictionPolicy: [
        'defaultRestrictionPolicy', 'default_restriction_policy', 'restrictionDefault'
      ],
      
      // Strategy complexity and features
      strategyComplexity: [
        'strategyComplexity', 'strategy_complexity', 'complexity', 'strategyType'
      ],
      multiAssetEnabled: [
        'multiAssetEnabled', 'multi_asset_enabled', 'multiAsset', 'diversifiedAssets'
      ],
      rebalancingEnabled: [
        'rebalancingEnabled', 'rebalancing_enabled', 'autoRebalancing', 'rebalanceEnabled'
      ],
      autoCompoundingEnabled: [
        'autoCompoundingEnabled', 'auto_compounding_enabled', 'autoCompound', 'compoundingEnabled'
      ],
      yieldOptimizationStrategy: [
        'yieldOptimizationStrategy', 'yield_optimization_strategy', 'optimizationStrategy'
      ],
      
      // Risk management
      riskManagementEnabled: [
        'riskManagementEnabled', 'risk_management_enabled', 'riskManagement', 'riskControls'
      ],
      riskTolerance: [
        'riskTolerance', 'risk_tolerance', 'riskLevel', 'riskProfile'
      ],
      diversificationEnabled: [
        'diversificationEnabled', 'diversification_enabled', 'diversification', 'diversify'
      ],
      
      // Performance benchmarking
      apyTrackingEnabled: [
        'apyTrackingEnabled', 'apy_tracking_enabled', 'trackApy', 'apyTracking'
      ],
      benchmarkTrackingEnabled: [
        'benchmarkTrackingEnabled', 'benchmark_tracking_enabled', 'benchmarkTracking'
      ],
      benchmarkIndex: [
        'benchmarkIndex', 'benchmark_index', 'benchmark', 'referenceIndex'
      ],
      performanceHistoryRetention: [
        'performanceHistoryRetention', 'performance_history_retention', 'historyRetention'
      ],
      
      // Yield distribution
      yieldDistributionSchedule: [
        'yieldDistributionSchedule', 'yield_distribution_schedule', 'distributionSchedule'
      ],
      compoundFrequency: [
        'compoundFrequency', 'compound_frequency', 'compoundingFrequency'
      ],
      
      // Insurance and protection
      insuranceEnabled: [
        'insuranceEnabled', 'insurance_enabled', 'protectionEnabled', 'insured'
      ],
      insuranceProvider: [
        'insuranceProvider', 'insurance_provider', 'insurer', 'protectionProvider'
      ],
      insuranceCoverageAmount: [
        'insuranceCoverageAmount', 'insurance_coverage_amount', 'coverageAmount'
      ],
      
      // Emergency and risk controls
      emergencyExitEnabled: [
        'emergencyExitEnabled', 'emergency_exit_enabled', 'emergencyWithdrawal'
      ],
      circuitBreakerEnabled: [
        'circuitBreakerEnabled', 'circuit_breaker_enabled', 'circuitBreaker'
      ],
      maxDrawdownThreshold: [
        'maxDrawdownThreshold', 'max_drawdown_threshold', 'drawdownLimit'
      ],
      stopLossEnabled: [
        'stopLossEnabled', 'stop_loss_enabled', 'stopLoss', 'stopLossProtection'
      ],
      stopLossThreshold: [
        'stopLossThreshold', 'stop_loss_threshold', 'stopLossLevel'
      ],
      
      // Governance features
      governanceTokenEnabled: [
        'governanceTokenEnabled', 'governance_token_enabled', 'governance', 'governanceSupport'
      ],
      governanceTokenAddress: [
        'governanceTokenAddress', 'governance_token_address', 'governanceToken'
      ],
      votingPowerPerShare: [
        'votingPowerPerShare', 'voting_power_per_share', 'voteWeight', 'votingRatio'
      ],
      strategyVotingEnabled: [
        'strategyVotingEnabled', 'strategy_voting_enabled', 'strategyGovernance'
      ],
      feeVotingEnabled: [
        'feeVotingEnabled', 'fee_voting_enabled', 'feeGovernance'
      ],
      
      // Manager performance and controls
      managerPerformanceThreshold: [
        'managerPerformanceThreshold', 'manager_performance_threshold', 'performanceThreshold'
      ],
      managerReplacementEnabled: [
        'managerReplacementEnabled', 'manager_replacement_enabled', 'managerReplacement'
      ],
      
      // Dynamic fee features
      dynamicFeesEnabled: [
        'dynamicFeesEnabled', 'dynamic_fees_enabled', 'dynamicFees', 'variableFees'
      ],
      performanceFeeHighWaterMark: [
        'performanceFeeHighWaterMark', 'performance_fee_high_water_mark', 'highWaterMark'
      ],
      feeTierSystemEnabled: [
        'feeTierSystemEnabled', 'fee_tier_system_enabled', 'tieredFees'
      ],
      earlyWithdrawalPenalty: [
        'earlyWithdrawalPenalty', 'early_withdrawal_penalty', 'exitPenalty'
      ],
      lateWithdrawalPenalty: [
        'lateWithdrawalPenalty', 'late_withdrawal_penalty', 'latePenalty'
      ],
      
      // Gas and fee optimization
      gasFeeOptimization: [
        'gasFeeOptimization', 'gas_fee_optimization', 'gasOptimization'
      ],
      feeRebateEnabled: [
        'feeRebateEnabled', 'fee_rebate_enabled', 'feeRebate', 'rebateProgram'
      ],
      
      // Liquidity mining and rewards
      liquidityMiningEnabled: [
        'liquidityMiningEnabled', 'liquidity_mining_enabled', 'liquidityMining'
      ],
      liquidityIncentivesRate: [
        'liquidityIncentivesRate', 'liquidity_incentives_rate', 'incentiveRate'
      ],
      marketMakingEnabled: [
        'marketMakingEnabled', 'market_making_enabled', 'marketMaking'
      ],
      arbitrageEnabled: [
        'arbitrageEnabled', 'arbitrage_enabled', 'arbitrage', 'arbEnabled'
      ],
      crossDexOptimization: [
        'crossDexOptimization', 'cross_dex_optimization', 'dexOptimization'
      ],
      impermanentLossProtection: [
        'impermanentLossProtection', 'impermanent_loss_protection', 'ilProtection'
      ],
      
      // DeFi protocol integrations
      lendingProtocolEnabled: [
        'lendingProtocolEnabled', 'lending_protocol_enabled', 'lendingEnabled'
      ],
      borrowingEnabled: [
        'borrowingEnabled', 'borrowing_enabled', 'borrowing', 'leverageEnabled'
      ],
      leverageEnabled: [
        'leverageEnabled', 'leverage_enabled', 'leverage', 'marginEnabled'
      ],
      maxLeverageRatio: [
        'maxLeverageRatio', 'max_leverage_ratio', 'leverageLimit', 'maxLeverage'
      ],
      crossChainYieldEnabled: [
        'crossChainYieldEnabled', 'cross_chain_yield_enabled', 'crossChainYield'
      ],
      
      // Analytics and reporting
      portfolioAnalyticsEnabled: [
        'portfolioAnalyticsEnabled', 'portfolio_analytics_enabled', 'analytics'
      ],
      realTimePnlTracking: [
        'realTimePnlTracking', 'real_time_pnl_tracking', 'pnlTracking'
      ],
      taxReportingEnabled: [
        'taxReportingEnabled', 'tax_reporting_enabled', 'taxReporting'
      ],
      automatedReporting: [
        'automatedReporting', 'automated_reporting', 'autoReporting'
      ],
      
      // User experience features
      notificationSystemEnabled: [
        'notificationSystemEnabled', 'notification_system_enabled', 'notifications'
      ],
      mobileAppIntegration: [
        'mobileAppIntegration', 'mobile_app_integration', 'mobileSupport'
      ],
      socialTradingEnabled: [
        'socialTradingEnabled', 'social_trading_enabled', 'socialTrading'
      ],
      
      // Institutional features
      institutionalGrade: [
        'institutionalGrade', 'institutional_grade', 'institutionalSupport'
      ],
      custodyIntegration: [
        'custodyIntegration', 'custody_integration', 'custodySupport'
      ],
      auditTrailComprehensive: [
        'auditTrailComprehensive', 'audit_trail_comprehensive', 'comprehensiveAudit'
      ],
      complianceReportingEnabled: [
        'complianceReportingEnabled', 'compliance_reporting_enabled', 'complianceReporting'
      ],
      regulatoryFramework: [
        'regulatoryFramework', 'regulatory_framework', 'regulations', 'complianceFramework'
      ],
      fundAdministrationEnabled: [
        'fundAdministrationEnabled', 'fund_administration_enabled', 'fundAdmin'
      ],
      thirdPartyAuditsEnabled: [
        'thirdPartyAuditsEnabled', 'third_party_audits_enabled', 'auditsEnabled'
      ]
    };

    // Map core fields
    Object.entries(coreFieldMappings).forEach(([targetField, sourceFields]) => {
      for (const sourceField of sourceFields) {
        const value = getNestedValue(jsonData, sourceField);
        if (value !== undefined && value !== null) {
          (mappedData as any)[targetField] = value;
          fieldsDetected++;
          break;
        }
      }
    });

    // ==========================================
    // COMPLEX JSONB CONFIGURATION OBJECTS
    // ==========================================

    // Fee Structure Configuration
    const feeStructureMappings = [
      'feeStructure', 'fee_structure', 'fees', 'feeConfiguration', 'feeSchedule',
      'feeModel', 'pricingStructure'
    ];
    
    for (const field of feeStructureMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.feeStructure = value;
        fieldsDetected++;
        break;
      }
    }

    // Rebalancing Rules Configuration
    const rebalancingRulesMappings = [
      'rebalancingRules', 'rebalancing_rules', 'rebalanceConfig',
      'rebalancingStrategy', 'allocationRules'
    ];
    
    for (const field of rebalancingRulesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.rebalancingRules = value;
        fieldsDetected++;
        break;
      }
    }

    // Withdrawal Rules Configuration
    const withdrawalRulesMappings = [
      'withdrawalRules', 'withdrawal_rules', 'redemptionRules', 'exitRules',
      'withdrawalPolicy', 'redemptionPolicy'
    ];
    
    for (const field of withdrawalRulesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.withdrawalRules = value;
        fieldsDetected++;
        break;
      }
    }

    // Whitelist Configuration
    const whitelistConfigMappings = [
      'whitelistConfig', 'whitelist_config', 'allowlistConfig', 'accessListConfig',
      'permissionedAccess', 'restrictedAccess'
    ];
    
    for (const field of whitelistConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.whitelistConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Yield Sources Configuration
    const yieldSourcesMappings = [
      'yieldSources', 'yield_sources', 'incomeStreams', 'revenueStreams',
      'yieldStrategies', 'investmentSources'
    ];
    
    for (const field of yieldSourcesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.yieldSources = value;
        fieldsDetected++;
        break;
      }
    }

    // Liquidity Provider Rewards
    const liquidityProviderRewardsMappings = [
      'liquidityProviderRewards', 'liquidity_provider_rewards', 'lpRewards',
      'liquidityIncentives', 'poolRewards'
    ];
    
    for (const field of liquidityProviderRewardsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.liquidityProviderRewards = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC4626 RELATED ARRAYS AND OBJECTS
    // ==========================================

    // Vault Strategies (token_erc4626_vault_strategies table)
    const vaultStrategiesMappings = [
      'vaultStrategies', 'strategies', 'erc4626VaultStrategies', 'investmentStrategies',
      'yieldStrategies', 'tradingStrategies'
    ];
    
    for (const field of vaultStrategiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.vaultStrategies = value;
        fieldsDetected++;
        break;
      }
    }

    // Asset Allocations (token_erc4626_asset_allocations table)
    const assetAllocationsMappings = [
      'assetAllocations', 'allocations', 'erc4626AssetAllocations', 'portfolioAllocation',
      'investments', 'holdings', 'positions'
    ];
    
    for (const field of assetAllocationsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.assetAllocations = value;
        fieldsDetected++;
        break;
      }
    }

    // Fee Tiers (token_erc4626_fee_tiers table)
    const feeTiersMappings = [
      'feeTiers', 'fee_tiers', 'erc4626FeeTiers', 'feeSchedule',
      'pricingTiers'
    ];
    
    for (const field of feeTiersMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.feeTiers = value;
        fieldsDetected++;
        break;
      }
    }

    // Performance Metrics (token_erc4626_performance_metrics table)
    const performanceMetricsMappings = [
      'performanceMetrics', 'metrics', 'erc4626PerformanceMetrics', 'performanceData',
      'analytics', 'kpis', 'benchmarks'
    ];
    
    for (const field of performanceMetricsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        // Set boolean flag to indicate performance metrics are enabled
        mappedData.performanceMetrics = true;
        // Store the actual performance metrics array data separately
        (mappedData as any).performanceMetricsData = value;
        fieldsDetected++;
        break;
      }
    }

    // Strategy Parameters (token_erc4626_strategy_params table)
    const strategyParamsMappings = [
      'strategyParams', 'strategyParameters', 'erc4626StrategyParams', 'parameters',
      'settings', 'configuration', 'options'
    ];
    
    for (const field of strategyParamsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.strategyParams = value;
        fieldsDetected++;
        break;
      }
    }

    // DeFi Protocol Integrations (array field)
    const defiProtocolIntegrationsMappings = [
      'defiProtocolIntegrations', 'defi_protocol_integrations', 'protocols',
      'integrations', 'defiPartners', 'protocolIntegrations'
    ];
    
    for (const field of defiProtocolIntegrationsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.defiProtocolIntegrations = value;
        fieldsDetected++;
        break;
      }
    }

    // Bridge Protocols (array field)
    const bridgeProtocolsMappings = [
      'bridgeProtocols', 'bridge_protocols', 'bridges', 'crossChainBridges',
      'interoperabilityProtocols', 'chainBridges'
    ];
    
    for (const field of bridgeProtocolsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.bridgeProtocols = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC4626 PROPERTIES OBJECT MAPPING
    // ==========================================
    
    const erc4626PropertiesMappings = [
      'erc4626Properties', 'erc4626', 'properties', 'vaultProperties',
      'erc4626Config', 'vaultTokenProperties'
    ];
    
    for (const field of erc4626PropertiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        // Map the entire ERC4626 properties object
        mappedData.erc4626Properties = value;
        fieldsDetected++;
        
        // Also extract individual fields from the properties object
        Object.entries(coreFieldMappings).forEach(([targetField, _]) => {
          if (value[targetField] !== undefined && !(targetField in mappedData)) {
            (mappedData as any)[targetField] = value[targetField];
            fieldsDetected++;
          }
        });
        break;
      }
    }

    // ==========================================
    // METADATA AND CONFIGURATION OBJECTS
    // ==========================================

    // Map metadata object
    if (jsonData.metadata && typeof jsonData.metadata === 'object') {
      mappedData.metadata = jsonData.metadata;
      fieldsDetected++;
    }

    // Map blocks configuration
    if (jsonData.blocks && typeof jsonData.blocks === 'object') {
      mappedData.blocks = jsonData.blocks;
      fieldsDetected++;
    }

    // Set standard and config mode
    mappedData.standard = TokenStandard.ERC4626;
    fieldsDetected++;

    // Automatically set to max config mode if complex features detected
    if (mappedData.vaultStrategies || mappedData.assetAllocations || 
        mappedData.feeTiers || mappedData.performanceMetrics ||
        mappedData.strategyParams || mappedData.feeStructure ||
        mappedData.rebalancingRules || mappedData.withdrawalRules ||
        mappedData.yieldSources || mappedData.liquidityProviderRewards ||
        fieldsDetected > 15) {
      mappedData.configMode = 'max';
      fieldsDetected++;
    }

    // Map any remaining custom fields
    Object.entries(jsonData).forEach(([key, value]) => {
      if (!(key in mappedData) && value !== undefined && value !== null) {
        (mappedData as any)[key] = value;
        fieldsDetected++;
      }
    });

    // Structure analysis
    const structureAnalysis = {
      hasERC4626Properties: !!(mappedData.erc4626Properties || 
        Object.keys(coreFieldMappings).some(field => field in mappedData)),
      hasVaultStrategies: !!mappedData.vaultStrategies,
      hasAssetAllocations: !!mappedData.assetAllocations,
      hasFeeTiers: !!mappedData.feeTiers,
      hasPerformanceMetrics: !!mappedData.performanceMetrics,
      hasStrategyParams: !!mappedData.strategyParams,
      estimatedComplexity: fieldsDetected < 15 ? 'simple' as const : 
                          fieldsDetected < 35 ? 'medium' as const : 'complex' as const
    };

    // Generate warnings (non-blocking)
    if (!mappedData.name && !mappedData.vaultName) {
      warnings.push("No vault name detected - consider adding 'name' field");
    }
    if (!mappedData.symbol && !mappedData.vaultSymbol) {
      warnings.push("No vault symbol detected - consider adding 'symbol' field");
    }
    if (!mappedData.assetAddress && !mappedData.underlyingAsset) {
      warnings.push("No underlying asset address detected - consider adding 'assetAddress' field");
    }
    if (!mappedData.vaultType) {
      warnings.push("No vault type detected - consider adding 'vaultType' field");
    }
    if (!mappedData.vaultStrategy) {
      warnings.push("No vault strategy detected - consider adding 'vaultStrategy' field");
    }
    if (fieldsDetected === 0) {
      warnings.push("No ERC4626-specific fields detected - uploading raw JSON data");
    }

    return {
      isValid: true, // Never block uploads
      warnings,
      mappedData,
      fieldsDetected,
      structureAnalysis
    };
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProcessingResult(null);
    setRawJsonData(null);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  // Process file upload
  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const jsonData = JSON.parse(text);
        setRawJsonData(jsonData);
        setJsonText(JSON.stringify(jsonData, null, 2));
        
        const result = processERC4626JsonData(jsonData);
        setProcessingResult(result);
        setIsProcessing(false);
      } catch (error) {
        const textContent = e.target?.result as string;
        const fallbackData = { rawContent: textContent };
        setRawJsonData(fallbackData);
        setJsonText(textContent);
        setProcessingResult({
          isValid: true,
          warnings: ["Invalid JSON format detected - will upload raw content"],
          mappedData: fallbackData,
          fieldsDetected: 1
        });
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  // Handle text input processing
  const handleTextSubmit = () => {
    if (!jsonText.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Input",
        description: "Please enter ERC4626 JSON configuration data."
      });
      return;
    }

    setIsProcessing(true);
    try {
      const jsonData = JSON.parse(jsonText);
      setRawJsonData(jsonData);
      
      const result = processERC4626JsonData(jsonData);
      setProcessingResult(result);
      setIsProcessing(false);
    } catch (error) {
      const fallbackData = { rawContent: jsonText };
      setRawJsonData(fallbackData);
      setProcessingResult({
        isValid: true,
        warnings: ["Invalid JSON format detected - will upload raw content"],
        mappedData: fallbackData,
        fieldsDetected: 1
      });
      setIsProcessing(false);
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (!processingResult?.mappedData) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No ERC4626 configuration data to upload."
      });
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      onUploadComplete(processingResult.mappedData!);
      setIsProcessing(false);
      resetForm();
      onOpenChange(false);
      
      toast({
        title: "ERC4626 Configuration Loaded",
        description: `Successfully loaded ${processingResult.fieldsDetected || 'unknown number of'} ERC4626 fields into the form.`
      });
    }, 500);
  };

  // Download ERC4626 template
  const downloadERC4626Template = () => {
    const template = {
      name: "Example Yield Vault",
      symbol: "EYV",
      standard: "ERC-4626",
      assetAddress: "0x0000000000000000000000000000000000000000",
      assetName: "USD Coin",
      assetSymbol: "USDC",
      assetDecimals: 6,
      vaultType: "yield",
      isMintable: true,
      isBurnable: true,
      isPausable: false,
      vaultStrategy: "aave_v3_lending",
      customStrategy: false,
      strategyController: "0x0000000000000000000000000000000000000000",
      accessControl: "roles",
      permit: true,
      flashLoans: false,
      emergencyShutdown: true,
      performanceTrackingEnabled: true,
      yieldSource: "lending_protocol",
      strategyDocumentation: "https://docs.example.com/strategies/aave-v3",
      strategyComplexity: "simple",
      multiAssetEnabled: false,
      rebalancingEnabled: true,
      autoCompoundingEnabled: true,
      yieldOptimizationStrategy: "automated",
      riskManagementEnabled: true,
      riskTolerance: "conservative",
      diversificationEnabled: false,
      
      // Limits and fees
      depositLimit: "1000000000000",
      withdrawalLimit: "1000000000000",
      minDeposit: "100000000",
      maxDeposit: "10000000000000",
      minWithdrawal: "100000000",
      maxWithdrawal: "10000000000000",
      depositFee: "0.1",
      withdrawalFee: "0.1",
      managementFee: "1.0",
      performanceFee: "10.0",
      feeRecipient: "0x0000000000000000000000000000000000000000",
      
      // Advanced features
      yieldOptimizationEnabled: true,
      automatedRebalancing: true,
      insuranceEnabled: false,
      emergencyExitEnabled: true,
      circuitBreakerEnabled: true,
      maxDrawdownThreshold: "10.0",
      stopLossEnabled: false,
      
      // ERC4626 Properties
      erc4626Properties: {
        assetAddress: "0x0000000000000000000000000000000000000000",
        assetName: "USD Coin",
        assetSymbol: "USDC",
        assetDecimals: 6,
        vaultType: "yield",
        isMintable: true,
        isBurnable: true,
        isPausable: false,
        vaultStrategy: "aave_v3_lending",
        customStrategy: false,
        strategyController: "0x0000000000000000000000000000000000000000",
        accessControl: "roles",
        permit: true,
        flashLoans: false,
        emergencyShutdown: true,
        performanceTrackingEnabled: true,
        yieldSource: "lending_protocol",
        strategyComplexity: "simple",
        riskTolerance: "conservative",
        depositFee: "0.1",
        withdrawalFee: "0.1",
        managementFee: "1.0",
        performanceFee: "10.0"
      },
      
      // Vault Strategies
      vaultStrategies: [
        {
          strategyId: "1",
          name: "Aave V3 USDC Lending",
          description: "Lend USDC on Aave V3 for yield",
          allocation: "80.0",
          riskLevel: "low",
          expectedApy: "4.5",
          active: true,
          parameters: {
            protocol: "aave_v3",
            asset: "USDC",
            utilizationTarget: "85"
          }
        },
        {
          strategyId: "2",
          name: "Compound V3 USDC",
          description: "Lend USDC on Compound V3",
          allocation: "20.0",
          riskLevel: "low",
          expectedApy: "3.8",
          active: true,
          parameters: {
            protocol: "compound_v3",
            asset: "USDC",
            utilizationTarget: "80"
          }
        }
      ],
      
      // Asset Allocations
      assetAllocations: [
        {
          asset: "USDC",
          allocation: "90.0",
          targetAllocation: "90.0",
          minAllocation: "85.0",
          maxAllocation: "95.0",
          rebalanceThreshold: "2.0"
        },
        {
          asset: "Cash",
          allocation: "10.0",
          targetAllocation: "10.0",
          minAllocation: "5.0",
          maxAllocation: "15.0",
          rebalanceThreshold: "1.0"
        }
      ],
      
      // Fee Tiers
      feeTiers: [
        {
          tier: "Standard",
          minDeposit: "100000000",
          maxDeposit: "10000000000",
          managementFee: "1.0",
          performanceFee: "10.0"
        },
        {
          tier: "Premium",
          minDeposit: "10000000000",
          maxDeposit: "100000000000",
          managementFee: "0.75",
          performanceFee: "8.0"
        },
        {
          tier: "Institutional", 
          minDeposit: "100000000000",
          maxDeposit: "1000000000000",
          managementFee: "0.5",
          performanceFee: "5.0"
        }
      ],
      
      // Performance Metrics
      performanceMetrics: [
        {
          metricName: "Total Value Locked",
          value: "1000000000000",
          timestamp: "2024-01-01T00:00:00Z",
          unit: "USDC"
        },
        {
          metricName: "Annual Percentage Yield",
          value: "4.25",
          timestamp: "2024-01-01T00:00:00Z",
          unit: "percent"
        },
        {
          metricName: "Sharpe Ratio",
          value: "1.8",
          timestamp: "2024-01-01T00:00:00Z",
          unit: "ratio"
        }
      ],
      
      // Strategy Parameters
      strategyParams: [
        {
          strategyId: "1",
          parameterName: "rebalance_threshold",
          value: "2.0",
          unit: "percent",
          description: "Threshold for triggering rebalancing"
        },
        {
          strategyId: "1",
          parameterName: "max_slippage",
          value: "0.5",
          unit: "percent", 
          description: "Maximum allowed slippage for trades"
        }
      ],
      
      // Configuration Objects
      feeStructure: {
        feeType: "tiered",
        currency: "USDC",
        feeCalculation: "asset_based",
        performanceFeeHWM: true,
        feeAccrual: "daily"
      },
      
      rebalancingRules: {
        enabled: true,
        frequency: "daily",
        trigger: "threshold_based",
        maxDeviation: "2.0",
        gasLimit: "500000"
      },
      
      withdrawalRules: {
        enabled: true,
        cooldownPeriod: "0",
        withdrawalWindow: "24_hours",
        maxWithdrawalPercentage: "100.0",
        earlyWithdrawalPenalty: "0.0"
      },
      
      whitelistConfig: {
        enabled: false,
        addresses: [],
        whitelistType: "permissive"
      },
      
      yieldSources: {
        primary: "aave_v3",
        secondary: "compound_v3",
        allocation: {
          "aave_v3": "80.0",
          "compound_v3": "20.0"
        }
      },
      
      liquidityProviderRewards: {
        enabled: false,
        rewardToken: "COMP",
        rewardRate: "0.0",
        distributionSchedule: "continuous"
      }
    };

    const jsonContent = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ERC4626_comprehensive_template.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const copyJsonToClipboard = () => {
    if (processingResult?.mappedData) {
      navigator.clipboard.writeText(JSON.stringify(processingResult.mappedData, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "ERC4626 configuration data copied to clipboard."
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setProcessingResult(null);
    setRawJsonData(null);
    setJsonText("");
    setShowRawData(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5 text-primary" />
            <span>ERC4626 Vault Configuration Upload</span>
            <Badge variant="outline">110+ Fields</Badge>
          </DialogTitle>
          <DialogDescription>
            Upload or paste JSON configuration data specifically for ERC4626 tokenized vault tokens.
            Supports all TokenERC4626Properties fields, vault strategies, asset allocations, and DeFi integrations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Tabs */}
          <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'file' | 'text')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Text Input
              </TabsTrigger>
            </TabsList>

            {/* File Upload Tab */}
            <TabsContent value="file" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonFile">ERC4626 Vault JSON Configuration File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="jsonFile"
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadERC4626Template}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ERC4626 Template
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonText">ERC4626 Vault JSON Configuration Data</Label>
                <Textarea
                  id="jsonText"
                  placeholder='{"name": "My Yield Vault", "symbol": "MYV", "assetAddress": "0x...", "vaultStrategy": "yield_farming", "vaultStrategies": [...], ...}'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={!jsonText.trim()}
                  className="w-full"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Process ERC4626 JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Processing indicator */}
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing ERC4626 vault configuration...
              </AlertDescription>
            </Alert>
          )}

          {/* Processing warnings */}
          {processingResult && processingResult.warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Processing Notes:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {processingResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success preview */}
          {processingResult && processingResult.mappedData && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium mb-1 text-green-800">ERC4626 Configuration Ready!</div>
                <div className="text-sm text-green-700">
                  Successfully mapped {processingResult.fieldsDetected} ERC4626 fields.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Analysis */}
          {processingResult && processingResult.structureAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>ERC4626 Configuration Analysis</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ERC-4626</Badge>
                    <Badge 
                      variant={processingResult.structureAnalysis.estimatedComplexity === 'simple' ? 'default' : 
                              processingResult.structureAnalysis.estimatedComplexity === 'medium' ? 'secondary' : 'destructive'}
                    >
                      {processingResult.structureAnalysis.estimatedComplexity}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Fields Detected:</span> {processingResult.fieldsDetected}
                  </div>
                  <div>
                    <span className="font-medium">ERC4626 Properties:</span>{" "}
                    {processingResult.structureAnalysis.hasERC4626Properties ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Vault Strategies:</span>{" "}
                    {processingResult.structureAnalysis.hasVaultStrategies ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Asset Allocations:</span>{" "}
                    {processingResult.structureAnalysis.hasAssetAllocations ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Fee Tiers:</span>{" "}
                    {processingResult.structureAnalysis.hasFeeTiers ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Performance Metrics:</span>{" "}
                    {processingResult.structureAnalysis.hasPerformanceMetrics ? "✓" : "✗"}
                  </div>
                </div>

                {/* Sample mapped fields preview */}
                {processingResult.mappedData && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ERC4626 Fields Preview:</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRawData(!showRawData)}
                        >
                          {showRawData ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showRawData ? "Hide" : "Show"} Raw
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyJsonToClipboard}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto">
                      {showRawData ? (
                        <pre>{JSON.stringify(rawJsonData, null, 2)}</pre>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(processingResult.mappedData)
                            .slice(0, 10)
                            .map(([key, value]) => (
                              <div key={key}>
                                <span className="text-blue-600">{key}:</span>{" "}
                                <span className="text-green-600">
                                  {typeof value === 'object' && value !== null
                                    ? Array.isArray(value) 
                                      ? `[${value.length} items]`
                                      : "{object}"
                                    : String(value).slice(0, 50) + (String(value).length > 50 ? "..." : "")
                                  }
                                </span>
                              </div>
                            ))}
                          {Object.keys(processingResult.mappedData).length > 10 && (
                            <div className="text-muted-foreground">
                              ... and {Object.keys(processingResult.mappedData).length - 10} more fields
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ERC4626 Format information */}
          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">ERC4626 Vault Configuration Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This upload dialog is optimized specifically for ERC4626 tokenized vault tokens:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>All 110+ TokenERC4626Properties fields (asset, vault strategy, fees, etc.)</li>
              <li>Vault strategy management and configuration</li>
              <li>Asset allocation and portfolio management</li>
              <li>Fee structures and performance tracking</li>
              <li>Risk management and insurance features</li>
              <li>DeFi protocol integrations and yield optimization</li>
              <li>Governance and institutional features</li>
              <li>Compliance and regulatory capabilities</li>
              <li>Automatic detection of advanced features for max config mode</li>
              <li>Zero validation blocking - any valid JSON accepted</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!processingResult?.mappedData || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Vault className="mr-2 h-4 w-4" />
                Load ERC4626 Config
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ERC4626ConfigUploadDialog;
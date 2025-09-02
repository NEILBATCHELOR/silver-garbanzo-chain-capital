/**
 * ERC3525ConfigUploadDialog.tsx
 * 
 * Comprehensive JSON configuration upload dialog specifically for ERC3525 semi-fungible tokens.
 * Covers ALL 107+ fields from TokenERC3525Properties table and related ERC3525 tables.
 * 
 * Supports:
 * - All ERC3525 core properties (valueDecimals, baseUri, slotType, etc.)
 * - Slot management and configuration (slots, slot configs, slot creation)
 * - Value allocation and adjustment systems (allocations, value adjustments)
 * - Payment schedules and financial instruments
 * - Advanced features (fractional ownership, marketplaces, voting)
 * - Financial instruments (bonds, derivatives, invoices)
 * - Compliance and regulatory features
 * - Yield farming and DeFi integrations
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
  Layers,
  Code,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenFormData } from "../../types";
import { TokenStandard } from "@/types/core/centralModels";
import { useToast } from "@/components/ui/use-toast";

interface ERC3525ConfigUploadDialogProps {
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
    hasERC3525Properties: boolean;
    hasSlots: boolean;
    hasAllocations: boolean;
    hasPaymentSchedules: boolean;
    hasValueAdjustments: boolean;
    hasFinancialInstruments: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

const ERC3525ConfigUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
}: ERC3525ConfigUploadDialogProps) => {
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
   * ERC3525-specific JSON processing with comprehensive field mapping
   * Covers all 107+ fields from TokenERC3525Properties and related tables
   */
  const processERC3525JsonData = (jsonData: any): ProcessingResult => {
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
    // CORE ERC3525 FIELD MAPPINGS (ALL 107+ FIELDS)
    // ==========================================

    // Core token information
    const coreFieldMappings = {
      name: [
        'name', 'tokenName', 'title', 'token_name', 'semiFungibleName', 'slotTokenName'
      ],
      symbol: [
        'symbol', 'tokenSymbol', 'ticker', 'token_symbol', 'semiFungibleSymbol', 'slotSymbol'
      ],
      
      // Value and slot configuration
      valueDecimals: [
        'valueDecimals', 'value_decimals', 'decimals', 'precision', 'valueScale'
      ],
      baseUri: [
        'baseUri', 'base_uri', 'baseURL', 'metadataUri', 'tokenUri', 'uriBase'
      ],
      metadataStorage: [
        'metadataStorage', 'metadata_storage', 'storage', 'storageType', 'storageProvider'
      ],
      slotType: [
        'slotType', 'slot_type', 'categoryType', 'slotCategory', 'tokenClass'
      ],
      
      // Boolean features
      isBurnable: [
        'isBurnable', 'is_burnable', 'burnable', 'canBurn', 'allowBurning'
      ],
      isPausable: [
        'isPausable', 'is_pausable', 'pausable', 'canPause', 'allowPausing'
      ],
      hasRoyalty: [
        'hasRoyalty', 'has_royalty', 'royalty', 'royaltyEnabled', 'enableRoyalty'
      ],
      royaltyPercentage: [
        'royaltyPercentage', 'royalty_percentage', 'royaltyFee', 'royaltyRate'
      ],
      royaltyReceiver: [
        'royaltyReceiver', 'royalty_receiver', 'royaltyAddress', 'royaltyRecipient'
      ],
      
      // Approval and transfer controls
      slotApprovals: [
        'slotApprovals', 'slot_approvals', 'slotPermissions', 'slotAllowances'
      ],
      valueApprovals: [
        'valueApprovals', 'value_approvals', 'valuePermissions', 'valueAllowances'
      ],
      accessControl: [
        'accessControl', 'access_control', 'permissions', 'controlType'
      ],
      
      // URI and metadata management
      updatableUris: [
        'updatableUris', 'updatable_uris', 'mutableMetadata', 'dynamicMetadata'
      ],
      updatableSlots: [
        'updatableSlots', 'updatable_slots', 'mutableSlots', 'dynamicSlots'
      ],
      valueTransfersEnabled: [
        'valueTransfersEnabled', 'value_transfers_enabled', 'valueTransfers', 'allowValueTransfers'
      ],
      
      // Enumeration and tracking
      allowsSlotEnumeration: [
        'allowsSlotEnumeration', 'allows_slot_enumeration', 'slotEnumeration', 'enumerableSlots'
      ],
      valueAggregation: [
        'valueAggregation', 'value_aggregation', 'aggregateValues', 'combineValues'
      ],
      permissioningEnabled: [
        'permissioningEnabled', 'permissioning_enabled', 'requirePermissions', 'accessControlEnabled'
      ],
      supplyTracking: [
        'supplyTracking', 'supply_tracking', 'trackSupply', 'monitorSupply'
      ],
      updatableValues: [
        'updatableValues', 'updatable_values', 'mutableValues', 'adjustableValues'
      ],
      customExtensions: [
        'customExtensions', 'custom_extensions', 'extensions', 'additionalFeatures'
      ],
      mergable: [
        'mergable', 'mergeable', 'canMerge', 'allowMerge'
      ],
      splittable: [
        'splittable', 'canSplit', 'allowSplit', 'divisible'
      ],
      
      // Dynamic metadata and URI handling
      dynamicMetadata: [
        'dynamicMetadata', 'dynamic_metadata', 'liveMetadata', 'changingMetadata'
      ],
      slotEnumerationEnabled: [
        'slotEnumerationEnabled', 'slot_enumeration_enabled', 'enableSlotEnum'
      ],
      valueAggregationEnabled: [
        'valueAggregationEnabled', 'value_aggregation_enabled', 'enableValueAgg'
      ],
      permissioningAdvanced: [
        'permissioningAdvanced', 'permissioning_advanced', 'advancedPermissions'
      ],
      
      // Financial instrument properties
      financialInstrumentType: [
        'financialInstrumentType', 'financial_instrument_type', 'instrumentType', 'assetClass'
      ],
      principalAmount: [
        'principalAmount', 'principal_amount', 'faceValue', 'parValue'
      ],
      interestRate: [
        'interestRate', 'interest_rate', 'couponRate', 'yield'
      ],
      maturityDate: [
        'maturityDate', 'maturity_date', 'expirationDate', 'endDate'
      ],
      couponFrequency: [
        'couponFrequency', 'coupon_frequency', 'paymentFrequency', 'interestFrequency'
      ],
      earlyRedemptionEnabled: [
        'earlyRedemptionEnabled', 'early_redemption_enabled', 'callableEnabled'
      ],
      redemptionPenaltyRate: [
        'redemptionPenaltyRate', 'redemption_penalty_rate', 'callPenalty', 'earlyRedemptionFee'
      ],
      
      // Derivative properties
      derivativeType: [
        'derivativeType', 'derivative_type', 'derivativeClass', 'contractType'
      ],
      underlyingAsset: [
        'underlyingAsset', 'underlying_asset', 'referenceAsset', 'baseAsset'
      ],
      underlyingAssetAddress: [
        'underlyingAssetAddress', 'underlying_asset_address', 'referenceAddress'
      ],
      strikePrice: [
        'strikePrice', 'strike_price', 'exercisePrice', 'conversionPrice'
      ],
      expirationDate: [
        'expirationDate', 'expiration_date', 'maturityDate', 'settlementDate'
      ],
      settlementType: [
        'settlementType', 'settlement_type', 'deliveryType', 'settlementMethod'
      ],
      leverageRatio: [
        'leverageRatio', 'leverage_ratio', 'gearing', 'multiplier'
      ],
      
      // Slot management features
      slotCreationEnabled: [
        'slotCreationEnabled', 'slot_creation_enabled', 'dynamicSlots', 'createSlots'
      ],
      dynamicSlotCreation: [
        'dynamicSlotCreation', 'dynamic_slot_creation', 'onDemandSlots'
      ],
      slotFreezeEnabled: [
        'slotFreezeEnabled', 'slot_freeze_enabled', 'freezeSlots'
      ],
      slotMergeEnabled: [
        'slotMergeEnabled', 'slot_merge_enabled', 'mergeSlots'
      ],
      slotSplitEnabled: [
        'slotSplitEnabled', 'slot_split_enabled', 'splitSlots'
      ],
      crossSlotTransfers: [
        'crossSlotTransfers', 'cross_slot_transfers', 'interSlotTransfers'
      ],
      
      // Value computation and oracle
      valueComputationMethod: [
        'valueComputationMethod', 'value_computation_method', 'valuationMethod'
      ],
      valueOracleAddress: [
        'valueOracleAddress', 'value_oracle_address', 'priceOracle'
      ],
      valueCalculationFormula: [
        'valueCalculationFormula', 'value_calculation_formula', 'pricingFormula'
      ],
      
      // Accrual and value adjustment
      accrualEnabled: [
        'accrualEnabled', 'accrual_enabled', 'interestAccrual', 'yieldAccrual'
      ],
      accrualRate: [
        'accrualRate', 'accrual_rate', 'accumulationRate'
      ],
      accrualFrequency: [
        'accrualFrequency', 'accrual_frequency', 'accumulationFrequency'
      ],
      valueAdjustmentEnabled: [
        'valueAdjustmentEnabled', 'value_adjustment_enabled', 'adjustValues'
      ],
      
      // Marketplace and trading
      slotMarketplaceEnabled: [
        'slotMarketplaceEnabled', 'slot_marketplace_enabled', 'slotTrading'
      ],
      valueMarketplaceEnabled: [
        'valueMarketplaceEnabled', 'value_marketplace_enabled', 'valueTrading'
      ],
      partialValueTrading: [
        'partialValueTrading', 'partial_value_trading', 'fractionalTrading'
      ],
      minimumTradeValue: [
        'minimumTradeValue', 'minimum_trade_value', 'minTradeAmount'
      ],
      tradingFeesEnabled: [
        'tradingFeesEnabled', 'trading_fees_enabled', 'tradingFees'
      ],
      tradingFeePercentage: [
        'tradingFeePercentage', 'trading_fee_percentage', 'tradingFeeRate'
      ],
      marketMakerEnabled: [
        'marketMakerEnabled', 'market_maker_enabled', 'marketMaking'
      ],
      
      // Governance and voting
      slotVotingEnabled: [
        'slotVotingEnabled', 'slot_voting_enabled', 'slotGovernance'
      ],
      valueWeightedVoting: [
        'valueWeightedVoting', 'value_weighted_voting', 'weightedVotes'
      ],
      votingPowerCalculation: [
        'votingPowerCalculation', 'voting_power_calculation', 'voteWeight'
      ],
      quorumCalculationMethod: [
        'quorumCalculationMethod', 'quorum_calculation_method', 'quorumLogic'
      ],
      proposalValueThreshold: [
        'proposalValueThreshold', 'proposal_value_threshold', 'proposalMinValue'
      ],
      delegateEnabled: [
        'delegateEnabled', 'delegate_enabled', 'voteDelegation'
      ],
      
      // DeFi and yield features
      yieldFarmingEnabled: [
        'yieldFarmingEnabled', 'yield_farming_enabled', 'stakingRewards'
      ],
      liquidityProvisionEnabled: [
        'liquidityProvisionEnabled', 'liquidity_provision_enabled', 'liquidityMining'
      ],
      stakingYieldRate: [
        'stakingYieldRate', 'staking_yield_rate', 'rewardRate'
      ],
      compoundInterestEnabled: [
        'compoundInterestEnabled', 'compound_interest_enabled', 'autoCompound'
      ],
      flashLoanEnabled: [
        'flashLoanEnabled', 'flash_loan_enabled', 'flashLoans'
      ],
      collateralFactor: [
        'collateralFactor', 'collateral_factor', 'loanToValue'
      ],
      liquidationThreshold: [
        'liquidationThreshold', 'liquidation_threshold', 'liquidationRatio'
      ],
      
      // Compliance and regulatory
      regulatoryComplianceEnabled: [
        'regulatoryComplianceEnabled', 'regulatory_compliance_enabled', 'compliance'
      ],
      kycRequired: [
        'kycRequired', 'kyc_required', 'requireKyc', 'kycEnabled'
      ],
      accreditedInvestorOnly: [
        'accreditedInvestorOnly', 'accredited_investor_only', 'accreditedOnly'
      ],
      holdingPeriodRestrictions: [
        'holdingPeriodRestrictions', 'holding_period_restrictions', 'lockupPeriod'
      ],
      multiSignatureRequired: [
        'multiSignatureRequired', 'multi_signature_required', 'multisig'
      ],
      approvalWorkflowEnabled: [
        'approvalWorkflowEnabled', 'approval_workflow_enabled', 'requireApproval'
      ],
      institutionalCustodySupport: [
        'institutionalCustodySupport', 'institutional_custody_support', 'custodyIntegration'
      ],
      auditTrailEnhanced: [
        'auditTrailEnhanced', 'audit_trail_enhanced', 'enhancedAudit'
      ],
      
      // Operations and management
      batchOperationsEnabled: [
        'batchOperationsEnabled', 'batch_operations_enabled', 'batchProcessing'
      ],
      emergencyPauseEnabled: [
        'emergencyPauseEnabled', 'emergency_pause_enabled', 'emergencyStop'
      ],
      useGeographicRestrictions: [
        'useGeographicRestrictions', 'use_geographic_restrictions', 'geoRestrictions'
      ],
      defaultRestrictionPolicy: [
        'defaultRestrictionPolicy', 'default_restriction_policy', 'restrictionDefault'
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

    // Sales Configuration
    const salesConfigMappings = [
      'salesConfig', 'sales_config', 'tradingConfig', 'marketplaceConfig',
      'saleConfiguration', 'commerceConfig'
    ];
    
    for (const field of salesConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.salesConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Slot Transfer Validation
    const slotTransferValidationMappings = [
      'slotTransferValidation', 'slot_transfer_validation', 'slotValidation',
      'transferValidation', 'slotTransferRules'
    ];
    
    for (const field of slotTransferValidationMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.slotTransferValidation = value;
        fieldsDetected++;
        break;
      }
    }

    // Payment Schedule Configuration
    const paymentScheduleMappings = [
      'paymentSchedule', 'payment_schedule', 'paymentConfig', 'couponSchedule',
      'interestSchedule', 'distributionSchedule'
    ];
    
    for (const field of paymentScheduleMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.paymentSchedule = value;
        fieldsDetected++;
        break;
      }
    }

    // Margin Requirements
    const marginRequirementsMappings = [
      'marginRequirements', 'margin_requirements', 'collateralRequirements',
      'securityDeposit', 'marginConfig'
    ];
    
    for (const field of marginRequirementsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.marginRequirements = value;
        fieldsDetected++;
        break;
      }
    }

    // Transfer Limits Configuration
    const transferLimitsMappings = [
      'transferLimits', 'transfer_limits', 'tradingLimits', 'transactionLimits',
      'velocityLimits', 'dailyLimits'
    ];
    
    for (const field of transferLimitsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.transferLimits = value;
        fieldsDetected++;
        break;
      }
    }

    // Reporting Requirements
    const reportingRequirementsMappings = [
      'reportingRequirements', 'reporting_requirements', 'complianceReporting',
      'regulatoryReporting', 'auditRequirements'
    ];
    
    for (const field of reportingRequirementsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.reportingRequirements = value;
        fieldsDetected++;
        break;
      }
    }

    // Recovery Mechanisms
    const recoveryMechanismsMappings = [
      'recoveryMechanisms', 'recovery_mechanisms', 'emergencyRecovery',
      'disasterRecovery', 'backupMechanisms'
    ];
    
    for (const field of recoveryMechanismsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.recoveryMechanisms = value;
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

    // Slot Transfer Restrictions
    const slotTransferRestrictionsMappings = [
      'slotTransferRestrictions', 'slot_transfer_restrictions', 'slotRestrictions',
      'slotLimitations', 'slotConstraints'
    ];
    
    for (const field of slotTransferRestrictionsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.slotTransferRestrictions = value;
        fieldsDetected++;
        break;
      }
    }

    // Value Transfer Restrictions
    const valueTransferRestrictionsMappings = [
      'valueTransferRestrictions', 'value_transfer_restrictions', 'valueRestrictions',
      'valueLimitations', 'valueConstraints'
    ];
    
    for (const field of valueTransferRestrictionsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.valueTransferRestrictions = value;
        fieldsDetected++;
        break;
      }
    }

    // Custom Slot Properties
    const customSlotPropertiesMappings = [
      'customSlotProperties', 'custom_slot_properties', 'slotExtensions',
      'additionalSlotData', 'slotMetadata'
    ];
    
    for (const field of customSlotPropertiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.customSlotProperties = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC3525 RELATED ARRAYS AND OBJECTS
    // ==========================================

    // Slots (token_erc3525_slots table)
    const slotsMappings = [
      'slots', 'tokenSlots', 'erc3525Slots', 'slotDefinitions', 'slotCategories',
      'categories', 'classes', 'compartments', 'buckets'
    ];
    
    for (const field of slotsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.slots = value;
        fieldsDetected++;
        break;
      }
    }

    // Allocations (token_erc3525_allocations table)
    const allocationsMappings = [
      'allocations', 'tokenAllocations', 'erc3525Allocations', 'valueAllocations',
      'initialAllocations', 'distributions', 'assignments'
    ];
    
    for (const field of allocationsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.allocations = value;
        fieldsDetected++;
        break;
      }
    }

    // Payment Schedules (token_erc3525_payment_schedules table)
    const paymentSchedulesMappings = [
      'paymentSchedules', 'schedules', 'erc3525PaymentSchedules', 'couponSchedules',
      'interestSchedules', 'distributionSchedules'
    ];
    
    for (const field of paymentSchedulesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.paymentSchedules = value;
        fieldsDetected++;
        break;
      }
    }

    // Value Adjustments (token_erc3525_value_adjustments table)
    const valueAdjustmentsMappings = [
      'valueAdjustments', 'adjustments', 'erc3525ValueAdjustments', 'valueChanges',
      'priceAdjustments', 'valuationChanges'
    ];
    
    for (const field of valueAdjustmentsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.valueAdjustments = value;
        fieldsDetected++;
        break;
      }
    }

    // Slot Configs (token_erc3525_slot_configs table)
    const slotConfigsMappings = [
      'slotConfigs', 'slotConfigurations', 'erc3525SlotConfigs', 'slotSettings',
      'categoryConfigs', 'slotParameters'
    ];
    
    for (const field of slotConfigsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.slotConfigs = value;
        fieldsDetected++;
        break;
      }
    }

    // Slot Admin Roles (array field)
    const slotAdminRolesMappings = [
      'slotAdminRoles', 'slot_admin_roles', 'slotAdmins', 'slotManagers',
      'slotControllers', 'slotOperators'
    ];
    
    for (const field of slotAdminRolesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.slotAdminRoles = value;
        fieldsDetected++;
        break;
      }
    }

    // Geographic Restrictions (array field)
    const geographicRestrictionsMappings = [
      'geographicRestrictions', 'geographic_restrictions', 'geoRestrictions',
      'countryLimits', 'jurisdictionLimits', 'regionalRestrictions'
    ];
    
    for (const field of geographicRestrictionsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.geographicRestrictions = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC3525 PROPERTIES OBJECT MAPPING
    // ==========================================
    
    const erc3525PropertiesMappings = [
      'erc3525Properties', 'erc3525', 'properties', 'semiFungibleProperties', 
      'erc3525Config', 'slotTokenProperties'
    ];
    
    for (const field of erc3525PropertiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        // Map the entire ERC3525 properties object
        mappedData.erc3525Properties = value;
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
    mappedData.standard = TokenStandard.ERC3525;
    fieldsDetected++;

    // Automatically set to max config mode if complex features detected
    if (mappedData.slots || mappedData.allocations || 
        mappedData.paymentSchedules || mappedData.valueAdjustments ||
        mappedData.slotConfigs || mappedData.salesConfig ||
        mappedData.slotTransferValidation || mappedData.paymentSchedule ||
        mappedData.marginRequirements || mappedData.transferLimits ||
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
      hasERC3525Properties: !!(mappedData.erc3525Properties || 
        Object.keys(coreFieldMappings).some(field => field in mappedData)),
      hasSlots: !!mappedData.slots,
      hasAllocations: !!mappedData.allocations,
      hasPaymentSchedules: !!mappedData.paymentSchedules,
      hasValueAdjustments: !!mappedData.valueAdjustments,
      hasFinancialInstruments: !!(mappedData.financialInstrumentType || 
        mappedData.principalAmount || mappedData.interestRate),
      estimatedComplexity: fieldsDetected < 15 ? 'simple' as const : 
                          fieldsDetected < 35 ? 'medium' as const : 'complex' as const
    };

    // Generate warnings (non-blocking)
    if (!mappedData.name && !mappedData.tokenName) {
      warnings.push("No token name detected - consider adding 'name' field");
    }
    if (!mappedData.symbol && !mappedData.tokenSymbol) {
      warnings.push("No token symbol detected - consider adding 'symbol' field");
    }
    if (!mappedData.valueDecimals && mappedData.valueDecimals !== 0) {
      warnings.push("No value decimals detected - consider adding 'valueDecimals' field");
    }
    if (!mappedData.slotType) {
      warnings.push("No slot type detected - consider adding 'slotType' field");
    }
    if (!mappedData.slots || !Array.isArray(mappedData.slots) || mappedData.slots.length === 0) {
      warnings.push("No slots detected - ERC3525 tokens typically define multiple slots");
    }
    if (fieldsDetected === 0) {
      warnings.push("No ERC3525-specific fields detected - uploading raw JSON data");
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
        
        const result = processERC3525JsonData(jsonData);
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
        description: "Please enter ERC3525 JSON configuration data."
      });
      return;
    }

    setIsProcessing(true);
    try {
      const jsonData = JSON.parse(jsonText);
      setRawJsonData(jsonData);
      
      const result = processERC3525JsonData(jsonData);
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
        description: "No ERC3525 configuration data to upload."
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
        title: "ERC3525 Configuration Loaded",
        description: `Successfully loaded ${processingResult.fieldsDetected || 'unknown number of'} ERC3525 fields into the form.`
      });
    }, 500);
  };

  // Download ERC3525 template
  const downloadERC3525Template = () => {
    const template = {
      name: "Example Semi-Fungible Token",
      symbol: "ESFT",
      standard: "ERC-3525",
      valueDecimals: 18,
      baseUri: "https://api.example.com/metadata/{id}.json",
      metadataStorage: "ipfs",
      slotType: "financial_instrument",
      isBurnable: true,
      isPausable: false,
      hasRoyalty: true,
      royaltyPercentage: "2.5",
      royaltyReceiver: "0x0000000000000000000000000000000000000000",
      slotApprovals: true,
      valueApprovals: true,
      accessControl: "roles",
      updatableUris: false,
      updatableSlots: false,
      valueTransfersEnabled: true,
      allowsSlotEnumeration: true,
      valueAggregation: false,
      permissioningEnabled: false,
      supplyTracking: true,
      updatableValues: false,
      mergable: false,
      splittable: false,
      
      // Financial instrument properties
      financialInstrumentType: "bond",
      principalAmount: "1000000",
      interestRate: "5.0",
      maturityDate: "2025-12-31T23:59:59Z",
      couponFrequency: "quarterly",
      earlyRedemptionEnabled: false,
      
      // ERC3525 Properties
      erc3525Properties: {
        valueDecimals: 18,
        baseUri: "https://api.example.com/metadata/{id}.json",
        metadataStorage: "ipfs",
        slotType: "financial_instrument",
        isBurnable: true,
        isPausable: false,
        hasRoyalty: true,
        royaltyPercentage: "2.5",
        royaltyReceiver: "0x0000000000000000000000000000000000000000",
        slotApprovals: true,
        valueApprovals: true,
        accessControl: "roles",
        updatableUris: false,
        updatableSlots: false,
        valueTransfersEnabled: true,
        mergable: false,
        splittable: false,
        financialInstrumentType: "bond",
        principalAmount: "1000000",
        interestRate: "5.0",
        maturityDate: "2025-12-31T23:59:59Z",
        couponFrequency: "quarterly"
      },
      
      // Slots
      slots: [
        {
          slotId: "1",
          name: "Government Bond Slot",
          description: "Slot for government bonds",
          properties: {
            riskLevel: "low",
            currency: "USD",
            issuer: "US Treasury"
          }
        },
        {
          slotId: "2", 
          name: "Corporate Bond Slot",
          description: "Slot for corporate bonds",
          properties: {
            riskLevel: "medium",
            currency: "USD", 
            sector: "technology"
          }
        }
      ],
      
      // Allocations
      allocations: [
        {
          slotId: "1",
          address: "0x0000000000000000000000000000000000000000",
          value: "500000000000000000000000",
          metadata: {
            allocationType: "initial",
            vestingPeriod: "none"
          }
        },
        {
          slotId: "2",
          address: "0x0000000000000000000000000000000000000000", 
          value: "300000000000000000000000",
          metadata: {
            allocationType: "reserved",
            vestingPeriod: "12_months"
          }
        }
      ],
      
      // Payment Schedules
      paymentSchedules: [
        {
          slotId: "1",
          paymentType: "coupon",
          amount: "12500000000000000000000",
          frequency: "quarterly",
          startDate: "2024-03-31T00:00:00Z",
          endDate: "2025-12-31T23:59:59Z",
          currency: "USD"
        },
        {
          slotId: "1",
          paymentType: "principal",
          amount: "1000000000000000000000000",
          frequency: "once",
          startDate: "2025-12-31T23:59:59Z",
          endDate: "2025-12-31T23:59:59Z",
          currency: "USD"
        }
      ],
      
      // Value Adjustments
      valueAdjustments: [
        {
          adjustmentType: "market_value",
          reason: "Interest rate change",
          adjustmentFactor: "1.02",
          effectiveDate: "2024-06-30T00:00:00Z",
          approvedBy: "risk_manager"
        }
      ],
      
      // Slot Configs
      slotConfigs: [
        {
          slotId: "1",
          transferable: true,
          mintable: true,
          burnable: false,
          maxSupply: "10000000000000000000000000",
          configuration: {
            minimumValue: "1000000000000000000000",
            maximumValue: "100000000000000000000000",
            tradingHours: "24/7"
          }
        },
        {
          slotId: "2",
          transferable: true,
          mintable: true,
          burnable: true,
          maxSupply: "5000000000000000000000000",
          configuration: {
            minimumValue: "5000000000000000000000",
            maximumValue: "50000000000000000000000",
            tradingHours: "business_hours"
          }
        }
      ],
      
      // Configuration Objects
      salesConfig: {
        enabled: true,
        currency: "USD",
        pricesPerSlot: {
          "1": "1000.00",
          "2": "1500.00"
        },
        saleType: "continuous"
      },
      
      slotTransferValidation: {
        enabled: true,
        requireApproval: false,
        crossSlotTransfersAllowed: false,
        validationRules: [
          {
            rule: "minimum_holding_period",
            value: "30_days"
          }
        ]
      },
      
      paymentSchedule: {
        defaultFrequency: "quarterly",
        paymentCurrency: "USD",
        automaticPayments: true,
        gracePeriod: "7_days"
      },
      
      marginRequirements: {
        enabled: false,
        minimumMargin: "0.1",
        maintenanceMargin: "0.05",
        marginCurrency: "USD"
      },
      
      transferLimits: {
        enabled: false,
        dailyLimit: "1000000000000000000000000",
        monthlyLimit: "10000000000000000000000000",
        perTransactionLimit: "100000000000000000000000"
      },
      
      whitelistConfig: {
        enabled: false,
        addresses: [],
        whitelistType: "permissive"
      }
    };

    const jsonContent = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ERC3525_comprehensive_template.json");
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
        description: "ERC3525 configuration data copied to clipboard."
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
            <Layers className="h-5 w-5 text-primary" />
            <span>ERC3525 Semi-Fungible Configuration Upload</span>
            <Badge variant="outline">107+ Fields</Badge>
          </DialogTitle>
          <DialogDescription>
            Upload or paste JSON configuration data specifically for ERC3525 semi-fungible tokens.
            Supports all TokenERC3525Properties fields, slots, allocations, payment schedules, and financial instruments.
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
                <Label htmlFor="jsonFile">ERC3525 Semi-Fungible JSON Configuration File</Label>
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
                    onClick={downloadERC3525Template}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ERC3525 Template
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonText">ERC3525 Semi-Fungible JSON Configuration Data</Label>
                <Textarea
                  id="jsonText"
                  placeholder='{"name": "My Bond Token", "symbol": "MBT", "valueDecimals": 18, "slotType": "financial_instrument", "slots": [...], ...}'
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
                  Process ERC3525 JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Processing indicator */}
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing ERC3525 semi-fungible configuration...
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
                <div className="font-medium mb-1 text-green-800">ERC3525 Configuration Ready!</div>
                <div className="text-sm text-green-700">
                  Successfully mapped {processingResult.fieldsDetected} ERC3525 fields.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Analysis */}
          {processingResult && processingResult.structureAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>ERC3525 Configuration Analysis</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ERC-3525</Badge>
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
                    <span className="font-medium">ERC3525 Properties:</span>{" "}
                    {processingResult.structureAnalysis.hasERC3525Properties ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Slots:</span>{" "}
                    {processingResult.structureAnalysis.hasSlots ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Allocations:</span>{" "}
                    {processingResult.structureAnalysis.hasAllocations ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Payment Schedules:</span>{" "}
                    {processingResult.structureAnalysis.hasPaymentSchedules ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Financial Instruments:</span>{" "}
                    {processingResult.structureAnalysis.hasFinancialInstruments ? "✓" : "✗"}
                  </div>
                </div>

                {/* Sample mapped fields preview */}
                {processingResult.mappedData && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ERC3525 Fields Preview:</span>
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

          {/* ERC3525 Format information */}
          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">ERC3525 Semi-Fungible Configuration Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This upload dialog is optimized specifically for ERC3525 semi-fungible tokens:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>All 107+ TokenERC3525Properties fields (valueDecimals, slotType, financial instruments, etc.)</li>
              <li>Slot management and configuration (slots, slot configs, slot creation)</li>
              <li>Value allocation and adjustment systems (allocations, value adjustments)</li>
              <li>Payment schedules and financial instrument features</li>
              <li>Advanced features (fractional ownership, marketplaces, voting)</li>
              <li>Financial instruments (bonds, derivatives, invoices, vouchers)</li>
              <li>Compliance and regulatory features (KYC, geographic restrictions)</li>
              <li>Yield farming and DeFi integrations</li>
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
                <Layers className="mr-2 h-4 w-4" />
                Load ERC3525 Config
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ERC3525ConfigUploadDialog;
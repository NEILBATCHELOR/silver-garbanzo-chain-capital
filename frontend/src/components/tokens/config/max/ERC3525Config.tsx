import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import sub-forms
import ERC3525BaseForm from "./ERC3525BaseForm";
import ERC3525PropertiesForm from "./ERC3525PropertiesForm";
import ERC3525SlotsForm from "./ERC3525SlotsForm";
import ERC3525AllocationsForm from "./ERC3525AllocationsForm";
import ERC3525PaymentSchedulesForm from "./ERC3525PaymentSchedulesForm";
import ERC3525ValueAdjustmentsForm from "./ERC3525ValueAdjustmentsForm";
import ERC3525SlotConfigsForm from "./ERC3525SlotConfigsForm";

interface ERC3525ConfigProps {
  tokenForm: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setTokenForm: (form: any) => void;
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
}

interface ERC3525Slot {
  id?: string;
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

interface ERC3525Allocation {
  id?: string;
  tokenIdWithinSlot: string;
  slotId: string;
  recipient: string;
  value: string;
  linkedTokenId?: string;
}

interface ERC3525PaymentSchedule {
  id?: string;
  slotId: string;
  paymentDate: string;
  paymentAmount: string;
  paymentType: string;
  currency?: string;
  isCompleted?: boolean;
  transactionHash?: string;
}

interface ERC3525ValueAdjustment {
  id?: string;
  slotId: string;
  adjustmentDate: string;
  adjustmentType: string;
  adjustmentAmount: string;
  adjustmentReason?: string;
  oraclePrice?: string;
  oracleSource?: string;
  approvedBy?: string;
  transactionHash?: string;
}

interface ERC3525SlotConfig {
  id?: string;
  slotId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  valueUnits?: string;
  slotTransferable?: boolean;
}

interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  tab: string;
}

/**
 * ERC-3525 Configuration Component (Max Mode)
 * Comprehensive semi-fungible token configuration with all 107+ database fields
 */
const ERC3525Config: React.FC<ERC3525ConfigProps> = ({
  tokenForm,
  handleInputChange,
  setTokenForm,
  onConfigChange,
  initialConfig = {}
}) => {
  // Internal state for comprehensive configuration
  const [config, setConfig] = useState({
    // Base token fields
    name: initialConfig.name || "",
    symbol: initialConfig.symbol || "",
    description: initialConfig.description || "",
    valueDecimals: initialConfig.valueDecimals ?? 18,
    
    // Metadata Management
    baseUri: initialConfig.baseUri || "",
    metadataStorage: initialConfig.metadataStorage || "ipfs",
    dynamicMetadata: initialConfig.dynamicMetadata ?? false,
    updatableUris: initialConfig.updatableUris ?? false,
    
    // Slot Configuration
    slotType: initialConfig.slotType || "generic",
    allowsSlotEnumeration: initialConfig.allowsSlotEnumeration ?? true,
    slotTransferValidation: initialConfig.slotTransferValidation || {},
    
    // Access Control
    accessControl: initialConfig.accessControl || "ownable",
    
    // Basic Features
    isBurnable: initialConfig.isBurnable ?? false,
    isPausable: initialConfig.isPausable ?? false,
    hasRoyalty: initialConfig.hasRoyalty ?? false,
    royaltyPercentage: initialConfig.royaltyPercentage || "",
    royaltyReceiver: initialConfig.royaltyReceiver || "",
    
    // Transfer and Value Features
    slotApprovals: initialConfig.slotApprovals ?? true,
    valueApprovals: initialConfig.valueApprovals ?? true,
    valueTransfersEnabled: initialConfig.valueTransfersEnabled ?? true,
    updatableSlots: initialConfig.updatableSlots ?? false,
    updatableValues: initialConfig.updatableValues ?? false,
    
    // Aggregation and Fractional Features
    mergable: initialConfig.mergable ?? false,
    splittable: initialConfig.splittable ?? false,
    valueAggregation: initialConfig.valueAggregation ?? false,
    fractionalOwnershipEnabled: initialConfig.fractionalOwnershipEnabled ?? false,
    autoUnitCalculation: initialConfig.autoUnitCalculation ?? false,
    
    // Permissioning
    permissioningEnabled: initialConfig.permissioningEnabled ?? false,
    permissioningAdvanced: initialConfig.permissioningAdvanced ?? false,
    
    // Supply Tracking
    supplyTracking: initialConfig.supplyTracking ?? false,
    slotEnumerationEnabled: initialConfig.slotEnumerationEnabled ?? true,
    valueAggregationEnabled: initialConfig.valueAggregationEnabled ?? false,
    
    // Transfer Restrictions
    slotTransferRestrictions: initialConfig.slotTransferRestrictions || {},
    valueTransferRestrictions: initialConfig.valueTransferRestrictions || {},
    
    // Financial Instrument Configuration
    financialInstrumentType: initialConfig.financialInstrumentType || "",
    principalAmount: initialConfig.principalAmount || "",
    interestRate: initialConfig.interestRate || "",
    maturityDate: initialConfig.maturityDate || "",
    couponFrequency: initialConfig.couponFrequency || "",
    paymentSchedule: initialConfig.paymentSchedule || {},
    earlyRedemptionEnabled: initialConfig.earlyRedemptionEnabled ?? false,
    redemptionPenaltyRate: initialConfig.redemptionPenaltyRate || "",
    
    // Derivative Configuration
    derivativeType: initialConfig.derivativeType || "",
    underlyingAsset: initialConfig.underlyingAsset || "",
    underlyingAssetAddress: initialConfig.underlyingAssetAddress || "",
    strikePrice: initialConfig.strikePrice || "",
    expirationDate: initialConfig.expirationDate || "",
    settlementType: initialConfig.settlementType || "",
    marginRequirements: initialConfig.marginRequirements || {},
    leverageRatio: initialConfig.leverageRatio || "",
    
    // Slot Management
    slotCreationEnabled: initialConfig.slotCreationEnabled ?? false,
    dynamicSlotCreation: initialConfig.dynamicSlotCreation ?? false,
    slotAdminRoles: initialConfig.slotAdminRoles || [],
    slotFreezeEnabled: initialConfig.slotFreezeEnabled ?? false,
    slotMergeEnabled: initialConfig.slotMergeEnabled ?? false,
    slotSplitEnabled: initialConfig.slotSplitEnabled ?? false,
    crossSlotTransfers: initialConfig.crossSlotTransfers ?? false,
    
    // Value Computation
    valueComputationMethod: initialConfig.valueComputationMethod || "",
    valueOracleAddress: initialConfig.valueOracleAddress || "",
    valueCalculationFormula: initialConfig.valueCalculationFormula || "",
    accrualEnabled: initialConfig.accrualEnabled ?? false,
    accrualRate: initialConfig.accrualRate || "",
    accrualFrequency: initialConfig.accrualFrequency || "",
    valueAdjustmentEnabled: initialConfig.valueAdjustmentEnabled ?? false,
    
    // Trading and Marketplace
    slotMarketplaceEnabled: initialConfig.slotMarketplaceEnabled ?? false,
    valueMarketplaceEnabled: initialConfig.valueMarketplaceEnabled ?? false,
    partialValueTrading: initialConfig.partialValueTrading ?? false,
    minimumTradeValue: initialConfig.minimumTradeValue || "",
    tradingFeesEnabled: initialConfig.tradingFeesEnabled ?? false,
    tradingFeePercentage: initialConfig.tradingFeePercentage || "",
    marketMakerEnabled: initialConfig.marketMakerEnabled ?? false,
    
    // Governance Features
    slotVotingEnabled: initialConfig.slotVotingEnabled ?? false,
    valueWeightedVoting: initialConfig.valueWeightedVoting ?? false,
    votingPowerCalculation: initialConfig.votingPowerCalculation || "",
    quorumCalculationMethod: initialConfig.quorumCalculationMethod || "",
    proposalValueThreshold: initialConfig.proposalValueThreshold || "",
    delegateEnabled: initialConfig.delegateEnabled ?? false,
    
    // DeFi Features
    yieldFarmingEnabled: initialConfig.yieldFarmingEnabled ?? false,
    liquidityProvisionEnabled: initialConfig.liquidityProvisionEnabled ?? false,
    stakingYieldRate: initialConfig.stakingYieldRate || "",
    compoundInterestEnabled: initialConfig.compoundInterestEnabled ?? false,
    flashLoanEnabled: initialConfig.flashLoanEnabled ?? false,
    collateralFactor: initialConfig.collateralFactor || "",
    liquidationThreshold: initialConfig.liquidationThreshold || "",
    
    // Compliance Features
    regulatoryComplianceEnabled: initialConfig.regulatoryComplianceEnabled ?? false,
    kycRequired: initialConfig.kycRequired ?? false,
    accreditedInvestorOnly: initialConfig.accreditedInvestorOnly ?? false,
    holdingPeriodRestrictions: initialConfig.holdingPeriodRestrictions || null,
    transferLimits: initialConfig.transferLimits || {},
    reportingRequirements: initialConfig.reportingRequirements || {},
    
    // Enterprise Features
    multiSignatureRequired: initialConfig.multiSignatureRequired ?? false,
    approvalWorkflowEnabled: initialConfig.approvalWorkflowEnabled ?? false,
    institutionalCustodySupport: initialConfig.institutionalCustodySupport ?? false,
    auditTrailEnhanced: initialConfig.auditTrailEnhanced ?? false,
    batchOperationsEnabled: initialConfig.batchOperationsEnabled ?? false,
    emergencyPauseEnabled: initialConfig.emergencyPauseEnabled ?? false,
    recoveryMechanisms: initialConfig.recoveryMechanisms || {},
    
    // Geographic Restrictions
    useGeographicRestrictions: initialConfig.useGeographicRestrictions ?? false,
    defaultRestrictionPolicy: initialConfig.defaultRestrictionPolicy || "blocked",
    geographicRestrictions: initialConfig.geographicRestrictions || [],
    
    // Whitelist Configuration
    whitelistConfig: initialConfig.whitelistConfig || {},
    
    // Sales Configuration
    salesConfig: initialConfig.salesConfig || {},
    
    // Custom Extensions
    customExtensions: initialConfig.customExtensions || "",
    customSlotProperties: initialConfig.customSlotProperties || {},
    
    // Metadata
    metadata: initialConfig.metadata || {},
    
    ...initialConfig
  });

  // Sub-entities state
  const [slots, setSlots] = useState<ERC3525Slot[]>(initialConfig.slots || []);
  const [allocations, setAllocations] = useState<ERC3525Allocation[]>(initialConfig.allocations || []);
  const [paymentSchedules, setPaymentSchedules] = useState<ERC3525PaymentSchedule[]>(initialConfig.paymentSchedules || []);
  const [valueAdjustments, setValueAdjustments] = useState<ERC3525ValueAdjustment[]>(initialConfig.valueAdjustments || []);
  const [slotConfigs, setSlotConfigs] = useState<ERC3525SlotConfig[]>(initialConfig.slotConfigs || []);
  
  // Validation state
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [activeTab, setActiveTab] = useState("basic");

  // Update parent when config changes
  useEffect(() => {
    const fullConfig = {
      ...config,
      slots,
      allocations,
      paymentSchedules,
      valueAdjustments,
      slotConfigs
    };
    
    if (onConfigChange) {
      onConfigChange(fullConfig);
    } else {
      // Update tokenForm for backward compatibility
      setTokenForm((prev: any) => ({
        ...prev,
        ...fullConfig
      }));
    }
  }, [config, slots, allocations, paymentSchedules, valueAdjustments, slotConfigs, onConfigChange, setTokenForm]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    
    // Also call original handler for backward compatibility
    if (!onConfigChange) {
      handleInputChange(e);
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setConfig(prev => ({ ...prev, [name]: checked }));
  };

  // Validate configuration
  const validateConfig = () => {
    const issues: ValidationIssue[] = [];
    
    // Basic validations
    if (!config.name) {
      issues.push({ field: 'name', message: 'Token name is required', severity: 'error', tab: 'basic' });
    }
    if (!config.symbol) {
      issues.push({ field: 'symbol', message: 'Token symbol is required', severity: 'error', tab: 'basic' });
    }
    if (config.valueDecimals < 0 || config.valueDecimals > 18) {
      issues.push({ field: 'valueDecimals', message: 'Value decimals must be between 0 and 18', severity: 'error', tab: 'basic' });
    }

    // Slot validations
    if (slots.length === 0) {
      issues.push({ field: 'slots', message: 'At least one slot is required for ERC-3525 tokens', severity: 'error', tab: 'slots' });
    }
    
    slots.forEach((slot, index) => {
      if (!slot.slotId) {
        issues.push({ field: `slot-${index}`, message: `Slot ${index + 1} ID is required`, severity: 'error', tab: 'slots' });
      }
      if (!slot.slotName) {
        issues.push({ field: `slot-${index}`, message: `Slot ${index + 1} name is required`, severity: 'error', tab: 'slots' });
      }
      if (slot.minValue && slot.maxValue && parseFloat(slot.minValue) >= parseFloat(slot.maxValue)) {
        issues.push({ field: `slot-${index}`, message: `Slot ${index + 1} minimum value must be less than maximum value`, severity: 'error', tab: 'slots' });
      }
    });

    // Allocation validations
    allocations.forEach((allocation, index) => {
      if (!allocation.tokenIdWithinSlot) {
        issues.push({ field: `allocation-${index}`, message: `Allocation ${index + 1} token ID is required`, severity: 'error', tab: 'allocations' });
      }
      if (!allocation.slotId) {
        issues.push({ field: `allocation-${index}`, message: `Allocation ${index + 1} slot ID is required`, severity: 'error', tab: 'allocations' });
      }
      if (!allocation.recipient) {
        issues.push({ field: `allocation-${index}`, message: `Allocation ${index + 1} recipient is required`, severity: 'error', tab: 'allocations' });
      }
      if (!allocation.value || parseFloat(allocation.value) <= 0) {
        issues.push({ field: `allocation-${index}`, message: `Allocation ${index + 1} value must be greater than 0`, severity: 'error', tab: 'allocations' });
      }
      
      // Check if slot exists
      const slotExists = slots.some(slot => slot.slotId === allocation.slotId);
      if (!slotExists) {
        issues.push({ field: `allocation-${index}`, message: `Allocation ${index + 1} references non-existent slot`, severity: 'error', tab: 'allocations' });
      }
    });

    // Payment schedule validations
    paymentSchedules.forEach((schedule, index) => {
      if (!schedule.slotId) {
        issues.push({ field: `payment-${index}`, message: `Payment ${index + 1} slot ID is required`, severity: 'error', tab: 'payment-schedules' });
      }
      if (!schedule.paymentDate) {
        issues.push({ field: `payment-${index}`, message: `Payment ${index + 1} date is required`, severity: 'error', tab: 'payment-schedules' });
      }
      if (!schedule.paymentAmount || parseFloat(schedule.paymentAmount) <= 0) {
        issues.push({ field: `payment-${index}`, message: `Payment ${index + 1} amount must be greater than 0`, severity: 'error', tab: 'payment-schedules' });
      }
      if (!schedule.paymentType) {
        issues.push({ field: `payment-${index}`, message: `Payment ${index + 1} type is required`, severity: 'error', tab: 'payment-schedules' });
      }
    });

    // Value adjustment validations
    valueAdjustments.forEach((adjustment, index) => {
      if (!adjustment.adjustmentType) {
        issues.push({ field: `adjustment-${index}`, message: `Adjustment ${index + 1} type is required`, severity: 'error', tab: 'value-adjustments' });
      }
      if (!adjustment.adjustmentAmount) {
        issues.push({ field: `adjustment-${index}`, message: `Adjustment ${index + 1} amount is required`, severity: 'error', tab: 'value-adjustments' });
      }
    });

    // Financial instrument validations
    if (config.financialInstrumentType) {
      if (config.financialInstrumentType === 'bond' || config.financialInstrumentType === 'note') {
        if (!config.principalAmount) {
          issues.push({ field: 'principalAmount', message: 'Principal amount is required for debt instruments', severity: 'error', tab: 'properties' });
        }
        if (!config.interestRate) {
          issues.push({ field: 'interestRate', message: 'Interest rate is required for debt instruments', severity: 'error', tab: 'properties' });
        }
        if (!config.maturityDate) {
          issues.push({ field: 'maturityDate', message: 'Maturity date is required for debt instruments', severity: 'error', tab: 'properties' });
        }
      }
      
      if (config.financialInstrumentType === 'derivative') {
        if (!config.derivativeType) {
          issues.push({ field: 'derivativeType', message: 'Derivative type is required for derivative instruments', severity: 'error', tab: 'properties' });
        }
        if (!config.underlyingAsset) {
          issues.push({ field: 'underlyingAsset', message: 'Underlying asset is required for derivative instruments', severity: 'error', tab: 'properties' });
        }
      }
    }

    // Compliance validations
    if (config.regulatoryComplianceEnabled) {
      if (config.kycRequired && !config.accreditedInvestorOnly) {
        issues.push({ field: 'compliance', message: 'Consider requiring accredited investors when KYC is mandatory', severity: 'warning', tab: 'properties' });
      }
    }

    // DeFi validations
    if (config.yieldFarmingEnabled && !config.stakingYieldRate) {
      issues.push({ field: 'stakingYieldRate', message: 'Staking yield rate is required when yield farming is enabled', severity: 'warning', tab: 'properties' });
    }

    if (config.flashLoanEnabled && (!config.collateralFactor || !config.liquidationThreshold)) {
      issues.push({ field: 'flashLoan', message: 'Collateral factor and liquidation threshold are recommended for flash loans', severity: 'warning', tab: 'properties' });
    }

    setValidationIssues(issues);
    return issues;
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const requiredFields = [
      'name', 'symbol'
    ];
    
    const completed = requiredFields.filter(field => config[field as keyof typeof config]).length;
    const slotsComplete = slots.length > 0 && slots.every(s => s.slotId && s.slotName);
    const allocationsValid = allocations.length === 0 || allocations.every(a => a.tokenIdWithinSlot && a.slotId && a.recipient && a.value);
    
    const baseCompletion = (completed / requiredFields.length) * 40; // 40% for basic fields
    const slotCompletion = slotsComplete ? 30 : 0; // 30% for slots
    const allocationCompletion = allocationsValid ? 20 : 0; // 20% for allocations
    const advancedCompletion = (config.financialInstrumentType ? 10 : 0); // 10% for advanced features
    
    return Math.round(baseCompletion + slotCompletion + allocationCompletion + advancedCompletion);
  };

  // Get tab status
  const getTabStatus = (tabName: string) => {
    const tabIssues = validationIssues.filter(issue => issue.tab === tabName);
    const errors = tabIssues.filter(issue => issue.severity === 'error').length;
    const warnings = tabIssues.filter(issue => issue.severity === 'warning').length;
    
    if (errors > 0) return { status: 'error', count: errors };
    if (warnings > 0) return { status: 'warning', count: warnings };
    return { status: 'complete', count: 0 };
  };

  // Validate on tab change
  useEffect(() => {
    validateConfig();
  }, [config, slots, allocations, paymentSchedules, valueAdjustments, slotConfigs]);

  const completion = calculateCompletion();
  const totalErrors = validationIssues.filter(issue => issue.severity === 'error').length;
  const totalWarnings = validationIssues.filter(issue => issue.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Settings2 className="h-6 w-6 text-purple-600" />
              <div>
                <h2 className="text-lg font-semibold">ERC-3525 Semi-Fungible Token Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Advanced configuration for value-based semi-fungible tokens with slot management
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{completion}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>

          <Progress value={completion} className="h-3 mb-4" />
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {totalErrors > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                </Badge>
              )}
              {totalWarnings > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
                </Badge>
              )}
              {totalErrors === 0 && totalWarnings === 0 && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  All validations passed
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground">
              {Object.keys(config).filter(key => config[key as keyof typeof config]).length} / {Object.keys(config).length} fields configured
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="basic" className="relative">
            Basic Details
            {getTabStatus('basic').status === 'error' && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabStatus('basic').count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="properties" className="relative">
            Properties
            {getTabStatus('properties').status === 'error' && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabStatus('properties').count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="slots" className="relative">
            Slots
            {getTabStatus('slots').status === 'error' && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabStatus('slots').count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="allocations" className="relative">
            Allocations
            {getTabStatus('allocations').status === 'error' && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabStatus('allocations').count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment-schedules" className="relative">
            Payments
            {getTabStatus('payment-schedules').status === 'error' && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabStatus('payment-schedules').count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="value-adjustments" className="relative">
            Adjustments
            {getTabStatus('value-adjustments').status === 'error' && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabStatus('value-adjustments').count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="slot-configs" className="relative">
            Configs
            {getTabStatus('slot-configs').status === 'error' && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabStatus('slot-configs').count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <ERC3525BaseForm
            config={config}
            handleInputChange={handleChange}
            handleSelectChange={handleSelectChange}
            handleSwitchChange={handleSwitchChange}
          />
        </TabsContent>

        <TabsContent value="properties">
          <ERC3525PropertiesForm
            config={config}
            handleInputChange={handleChange}
            handleSelectChange={handleSelectChange}
            handleSwitchChange={handleSwitchChange}
          />
        </TabsContent>

        <TabsContent value="slots">
          <ERC3525SlotsForm
            config={config}
            slots={slots}
            onSlotsChange={setSlots}
          />
        </TabsContent>

        <TabsContent value="allocations">
          <ERC3525AllocationsForm
            config={config}
            allocations={allocations}
            slots={slots}
            onAllocationsChange={setAllocations}
          />
        </TabsContent>

        <TabsContent value="payment-schedules">
          <ERC3525PaymentSchedulesForm
            config={config}
            paymentSchedules={paymentSchedules}
            slots={slots}
            onPaymentSchedulesChange={setPaymentSchedules}
          />
        </TabsContent>

        <TabsContent value="value-adjustments">
          <ERC3525ValueAdjustmentsForm
            config={config}
            valueAdjustments={valueAdjustments}
            slots={slots}
            onValueAdjustmentsChange={setValueAdjustments}
          />
        </TabsContent>

        <TabsContent value="slot-configs">
          <ERC3525SlotConfigsForm
            config={config}
            slotConfigs={slotConfigs}
            slots={slots}
            onSlotConfigsChange={setSlotConfigs}
          />
        </TabsContent>
      </Tabs>

      {/* Validation Summary */}
      {validationIssues.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-3">Validation Issues</h3>
            <div className="space-y-2">
              {validationIssues.map((issue, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-2 text-sm p-2 rounded ${
                    issue.severity === 'error' 
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="flex-1">{issue.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(issue.tab)}
                    className="text-xs"
                  >
                    Go to {issue.tab}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERC3525Config;

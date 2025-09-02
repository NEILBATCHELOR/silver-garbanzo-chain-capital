import React, { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import sub-forms
import ERC4626BaseForm from './ERC4626BaseForm';
import ERC4626VaultStrategiesForm from './ERC4626VaultStrategiesForm';
import ERC4626AssetAllocationsForm from './ERC4626AssetAllocationsForm';
import ERC4626FeeTiersForm from './ERC4626FeeTiersForm';
import ERC4626PerformanceMetricsForm from './ERC4626PerformanceMetricsForm';
import ERC4626StrategyParamsForm from './ERC4626StrategyParamsForm';

// Import types
import { TokenERC4626Properties } from '@/types/core/centralModels';

interface ERC4626CompleteConfig {
  // Main properties
  erc4626Properties: Partial<TokenERC4626Properties>;
  
  // Related data arrays
  vaultStrategies: any[];
  assetAllocations: any[];
  feeTiers: any[];
  performanceMetrics: any[];
  strategyParams: any[];
  
  // Additional configurations
  yieldOptimizationEnabled: boolean;
  automatedRebalancing: boolean;
  performanceTracking: boolean;
  apyTrackingEnabled: boolean;
  benchmarkTrackingEnabled: boolean;
  multiAssetEnabled: boolean;
  rebalancingEnabled: boolean;
  autoCompoundingEnabled: boolean;
  riskManagementEnabled: boolean;
  diversificationEnabled: boolean;
  dynamicFeesEnabled: boolean;
  feeRebateEnabled: boolean;
  gasFeeOptimization: boolean;
  liquivityMiningEnabled: boolean;
  marketMakingEnabled: boolean;
  arbitrageEnabled: boolean;
  crossDexOptimization: boolean;
  impermanentLossProtection: boolean;
  lendingProtocolEnabled: boolean;
  borrowingEnabled: boolean;
  leverageEnabled: boolean;
  crossChainYieldEnabled: boolean;
  portfolioAnalyticsEnabled: boolean;
  realTimePnlTracking: boolean;
  taxReportingEnabled: boolean;
  automatedReporting: boolean;
  notificationSystemEnabled: boolean;
  mobileAppIntegration: boolean;
  socialTradingEnabled: boolean;
  institutionalGrade: boolean;
  custodyIntegration: boolean;
  auditTrailComprehensive: boolean;
  complianceReportingEnabled: boolean;
  fundAdministrationEnabled: boolean;
  thirdPartyAuditsEnabled: boolean;
}

interface ERC4626ConfigProps {
  tokenForm: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setTokenForm: React.Dispatch<React.SetStateAction<any>>;
  onConfigChange?: (config: any) => void;
  initialConfig?: Partial<ERC4626CompleteConfig>;
}

/**
 * Advanced configuration component for ERC-4626 Vault tokens
 * Provides comprehensive configuration covering all 110+ database fields
 * and related sub-tables for a complete vault setup
 */
const ERC4626Config: React.FC<ERC4626ConfigProps> = ({
  tokenForm,
  handleInputChange,
  setTokenForm,
  onConfigChange,
  initialConfig = {}
}) => {
  const [config, setConfig] = useState<ERC4626CompleteConfig>({
    // Main properties
    erc4626Properties: initialConfig.erc4626Properties || {},
    
    // Related data arrays
    vaultStrategies: initialConfig.vaultStrategies || [],
    assetAllocations: initialConfig.assetAllocations || [],
    feeTiers: initialConfig.feeTiers || [],
    performanceMetrics: initialConfig.performanceMetrics || [],
    strategyParams: initialConfig.strategyParams || [],
    
    // Feature flags from database
    yieldOptimizationEnabled: initialConfig.yieldOptimizationEnabled || false,
    automatedRebalancing: initialConfig.automatedRebalancing || false,
    performanceTracking: initialConfig.performanceTracking || false,
    apyTrackingEnabled: initialConfig.apyTrackingEnabled || false,
    benchmarkTrackingEnabled: initialConfig.benchmarkTrackingEnabled || false,
    multiAssetEnabled: initialConfig.multiAssetEnabled || false,
    rebalancingEnabled: initialConfig.rebalancingEnabled || false,
    autoCompoundingEnabled: initialConfig.autoCompoundingEnabled || false,
    riskManagementEnabled: initialConfig.riskManagementEnabled || false,
    diversificationEnabled: initialConfig.diversificationEnabled || false,
    dynamicFeesEnabled: initialConfig.dynamicFeesEnabled || false,
    feeRebateEnabled: initialConfig.feeRebateEnabled || false,
    gasFeeOptimization: initialConfig.gasFeeOptimization || false,
    liquivityMiningEnabled: initialConfig.liquivityMiningEnabled || false,
    marketMakingEnabled: initialConfig.marketMakingEnabled || false,
    arbitrageEnabled: initialConfig.arbitrageEnabled || false,
    crossDexOptimization: initialConfig.crossDexOptimization || false,
    impermanentLossProtection: initialConfig.impermanentLossProtection || false,
    lendingProtocolEnabled: initialConfig.lendingProtocolEnabled || false,
    borrowingEnabled: initialConfig.borrowingEnabled || false,
    leverageEnabled: initialConfig.leverageEnabled || false,
    crossChainYieldEnabled: initialConfig.crossChainYieldEnabled || false,
    portfolioAnalyticsEnabled: initialConfig.portfolioAnalyticsEnabled || false,
    realTimePnlTracking: initialConfig.realTimePnlTracking || false,
    taxReportingEnabled: initialConfig.taxReportingEnabled || false,
    automatedReporting: initialConfig.automatedReporting || false,
    notificationSystemEnabled: initialConfig.notificationSystemEnabled || false,
    mobileAppIntegration: initialConfig.mobileAppIntegration || false,
    socialTradingEnabled: initialConfig.socialTradingEnabled || false,
    institutionalGrade: initialConfig.institutionalGrade || false,
    custodyIntegration: initialConfig.custodyIntegration || false,
    auditTrailComprehensive: initialConfig.auditTrailComprehensive || false,
    complianceReportingEnabled: initialConfig.complianceReportingEnabled || false,
    fundAdministrationEnabled: initialConfig.fundAdministrationEnabled || false,
    thirdPartyAuditsEnabled: initialConfig.thirdPartyAuditsEnabled || false,
  });

  // Update parent when config changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
    
    // Also update the main token form with the complete configuration
    if (setTokenForm) {
      setTokenForm((prev: any) => ({
        ...prev,
        erc4626Properties: config.erc4626Properties,
        vaultStrategies: config.vaultStrategies,
        assetAllocations: config.assetAllocations,
        feeTiers: config.feeTiers,
        performanceMetrics: config.performanceMetrics,
        strategyParams: config.strategyParams,
        ...config // Include all feature flags
      }));
    }
  }, [config, onConfigChange, setTokenForm]);

  const handleConfigChange = (section: keyof ERC4626CompleteConfig, value: any) => {
    setConfig(prev => ({ ...prev, [section]: value }));
  };

  const handleFeatureToggle = (feature: keyof ERC4626CompleteConfig, enabled: boolean) => {
    setConfig(prev => ({ 
      ...prev, 
      [feature]: enabled,
      erc4626Properties: {
        ...prev.erc4626Properties,
        [feature]: enabled
      }
    }));
  };

  const getConfigSummary = () => {
    return {
      vaultStrategies: config.vaultStrategies.length,
      assetAllocations: config.assetAllocations.length,
      feeTiers: config.feeTiers.length,
      performanceMetrics: config.performanceMetrics.length,
      strategyParams: config.strategyParams.length,
      featuresEnabled: Object.entries(config).filter(([key, value]) => 
        typeof value === 'boolean' && value && 
        !['erc4626Properties', 'vaultStrategies', 'assetAllocations', 'feeTiers', 'performanceMetrics', 'strategyParams'].includes(key)
      ).length
    };
  };

  const summary = getConfigSummary();

  return (
    <div className="space-y-6">
      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>ERC-4626 Vault Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium">Strategies</p>
              <Badge variant="outline">{summary.vaultStrategies}</Badge>
            </div>
            <div className="text-center">
              <p className="font-medium">Allocations</p>
              <Badge variant="outline">{summary.assetAllocations}</Badge>
            </div>
            <div className="text-center">
              <p className="font-medium">Fee Tiers</p>
              <Badge variant="outline">{summary.feeTiers}</Badge>
            </div>
            <div className="text-center">
              <p className="font-medium">Metrics</p>
              <Badge variant="outline">{summary.performanceMetrics}</Badge>
            </div>
            <div className="text-center">
              <p className="font-medium">Parameters</p>
              <Badge variant="outline">{summary.strategyParams}</Badge>
            </div>
            <div className="text-center">
              <p className="font-medium">Features</p>
              <Badge variant="outline">{summary.featuresEnabled}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Configuration Sections */}
      <Accordion type="multiple" defaultValue={["base", "strategies"]} className="w-full">
        
        {/* Base Vault Configuration */}
        <AccordionItem value="base">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Base Vault Configuration</span>
              <Badge variant="outline">Core Settings</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ERC4626BaseForm
              config={config.erc4626Properties}
              onChange={(value) => handleConfigChange('erc4626Properties', value)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Investment Strategies */}
        <AccordionItem value="strategies">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Investment Strategies</span>
              <Badge variant="outline">{config.vaultStrategies.length} Strategies</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ERC4626VaultStrategiesForm
              strategies={config.vaultStrategies}
              onChange={(value) => handleConfigChange('vaultStrategies', value)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Asset Allocations */}
        <AccordionItem value="allocations">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Asset Allocations</span>
              <Badge variant="outline">{config.assetAllocations.length} Allocations</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ERC4626AssetAllocationsForm
              allocations={config.assetAllocations}
              onChange={(value) => handleConfigChange('assetAllocations', value)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Fee Structure */}
        <AccordionItem value="fees">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Fee Structure & Tiers</span>
              <Badge variant="outline">{config.feeTiers.length} Tiers</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ERC4626FeeTiersForm
              feeTiers={config.feeTiers}
              onChange={(value) => handleConfigChange('feeTiers', value)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Performance Tracking */}
        <AccordionItem value="performance">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Performance Tracking</span>
              <Badge variant="outline">{config.performanceMetrics.length} Records</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ERC4626PerformanceMetricsForm
              metrics={config.performanceMetrics}
              onChange={(value) => handleConfigChange('performanceMetrics', value)}
              enableTracking={config.performanceTracking}
              onEnableTrackingChange={(enabled) => handleFeatureToggle('performanceTracking', enabled)}
              benchmarkTrackingEnabled={config.benchmarkTrackingEnabled}
              onBenchmarkTrackingEnabledChange={(enabled) => handleFeatureToggle('benchmarkTrackingEnabled', enabled)}
              benchmarkIndex={(config as any).benchmarkIndex || ''}
              onBenchmarkIndexChange={(index) => handleConfigChange('benchmarkIndex' as any, index)}
              performanceHistoryRetention={(config as any).performanceHistoryRetention || 365}
              onPerformanceHistoryRetentionChange={(days) => handleConfigChange('performanceHistoryRetention' as any, days)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Strategy Parameters */}
        <AccordionItem value="parameters">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Strategy Parameters</span>
              <Badge variant="outline">{config.strategyParams.length} Parameters</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ERC4626StrategyParamsForm
              strategyParams={config.strategyParams}
              onChange={(value) => handleConfigChange('strategyParams', value)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Advanced Features */}
        <AccordionItem value="features">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Advanced Features</span>
              <Badge variant="outline">{summary.featuresEnabled} Enabled</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              
              {/* Yield Optimization */}
              <Card>
                <CardHeader>
                  <CardTitle>Yield Optimization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.yieldOptimizationEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('yieldOptimizationEnabled', checked)}
                      />
                      <Label>Yield Optimization</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.automatedRebalancing}
                        onCheckedChange={(checked) => handleFeatureToggle('automatedRebalancing', checked)}
                      />
                      <Label>Automated Rebalancing</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.autoCompoundingEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('autoCompoundingEnabled', checked)}
                      />
                      <Label>Auto Compounding</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DeFi Integration */}
              <Card>
                <CardHeader>
                  <CardTitle>DeFi Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.liquivityMiningEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('liquivityMiningEnabled', checked)}
                      />
                      <Label>Liquidity Mining</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.marketMakingEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('marketMakingEnabled', checked)}
                      />
                      <Label>Market Making</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.arbitrageEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('arbitrageEnabled', checked)}
                      />
                      <Label>Arbitrage</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.crossDexOptimization}
                        onCheckedChange={(checked) => handleFeatureToggle('crossDexOptimization', checked)}
                      />
                      <Label>Cross-DEX Optimization</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.impermanentLossProtection}
                        onCheckedChange={(checked) => handleFeatureToggle('impermanentLossProtection', checked)}
                      />
                      <Label>IL Protection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.crossChainYieldEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('crossChainYieldEnabled', checked)}
                      />
                      <Label>Cross-Chain Yield</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lending & Borrowing */}
              <Card>
                <CardHeader>
                  <CardTitle>Lending & Leverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.lendingProtocolEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('lendingProtocolEnabled', checked)}
                      />
                      <Label>Lending Protocol</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.borrowingEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('borrowingEnabled', checked)}
                      />
                      <Label>Borrowing</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.leverageEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('leverageEnabled', checked)}
                      />
                      <Label>Leverage</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics & Reporting */}
              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Reporting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.portfolioAnalyticsEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('portfolioAnalyticsEnabled', checked)}
                      />
                      <Label>Portfolio Analytics</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.realTimePnlTracking}
                        onCheckedChange={(checked) => handleFeatureToggle('realTimePnlTracking', checked)}
                      />
                      <Label>Real-time P&L</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.taxReportingEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('taxReportingEnabled', checked)}
                      />
                      <Label>Tax Reporting</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.automatedReporting}
                        onCheckedChange={(checked) => handleFeatureToggle('automatedReporting', checked)}
                      />
                      <Label>Automated Reporting</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Institutional Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Institutional Grade Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.institutionalGrade}
                        onCheckedChange={(checked) => handleFeatureToggle('institutionalGrade', checked)}
                      />
                      <Label>Institutional Grade</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.custodyIntegration}
                        onCheckedChange={(checked) => handleFeatureToggle('custodyIntegration', checked)}
                      />
                      <Label>Custody Integration</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.auditTrailComprehensive}
                        onCheckedChange={(checked) => handleFeatureToggle('auditTrailComprehensive', checked)}
                      />
                      <Label>Comprehensive Audit Trail</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.complianceReportingEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('complianceReportingEnabled', checked)}
                      />
                      <Label>Compliance Reporting</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.fundAdministrationEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('fundAdministrationEnabled', checked)}
                      />
                      <Label>Fund Administration</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.thirdPartyAuditsEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('thirdPartyAuditsEnabled', checked)}
                      />
                      <Label>Third-party Audits</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Experience */}
              <Card>
                <CardHeader>
                  <CardTitle>User Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.notificationSystemEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('notificationSystemEnabled', checked)}
                      />
                      <Label>Notifications</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.mobileAppIntegration}
                        onCheckedChange={(checked) => handleFeatureToggle('mobileAppIntegration', checked)}
                      />
                      <Label>Mobile App</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.socialTradingEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle('socialTradingEnabled', checked)}
                      />
                      <Label>Social Trading</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ERC4626Config;
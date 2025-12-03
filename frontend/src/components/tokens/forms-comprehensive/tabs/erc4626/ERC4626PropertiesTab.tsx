// ERC4626 Properties Tab Component
// Handles token_erc4626_properties table with tokenized vault configuration
// Integrates Master Contract and Extension Module configurations

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Settings, Puzzle } from 'lucide-react';

import { TokenERC4626PropertiesData, ConfigMode, TokensTableData } from '../../types';
import { ProjectWalletSelector } from '../../../ui/ProjectWalletSelector';

// Master Contract Configs
import { ERC4626MasterConfigPanel } from '../../contracts/masters';

// Extension Module Configs
import {
  ComplianceModuleConfigPanel,
  VestingModuleConfigPanel,
  DocumentModuleConfigPanel,
  PolicyEngineConfigPanel,
  FeeStrategyModuleConfigPanel,
  WithdrawalQueueModuleConfigPanel,
  YieldStrategyModuleConfigPanel,
  AsyncVaultModuleConfigPanel,
  NativeVaultModuleConfigPanel,
  RouterModuleConfigPanel,
  MultiAssetVaultModuleConfigPanel
} from '../../contracts/extensions';

import type {
  ERC4626MasterConfig,
  ComplianceModuleConfig,
  VestingModuleConfig,
  DocumentModuleConfig,
  PolicyEngineModuleConfig,
  FeeStrategyModuleConfig,
  WithdrawalQueueModuleConfig,
  YieldStrategyModuleConfig,
  AsyncVaultModuleConfig,
  NativeVaultModuleConfig,
  RouterModuleConfig,
  MultiAssetVaultModuleConfig
} from '../../contracts/types';

interface ERC4626PropertiesTabProps {
  data: TokenERC4626PropertiesData | TokenERC4626PropertiesData[];
  tokenData?: TokensTableData | TokensTableData[]; // ✅ FIX: Add tokenData prop for name, symbol access
  validationErrors: Record<string, string[]>;
  isModified: boolean;
  configMode: ConfigMode;
  projectId: string;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting: boolean;
  network?: string;
  environment?: string;
}

export const ERC4626PropertiesTab: React.FC<ERC4626PropertiesTabProps> = ({
  data,
  tokenData, // ✅ FIX: Receive tokenData
  validationErrors,
  isModified,
  configMode,
  projectId,
  onFieldChange,
  onValidate,
  isSubmitting,
  network = 'hoodi',
  environment = 'testnet'
}) => {
  const propertiesData = Array.isArray(data) ? (data[0] || {}) : data;
  // ✅ FIX: Extract token data with proper typing
  const tokenTableData: TokensTableData = (Array.isArray(tokenData) ? tokenData[0] : tokenData) ?? {} as TokensTableData;
  const [activeTab, setActiveTab] = useState<'master' | 'extensions'>('master');

  const handleFieldChange = (field: string, value: any) => {
    onFieldChange(field, value, 0);
  };

  const getFieldError = (field: string): string[] => {
    return validationErrors[`0.${field}`] || validationErrors[field] || [];
  };

  const hasFieldError = (field: string): boolean => {
    return getFieldError(field).length > 0;
  };

  // Master Contract Configuration State
  // ✅ FIX: Use tokenTableData for name and symbol which exist in tokens table
  const [masterConfig, setMasterConfig] = useState<ERC4626MasterConfig>({
    asset: propertiesData.asset || '',
    name: tokenTableData.name || '',
    symbol: tokenTableData.symbol || '',
    depositCap: propertiesData.deposit_cap || '0',
    minimumDeposit: propertiesData.minimum_deposit || '0',
    owner: propertiesData.initial_owner || ''
  });

  // ✅ FIX: Update masterConfig when data loads asynchronously
  React.useEffect(() => {
    setMasterConfig({
      asset: propertiesData.asset || '',
      name: tokenTableData.name || '',
      symbol: tokenTableData.symbol || '',
      depositCap: propertiesData.deposit_cap || '0',
      minimumDeposit: propertiesData.minimum_deposit || '0',
      owner: propertiesData.initial_owner || ''
    });
  }, [
    propertiesData.asset, 
    tokenTableData.name, 
    tokenTableData.symbol, 
    propertiesData.deposit_cap, 
    propertiesData.minimum_deposit, 
    propertiesData.initial_owner
  ]);

  // Extension Module Configuration States
  // ✅ FIX: Create wrapper functions that persist to database
  const [complianceConfig, setComplianceConfigState] = useState<ComplianceModuleConfig>(() => {
    const saved = propertiesData.compliance_config as any;
    return saved || {
      enabled: !!propertiesData.compliance_module_address,
      kycRequired: false,
      whitelistRequired: false
    };
  });
  const setComplianceConfig = (config: ComplianceModuleConfig) => {
    setComplianceConfigState(config);
    handleFieldChange('compliance_config', config);
  };

  const [vestingConfig, setVestingConfigState] = useState<VestingModuleConfig>(() => {
    const saved = propertiesData.vesting_config as any;
    return saved || {
      enabled: !!propertiesData.vesting_module_address,
      schedules: []
    };
  });
  const setVestingConfig = (config: VestingModuleConfig) => {
    setVestingConfigState(config);
    handleFieldChange('vesting_config', config);
  };

  const [documentConfig, setDocumentConfigState] = useState<DocumentModuleConfig>(() => {
    const saved = propertiesData.document_config as any;
    return saved || {
      enabled: !!propertiesData.document_module_address,
      documents: []
    };
  });
  const setDocumentConfig = (config: DocumentModuleConfig) => {
    setDocumentConfigState(config);
    handleFieldChange('document_config', config);
  };

  const [policyEngineConfig, setPolicyEngineConfigState] = useState<PolicyEngineModuleConfig>(() => {
    const saved = propertiesData.policy_engine_config as any;
    return saved || {
      enabled: !!propertiesData.policy_engine_address,
      rules: [],
      validators: []
    };
  });
  const setPolicyEngineConfig = (config: PolicyEngineModuleConfig) => {
    setPolicyEngineConfigState(config);
    // Note: policy_engine doesn't have a separate config field in ERC4626
  };

  const [feeStrategyConfig, setFeeStrategyConfigState] = useState<FeeStrategyModuleConfig>(() => {
    const saved = propertiesData.fee_strategy_config as any;
    return saved || {
      enabled: !!propertiesData.fee_strategy_module_address,
      managementFeeBps: 0,
      performanceFeeBps: 0,
      feeRecipient: ''
    };
  });
  const setFeeStrategyConfig = (config: FeeStrategyModuleConfig) => {
    setFeeStrategyConfigState(config);
    handleFieldChange('fee_strategy_config', config);
  };

  const [withdrawalQueueConfig, setWithdrawalQueueConfigState] = useState<WithdrawalQueueModuleConfig>(() => {
    const saved = propertiesData.withdrawal_queue_config as any;
    return saved || {
      enabled: !!propertiesData.withdrawal_queue_module_address,
      maxQueueSize: 0
    };
  });
  const setWithdrawalQueueConfig = (config: WithdrawalQueueModuleConfig) => {
    setWithdrawalQueueConfigState(config);
    handleFieldChange('withdrawal_queue_config', config);
  };

  const [yieldStrategyConfig, setYieldStrategyConfigState] = useState<YieldStrategyModuleConfig>(() => {
    const saved = propertiesData.yield_strategy_config as any;
    return saved || {
      enabled: !!propertiesData.yield_strategy_module_address,
      targetYieldBps: 0
    };
  });
  const setYieldStrategyConfig = (config: YieldStrategyModuleConfig) => {
    setYieldStrategyConfigState(config);
    handleFieldChange('yield_strategy_config', config);
  };

  const [asyncVaultConfig, setAsyncVaultConfigState] = useState<AsyncVaultModuleConfig>(() => {
    const saved = propertiesData.async_vault_config as any;
    return saved || {
      enabled: !!propertiesData.async_vault_module_address,
      settlementDelay: 86400
    };
  });
  const setAsyncVaultConfig = (config: AsyncVaultModuleConfig) => {
    setAsyncVaultConfigState(config);
    handleFieldChange('async_vault_config', config);
  };

  const [nativeVaultConfig, setNativeVaultConfigState] = useState<NativeVaultModuleConfig>(() => {
    const saved = propertiesData.native_vault_config as any;
    return saved || {
      enabled: !!propertiesData.native_vault_module_address
    };
  });
  const setNativeVaultConfig = (config: NativeVaultModuleConfig) => {
    setNativeVaultConfigState(config);
    handleFieldChange('native_vault_config', config);
  };

  const [routerConfig, setRouterConfigState] = useState<RouterModuleConfig>(() => {
    const saved = propertiesData.router_config as any;
    return saved || {
      enabled: !!propertiesData.router_module_address
    };
  });
  const setRouterConfig = (config: RouterModuleConfig) => {
    setRouterConfigState(config);
    handleFieldChange('router_config', config);
  };

  const [multiAssetVaultConfig, setMultiAssetVaultConfigState] = useState<MultiAssetVaultModuleConfig>(() => {
    const saved = propertiesData.multi_asset_vault_config as any;
    return saved || {
      enabled: !!propertiesData.multi_asset_vault_module_address,
      maxAssets: 0
    };
  });
  const setMultiAssetVaultConfig = (config: MultiAssetVaultModuleConfig) => {
    setMultiAssetVaultConfigState(config);
    handleFieldChange('multi_asset_vault_config', config);
  };

  // Handler for master config changes
  // ✅ FIX: Do NOT try to update name/symbol here - they belong to tokens table
  const handleMasterConfigChange = (newConfig: ERC4626MasterConfig) => {
    setMasterConfig(newConfig);
    // Only update fields that belong to token_erc4626_properties table
    handleFieldChange('asset', newConfig.asset);
    handleFieldChange('deposit_cap', newConfig.depositCap);
    handleFieldChange('minimum_deposit', newConfig.minimumDeposit);
    handleFieldChange('initial_owner', newConfig.owner);
    // NOTE: name and symbol are read-only here and must be edited in Basic Info tab
  };

  // Count enabled modules
  const enabledModulesCount = [
    complianceConfig.enabled,
    vestingConfig.enabled,
    documentConfig.enabled,
    policyEngineConfig.enabled,
    feeStrategyConfig.enabled,
    withdrawalQueueConfig.enabled,
    yieldStrategyConfig.enabled,
    asyncVaultConfig.enabled,
    nativeVaultConfig.enabled,
    routerConfig.enabled,
    multiAssetVaultConfig.enabled
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Owner Configuration - Always at top */}
      <Card>
        <CardHeader>
          <CardTitle>Owner Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectWalletSelector
            projectId={projectId}
            value={masterConfig.owner}
            onChange={(address) => handleMasterConfigChange({
              ...masterConfig,
              owner: address
            })}
            label="Initial Owner"
            description="This wallet address will receive all roles (ADMIN, MINTER, PAUSER, UPGRADER) upon deployment"
            required={true}
          />
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'master' | 'extensions')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="master" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Master Contract
          </TabsTrigger>
          <TabsTrigger value="extensions" className="flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            Extension Modules
            {enabledModulesCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enabledModulesCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Master Contract Configuration */}
        <TabsContent value="master" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ERC4626 Tokenized Vault Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <ERC4626MasterConfigPanel
                config={masterConfig}
                onChange={handleMasterConfigChange}
                disabled={isSubmitting}
                errors={{}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extension Modules Configuration */}
        <TabsContent value="extensions" className="space-y-4">
          {/* Universal Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Universal Modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Available for all token standards
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ComplianceModuleConfigPanel
                config={complianceConfig}
                onChange={setComplianceConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <VestingModuleConfigPanel
                config={vestingConfig}
                onChange={setVestingConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <DocumentModuleConfigPanel
                config={documentConfig}
                onChange={setDocumentConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <PolicyEngineConfigPanel
                config={policyEngineConfig}
                onChange={setPolicyEngineConfig}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>

          {/* ERC4626-Specific Modules */}
          <Card>
            <CardHeader>
              <CardTitle>ERC4626-Specific Modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Extensions designed specifically for tokenized vaults and yield strategies
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <FeeStrategyModuleConfigPanel
                config={feeStrategyConfig}
                onChange={setFeeStrategyConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <WithdrawalQueueModuleConfigPanel
                config={withdrawalQueueConfig}
                onChange={setWithdrawalQueueConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <YieldStrategyModuleConfigPanel
                config={yieldStrategyConfig}
                onChange={setYieldStrategyConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <AsyncVaultModuleConfigPanel
                config={asyncVaultConfig}
                onChange={setAsyncVaultConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <NativeVaultModuleConfigPanel
                config={nativeVaultConfig}
                onChange={setNativeVaultConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <RouterModuleConfigPanel
                config={routerConfig}
                onChange={setRouterConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <MultiAssetVaultModuleConfigPanel
                config={multiAssetVaultConfig}
                onChange={setMultiAssetVaultConfig}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ERC-4626 Properties:</span>
          {isModified ? (
            <Badge variant="outline" className="text-yellow-600">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600">Saved</Badge>
          )}
          {enabledModulesCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">
                {enabledModulesCount} module{enabledModulesCount !== 1 ? 's' : ''} enabled
              </span>
            </>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onValidate}
          disabled={isSubmitting}
        >
          Validate
        </Button>
      </div>
    </div>
  );
};

export default ERC4626PropertiesTab;

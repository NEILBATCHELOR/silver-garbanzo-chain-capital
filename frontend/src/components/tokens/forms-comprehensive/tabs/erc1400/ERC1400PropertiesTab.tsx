// ERC1400 Properties Tab Component
// Handles token_erc1400_properties table with security token configuration
// Integrates Master Contract and Extension Module configurations

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Settings, Puzzle } from 'lucide-react';

import { TokenERC1400PropertiesData, ConfigMode, TokensTableData } from '../../types';
import { ProjectWalletSelector } from '../../../ui/ProjectWalletSelector';

// Master Contract Configs
import { ERC1400MasterConfigPanel } from '../../contracts/masters';

// Extension Module Configs
import {
  ComplianceModuleConfigPanel,
  VestingModuleConfigPanel,
  DocumentModuleConfigPanel,
  PolicyEngineConfigPanel,
  TransferRestrictionsModuleConfigPanel,
  ControllerModuleConfigPanel,
  ERC1400DocumentModuleConfigPanel
} from '../../contracts/extensions';

import type {
  ERC1400MasterConfig,
  ComplianceModuleConfig,
  VestingModuleConfig,
  DocumentModuleConfig,
  PolicyEngineModuleConfig,
  TransferRestrictionsModuleConfig,
  ControllerModuleConfig,
  ERC1400DocumentModuleConfig
} from '../../contracts/types';

interface ERC1400PropertiesTabProps {
  data: TokenERC1400PropertiesData | TokenERC1400PropertiesData[];
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

export const ERC1400PropertiesTab: React.FC<ERC1400PropertiesTabProps> = ({
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
  const [masterConfig, setMasterConfig] = useState<ERC1400MasterConfig>({
    name: tokenTableData.name || '',
    symbol: tokenTableData.symbol || '',
    decimals: propertiesData.decimals || 18,
    defaultPartitions: propertiesData.default_partitions || [],
    owner: propertiesData.initial_owner || '',
    isControllable: propertiesData.is_controllable || false
  });

  // ✅ FIX: Update masterConfig when data loads asynchronously
  React.useEffect(() => {
    setMasterConfig({
      name: tokenTableData.name || '',
      symbol: tokenTableData.symbol || '',
      decimals: propertiesData.decimals || 18,
      defaultPartitions: propertiesData.default_partitions || [],
      owner: propertiesData.initial_owner || '',
      isControllable: propertiesData.is_controllable || false
    });
  }, [
    tokenTableData.name, 
    tokenTableData.symbol, 
    propertiesData.decimals, 
    propertiesData.default_partitions, 
    propertiesData.initial_owner,
    propertiesData.is_controllable
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
    // Note: policy_engine doesn't have a separate config field in ERC1400
  };

  const [transferRestrictionsConfig, setTransferRestrictionsConfigState] = useState<TransferRestrictionsModuleConfig>(() => {
    const saved = propertiesData.transfer_restrictions_config as any;
    return saved || {
      enabled: !!propertiesData.transfer_restrictions_module_address,
      restrictions: [],
      defaultPolicy: 'block'
    };
  });
  const setTransferRestrictionsConfig = (config: TransferRestrictionsModuleConfig) => {
    setTransferRestrictionsConfigState(config);
    handleFieldChange('transfer_restrictions_config', config);
  };

  const [controllerConfig, setControllerConfigState] = useState<ControllerModuleConfig>(() => {
    const saved = propertiesData.controller_config as any;
    return saved || {
      enabled: !!propertiesData.controller_module_address,
      controllers: []
    };
  });
  const setControllerConfig = (config: ControllerModuleConfig) => {
    setControllerConfigState(config);
    handleFieldChange('controller_config', config);
  };

  const [erc1400DocumentConfig, setErc1400DocumentConfigState] = useState<ERC1400DocumentModuleConfig>(() => {
    const saved = propertiesData.erc1400_document_config as any;
    return saved || {
      enabled: !!propertiesData.erc1400_document_module_address,
      documents: []
    };
  });
  const setErc1400DocumentConfig = (config: ERC1400DocumentModuleConfig) => {
    setErc1400DocumentConfigState(config);
    handleFieldChange('erc1400_document_config', config);
  };

  // Handler for master config changes
  // ✅ FIX: Do NOT try to update name/symbol here - they belong to tokens table
  const handleMasterConfigChange = (newConfig: ERC1400MasterConfig) => {
    setMasterConfig(newConfig);
    // Only update fields that belong to token_erc1400_properties table
    handleFieldChange('decimals', newConfig.decimals);
    handleFieldChange('default_partitions', newConfig.defaultPartitions);
    handleFieldChange('initial_owner', newConfig.owner);
    handleFieldChange('is_controllable', newConfig.isControllable);
    // NOTE: name and symbol are read-only here and must be edited in Basic Info tab
  };

  // Count enabled modules
  const enabledModulesCount = [
    complianceConfig.enabled,
    vestingConfig.enabled,
    documentConfig.enabled,
    policyEngineConfig.enabled,
    transferRestrictionsConfig.enabled,
    controllerConfig.enabled,
    erc1400DocumentConfig.enabled
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
              <CardTitle>ERC1400 Security Token Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <ERC1400MasterConfigPanel
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

          {/* ERC1400-Specific Modules */}
          <Card>
            <CardHeader>
              <CardTitle>ERC1400-Specific Modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Extensions designed specifically for security tokens with partitions and compliance
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <TransferRestrictionsModuleConfigPanel
                config={transferRestrictionsConfig}
                onChange={setTransferRestrictionsConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <ControllerModuleConfigPanel
                config={controllerConfig}
                onChange={setControllerConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <ERC1400DocumentModuleConfigPanel
                config={erc1400DocumentConfig}
                onChange={setErc1400DocumentConfig}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ERC-1400 Properties:</span>
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

export default ERC1400PropertiesTab;

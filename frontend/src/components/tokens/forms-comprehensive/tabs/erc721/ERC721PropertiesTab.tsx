// ERC721 Properties Tab Component
// Handles token_erc721_properties table with NFT-specific configuration
// Integrates Master Contract and Extension Module configurations

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Settings, Puzzle } from 'lucide-react';

import { TokenERC721PropertiesData, ConfigMode, TokensTableData } from '../../types';
import { ProjectWalletSelector } from '../../../ui/ProjectWalletSelector';

// Master Contract Configs
import { 
  ERC721MasterConfigPanel,
  ERC721WrapperMasterConfigPanel
} from '../../contracts/masters';

// Extension Module Configs
import {
  ComplianceModuleConfigPanel,
  VestingModuleConfigPanel,
  DocumentModuleConfigPanel,
  PolicyEngineConfigPanel,
  RoyaltyModuleConfigPanel,
  RentalModuleConfigPanel,
  SoulboundModuleConfigPanel,
  FractionalizationModuleConfigPanel,
  ConsecutiveModuleConfigPanel,
  MetadataEventsModuleConfigPanel
} from '../../contracts/extensions';

import type {
  ERC721MasterConfig,
  ComplianceModuleConfig,
  VestingModuleConfig,
  DocumentModuleConfig,
  PolicyEngineModuleConfig,
  RoyaltyModuleConfig,
  RentalModuleConfig,
  SoulboundModuleConfig,
  FractionalizationModuleConfig,
  ConsecutiveModuleConfig,
  MetadataEventsModuleConfig
} from '../../contracts/types';

interface ERC721PropertiesTabProps {
  data: TokenERC721PropertiesData | TokenERC721PropertiesData[];
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

export const ERC721PropertiesTab: React.FC<ERC721PropertiesTabProps> = ({
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
  const [masterConfig, setMasterConfig] = useState<ERC721MasterConfig>({
    name: tokenTableData.name || '',
    symbol: tokenTableData.symbol || '',
    baseTokenURI: propertiesData.base_uri || '',
    maxSupply: propertiesData.max_supply || '0',
    owner: propertiesData.initial_owner || '',
    mintingEnabled: propertiesData.minting_enabled || true,
    burningEnabled: propertiesData.burning_enabled || true
  });

  // ✅ FIX: Update masterConfig when data loads asynchronously
  React.useEffect(() => {
    setMasterConfig({
      name: tokenTableData.name || '',
      symbol: tokenTableData.symbol || '',
      baseTokenURI: propertiesData.base_uri || '',
      maxSupply: propertiesData.max_supply || '0',
      owner: propertiesData.initial_owner || '',
      mintingEnabled: propertiesData.minting_enabled || true,
      burningEnabled: propertiesData.burning_enabled || true
    });
  }, [
    tokenTableData.name, 
    tokenTableData.symbol, 
    propertiesData.base_uri, 
    propertiesData.max_supply, 
    propertiesData.initial_owner,
    propertiesData.minting_enabled,
    propertiesData.burning_enabled
  ]);

  // Extension Module Configuration States
  // ✅ FIX: Create wrapper functions that persist to database
  const [complianceConfig, setComplianceConfigState] = useState<ComplianceModuleConfig>({
    enabled: !!propertiesData.compliance_module_address,
    kycRequired: false,
    whitelistRequired: false
  });
  const setComplianceConfig = (config: ComplianceModuleConfig) => {
    setComplianceConfigState(config);
    handleFieldChange('compliance_config', config);
  };

  const [vestingConfig, setVestingConfigState] = useState<VestingModuleConfig>({
    enabled: !!propertiesData.vesting_module_address,
    schedules: []
  });
  const setVestingConfig = (config: VestingModuleConfig) => {
    setVestingConfigState(config);
    handleFieldChange('vesting_config', config);
  };

  const [documentConfig, setDocumentConfigState] = useState<DocumentModuleConfig>({
    enabled: !!propertiesData.document_module_address,
    documents: []
  });
  const setDocumentConfig = (config: DocumentModuleConfig) => {
    setDocumentConfigState(config);
    handleFieldChange('document_config', config);
  };

  const [policyEngineConfig, setPolicyEngineConfigState] = useState<PolicyEngineModuleConfig>({
    enabled: !!propertiesData.policy_engine_address,
    rules: [],
    validators: []
  });
  const setPolicyEngineConfig = (config: PolicyEngineModuleConfig) => {
    setPolicyEngineConfigState(config);
    // Note: policy_engine doesn't have a separate config field in ERC721, address is stored separately
  };

  const [royaltyConfig, setRoyaltyConfigState] = useState<RoyaltyModuleConfig>({
    enabled: !!propertiesData.royalty_module_address,
    defaultRoyaltyBps: 0,
    royaltyRecipient: ''
  });
  const setRoyaltyConfig = (config: RoyaltyModuleConfig) => {
    setRoyaltyConfigState(config);
    // Note: royalty doesn't have a separate config field, uses royalty_percentage and royalty_receiver
  };

  const [rentalConfig, setRentalConfigState] = useState<RentalModuleConfig>({
    enabled: !!propertiesData.rental_module_address,
    maxRentalDuration: 0
  });
  const setRentalConfig = (config: RentalModuleConfig) => {
    setRentalConfigState(config);
    handleFieldChange('rental_config', config);
  };

  const [soulboundConfig, setSoulboundConfigState] = useState<SoulboundModuleConfig>({
    enabled: !!propertiesData.soulbound_module_address
  });
  const setSoulboundConfig = (config: SoulboundModuleConfig) => {
    setSoulboundConfigState(config);
    handleFieldChange('soulbound_config', config);
  };

  const [fractionalizationConfig, setFractionalizationConfigState] = useState<FractionalizationModuleConfig>({
    enabled: !!propertiesData.fraction_module_address,
    minFractions: 100
  });
  const setFractionalizationConfig = (config: FractionalizationModuleConfig) => {
    setFractionalizationConfigState(config);
    handleFieldChange('fractionalization_config', config);
  };

  const [consecutiveConfig, setConsecutiveConfigState] = useState<ConsecutiveModuleConfig>({
    enabled: !!propertiesData.consecutive_module_address
  });
  const setConsecutiveConfig = (config: ConsecutiveModuleConfig) => {
    setConsecutiveConfigState(config);
    handleFieldChange('consecutive_config', config);
  };

  const [metadataEventsConfig, setMetadataEventsConfigState] = useState<MetadataEventsModuleConfig>({
    enabled: !!propertiesData.metadata_events_module_address
  });
  const setMetadataEventsConfig = (config: MetadataEventsModuleConfig) => {
    setMetadataEventsConfigState(config);
    handleFieldChange('metadata_events_config', config);
  };

  // Handler for master config changes
  // ✅ FIX: Do NOT try to update name/symbol here - they belong to tokens table, not properties table
  // Name and symbol should only be edited in Basic Info tab
  const handleMasterConfigChange = (newConfig: ERC721MasterConfig) => {
    setMasterConfig(newConfig);
    // Only update fields that belong to token_erc721_properties table
    handleFieldChange('base_uri', newConfig.baseTokenURI);
    handleFieldChange('max_supply', newConfig.maxSupply);
    handleFieldChange('initial_owner', newConfig.owner);
    handleFieldChange('minting_enabled', newConfig.mintingEnabled);
    handleFieldChange('burning_enabled', newConfig.burningEnabled);
    // NOTE: name and symbol are read-only here and must be edited in Basic Info tab
  };

  // Count enabled modules
  const enabledModulesCount = [
    complianceConfig.enabled,
    vestingConfig.enabled,
    documentConfig.enabled,
    policyEngineConfig.enabled,
    royaltyConfig.enabled,
    rentalConfig.enabled,
    soulboundConfig.enabled,
    fractionalizationConfig.enabled,
    consecutiveConfig.enabled,
    metadataEventsConfig.enabled
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
              <CardTitle>ERC721 NFT Collection Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <ERC721MasterConfigPanel
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

          {/* ERC721-Specific Modules */}
          <Card>
            <CardHeader>
              <CardTitle>ERC721-Specific Modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Extensions designed specifically for NFT collections
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <RoyaltyModuleConfigPanel
                config={royaltyConfig}
                onChange={setRoyaltyConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <RentalModuleConfigPanel
                config={rentalConfig}
                onChange={setRentalConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <SoulboundModuleConfigPanel
                config={soulboundConfig}
                onChange={setSoulboundConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <FractionalizationModuleConfigPanel
                config={fractionalizationConfig}
                onChange={setFractionalizationConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <ConsecutiveModuleConfigPanel
                config={consecutiveConfig}
                onChange={setConsecutiveConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <MetadataEventsModuleConfigPanel
                config={metadataEventsConfig}
                onChange={setMetadataEventsConfig}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ERC-721 Properties:</span>
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

export default ERC721PropertiesTab;

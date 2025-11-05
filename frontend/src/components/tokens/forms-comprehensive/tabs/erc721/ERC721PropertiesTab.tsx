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

import { TokenERC721PropertiesData, ConfigMode } from '../../types';
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
  PolicyEngineConfig,
  RoyaltyModuleConfig,
  RentalModuleConfig,
  SoulboundModuleConfig,
  FractionalizationModuleConfig,
  ConsecutiveModuleConfig,
  MetadataEventsModuleConfig
} from '../../contracts/types';

interface ERC721PropertiesTabProps {
  data: TokenERC721PropertiesData | TokenERC721PropertiesData[];
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
  const [masterConfig, setMasterConfig] = useState<ERC721MasterConfig>({
    name: propertiesData.name || '',
    symbol: propertiesData.symbol || '',
    baseTokenURI: propertiesData.base_uri || '',
    maxSupply: propertiesData.max_supply || '0',
    owner: propertiesData.initial_owner || '',
    mintingEnabled: propertiesData.minting_enabled || true,
    burningEnabled: propertiesData.burning_enabled || true
  });

  // Extension Module Configuration States
  const [complianceConfig, setComplianceConfig] = useState<ComplianceModuleConfig>({
    enabled: !!propertiesData.compliance_module_address,
    kycRequired: false,
    whitelistRequired: false
  });

  const [vestingConfig, setVestingConfig] = useState<VestingModuleConfig>({
    enabled: !!propertiesData.vesting_module_address
  });

  const [documentConfig, setDocumentConfig] = useState<DocumentModuleConfig>({
    enabled: !!propertiesData.document_module_address
  });

  const [policyEngineConfig, setPolicyEngineConfig] = useState<PolicyEngineConfig>({
    enabled: !!propertiesData.policy_engine_address,
    rulesEnabled: [],
    validatorsEnabled: []
  });

  const [royaltyConfig, setRoyaltyConfig] = useState<RoyaltyModuleConfig>({
    enabled: !!propertiesData.royalty_module_address,
    defaultRoyaltyBps: 0,
    royaltyRecipient: ''
  });

  const [rentalConfig, setRentalConfig] = useState<RentalModuleConfig>({
    enabled: !!propertiesData.rental_module_address,
    maxRentalDuration: 0
  });

  const [soulboundConfig, setSoulboundConfig] = useState<SoulboundModuleConfig>({
    enabled: !!propertiesData.soulbound_module_address
  });

  const [fractionalizationConfig, setFractionalizationConfig] = useState<FractionalizationModuleConfig>({
    enabled: !!propertiesData.fraction_module_address,
    minFractions: 100
  });

  const [consecutiveConfig, setConsecutiveConfig] = useState<ConsecutiveModuleConfig>({
    enabled: !!propertiesData.consecutive_module_address
  });

  const [metadataEventsConfig, setMetadataEventsConfig] = useState<MetadataEventsModuleConfig>({
    enabled: !!propertiesData.metadata_events_module_address
  });

  // Handler for master config changes
  const handleMasterConfigChange = (newConfig: ERC721MasterConfig) => {
    setMasterConfig(newConfig);
    // Update underlying data fields
    handleFieldChange('name', newConfig.name);
    handleFieldChange('symbol', newConfig.symbol);
    handleFieldChange('base_uri', newConfig.baseTokenURI);
    handleFieldChange('max_supply', newConfig.maxSupply);
    handleFieldChange('initial_owner', newConfig.owner);
    handleFieldChange('minting_enabled', newConfig.mintingEnabled);
    handleFieldChange('burning_enabled', newConfig.burningEnabled);
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

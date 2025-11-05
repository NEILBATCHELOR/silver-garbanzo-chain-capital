// ERC20 Properties Tab Component
// Handles token_erc20_properties table with complete field coverage
// Integrates Master Contract and Extension Module configurations

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Settings, Puzzle } from 'lucide-react';

import { TokenERC20PropertiesData, ConfigMode } from '../../types';
import { ProjectWalletSelector } from '../../../ui/ProjectWalletSelector';

// Master Contract Configs
import { 
  ERC20MasterConfigPanel,
  ERC20RebasingMasterConfigPanel,
  ERC20WrapperMasterConfigPanel
} from '../../contracts/masters';

// Extension Module Configs
import {
  ComplianceModuleConfigPanel,
  VestingModuleConfigPanel,
  DocumentModuleConfigPanel,
  PolicyEngineConfigPanel,
  FeeModuleConfigPanel,
  FlashMintModuleConfigPanel,
  PermitModuleConfigPanel,
  SnapshotModuleConfigPanel,
  TimelockModuleConfigPanel,
  VotesModuleConfigPanel,
  PayableTokenModuleConfigPanel,
  TemporaryApprovalModuleConfigPanel
} from '../../contracts/extensions';

import type {
  ERC20MasterConfig,
  ComplianceModuleConfig,
  VestingModuleConfig,
  DocumentModuleConfig,
  PolicyEngineConfig,
  FeeModuleConfig,
  FlashMintModuleConfig,
  PermitModuleConfig,
  SnapshotModuleConfig,
  TimelockModuleConfig,
  VotesModuleConfig,
  PayableTokenModuleConfig,
  TemporaryApprovalModuleConfig
} from '../../contracts/types';

interface ERC20PropertiesTabProps {
  data: TokenERC20PropertiesData | TokenERC20PropertiesData[];
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

export const ERC20PropertiesTab: React.FC<ERC20PropertiesTabProps> = ({
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
  const [masterConfig, setMasterConfig] = useState<ERC20MasterConfig>({
    name: propertiesData.name || '',
    symbol: propertiesData.symbol || '',
    maxSupply: propertiesData.cap || '0',
    initialSupply: propertiesData.initial_supply || '0',
    owner: propertiesData.initial_owner || ''
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

  const [feeConfig, setFeeConfig] = useState<FeeModuleConfig>({
    enabled: !!propertiesData.fees_module_address,
    transferFeeBps: 0,
    feeRecipient: ''
  });

  const [flashMintConfig, setFlashMintConfig] = useState<FlashMintModuleConfig>({
    enabled: !!propertiesData.flash_mint_module_address
  });

  const [permitConfig, setPermitConfig] = useState<PermitModuleConfig>({
    enabled: !!propertiesData.permit_module_address
  });

  const [snapshotConfig, setSnapshotConfig] = useState<SnapshotModuleConfig>({
    enabled: !!propertiesData.snapshot_module_address
  });

  const [timelockConfig, setTimelockConfig] = useState<TimelockModuleConfig>({
    enabled: !!propertiesData.timelock_module_address,
    minDelay: 0
  });

  const [votesConfig, setVotesConfig] = useState<VotesModuleConfig>({
    enabled: !!propertiesData.votes_module_address
  });

  const [payableTokenConfig, setPayableTokenConfig] = useState<PayableTokenModuleConfig>({
    enabled: !!propertiesData.payable_token_module_address
  });

  const [temporaryApprovalConfig, setTemporaryApprovalConfig] = useState<TemporaryApprovalModuleConfig>({
    enabled: !!propertiesData.temporary_approval_module_address,
    defaultDuration: 3600
  });

  // Handler for master config changes
  const handleMasterConfigChange = (newConfig: ERC20MasterConfig) => {
    setMasterConfig(newConfig);
    // Update underlying data fields
    handleFieldChange('name', newConfig.name);
    handleFieldChange('symbol', newConfig.symbol);
    handleFieldChange('cap', newConfig.maxSupply);
    handleFieldChange('initial_supply', newConfig.initialSupply);
    handleFieldChange('initial_owner', newConfig.owner);
  };

  // Count enabled modules
  const enabledModulesCount = [
    complianceConfig.enabled,
    vestingConfig.enabled,
    documentConfig.enabled,
    policyEngineConfig.enabled,
    feeConfig.enabled,
    flashMintConfig.enabled,
    permitConfig.enabled,
    snapshotConfig.enabled,
    timelockConfig.enabled,
    votesConfig.enabled,
    payableTokenConfig.enabled,
    temporaryApprovalConfig.enabled
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
              <CardTitle>ERC20 Token Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <ERC20MasterConfigPanel
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

          {/* ERC20-Specific Modules */}
          <Card>
            <CardHeader>
              <CardTitle>ERC20-Specific Modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Extensions designed specifically for fungible tokens
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <FeeModuleConfigPanel
                config={feeConfig}
                onChange={setFeeConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <FlashMintModuleConfigPanel
                config={flashMintConfig}
                onChange={setFlashMintConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <PermitModuleConfigPanel
                config={permitConfig}
                onChange={setPermitConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <SnapshotModuleConfigPanel
                config={snapshotConfig}
                onChange={setSnapshotConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <TimelockModuleConfigPanel
                config={timelockConfig}
                onChange={setTimelockConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <VotesModuleConfigPanel
                config={votesConfig}
                onChange={setVotesConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <PayableTokenModuleConfigPanel
                config={payableTokenConfig}
                onChange={setPayableTokenConfig}
                disabled={isSubmitting}
              />
              <Separator />
              <TemporaryApprovalModuleConfigPanel
                config={temporaryApprovalConfig}
                onChange={setTemporaryApprovalConfig}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ERC-20 Properties:</span>
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

export default ERC20PropertiesTab;

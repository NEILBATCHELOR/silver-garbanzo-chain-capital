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
  PolicyEngineModuleConfig,
  FeeModuleConfig,
  FlashMintModuleConfig,
  PermitModuleConfig,
  SnapshotModuleConfig,
  TimelockModuleConfig,
  VotesModuleConfig,
  PayableTokenModuleConfig,
  TemporaryApprovalModuleConfig
} from '../../contracts/types';

import { TokensTableData } from '../../types';

interface ERC20PropertiesTabProps {
  data: TokenERC20PropertiesData | TokenERC20PropertiesData[];
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

export const ERC20PropertiesTab: React.FC<ERC20PropertiesTabProps> = ({
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
  const [masterConfig, setMasterConfig] = useState<ERC20MasterConfig>({
    name: tokenTableData.name || '',
    symbol: tokenTableData.symbol || '',
    maxSupply: propertiesData.cap || '0',
    initialSupply: propertiesData.initial_supply || '0',
    owner: propertiesData.initial_owner || ''
  });

  // ✅ FIX: Update masterConfig when data loads asynchronously
  React.useEffect(() => {
    setMasterConfig({
      name: tokenTableData.name || '',
      symbol: tokenTableData.symbol || '',
      maxSupply: propertiesData.cap || '0',
      initialSupply: propertiesData.initial_supply || '0',
      owner: propertiesData.initial_owner || ''
    });
  }, [tokenTableData.name, tokenTableData.symbol, propertiesData.cap, propertiesData.initial_supply, propertiesData.initial_owner]);

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
    handleFieldChange('policy_engine_config', config);
  };

  const [feeConfig, setFeeConfigState] = useState<FeeModuleConfig>(() => {
    const saved = propertiesData.fees_config as any;
    return saved || {
      enabled: !!propertiesData.fees_module_address,
      transferFeeBps: 0,
      feeRecipient: ''
    };
  });
  const setFeeConfig = (config: FeeModuleConfig) => {
    setFeeConfigState(config);
    handleFieldChange('fees_config', config);
  };

  const [flashMintConfig, setFlashMintConfigState] = useState<FlashMintModuleConfig>(() => {
    const saved = propertiesData.flash_mint_config as any;
    return saved || {
      enabled: !!propertiesData.flash_mint_module_address
    };
  });
  const setFlashMintConfig = (config: FlashMintModuleConfig) => {
    setFlashMintConfigState(config);
    handleFieldChange('flash_mint_config', config);
  };

  const [permitConfig, setPermitConfigState] = useState<PermitModuleConfig>(() => {
    const saved = propertiesData.permit_config as any;
    return saved || {
      enabled: !!propertiesData.permit_module_address
    };
  });
  const setPermitConfig = (config: PermitModuleConfig) => {
    setPermitConfigState(config);
    handleFieldChange('permit_config', config);
  };

  const [snapshotConfig, setSnapshotConfigState] = useState<SnapshotModuleConfig>(() => {
    const saved = propertiesData.snapshot_config as any;
    return saved || {
      enabled: !!propertiesData.snapshot_module_address
    };
  });
  const setSnapshotConfig = (config: SnapshotModuleConfig) => {
    setSnapshotConfigState(config);
    handleFieldChange('snapshot_config', config);
  };

  const [timelockConfig, setTimelockConfigState] = useState<TimelockModuleConfig>(() => {
    const saved = propertiesData.timelock_config as any;
    return saved || {
      enabled: !!propertiesData.timelock_module_address
    };
  });
  const setTimelockConfig = (config: TimelockModuleConfig) => {
    setTimelockConfigState(config);
    handleFieldChange('timelock_config', config);
  };

  const [votesConfig, setVotesConfigState] = useState<VotesModuleConfig>(() => {
    const saved = propertiesData.votes_config as any;
    return saved || {
      enabled: !!propertiesData.votes_module_address
    };
  });
  const setVotesConfig = (config: VotesModuleConfig) => {
    setVotesConfigState(config);
    handleFieldChange('votes_config', config);
  };

  const [payableTokenConfig, setPayableTokenConfigState] = useState<PayableTokenModuleConfig>(() => {
    const saved = propertiesData.payable_token_config as any;
    return saved || {
      enabled: !!propertiesData.payable_token_module_address
    };
  });
  const setPayableTokenConfig = (config: PayableTokenModuleConfig) => {
    setPayableTokenConfigState(config);
    handleFieldChange('payable_token_config', config);
  };

  const [temporaryApprovalConfig, setTemporaryApprovalConfigState] = useState<TemporaryApprovalModuleConfig>(() => {
    const saved = propertiesData.temporary_approval_config as any;
    return saved || {
      enabled: !!propertiesData.temporary_approval_module_address,
      defaultDuration: 3600
    };
  });
  const setTemporaryApprovalConfig = (config: TemporaryApprovalModuleConfig) => {
    setTemporaryApprovalConfigState(config);
    handleFieldChange('temporary_approval_config', config);
  };

  // ✅ FIX: Update module configs when data loads asynchronously from JSONB fields
  React.useEffect(() => {
    const saved = propertiesData.compliance_config as any;
    if (saved) {
      setComplianceConfigState(saved);
    }
  }, [propertiesData.compliance_config]);

  React.useEffect(() => {
    const saved = propertiesData.vesting_config as any;
    if (saved) {
      setVestingConfigState(saved);
    }
  }, [propertiesData.vesting_config]);

  React.useEffect(() => {
    const saved = propertiesData.document_config as any;
    if (saved) {
      setDocumentConfigState(saved);
    }
  }, [propertiesData.document_config]);

  React.useEffect(() => {
    const saved = propertiesData.policy_engine_config as any;
    if (saved) {
      setPolicyEngineConfigState(saved);
    }
  }, [propertiesData.policy_engine_config]);

  React.useEffect(() => {
    const saved = propertiesData.fees_config as any;
    if (saved) {
      setFeeConfigState(saved);
    }
  }, [propertiesData.fees_config]);

  React.useEffect(() => {
    const saved = propertiesData.flash_mint_config as any;
    if (saved) {
      setFlashMintConfigState(saved);
    }
  }, [propertiesData.flash_mint_config]);

  React.useEffect(() => {
    const saved = propertiesData.permit_config as any;
    if (saved) {
      setPermitConfigState(saved);
    }
  }, [propertiesData.permit_config]);

  React.useEffect(() => {
    const saved = propertiesData.snapshot_config as any;
    if (saved) {
      setSnapshotConfigState(saved);
    }
  }, [propertiesData.snapshot_config]);

  React.useEffect(() => {
    const saved = propertiesData.timelock_config as any;
    if (saved) {
      setTimelockConfigState(saved);
    }
  }, [propertiesData.timelock_config]);

  React.useEffect(() => {
    const saved = propertiesData.votes_config as any;
    if (saved) {
      setVotesConfigState(saved);
    }
  }, [propertiesData.votes_config]);

  React.useEffect(() => {
    const saved = propertiesData.payable_token_config as any;
    if (saved) {
      setPayableTokenConfigState(saved);
    }
  }, [propertiesData.payable_token_config]);

  React.useEffect(() => {
    const saved = propertiesData.temporary_approval_config as any;
    if (saved) {
      setTemporaryApprovalConfigState(saved);
    }
  }, [propertiesData.temporary_approval_config]);

  // Handler for master config changes
  // ✅ FIX: Do NOT try to update name/symbol here - they belong to tokens table, not properties table
  // Name and symbol should only be edited in Basic Info tab
  const handleMasterConfigChange = (newConfig: ERC20MasterConfig) => {
    setMasterConfig(newConfig);
    // Only update fields that belong to token_erc20_properties table
    handleFieldChange('cap', newConfig.maxSupply);
    handleFieldChange('initial_supply', newConfig.initialSupply);
    handleFieldChange('initial_owner', newConfig.owner);
    // NOTE: name and symbol are read-only here and must be edited in Basic Info tab
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

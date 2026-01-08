/**
 * Extension Modules Section Component
 * Reusable component for selecting and configuring extension modules during token deployment
 * 
 * @description This component renders a collapsible accordion with all available extension
 * modules organized by category (Universal, ERC20-specific, etc.). Each module can be
 * enabled/disabled and configured before token deployment.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Puzzle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Universal Module Config Panels
import {
  ComplianceModuleConfigPanel,
  VestingModuleConfigPanel,
  DocumentModuleConfigPanel,
  PolicyEngineConfigPanel,
} from '@/components/tokens/forms-comprehensive/contracts/extensions';

// ERC20 Module Config Panels
import {
  FeeModuleConfigPanel,
  FlashMintModuleConfigPanel,
  PermitModuleConfigPanel,
  SnapshotModuleConfigPanel,
  TimelockModuleConfigPanel,
  VotesModuleConfigPanel,
  PayableTokenModuleConfigPanel,
  TemporaryApprovalModuleConfigPanel,
} from '@/components/tokens/forms-comprehensive/contracts/extensions';

// Module Config Types
import type {
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
  TemporaryApprovalModuleConfig,
} from '@/components/tokens/forms-comprehensive/contracts/types';

// ============ Types ============

export interface ExtensionModuleConfigs {
  // Universal modules
  compliance: ComplianceModuleConfig;
  vesting: VestingModuleConfig;
  document: DocumentModuleConfig;
  policyEngine: PolicyEngineModuleConfig;
  
  // ERC20 modules
  fees: FeeModuleConfig;
  flashMint: FlashMintModuleConfig;
  permit: PermitModuleConfig;
  snapshot: SnapshotModuleConfig;
  timelock: TimelockModuleConfig;
  votes: VotesModuleConfig;
  payableToken: PayableTokenModuleConfig;
  temporaryApproval: TemporaryApprovalModuleConfig;
}

export interface ExtensionModulesSectionProps {
  tokenStandard: string;
  configs: ExtensionModuleConfigs;
  onConfigChange: <K extends keyof ExtensionModuleConfigs>(
    moduleKey: K,
    config: ExtensionModuleConfigs[K]
  ) => void;
  disabled?: boolean;
}

// ============ Default Configs ============

export const getDefaultModuleConfigs = (): ExtensionModuleConfigs => ({
  // Universal modules
  compliance: {
    enabled: false,
    complianceLevel: 1,
    maxHoldersPerJurisdiction: 0,
    kycRequired: false,
    whitelistRequired: false,
    restrictedCountries: [],
    whitelistAddresses: [],
  },
  vesting: {
    enabled: false,
    schedules: [],
  },
  document: {
    enabled: false,
    documents: [],
  },
  policyEngine: {
    enabled: false,
    rules: [],
    validators: [],
  },
  
  // ERC20 modules
  fees: {
    enabled: false,
    transferFeeBps: 0,
    feeRecipient: '',
  },
  flashMint: {
    enabled: false,
  },
  permit: {
    enabled: false,
    name: '',
    version: '1',
  },
  snapshot: {
    enabled: false,
    automaticSnapshots: false,
    snapshotInterval: 0,
  },
  timelock: {
    enabled: false,
    minLockDuration: 0,
    maxLockDuration: 0,
  },
  votes: {
    enabled: false,
    votingDelay: 0,
    votingPeriod: 50400,
    proposalThreshold: '0',
    quorumPercentage: 4,
  },
  payableToken: {
    enabled: false,
    callbackGasLimit: 100000, // Default gas limit for callback executions
  },
  temporaryApproval: {
    enabled: false,
    defaultDuration: 3600,
  },
});

// ============ Helper: Count Enabled Modules ============

export const countEnabledModules = (configs: ExtensionModuleConfigs): number => {
  return Object.values(configs).filter((config: any) => config?.enabled).length;
};

// ============ Helper: Extract Enabled Module Configs for Backend ============

export const extractEnabledModuleConfigs = (configs: ExtensionModuleConfigs): Record<string, any> => {
  const enabledModules: Record<string, any> = {};
  
  // Universal modules
  if (configs.compliance.enabled) {
    enabledModules.compliance_enabled = true;
    enabledModules.compliance_config = configs.compliance;
  }
  
  if (configs.vesting.enabled) {
    enabledModules.vesting_enabled = true;
    enabledModules.vesting_config = configs.vesting;
  }
  
  if (configs.document.enabled) {
    enabledModules.document_enabled = true;
    enabledModules.document_config = configs.document;
  }
  
  if (configs.policyEngine.enabled) {
    enabledModules.policy_engine_enabled = true;
    enabledModules.policyEngine_config = configs.policyEngine;
  }
  
  // ERC20 modules
  if (configs.fees.enabled) {
    enabledModules.fees_enabled = true;
    enabledModules.fees_config = configs.fees; // ✅ FIX: Use new format for proper module deployment
  }
  
  if (configs.flashMint.enabled) {
    enabledModules.flash_mint = true;
  }
  
  if (configs.permit.enabled) {
    enabledModules.permit = true;
  }
  
  if (configs.snapshot.enabled) {
    enabledModules.snapshot = true;
    enabledModules.snapshot_config = configs.snapshot;
  }
  
  if (configs.timelock.enabled) {
    enabledModules.timelock = true;
    enabledModules.timelock_config = configs.timelock;
  }
  
  if (configs.votes.enabled) {
    enabledModules.votes = true;
  }
  
  if (configs.payableToken.enabled) {
    enabledModules.payable_token = true;
  }
  
  if (configs.temporaryApproval.enabled) {
    enabledModules.temporary_approval = true;
    enabledModules.temporary_approval_config = configs.temporaryApproval;
  }
  
  return enabledModules;
};

// ============ Component ============

export const ExtensionModulesSection: React.FC<ExtensionModulesSectionProps> = ({
  tokenStandard,
  configs,
  onConfigChange,
  disabled = false,
}) => {
  const enabledCount = countEnabledModules(configs);
  const isERC20 = tokenStandard === 'ERC-20' || tokenStandard === 'ERC20';
  
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Extension Modules
          </div>
          <Badge variant={enabledCount > 0 ? "default" : "outline"}>
            {enabledCount} selected
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure extension modules to add advanced features to your token.
          Modules will be deployed as separate contracts and attached to your token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {/* ========== UNIVERSAL MODULES ========== */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              Universal Modules (All Standards)
            </h4>
          </div>
          
          {/* Compliance Module */}
          <AccordionItem value="compliance" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <span>Compliance Module</span>
                {configs.compliance.enabled && (
                  <Badge variant="secondary" className="text-xs">Enabled</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ComplianceModuleConfigPanel
                config={configs.compliance}
                onChange={(config) => onConfigChange('compliance', config)}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* Vesting Module */}
          <AccordionItem value="vesting" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <span>Vesting Module</span>
                {configs.vesting.enabled && (
                  <Badge variant="secondary" className="text-xs">Enabled</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <VestingModuleConfigPanel
                config={configs.vesting}
                onChange={(config) => onConfigChange('vesting', config)}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* Document Module */}
          <AccordionItem value="document" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <span>Document Module</span>
                {configs.document.enabled && (
                  <Badge variant="secondary" className="text-xs">Enabled</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <DocumentModuleConfigPanel
                config={configs.document}
                onChange={(config) => onConfigChange('document', config)}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* Policy Engine Module */}
          <AccordionItem value="policyEngine" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <span>Policy Engine Module</span>
                {configs.policyEngine.enabled && (
                  <Badge variant="secondary" className="text-xs">Enabled</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <PolicyEngineConfigPanel
                config={configs.policyEngine}
                onChange={(config) => onConfigChange('policyEngine', config)}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* ========== ERC20-SPECIFIC MODULES ========== */}
          {isERC20 && (
            <>
              <div className="mt-6 mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  ERC20-Specific Modules
                </h4>
              </div>
              
              {/* Fees Module */}
              <AccordionItem value="fees" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Fee Module</span>
                    {configs.fees.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <FeeModuleConfigPanel
                    config={configs.fees}
                    onChange={(config) => onConfigChange('fees', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Flash Mint Module */}
              <AccordionItem value="flashMint" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Flash Mint Module</span>
                    {configs.flashMint.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <FlashMintModuleConfigPanel
                    config={configs.flashMint}
                    onChange={(config) => onConfigChange('flashMint', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Permit Module */}
              <AccordionItem value="permit" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Permit Module (EIP-2612)</span>
                    {configs.permit.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <PermitModuleConfigPanel
                    config={configs.permit}
                    onChange={(config) => onConfigChange('permit', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Snapshot Module */}
              <AccordionItem value="snapshot" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Snapshot Module</span>
                    {configs.snapshot.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <SnapshotModuleConfigPanel
                    config={configs.snapshot}
                    onChange={(config) => onConfigChange('snapshot', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Timelock Module */}
              <AccordionItem value="timelock" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Timelock Module</span>
                    {configs.timelock.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <TimelockModuleConfigPanel
                    config={configs.timelock}
                    onChange={(config) => onConfigChange('timelock', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Votes Module */}
              <AccordionItem value="votes" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Votes Module</span>
                    {configs.votes.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <VotesModuleConfigPanel
                    config={configs.votes}
                    onChange={(config) => onConfigChange('votes', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Payable Token Module */}
              <AccordionItem value="payableToken" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Payable Token Module (ERC1363)</span>
                    {configs.payableToken.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <PayableTokenModuleConfigPanel
                    config={configs.payableToken}
                    onChange={(config) => onConfigChange('payableToken', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Temporary Approval Module */}
              <AccordionItem value="temporaryApproval" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Temporary Approval Module</span>
                    {configs.temporaryApproval.enabled && (
                      <Badge variant="secondary" className="text-xs">Enabled</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <TemporaryApprovalModuleConfigPanel
                    config={configs.temporaryApproval}
                    onChange={(config) => onConfigChange('temporaryApproval', config)}
                    disabled={disabled}
                  />
                </AccordionContent>
              </AccordionItem>
            </>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default ExtensionModulesSection;

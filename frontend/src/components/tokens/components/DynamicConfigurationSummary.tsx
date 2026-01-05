/**
 * Dynamic Configuration Summary Component
 * Displays a comprehensive summary of token configuration and selected extension modules
 * for review before deployment.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Info, CheckCircle, Shield, FileText, Clock, Zap, Users, Coins } from 'lucide-react';
import type { ExtensionModuleConfigs } from './ExtensionModulesSection';
import type { TokenConfig } from './TokenDeploymentFormProjectWalletIntegrated';
import type { NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import type { GasConfiguration } from '@/hooks/useGasEstimation';

interface DynamicConfigurationSummaryProps {
  tokenConfig: TokenConfig;
  blockchain: string;
  environment: NetworkEnvironment;
  moduleConfigs: ExtensionModuleConfigs;
  gasConfig: GasConfiguration;
  optimizationEnabled: boolean;
}

export const DynamicConfigurationSummary: React.FC<DynamicConfigurationSummaryProps> = ({
  tokenConfig,
  blockchain,
  environment,
  moduleConfigs,
  gasConfig,
  optimizationEnabled,
}) => {
  // Count enabled modules
  const enabledModules = Object.entries(moduleConfigs)
    .filter(([_, config]: [string, any]) => config?.enabled)
    .map(([key]) => key);
  
  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Token Configuration Summary
        </CardTitle>
        <CardDescription>
          Review your complete token configuration before deployment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Master Contract Configuration */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Master Contract
              <Badge variant="outline">{tokenConfig.standard || 'ERC-20'}</Badge>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm bg-white dark:bg-gray-900 p-3 rounded-lg border">
              <div className="text-muted-foreground">Name:</div>
              <div className="font-medium">{tokenConfig.name || 'Not set'}</div>
              
              <div className="text-muted-foreground">Symbol:</div>
              <div className="font-medium">{tokenConfig.symbol || 'Not set'}</div>
              
              <div className="text-muted-foreground">Decimals:</div>
              <div className="font-medium">{tokenConfig.decimals || 18}</div>
              
              <div className="text-muted-foreground">Total Supply:</div>
              <div className="font-medium">{tokenConfig.totalSupply || '0'}</div>
              
              {tokenConfig.features && (
                <>
                  <div className="text-muted-foreground">Features:</div>
                  <div className="flex flex-wrap gap-1">
                    {tokenConfig.features.isBurnable && <Badge variant="secondary" className="text-xs">Burnable</Badge>}
                    {tokenConfig.features.isMintable && <Badge variant="secondary" className="text-xs">Mintable</Badge>}
                    {tokenConfig.features.isPausable && <Badge variant="secondary" className="text-xs">Pausable</Badge>}
                    {tokenConfig.features.isUpgradeable && <Badge variant="secondary" className="text-xs">Upgradeable</Badge>}
                    {!tokenConfig.features.isBurnable && !tokenConfig.features.isMintable && 
                     !tokenConfig.features.isPausable && !tokenConfig.features.isUpgradeable && (
                      <span className="text-muted-foreground">Standard</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Extension Modules Summary */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              Extension Modules
              <Badge variant={enabledModules.length > 0 ? "default" : "outline"}>
                {enabledModules.length} enabled
              </Badge>
            </h4>
            
            <div className="space-y-3">
              {/* Compliance Module */}
              {moduleConfigs.compliance.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      Compliance Module
                    </span>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {moduleConfigs.compliance.kycRequired && <div>• KYC Required</div>}
                    {moduleConfigs.compliance.whitelistRequired && <div>• Whitelist Required</div>}
                    {moduleConfigs.compliance.accreditedInvestorOnly && <div>• Accredited Investors Only</div>}
                    {(moduleConfigs.compliance.restrictedCountries?.length ?? 0) > 0 && (
                      <div>• {moduleConfigs.compliance.restrictedCountries?.length} countries restricted</div>
                    )}
                    {(moduleConfigs.compliance.whitelistAddresses?.length ?? 0) > 0 && (
                      <div>• {moduleConfigs.compliance.whitelistAddresses?.length} addresses whitelisted</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Vesting Module */}
              {moduleConfigs.vesting.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Vesting Module
                    </span>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(moduleConfigs.vesting.schedules?.length ?? 0) > 0 ? (
                      <div>• {moduleConfigs.vesting.schedules?.length} vesting schedule(s) configured</div>
                    ) : (
                      <div>• No schedules configured yet</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Document Module */}
              {moduleConfigs.document.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Document Module
                    </span>
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(moduleConfigs.document.documents?.length ?? 0) > 0 ? (
                      <div>• {moduleConfigs.document.documents?.length} document(s) attached</div>
                    ) : (
                      <div>• No documents attached yet</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Policy Engine Module */}
              {moduleConfigs.policyEngine.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      Policy Engine Module
                    </span>
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(moduleConfigs.policyEngine.rules?.length ?? 0) > 0 ? (
                      <div>• {moduleConfigs.policyEngine.rules?.length} policy rule(s) configured</div>
                    ) : (
                      <div>• No policy rules configured yet</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Fees Module */}
              {moduleConfigs.fees.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Coins className="h-4 w-4 text-yellow-600" />
                      Fee Module
                    </span>
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>• Transfer Fee: {moduleConfigs.fees.transferFeeBps / 100}%</div>
                    {moduleConfigs.fees.feeRecipient && (
                      <div>• Recipient: {moduleConfigs.fees.feeRecipient.slice(0, 10)}...</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Flash Mint Module */}
              {moduleConfigs.flashMint.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-600" />
                      Flash Mint Module
                    </span>
                    <Badge variant="secondary" className="text-xs">Enabled</Badge>
                  </div>
                </div>
              )}
              
              {/* Permit Module */}
              {moduleConfigs.permit.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Permit Module (EIP-2612)</span>
                    <Badge variant="secondary" className="text-xs">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    • Gasless approvals enabled
                  </div>
                </div>
              )}
              
              {/* Snapshot Module */}
              {moduleConfigs.snapshot.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Snapshot Module</span>
                    <Badge variant="secondary" className="text-xs">Enabled</Badge>
                  </div>
                  {moduleConfigs.snapshot.automaticSnapshots && (
                    <div className="text-sm text-muted-foreground">
                      • Auto-snapshot interval: {moduleConfigs.snapshot.snapshotInterval}s
                    </div>
                  )}
                </div>
              )}
              
              {/* Timelock Module */}
              {moduleConfigs.timelock.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timelock Module
                    </span>
                    <Badge variant="secondary" className="text-xs">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>• Min Lock Duration: {moduleConfigs.timelock.minLockDuration}s</div>
                    <div>• Max Lock Duration: {moduleConfigs.timelock.maxLockDuration}s</div>
                  </div>
                </div>
              )}
              
              {/* Votes Module */}
              {moduleConfigs.votes.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Votes Module</span>
                    <Badge variant="secondary" className="text-xs">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    • Governance voting enabled
                  </div>
                </div>
              )}
              
              {/* Payable Token Module */}
              {moduleConfigs.payableToken.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Payable Token (ERC1363)</span>
                    <Badge variant="secondary" className="text-xs">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    • Transfer callbacks enabled
                  </div>
                </div>
              )}
              
              {/* Temporary Approval Module */}
              {moduleConfigs.temporaryApproval.enabled && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Temporary Approval Module</span>
                    <Badge variant="secondary" className="text-xs">Enabled</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    • Default Duration: {moduleConfigs.temporaryApproval.defaultDuration}s
                  </div>
                </div>
              )}
              
              {/* No modules message */}
              {enabledModules.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <CheckCircle className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                  No extension modules enabled - deploying base token only
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicConfigurationSummary;

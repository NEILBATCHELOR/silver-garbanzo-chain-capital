import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TokenERC4626Properties } from '@/types/core/centralModels';

// Import our new UI components
import { SwitchField } from "./ui";

interface ERC4626BaseFormProps {
  config: Partial<TokenERC4626Properties>;
  onChange: (config: Partial<TokenERC4626Properties>) => void;
}

/**
 * Base form for ERC-4626 Vault Token properties
 * Covers the main vault configuration from token_erc4626_properties table
 */
const ERC4626BaseForm: React.FC<ERC4626BaseFormProps> = ({ config, onChange }) => {
  const [localConfig, setLocalConfig] = useState<Partial<TokenERC4626Properties>>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (field: keyof TokenERC4626Properties, value: any) => {
    const updatedConfig = { ...localConfig, [field]: value };
    setLocalConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const handleNumberChange = (field: keyof TokenERC4626Properties, value: string) => {
    const numericValue = value === '' ? undefined : parseInt(value);
    handleChange(field, numericValue);
  };

  const handleBooleanChange = (field: keyof TokenERC4626Properties, value: boolean) => {
    handleChange(field, value);
  };

  return (
    <div className="space-y-6">
      {/* Asset Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Underlying Asset Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetAddress" className="flex items-center">
                Asset Address *
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">Address of the underlying ERC-20 token that this vault will manage</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="assetAddress"
                value={localConfig.assetAddress || ''}
                onChange={(e) => handleChange('assetAddress', e.target.value)}
                placeholder="0x..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetName">Asset Name</Label>
              <Input
                id="assetName"
                value={localConfig.assetName || ''}
                onChange={(e) => handleChange('assetName', e.target.value)}
                placeholder="e.g., USDC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetSymbol">Asset Symbol</Label>
              <Input
                id="assetSymbol"
                value={localConfig.assetSymbol || ''}
                onChange={(e) => handleChange('assetSymbol', e.target.value)}
                placeholder="e.g., USDC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetDecimals">Asset Decimals</Label>
              <Input
                id="assetDecimals"
                type="number"
                min="0"
                max="18"
                value={localConfig.assetDecimals || 18}
                onChange={(e) => handleNumberChange('assetDecimals', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vault Type & Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Vault Strategy Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vaultType">Vault Type</Label>
              <Select value={localConfig.vaultType || 'yield'} onValueChange={(value) => handleChange('vaultType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vault type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yield">Yield</SelectItem>
                  <SelectItem value="lending">Lending</SelectItem>
                  <SelectItem value="staking">Staking</SelectItem>
                  <SelectItem value="liquidity">Liquidity</SelectItem>
                  <SelectItem value="farming">Farming</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vaultStrategy">Vault Strategy</Label>
              <Select value={localConfig.vaultStrategy || 'simple'} onValueChange={(value) => handleChange('vaultStrategy', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                  <SelectItem value="multi_asset">Multi-Asset</SelectItem>
                  <SelectItem value="diversified">Diversified</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategyComplexity">Strategy Complexity</Label>
              <Select value={localConfig.strategyComplexity || 'simple'} onValueChange={(value) => handleChange('strategyComplexity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yieldSource">Yield Source</Label>
              <Select value={localConfig.yieldSource || 'external'} onValueChange={(value) => handleChange('yieldSource', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select yield source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="defi_protocols">DeFi Protocols</SelectItem>
                  <SelectItem value="lending_pools">Lending Pools</SelectItem>
                  <SelectItem value="staking_rewards">Staking Rewards</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategyDocumentation">Strategy Documentation</Label>
            <Textarea
              id="strategyDocumentation"
              value={localConfig.strategyDocumentation || ''}
              onChange={(e) => handleChange('strategyDocumentation', e.target.value)}
              placeholder="Describe the vault's investment strategy..."
              rows={3}
            />
          </div>

          <SwitchField
            label="Custom Strategy"
            description="Enable custom strategy implementation"
            checked={localConfig.customStrategy || false}
            onCheckedChange={(checked) => handleBooleanChange('customStrategy', checked)}
          />

          {localConfig.customStrategy && (
            <div className="pl-6 space-y-2 border-l-2 border-primary/20">
              <Label htmlFor="strategyController">Strategy Controller Address</Label>
              <Input
                id="strategyController"
                value={localConfig.strategyController || ''}
                onChange={(e) => handleChange('strategyController', e.target.value)}
                placeholder="0x..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Control & Security */}
      <Card>
        <CardHeader>
          <CardTitle>Access Control & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accessControl">Access Control</Label>
              <Select value={localConfig.accessControl || 'ownable'} onValueChange={(value) => handleChange('accessControl', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select access control" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ownable">Ownable</SelectItem>
                  <SelectItem value="role_based">Role Based</SelectItem>
                  <SelectItem value="multisig">Multisig</SelectItem>
                  <SelectItem value="dao">DAO</SelectItem>
                  <SelectItem value="permissionless">Permissionless</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regulatoryFramework">Regulatory Framework</Label>
              <Select value={localConfig.regulatoryFramework || ''} onValueChange={(value) => handleChange('regulatoryFramework', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEC">SEC (US)</SelectItem>
                  <SelectItem value="MiFID">MiFID (EU)</SelectItem>
                  <SelectItem value="CFTC">CFTC (US)</SelectItem>
                  <SelectItem value="FCA">FCA (UK)</SelectItem>
                  <SelectItem value="ASIC">ASIC (AU)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-6">
            <SwitchField
              label="Mintable"
              description="Allow minting of new vault shares"
              checked={localConfig.isMintable || false}
              onCheckedChange={(checked) => handleBooleanChange('isMintable', checked)}
            />

            <SwitchField
              label="Burnable"
              description="Allow burning of vault shares"
              checked={localConfig.isBurnable || false}
              onCheckedChange={(checked) => handleBooleanChange('isBurnable', checked)}
            />

            <SwitchField
              label="Pausable"
              description="Allow pausing vault operations in emergencies"
              checked={localConfig.isPausable || false}
              onCheckedChange={(checked) => handleBooleanChange('isPausable', checked)}
            />

            <SwitchField
              label="Permit (EIP-2612)"
              description="Enable gasless approvals using signatures"
              checked={localConfig.permit || false}
              onCheckedChange={(checked) => handleBooleanChange('permit', checked)}
            />

            <SwitchField
              label="Flash Loans"
              description="Enable flash loan functionality"
              checked={localConfig.flashLoans || false}
              onCheckedChange={(checked) => handleBooleanChange('flashLoans', checked)}
            />

            <SwitchField
              label="Emergency Shutdown"
              description="Enable emergency shutdown capability"
              checked={localConfig.emergencyShutdown || false}
              onCheckedChange={(checked) => handleBooleanChange('emergencyShutdown', checked)}
            />

            <SwitchField
              label="Emergency Exit"
              description="Enable emergency exit for users"
              checked={localConfig.emergencyExitEnabled || false}
              onCheckedChange={(checked) => handleBooleanChange('emergencyExitEnabled', checked)}
            />

            <SwitchField
              label="Circuit Breaker"
              description="Enable automatic circuit breaker protection"
              checked={localConfig.circuitBreakerEnabled || false}
              onCheckedChange={(checked) => handleBooleanChange('circuitBreakerEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deposit & Withdrawal Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit & Withdrawal Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depositLimit">Total Deposit Limit</Label>
              <Input
                id="depositLimit"
                value={localConfig.depositLimit || ''}
                onChange={(e) => handleChange('depositLimit', e.target.value)}
                placeholder="0 for unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawalLimit">Total Withdrawal Limit</Label>
              <Input
                id="withdrawalLimit"
                value={localConfig.withdrawalLimit || ''}
                onChange={(e) => handleChange('withdrawalLimit', e.target.value)}
                placeholder="0 for unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minDeposit">Minimum Deposit</Label>
              <Input
                id="minDeposit"
                value={localConfig.minDeposit || ''}
                onChange={(e) => handleChange('minDeposit', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDeposit">Maximum Deposit</Label>
              <Input
                id="maxDeposit"
                value={localConfig.maxDeposit || ''}
                onChange={(e) => handleChange('maxDeposit', e.target.value)}
                placeholder="0 for unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minWithdrawal">Minimum Withdrawal</Label>
              <Input
                id="minWithdrawal"
                value={localConfig.minWithdrawal || ''}
                onChange={(e) => handleChange('minWithdrawal', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxWithdrawal">Maximum Withdrawal</Label>
              <Input
                id="maxWithdrawal"
                value={localConfig.maxWithdrawal || ''}
                onChange={(e) => handleChange('maxWithdrawal', e.target.value)}
                placeholder="0 for unlimited"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="riskTolerance">Risk Tolerance</Label>
              <Select value={localConfig.riskTolerance || ''} onValueChange={(value) => handleChange('riskTolerance', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk tolerance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="very_aggressive">Very Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="liquidityReserve">Liquidity Reserve (%)</Label>
              <Input
                id="liquidityReserve"
                value={localConfig.liquidityReserve || '10'}
                onChange={(e) => handleChange('liquidityReserve', e.target.value)}
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSlippage">Maximum Slippage (%)</Label>
              <Input
                id="maxSlippage"
                value={localConfig.maxSlippage || ''}
                onChange={(e) => handleChange('maxSlippage', e.target.value)}
                placeholder="0.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rebalanceThreshold">Rebalance Threshold (%)</Label>
              <Input
                id="rebalanceThreshold"
                value={localConfig.rebalanceThreshold || ''}
                onChange={(e) => handleChange('rebalanceThreshold', e.target.value)}
                placeholder="5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDrawdownThreshold">Max Drawdown Threshold (%)</Label>
              <Input
                id="maxDrawdownThreshold"
                value={localConfig.maxDrawdownThreshold || ''}
                onChange={(e) => handleChange('maxDrawdownThreshold', e.target.value)}
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLossThreshold">Stop Loss Threshold (%)</Label>
              <Input
                id="stopLossThreshold"
                value={localConfig.stopLossThreshold || ''}
                onChange={(e) => handleChange('stopLossThreshold', e.target.value)}
                placeholder="15"
              />
            </div>
          </div>

          <div className="space-y-6">
            <SwitchField
              label="Risk Management"
              description="Enable comprehensive risk management features"
              checked={localConfig.riskManagementEnabled || false}
              onCheckedChange={(checked) => handleBooleanChange('riskManagementEnabled', checked)}
            />

            <SwitchField
              label="Diversification"
              description="Enable automatic diversification strategies"
              checked={localConfig.diversificationEnabled || false}
              onCheckedChange={(checked) => handleBooleanChange('diversificationEnabled', checked)}
            />

            <SwitchField
              label="Stop Loss"
              description="Enable automatic stop loss protection"
              checked={localConfig.stopLossEnabled || false}
              onCheckedChange={(checked) => handleBooleanChange('stopLossEnabled', checked)}
            />

            <SwitchField
              label="Insurance"
              description="Enable insurance coverage for vault assets"
              checked={localConfig.insuranceEnabled || false}
              onCheckedChange={(checked) => handleBooleanChange('insuranceEnabled', checked)}
            />
          </div>

          {localConfig.insuranceEnabled && (
            <div className="pl-6 space-y-4 border-l-2 border-primary/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={localConfig.insuranceProvider || ''}
                    onChange={(e) => handleChange('insuranceProvider', e.target.value)}
                    placeholder="Insurance provider name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceCoverageAmount">Coverage Amount</Label>
                  <Input
                    id="insuranceCoverageAmount"
                    value={localConfig.insuranceCoverageAmount || ''}
                    onChange={(e) => handleChange('insuranceCoverageAmount', e.target.value)}
                    placeholder="1000000"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ERC4626BaseForm;
// ERC-4626 Properties Tab - Vault Token Properties
// Comprehensive properties for ERC-4626 vault tokens with 110+ fields

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Vault, TrendingUp, Shield, Settings, Coins, Vote, Zap } from 'lucide-react';
import { TokenERC4626PropertiesData, ConfigMode } from '../../types';
import { ModuleSelectionCard } from '../../ui/ModuleSelectionCard';

interface ERC4626PropertiesTabProps {
  data?: TokenERC4626PropertiesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
  network?: string;
  environment?: string;
}

const ERC4626PropertiesTab: React.FC<ERC4626PropertiesTabProps> = ({
  data = [{}],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false,
  network = 'hoodi',
  environment = 'testnet'
}) => {
  const properties = data[0] || {};
  const handleFieldChange = (field: string, value: any) => onFieldChange(field, value, 0);
  const getFieldError = (field: string) => validationErrors[`0.${field}`] || [];
  const hasFieldError = (field: string) => getFieldError(field).length > 0;

  if (configMode === 'min') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vault className="w-5 h-5" />
              Basic Vault Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="asset_address">Underlying Asset Address</Label>
                <Input
                  id="asset_address"
                  value={properties.asset_address || ''}
                  onChange={(e) => handleFieldChange('asset_address', e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div>
                <Label htmlFor="vault_type">Vault Type</Label>
                <Select 
                  value={properties.vault_type || 'yield_farming'} 
                  onValueChange={(value) => handleFieldChange('vault_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vault type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yield_farming">Yield Farming</SelectItem>
                    <SelectItem value="lending">Lending</SelectItem>
                    <SelectItem value="staking">Staking</SelectItem>
                    <SelectItem value="liquidity_mining">Liquidity Mining</SelectItem>
                    <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_burnable">Burnable</Label>
                <Switch
                  id="is_burnable"
                  checked={properties.is_burnable || false}
                  onCheckedChange={(checked) => handleFieldChange('is_burnable', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_pausable">Pausable</Label>
                <Switch
                  id="is_pausable"
                  checked={properties.is_pausable || false}
                  onCheckedChange={(checked) => handleFieldChange('is_pausable', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="automated_rebalancing">Auto Rebalancing</Label>
                <Switch
                  id="automated_rebalancing"
                  checked={properties.automated_rebalancing !== false}
                  onCheckedChange={(checked) => handleFieldChange('automated_rebalancing', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Advanced mode - organized by feature categories
  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Basic Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="asset_address">Underlying Asset Address</Label>
              <Input
                id="asset_address"
                value={properties.asset_address || ''}
                onChange={(e) => handleFieldChange('asset_address', e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div>
              <Label htmlFor="asset_name">Asset Name</Label>
              <Input
                id="asset_name"
                value={properties.asset_name || ''}
                onChange={(e) => handleFieldChange('asset_name', e.target.value)}
                placeholder="USD Coin"
              />
            </div>
            <div>
              <Label htmlFor="asset_symbol">Asset Symbol</Label>
              <Input
                id="asset_symbol"
                value={properties.asset_symbol || ''}
                onChange={(e) => handleFieldChange('asset_symbol', e.target.value)}
                placeholder="USDC"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="asset_decimals">Asset Decimals</Label>
              <Input
                id="asset_decimals"
                type="number"
                value={properties.asset_decimals || ''}
                onChange={(e) => handleFieldChange('asset_decimals', parseInt(e.target.value) || 18)}
                placeholder="18"
              />
            </div>
            <div>
              <Label htmlFor="vault_type">Vault Type</Label>
              <Select 
                value={properties.vault_type || 'yield_farming'} 
                onValueChange={(value) => handleFieldChange('vault_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vault type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yield_farming">Yield Farming</SelectItem>
                  <SelectItem value="lending">Lending</SelectItem>
                  <SelectItem value="staking">Staking</SelectItem>
                  <SelectItem value="liquidity_mining">Liquidity Mining</SelectItem>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  <SelectItem value="delta_neutral">Delta Neutral</SelectItem>
                  <SelectItem value="algorithmic">Algorithmic Trading</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="access_control">Access Control</Label>
              <Select 
                value={properties.access_control || 'public'} 
                onValueChange={(value) => handleFieldChange('access_control', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access control" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="whitelist">Whitelist Only</SelectItem>
                  <SelectItem value="kyc_required">KYC Required</SelectItem>
                  <SelectItem value="accredited_only">Accredited Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="w-5 h-5" />
            Core Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <Label>Mintable</Label>
              <Switch checked={properties.is_mintable !== false} onCheckedChange={(checked) => handleFieldChange('is_mintable', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Burnable</Label>
              <Switch checked={properties.is_burnable || false} onCheckedChange={(checked) => handleFieldChange('is_burnable', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Pausable</Label>
              <Switch checked={properties.is_pausable || false} onCheckedChange={(checked) => handleFieldChange('is_pausable', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Flash Loans</Label>
              <Switch checked={properties.flash_loans || false} onCheckedChange={(checked) => handleFieldChange('flash_loans', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Strategy Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="vault_strategy">Vault Strategy</Label>
              <Select 
                value={properties.vault_strategy || 'conservative'} 
                onValueChange={(value) => handleFieldChange('vault_strategy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="strategy_complexity">Strategy Complexity</Label>
              <Select 
                value={properties.strategy_complexity || 'simple'} 
                onValueChange={(value) => handleFieldChange('strategy_complexity', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="yield_source">Yield Source</Label>
              <Input
                id="yield_source"
                value={properties.yield_source || ''}
                onChange={(e) => handleFieldChange('yield_source', e.target.value)}
                placeholder="Compound, Aave, Uniswap"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>Custom Strategy</Label>
              <Switch checked={properties.custom_strategy || false} onCheckedChange={(checked) => handleFieldChange('custom_strategy', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Multi Asset</Label>
              <Switch checked={properties.multi_asset_enabled || false} onCheckedChange={(checked) => handleFieldChange('multi_asset_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Automated Rebalancing</Label>
              <Switch checked={properties.automated_rebalancing !== false} onCheckedChange={(checked) => handleFieldChange('automated_rebalancing', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Fee Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deposit_fee">Deposit Fee (%)</Label>
              <Input
                id="deposit_fee"
                value={properties.deposit_fee || ''}
                onChange={(e) => handleFieldChange('deposit_fee', e.target.value)}
                placeholder="0.1"
              />
            </div>
            <div>
              <Label htmlFor="withdrawal_fee">Withdrawal Fee (%)</Label>
              <Input
                id="withdrawal_fee"
                value={properties.withdrawal_fee || ''}
                onChange={(e) => handleFieldChange('withdrawal_fee', e.target.value)}
                placeholder="0.1"
              />
            </div>
            <div>
              <Label htmlFor="management_fee">Management Fee (%)</Label>
              <Input
                id="management_fee"
                value={properties.management_fee || ''}
                onChange={(e) => handleFieldChange('management_fee', e.target.value)}
                placeholder="2.0"
              />
            </div>
            <div>
              <Label htmlFor="performance_fee">Performance Fee (%)</Label>
              <Input
                id="performance_fee"
                value={properties.performance_fee || ''}
                onChange={(e) => handleFieldChange('performance_fee', e.target.value)}
                placeholder="20.0"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>Dynamic Fees</Label>
              <Switch checked={properties.dynamic_fees_enabled || false} onCheckedChange={(checked) => handleFieldChange('dynamic_fees_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Fee Tier System</Label>
              <Switch checked={properties.fee_tier_system_enabled || false} onCheckedChange={(checked) => handleFieldChange('fee_tier_system_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>High Water Mark</Label>
              <Switch checked={properties.performance_fee_high_water_mark || false} onCheckedChange={(checked) => handleFieldChange('performance_fee_high_water_mark', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
              <Select 
                value={properties.risk_tolerance || 'moderate'} 
                onValueChange={(value) => handleFieldChange('risk_tolerance', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select risk tolerance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very_high">Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max_drawdown_threshold">Max Drawdown (%)</Label>
              <Input
                id="max_drawdown_threshold"
                value={properties.max_drawdown_threshold || ''}
                onChange={(e) => handleFieldChange('max_drawdown_threshold', e.target.value)}
                placeholder="10.0"
              />
            </div>
            <div>
              <Label htmlFor="stop_loss_threshold">Stop Loss (%)</Label>
              <Input
                id="stop_loss_threshold"
                value={properties.stop_loss_threshold || ''}
                onChange={(e) => handleFieldChange('stop_loss_threshold', e.target.value)}
                placeholder="5.0"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <Label>Risk Management</Label>
              <Switch checked={properties.risk_management_enabled || false} onCheckedChange={(checked) => handleFieldChange('risk_management_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Emergency Exit</Label>
              <Switch checked={properties.emergency_exit_enabled || false} onCheckedChange={(checked) => handleFieldChange('emergency_exit_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Circuit Breaker</Label>
              <Switch checked={properties.circuit_breaker_enabled || false} onCheckedChange={(checked) => handleFieldChange('circuit_breaker_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Stop Loss</Label>
              <Switch checked={properties.stop_loss_enabled || false} onCheckedChange={(checked) => handleFieldChange('stop_loss_enabled', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Governance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>Governance Token</Label>
              <Switch checked={properties.governance_token_enabled || false} onCheckedChange={(checked) => handleFieldChange('governance_token_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Strategy Voting</Label>
              <Switch checked={properties.strategy_voting_enabled || false} onCheckedChange={(checked) => handleFieldChange('strategy_voting_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Fee Voting</Label>
              <Switch checked={properties.fee_voting_enabled || false} onCheckedChange={(checked) => handleFieldChange('fee_voting_enabled', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DeFi Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            DeFi Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <Label>Liquidity Mining</Label>
              <Switch checked={properties.liquidity_mining_enabled || false} onCheckedChange={(checked) => handleFieldChange('liquidity_mining_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Market Making</Label>
              <Switch checked={properties.market_making_enabled || false} onCheckedChange={(checked) => handleFieldChange('market_making_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Cross-Chain Yield</Label>
              <Switch checked={properties.cross_chain_yield_enabled || false} onCheckedChange={(checked) => handleFieldChange('cross_chain_yield_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Leverage</Label>
              <Switch checked={properties.leverage_enabled || false} onCheckedChange={(checked) => handleFieldChange('leverage_enabled', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🆕 Extension Modules */}
      <ModuleSelectionCard
        network={network}
        tokenStandard="erc4626"
        environment={environment}
        onChange={(selection) => handleFieldChange('moduleSelection', selection)}
        disabled={isSubmitting}
      />

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">
            ERC-4626 Vault Properties Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate
        </Button>
      </div>
    </div>
  );
};

export default ERC4626PropertiesTab;
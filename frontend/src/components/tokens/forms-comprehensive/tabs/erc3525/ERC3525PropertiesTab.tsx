// ERC-3525 Properties Tab - Semi-Fungible Token Properties
// Comprehensive properties for ERC-3525 tokens with 100+ fields

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Layers, Settings, TrendingUp, Shield, Coins, Vote } from 'lucide-react';
import { TokenERC3525PropertiesData, ConfigMode } from '../../types';
import { ProjectWalletSelector } from '../../../ui/ProjectWalletSelector';

interface ERC3525PropertiesTabProps {
  data?: TokenERC3525PropertiesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  projectId: string; // ✅ NEW PROP - Required for wallet loading
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
  network?: string;
  environment?: string;
}

const ERC3525PropertiesTab: React.FC<ERC3525PropertiesTabProps> = ({
  data = [{}],
  validationErrors = {},
  isModified = false,
  configMode,
  projectId, // ✅ NEW DESTRUCTURE
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
        {/* Owner Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Owner Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectWalletSelector
              projectId={projectId}
              value={properties.initial_owner || ''}
              onChange={(address) => handleFieldChange('initial_owner', address)}
              label="Initial Owner"
              description="This wallet address will receive all roles (ADMIN, MINTER, PAUSER, UPGRADER) upon deployment"
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Basic Semi-Fungible Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="value_decimals">Value Decimals</Label>
                <Input
                  id="value_decimals"
                  type="number"
                  value={properties.value_decimals || ''}
                  onChange={(e) => handleFieldChange('value_decimals', parseInt(e.target.value) || 0)}
                  placeholder="18"
                />
              </div>
              <div>
                <Label htmlFor="slot_type">Slot Type</Label>
                <Select 
                  value={properties.slot_type || 'financial'} 
                  onValueChange={(value) => handleFieldChange('slot_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select slot type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial Instrument</SelectItem>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="commodity">Commodity</SelectItem>
                    <SelectItem value="collectible">Collectible</SelectItem>
                    <SelectItem value="utility">Utility Token</SelectItem>
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
                <Label htmlFor="value_transfers_enabled">Value Transfers</Label>
                <Switch
                  id="value_transfers_enabled"
                  checked={properties.value_transfers_enabled !== false}
                  onCheckedChange={(checked) => handleFieldChange('value_transfers_enabled', checked)}
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
      {/* Owner Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Owner Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectWalletSelector
            projectId={projectId}
            value={properties.initial_owner || ''}
            onChange={(address) => handleFieldChange('initial_owner', address)}
            label="Initial Owner"
            description="This wallet address will receive all roles (ADMIN, MINTER, PAUSER, UPGRADER) upon deployment"
            required
          />
        </CardContent>
      </Card>

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
              <Label htmlFor="value_decimals">Value Decimals</Label>
              <Input
                id="value_decimals"
                type="number"
                value={properties.value_decimals || ''}
                onChange={(e) => handleFieldChange('value_decimals', parseInt(e.target.value) || 0)}
                placeholder="18"
              />
            </div>
            <div>
              <Label htmlFor="base_uri">Base URI</Label>
              <Input
                id="base_uri"
                value={properties.base_uri || ''}
                onChange={(e) => handleFieldChange('base_uri', e.target.value)}
                placeholder="https://api.example.com/metadata/"
              />
            </div>
            <div>
              <Label htmlFor="metadata_storage">Metadata Storage</Label>
              <Select 
                value={properties.metadata_storage || 'ipfs'} 
                onValueChange={(value) => handleFieldChange('metadata_storage', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select storage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ipfs">IPFS</SelectItem>
                  <SelectItem value="arweave">Arweave</SelectItem>
                  <SelectItem value="centralized">Centralized</SelectItem>
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
            <Layers className="w-5 h-5" />
            Core Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <Label>Burnable</Label>
              <Switch checked={properties.is_burnable || false} onCheckedChange={(checked) => handleFieldChange('is_burnable', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Pausable</Label>
              <Switch checked={properties.is_pausable || false} onCheckedChange={(checked) => handleFieldChange('is_pausable', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Value Transfers</Label>
              <Switch checked={properties.value_transfers_enabled !== false} onCheckedChange={(checked) => handleFieldChange('value_transfers_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Slot Approvals</Label>
              <Switch checked={properties.slot_approvals || false} onCheckedChange={(checked) => handleFieldChange('slot_approvals', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Instruments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Financial Instruments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Financial Instrument Type</Label>
              <Select 
                value={properties.financial_instrument_type || 'bond'} 
                onValueChange={(value) => handleFieldChange('financial_instrument_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="derivative">Derivative</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="share">Share</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Principal Amount</Label>
              <Input value={properties.principal_amount || ''} onChange={(e) => handleFieldChange('principal_amount', e.target.value)} placeholder="1000000" />
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input value={properties.interest_rate || ''} onChange={(e) => handleFieldChange('interest_rate', e.target.value)} placeholder="5.5" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Maturity Date</Label>
              <Input type="datetime-local" value={properties.maturity_date?.slice(0, 16) || ''} onChange={(e) => handleFieldChange('maturity_date', e.target.value + ':00.000Z')} />
            </div>
            <div>
              <Label>Coupon Frequency</Label>
              <Select 
                value={properties.coupon_frequency || 'quarterly'} 
                onValueChange={(value) => handleFieldChange('coupon_frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading & Marketplace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trading & Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>Partial Value Trading</Label>
              <Switch checked={properties.partial_value_trading || false} onCheckedChange={(checked) => handleFieldChange('partial_value_trading', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Slot Marketplace</Label>
              <Switch checked={properties.slot_marketplace_enabled || false} onCheckedChange={(checked) => handleFieldChange('slot_marketplace_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Value Marketplace</Label>
              <Switch checked={properties.value_marketplace_enabled || false} onCheckedChange={(checked) => handleFieldChange('value_marketplace_enabled', checked)} />
            </div>
          </div>
          {properties.partial_value_trading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Minimum Trade Value</Label>
                <Input value={properties.minimum_trade_value || ''} onChange={(e) => handleFieldChange('minimum_trade_value', e.target.value)} placeholder="1.0" />
              </div>
              <div>
                <Label>Trading Fee (%)</Label>
                <Input value={properties.trading_fee_percentage || ''} onChange={(e) => handleFieldChange('trading_fee_percentage', e.target.value)} placeholder="0.5" />
              </div>
            </div>
          )}
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
              <Label>Slot Voting</Label>
              <Switch checked={properties.slot_voting_enabled || false} onCheckedChange={(checked) => handleFieldChange('slot_voting_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Value Weighted Voting</Label>
              <Switch checked={properties.value_weighted_voting || false} onCheckedChange={(checked) => handleFieldChange('value_weighted_voting', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Delegate Enabled</Label>
              <Switch checked={properties.delegate_enabled || false} onCheckedChange={(checked) => handleFieldChange('delegate_enabled', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label>Regulatory Compliance</Label>
              <Switch checked={properties.regulatory_compliance_enabled || false} onCheckedChange={(checked) => handleFieldChange('regulatory_compliance_enabled', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>KYC Required</Label>
              <Switch checked={properties.kyc_required || false} onCheckedChange={(checked) => handleFieldChange('kyc_required', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Accredited Investor Only</Label>
              <Switch checked={properties.accredited_investor_only || false} onCheckedChange={(checked) => handleFieldChange('accredited_investor_only', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">
            ERC-3525 Semi-Fungible Properties Configuration
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

export default ERC3525PropertiesTab;
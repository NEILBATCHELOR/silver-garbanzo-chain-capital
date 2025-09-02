// ERC-1155 Properties Tab - Multi-Token/Gaming Features
// Comprehensive form for ERC-1155 token properties with 70+ fields

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gamepad2, 
  Image, 
  Settings, 
  Shield, 
  Coins, 
  Users,
  TrendingUp,
  Gift,
  Layers,
  ArrowLeftRight,
  Vote,
  ShoppingCart
} from 'lucide-react';

import { TokenERC1155PropertiesData, ConfigMode } from '../../types';

interface ERC1155PropertiesTabProps {
  data?: TokenERC1155PropertiesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1155PropertiesTab: React.FC<ERC1155PropertiesTabProps> = ({
  data = [{}],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const properties = data[0] || {};

  const handleFieldChange = (field: string, value: any) => {
    onFieldChange(field, value, 0);
  };

  const handleArrayChange = (field: string, value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    onFieldChange(field, arrayValue, 0);
  };

  const getFieldError = (field: string) => {
    return validationErrors[`0.${field}`] || [];
  };

  const hasFieldError = (field: string) => {
    return getFieldError(field).length > 0;
  };

  if (configMode === 'min') {
    // Basic mode - essential fields only
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Basic Multi-Token Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_uri">Base URI</Label>
                <Input
                  id="base_uri"
                  value={properties.base_uri || ''}
                  onChange={(e) => handleFieldChange('base_uri', e.target.value)}
                  placeholder="https://api.example.com/metadata/"
                />
                {hasFieldError('base_uri') && (
                  <div className="text-sm text-red-500 mt-1">
                    {getFieldError('base_uri').join(', ')}
                  </div>
                )}
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
                    <SelectItem value="hybrid">Hybrid</SelectItem>
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
                <Label htmlFor="supply_tracking">Supply Tracking</Label>
                <Switch
                  id="supply_tracking"
                  checked={properties.supply_tracking !== false}
                  onCheckedChange={(checked) => handleFieldChange('supply_tracking', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Advanced mode - all fields
  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Basic Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="base_uri">Base URI</Label>
              <Input
                id="base_uri"
                value={properties.base_uri || ''}
                onChange={(e) => handleFieldChange('base_uri', e.target.value)}
                placeholder="https://api.example.com/metadata/"
              />
              {hasFieldError('base_uri') && (
                <div className="text-sm text-red-500 mt-1">
                  {getFieldError('base_uri').join(', ')}
                </div>
              )}
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
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="access_control">Access Control</Label>
              <Select 
                value={properties.access_control || 'ownable'} 
                onValueChange={(value) => handleFieldChange('access_control', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access control" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ownable">Ownable</SelectItem>
                  <SelectItem value="role_based">Role Based</SelectItem>
                  <SelectItem value="multisig">Multisig</SelectItem>
                  <SelectItem value="dao">DAO Governed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pricing_model">Pricing Model</Label>
              <Select 
                value={properties.pricing_model || 'fixed'} 
                onValueChange={(value) => handleFieldChange('pricing_model', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
                  <SelectItem value="auction">Auction Based</SelectItem>
                  <SelectItem value="bonding_curve">Bonding Curve</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="base_price">Base Price (ETH)</Label>
              <Input
                id="base_price"
                value={properties.base_price || ''}
                onChange={(e) => handleFieldChange('base_price', e.target.value)}
                placeholder="0.01"
              />
            </div>

            <div>
              <Label htmlFor="max_supply_per_type">Max Supply Per Type</Label>
              <Input
                id="max_supply_per_type"
                value={properties.max_supply_per_type || ''}
                onChange={(e) => handleFieldChange('max_supply_per_type', e.target.value)}
                placeholder="10000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Core Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label htmlFor="supply_tracking">Supply Tracking</Label>
              <Switch
                id="supply_tracking"
                checked={properties.supply_tracking !== false}
                onCheckedChange={(checked) => handleFieldChange('supply_tracking', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="updatable_uris">Updatable URIs</Label>
              <Switch
                id="updatable_uris"
                checked={properties.updatable_uris || false}
                onCheckedChange={(checked) => handleFieldChange('updatable_uris', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable_approval_for_all">Enable Approval For All</Label>
              <Switch
                id="enable_approval_for_all"
                checked={properties.enable_approval_for_all !== false}
                onCheckedChange={(checked) => handleFieldChange('enable_approval_for_all', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="batch_minting_enabled">Batch Minting</Label>
              <Switch
                id="batch_minting_enabled"
                checked={properties.batch_minting_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('batch_minting_enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gaming Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            Gaming Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="crafting_enabled">Crafting System</Label>
              <Switch
                id="crafting_enabled"
                checked={properties.crafting_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('crafting_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="fusion_enabled">Token Fusion</Label>
              <Switch
                id="fusion_enabled"
                checked={properties.fusion_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('fusion_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="experience_points_enabled">Experience Points</Label>
              <Switch
                id="experience_points_enabled"
                checked={properties.experience_points_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('experience_points_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="leveling_enabled">Leveling System</Label>
              <Switch
                id="leveling_enabled"
                checked={properties.leveling_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('leveling_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="consumable_tokens">Consumable Tokens</Label>
              <Switch
                id="consumable_tokens"
                checked={properties.consumable_tokens || false}
                onCheckedChange={(checked) => handleFieldChange('consumable_tokens', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="container_enabled">Container System</Label>
              <Switch
                id="container_enabled"
                checked={properties.container_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('container_enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading & Marketplace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Trading & Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="bundle_trading_enabled">Bundle Trading</Label>
              <Switch
                id="bundle_trading_enabled"
                checked={properties.bundle_trading_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('bundle_trading_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="atomic_swaps_enabled">Atomic Swaps</Label>
              <Switch
                id="atomic_swaps_enabled"
                checked={properties.atomic_swaps_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('atomic_swaps_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="cross_collection_trading">Cross-Collection Trading</Label>
              <Switch
                id="cross_collection_trading"
                checked={properties.cross_collection_trading || false}
                onCheckedChange={(checked) => handleFieldChange('cross_collection_trading', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="marketplace_fees_enabled">Marketplace Fees</Label>
              <Switch
                id="marketplace_fees_enabled"
                checked={properties.marketplace_fees_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('marketplace_fees_enabled', checked)}
              />
            </div>
          </div>

          {properties.marketplace_fees_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="marketplace_fee_percentage">Marketplace Fee (%)</Label>
                <Input
                  id="marketplace_fee_percentage"
                  value={properties.marketplace_fee_percentage || ''}
                  onChange={(e) => handleFieldChange('marketplace_fee_percentage', e.target.value)}
                  placeholder="2.5"
                />
              </div>

              <div>
                <Label htmlFor="marketplace_fee_recipient">Fee Recipient Address</Label>
                <Input
                  id="marketplace_fee_recipient"
                  value={properties.marketplace_fee_recipient || ''}
                  onChange={(e) => handleFieldChange('marketplace_fee_recipient', e.target.value)}
                  placeholder="0x..."
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing & Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Pricing & Discounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulk_discount_enabled">Bulk Discounts</Label>
              <Switch
                id="bulk_discount_enabled"
                checked={properties.bulk_discount_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('bulk_discount_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="referral_rewards_enabled">Referral Rewards</Label>
              <Switch
                id="referral_rewards_enabled"
                checked={properties.referral_rewards_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('referral_rewards_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="airdrop_enabled">Airdrop System</Label>
              <Switch
                id="airdrop_enabled"
                checked={properties.airdrop_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('airdrop_enabled', checked)}
              />
            </div>
          </div>

          {properties.referral_rewards_enabled && (
            <div>
              <Label htmlFor="referral_percentage">Referral Percentage (%)</Label>
              <Input
                id="referral_percentage"
                value={properties.referral_percentage || ''}
                onChange={(e) => handleFieldChange('referral_percentage', e.target.value)}
                placeholder="5"
              />
            </div>
          )}

          {properties.airdrop_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="airdrop_snapshot_block">Snapshot Block</Label>
                <Input
                  id="airdrop_snapshot_block"
                  value={properties.airdrop_snapshot_block || ''}
                  onChange={(e) => handleFieldChange('airdrop_snapshot_block', parseInt(e.target.value) || 0)}
                  placeholder="18000000"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="claim_period_enabled">Claim Period</Label>
                <Switch
                  id="claim_period_enabled"
                  checked={properties.claim_period_enabled || false}
                  onCheckedChange={(checked) => handleFieldChange('claim_period_enabled', checked)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Governance & Community */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Governance & Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="voting_power_enabled">Voting Power</Label>
              <Switch
                id="voting_power_enabled"
                checked={properties.voting_power_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('voting_power_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="community_treasury_enabled">Community Treasury</Label>
              <Switch
                id="community_treasury_enabled"
                checked={properties.community_treasury_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('community_treasury_enabled', checked)}
              />
            </div>
          </div>

          {properties.community_treasury_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="treasury_percentage">Treasury Percentage (%)</Label>
                <Input
                  id="treasury_percentage"
                  value={properties.treasury_percentage || ''}
                  onChange={(e) => handleFieldChange('treasury_percentage', e.target.value)}
                  placeholder="10"
                />
              </div>

              <div>
                <Label htmlFor="proposal_creation_threshold">Proposal Threshold</Label>
                <Input
                  id="proposal_creation_threshold"
                  value={properties.proposal_creation_threshold || ''}
                  onChange={(e) => handleFieldChange('proposal_creation_threshold', e.target.value)}
                  placeholder="1000"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-Chain & Bridging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Cross-Chain & Bridging
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="bridge_enabled">Bridge Support</Label>
              <Switch
                id="bridge_enabled"
                checked={properties.bridge_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('bridge_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="layer2_support_enabled">Layer 2 Support</Label>
              <Switch
                id="layer2_support_enabled"
                checked={properties.layer2_support_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('layer2_support_enabled', checked)}
              />
            </div>
          </div>

          {properties.bridge_enabled && (
            <div>
              <Label htmlFor="bridgeable_token_types">Bridgeable Token Types (comma-separated)</Label>
              <Input
                id="bridgeable_token_types"
                value={Array.isArray(properties.bridgeable_token_types) ? properties.bridgeable_token_types.join(', ') : ''}
                onChange={(e) => handleArrayChange('bridgeable_token_types', e.target.value)}
                placeholder="1, 2, 3"
              />
            </div>
          )}

          {properties.layer2_support_enabled && (
            <div>
              <Label htmlFor="supported_layer2_networks">Supported L2 Networks (comma-separated)</Label>
              <Input
                id="supported_layer2_networks"
                value={Array.isArray(properties.supported_layer2_networks) ? properties.supported_layer2_networks.join(', ') : ''}
                onChange={(e) => handleArrayChange('supported_layer2_networks', e.target.value)}
                placeholder="polygon, arbitrum, optimism"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Control & Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Access Control & Restrictions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="use_geographic_restrictions">Geographic Restrictions</Label>
              <Switch
                id="use_geographic_restrictions"
                checked={properties.use_geographic_restrictions || false}
                onCheckedChange={(checked) => handleFieldChange('use_geographic_restrictions', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="burning_enabled">Burning Enabled</Label>
              <Switch
                id="burning_enabled"
                checked={properties.burning_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('burning_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="updatable_metadata">Updatable Metadata</Label>
              <Switch
                id="updatable_metadata"
                checked={properties.updatable_metadata || false}
                onCheckedChange={(checked) => handleFieldChange('updatable_metadata', checked)}
              />
            </div>
          </div>

          {properties.use_geographic_restrictions && (
            <div>
              <Label htmlFor="default_restriction_policy">Default Restriction Policy</Label>
              <Select 
                value={properties.default_restriction_policy || 'allowed'} 
                onValueChange={(value) => handleFieldChange('default_restriction_policy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowed">Allowed by Default</SelectItem>
                  <SelectItem value="blocked">Blocked by Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mint_roles">Mint Roles (comma-separated)</Label>
              <Input
                id="mint_roles"
                value={Array.isArray(properties.mint_roles) ? properties.mint_roles.join(', ') : ''}
                onChange={(e) => handleArrayChange('mint_roles', e.target.value)}
                placeholder="admin, minter"
              />
            </div>

            <div>
              <Label htmlFor="burn_roles">Burn Roles (comma-separated)</Label>
              <Input
                id="burn_roles"
                value={Array.isArray(properties.burn_roles) ? properties.burn_roles.join(', ') : ''}
                onChange={(e) => handleArrayChange('burn_roles', e.target.value)}
                placeholder="admin, burner"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Royalties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Royalties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="has_royalty">Enable Royalties</Label>
            <Switch
              id="has_royalty"
              checked={properties.has_royalty || false}
              onCheckedChange={(checked) => handleFieldChange('has_royalty', checked)}
            />
          </div>

          {properties.has_royalty && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="royalty_percentage">Royalty Percentage (%)</Label>
                <Input
                  id="royalty_percentage"
                  value={properties.royalty_percentage || ''}
                  onChange={(e) => handleFieldChange('royalty_percentage', e.target.value)}
                  placeholder="2.5"
                />
              </div>

              <div>
                <Label htmlFor="royalty_receiver">Royalty Receiver Address</Label>
                <Input
                  id="royalty_receiver"
                  value={properties.royalty_receiver || ''}
                  onChange={(e) => handleFieldChange('royalty_receiver', e.target.value)}
                  placeholder="0x..."
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">
            ERC-1155 Multi-Token Properties Configuration
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

export default ERC1155PropertiesTab;
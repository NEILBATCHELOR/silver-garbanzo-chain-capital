import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign,
  RefreshCw,
  Vote,
  Coins,
  Shield,
  TrendingDown,
  Activity,
  Clock,
  Target,
  MapPin
} from 'lucide-react';
import { formatNumber } from '../utils/token-display-utils';
import { format } from 'date-fns';

interface ERC20CardSectionProps {
  token: any;
  isExpanded: boolean;
  isLoading?: boolean;
}

const ERC20CardSection: React.FC<ERC20CardSectionProps> = ({
  token,
  isExpanded,
  isLoading = false
}) => {
  // Extract properties from both base token and detailed properties
  const properties = token.erc20Properties || {};
  const blocks = token.blocks || {};
  const metadata = token.metadata || {};
  
  // Basic information that's always available - prefer blocks data, fallback to properties
  const tokenType = blocks.token_type || properties.token_type || blocks.tokenType || 'utility';
  const cap = blocks.cap || properties.cap;
  const hasRebasing = blocks.rebasing || properties.rebasing;
  const hasFeeOnTransfer = blocks.fee_on_transfer || properties.fee_on_transfer;
  const hasGovernance = blocks.governance_features || properties.governance_features || properties.governance_enabled;
  
  // Advanced features from comprehensive database fields - check both sources
  const hasAntiWhale = properties.anti_whale_enabled || blocks.anti_whale_enabled;
  const hasDeflation = properties.deflation_enabled || blocks.deflation_enabled;
  const hasStaking = properties.staking_enabled || blocks.staking_enabled;
  const hasTradingFees = properties.buy_fee_enabled || properties.sell_fee_enabled || blocks.buy_fee_enabled || blocks.sell_fee_enabled;
  const hasPresale = properties.presale_enabled || blocks.presale_enabled;
  const hasVesting = properties.vesting_enabled || blocks.vesting_enabled;
  const hasLottery = properties.lottery_enabled || blocks.lottery_enabled;
  const hasGeoRestrictions = properties.use_geographic_restrictions || blocks.use_geographic_restrictions;

  // Enhanced blocks data extraction
  const initialSupplyFromBlocks = blocks.initial_supply || blocks.initialSupply;
  const isMintableFromBlocks = blocks.is_mintable || blocks.isMintable;
  const isBurnableFromBlocks = blocks.is_burnable || blocks.isBurnable;
  const isPausableFromBlocks = blocks.is_pausable || blocks.isPausable;
  const permitFromBlocks = blocks.permit;
  const snapshotFromBlocks = blocks.snapshot;
  const accessControlFromBlocks = blocks.access_control || blocks.accessControl;

  if (!isExpanded) {
    // Collapsed view - show comprehensive overview even for basic tokens
    return (
      <div className="space-y-3">
        {/* Token Type and Basic Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              {tokenType.charAt(0).toUpperCase() + tokenType.slice(1).replace('_', ' ')} Token
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {properties.access_control === 'roles' ? 'Role-Based' : 'Ownable'}
          </div>
        </div>

        {/* Supply Information */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Initial:</span>
            <span className="ml-1 font-medium">
              {properties.initial_supply ? formatNumber(properties.initial_supply) : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Cap:</span>
            <span className="ml-1 font-medium">
              {cap ? formatNumber(cap) : 'Unlimited'}
            </span>
          </div>
        </div>

        {/* Core Features */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Core Features:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant={properties.is_mintable ? "default" : "secondary"} className="text-xs">
              {properties.is_mintable ? "✓" : "✗"} Mint
            </Badge>
            <Badge variant={properties.is_burnable ? "default" : "secondary"} className="text-xs">
              {properties.is_burnable ? "✓" : "✗"} Burn
            </Badge>
            <Badge variant={properties.is_pausable ? "default" : "secondary"} className="text-xs">
              {properties.is_pausable ? "✓" : "✗"} Pause
            </Badge>
            <Badge variant={properties.permit ? "default" : "secondary"} className="text-xs">
              {properties.permit ? "✓" : "✗"} Permit
            </Badge>
            <Badge variant={properties.snapshot ? "default" : "secondary"} className="text-xs">
              {properties.snapshot ? "✓" : "✗"} Snapshot
            </Badge>
          </div>
        </div>
        
        {/* Advanced Features Overview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Advanced Features:</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            <Badge variant={hasAntiWhale ? "default" : "outline"} className="text-xs justify-center">
              {hasAntiWhale ? "✓" : "○"} Anti-Whale
            </Badge>
            <Badge variant={hasStaking ? "default" : "outline"} className="text-xs justify-center">
              {hasStaking ? "✓" : "○"} Staking
            </Badge>
            <Badge variant={hasDeflation ? "default" : "outline"} className="text-xs justify-center">
              {hasDeflation ? "✓" : "○"} Deflation
            </Badge>
            <Badge variant={hasTradingFees ? "default" : "outline"} className="text-xs justify-center">
              {hasTradingFees ? "✓" : "○"} Fees
            </Badge>
            <Badge variant={hasGovernance ? "default" : "outline"} className="text-xs justify-center">
              {hasGovernance ? "✓" : "○"} Gov
            </Badge>
            <Badge variant={hasPresale ? "default" : "outline"} className="text-xs justify-center">
              {hasPresale ? "✓" : "○"} Presale
            </Badge>
          </div>
        </div>

        {/* Configuration Indicators */}
        {(properties.transfer_config || properties.gas_config || properties.compliance_config || properties.whitelist_config || hasFeeOnTransfer || hasRebasing) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Configurations:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {hasFeeOnTransfer && <Badge variant="outline" className="text-xs">Fee Transfer</Badge>}
              {hasRebasing && <Badge variant="outline" className="text-xs">Rebasing</Badge>}
              {properties.transfer_config && <Badge variant="outline" className="text-xs">Transfer</Badge>}
              {properties.gas_config && <Badge variant="outline" className="text-xs">Gas</Badge>}
              {properties.compliance_config && <Badge variant="outline" className="text-xs">Compliance</Badge>}
              {properties.whitelist_config && <Badge variant="outline" className="text-xs">Whitelist</Badge>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded view - show detailed information
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Token Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-500" />
            Token Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Token Type</p>
            <p className="text-base font-medium">
              {tokenType.charAt(0).toUpperCase() + tokenType.slice(1).replace('_', ' ')}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Initial Supply</p>
            <p className="text-base font-medium">
              {properties.initial_supply || initialSupplyFromBlocks ? 
                formatNumber(properties.initial_supply || initialSupplyFromBlocks) : 'Not set'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Maximum Supply</p>
            <p className="text-base font-medium">
              {cap ? formatNumber(cap) : properties.max_total_supply ? formatNumber(properties.max_total_supply) : 'Unlimited'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Access Control</p>
            <p className="text-base font-medium">
              {(accessControlFromBlocks || properties.access_control) === 'ownable'
                ? 'Ownable'
                : (accessControlFromBlocks || properties.access_control) === 'roles'
                  ? 'Role-Based'
                  : 'Standard'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Mintable</p>
            <div className="flex items-center gap-2">
              <Badge variant={(properties.is_mintable ?? isMintableFromBlocks) ? "default" : "secondary"}>
                {(properties.is_mintable ?? isMintableFromBlocks) ? 'Yes' : 'No'}
              </Badge>
              {properties.mintable_by && (
                <span className="text-xs text-muted-foreground">by {properties.mintable_by}</span>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Burnable</p>
            <div className="flex items-center gap-2">
              <Badge variant={(properties.is_burnable ?? isBurnableFromBlocks) ? "default" : "secondary"}>
                {(properties.is_burnable ?? isBurnableFromBlocks) ? 'Yes' : 'No'}
              </Badge>
              {properties.burnable_by && (
                <span className="text-xs text-muted-foreground">by {properties.burnable_by}</span>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Pausable</p>
            <div className="flex items-center gap-2">
              <Badge variant={(properties.is_pausable ?? isPausableFromBlocks) ? "default" : "secondary"}>
                {(properties.is_pausable ?? isPausableFromBlocks) ? 'Yes' : 'No'}
              </Badge>
              {properties.pausable_by && (
                <span className="text-xs text-muted-foreground">by {properties.pausable_by}</span>
              )}
            </div>
          </div>

          {/* Always show available features */}
          <div className="space-y-1 md:col-span-2 lg:col-span-3">
            <p className="text-sm text-muted-foreground">Features</p>
            <div className="flex flex-wrap gap-1">
              {/* Standard features - check both properties and blocks */}
              {(properties.permit || permitFromBlocks) && <Badge variant="outline" className="text-xs">Permit</Badge>}
              {(properties.snapshot || snapshotFromBlocks) && <Badge variant="outline" className="text-xs">Snapshot</Badge>}
              {properties.allow_management && <Badge variant="outline" className="text-xs">Management</Badge>}
              
              {/* Show advanced features even if disabled with different styling */}
              <Badge variant={hasAntiWhale ? "default" : "outline"} className="text-xs">
                {hasAntiWhale ? "✓" : "○"} Anti-Whale
              </Badge>
              <Badge variant={hasStaking ? "default" : "outline"} className="text-xs">
                {hasStaking ? "✓" : "○"} Staking
              </Badge>
              <Badge variant={hasDeflation ? "default" : "outline"} className="text-xs">
                {hasDeflation ? "✓" : "○"} Deflation
              </Badge>
              <Badge variant={hasTradingFees ? "default" : "outline"} className="text-xs">
                {hasTradingFees ? "✓" : "○"} Trading Fees
              </Badge>
              <Badge variant={hasPresale ? "default" : "outline"} className="text-xs">
                {hasPresale ? "✓" : "○"} Presale
              </Badge>
              <Badge variant={hasVesting ? "default" : "outline"} className="text-xs">
                {hasVesting ? "✓" : "○"} Vesting
              </Badge>
              <Badge variant={hasGovernance ? "default" : "outline"} className="text-xs">
                {hasGovernance ? "✓" : "○"} Governance
              </Badge>
              <Badge variant={hasLottery ? "default" : "outline"} className="text-xs">
                {hasLottery ? "✓" : "○"} Lottery
              </Badge>
              <Badge variant={hasGeoRestrictions ? "default" : "outline"} className="text-xs">
                {hasGeoRestrictions ? "✓" : "○"} Geo Restrictions
              </Badge>
            </div>
          </div>

          {/* Show JSONB configurations if they exist - enhanced to show blocks data */}
          {(properties.transfer_config || properties.gas_config || properties.compliance_config || properties.whitelist_config || 
            blocks.transfer_config || blocks.gas_config || blocks.compliance_config || blocks.whitelist_config) && (
            <div className="space-y-1 md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">Advanced Configurations</p>
              <div className="flex flex-wrap gap-1">
                {(properties.transfer_config || blocks.transfer_config) && <Badge variant="outline" className="text-xs">Transfer Config</Badge>}
                {(properties.gas_config || blocks.gas_config) && <Badge variant="outline" className="text-xs">Gas Config</Badge>}
                {(properties.compliance_config || blocks.compliance_config) && <Badge variant="outline" className="text-xs">Compliance Config</Badge>}
                {(properties.whitelist_config || blocks.whitelist_config) && <Badge variant="outline" className="text-xs">Whitelist Config</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anti-Whale Protection */}
      {hasAntiWhale && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              Anti-Whale Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.max_wallet_amount && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Max Wallet Amount</p>
                <p className="text-base font-medium">{formatNumber(properties.max_wallet_amount)}</p>
              </div>
            )}
            
            {properties.cooldown_period && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cooldown Period</p>
                <p className="text-base font-medium">{properties.cooldown_period} seconds</p>
              </div>
            )}
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Blacklist Enabled</p>
              <Badge variant={properties.blacklist_enabled ? "default" : "outline"}>
                {properties.blacklist_enabled ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deflation Features */}
      {hasDeflation && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Deflation Features
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.deflation_rate && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deflation Rate</p>
                <p className="text-base font-medium">{properties.deflation_rate}%</p>
              </div>
            )}
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Burn on Transfer</p>
              <Badge variant={properties.burn_on_transfer ? "default" : "outline"}>
                {properties.burn_on_transfer ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            
            {properties.burn_percentage && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Burn Percentage</p>
                <p className="text-base font-medium">{properties.burn_percentage}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staking Features */}
      {hasStaking && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Staking Features
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.staking_rewards_rate && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rewards Rate</p>
                <p className="text-base font-medium">{properties.staking_rewards_rate}% APY</p>
              </div>
            )}
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Reflection Enabled</p>
              <Badge variant={properties.reflection_enabled ? "default" : "outline"}>
                {properties.reflection_enabled ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            {properties.reflection_percentage && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reflection Percentage</p>
                <p className="text-base font-medium">{properties.reflection_percentage}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trading Fees */}
      {hasTradingFees && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Trading Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Buy Fee</p>
              <Badge variant={properties.buy_fee_enabled ? "default" : "outline"}>
                {properties.buy_fee_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sell Fee</p>
              <Badge variant={properties.sell_fee_enabled ? "default" : "outline"}>
                {properties.sell_fee_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            
            {properties.liquidity_fee_percentage && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Liquidity Fee</p>
                <p className="text-base font-medium">{properties.liquidity_fee_percentage}%</p>
              </div>
            )}
            
            {properties.marketing_fee_percentage && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Marketing Fee</p>
                <p className="text-base font-medium">{properties.marketing_fee_percentage}%</p>
              </div>
            )}
            
            {properties.charity_fee_percentage && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Charity Fee</p>
                <p className="text-base font-medium">{properties.charity_fee_percentage}%</p>
              </div>
            )}
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Auto Liquidity</p>
              <Badge variant={properties.auto_liquidity_enabled ? "default" : "outline"}>
                {properties.auto_liquidity_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Presale Configuration */}
      {hasPresale && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Presale Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.presale_rate && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Presale Rate</p>
                <p className="text-base font-medium">{properties.presale_rate}</p>
              </div>
            )}
            
            {properties.presale_start_time && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p className="text-base font-medium">
                  {format(new Date(properties.presale_start_time), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}
            
            {properties.presale_end_time && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="text-base font-medium">
                  {format(new Date(properties.presale_end_time), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vesting Configuration */}
      {hasVesting && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              Vesting Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.vesting_cliff_period && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cliff Period</p>
                <p className="text-base font-medium">{properties.vesting_cliff_period} days</p>
              </div>
            )}
            
            {properties.vesting_total_period && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Period</p>
                <p className="text-base font-medium">{properties.vesting_total_period} days</p>
              </div>
            )}
            
            {properties.vesting_release_frequency && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Release Frequency</p>
                <Badge variant="outline">{properties.vesting_release_frequency}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lottery Features */}
      {hasLottery && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-500" />
              Lottery Features
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.lottery_percentage && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lottery Percentage</p>
                <p className="text-base font-medium">{properties.lottery_percentage}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Geographic Restrictions */}
      {hasGeoRestrictions && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-500" />
              Geographic Restrictions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.default_restriction_policy && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Default Policy</p>
                <Badge variant="outline">{properties.default_restriction_policy}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Governance Configuration */}
      {hasGovernance && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Vote className="h-4 w-4 text-violet-500" />
              Governance Features
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(properties.governance_features?.votingPeriod || blocks.governance_features?.votingPeriod || properties.voting_period) && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Voting Period</p>
                <p className="text-base font-medium">
                  {properties.governance_features?.votingPeriod || blocks.governance_features?.votingPeriod || properties.voting_period} days
                </p>
              </div>
            )}
            
            {(properties.governance_features?.votingThreshold || blocks.governance_features?.votingThreshold) && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Voting Threshold</p>
                <p className="text-base font-medium">
                  {properties.governance_features?.votingThreshold || blocks.governance_features?.votingThreshold}%
                </p>
              </div>
            )}
            
            {(properties.governance_features?.quorum || blocks.governance_features?.quorum || properties.quorum_percentage) && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Quorum</p>
                <p className="text-base font-medium">
                  {properties.governance_features?.quorum || blocks.governance_features?.quorum || properties.quorum_percentage}%
                </p>
              </div>
            )}
            
            {properties.proposal_threshold && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Proposal Threshold</p>
                <p className="text-base font-medium">{formatNumber(properties.proposal_threshold)}</p>
              </div>
            )}
            
            {properties.voting_delay && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Voting Delay</p>
                <p className="text-base font-medium">{properties.voting_delay} blocks</p>
              </div>
            )}
            
            {properties.timelock_delay && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Timelock Delay</p>
                <p className="text-base font-medium">{properties.timelock_delay} seconds</p>
              </div>
            )}
            
            {properties.governance_token_address && (
              <div className="space-y-1 col-span-full">
                <p className="text-sm text-muted-foreground">Governance Token Address</p>
                <p className="text-sm font-mono break-all">{properties.governance_token_address}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rebasing Configuration */}
      {hasRebasing && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-cyan-500" />
              Rebasing Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Mode</p>
              <p className="text-base font-medium">
                {(properties.rebasing?.mode || blocks.rebasing?.mode) === 'automatic' 
                  ? 'Automatic' 
                  : 'Governance Controlled'}
              </p>
            </div>
            
            {(properties.rebasing?.targetSupply || blocks.rebasing?.targetSupply) && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Target Supply</p>
                <p className="text-base font-medium">
                  {formatNumber(properties.rebasing?.targetSupply || blocks.rebasing?.targetSupply)}
                </p>
              </div>
            )}
            
            {(properties.rebasing?.rebaseFrequency || blocks.rebasing?.rebaseFrequency) && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rebase Frequency</p>
                <Badge variant="outline">{properties.rebasing?.rebaseFrequency || blocks.rebasing?.rebaseFrequency}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fee on Transfer Configuration */}
      {hasFeeOnTransfer && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-500" />
              Fee on Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fee Amount</p>
              <p className="text-base font-medium">
                {(properties.fee_on_transfer?.fee || blocks.fee_on_transfer?.fee || '0')}
                {(properties.fee_on_transfer?.feeType || blocks.fee_on_transfer?.feeType) === 'percentage' ? '%' : ' tokens'}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fee Type</p>
              <Badge variant="outline">
                {(properties.fee_on_transfer?.feeType || blocks.fee_on_transfer?.feeType || 'percentage').charAt(0).toUpperCase() + 
                 (properties.fee_on_transfer?.feeType || blocks.fee_on_transfer?.feeType || 'percentage').slice(1)}
              </Badge>
            </div>
            
            {(properties.fee_on_transfer?.recipient || blocks.fee_on_transfer?.recipient) && (
              <div className="space-y-1 col-span-full">
                <p className="text-sm text-muted-foreground">Fee Recipient</p>
                <p className="text-sm font-mono break-all">
                  {properties.fee_on_transfer?.recipient || blocks.fee_on_transfer?.recipient}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Trading Configuration */}
      {properties.trading_start_time && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Trading Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Trading Start Time</p>
              <p className="text-base font-medium">
                {format(new Date(properties.trading_start_time), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Objects (JSONB fields) */}
      {(properties.transfer_config || properties.gas_config || properties.compliance_config || properties.whitelist_config) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-gray-500" />
              Advanced Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.transfer_config && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Transfer Config</p>
                <Badge variant="outline">Configured</Badge>
              </div>
            )}
            
            {properties.gas_config && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gas Config</p>
                <Badge variant="outline">Configured</Badge>
              </div>
            )}
            
            {properties.compliance_config && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Compliance Config</p>
                <Badge variant="outline">Configured</Badge>
              </div>
            )}
            
            {properties.whitelist_config && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Whitelist Config</p>
                <Badge variant="outline">Configured</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERC20CardSection;

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import our new UI components
import { SwitchField, AccordionSection, MultiEntryField, validateEthereumAddress, validateCountryCode } from "./ui";

/**
 * ERC20PropertiesForm - ERC-20 specific properties from token_erc20_properties table
 * 
 * Updated with improved UI:
 * - Consistent badge alignment using AccordionSection
 * - Clean toggle layout using SwitchField
 * - Multi-entry fields for whitelists and geographic restrictions
 * - Better spacing and visual hierarchy
 */

interface ERC20PropertiesFormProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
}

const ERC20PropertiesForm: React.FC<ERC20PropertiesFormProps> = ({ 
  tokenForm = {},
  onInputChange
}) => {
  const [config, setConfig] = useState(() => {
    // Initialize with all token_erc20_properties fields
    return {
      // Supply Management
      initial_supply: tokenForm.initial_supply || "",
      cap: tokenForm.cap || "",
      max_total_supply: tokenForm.max_total_supply || "",
      is_mintable: tokenForm.is_mintable ?? false,
      is_burnable: tokenForm.is_burnable ?? false,
      is_pausable: tokenForm.is_pausable ?? false,
      
      // Access Control
      token_type: tokenForm.token_type || "utility",
      access_control: tokenForm.access_control || "ownable",
      pausable_by: tokenForm.pausable_by || "",
      mintable_by: tokenForm.mintable_by || "",
      burnable_by: tokenForm.burnable_by || "",
      
      // Advanced Features
      allow_management: tokenForm.allow_management ?? false,
      permit: tokenForm.permit ?? false,
      snapshot: tokenForm.snapshot ?? false,
      
      // Anti-Whale Protection
      anti_whale_enabled: tokenForm.anti_whale_enabled ?? false,
      max_wallet_amount: tokenForm.max_wallet_amount || "",
      cooldown_period: tokenForm.cooldown_period ?? 0,
      
      // DeFi Fee System
      buy_fee_enabled: tokenForm.buy_fee_enabled ?? false,
      sell_fee_enabled: tokenForm.sell_fee_enabled ?? false,
      liquidity_fee_percentage: tokenForm.liquidity_fee_percentage || "",
      marketing_fee_percentage: tokenForm.marketing_fee_percentage || "",
      charity_fee_percentage: tokenForm.charity_fee_percentage || "",
      auto_liquidity_enabled: tokenForm.auto_liquidity_enabled ?? false,
      
      // Tokenomics
      reflection_enabled: tokenForm.reflection_enabled ?? false,
      reflection_percentage: tokenForm.reflection_percentage || "",
      deflation_enabled: tokenForm.deflation_enabled ?? false,
      deflation_rate: tokenForm.deflation_rate || "",
      burn_on_transfer: tokenForm.burn_on_transfer ?? false,
      burn_percentage: tokenForm.burn_percentage || "",
      staking_enabled: tokenForm.staking_enabled ?? false,
      staking_rewards_rate: tokenForm.staking_rewards_rate || "",
      lottery_enabled: tokenForm.lottery_enabled ?? false,
      lottery_percentage: tokenForm.lottery_percentage || "",
      
      // Trading Controls
      blacklist_enabled: tokenForm.blacklist_enabled ?? false,
      trading_start_time: tokenForm.trading_start_time || "",
      
      // Presale
      presale_enabled: tokenForm.presale_enabled ?? false,
      presale_rate: tokenForm.presale_rate || "",
      presale_start_time: tokenForm.presale_start_time || "",
      presale_end_time: tokenForm.presale_end_time || "",
      
      // Vesting
      vesting_enabled: tokenForm.vesting_enabled ?? false,
      vesting_cliff_period: tokenForm.vesting_cliff_period ?? 0,
      vesting_total_period: tokenForm.vesting_total_period ?? 0,
      vesting_release_frequency: tokenForm.vesting_release_frequency || "monthly",
      
      // Geographic Restrictions & Whitelists
      use_geographic_restrictions: tokenForm.use_geographic_restrictions ?? false,
      default_restriction_policy: tokenForm.default_restriction_policy || "allowed",
      geographic_restrictions: tokenForm.geographic_restrictions || [],
      whitelist_enabled: tokenForm.whitelist_enabled ?? false,
      whitelist_addresses: tokenForm.whitelist_addresses || [],
      
      // Governance
      governance_enabled: tokenForm.governance_enabled ?? false,
      quorum_percentage: tokenForm.quorum_percentage || "",
      proposal_threshold: tokenForm.proposal_threshold || "",
      voting_delay: tokenForm.voting_delay ?? 1,
      voting_period: tokenForm.voting_period ?? 7,
      timelock_delay: tokenForm.timelock_delay ?? 2,
      governance_token_address: tokenForm.governance_token_address || "",
      
      // JSONB Fields
      fee_on_transfer: tokenForm.fee_on_transfer || { enabled: false },
      rebasing: tokenForm.rebasing || { enabled: false },
      governance_features: tokenForm.governance_features || {},
      transfer_config: tokenForm.transfer_config || { enabled: false },
      gas_config: tokenForm.gas_config || { enabled: false },
      compliance_config: tokenForm.compliance_config || { enabled: false },
      whitelist_config: tokenForm.whitelist_config || { enabled: false }
    };
  });

  // Update parent when config changes
  useEffect(() => {
    Object.keys(config).forEach(key => {
      onInputChange(key, config[key]);
    });
  }, [config, onInputChange]);

  const handleChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        
        {/* Supply Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Supply Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="initialSupply">Initial Supply</Label>
              <Input
                id="initialSupply"
                placeholder="1000000"
                value={config.initial_supply}
                onChange={(e) => handleChange("initial_supply", e.target.value)}
              />
            </div>

            <SwitchField
              id="is_mintable"
              label="Mintable"
              description="Allow creating new tokens after deployment"
              checked={config.is_mintable}
              onCheckedChange={(checked) => handleChange("is_mintable", checked)}
            />

            {config.is_mintable && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="cap">Supply Cap</Label>
                  <Input
                    id="cap"
                    placeholder="Maximum supply cap (optional)"
                    value={config.cap}
                    onChange={(e) => handleChange("cap", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxTotalSupply">Maximum Total Supply</Label>
                  <Input
                    id="maxTotalSupply"
                    placeholder="Absolute maximum supply"
                    value={config.max_total_supply}
                    onChange={(e) => handleChange("max_total_supply", e.target.value)}
                  />
                </div>
              </div>
            )}

            <SwitchField
              label="Burnable"
              description="Allow token holders to permanently destroy their tokens"
              checked={config.is_burnable}
              onCheckedChange={(checked) => handleChange("is_burnable", checked)}
            />

            <SwitchField
              label="Pausable"
              description="Allow authorized users to pause all token transfers"
              checked={config.is_pausable}
              onCheckedChange={(checked) => handleChange("is_pausable", checked)}
            />
          </CardContent>
        </Card>

        {/* Token Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Token Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Token Type</Label>
              <Select value={config.token_type} onValueChange={(value) => handleChange("token_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select token type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utility">Utility Token</SelectItem>
                  <SelectItem value="security">Security Token</SelectItem>
                  <SelectItem value="governance">Governance Token</SelectItem>
                  <SelectItem value="stablecoin">Stablecoin</SelectItem>
                  <SelectItem value="asset_backed">Asset-Backed Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Access Control System</Label>
              <Select value={config.access_control} onValueChange={(value) => handleChange("access_control", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ownable">Ownable (Simple)</SelectItem>
                  <SelectItem value="roles">Role-Based</SelectItem>
                  <SelectItem value="none">No Access Control</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.access_control === 'roles' && (
              <div className="pl-4 space-y-4 border-l-2 border-primary/20">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Pausable By</Label>
                    <Select value={config.pausable_by} onValueChange={(value) => handleChange("pausable_by", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner Only</SelectItem>
                        <SelectItem value="admin">Admin Role</SelectItem>
                        <SelectItem value="operator">Operator Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mintable By</Label>
                    <Select value={config.mintable_by} onValueChange={(value) => handleChange("mintable_by", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner Only</SelectItem>
                        <SelectItem value="admin">Admin Role</SelectItem>
                        <SelectItem value="minter">Minter Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Burnable By</Label>
                    <Select value={config.burnable_by} onValueChange={(value) => handleChange("burnable_by", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner Only</SelectItem>
                        <SelectItem value="admin">Admin Role</SelectItem>
                        <SelectItem value="any">Any Holder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Features in Accordion */}
        <Accordion type="multiple" defaultValue={[]}>
          
          {/* Advanced Features */}
          <AccordionSection
            value="advanced"
            title="Advanced Features"
            badge={{ type: "advanced", text: "Advanced" }}
          >
            <SwitchField
              label="Allowance Management"
              description="Enhanced allowance management with additional security features"
              checked={config.allow_management}
              onCheckedChange={(checked) => handleChange("allow_management", checked)}
            />

            <SwitchField
              label="Permit (EIP-2612)"
              description="Enable gasless approvals using meta-transactions"
              checked={config.permit}
              onCheckedChange={(checked) => handleChange("permit", checked)}
            />

            <SwitchField
              label="Snapshot"
              description="Enable balance snapshots for voting or dividend distribution"
              checked={config.snapshot}
              onCheckedChange={(checked) => handleChange("snapshot", checked)}
            />
          </AccordionSection>

          {/* Anti-Whale Protection */}
          <AccordionSection
            value="antiwhale"
            title="Anti-Whale Protection"
            badge={{ type: "defi", text: "DeFi" }}
          >
            <SwitchField
              label="Enable Anti-Whale"
              description="Prevent large holders from manipulating the market"
              checked={config.anti_whale_enabled}
              onCheckedChange={(checked) => handleChange("anti_whale_enabled", checked)}
            />

            {config.anti_whale_enabled && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Max Wallet Amount</Label>
                  <Input
                    placeholder="Maximum tokens per wallet"
                    value={config.max_wallet_amount}
                    onChange={(e) => handleChange("max_wallet_amount", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cooldown Period (seconds)</Label>
                  <Input
                    type="number"
                    placeholder="300"
                    value={config.cooldown_period}
                    onChange={(e) => handleChange("cooldown_period", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </AccordionSection>

          {/* DeFi Fee System */}
          <AccordionSection
            value="fees"
            title="DeFi Fee System"
            badge={{ type: "defi", text: "DeFi" }}
          >
            <SwitchField
              label="Buy Fees"
              description="Apply fees when users purchase tokens"
              checked={config.buy_fee_enabled}
              onCheckedChange={(checked) => handleChange("buy_fee_enabled", checked)}
            />

            <SwitchField
              label="Sell Fees"
              description="Apply fees when users sell tokens"
              checked={config.sell_fee_enabled}
              onCheckedChange={(checked) => handleChange("sell_fee_enabled", checked)}
            />

            {(config.buy_fee_enabled || config.sell_fee_enabled) && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Liquidity Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="2.0"
                      value={config.liquidity_fee_percentage}
                      onChange={(e) => handleChange("liquidity_fee_percentage", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Marketing Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="1.0"
                      value={config.marketing_fee_percentage}
                      onChange={(e) => handleChange("marketing_fee_percentage", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Charity Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.5"
                      value={config.charity_fee_percentage}
                      onChange={(e) => handleChange("charity_fee_percentage", e.target.value)}
                    />
                  </div>
                </div>

                <SwitchField
                  label="Auto-Liquidity"
                  description="Automatically add collected fees to liquidity"
                  checked={config.auto_liquidity_enabled}
                  onCheckedChange={(checked) => handleChange("auto_liquidity_enabled", checked)}
                />
              </div>
            )}
          </AccordionSection>

          {/* Tokenomics */}
          <AccordionSection
            value="tokenomics"
            title="Tokenomics Features"
            badge={{ type: "defi", text: "DeFi" }}
          >
            {/* Reflection */}
            <div className="space-y-4">
              <SwitchField
                label="Reflection"
                description="Distribute rewards to holders proportional to their holdings"
                checked={config.reflection_enabled}
                onCheckedChange={(checked) => handleChange("reflection_enabled", checked)}
              />
              {config.reflection_enabled && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                  <Label>Reflection Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="2.0"
                    value={config.reflection_percentage}
                    onChange={(e) => handleChange("reflection_percentage", e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Deflation */}
            <div className="space-y-4">
              <SwitchField
                label="Deflation"
                description="Reduce token supply over time by burning tokens"
                checked={config.deflation_enabled}
                onCheckedChange={(checked) => handleChange("deflation_enabled", checked)}
              />
              {config.deflation_enabled && (
                <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Deflation Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.1"
                      value={config.deflation_rate}
                      onChange={(e) => handleChange("deflation_rate", e.target.value)}
                    />
                  </div>

                  <SwitchField
                    label="Burn on Transfer"
                    description="Burn a percentage of tokens on each transfer"
                    checked={config.burn_on_transfer}
                    onCheckedChange={(checked) => handleChange("burn_on_transfer", checked)}
                  />

                  {config.burn_on_transfer && (
                    <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                      <Label>Burn Percentage (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.05"
                        value={config.burn_percentage}
                        onChange={(e) => handleChange("burn_percentage", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Staking */}
            <div className="space-y-4">
              <SwitchField
                label="Staking"
                description="Allow holders to stake tokens for rewards"
                checked={config.staking_enabled}
                onCheckedChange={(checked) => handleChange("staking_enabled", checked)}
              />
              {config.staking_enabled && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                  <Label>Staking Rewards Rate (% APY)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="12.0"
                    value={config.staking_rewards_rate}
                    onChange={(e) => handleChange("staking_rewards_rate", e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Lottery */}
            <div className="space-y-4">
              <SwitchField
                label="Lottery"
                description="Enable lottery system for additional holder rewards"
                checked={config.lottery_enabled}
                onCheckedChange={(checked) => handleChange("lottery_enabled", checked)}
              />
              {config.lottery_enabled && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                  <Label>Lottery Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={config.lottery_percentage}
                    onChange={(e) => handleChange("lottery_percentage", e.target.value)}
                  />
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Trading Controls */}
          <AccordionSection
            value="trading"
            title="Trading Controls"
            badge={{ type: "advanced", text: "Advanced" }}
          >
            <div className="space-y-2">
              <Label>Trading Start Time</Label>
              <Input
                type="datetime-local"
                value={config.trading_start_time}
                onChange={(e) => handleChange("trading_start_time", e.target.value)}
              />
            </div>

            <SwitchField
              label="Blacklist Enabled"
              description="Enable blacklist functionality to block specific addresses"
              checked={config.blacklist_enabled}
              onCheckedChange={(checked) => handleChange("blacklist_enabled", checked)}
            />
          </AccordionSection>

          {/* Whitelist Management */}
          <AccordionSection
            value="whitelist"
            title="Whitelist Management"
            badge={{ type: "compliance", text: "Compliance" }}
          >
            <SwitchField
              label="Enable Whitelist"
              description="Only allow transfers to pre-approved addresses"
              checked={config.whitelist_enabled}
              onCheckedChange={(checked) => handleChange("whitelist_enabled", checked)}
            />

            {config.whitelist_enabled && (
              <div className="pl-6 border-l-2 border-primary/20">
                <MultiEntryField
                  label="Whitelisted Addresses"
                  description="Ethereum addresses that are allowed to receive tokens"
                  placeholder="0x742d35Cc6634C0532925a3b8D44C5dB8678C6323"
                  values={config.whitelist_addresses}
                  onValuesChange={(values) => handleChange("whitelist_addresses", values)}
                  validation={validateEthereumAddress}
                  validationError="Please enter a valid Ethereum address (0x...)"
                  maxItems={100}
                />
              </div>
            )}
          </AccordionSection>

          {/* Geographic Restrictions */}
          <AccordionSection
            value="geographic"
            title="Geographic Restrictions"
            badge={{ type: "compliance", text: "Compliance" }}
          >
            <SwitchField
              label="Enable Geographic Restrictions"
              description="Restrict transfers based on investor location"
              checked={config.use_geographic_restrictions}
              onCheckedChange={(checked) => handleChange("use_geographic_restrictions", checked)}
            />

            {config.use_geographic_restrictions && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Default Restriction Policy</Label>
                  <Select value={config.default_restriction_policy} onValueChange={(value) => handleChange("default_restriction_policy", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allowed">Allow by Default</SelectItem>
                      <SelectItem value="blocked">Block by Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <MultiEntryField
                  label="Restricted Country Codes"
                  description="ISO 3166-1 alpha-2 country codes to restrict (e.g., US, CN, RU)"
                  placeholder="US"
                  values={config.geographic_restrictions}
                  onValuesChange={(values) => handleChange("geographic_restrictions", values)}
                  validation={validateCountryCode}
                  validationError="Please enter a valid 2-letter country code (e.g., US, GB, DE)"
                  maxItems={50}
                />
              </div>
            )}
          </AccordionSection>

          {/* Presale */}
          <AccordionSection
            value="presale"
            title="Presale Management"
            badge={{ type: "enterprise", text: "Enterprise" }}
          >
            <SwitchField
              label="Enable Presale"
              description="Configure presale parameters for initial token distribution"
              checked={config.presale_enabled}
              onCheckedChange={(checked) => handleChange("presale_enabled", checked)}
            />

            {config.presale_enabled && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Presale Rate (tokens per ETH)</Label>
                  <Input
                    placeholder="1000"
                    value={config.presale_rate}
                    onChange={(e) => handleChange("presale_rate", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="datetime-local"
                      value={config.presale_start_time}
                      onChange={(e) => handleChange("presale_start_time", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="datetime-local"
                      value={config.presale_end_time}
                      onChange={(e) => handleChange("presale_end_time", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </AccordionSection>

          {/* Vesting */}
          <AccordionSection
            value="vesting"
            title="Vesting Schedules"
            badge={{ type: "enterprise", text: "Enterprise" }}
          >
            <SwitchField
              label="Enable Vesting"
              description="Configure token vesting schedules for team and investors"
              checked={config.vesting_enabled}
              onCheckedChange={(checked) => handleChange("vesting_enabled", checked)}
            />

            {config.vesting_enabled && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Cliff Period (months)</Label>
                    <Input
                      type="number"
                      placeholder="6"
                      value={config.vesting_cliff_period}
                      onChange={(e) => handleChange("vesting_cliff_period", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total Period (months)</Label>
                    <Input
                      type="number"
                      placeholder="48"
                      value={config.vesting_total_period}
                      onChange={(e) => handleChange("vesting_total_period", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Release Frequency</Label>
                    <Select value={config.vesting_release_frequency} onValueChange={(value) => handleChange("vesting_release_frequency", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </AccordionSection>

          {/* Governance */}
          <AccordionSection
            value="governance"
            title="Governance Features"
            badge={{ type: "advanced", text: "Advanced" }}
          >
            <SwitchField
              label="Enable Governance"
              description="Enable on-chain governance with voting and proposals"
              checked={config.governance_enabled}
              onCheckedChange={(checked) => handleChange("governance_enabled", checked)}
            />

            {config.governance_enabled && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Quorum Percentage (%)</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={config.quorum_percentage}
                      onChange={(e) => handleChange("quorum_percentage", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Proposal Threshold</Label>
                    <Input
                      placeholder="100000"
                      value={config.proposal_threshold}
                      onChange={(e) => handleChange("proposal_threshold", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Voting Delay (blocks)</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={config.voting_delay}
                      onChange={(e) => handleChange("voting_delay", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Voting Period (blocks)</Label>
                    <Input
                      type="number"
                      placeholder="45818"
                      value={config.voting_period}
                      onChange={(e) => handleChange("voting_period", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Timelock Delay (days)</Label>
                    <Input
                      type="number"
                      placeholder="2"
                      value={config.timelock_delay}
                      onChange={(e) => handleChange("timelock_delay", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Governance Token Address</Label>
                    <Input
                      placeholder="0x..."
                      value={config.governance_token_address}
                      onChange={(e) => handleChange("governance_token_address", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </AccordionSection>

        </Accordion>
      </div>
    </TooltipProvider>
  );
};

export default ERC20PropertiesForm;

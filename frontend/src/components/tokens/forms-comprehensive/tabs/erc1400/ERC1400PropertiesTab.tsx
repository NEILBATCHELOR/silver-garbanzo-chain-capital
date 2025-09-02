// ERC-1400 Properties Tab - Security Token Configuration
// Comprehensive form for ERC-1400 security token properties with 120+ fields

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
  Shield, 
  Building, 
  Scale, 
  FileText, 
  Users,
  Globe,
  TrendingUp,
  AlertTriangle,
  Lock,
  Briefcase
} from 'lucide-react';

import { TokenERC1400PropertiesData, ConfigMode } from '../../types';

interface ERC1400PropertiesTabProps {
  data?: TokenERC1400PropertiesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1400PropertiesTab: React.FC<ERC1400PropertiesTabProps> = ({
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
    // Basic mode - essential security token fields
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Basic Security Token Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="security_type">Security Type</Label>
                <Select 
                  value={properties.security_type || 'equity'} 
                  onValueChange={(value) => handleFieldChange('security_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select security type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="debt">Debt</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="commodity">Commodity</SelectItem>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="issuing_jurisdiction">Issuing Jurisdiction</Label>
                <Input
                  id="issuing_jurisdiction"
                  value={properties.issuing_jurisdiction || ''}
                  onChange={(e) => handleFieldChange('issuing_jurisdiction', e.target.value)}
                  placeholder="United States"
                />
              </div>

              <div>
                <Label htmlFor="issuing_entity_name">Issuing Entity Name</Label>
                <Input
                  id="issuing_entity_name"
                  value={properties.issuing_entity_name || ''}
                  onChange={(e) => handleFieldChange('issuing_entity_name', e.target.value)}
                  placeholder="Example Corp"
                />
              </div>

              <div>
                <Label htmlFor="issuing_entity_lei">Legal Entity Identifier (LEI)</Label>
                <Input
                  id="issuing_entity_lei"
                  value={properties.issuing_entity_lei || ''}
                  onChange={(e) => handleFieldChange('issuing_entity_lei', e.target.value)}
                  placeholder="5493000IJL5H8DL1V733"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="require_kyc">Require KYC</Label>
                <Switch
                  id="require_kyc"
                  checked={properties.require_kyc !== false}
                  onCheckedChange={(checked) => handleFieldChange('require_kyc', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_mintable">Mintable</Label>
                <Switch
                  id="is_mintable"
                  checked={properties.is_mintable || false}
                  onCheckedChange={(checked) => handleFieldChange('is_mintable', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_burnable">Burnable</Label>
                <Switch
                  id="is_burnable"
                  checked={properties.is_burnable || false}
                  onCheckedChange={(checked) => handleFieldChange('is_burnable', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  // Advanced mode - full security token features
  return (
    <div className="space-y-6">
      {/* Basic Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Basic Security Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="security_type">Security Type</Label>
              <Select 
                value={properties.security_type || 'equity'} 
                onValueChange={(value) => handleFieldChange('security_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select security type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="commodity">Commodity</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="derivative">Derivative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="regulation_type">Regulation Type</Label>
              <Select 
                value={properties.regulation_type || ''} 
                onValueChange={(value) => handleFieldChange('regulation_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select regulation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reg_d">Regulation D</SelectItem>
                  <SelectItem value="reg_s">Regulation S</SelectItem>
                  <SelectItem value="reg_a">Regulation A+</SelectItem>
                  <SelectItem value="reg_cf">Regulation CF</SelectItem>
                  <SelectItem value="public">Public Offering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="issuing_jurisdiction">Issuing Jurisdiction</Label>
              <Input
                id="issuing_jurisdiction"
                value={properties.issuing_jurisdiction || ''}
                onChange={(e) => handleFieldChange('issuing_jurisdiction', e.target.value)}
                placeholder="United States"
              />
            </div>

            <div>
              <Label htmlFor="issuing_entity_name">Issuing Entity Name</Label>
              <Input
                id="issuing_entity_name"
                value={properties.issuing_entity_name || ''}
                onChange={(e) => handleFieldChange('issuing_entity_name', e.target.value)}
                placeholder="Example Corp"
              />
            </div>

            <div>
              <Label htmlFor="issuing_entity_lei">Legal Entity Identifier (LEI)</Label>
              <Input
                id="issuing_entity_lei"
                value={properties.issuing_entity_lei || ''}
                onChange={(e) => handleFieldChange('issuing_entity_lei', e.target.value)}
                placeholder="5493000IJL5H8DL1V733"
              />
            </div>

            <div>
              <Label htmlFor="controller_address">Controller Address</Label>
              <Input
                id="controller_address"
                value={properties.controller_address || ''}
                onChange={(e) => handleFieldChange('controller_address', e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="initial_supply">Initial Supply</Label>
              <Input
                id="initial_supply"
                value={properties.initial_supply || ''}
                onChange={(e) => handleFieldChange('initial_supply', e.target.value)}
                placeholder="1000000"
              />
            </div>

            <div>
              <Label htmlFor="cap">Maximum Supply Cap</Label>
              <Input
                id="cap"
                value={properties.cap || ''}
                onChange={(e) => handleFieldChange('cap', e.target.value)}
                placeholder="10000000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Core Security Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_mintable">Mintable</Label>
              <Switch
                id="is_mintable"
                checked={properties.is_mintable || false}
                onCheckedChange={(checked) => handleFieldChange('is_mintable', checked)}
              />
            </div>

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
              <Label htmlFor="forced_transfers">Forced Transfers</Label>
              <Switch
                id="forced_transfers"
                checked={properties.forced_transfers || false}
                onCheckedChange={(checked) => handleFieldChange('forced_transfers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_multi_class">Multi-Class Structure</Label>
              <Switch
                id="is_multi_class"
                checked={properties.is_multi_class || false}
                onCheckedChange={(checked) => handleFieldChange('is_multi_class', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tranche_transferability">Tranche Transferability</Label>
              <Switch
                id="tranche_transferability"
                checked={properties.tranche_transferability || false}
                onCheckedChange={(checked) => handleFieldChange('tranche_transferability', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance & KYC */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Compliance & KYC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="require_kyc">Require KYC</Label>
              <Switch
                id="require_kyc"
                checked={properties.require_kyc !== false}
                onCheckedChange={(checked) => handleFieldChange('require_kyc', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enforce_kyc">Enforce KYC</Label>
              <Switch
                id="enforce_kyc"
                checked={properties.enforce_kyc || false}
                onCheckedChange={(checked) => handleFieldChange('enforce_kyc', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="investor_accreditation">Investor Accreditation</Label>
              <Switch
                id="investor_accreditation"
                checked={properties.investor_accreditation || false}
                onCheckedChange={(checked) => handleFieldChange('investor_accreditation', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="whitelist_enabled">Whitelist Enabled</Label>
              <Switch
                id="whitelist_enabled"
                checked={properties.whitelist_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('whitelist_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="accredited_investor_only">Accredited Only</Label>
              <Switch
                id="accredited_investor_only"
                checked={properties.accredited_investor_only || false}
                onCheckedChange={(checked) => handleFieldChange('accredited_investor_only', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto_compliance">Auto Compliance</Label>
              <Switch
                id="auto_compliance"
                checked={properties.auto_compliance || false}
                onCheckedChange={(checked) => handleFieldChange('auto_compliance', checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="compliance_automation_level">Compliance Level</Label>
              <Select 
                value={properties.compliance_automation_level || 'manual'} 
                onValueChange={(value) => handleFieldChange('compliance_automation_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="semi_automated">Semi-Automated</SelectItem>
                  <SelectItem value="fully_automated">Fully Automated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max_investor_count">Max Investor Count</Label>
              <Input
                id="max_investor_count"
                type="number"
                value={properties.max_investor_count || ''}
                onChange={(e) => handleFieldChange('max_investor_count', parseInt(e.target.value) || null)}
                placeholder="500"
              />
            </div>

            <div>
              <Label htmlFor="holding_period">Holding Period (days)</Label>
              <Input
                id="holding_period"
                type="number"
                value={properties.holding_period || ''}
                onChange={(e) => handleFieldChange('holding_period', parseInt(e.target.value) || null)}
                placeholder="365"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Geographic Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Geographic & Jurisdictional Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="use_geographic_restrictions">Geographic Restrictions</Label>
              <Switch
                id="use_geographic_restrictions"
                checked={properties.use_geographic_restrictions || false}
                onCheckedChange={(checked) => handleFieldChange('use_geographic_restrictions', checked)}
              />
            </div>

            <div>
              <Label htmlFor="default_restriction_policy">Default Policy</Label>
              <Select 
                value={properties.default_restriction_policy || 'blocked'} 
                onValueChange={(value) => handleFieldChange('default_restriction_policy', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowed">Allowed by Default</SelectItem>
                  <SelectItem value="blocked">Blocked by Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="cross_border_trading_enabled">Cross-Border Trading</Label>
              <Switch
                id="cross_border_trading_enabled"
                checked={properties.cross_border_trading_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('cross_border_trading_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="multi_jurisdiction_compliance">Multi-Jurisdiction Compliance</Label>
              <Switch
                id="multi_jurisdiction_compliance"
                checked={properties.multi_jurisdiction_compliance || false}
                onCheckedChange={(checked) => handleFieldChange('multi_jurisdiction_compliance', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Institutional Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Institutional Grade Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="institutional_grade">Institutional Grade</Label>
              <Switch
                id="institutional_grade"
                checked={properties.institutional_grade || false}
                onCheckedChange={(checked) => handleFieldChange('institutional_grade', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="custody_integration_enabled">Custody Integration</Label>
              <Switch
                id="custody_integration_enabled"
                checked={properties.custody_integration_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('custody_integration_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="prime_brokerage_support">Prime Brokerage</Label>
              <Switch
                id="prime_brokerage_support"
                checked={properties.prime_brokerage_support || false}
                onCheckedChange={(checked) => handleFieldChange('prime_brokerage_support', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="clearing_house_integration">Clearing House</Label>
              <Switch
                id="clearing_house_integration"
                checked={properties.clearing_house_integration || false}
                onCheckedChange={(checked) => handleFieldChange('clearing_house_integration', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="institutional_wallet_support">Institutional Wallets</Label>
              <Switch
                id="institutional_wallet_support"
                checked={properties.institutional_wallet_support || false}
                onCheckedChange={(checked) => handleFieldChange('institutional_wallet_support', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="swift_integration_enabled">SWIFT Integration</Label>
              <Switch
                id="swift_integration_enabled"
                checked={properties.swift_integration_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('swift_integration_enabled', checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="settlement_integration">Settlement Integration</Label>
              <Select 
                value={properties.settlement_integration || ''} 
                onValueChange={(value) => handleFieldChange('settlement_integration', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select settlement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dvp">Delivery vs Payment (DvP)</SelectItem>
                  <SelectItem value="atomic_settlement">Atomic Settlement</SelectItem>
                  <SelectItem value="traditional">Traditional Settlement</SelectItem>
                  <SelectItem value="instant">Instant Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="third_party_custody_addresses">Custody Addresses (comma-separated)</Label>
              <Input
                id="third_party_custody_addresses"
                value={Array.isArray(properties.third_party_custody_addresses) ? properties.third_party_custody_addresses.join(', ') : ''}
                onChange={(e) => handleArrayChange('third_party_custody_addresses', e.target.value)}
                placeholder="0x..., 0x..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Governance & Voting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="advanced_governance_enabled">Advanced Governance</Label>
              <Switch
                id="advanced_governance_enabled"
                checked={properties.advanced_governance_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('advanced_governance_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="proxy_voting_enabled">Proxy Voting</Label>
              <Switch
                id="proxy_voting_enabled"
                checked={properties.proxy_voting_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('proxy_voting_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="board_election_support">Board Elections</Label>
              <Switch
                id="board_election_support"
                checked={properties.board_election_support || false}
                onCheckedChange={(checked) => handleFieldChange('board_election_support', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="cumulative_voting_enabled">Cumulative Voting</Label>
              <Switch
                id="cumulative_voting_enabled"
                checked={properties.cumulative_voting_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('cumulative_voting_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="voting_delegation_enabled">Vote Delegation</Label>
              <Switch
                id="voting_delegation_enabled"
                checked={properties.voting_delegation_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('voting_delegation_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="institutional_voting_services">Institutional Voting</Label>
              <Switch
                id="institutional_voting_services"
                checked={properties.institutional_voting_services || false}
                onCheckedChange={(checked) => handleFieldChange('institutional_voting_services', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Corporate Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Corporate Actions & Treasury
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="corporate_actions">Corporate Actions</Label>
              <Switch
                id="corporate_actions"
                checked={properties.corporate_actions || false}
                onCheckedChange={(checked) => handleFieldChange('corporate_actions', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="dividend_distribution">Dividend Distribution</Label>
              <Switch
                id="dividend_distribution"
                checked={properties.dividend_distribution || false}
                onCheckedChange={(checked) => handleFieldChange('dividend_distribution', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="stock_splits_enabled">Stock Splits</Label>
              <Switch
                id="stock_splits_enabled"
                checked={properties.stock_splits_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('stock_splits_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="treasury_management_enabled">Treasury Management</Label>
              <Switch
                id="treasury_management_enabled"
                checked={properties.treasury_management_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('treasury_management_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="buyback_programs_enabled">Buyback Programs</Label>
              <Switch
                id="buyback_programs_enabled"
                checked={properties.buyback_programs_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('buyback_programs_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="forced_redemption_enabled">Forced Redemption</Label>
              <Switch
                id="forced_redemption_enabled"
                checked={properties.forced_redemption_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('forced_redemption_enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Advanced Compliance & Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="real_time_compliance_monitoring">Real-time Monitoring</Label>
              <Switch
                id="real_time_compliance_monitoring"
                checked={properties.real_time_compliance_monitoring || false}
                onCheckedChange={(checked) => handleFieldChange('real_time_compliance_monitoring', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="automated_sanctions_screening">Sanctions Screening</Label>
              <Switch
                id="automated_sanctions_screening"
                checked={properties.automated_sanctions_screening || false}
                onCheckedChange={(checked) => handleFieldChange('automated_sanctions_screening', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="aml_monitoring_enabled">AML Monitoring</Label>
              <Switch
                id="aml_monitoring_enabled"
                checked={properties.aml_monitoring_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('aml_monitoring_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="pep_screening_enabled">PEP Screening</Label>
              <Switch
                id="pep_screening_enabled"
                checked={properties.pep_screening_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('pep_screening_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="suspicious_activity_reporting">SAR Reporting</Label>
              <Switch
                id="suspicious_activity_reporting"
                checked={properties.suspicious_activity_reporting || false}
                onCheckedChange={(checked) => handleFieldChange('suspicious_activity_reporting', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="regulatory_filing_automation">Auto Regulatory Filing</Label>
              <Switch
                id="regulatory_filing_automation"
                checked={properties.regulatory_filing_automation || false}
                onCheckedChange={(checked) => handleFieldChange('regulatory_filing_automation', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Risk Management & Insurance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="advanced_risk_management">Advanced Risk Management</Label>
              <Switch
                id="advanced_risk_management"
                checked={properties.advanced_risk_management || false}
                onCheckedChange={(checked) => handleFieldChange('advanced_risk_management', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="position_limits_enabled">Position Limits</Label>
              <Switch
                id="position_limits_enabled"
                checked={properties.position_limits_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('position_limits_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="stress_testing_enabled">Stress Testing</Label>
              <Switch
                id="stress_testing_enabled"
                checked={properties.stress_testing_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('stress_testing_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="insurance_coverage_enabled">Insurance Coverage</Label>
              <Switch
                id="insurance_coverage_enabled"
                checked={properties.insurance_coverage_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('insurance_coverage_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="collateral_management_enabled">Collateral Management</Label>
              <Switch
                id="collateral_management_enabled"
                checked={properties.collateral_management_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('collateral_management_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="disaster_recovery_enabled">Disaster Recovery</Label>
              <Switch
                id="disaster_recovery_enabled"
                checked={properties.disaster_recovery_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('disaster_recovery_enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Legal Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document_uri">Primary Document URI</Label>
              <Input
                id="document_uri"
                value={properties.document_uri || ''}
                onChange={(e) => handleFieldChange('document_uri', e.target.value)}
                placeholder="https://documents.example.com/prospectus.pdf"
              />
            </div>

            <div>
              <Label htmlFor="document_hash">Document Hash</Label>
              <Input
                id="document_hash"
                value={properties.document_hash || ''}
                onChange={(e) => handleFieldChange('document_hash', e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="document_management">Document Management</Label>
              <Switch
                id="document_management"
                checked={properties.document_management || false}
                onCheckedChange={(checked) => handleFieldChange('document_management', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enhanced_reporting_enabled">Enhanced Reporting</Label>
              <Switch
                id="enhanced_reporting_enabled"
                checked={properties.enhanced_reporting_enabled || false}
                onCheckedChange={(checked) => handleFieldChange('enhanced_reporting_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="beneficial_ownership_tracking">Beneficial Ownership</Label>
              <Switch
                id="beneficial_ownership_tracking"
                checked={properties.beneficial_ownership_tracking || false}
                onCheckedChange={(checked) => handleFieldChange('beneficial_ownership_tracking', checked)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="token_details">Token Details</Label>
              <Textarea
                id="token_details"
                value={properties.token_details || ''}
                onChange={(e) => handleFieldChange('token_details', e.target.value)}
                placeholder="Detailed description of the security token..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="legal_terms">Legal Terms</Label>
              <Textarea
                id="legal_terms"
                value={properties.legal_terms || ''}
                onChange={(e) => handleFieldChange('legal_terms', e.target.value)}
                placeholder="Legal terms and conditions..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="prospectus">Prospectus</Label>
              <Textarea
                id="prospectus"
                value={properties.prospectus || ''}
                onChange={(e) => handleFieldChange('prospectus', e.target.value)}
                placeholder="Link to or summary of prospectus..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">
            ERC-1400 Security Token Properties Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate Configuration
        </Button>
      </div>
    </div>
  );
};

export default ERC1400PropertiesTab;
/**
 * Compliance Module Configuration Component
 * ✅ ENHANCED: Complete KYC/AML compliance with jurisdiction rules
 * Handles KYC/AML compliance settings across all token standards
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Shield, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ModuleConfigProps, ComplianceModuleConfig } from '../types';

export function ComplianceModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<ComplianceModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false,
        kycRequired: false,
        whitelistRequired: false
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        kycRequired: config.kycRequired || false,
        whitelistRequired: config.whitelistRequired || false,
        kycProvider: config.kycProvider || '',
        restrictedCountries: config.restrictedCountries || [],
        whitelistAddresses: config.whitelistAddresses || [],
        accreditedInvestorOnly: config.accreditedInvestorOnly || false,
        jurisdictionRules: config.jurisdictionRules || []
      });
    }
  };

  const handleFieldChange = (field: keyof ComplianceModuleConfig, value: any) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  // Restricted Countries Management
  const addRestrictedCountry = () => {
    onChange({
      ...config,
      restrictedCountries: [...(config.restrictedCountries || []), '']
    });
  };

  const removeRestrictedCountry = (index: number) => {
    const newCountries = [...(config.restrictedCountries || [])];
    newCountries.splice(index, 1);
    onChange({
      ...config,
      restrictedCountries: newCountries
    });
  };

  const updateRestrictedCountry = (index: number, value: string) => {
    const newCountries = [...(config.restrictedCountries || [])];
    newCountries[index] = value.toUpperCase();
    onChange({
      ...config,
      restrictedCountries: newCountries
    });
  };

  // Whitelist Addresses Management
  const addWhitelistAddress = () => {
    onChange({
      ...config,
      whitelistAddresses: [...(config.whitelistAddresses || []), '']
    });
  };

  const removeWhitelistAddress = (index: number) => {
    const newAddresses = [...(config.whitelistAddresses || [])];
    newAddresses.splice(index, 1);
    onChange({
      ...config,
      whitelistAddresses: newAddresses
    });
  };

  const updateWhitelistAddress = (index: number, value: string) => {
    const newAddresses = [...(config.whitelistAddresses || [])];
    newAddresses[index] = value;
    onChange({
      ...config,
      whitelistAddresses: newAddresses
    });
  };

  // Jurisdiction Rules Management
  const addJurisdictionRule = () => {
    onChange({
      ...config,
      jurisdictionRules: [
        ...(config.jurisdictionRules || []),
        {
          jurisdiction: '',
          allowed: true,
          requirements: []
        }
      ]
    });
  };

  const removeJurisdictionRule = (index: number) => {
    const newRules = [...(config.jurisdictionRules || [])];
    newRules.splice(index, 1);
    onChange({
      ...config,
      jurisdictionRules: newRules
    });
  };

  const updateJurisdictionRule = (index: number, field: string, value: any) => {
    const newRules = [...(config.jurisdictionRules || [])];
    newRules[index] = {
      ...newRules[index],
      [field]: value
    };
    onChange({
      ...config,
      jurisdictionRules: newRules
    });
  };

  const addRequirement = (ruleIndex: number, requirement: string) => {
    const newRules = [...(config.jurisdictionRules || [])];
    newRules[ruleIndex].requirements = [
      ...(newRules[ruleIndex].requirements || []),
      requirement
    ];
    onChange({
      ...config,
      jurisdictionRules: newRules
    });
  };

  const removeRequirement = (ruleIndex: number, reqIndex: number) => {
    const newRules = [...(config.jurisdictionRules || [])];
    newRules[ruleIndex].requirements?.splice(reqIndex, 1);
    onChange({
      ...config,
      jurisdictionRules: newRules
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            KYC/AML Compliance
          </Label>
          <p className="text-xs text-muted-foreground">
            Enforce KYC verification, whitelist checks, and jurisdiction restrictions
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Compliance module enforces KYC verification and whitelist checks on all transfers.
              This is typically required for security tokens and regulated assets.
            </AlertDescription>
          </Alert>

          {/* Basic Compliance Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Basic Compliance Requirements</Label>

              {/* KYC Required */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">KYC Required</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Require all addresses to complete KYC verification before trading
                  </p>
                </div>
                <Switch
                  checked={config.kycRequired}
                  onCheckedChange={(checked) => handleFieldChange('kycRequired', checked)}
                  disabled={disabled}
                />
              </div>

              {/* KYC Provider */}
              {config.kycRequired && (
                <div className="space-y-2">
                  <Label className="text-xs">KYC Provider (Optional)</Label>
                  <Input
                    value={config.kycProvider || ''}
                    onChange={(e) => handleFieldChange('kycProvider', e.target.value)}
                    disabled={disabled}
                    placeholder="e.g., Chainalysis, Sumsub, Onfido"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Name of the KYC service provider
                  </p>
                </div>
              )}

              {/* Whitelist Required */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Whitelist Required</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only whitelisted addresses can hold or trade tokens
                  </p>
                </div>
                <Switch
                  checked={config.whitelistRequired}
                  onCheckedChange={(checked) => handleFieldChange('whitelistRequired', checked)}
                  disabled={disabled}
                />
              </div>

              {/* Accredited Investor Only */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Accredited Investors Only</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Restrict token to accredited investors only
                  </p>
                </div>
                <Switch
                  checked={config.accreditedInvestorOnly || false}
                  onCheckedChange={(checked) => handleFieldChange('accreditedInvestorOnly', checked)}
                  disabled={disabled}
                />
              </div>
            </div>
          </Card>

          {/* Whitelist Addresses */}
          {config.whitelistRequired && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Whitelist Addresses</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWhitelistAddress}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>

              {(!config.whitelistAddresses || config.whitelistAddresses.length === 0) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No addresses whitelisted yet. Add approved addresses who can hold/trade tokens.
                  </AlertDescription>
                </Alert>
              )}

              {config.whitelistAddresses && config.whitelistAddresses.map((address, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={address}
                    onChange={(e) => updateWhitelistAddress(index, e.target.value)}
                    disabled={disabled}
                    placeholder="0x..."
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWhitelistAddress(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Restricted Countries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Restricted Countries
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRestrictedCountry}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Country
              </Button>
            </div>

            {(!config.restrictedCountries || config.restrictedCountries.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No country restrictions configured. Add ISO country codes (e.g., US, CN, KP) to block.
                </AlertDescription>
              </Alert>
            )}

            {config.restrictedCountries && config.restrictedCountries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.restrictedCountries.map((country, index) => (
                  <Badge key={index} variant="secondary" className="gap-2">
                    {country || 'Enter code'}
                    <Input
                      value={country}
                      onChange={(e) => updateRestrictedCountry(index, e.target.value)}
                      disabled={disabled}
                      placeholder="US"
                      maxLength={2}
                      className="w-12 h-6 text-xs px-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeRestrictedCountry(index)}
                      disabled={disabled}
                      className="hover:bg-destructive/20 rounded-sm p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Jurisdiction Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Jurisdiction-Specific Rules</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addJurisdictionRule}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {(!config.jurisdictionRules || config.jurisdictionRules.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No jurisdiction-specific rules configured. Add custom requirements per jurisdiction.
                </AlertDescription>
              </Alert>
            )}

            {config.jurisdictionRules && config.jurisdictionRules.map((rule, ruleIndex) => (
              <Card key={ruleIndex} className="p-4 border-l-4 border-l-blue-500">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Jurisdiction Rule {ruleIndex + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeJurisdictionRule(ruleIndex)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Jurisdiction Code *</Label>
                      <Input
                        value={rule.jurisdiction}
                        onChange={(e) => updateJurisdictionRule(ruleIndex, 'jurisdiction', e.target.value.toUpperCase())}
                        disabled={disabled}
                        placeholder="US, EU, GB"
                        maxLength={3}
                        className="text-sm uppercase"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id={`allowed-${ruleIndex}`}
                        checked={rule.allowed}
                        onChange={(e) => updateJurisdictionRule(ruleIndex, 'allowed', e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`allowed-${ruleIndex}`} className="text-xs font-normal cursor-pointer">
                        {rule.allowed ? 'Allowed' : 'Blocked'}
                      </Label>
                    </div>
                  </div>

                  {rule.allowed && (
                    <div className="space-y-2">
                      <Label className="text-xs">Requirements</Label>
                      <div className="flex flex-wrap gap-2">
                        {rule.requirements?.map((req, reqIndex) => (
                          <Badge key={reqIndex} variant="outline" className="gap-1">
                            {req}
                            <button
                              type="button"
                              onClick={() => removeRequirement(ruleIndex, reqIndex)}
                              className="hover:bg-destructive/20 rounded-sm"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add requirement (press Enter)"
                          className="text-xs"
                          disabled={disabled}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              addRequirement(ruleIndex, e.currentTarget.value.trim());
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Compliance Summary</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KYC Required:</span>
                  <span className="font-semibold">{config.kycRequired ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Whitelist Required:</span>
                  <span className="font-semibold">{config.whitelistRequired ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accredited Only:</span>
                  <span className="font-semibold">{config.accreditedInvestorOnly ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Restricted Countries:</span>
                  <span className="font-semibold">{config.restrictedCountries?.length || 0}</span>
                </div>
                {config.whitelistRequired && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Whitelisted Addresses:</span>
                    <span className="font-semibold">{config.whitelistAddresses?.length || 0}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jurisdiction Rules:</span>
                  <span className="font-semibold">{config.jurisdictionRules?.length || 0}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> All compliance rules will be enforced 
              automatically during token deployment. Transfers violating these rules will be blocked.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}

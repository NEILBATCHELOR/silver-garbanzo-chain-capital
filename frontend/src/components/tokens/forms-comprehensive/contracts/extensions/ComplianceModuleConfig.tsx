/**
 * Compliance Module Configuration Component
 * Handles KYC/AML compliance settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, ComplianceModuleConfig } from '../types';

export function ComplianceModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<ComplianceModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    onChange({
      ...config,
      enabled: checked,
      kycRequired: checked ? config.kycRequired : false,
      whitelistRequired: checked ? config.whitelistRequired : false
    });
  };

  const handleFieldChange = (field: 'kycRequired' | 'whitelistRequired', value: boolean) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">KYC/AML Compliance</Label>
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

          <div className="p-4 border rounded-lg space-y-4">
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
          </div>
        </>
      )}
    </div>
  );
}

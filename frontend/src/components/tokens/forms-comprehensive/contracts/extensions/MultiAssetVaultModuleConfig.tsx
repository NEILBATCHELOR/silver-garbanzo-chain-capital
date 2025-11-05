/**
 * Multi-Asset Vault Module Configuration Component
 * Support multiple underlying assets in one vault
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, MultiAssetVaultModuleConfig } from '../types';

export function MultiAssetVaultModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<MultiAssetVaultModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      maxAssets: checked ? config.maxAssets || 10 : 0
    });
  };

  const handleMaxAssetsChange = (value: string) => {
    const max = parseInt(value);
    if (!isNaN(max)) {
      onChange({
        ...config,
        maxAssets: max
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Multi-Asset Vault Module</Label>
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
              Support multiple underlying assets in a single vault. Perfect for index funds, 
              diversified portfolios, or multi-collateral vaults.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Maximum Asset Types</Label>
              <Input
                type="number"
                value={config.maxAssets}
                onChange={(e) => handleMaxAssetsChange(e.target.value)}
                placeholder="10"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of different asset types the vault can hold
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

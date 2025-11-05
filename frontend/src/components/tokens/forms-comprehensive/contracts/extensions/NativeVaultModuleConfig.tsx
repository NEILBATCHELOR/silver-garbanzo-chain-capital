/**
 * Native Vault Module Configuration Component
 * Vault for native ETH deposits
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, NativeVaultModuleConfig } from '../types';

export function NativeVaultModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<NativeVaultModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Native Vault Module</Label>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Accept native ETH deposits directly. No WETH wrapping needed, more gas-efficient 
            and better user experience.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

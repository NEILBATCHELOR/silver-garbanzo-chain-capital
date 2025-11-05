/**
 * Permit Module Configuration Component
 * Enables gasless approvals via EIP-2612
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, PermitModuleConfig } from '../types';

export function PermitModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<PermitModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Permit Module (EIP-2612)</Label>
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
            Users can approve token spending via signatures instead of transactions. 
            Saves gas and improves UX for dApp interactions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

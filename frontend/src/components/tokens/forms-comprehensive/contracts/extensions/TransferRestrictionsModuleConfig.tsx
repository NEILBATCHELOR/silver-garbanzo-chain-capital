/**
 * Transfer Restrictions Module Configuration Component
 * Enforces complex transfer restrictions by partition for ERC1400
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, TransferRestrictionsModuleConfig } from '../types';

export function TransferRestrictionsModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<TransferRestrictionsModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Transfer Restrictions Module</Label>
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
            Enforce complex transfer restrictions by partition. Configure lock-up periods, 
            transfer windows, and investor class restrictions after deployment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

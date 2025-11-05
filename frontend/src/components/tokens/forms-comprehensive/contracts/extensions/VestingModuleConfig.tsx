/**
 * Vesting Module Configuration Component
 * Handles token vesting schedules
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, VestingModuleConfig } from '../types';

export function VestingModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<VestingModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Vesting Module</Label>
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
            Vesting module enabled. Configure vesting schedules after deployment using the 
            PolicyAwareLockOperation in the token operations panel.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

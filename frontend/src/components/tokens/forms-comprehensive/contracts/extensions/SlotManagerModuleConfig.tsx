/**
 * Slot Manager Module Configuration Component
 * Advanced slot creation and management for ERC3525
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, SlotManagerModuleConfig } from '../types';

export function SlotManagerModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<SlotManagerModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Slot Manager Module</Label>
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
            Advanced slot creation and management with custom rules and permissions. 
            Configure slot-specific rules and hierarchies after deployment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

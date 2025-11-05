/**
 * Slot Approvable Module Configuration Component
 * Enables slot-level approvals for ERC3525
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, SlotApprovableModuleConfig } from '../types';

export function SlotApprovableModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<SlotApprovableModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Slot Approvable Module</Label>
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
            Enable slot-level approvals for batch operations. Users can approve entire slots 
            (categories) instead of individual tokens.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

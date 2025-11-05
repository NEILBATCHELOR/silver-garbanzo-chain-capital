/**
 * Snapshot Module Configuration Component
 * Captures token balances at specific block heights
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, SnapshotModuleConfig } from '../types';

export function SnapshotModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<SnapshotModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Snapshot Module</Label>
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
            Capture token balances at specific blocks for governance voting, airdrops, 
            or historical analysis. Perfect for fair distribution events.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

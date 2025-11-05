/**
 * Router Module Configuration Component
 * Routes deposits across multiple vaults
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, RouterModuleConfig } from '../types';

export function RouterModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<RouterModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Router Module</Label>
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
            Route deposits across multiple vaults for diversification and yield optimization. 
            Automatically rebalances based on performance and capacity.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

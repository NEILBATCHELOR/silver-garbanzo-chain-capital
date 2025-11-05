/**
 * Consecutive Module Configuration Component
 * Enables gas-efficient batch minting with sequential IDs
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, ConsecutiveModuleConfig } from '../types';

export function ConsecutiveModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<ConsecutiveModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Consecutive Module (ERC721C)</Label>
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
            Enable gas-efficient batch minting with sequential token IDs. 
            Significantly reduces deployment and minting costs for large collections.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

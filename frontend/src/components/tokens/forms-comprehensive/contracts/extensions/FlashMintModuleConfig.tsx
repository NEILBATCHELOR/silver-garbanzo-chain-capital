/**
 * Flash Mint Module Configuration Component
 * Enables flash loan functionality
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, FlashMintModuleConfig } from '../types';

export function FlashMintModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<FlashMintModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Flash Mint Module</Label>
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
            Enables flash loans with instant mint and burn. Users can borrow any amount 
            as long as it's returned in the same transaction.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

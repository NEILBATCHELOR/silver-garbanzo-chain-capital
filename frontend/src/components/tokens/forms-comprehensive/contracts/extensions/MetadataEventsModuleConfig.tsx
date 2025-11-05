/**
 * Metadata Events Module Configuration Component
 * Emits events when metadata changes (EIP-4906)
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, MetadataEventsModuleConfig } from '../types';

export function MetadataEventsModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<MetadataEventsModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Metadata Events Module (EIP-4906)</Label>
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
            Emit events when NFT metadata changes. Essential for dynamic NFTs and proper marketplace integration. 
            Marketplaces will auto-refresh when metadata updates.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * NFT Rental Module Configuration Component
 * Enables temporary lending of NFTs
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, RentalModuleConfig } from '../types';

export function RentalModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<RentalModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      maxRentalDuration: checked ? config.maxRentalDuration || 86400 : 0
    });
  };

  const handleDurationChange = (value: string) => {
    const duration = parseInt(value);
    if (!isNaN(duration)) {
      onChange({
        ...config,
        maxRentalDuration: duration
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">NFT Rental Module</Label>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enable temporary lending of NFTs. Perfect for gaming assets, metaverse items, 
              or any NFTs that provide utility which can be temporarily shared.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Maximum Rental Duration (seconds)</Label>
              <Input
                type="number"
                value={config.maxRentalDuration}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="86400"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                86400 = 1 day, 604800 = 1 week, 2592000 = 30 days
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

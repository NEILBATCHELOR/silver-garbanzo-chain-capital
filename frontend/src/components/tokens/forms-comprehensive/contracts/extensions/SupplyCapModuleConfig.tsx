/**
 * Supply Cap Module Configuration Component
 * Sets per-token-ID supply caps for ERC1155
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, SupplyCapModuleConfig } from '../types';

export function SupplyCapModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<SupplyCapModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      defaultCap: checked ? config.defaultCap || 0 : 0
    });
  };

  const handleCapChange = (value: string) => {
    const cap = parseInt(value);
    if (!isNaN(cap)) {
      onChange({
        ...config,
        defaultCap: cap
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Supply Cap Module</Label>
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
              Set maximum supply limits for each token ID. 
              Perfect for limited edition items or scarcity enforcement.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Default Supply Cap</Label>
              <Input
                type="number"
                value={config.defaultCap}
                onChange={(e) => handleCapChange(e.target.value)}
                placeholder="0"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Default cap for new token IDs (0 = unlimited). Can be set per token ID later.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Async Vault Module Configuration Component
 * Handles deposits/withdrawals with settlement delays for ERC4626 vaults
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, AsyncVaultModuleConfig } from '../types';

export function AsyncVaultModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<AsyncVaultModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      settlementDelay: checked ? config.settlementDelay || 86400 : 0
    });
  };

  const handleDelayChange = (value: string) => {
    const delay = parseInt(value);
    if (!isNaN(delay)) {
      onChange({
        ...config,
        settlementDelay: delay
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Async Vault Module</Label>
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
              Handle deposits/withdrawals with settlement delays. Essential for real-world assets (RWA) 
              or T+n settlement requirements.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Settlement Delay (seconds)</Label>
              <Input
                type="number"
                value={config.settlementDelay}
                onChange={(e) => handleDelayChange(e.target.value)}
                placeholder="86400"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Time before deposits/withdrawals settle. 86400 = 1 day, 172800 = 2 days
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

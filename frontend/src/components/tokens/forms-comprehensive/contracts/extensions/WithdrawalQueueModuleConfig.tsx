/**
 * Withdrawal Queue Module Configuration Component
 * Implements queued withdrawal system for ERC4626 vaults
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, WithdrawalQueueModuleConfig } from '../types';

export function WithdrawalQueueModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<WithdrawalQueueModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      maxQueueSize: checked ? config.maxQueueSize || 100 : 0
    });
  };

  const handleQueueSizeChange = (value: string) => {
    const size = parseInt(value);
    if (!isNaN(size)) {
      onChange({
        ...config,
        maxQueueSize: size
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Withdrawal Queue Module</Label>
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
              Implement a withdrawal queue for illiquid assets or managed withdrawal timing. 
              Ideal for vaults with limited liquidity or strategic withdrawal management.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Maximum Queue Size</Label>
              <Input
                type="number"
                value={config.maxQueueSize}
                onChange={(e) => handleQueueSizeChange(e.target.value)}
                placeholder="100"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of pending withdrawal requests allowed
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

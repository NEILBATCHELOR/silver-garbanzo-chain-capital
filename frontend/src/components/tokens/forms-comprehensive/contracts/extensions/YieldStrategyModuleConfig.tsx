/**
 * Yield Strategy Module Configuration Component
 * Implements automated yield farming strategies for ERC4626 vaults
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, YieldStrategyModuleConfig } from '../types';

export function YieldStrategyModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<YieldStrategyModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      targetYieldBps: checked ? config.targetYieldBps || 500 : 0
    });
  };

  const handleYieldChange = (value: string) => {
    const bps = parseFloat(value);
    if (!isNaN(bps)) {
      onChange({
        ...config,
        targetYieldBps: Math.round(bps * 100)
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Yield Strategy Module</Label>
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
              Implement automated yield farming strategies with target returns. 
              Vault automatically adjusts strategy to hit target yields.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Target Annual Yield (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={(config.targetYieldBps / 100).toFixed(1)}
                onChange={(e) => handleYieldChange(e.target.value)}
                placeholder="5.0"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Target annual percentage yield (APY). E.g., 5.0 for 5% APY
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

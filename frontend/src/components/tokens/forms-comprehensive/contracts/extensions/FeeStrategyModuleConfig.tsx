/**
 * Fee Strategy Module Configuration Component
 * Handles vault management and performance fees for ERC4626
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, FeeStrategyModuleConfig } from '../types';

export function FeeStrategyModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<FeeStrategyModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      managementFeeBps: checked ? config.managementFeeBps || 100 : 0,
      performanceFeeBps: checked ? config.performanceFeeBps || 1000 : 0
    });
  };

  const handleManagementFeeChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        managementFeeBps: Math.round(percentage * 100)
      });
    }
  };

  const handlePerformanceFeeChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        performanceFeeBps: Math.round(percentage * 100)
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Fee Strategy</Label>
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
              Configure management and performance fees for your vault.
              Management fees are charged annually, performance fees on profits.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
            {/* Management Fee */}
            <div className="space-y-2">
              <Label className="text-xs">Management Fee (% per year)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={(config.managementFeeBps / 100).toFixed(1)}
                onChange={(e) => handleManagementFeeChange(e.target.value)}
                disabled={disabled}
                placeholder="1.0"
              />
              <p className="text-xs text-muted-foreground">
                Typical range: 0.5% - 2%
              </p>
            </div>

            {/* Performance Fee */}
            <div className="space-y-2">
              <Label className="text-xs">Performance Fee (%)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                max="30"
                value={(config.performanceFeeBps / 100).toFixed(0)}
                onChange={(e) => handlePerformanceFeeChange(e.target.value)}
                disabled={disabled}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Typical range: 10% - 20%
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

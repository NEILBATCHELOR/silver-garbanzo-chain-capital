/**
 * Value Exchange Module Configuration Component
 * Enables value transfers between slots for ERC3525
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, ValueExchangeModuleConfig } from '../types';

export function ValueExchangeModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<ValueExchangeModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      exchangeFeeBps: checked ? config.exchangeFeeBps || 0 : 0
    });
  };

  const handleFeeChange = (value: string) => {
    const bps = parseFloat(value);
    if (!isNaN(bps)) {
      onChange({
        ...config,
        exchangeFeeBps: Math.round(bps * 100)
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Value Exchange Module</Label>
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
              Enable value transfers between different slots. Perfect for rebalancing, 
              portfolio management, or slot-to-slot exchanges.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Exchange Fee (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={(config.exchangeFeeBps / 100).toFixed(2)}
                onChange={(e) => handleFeeChange(e.target.value)}
                placeholder="0.00"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Fee charged on value exchanges between slots (e.g., 0.25 for 0.25%)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

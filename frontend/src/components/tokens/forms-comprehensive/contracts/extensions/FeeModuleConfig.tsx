/**
 * Fee Module Configuration Component
 * Handles transfer fee settings for ERC20 tokens
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, FeeModuleConfig } from '../types';

export function FeeModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<FeeModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      transferFeeBps: checked ? config.transferFeeBps || 50 : 0,
      feeRecipient: checked ? config.feeRecipient : ''
    });
  };

  const handleBpsChange = (value: string) => {
    const bps = parseFloat(value);
    if (!isNaN(bps)) {
      onChange({
        ...config,
        transferFeeBps: Math.round(bps * 100) // Convert percentage to basis points
      });
    }
  };

  const handleRecipientChange = (value: string) => {
    onChange({
      ...config,
      feeRecipient: value
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Transfer Fees</Label>
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
              Charge a percentage fee on every token transfer. 
              Fees are automatically sent to the specified recipient address.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
            {/* Fee Percentage */}
            <div className="space-y-2">
              <Label className="text-xs">Fee Percentage (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={(config.transferFeeBps / 100).toFixed(2)}
                onChange={(e) => handleBpsChange(e.target.value)}
                disabled={disabled}
                placeholder="0.50"
              />
              <p className="text-xs text-muted-foreground">
                Enter as percentage (e.g., 0.5 for 0.5% fee)
              </p>
            </div>

            {/* Fee Recipient */}
            <div className="space-y-2">
              <Label className="text-xs">Fee Recipient Address</Label>
              <Input
                value={config.feeRecipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
                placeholder="0x..."
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Address that will receive transfer fees
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Payable Token Module Configuration Component
 * Enables ETH transfers alongside token transfers
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, PayableTokenModuleConfig } from '../types';

export function PayableTokenModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<PayableTokenModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Payable Token Module (ERC1363)</Label>
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
            Allows ETH to be sent alongside token transfers. Useful for payment processing, 
            token purchases, or any scenario requiring simultaneous token + ETH transfers.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Soulbound Module Configuration Component
 * Makes NFTs non-transferable (bound to original owner)
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, SoulboundModuleConfig } from '../types';

export function SoulboundModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<SoulboundModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Soulbound Module</Label>
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
            NFTs become non-transferable once minted. Perfect for credentials, certifications, 
            achievement badges, or identity tokens that should stay with the original owner.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

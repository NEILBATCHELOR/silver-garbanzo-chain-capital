/**
 * URI Management Module Configuration Component
 * Advanced metadata URI management for ERC1155
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, URIManagementModuleConfig } from '../types';

export function URIManagementModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<URIManagementModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      baseURI: checked ? config.baseURI || '' : ''
    });
  };

  const handleBaseURIChange = (value: string) => {
    onChange({
      ...config,
      baseURI: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">URI Management Module</Label>
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
              Advanced metadata URI management with per-token overrides and dynamic URIs. 
              Enables centralized URI updates and flexible metadata systems.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Base URI</Label>
              <Input
                value={config.baseURI}
                onChange={(e) => handleBaseURIChange(e.target.value)}
                placeholder="https://api.example.com/metadata/"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Base URI for all token metadata. Token IDs will be appended (e.g., {'{baseURI}'}/1.json)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

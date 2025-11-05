/**
 * ERC1400 Document Module Configuration Component
 * ERC1400-specific document management
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, ERC1400DocumentModuleConfig } from '../types';

export function ERC1400DocumentModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<ERC1400DocumentModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">ERC1400 Document Module</Label>
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
            ERC1400-specific document management with partition-specific documents and hash verification. 
            Upload documents after deployment via the document management panel.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Votes Module Configuration Component
 * Adds voting power and delegation
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, VotesModuleConfig } from '../types';

export function VotesModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<VotesModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Votes Module</Label>
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
            Tokens become governance tokens with voting power (1 token = 1 vote by default). 
            Includes vote delegation and historical voting power tracking.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

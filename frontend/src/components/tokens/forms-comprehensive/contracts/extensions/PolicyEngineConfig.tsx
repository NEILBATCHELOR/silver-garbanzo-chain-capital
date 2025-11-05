/**
 * Policy Engine Configuration Component
 * Handles policy rules and validators
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, PolicyEngineConfig } from '../types';

export function PolicyEngineConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<PolicyEngineConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      rulesEnabled: checked ? config.rulesEnabled || [] : [],
      validatorsEnabled: checked ? config.validatorsEnabled || [] : []
    });
  };

  const handleRulesChange = (value: string) => {
    onChange({
      ...config,
      rulesEnabled: value.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  const handleValidatorsChange = (value: string) => {
    onChange({
      ...config,
      validatorsEnabled: value.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Policy Engine</Label>
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
              Policy Engine validates all token operations against configurable rules. 
              Enables complex compliance and business logic enforcement.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
            {/* Enabled Rules */}
            <div className="space-y-2">
              <Label className="text-xs">Enabled Rules (comma-separated IDs)</Label>
              <Input
                value={config.rulesEnabled?.join(', ') || ''}
                onChange={(e) => handleRulesChange(e.target.value)}
                placeholder="rule1, rule2, rule3"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                IDs of policy rules to enable
              </p>
            </div>

            {/* Enabled Validators */}
            <div className="space-y-2">
              <Label className="text-xs">Enabled Validators (comma-separated IDs)</Label>
              <Input
                value={config.validatorsEnabled?.join(', ') || ''}
                onChange={(e) => handleValidatorsChange(e.target.value)}
                placeholder="validator1, validator2"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                IDs of validators to enable
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

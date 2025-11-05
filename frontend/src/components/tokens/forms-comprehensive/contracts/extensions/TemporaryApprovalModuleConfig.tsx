/**
 * Temporary Approval Module Configuration Component (ERC20)
 * ✅ ENHANCED: Complete temporary approval configuration with duration limits
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Clock } from 'lucide-react';
import type { ModuleConfigProps, TemporaryApprovalModuleConfig } from '../types';

export function TemporaryApprovalModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<TemporaryApprovalModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        defaultDuration: 0,
        maxDuration: undefined,
        minDuration: undefined
      });
    } else {
      onChange({
        enabled: true,
        defaultDuration: config.defaultDuration || 3600,
        maxDuration: config.maxDuration || 86400,
        minDuration: config.minDuration || 300
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Temporary Approval Module</Label>
          <p className="text-xs text-muted-foreground">
            Time-limited token approvals that auto-expire for security
          </p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={handleToggle} disabled={disabled} />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <Clock className="h-3 w-3 mr-1 inline" />
              Temporary approvals automatically expire after a duration, reducing security risks 
              from forgotten approvals and limiting exposure windows.
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Duration Configuration</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Default Duration (seconds) *</Label>
                  <Input type="number" value={config.defaultDuration} onChange={(e) => onChange({ ...config, defaultDuration: parseInt(e.target.value) || 3600 })} placeholder="3600" disabled={disabled} min="60" />
                  <p className="text-xs text-muted-foreground mt-1">{Math.floor(config.defaultDuration / 3600)}h default</p>
                </div>
                <div>
                  <Label className="text-xs">Max Duration (seconds)</Label>
                  <Input type="number" value={config.maxDuration || 86400} onChange={(e) => onChange({ ...config, maxDuration: parseInt(e.target.value) || 86400 })} placeholder="86400" disabled={disabled} min={config.defaultDuration} />
                  <p className="text-xs text-muted-foreground mt-1">{Math.floor((config.maxDuration || 86400) / 3600)}h maximum</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Min Duration (seconds)</Label>
                  <Input type="number" value={config.minDuration || 300} onChange={(e) => onChange({ ...config, minDuration: parseInt(e.target.value) || 300 })} placeholder="300" disabled={disabled} min="60" max={config.defaultDuration} />
                  <p className="text-xs text-muted-foreground mt-1">{Math.floor((config.minDuration || 300) / 60)} minutes minimum</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Duration Examples</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>300s (5 min):</strong> Quick operations, high security</p>
                <p><strong>3600s (1 hour):</strong> Standard transactions</p>
                <p><strong>86400s (24 hours):</strong> Extended operations</p>
              </div>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Approval duration limits will be enforced 
              immediately. All approvals will auto-expire according to these settings.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}

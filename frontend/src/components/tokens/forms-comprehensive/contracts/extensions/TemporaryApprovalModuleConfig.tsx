/**
 * Temporary Approval Module Configuration Component
 * Handles time-limited approval settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, TemporaryApprovalModuleConfig } from '../types';

export function TemporaryApprovalModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<TemporaryApprovalModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      defaultDuration: checked ? config.defaultDuration || 3600 : 0 // Default 1 hour
    });
  };

  const handleDurationChange = (value: string) => {
    const duration = parseInt(value);
    if (!isNaN(duration) && duration >= 60) {
      onChange({
        ...config,
        defaultDuration: duration
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Temporary Approvals</Label>
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
              Approvals automatically expire after a set duration, reducing security risks
              from forgotten approvals. Users can still specify custom durations per approval.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            {/* Default Duration */}
            <div className="space-y-2">
              <Label className="text-xs">Default Duration (seconds)</Label>
              <Input
                type="number"
                min="60"
                max="86400"
                step="300"
                value={config.defaultDuration}
                onChange={(e) => handleDurationChange(e.target.value)}
                disabled={disabled}
                placeholder="3600"
              />
              <p className="text-xs text-muted-foreground">
                Current duration: {formatDuration(config.defaultDuration)}
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Common values:</p>
                <ul className="list-disc list-inside pl-2">
                  <li>15 minutes = 900</li>
                  <li>1 hour = 3600 (recommended)</li>
                  <li>6 hours = 21600</li>
                  <li>24 hours = 86400</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
